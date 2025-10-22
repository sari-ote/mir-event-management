"""Add HallElement table

Revision ID: add_hallelement_simple
Revises: 6e9adb5f0a45
Create Date: 2025-08-13 16:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_hallelement_simple'
down_revision: Union[str, Sequence[str], None] = '6e9adb5f0a45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create hall_elements table
    op.create_table('hall_elements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('element_type', sa.String(), nullable=False),
        sa.Column('x', sa.Float(), nullable=True),
        sa.Column('y', sa.Float(), nullable=True),
        sa.Column('width', sa.Float(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('rotation', sa.Float(), nullable=True),
        sa.Column('hall_type', sa.String(), nullable=False),
        sa.Column('properties', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'name', 'hall_type', name='uq_event_element_name')
    )
    op.create_index(op.f('ix_hall_elements_id'), 'hall_elements', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop hall_elements table
    op.drop_index(op.f('ix_hall_elements_id'), table_name='hall_elements')
    op.drop_table('hall_elements') 