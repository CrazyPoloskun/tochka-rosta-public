"""add notifications and realtime tables

Revision ID: 4d5e6f7a8b9c
Revises: 3c4d5e6f7a8b
Create Date: 2026-11-12 21:13:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d5e6f7a8b9c'
down_revision: Union[str, Sequence[str], None] = '3c4d5e6f7a8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS documents JSON NOT NULL DEFAULT '[]'::json;"))
    conn.execute(sa.text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS initiated_by_admin BOOLEAN NOT NULL DEFAULT FALSE;"))
    conn.execute(sa.text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;"))
    conn.execute(sa.text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(50);"))
    conn.execute(sa.text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT;"))

    # notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('recipient_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('recipient_role_scope', sa.String(length=20), server_default='user', nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('link_url', sa.String(length=255), nullable=True),
        sa.Column('severity', sa.String(length=20), server_default='info', nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_notifications_recipient_id'), 'notifications', ['recipient_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False, if_not_exists=True)

    # ticket_messages table
    op.create_table(
        'ticket_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_admin_reply', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_ticket_messages_id'), 'ticket_messages', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_ticket_messages_ticket_id'), 'ticket_messages', ['ticket_id'], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_table('ticket_messages')
    op.drop_table('notifications')
