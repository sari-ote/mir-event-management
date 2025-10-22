from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.database import Base  # טעינת Base שלך
from app.events import models as events_models
from app.guests import models as guests_models
from app.tables import models as tables_models
from app.seatings import models as seatings_models
from app.users import models as users_models
from app.permissions import models as permissions_models
# קריאת קובץ ההגדרות alembic.ini
config = context.config

# הגדרת לוגים
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# טעינת ה-MetaData של המודלים שלך
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """הרצת מיגרציה במצב offline (ללא חיבור ממשי למסד נתונים)"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """הרצת מיגרציה במצב online (עם חיבור למסד נתונים)"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
