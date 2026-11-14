"""create all platform tables

Revision ID: 2b3c4d5e6f7a
Revises: 1ceed2d1397c
Create Date: 2026-11-12 19:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b3c4d5e6f7a'
down_revision: Union[str, Sequence[str], None] = '1ceed2d1397c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Expand users table
    op.add_column('users', sa.Column('verification_status', sa.String(length=50), server_default='pending', nullable=False))
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('patents_info', sa.JSON(), server_default='[]', nullable=False))
    op.add_column('users', sa.Column('moderation_comment', sa.Text(), nullable=True))

    # 2. accounts table
    op.create_table(
        'accounts',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('available_balance', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('frozen_balance', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 3. ideas table
    op.create_table(
        'ideas',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('author_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), server_default='lab_tech', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('trl_level', sa.Integer(), server_default='4', nullable=False),
        sa.Column('budget_total', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('milestones', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('moderation_status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('moderation_comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_ideas_id'), 'ideas', ['id'], unique=False)
    op.create_index(op.f('ix_ideas_author_id'), 'ideas', ['author_id'], unique=False)
    op.create_index(op.f('ix_ideas_category'), 'ideas', ['category'], unique=False)
    op.create_index(op.f('ix_ideas_moderation_status'), 'ideas', ['moderation_status'], unique=False)

    # 4. tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('investor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('budget', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('deadline', sa.String(length=50), nullable=False),
        sa.Column('moderation_status', sa.String(length=50), server_default='approved', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='open', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_investor_id'), 'tasks', ['investor_id'], unique=False)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)

    # 5. task_bids table
    op.create_table(
        'task_bids',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lab_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proposal_text', sa.Text(), nullable=False),
        sa.Column('proposed_budget', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_task_bids_id'), 'task_bids', ['id'], unique=False)
    op.create_index(op.f('ix_task_bids_task_id'), 'task_bids', ['task_id'], unique=False)
    op.create_index(op.f('ix_task_bids_lab_id'), 'task_bids', ['lab_id'], unique=False)

    # 6. projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('investor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lab_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('total_budget', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_investor_id'), 'projects', ['investor_id'], unique=False)
    op.create_index(op.f('ix_projects_lab_id'), 'projects', ['lab_id'], unique=False)

    # 7. project_milestones table
    op.create_table(
        'project_milestones',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_number', sa.Integer(), server_default='1', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='pending_funds', nullable=False),
        sa.Column('raw_report', sa.Text(), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
    )
    op.create_index(op.f('ix_project_milestones_id'), 'project_milestones', ['id'], unique=False)
    op.create_index(op.f('ix_project_milestones_project_id'), 'project_milestones', ['project_id'], unique=False)

    # 8. project_files table
    op.create_table(
        'project_files',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('uploader_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), server_default='0', nullable=False),
        sa.Column('mime_type', sa.String(length=100), server_default='application/octet-stream', nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_project_files_id'), 'project_files', ['id'], unique=False)
    op.create_index(op.f('ix_project_files_project_id'), 'project_files', ['project_id'], unique=False)

    # 9. transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('from_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('to_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
    op.create_index(op.f('ix_transactions_from_user_id'), 'transactions', ['from_user_id'], unique=False)
    op.create_index(op.f('ix_transactions_to_user_id'), 'transactions', ['to_user_id'], unique=False)
    op.create_index(op.f('ix_transactions_type'), 'transactions', ['type'], unique=False)

    # 10. chats table
    op.create_table(
        'chats',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('investor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lab_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_chats_id'), 'chats', ['id'], unique=False)
    op.create_index(op.f('ix_chats_investor_id'), 'chats', ['investor_id'], unique=False)
    op.create_index(op.f('ix_chats_lab_id'), 'chats', ['lab_id'], unique=False)

    # 11. messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('chat_id', sa.Integer(), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_messages_id'), 'messages', ['id'], unique=False)
    op.create_index(op.f('ix_messages_chat_id'), 'messages', ['chat_id'], unique=False)

    # 12. support_tickets table
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('priority', sa.String(length=50), server_default='normal', nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='open', nullable=False),
        sa.Column('admin_reply', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_support_tickets_id'), 'support_tickets', ['id'], unique=False)
    op.create_index(op.f('ix_support_tickets_user_id'), 'support_tickets', ['user_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_status'), 'support_tickets', ['status'], unique=False)


def downgrade() -> None:
    op.drop_table('support_tickets')
    op.drop_table('messages')
    op.drop_table('chats')
    op.drop_table('transactions')
    op.drop_table('project_files')
    op.drop_table('project_milestones')
    op.drop_table('projects')
    op.drop_table('task_bids')
    op.drop_table('tasks')
    op.drop_table('ideas')
    op.drop_table('accounts')
    op.drop_column('users', 'moderation_comment')
    op.drop_column('users', 'patents_info')
    op.drop_column('users', 'is_admin')
    op.drop_column('users', 'verification_status')
