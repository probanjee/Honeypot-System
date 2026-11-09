"""Initial canonical PostgreSQL schema for VIGILANCE Phase 3

Revision ID: 001_canonical_schema
Revises: 
Create Date: 2026-10-25 11:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_canonical_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Threat Actors (Source/Actor Attribution Groups) ───────────────────
    op.create_table(
        'threat_actors',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_name', sa.String(length=100), nullable=False),
        sa.Column('threat_type', sa.String(length=50), nullable=False, server_default='UNKNOWN'),
        sa.Column('attribution_confidence', sa.String(length=20), nullable=False, server_default='LOW'),
        sa.Column('attribution_notes', sa.Text(), nullable=False),
        sa.Column('first_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('actor_name')
    )

    # ── 2. Attacks (Canonical Analytical Store) ──────────────────────────────
    op.create_table(
        'attacks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('mongo_raw_id', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ingested_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('source_ip', sa.String(length=45), nullable=False),
        sa.Column('source_port', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_private_ip', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('http_method', sa.String(length=10), nullable=False),
        sa.Column('request_path', sa.Text(), nullable=False),
        sa.Column('protocol', sa.String(length=20), server_default='HTTP/1.1', nullable=False),
        sa.Column('primary_category', sa.String(length=64), nullable=False),
        sa.Column('severity_score', sa.Integer(), nullable=False),
        sa.Column('severity_level', sa.String(length=20), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('detection_summary', sa.JSON(), nullable=False),
        sa.Column('processing_metadata', sa.JSON(), nullable=False),
        sa.Column('geo_country', sa.String(length=100), server_default='Unknown', nullable=False),
        sa.Column('geo_country_code', sa.String(length=2), server_default='XX', nullable=False),
        sa.Column('geo_city', sa.String(length=100), server_default='Unknown', nullable=False),
        sa.Column('geo_latitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('geo_longitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('geoip_status', sa.String(length=30), server_default='UNAVAILABLE', nullable=False),
        sa.Column('threat_actor_id', sa.UUID(), nullable=True),
        sa.Column('schema_version', sa.String(length=10), server_default='1.0.0', nullable=False),
        sa.ForeignKeyConstraint(['threat_actor_id'], ['threat_actors.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_attacks_mongo_raw_id', 'attacks', ['mongo_raw_id'], unique=False)
    op.create_index('idx_attacks_timestamp_desc', 'attacks', [sa.text('timestamp DESC')], unique=False)
    op.create_index('idx_attacks_source_ip_ts', 'attacks', ['source_ip', sa.text('timestamp DESC')], unique=False)
    op.create_index('idx_attacks_primary_category', 'attacks', ['primary_category'], unique=False)
    op.create_index('idx_attacks_severity_score', 'attacks', ['severity_score'], unique=False)
    op.create_index('idx_attacks_geo_country_code', 'attacks', ['geo_country_code'], unique=False)

    # ── 3. Attack Signatures (Matched Detection Rules) ───────────────────────
    op.create_table(
        'attack_signatures',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('attack_id', sa.UUID(), nullable=False),
        sa.Column('signature_id', sa.String(length=64), nullable=False),
        sa.Column('rule_name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('weight', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['attack_id'], ['attacks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('attack_id', 'signature_id', name='uq_attack_signatures_attack_rule')
    )
    op.create_index('idx_attack_signatures_attack_id', 'attack_signatures', ['attack_id'], unique=False)
    op.create_index('idx_attack_signatures_signature_id', 'attack_signatures', ['signature_id'], unique=False)

    # ── 4. System Metrics (Time-Window Operational Metrics) ─────────────────
    op.create_table(
        'system_metrics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('metric_name', sa.String(length=64), nullable=False),
        sa.Column('metric_grain', sa.String(length=20), server_default='1m', nullable=False),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metric_value', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('labels', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('metric_name', 'metric_grain', 'window_start', name='uq_system_metrics_window')
    )
    op.create_index('idx_system_metrics_name_window', 'system_metrics', ['metric_name', 'window_start'], unique=False)

    # ── 5. Enriched Outbox (Transactional Outbox for enriched-attacks) ───────
    op.create_table(
        'enriched_outbox',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('topic', sa.String(length=64), server_default='enriched-attacks', nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('publish_status', sa.String(length=20), server_default='PENDING', nullable=False),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('claimed_by', sa.String(length=64), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['attacks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_enriched_outbox_status_ts', 'enriched_outbox', ['publish_status', 'created_at'], unique=False)
    op.create_index('idx_enriched_outbox_event_id', 'enriched_outbox', ['event_id'], unique=False)


def downgrade() -> None:
    op.drop_table('enriched_outbox')
    op.drop_table('system_metrics')
    op.drop_table('attack_signatures')
    op.drop_table('attacks')
    op.drop_table('threat_actors')
