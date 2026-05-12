import asyncio
import os
from consumers.event_consumer import consume_batch

async def main():
    print("[Ingestion Service] Starting...")
    await consume_batch()

if __name__ == "__main__":
    asyncio.run(main())
