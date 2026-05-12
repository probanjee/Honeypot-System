"""Initial schema – create attacks, honeypot_sessions, threat_intel tables

Revision ID: 001
Revises: 
Create Date: 2026-05-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'attacks',
        sa.Column('id',          sa.Integer(),     nullable=False, autoincrement=True),
        sa.Column('timestamp',   sa.DateTime(),    nullable=True),
        sa.Column('source_ip',   sa.String(),      nullable=True),
        sa.Column('source_port', sa.Integer(),     nullable=True),
        sa.Column('protocol',    sa.String(),      nullable=True),
        sa.Column('attack_type', sa.String(),      nullable=True),
        sa.Column('payload',     sa.String(),      nullable=True),
        sa.Column('severity',    sa.Integer(),     nullable=True),
        sa.Column('geo_country', sa.String(),      nullable=True),
        sa.Column('geo_city',    sa.String(),      nullable=True),
        sa.Column('latitude',    sa.Float(),       nullable=True),
        sa.Column('longitude',   sa.Float(),       nullable=True),
        sa.Column('headers',     sa.JSON(),        nullable=True),
        sa.Column('signatures',  sa.JSON(),        nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_attacks_source_ip',   'attacks', ['source_ip'])
    op.create_index('ix_attacks_attack_type', 'attacks', ['attack_type'])
    op.create_index('ix_attacks_timestamp',   'attacks', ['timestamp'])

    op.create_table(
        'honeypot_sessions',
        sa.Column('id',                   sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('session_id',           sa.String(),  nullable=True,  unique=True),
        sa.Column('protocol',             sa.String(),  nullable=True),
        sa.Column('source_ip',            sa.String(),  nullable=True),
        sa.Column('start_time',           sa.DateTime(), nullable=True),
        sa.Column('end_time',             sa.DateTime(), nullable=True),
        sa.Column('bytes_transferred',    sa.BigInteger(), nullable=True),
        sa.Column('commands_executed',    sa.Integer(), nullable=True),
        sa.Column('credentials_captured', sa.String(),  nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sessions_session_id', 'honeypot_sessions', ['session_id'])
    op.create_index('ix_sessions_source_ip',  'honeypot_sessions', ['source_ip'])

    op.create_table(
        'threat_intel',
        sa.Column('id',                    sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('ip_address',            sa.String(),  nullable=False, unique=True),
        sa.Column('abuseipdb_score',       sa.Integer(), nullable=True),
        sa.Column('abuseipdb_reports',     sa.Integer(), nullable=True),
        sa.Column('shodan_tags',           sa.JSON(),    nullable=True),
        sa.Column('shodan_ports',          sa.JSON(),    nullable=True),
        sa.Column('virustotal_detections', sa.Integer(), nullable=True),
        sa.Column('country',               sa.String(),  nullable=True),
        sa.Column('isp',                   sa.String(),  nullable=True),
        sa.Column('is_tor',                sa.Integer(), nullable=True, default=0),
        sa.Column('is_proxy',              sa.Integer(), nullable=True, default=0),
        sa.Column('last_updated',          sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_threat_intel_ip', 'threat_intel', ['ip_address'])


def downgrade() -> None:
    op.drop_table('threat_intel')
    op.drop_table('honeypot_sessions')
    op.drop_table('attacks')
