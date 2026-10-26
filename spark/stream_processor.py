#!/usr/bin/env python3
"""
AirSupp.ly - Spark Structured Streaming Pipeline
=================================================
Consumes real-time atmospheric telemetry from Kafka KRaft topic `air_supply_stream`,
executes a 15-second tumbling window with 30-second watermarking on `event_time`,
computes dynamic AQI based on Philippine DENR / US EPA PM2.5 breakpoints,
and sinks micro-batches simultaneously into:
  1. `live_metrics`: Upserted by `city` (storing the active 15s snapshot per city)
  2. `history_logs`: Append-only time-series collection for historical analysis

================================================================================
EXACT SPARK-SUBMIT CLI COMMAND:
================================================================================
spark-submit \\
  --master "local[*]" \\
  --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1 \\
  --conf spark.sql.shuffle.partitions=4 \\
  --conf spark.streaming.stopGracefullyOnShutdown=true \\
  spark/stream_processor.py
================================================================================
"""

import os
import sys
from datetime import datetime, timezone
import logging
from dotenv import load_dotenv
import pymongo
from pymongo import UpdateOne

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_json, window, avg, first, count, round as spark_round
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, TimestampType
)

# Load AQI calculator (supports both local package and spark-submit path resolution)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from aqi_calculator import get_aqi_spark_udf

# Load environment variables
load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AirSupp.ly-Spark] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("airsupply.spark")

# Configuration settings
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "air_supply_stream")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "airsupply_db")
MONGO_LIVE_COLLECTION = os.getenv("MONGO_LIVE_COLLECTION", "live_metrics")
MONGO_HISTORY_COLLECTION = os.getenv("MONGO_HISTORY_COLLECTION", "history_logs")
CHECKPOINT_DIR = os.getenv("SPARK_CHECKPOINT_DIR", "./.checkpoint/spark_stream")

# Schema of telemetry JSON published by the producer
TELEMETRY_SCHEMA = StructType([
    StructField("sensor_id", StringType(), True),
    StructField("city", StringType(), True),
    StructField("country", StringType(), True),
    StructField("latitude", DoubleType(), True),
    StructField("longitude", DoubleType(), True),
    StructField("pm25", DoubleType(), True),
    StructField("pm10", DoubleType(), True),
    StructField("temperature", DoubleType(), True),
    StructField("humidity", DoubleType(), True),
    StructField("source", StringType(), True),
    StructField("event_time", TimestampType(), True),
])

# Process-level MongoDB Client Singleton for Workers/Driver
_mongo_client = None


def get_mongo_db():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = pymongo.MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connect=False,
            maxPoolSize=50
        )
    return _mongo_client[MONGO_DB_NAME]


def write_to_mongo_sink(batch_df, batch_id: int):
    """
    ForeachBatch micro-batch sink:
    Extracts windowed telemetry, performs bulk upserts into `live_metrics`,
    and appends historical snapshots to `history_logs`.
    """
    records_count = batch_df.count()
    if records_count == 0:
        return

    logger.info("Processing Micro-Batch #%d with %d windowed records...", batch_id, records_count)

    rows = batch_df.collect()
    db = get_mongo_db()
    live_col = db[MONGO_LIVE_COLLECTION]
    history_col = db[MONGO_HISTORY_COLLECTION]

    live_operations = []
    history_documents = []

    for row in rows:
        data = row.asDict(recursive=True)

        # Extract and format window bounds
        win = data.pop("window", {})
        win_start = win.get("start")
        win_end = win.get("end")

        if isinstance(win_start, datetime):
            data["window_start"] = win_start.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            data["window_start"] = str(win_start)

        if isinstance(win_end, datetime):
            data["window_end"] = win_end.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            data["window_end"] = str(win_end)

        # Sanitize floats and ints
        data["pm25"] = round(float(data.get("pm25", 0.0)), 2)
        data["pm10"] = round(float(data.get("pm10", 0.0)), 2)
        data["temperature"] = round(float(data.get("temperature", 0.0)), 2)
        data["humidity"] = round(float(data.get("humidity", 0.0)), 2)
        data["aqi"] = int(data.get("aqi", 0))
        data["sample_count"] = int(data.get("sample_count", 1))

        # Ingestion timestamp
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        data["processed_at"] = now_iso

        # 1. Upsert document for live_metrics (one active document per city)
        live_doc = dict(data)
        live_operations.append(
            UpdateOne(
                {"city": live_doc["city"]},
                {"$set": live_doc},
                upsert=True
            )
        )

        # 2. Append-only document for history_logs
        hist_doc = dict(data)
        history_documents.append(hist_doc)

    try:
        if live_operations:
            live_result = live_col.bulk_write(live_operations, ordered=False)
            logger.info(
                "Sink [live_metrics] -> Upserted: %d, Modified: %d, Matched: %d",
                len(live_result.upserted_ids), live_result.modified_count, live_result.matched_count
            )

        if history_documents:
            hist_result = history_col.insert_many(history_documents, ordered=False)
            logger.info("Sink [history_logs] -> Appended %d records.", len(hist_result.inserted_ids))

    except Exception as ex:
        logger.error("Error writing batch #%d to MongoDB: %s", batch_id, ex)


def create_spark_session() -> SparkSession:
    """
    Initializes SparkSession configured for Kafka 0-10 structured streaming.
    """
    builder = SparkSession.builder \
        .appName("AirSupply-PySpark-StreamProcessor") \
        .config("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true") \
        .config("spark.sql.shuffle.partitions", "4") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.2")

    # If run in a cluster, master is set by spark-submit; otherwise fallback to local[*]
    if not os.getenv("SPARK_ENV_LOADED"):
        builder = builder.master("local[*]")

    spark = builder.getOrCreate()
    spark.sparkContext.setLogLevel("WARN")
    return spark


def main():
    spark = create_spark_session()
    logger.info("Spark session initialized. Connecting to Kafka stream from %s...", KAFKA_BOOTSTRAP_SERVERS)

    # 1. Read Kafka Stream
    raw_stream = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", KAFKA_TOPIC) \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()

    # 2. Deserialize JSON payload
    parsed_stream = raw_stream \
        .selectExpr("CAST(value AS STRING) as json_payload") \
        .select(from_json(col("json_payload"), TELEMETRY_SCHEMA).alias("payload")) \
        .select("payload.*")

    # Filter out null event times or empty records
    valid_stream = parsed_stream.filter(col("event_time").isNotNull() & col("city").isNotNull())

    # 3. 15-second tumbling window with 30-second watermark
    windowed_aggregates = valid_stream \
        .withWatermark("event_time", "30 seconds") \
        .groupBy(
            window(col("event_time"), "15 seconds"),
            col("city")
        ) \
        .agg(
            spark_round(avg("pm25"), 2).alias("pm25"),
            spark_round(avg("pm10"), 2).alias("pm10"),
            spark_round(avg("temperature"), 2).alias("temperature"),
            spark_round(avg("humidity"), 2).alias("humidity"),
            first("sensor_id").alias("sensor_id"),
            first("country").alias("country"),
            first("latitude").alias("latitude"),
            first("longitude").alias("longitude"),
            first("source").alias("source"),
            count("*").alias("sample_count")
        )

    # 4. Dynamic AQI Calculation via UDF
    aqi_udf = get_aqi_spark_udf()
    enriched_stream = windowed_aggregates \
        .withColumn("aqi_details", aqi_udf(col("pm25"))) \
        .withColumn("aqi", col("aqi_details.aqi")) \
        .withColumn("category", col("aqi_details.category")) \
        .withColumn("color_hex", col("aqi_details.color_hex")) \
        .withColumn("health_advisory", col("aqi_details.health_advisory")) \
        .drop("aqi_details")

    # 5. Output via foreachBatch to Dual MongoDB Sinks
    logger.info("Starting Structured Streaming query sink to MongoDB...")
    query = enriched_stream.writeStream \
        .foreachBatch(write_to_mongo_sink) \
        .outputMode("update") \
        .option("checkpointLocation", CHECKPOINT_DIR) \
        .start()

    logger.info("Streaming query active. Awaiting new micro-batches (Ctrl+C to stop)...")
    query.awaitTermination()


if __name__ == "__main__":
    main()
