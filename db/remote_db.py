"""
db/remote_db.py — Universal Database Persistence Layer for Atlas.
Supports remote PostgreSQL (Supabase, Neon, AWS RDS, or any Postgres instance)
with graceful fallback to SQLite for local development.

Provides:
- LangGraph checkpointing (PostgresSaver when remote, SqliteSaver when local)
- Persistent support tickets table
- Persistent long-term knowledge graph / memory
- Live equipment telemetry table
- Users, sessions, and audit logging
"""

import os
import sqlite3
import datetime
from typing import Optional, Dict, Any, List
from config import settings
from logger import get_logger

logger = get_logger("database")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


class RemoteDatabaseManager:
    """Manages connections to remote PostgreSQL or local SQLite."""

    def __init__(self, db_url: str = ""):
        self.db_url = db_url or DATABASE_URL
        self.is_postgres = bool(self.db_url and (self.db_url.startswith("postgres://") or self.db_url.startswith("postgresql://")))
        self._init_db()

    def _get_pg_connection(self):
        try:
            import psycopg
            # psycopg 3 connection
            conn = psycopg.connect(self.db_url, autocommit=True)
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to remote PostgreSQL: {e}")
            raise

    def _get_sqlite_connection(self):
        conn = sqlite3.connect(settings.SQLITE_DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA cache_size=-64000;")
        conn.execute("PRAGMA temp_store=MEMORY;")
        return conn

    def get_connection(self):
        if self.is_postgres:
            try:
                return self._get_pg_connection()
            except Exception:
                logger.warning("Falling back to local SQLite due to PostgreSQL connection error.")
                return self._get_sqlite_connection()
        return self._get_sqlite_connection()

    def _init_db(self):
        """Initialize required database schemas."""
        conn = self.get_connection()
        is_pg = hasattr(conn, "info") or "psycopg" in str(type(conn))

        try:
            cursor = conn.cursor()
            
            # 1. Support Tickets Table
            if is_pg:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS support_tickets (
                        id VARCHAR(64) PRIMARY KEY,
                        equipment_id VARCHAR(128),
                        issue_description TEXT,
                        priority VARCHAR(32),
                        status VARCHAR(32) DEFAULT 'open',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        metadata JSONB
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS equipment_telemetry (
                        equipment_id VARCHAR(128) PRIMARY KEY,
                        status VARCHAR(64),
                        temperature_c NUMERIC,
                        pressure_psi NUMERIC,
                        vibration_hz NUMERIC,
                        last_maintenance VARCHAR(64),
                        manual_ref TEXT,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_trail (
                        id BIGSERIAL PRIMARY KEY,
                        event_type VARCHAR(64),
                        user_id VARCHAR(128),
                        action_details TEXT,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            else:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS support_tickets (
                        id TEXT PRIMARY KEY,
                        equipment_id TEXT,
                        issue_description TEXT,
                        priority TEXT,
                        status TEXT DEFAULT 'open',
                        created_at TEXT,
                        metadata TEXT
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS equipment_telemetry (
                        equipment_id TEXT PRIMARY KEY,
                        status TEXT,
                        temperature_c REAL,
                        pressure_psi REAL,
                        vibration_hz REAL,
                        last_maintenance TEXT,
                        manual_ref TEXT,
                        updated_at TEXT
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_trail (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_type TEXT,
                        user_id TEXT,
                        action_details TEXT,
                        timestamp TEXT
                    );
                """)
                conn.commit()

            # Seed default equipment data if empty
            cursor.execute("SELECT COUNT(*) FROM equipment_telemetry")
            count = cursor.fetchone()[0]
            if count == 0:
                initial_equipment = [
                    ("conveyor-belt-3", "operational", 48.5, 85.0, 12.4, "2026-05-14", "Section 4.2: Belt tension should be 80-90 PSI"),
                    ("hydraulic-press-1", "operational", 68.2, 2850.0, 8.1, "2026-06-01", "Section 7.1: Max pressure 3000 PSI, check seals monthly"),
                    ("cooling-pump-2", "under maintenance", 88.4, 42.0, 24.8, "2026-06-28", "Section 2.5: Coolant flow rate should be 40-60 L/min"),
                    ("turbine-generator-4", "operational", 72.0, 145.0, 4.2, "2026-07-15", "Section 1.8: Vibration limit 6.0 Hz peak"),
                    ("feedwater-heater-A", "degraded", 96.5, 410.0, 18.2, "2026-08-02", "Section 3.1: Steam pressure limit 450 PSI, check tube leaks"),
                ]
                now_str = datetime.datetime.utcnow().isoformat()
                for eq in initial_equipment:
                    cursor.execute("""
                        INSERT INTO equipment_telemetry 
                        (equipment_id, status, temperature_c, pressure_psi, vibration_hz, last_maintenance, manual_ref, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """ if not is_pg else """
                        INSERT INTO equipment_telemetry 
                        (equipment_id, status, temperature_c, pressure_psi, vibration_hz, last_maintenance, manual_ref, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (*eq, now_str))
                if not is_pg:
                    conn.commit()

            logger.info(f"Database initialized successfully. Mode: {'Remote PostgreSQL' if is_pg else 'SQLite Fallback'}")
        except Exception as e:
            logger.error(f"Error during schema initialization: {e}")
        finally:
            conn.close()

    def get_checkpointer(self):
        """Returns appropriate LangGraph Checkpointer (PostgresSaver or SqliteSaver)."""
        if self.is_postgres:
            try:
                from langgraph.checkpoint.postgres import PostgresSaver
                # Connect with psycopg
                conn = self._get_pg_connection()
                checkpointer = PostgresSaver(conn)
                checkpointer.setup()
                logger.info(f"Using remote PostgreSQL checkpointing on: {self.db_url.split('@')[-1]}")
                return checkpointer
            except Exception as e:
                logger.warning(f"Could not initialize PostgresSaver ({e}), falling back to SQLite.")

        from langgraph.checkpoint.sqlite import SqliteSaver
        conn = self._get_sqlite_connection()
        return SqliteSaver(conn)

    def save_ticket(self, ticket_id: str, equipment_id: str, issue: str, priority: str, metadata: Dict[str, Any] = None) -> bool:
        conn = self.get_connection()
        is_pg = hasattr(conn, "info") or "psycopg" in str(type(conn))
        try:
            import json
            meta_json = json.dumps(metadata or {})
            now = datetime.datetime.utcnow().isoformat()
            cursor = conn.cursor()
            query = """
                INSERT INTO support_tickets (id, equipment_id, issue_description, priority, created_at, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
            """ if is_pg else """
                INSERT INTO support_tickets (id, equipment_id, issue_description, priority, created_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            cursor.execute(query, (ticket_id, equipment_id, issue, priority, now, meta_json))
            if not is_pg:
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to save ticket {ticket_id}: {e}")
            return False
        finally:
            conn.close()

    def get_equipment(self, equipment_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        is_pg = hasattr(conn, "info") or "psycopg" in str(type(conn))
        try:
            cursor = conn.cursor()
            query = "SELECT equipment_id, status, temperature_c, pressure_psi, vibration_hz, last_maintenance, manual_ref FROM equipment_telemetry WHERE LOWER(equipment_id) = LOWER(%s)" if is_pg else "SELECT equipment_id, status, temperature_c, pressure_psi, vibration_hz, last_maintenance, manual_ref FROM equipment_telemetry WHERE LOWER(equipment_id) = LOWER(?)"
            cursor.execute(query, (equipment_id.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "equipment_id": row[0],
                "status": row[1],
                "temperature_c": float(row[2]) if row[2] is not None else None,
                "pressure_psi": float(row[3]) if row[3] is not None else None,
                "vibration_hz": float(row[4]) if row[4] is not None else None,
                "last_maintenance": row[5],
                "manual_ref": row[6],
            }
        finally:
            conn.close()


db_manager = RemoteDatabaseManager()
