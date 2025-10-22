"""add user_name to audit_log

Revision ID: 4ebfd38042d9
Revises: b4019811136c
Create Date: 2025-07-27 12:03:16.033513

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ebfd38042d9'
down_revision: Union[str, Sequence[str], None] = 'ffb37b4e6e13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('audit_log', sa.Column('user_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('audit_log', 'user_name')
