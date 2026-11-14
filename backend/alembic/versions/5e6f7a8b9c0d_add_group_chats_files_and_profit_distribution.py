"""add group chats, message attachments and profit distribution

Revision ID: 5e6f7a8b9c0d
Revises: 4d5e6f7a8b9c
Create Date: 2026-11-14 16:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e6f7a8b9c0d'
down_revision: Union[str, Sequence[str], None] = '4d5e6f7a8b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE chats ADD COLUMN IF NOT EXISTS chat_type VARCHAR(50) NOT NULL DEFAULT 'direct';"))
    conn.execute(sa.text("ALTER TABLE chats ALTER COLUMN investor_id DROP NOT NULL;"))
    conn.execute(sa.text("ALTER TABLE chats ALTER COLUMN lab_id DROP NOT NULL;"))
    conn.execute(sa.text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;"))

    # chat_members table
    op.create_table(
        'chat_members',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('chat_id', sa.Integer(), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='member', nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_read_message_id', sa.Integer(), nullable=True),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_chat_members_id'), 'chat_members', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_chat_members_chat_id'), 'chat_members', ['chat_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_chat_members_user_id'), 'chat_members', ['user_id'], unique=False, if_not_exists=True)

    # message_attachments table
    op.create_table(
        'message_attachments',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('chat_id', sa.Integer(), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('messages.id', ondelete='CASCADE'), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), server_default='0', nullable=False),
        sa.Column('mime_type', sa.String(length=100), server_default='application/octet-stream', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_message_attachments_id'), 'message_attachments', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_message_attachments_chat_id'), 'message_attachments', ['chat_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_message_attachments_message_id'), 'message_attachments', ['message_id'], unique=False, if_not_exists=True)

    # profit_distributions table
    op.create_table(
        'profit_distributions',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('initiator_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('distribution_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='completed', nullable=False),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_profit_distributions_id'), 'profit_distributions', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_profit_distributions_project_id'), 'profit_distributions', ['project_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_profit_distributions_initiator_id'), 'profit_distributions', ['initiator_id'], unique=False, if_not_exists=True)

    # profit_payout_items table
    op.create_table(
        'profit_payout_items',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('distribution_id', sa.Integer(), sa.ForeignKey('profit_distributions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('investor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invested_amount', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('share_percent', sa.Numeric(precision=8, scale=4), server_default='0.0000', nullable=False),
        sa.Column('payout_amount', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('transaction_id', sa.Integer(), sa.ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True),
        if_not_exists=True,
    )
    op.create_index(op.f('ix_profit_payout_items_id'), 'profit_payout_items', ['id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_profit_payout_items_distribution_id'), 'profit_payout_items', ['distribution_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_profit_payout_items_investor_id'), 'profit_payout_items', ['investor_id'], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_table('profit_payout_items', if_exists=True)
    op.drop_table('profit_distributions', if_exists=True)
    op.drop_table('message_attachments', if_exists=True)
    op.drop_table('chat_members', if_exists=True)
