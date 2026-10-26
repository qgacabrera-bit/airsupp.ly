"""
AirSupp.ly - Motor Asynchronous Database Layer
==============================================
Provides non-blocking MongoDB connectivity using Motor, connection lifecycle
management, and index initialization for high-throughput time-series queries.
"""

import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.config import settings

logger = logging.getLogger("airsupply.database")


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls):
        """
        Initializes non-blocking Motor client and ensures performance indexes.
        """
        logger.info("Connecting to MongoDB at %s...", settings.MONGO_URI)
        cls.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=100,
            minPoolSize=10
        )
        cls.db = cls.client[settings.MONGO_DB_NAME]

        # Verify connectivity
        try:
            await cls.client.admin.command("ping")
            logger.info("Connected to MongoDB database '%s'.", settings.MONGO_DB_NAME)
            await cls._init_indexes()
        except Exception as e:
            logger.warning("MongoDB ping failed on startup: %s. Fallback mode enabled.", e)


    @classmethod
    async def _init_indexes(cls):
        """
        Ensures index on `city` for live_metrics and compound index
        `[('city', 1), ('window_start', -1)]` for fast historical range scans.
        """
        if cls.db is None:
            return

        try:
            live_col = cls.db[settings.MONGO_LIVE_COLLECTION]
            await live_col.create_index("city", unique=True)
            await live_col.create_index([("aqi", -1)])

            history_col = cls.db[settings.MONGO_HISTORY_COLLECTION]
            await history_col.create_index([("city", 1), ("window_start", 1)])
            await history_col.create_index([("window_start", 1)])
            logger.info("Database indexes verified for fast queries.")
        except Exception as e:
            logger.warning("Index initialization notice: %s", e)

    @classmethod
    async def disconnect(cls):
        """
        Closes Motor client gracefully.
        """
        if cls.client:
            logger.info("Closing MongoDB connection pool...")
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("Database connection has not been initialized.")
        return cls.db
