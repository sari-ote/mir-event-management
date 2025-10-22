"""merge payments tables

Revision ID: a9a8accdf1cb
Revises: add_shape_column_simple, c1d2e3f4g5h6
Create Date: 2025-10-21 16:00:38.304270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9a8accdf1cb'
down_revision: Union[str, Sequence[str], None] = ('add_shape_column_simple', 'c1d2e3f4g5h6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
