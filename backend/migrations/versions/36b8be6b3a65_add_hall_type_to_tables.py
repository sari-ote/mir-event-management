"""add hall_type to tables

Revision ID: 36b8be6b3a65
Revises: bd7f89d75eb7
Create Date: 2025-07-20 12:43:56.992777

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '36b8be6b3a65'
down_revision: Union[str, Sequence[str], None] = 'bd7f89d75eb7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
      op.add_column('tables', sa.Column('hall_type', sa.String(), nullable=False, server_default='men'))
      op.alter_column('tables', 'hall_type', server_default=None)

def downgrade() -> None:
    op.drop_column('tables', 'hall_type')