"""merge heads

Revision ID: ffb37b4e6e13
Revises: 4ca9f700798b
Create Date: 2025-07-24 16:11:44.135456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffb37b4e6e13'
down_revision: Union[str, Sequence[str], None] = '4ca9f700798b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
