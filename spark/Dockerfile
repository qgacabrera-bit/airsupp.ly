# ==============================================================
# AirSupp.ly - PySpark Structured Streaming Container
# ==============================================================
FROM bitnami/spark:3.5

USER root

# Install Python libraries needed for MongoDB sinks and config
RUN pip install --no-cache-dir pymongo python-dotenv

# Set working directory for Spark application
WORKDIR /opt/bitnami/spark/app

# Pre-create writable checkpoint directory
RUN mkdir -p /tmp/spark_checkpoint && chmod -R 777 /tmp/spark_checkpoint

# Copy Spark streaming scripts
COPY spark/aqi_calculator.py /opt/bitnami/spark/app/aqi_calculator.py
COPY spark/stream_processor.py /opt/bitnami/spark/app/stream_processor.py
COPY spark/__init__.py /opt/bitnami/spark/app/__init__.py

# Switch back to non-root spark user
USER 1001

ENV PYTHONUNBUFFERED=1 \
    SPARK_CHECKPOINT_DIR=/tmp/spark_checkpoint

# Pre-configured spark-submit entrypoint connecting to kafka:29092 & mongodb:27017
CMD ["/opt/bitnami/spark/bin/spark-submit", \
     "--master", "local[*]", \
     "--packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.2", \
     "--conf", "spark.sql.shuffle.partitions=4", \
     "--conf", "spark.streaming.stopGracefullyOnShutdown=true", \
     "/opt/bitnami/spark/app/stream_processor.py"]
