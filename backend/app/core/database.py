"""
Database configuration and session management for EduPulse Backend.
Connects to SQLite Data Warehouse (or PostgreSQL if configured via DATABASE_URL).
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlite3 import Connection as SQLite3Connection

# Default to SQLite local warehouse file
edupulse_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
base_dir = edupulse_dir if os.path.basename(edupulse_dir) == "Edupulse" else os.path.join(edupulse_dir, "Edupulse")
DEFAULT_DB_PATH = os.path.join(base_dir, "database", "edupulse_dw.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Enforce foreign keys on SQLite connections
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, SQLite3Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
