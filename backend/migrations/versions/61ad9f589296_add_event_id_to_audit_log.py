"""add_event_id_to_audit_log

Revision ID: 61ad9f589296
Revises: dd7f2c958828
Create Date: 2025-07-28 14:45:54.473728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61ad9f589296'
down_revision: Union[str, Sequence[str], None] = 'dd7f2c958828'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # הוספת שדה event_id לטבלת audit_log
    op.add_column('audit_log', sa.Column('event_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # הסרת שדה event_id מטבלת audit_log
    op.drop_column('audit_log', 'event_id')
