from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import attacks, analytics, logs, websocket, auth
from app.core.database import engine, Base
import asyncio
from kafka import KafkaConsumer
import json
from app.repositories.attack_repository import AttackRepository
from app.core.database import async_session
from app.models.schemas import AttackCreate

def create_app():
    app = FastAPI(title="Honeypot Platform API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(attacks.router, prefix="/api/v1/attacks", tags=["Attacks"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(logs.router, prefix="/api/v1/logs", tags=["Logs"])
    app.include_router(websocket.router)
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

    @app.on_event("startup")
    async def startup():
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Start background task to consume enriched attacks and save to DB
        asyncio.create_task(consume_enriched_attacks())

    return app

async def consume_enriched_attacks():
    from app.core.config import settings
    consumer = KafkaConsumer(
        'enriched-attacks',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id='backend-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    repo = AttackRepository()
    
    while True:
        msg_pack = consumer.poll(timeout_ms=1000)
        for tp, messages in msg_pack.items():
            for msg in messages:
                data = msg.value
                async with async_session() as session:
                    await repo.save_attack(session, AttackCreate(**data))
        await asyncio.sleep(0.1)
