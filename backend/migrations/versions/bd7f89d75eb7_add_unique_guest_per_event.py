"""add unique constraint guest_id+event_id to seatings

Revision ID: bd7f89d75eb7
Revises: 94a1d3b96517
Create Date: 2024-06-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bd7f89d75eb7'
down_revision: Union[str, Sequence[str], None] = '94a1d3b96517'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('unique_guest_per_event', 'seatings', ['guest_id', 'event_id'])

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('unique_guest_per_event', 'seatings', type_='unique') 