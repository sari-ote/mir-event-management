"""add id_number to users

Revision ID: 84dbbca6a590
Revises: 2b20dd9ce5cd
Create Date: 2025-07-09 12:15:33.834709

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84dbbca6a590'
down_revision: Union[str, Sequence[str], None] = '2b20dd9ce5cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('id_number', sa.String(), nullable=True))

    # עדכון עם ערכים ייחודיים זמניים לכל משתמש
    op.execute("""
        DO $$
        DECLARE
            r RECORD;
            i INT := 1;
        BEGIN
            FOR r IN SELECT id FROM users LOOP
                UPDATE users SET id_number = 'TEMP_ID_' || i WHERE id = r.id;
                i := i + 1;
            END LOOP;
        END$$;
    """)

    op.alter_column('users', 'id_number', nullable=False)
    op.create_unique_constraint(None, 'users', ['id_number'])



def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'users', type_='unique')
    op.drop_column('users', 'id_number')
