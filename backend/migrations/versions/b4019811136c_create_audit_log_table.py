from alembic import op
import sqlalchemy as sa
from typing import Union, Sequence

# revision identifiers, used by Alembic.
revision: str = 'b4019811136c'
down_revision: Union[str, Sequence[str], None] = 'ffb37b4e6e13'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('user_id', sa.Integer, nullable=True),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer, nullable=False),
        sa.Column('field', sa.String(50), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP'))
    )

def downgrade():
    op.drop_table('audit_log')