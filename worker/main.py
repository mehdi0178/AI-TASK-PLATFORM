"""
Python background worker for the AI Task Processing Platform.

Consumes task IDs pushed by the Node.js API onto a Redis list, loads the
corresponding task document from MongoDB, runs the requested string
operation, and writes back status/result/logs.

Designed to be horizontally scaled: BRPOP is an atomic, blocking pop, so
running N replicas of this worker against the same queue key safely
distributes work with no double-processing.
"""

import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

import redis
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
from dotenv import load_dotenv

from operations import run_operation, UnsupportedOperationError

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("worker")

TASK_QUEUE_KEY = "ai_task_queue"
BLOCK_TIMEOUT_SECONDS = 5  # so the loop wakes periodically to check shutdown flag

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/ai_task_platform")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

shutdown_requested = False


def handle_signal(signum, frame):
    global shutdown_requested
    log.info("Received signal %s, finishing current task then exiting", signum)
    shutdown_requested = True


signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)


def connect_redis():
    while True:
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            log.info("Connected to Redis at %s:%s", REDIS_HOST, REDIS_PORT)
            return client
        except redis.exceptions.RedisError as exc:
            log.warning("Redis not ready (%s), retrying in 3s...", exc)
            time.sleep(3)


def connect_mongo():
    while True:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            log.info("Connected to MongoDB")
            return client
        except Exception as exc:  # noqa: BLE001 - broad on purpose during startup retry
            log.warning("MongoDB not ready (%s), retrying in 3s...", exc)
            time.sleep(3)


def process_task(tasks_collection, task_id: str):
    try:
        oid = ObjectId(task_id)
    except Exception:
        log.error("Invalid task id on queue: %s", task_id)
        return

    now = datetime.now(timezone.utc)
    task = tasks_collection.find_one_and_update(
        {"_id": oid},
        {
            "$set": {"status": "running", "startedAt": now},
            "$push": {"logs": f"[{now.isoformat()}] Worker picked up task"},
        },
        return_document=ReturnDocument.AFTER,
    )

    if not task:
        log.warning("Task %s not found (may have been deleted)", task_id)
        return

    log.info("Processing task %s (operation=%s)", task_id, task.get("operation"))

    try:
        result = run_operation(task["operation"], task["inputText"])
        finished = datetime.now(timezone.utc)
        tasks_collection.update_one(
            {"_id": oid},
            {
                "$set": {"status": "success", "result": result, "finishedAt": finished},
                "$push": {"logs": f"[{finished.isoformat()}] Task completed successfully"},
            },
        )
        log.info("Task %s succeeded", task_id)
    except UnsupportedOperationError as exc:
        finished = datetime.now(timezone.utc)
        tasks_collection.update_one(
            {"_id": oid},
            {
                "$set": {"status": "failed", "finishedAt": finished},
                "$push": {"logs": f"[{finished.isoformat()}] Failed: {exc}"},
            },
        )
        log.error("Task %s failed: %s", task_id, exc)
    except Exception as exc:  # noqa: BLE001 - guard so one bad task can't crash the worker
        finished = datetime.now(timezone.utc)
        tasks_collection.update_one(
            {"_id": oid},
            {
                "$set": {"status": "failed", "finishedAt": finished},
                "$push": {"logs": f"[{finished.isoformat()}] Failed: unexpected error"},
            },
        )
        log.exception("Unexpected error processing task %s", task_id)


def main():
    log.info("Worker starting up...")
    redis_client = connect_redis()
    mongo_client = connect_mongo()
    db = mongo_client.get_database()
    tasks_collection = db["tasks"]

    log.info("Worker ready, listening on queue '%s'", TASK_QUEUE_KEY)

    while not shutdown_requested:
        try:
            item = redis_client.brpop(TASK_QUEUE_KEY, timeout=BLOCK_TIMEOUT_SECONDS)
        except redis.exceptions.RedisError as exc:
            log.warning("Redis error while polling queue (%s), reconnecting...", exc)
            redis_client = connect_redis()
            continue

        if item is None:
            continue  # timeout elapsed, loop back and check shutdown flag

        _, task_id = item
        process_task(tasks_collection, task_id)

    log.info("Worker shutting down cleanly")
    sys.exit(0)


if __name__ == "__main__":
    main()
