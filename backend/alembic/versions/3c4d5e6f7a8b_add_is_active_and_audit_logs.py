"""add is_active to users and create admin_audit_logs

Revision ID: 3c4d5e6f7a8b
Revises: 2b3c4d5e6f7a
Create Date: 2026-11-12 20:41:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c4d5e6f7a8b'
down_revision: Union[str, Sequence[str], None] = '2b3c4d5e6f7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add is_active to users
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'pending';"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS patents_info JSON NOT NULL DEFAULT '[]'::json;"))
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_comment TEXT;"))

    # 2. Create admin_audit_logs table if not exists
    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('admin_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('admin_name', sa.String(length=255), nullable=False),
        sa.Column('admin_email', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_admin_audit_logs_id'), 'admin_audit_logs', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_admin_audit_logs_admin_id'), 'admin_audit_logs', ['admin_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_admin_audit_logs_action'), 'admin_audit_logs', ['action'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_admin_audit_logs_target_type'), 'admin_audit_logs', ['target_type'], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_table('admin_audit_logs')
    op.drop_column('users', 'is_active')
