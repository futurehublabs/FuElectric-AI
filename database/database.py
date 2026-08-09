import sqlite3
from typing import List, Optional
from datetime import datetime


DATABASE_NAME = "fu_electric_ai.db"


# ==========================================================
# DATABASE CONNECTION
# ==========================================================

def get_connection():
    """
    Create and return a SQLite database connection.
    """

    conn = sqlite3.connect(
        DATABASE_NAME,
        timeout=10
    )

    conn.row_factory = sqlite3.Row

    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    # Give SQLite time to wait if another operation is using DB
    conn.execute("PRAGMA busy_timeout = 10000")

    return conn


# ==========================================================
# CREATE DATABASE TABLES
# ==========================================================

def create_tables():

    conn = get_connection()

    try:

        # ======================================================
        # EQUIPMENT TABLE
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS equipment (

                equipment_id TEXT PRIMARY KEY,

                name TEXT NOT NULL,

                category TEXT NOT NULL,

                manufacturer TEXT,

                model TEXT,

                serial_number TEXT,

                location TEXT NOT NULL,

                installation_date TEXT,

                status TEXT DEFAULT 'Active',

                last_maintenance TEXT

            )
        """)

        # ======================================================
        # MAINTENANCE HISTORY TABLE
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_history (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                equipment_id TEXT NOT NULL,

                maintenance_date TEXT NOT NULL,

                maintenance_type TEXT NOT NULL,

                description TEXT NOT NULL,

                technician TEXT,

                cost REAL DEFAULT 0,

                status TEXT DEFAULT 'Completed',

                FOREIGN KEY (equipment_id)
                REFERENCES equipment(equipment_id)
                ON DELETE CASCADE

            )
        """)

        # ======================================================
        # TECHNICIANS TABLE
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS technicians (

                technician_id TEXT PRIMARY KEY,

                name TEXT NOT NULL,

                specialization TEXT NOT NULL,

                phone TEXT,

                department TEXT,

                experience_years INTEGER DEFAULT 0

            )
        """)

        # ======================================================
        # REPAIRS TABLE
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS repairs (

                repair_id TEXT PRIMARY KEY,

                equipment_id TEXT NOT NULL,

                fault_reported TEXT NOT NULL,

                diagnosis TEXT,

                action_taken TEXT,

                technician_id TEXT,

                repair_date TEXT,

                repair_status TEXT DEFAULT 'Pending',

                FOREIGN KEY (equipment_id)
                REFERENCES equipment(equipment_id)
                ON DELETE CASCADE,

                FOREIGN KEY (technician_id)
                REFERENCES technicians(technician_id)

            )
        """)

        # ======================================================
        # USERS TABLE
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (

                user_id TEXT PRIMARY KEY,

                username TEXT NOT NULL UNIQUE,

                email TEXT NOT NULL UNIQUE,

                password_hash TEXT NOT NULL,

                role TEXT DEFAULT 'Viewer'

            )
        """)

        conn.commit()

    finally:

        conn.close()


# ==========================================================
# EQUIPMENT FUNCTIONS
# ==========================================================

def add_equipment(equipment):

    conn = get_connection()

    try:

        conn.execute("""
            INSERT INTO equipment (
                equipment_id,
                name,
                category,
                manufacturer,
                model,
                serial_number,
                location,
                installation_date,
                status,
                last_maintenance
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            equipment.equipment_id,
            equipment.name,
            equipment.category,
            getattr(equipment, "manufacturer", None),
            getattr(equipment, "model", None),
            getattr(equipment, "serial_number", None),
            equipment.location,
            getattr(equipment, "installation_date", None),
            getattr(equipment, "status", "Active"),
            getattr(equipment, "last_maintenance", None)
        ))

        conn.commit()

    finally:

        conn.close()


def get_all_equipment() -> List[dict]:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM equipment
            ORDER BY name
        """)

        equipment = cursor.fetchall()

        return [dict(row) for row in equipment]

    finally:

        conn.close()


def get_equipment_by_id(
    equipment_id: str
) -> Optional[dict]:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,))

        equipment = cursor.fetchone()

        if equipment:
            return dict(equipment)

        return None

    finally:

        conn.close()


def update_equipment(
    equipment_id: str,
    equipment
):

    conn = get_connection()

    try:

        conn.execute("""
            UPDATE equipment
            SET
                name = ?,
                category = ?,
                manufacturer = ?,
                model = ?,
                serial_number = ?,
                location = ?,
                installation_date = ?,
                status = ?,
                last_maintenance = ?
            WHERE equipment_id = ?
        """, (
            equipment.name,
            equipment.category,
            getattr(equipment, "manufacturer", None),
            getattr(equipment, "model", None),
            getattr(equipment, "serial_number", None),
            equipment.location,
            getattr(equipment, "installation_date", None),
            getattr(equipment, "status", "Active"),
            getattr(equipment, "last_maintenance", None),
            equipment_id
        ))

        conn.commit()

    finally:

        conn.close()


def delete_equipment(
    equipment_id: str
) -> bool:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()


def search_equipment(keyword: str):

    conn = get_connection()

    try:

        search = f"%{keyword}%"

        cursor = conn.execute("""
            SELECT *
            FROM equipment
            WHERE
                equipment_id LIKE ?
                OR name LIKE ?
                OR category LIKE ?
                OR manufacturer LIKE ?
                OR model LIKE ?
                OR serial_number LIKE ?
                OR location LIKE ?
                OR status LIKE ?
            ORDER BY name
        """, (
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search
        ))

        equipment = cursor.fetchall()

        return [dict(row) for row in equipment]

    finally:

        conn.close()


# ==========================================================
# MAINTENANCE HISTORY FUNCTIONS
# ==========================================================

def add_maintenance(record):

    conn = get_connection()

    # Add maintenance record
    conn.execute("""
        INSERT INTO maintenance_history (
            equipment_id,
            maintenance_date,
            maintenance_type,
            description,
            technician,
            cost,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        record.equipment_id,
        record.maintenance_date,
        record.maintenance_type,
        record.description,
        record.technician,
        record.cost,
        record.status
    ))

    # Update equipment's last maintenance date
    conn.execute("""
        UPDATE equipment
        SET last_maintenance = ?
        WHERE equipment_id = ?
    """, (
        record.maintenance_date,
        record.equipment_id
    ))

    conn.commit()
    conn.close()

def get_maintenance_history(
    equipment_id: str
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date DESC
        """, (equipment_id,))

        records = cursor.fetchall()

        return [dict(row) for row in records]

    finally:

        conn.close()


def get_maintenance_by_id(
    record_id: int
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM maintenance_history
            WHERE id = ?
        """, (record_id,))

        record = cursor.fetchone()

        if record:
            return dict(record)

        return None

    finally:

        conn.close()


def update_maintenance(
    record_id: int,
    record
):

    conn = get_connection()

    try:

        conn.execute("""
            UPDATE maintenance_history
            SET
                maintenance_date = ?,
                maintenance_type = ?,
                description = ?,
                technician = ?,
                cost = ?,
                status = ?
            WHERE id = ?
        """, (
            record.maintenance_date,
            record.maintenance_type,
            record.description,
            getattr(record, "technician", None),
            getattr(record, "cost", 0),
            getattr(record, "status", "Completed"),
            record_id
        ))

        conn.commit()

    finally:

        conn.close()


def delete_maintenance(
    record_id: int
) -> bool:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM maintenance_history
            WHERE id = ?
        """, (record_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()


# ==========================================================
# TECHNICIAN FUNCTIONS
# ==========================================================

def add_technician(technician):

    conn = get_connection()

    try:

        conn.execute("""
            INSERT INTO technicians (
                technician_id,
                name,
                specialization,
                phone,
                department,
                experience_years
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            technician.technician_id,
            technician.name,
            technician.specialization,
            getattr(technician, "phone", None),
            getattr(technician, "department", None),
            getattr(technician, "experience_years", 0)
        ))

        conn.commit()

    finally:

        conn.close()


def get_all_technicians():

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM technicians
            ORDER BY name
        """)

        technicians = cursor.fetchall()

        return [dict(row) for row in technicians]

    finally:

        conn.close()


def get_technician_by_id(
    technician_id: str
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM technicians
            WHERE technician_id = ?
        """, (technician_id,))

        technician = cursor.fetchone()

        if technician:
            return dict(technician)

        return None

    finally:

        conn.close()


def update_technician(
    technician_id: str,
    technician
):

    conn = get_connection()

    try:

        conn.execute("""
            UPDATE technicians
            SET
                name = ?,
                specialization = ?,
                phone = ?,
                department = ?,
                experience_years = ?
            WHERE technician_id = ?
        """, (
            technician.name,
            technician.specialization,
            getattr(technician, "phone", None),
            getattr(technician, "department", None),
            getattr(technician, "experience_years", 0),
            technician_id
        ))

        conn.commit()

    finally:

        conn.close()


def delete_technician(
    technician_id: str
) -> bool:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM technicians
            WHERE technician_id = ?
        """, (technician_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()


# ==========================================================
# REPAIR FUNCTIONS
# ==========================================================

def add_repair(repair):

    conn = get_connection()

    try:

        conn.execute("""
            INSERT INTO repairs (
                repair_id,
                equipment_id,
                fault_reported,
                diagnosis,
                action_taken,
                technician_id,
                repair_date,
                repair_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            repair.repair_id,
            repair.equipment_id,
            repair.fault_reported,
            getattr(repair, "diagnosis", None),
            getattr(repair, "action_taken", None),
            getattr(repair, "technician_id", None),
            getattr(repair, "repair_date", None),
            getattr(repair, "repair_status", "Pending")
        ))

        conn.commit()

    finally:

        conn.close()


def get_repairs(
    equipment_id: str
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date DESC
        """, (equipment_id,))

        repairs = cursor.fetchall()

        return [dict(row) for row in repairs]

    finally:

        conn.close()


def get_repair_by_id(
    repair_id: str
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM repairs
            WHERE repair_id = ?
        """, (repair_id,))

        repair = cursor.fetchone()

        if repair:
            return dict(repair)

        return None

    finally:

        conn.close()


def update_repair(
    repair_id: str,
    repair
):

    conn = get_connection()

    try:

        conn.execute("""
            UPDATE repairs
            SET
                fault_reported = ?,
                diagnosis = ?,
                action_taken = ?,
                technician_id = ?,
                repair_date = ?,
                repair_status = ?
            WHERE repair_id = ?
        """, (
            repair.fault_reported,
            getattr(repair, "diagnosis", None),
            getattr(repair, "action_taken", None),
            getattr(repair, "technician_id", None),
            getattr(repair, "repair_date", None),
            getattr(repair, "repair_status", "Pending"),
            repair_id
        ))

        conn.commit()

    finally:

        conn.close()


def delete_repair(
    repair_id: str
) -> bool:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM repairs
            WHERE repair_id = ?
        """, (repair_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()


# ==========================================================
# DASHBOARD
# ==========================================================

def get_dashboard():

    conn = get_connection()

    try:

        total_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment"
        ).fetchone()[0]

        active_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment WHERE status = 'Active'"
        ).fetchone()[0]

        maintenance_records = conn.execute(
            "SELECT COUNT(*) FROM maintenance_history"
        ).fetchone()[0]

        technicians = conn.execute(
            "SELECT COUNT(*) FROM technicians"
        ).fetchone()[0]

        pending_repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs WHERE repair_status = 'Pending'"
        ).fetchone()[0]

        completed_repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs WHERE repair_status = 'Completed'"
        ).fetchone()[0]

        return {
            "total_equipment": total_equipment,
            "active_equipment": active_equipment,
            "maintenance_records": maintenance_records,
            "technicians": technicians,
            "pending_repairs": pending_repairs,
            "completed_repairs": completed_repairs
        }

    finally:

        conn.close()


# ==========================================================
# EQUIPMENT HEALTH SCORE
# ==========================================================

def get_equipment_health(
    equipment_id: str
):

    conn = get_connection()

    try:

        equipment = conn.execute("""
            SELECT *
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        maintenance_count = conn.execute("""
            SELECT COUNT(*)
            FROM maintenance_history
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()[0]

        repair_count = conn.execute("""
            SELECT COUNT(*)
            FROM repairs
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()[0]

        score = 100

        score -= repair_count * 10
        score += maintenance_count * 2

        score = max(0, min(100, score))

        if score >= 90:
            status = "Excellent"
        elif score >= 75:
            status = "Good"
        elif score >= 50:
            status = "Fair"
        else:
            status = "Poor"

        return {
            "equipment_id": equipment_id,
            "health_score": score,
            "status": status,
            "total_repairs": repair_count,
            "maintenance_records": maintenance_count
        }

    finally:

        conn.close()


# ==========================================================
# ANALYTICS
# ==========================================================

def get_analytics():

    conn = get_connection()

    try:

        total_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment"
        ).fetchone()[0]

        active_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment WHERE status='Active'"
        ).fetchone()[0]

        total_maintenance = conn.execute(
            "SELECT COUNT(*) FROM maintenance_history"
        ).fetchone()[0]

        total_repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs"
        ).fetchone()[0]

        pending_repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs WHERE repair_status='Pending'"
        ).fetchone()[0]

        completed_repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs WHERE repair_status='Completed'"
        ).fetchone()[0]

        total_technicians = conn.execute(
            "SELECT COUNT(*) FROM technicians"
        ).fetchone()[0]

        equipment = conn.execute("""
            SELECT equipment_id, COUNT(*) AS repairs
            FROM repairs
            GROUP BY equipment_id
            ORDER BY repairs DESC
            LIMIT 1
        """).fetchone()

        most_repaired_equipment = (
            equipment["equipment_id"]
            if equipment else None
        )

        fault = conn.execute("""
            SELECT fault_reported, COUNT(*) AS total
            FROM repairs
            GROUP BY fault_reported
            ORDER BY total DESC
            LIMIT 1
        """).fetchone()

        most_common_fault = (
            fault["fault_reported"]
            if fault else None
        )

        return {
            "total_equipment": total_equipment,
            "active_equipment": active_equipment,
            "total_maintenance": total_maintenance,
            "total_repairs": total_repairs,
            "pending_repairs": pending_repairs,
            "completed_repairs": completed_repairs,
            "total_technicians": total_technicians,
            "most_repaired_equipment": most_repaired_equipment,
            "most_common_fault": most_common_fault
        }

    finally:

        conn.close()


# ==========================================================
# MAINTENANCE ALERTS
# ==========================================================

def get_maintenance_alerts():

    conn = get_connection()

    try:

        overdue = conn.execute("""
            SELECT
                equipment_id,
                name,
                last_maintenance,
                status
            FROM equipment
            WHERE last_maintenance IS NULL
               OR last_maintenance = ''
        """).fetchall()

        return {
            "total_alerts": len(overdue),
            "alerts": [dict(row) for row in overdue]
        }

    finally:

        conn.close()


# ==========================================================
# SUMMARY REPORT
# ==========================================================

def get_summary_report():

    conn = get_connection()

    try:

        total_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment"
        ).fetchone()[0]

        active_equipment = conn.execute(
            "SELECT COUNT(*) FROM equipment WHERE status='Active'"
        ).fetchone()[0]

        maintenance_records = conn.execute(
            "SELECT COUNT(*) FROM maintenance_history"
        ).fetchone()[0]

        technicians = conn.execute(
            "SELECT COUNT(*) FROM technicians"
        ).fetchone()[0]

        repairs = conn.execute(
            "SELECT COUNT(*) FROM repairs"
        ).fetchone()[0]

        return {
            "report_name": "FuElectric-AI Summary Report",
            "generated_on": datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
            "total_equipment": total_equipment,
            "active_equipment": active_equipment,
            "maintenance_records": maintenance_records,
            "repairs": repairs,
            "technicians": technicians
        }

    finally:

        conn.close()


# ==========================================================
# USER FUNCTIONS
# ==========================================================

def add_user(
    user_id,
    username,
    email,
    password_hash,
    role="Viewer"
):

    conn = get_connection()

    try:

        conn.execute("""
            INSERT INTO users (
                user_id,
                username,
                email,
                password_hash,
                role
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            username,
            email,
            password_hash,
            role
        ))

        conn.commit()

    finally:

        conn.close()


def get_user_by_username(
    username
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM users
            WHERE username = ?
        """, (username,))

        user = cursor.fetchone()

        if user:
            return dict(user)

        return None

    finally:

        conn.close()


def get_user_by_email(
    email
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM users
            WHERE email = ?
        """, (email,))

        user = cursor.fetchone()

        if user:
            return dict(user)

        return None

    finally:

        conn.close()


def get_user_by_id(
    user_id
):

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM users
            WHERE user_id = ?
        """, (user_id,))

        user = cursor.fetchone()

        if user:
            return dict(user)

        return None

    finally:

        conn.close()


def get_all_users():

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT
                user_id,
                username,
                email,
                role
            FROM users
            ORDER BY username
        """)

        users = cursor.fetchall()

        return [dict(row) for row in users]

    finally:

        conn.close()


def delete_user(
    user_id
) -> bool:

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM users
            WHERE user_id = ?
        """, (user_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()