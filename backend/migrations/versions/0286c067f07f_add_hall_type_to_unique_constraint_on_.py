"""Add hall_type to unique constraint on tables

Revision ID: 0286c067f07f
Revises: 36b8be6b3a65
Create Date: 2025-07-21 13:04:24.506429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0286c067f07f'
down_revision: Union[str, Sequence[str], None] = '36b8be6b3a65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Drop the old unique constraint
    op.drop_constraint('uq_event_table_number', 'tables', type_='unique')
    # Add the new unique constraint with hall_type
    op.create_unique_constraint('uq_event_table_number', 'tables', ['event_id', 'table_number', 'hall_type'])

def downgrade():
    # Remove the new constraint
    op.drop_constraint('uq_event_table_number', 'tables', type_='unique')
    # Restore the old constraint
    op.create_unique_constraint('uq_event_table_number', 'tables', ['event_id', 'table_number'])
