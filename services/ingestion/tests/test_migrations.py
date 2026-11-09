"""
Tests for Alembic Database Migrations and Schema DDL Verification (Phase 3)
"""

import os
import pytest
from alembic.config import Config
from alembic import command
from src.models.base import Base
from src.models.attack import Attack, AttackSignature, ThreatActor, SystemMetric, EnrichedOutbox


def test_schema_metadata_contains_all_required_tables():
    """Verify that all Phase 3 required tables and relations are registered in SQLAlchemy metadata."""
    registered_tables = Base.metadata.tables.keys()

    required_tables = [
        "attacks",
        "attack_signatures",
        "threat_actors",
        "system_metrics",
        "enriched_outbox"
    ]

    for table in required_tables:
        assert table in registered_tables, f"Table {table} missing from Base metadata"


def test_attacks_table_column_definitions():
    """Verify canonical column definitions on attacks table."""
    attacks_table = Base.metadata.tables["attacks"]
    col_names = attacks_table.columns.keys()

    expected_cols = [
        "id",
        "mongo_raw_id",
        "timestamp",
        "ingested_at",
        "source_ip",
        "source_port",
        "is_private_ip",
        "http_method",
        "request_path",
        "protocol",
        "primary_category",
        "severity_score",
        "severity_level",
        "user_agent",
        "detection_summary",
        "processing_metadata",
        "geo_country",
        "geo_country_code",
        "geo_city",
        "geo_latitude",
        "geo_longitude",
        "geoip_status",
        "threat_actor_id",
        "schema_version"
    ]

    for col in expected_cols:
        assert col in col_names, f"Column {col} missing from attacks table"


def test_indexes_on_canonical_tables():
    """Verify analytical indexes exist on attacks and enriched_outbox."""
    attacks_table = Base.metadata.tables["attacks"]
    index_names = {idx.name for idx in attacks_table.indexes}

    assert "idx_attacks_timestamp_desc" in index_names or any("timestamp" in str(idx.name) for idx in attacks_table.indexes)
    assert "idx_attacks_source_ip_ts" in index_names or any("source_ip" in str(idx.name) for idx in attacks_table.indexes)

    outbox_table = Base.metadata.tables["enriched_outbox"]
    outbox_index_names = {idx.name for idx in outbox_table.indexes}
    assert "idx_enriched_outbox_status_ts" in outbox_index_names or any("status" in str(idx.name) for idx in outbox_table.indexes)


def test_migration_script_upgrade_and_downgrade_callable():
    """Verify that the migration module exports upgrade() and downgrade() functions."""
    import importlib.util
    migration_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "alembic",
        "versions",
        "001_initial_canonical_schema.py"
    )
    assert os.path.exists(migration_path), "Migration script 001_initial_canonical_schema.py missing"

    spec = importlib.util.spec_from_file_location("migration_001", migration_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    assert hasattr(mod, "upgrade"), "upgrade() function missing in migration script"
    assert hasattr(mod, "downgrade"), "downgrade() function missing in migration script"
    assert mod.revision == "001_canonical_schema"
