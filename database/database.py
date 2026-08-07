import sqlite3
from typing import List, Optional

DATABASE_NAME = "fu_electric_ai.db"


# ==========================================================
# DATABASE CONNECTION
# ==========================================================

def get_connection():
    """
    Create and return a SQLite database connection.
    """

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row

    # Enable Foreign Keys
    conn.execute("PRAGMA foreign_keys = ON")

    return conn


# ==========================================================
# CREATE DATABASE TABLES
# ==========================================================

def create_tables():

    conn = get_connection()

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

    conn.commit()
    conn.close()

    # ==========================================================
# EQUIPMENT FUNCTIONS
# ==========================================================

def add_equipment(equipment):

    conn = get_connection()

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
    """,
    (
        equipment.equipment_id,
        equipment.name,
        equipment.category,
        equipment.manufacturer,
        equipment.model,
        equipment.serial_number,
        equipment.location,
        equipment.installation_date,
        equipment.status,
        equipment.last_maintenance
    ))

    conn.commit()
    conn.close()


def get_all_equipment() -> List[dict]:

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM equipment
        ORDER BY name
    """)

    equipment = cursor.fetchall()

    conn.close()

    return [dict(row) for row in equipment]


def get_equipment_by_id(equipment_id: str) -> Optional[dict]:

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM equipment
        WHERE equipment_id = ?
    """,
    (equipment_id,)
    )

    equipment = cursor.fetchone()

    conn.close()

    if equipment:
        return dict(equipment)

    return None


def update_equipment(equipment_id: str, equipment):

    conn = get_connection()

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
    """,
    (
        equipment.name,
        equipment.category,
        equipment.manufacturer,
        equipment.model,
        equipment.serial_number,
        equipment.location,
        equipment.installation_date,
        equipment.status,
        equipment.last_maintenance,
        equipment_id
    ))

    conn.commit()
    conn.close()


def delete_equipment(equipment_id: str) -> bool:

    conn = get_connection()

    cursor = conn.execute("""
        DELETE FROM equipment
        WHERE equipment_id = ?
    """,
    (equipment_id,)
    )

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted


def search_equipment(keyword: str):

    conn = get_connection()

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
    """,
    (
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%",
        f"%{keyword}%"
    ))

    equipment = cursor.fetchall()

    conn.close()

    return [dict(row) for row in equipment]

# ==========================================================
# MAINTENANCE HISTORY FUNCTIONS
# ==========================================================

def add_maintenance(record):

    conn = get_connection()

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
    """,
    (
        record.equipment_id,
        record.maintenance_date,
        record.maintenance_type,
        record.description,
        record.technician,
        record.cost,
        record.status
    ))

    conn.commit()
    conn.close()


def get_maintenance_history(equipment_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM maintenance_history
        WHERE equipment_id = ?
        ORDER BY maintenance_date DESC
    """,
    (equipment_id,)
    )

    records = cursor.fetchall()

    conn.close()

    return [dict(row) for row in records]


def get_maintenance_by_id(record_id: int):

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM maintenance_history
        WHERE id = ?
    """,
    (record_id,)
    )

    record = cursor.fetchone()

    conn.close()

    if record:
        return dict(record)

    return None


def update_maintenance(record_id: int, record):

    conn = get_connection()

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
    """,
    (
        record.maintenance_date,
        record.maintenance_type,
        record.description,
        record.technician,
        record.cost,
        record.status,
        record_id
    ))

    conn.commit()
    conn.close()


def delete_maintenance(record_id: int):

    conn = get_connection()

    cursor = conn.execute("""
        DELETE FROM maintenance_history
        WHERE id = ?
    """,
    (record_id,)
    )

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted


# ==========================================================
# TECHNICIAN FUNCTIONS
# ==========================================================

def add_technician(technician):

    conn = get_connection()

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
    """,
    (
        technician.technician_id,
        technician.name,
        technician.specialization,
        technician.phone,
        technician.department,
        technician.experience_years
    ))

    conn.commit()
    conn.close()


def get_all_technicians():

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM technicians
        ORDER BY name
    """)

    technicians = cursor.fetchall()

    conn.close()

    return [dict(row) for row in technicians]


def get_technician_by_id(technician_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM technicians
        WHERE technician_id = ?
    """,
    (technician_id,)
    )

    technician = cursor.fetchone()

    conn.close()

    if technician:
        return dict(technician)

    return None


def update_technician(technician_id: str, technician):

    conn = get_connection()

    conn.execute("""
    UPDATE technicians
    SET
        name = ?,
        specialization = ?,
        phone = ?,
        department = ?,
        experience_years = ?
    WHERE technician_id = ?
    """,
    (
        technician.name,
        technician.specialization,
        technician.phone,
        technician.department,
        technician.experience_years,
        technician_id
    ))

    conn.commit()
    conn.close()


def delete_technician(technician_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        DELETE FROM technicians
        WHERE technician_id = ?
    """,
    (technician_id,)
    )

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted

# ==========================================================
# REPAIR FUNCTIONS
# ==========================================================

def add_repair(repair):

    conn = get_connection()

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
    """,
    (
        repair.repair_id,
        repair.equipment_id,
        repair.fault_reported,
        repair.diagnosis,
        repair.action_taken,
        repair.technician_id,
        repair.repair_date,
        repair.repair_status
    ))

    conn.commit()
    conn.close()


def get_repairs(equipment_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM repairs
        WHERE equipment_id = ?
        ORDER BY repair_date DESC
    """,
    (equipment_id,)
    )

    repairs = cursor.fetchall()

    conn.close()

    return [dict(row) for row in repairs]


def get_repair_by_id(repair_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        SELECT *
        FROM repairs
        WHERE repair_id = ?
    """,
    (repair_id,)
    )

    repair = cursor.fetchone()

    conn.close()

    if repair:
        return dict(repair)

    return None


def update_repair(repair_id: str, repair):

    conn = get_connection()

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
    """,
    (
        repair.fault_reported,
        repair.diagnosis,
        repair.action_taken,
        repair.technician_id,
        repair.repair_date,
        repair.repair_status,
        repair_id
    ))

    conn.commit()
    conn.close()


def delete_repair(repair_id: str):

    conn = get_connection()

    cursor = conn.execute("""
        DELETE FROM repairs
        WHERE repair_id = ?
    """,
    (repair_id,)
    )

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted 