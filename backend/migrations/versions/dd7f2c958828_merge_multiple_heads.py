"""merge multiple heads

Revision ID: dd7f2c958828
Revises: 4ebfd38042d9, b4019811136c
Create Date: 2025-07-28 13:30:50.464437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd7f2c958828'
down_revision: Union[str, Sequence[str], None] = ('4ebfd38042d9', 'b4019811136c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
