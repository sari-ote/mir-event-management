"""Add gender to TableHead

Revision ID: b864e5bba835
Revises: 0286c067f07f
Create Date: 2025-07-21 14:02:37.981851

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b864e5bba835'
down_revision: Union[str, Sequence[str], None] = '0286c067f07f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('table_heads', sa.Column('gender', sa.String(), nullable=False, server_default='male'))
    # אפשר להוריד את server_default אחרי הרצת המיגרציה

def downgrade():
    op.drop_column('table_heads', 'gender')