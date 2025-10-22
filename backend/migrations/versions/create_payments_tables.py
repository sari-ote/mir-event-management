"""create payments tables

Revision ID: c1d2e3f4g5h6
Revises: dd7f2c958828
Create Date: 2025-01-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func
from typing import Union, Sequence

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'dd7f2c958828'
branch_labels = None
depends_on = None


def upgrade():
    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        
        # Foreign keys
        sa.Column('event_id', sa.Integer, sa.ForeignKey('events.id'), nullable=False),
        sa.Column('guest_id', sa.Integer, sa.ForeignKey('guests.id'), nullable=True),
        
        # Nedarim Plus data
        sa.Column('transaction_id', sa.String, nullable=True, unique=True, index=True),
        sa.Column('client_id', sa.String, nullable=True),
        
        # Client details
        sa.Column('zeout', sa.String, nullable=True),
        sa.Column('client_name', sa.String, nullable=True),
        sa.Column('address', sa.String, nullable=True),
        sa.Column('phone', sa.String, nullable=True),
        sa.Column('mail', sa.String, nullable=True),
        
        # Transaction details
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('currency', sa.String, default='1'),
        sa.Column('payment_type', sa.String, nullable=False),
        sa.Column('transaction_type', sa.String, nullable=True),
        
        # Credit card details (partial)
        sa.Column('last_num', sa.String, nullable=True),
        sa.Column('tokef', sa.String, nullable=True),
        
        # Payment details
        sa.Column('tashloumim', sa.Integer, default=1),
        sa.Column('first_tashloum', sa.Float, nullable=True),
        
        # Confirmation details
        sa.Column('confirmation', sa.String, nullable=True),
        sa.Column('shovar', sa.String, nullable=True),
        sa.Column('compagny_card', sa.String, nullable=True),
        sa.Column('solek', sa.String, nullable=True),
        
        # Metadata
        sa.Column('groupe', sa.String, nullable=True),
        sa.Column('comments', sa.Text, nullable=True),
        sa.Column('makor', sa.String, nullable=True),
        
        # Status
        sa.Column('status', sa.String, default='pending'),
        sa.Column('error_message', sa.Text, nullable=True),
        
        # Standing order (Hok Keva)
        sa.Column('keva_id', sa.String, nullable=True),
        sa.Column('next_date', sa.DateTime, nullable=True),
        
        # Receipt
        sa.Column('receipt_created', sa.Boolean, default=False),
        sa.Column('receipt_data', sa.String, nullable=True),
        sa.Column('receipt_doc_num', sa.String, nullable=True),
        
        # Custom parameters
        sa.Column('param1', sa.String, nullable=True),
        sa.Column('param2', sa.String, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()),
        sa.Column('transaction_time', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=func.now()),
    )
    
    # Create payment_logs table
    op.create_table(
        'payment_logs',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('payment_id', sa.Integer, sa.ForeignKey('payments.id'), nullable=True),
        sa.Column('raw_data', sa.Text, nullable=False),
        sa.Column('source_ip', sa.String, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()),
    )


def downgrade():
    op.drop_table('payment_logs')
    op.drop_table('payments')

