import redis.asyncio as aioredis
from functools import wraps
from app.core.config import settings
import json
import time

_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _pool


async def close_redis():
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None


# ── Rate-limiting helper ──────────────────────────────────────────────────────

async def check_rate_limit(key: str, limit: int = 100, window: int = 60) -> bool:
    """Returns True if the request is within the rate limit, False if blocked."""
    redis = await get_redis()
    pipe = redis.pipeline()
    now = int(time.time())
    bucket = f"rl:{key}:{now // window}"
    pipe.incr(bucket)
    pipe.expire(bucket, window * 2)
    results = await pipe.execute()
    return results[0] <= limit


# ── Cache helpers ─────────────────────────────────────────────────────────────

async def cache_set(key: str, value: dict, ttl: int = 300):
    redis = await get_redis()
    await redis.set(key, json.dumps(value), ex=ttl)


async def cache_get(key: str) -> dict | None:
    redis = await get_redis()
    raw = await redis.get(key)
    if raw:
        return json.loads(raw)
    return None


async def cache_delete(key: str):
    redis = await get_redis()
    await redis.delete(key)
