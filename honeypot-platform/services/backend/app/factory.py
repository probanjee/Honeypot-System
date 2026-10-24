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
        from app.core.config import settings
        import logging
        logger = logging.getLogger("backend-startup")
        active_provider = "Supabase" if settings.USE_SUPABASE else "PostgreSQL (SQLAlchemy)"
        logger.info(f"🗄️ Active Database Provider: {active_provider}")

        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Start background task to consume enriched attacks and save to DB
        asyncio.create_task(consume_enriched_attacks())

    @app.get("/health/database")
    async def get_db_health():
        from app.adapters.postgres_adapter import PostgresAdapter
        from app.adapters.supabase_adapter import SupabaseAdapter
        from app.core.config import settings
        
        postgres = PostgresAdapter()
        supabase = SupabaseAdapter()
        
        postgres_status = await postgres.status()
        supabase_status = await supabase.status()
        
        active_provider = "supabase" if settings.USE_SUPABASE else "postgres"
        
        return {
            "status": "ok",
            "active_provider": active_provider,
            "postgres": postgres_status,
            "supabase": supabase_status
        }

    return app

async def consume_enriched_attacks():
    from app.core.config import settings
    from app.api.websocket import manager
    import logging
    logger = logging.getLogger("enriched-consumer")

    repo = AttackRepository()

    while True:
        try:
            consumer = KafkaConsumer(
                'enriched-attacks',
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id='backend-group',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                consumer_timeout_ms=1000
            )
            logger.info("Connected to Kafka enriched-attacks topic")
            while True:
                msg_pack = consumer.poll(timeout_ms=1000)
                for tp, messages in msg_pack.items():
                    for msg in messages:
                        data = msg.value
                        try:
                            async with async_session() as session:
                                await repo.save_attack(session, AttackCreate(**data))
                            await manager.broadcast(json.dumps(data))
                        except Exception as e:
                            logger.error(f"Error processing attack message: {e}")
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.warning(f"Kafka consumer connection retry in 5s: {e}")
            await asyncio.sleep(5)
