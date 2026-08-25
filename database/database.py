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

def migrate_repairs_table():
    """
    Safely add v3.5.3 reliability fields.
    """

    conn = get_connection()

    try:

        columns = conn.execute("""
            PRAGMA table_info(repairs)
        """).fetchall()

        existing_columns = {
            column["name"]
            for column in columns
        }

        if "repair_start_date" not in existing_columns:

            conn.execute("""
                ALTER TABLE repairs
                ADD COLUMN repair_start_date TEXT
            """)

        if "repair_completion_date" not in existing_columns:

            conn.execute("""
                ALTER TABLE repairs
                ADD COLUMN repair_completion_date TEXT
            """)

        conn.commit()

    finally:

        conn.close()

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

                repair_start_date TEXT,

                repair_completion_date TEXT,

                repair_status TEXT DEFAULT 'Pending',

                FOREIGN KEY (equipment_id)
                REFERENCES equipment(equipment_id)
                ON DELETE CASCADE,

                FOREIGN KEY (technician_id)
                REFERENCES technicians(technician_id)

            )
        """)

        # ======================================================
        # WORK ORDERS TABLE — FuElectric-AI v3.1
        # ======================================================

        conn.execute("""
            CREATE TABLE IF NOT EXISTS work_orders (

                work_order_id TEXT PRIMARY KEY,

                equipment_id TEXT NOT NULL,

                technician_id TEXT,

                work_type TEXT NOT NULL,

                priority TEXT DEFAULT 'Medium',

                description TEXT NOT NULL,

                scheduled_date TEXT,

                due_date TEXT,

                completed_date TEXT,

                status TEXT DEFAULT 'Open',

                technician_notes TEXT,

                created_at TEXT NOT NULL,

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

    # Run database migrations after the base tables exist
    migrate_repairs_table()

# =========================================================        
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

        # --------------------------------------------------
        # Get equipment linked to maintenance record
        # --------------------------------------------------

        existing = conn.execute("""
            SELECT equipment_id
            FROM maintenance_history
            WHERE id = ?
        """, (record_id,)).fetchone()

        if existing is None:
            return False

        equipment_id = existing["equipment_id"]

        # --------------------------------------------------
        # Update maintenance record
        # --------------------------------------------------

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

        # --------------------------------------------------
        # Recalculate latest maintenance date
        # --------------------------------------------------

        latest = conn.execute("""
            SELECT MAX(maintenance_date)
            AS latest_maintenance
            FROM maintenance_history
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        latest_date = latest["latest_maintenance"]

        conn.execute("""
            UPDATE equipment
            SET last_maintenance = ?
            WHERE equipment_id = ?
        """, (
            latest_date,
            equipment_id
        ))

        conn.commit()

        return True

    finally:

        conn.close()


def delete_maintenance(
    record_id: int
) -> bool:

    conn = get_connection()

    try:

        # --------------------------------------------------
        # Find equipment before deleting record
        # --------------------------------------------------

        existing = conn.execute("""
            SELECT equipment_id
            FROM maintenance_history
            WHERE id = ?
        """, (record_id,)).fetchone()

        if existing is None:
            return False

        equipment_id = existing["equipment_id"]

        # --------------------------------------------------
        # Delete maintenance record
        # --------------------------------------------------

        cursor = conn.execute("""
            DELETE FROM maintenance_history
            WHERE id = ?
        """, (record_id,))

        # --------------------------------------------------
        # Recalculate latest maintenance
        # --------------------------------------------------

        latest = conn.execute("""
            SELECT MAX(maintenance_date)
            AS latest_maintenance
            FROM maintenance_history
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        latest_date = latest["latest_maintenance"]

        conn.execute("""
            UPDATE equipment
            SET last_maintenance = ?
            WHERE equipment_id = ?
        """, (
            latest_date,
            equipment_id
        ))

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
    """
    Add a repair record.

    FuElectric-AI v3.5.3
    """

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
                repair_start_date,
                repair_completion_date,
                repair_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            repair.repair_id,
            repair.equipment_id,
            repair.fault_reported,
            getattr(repair, "diagnosis", None),
            getattr(repair, "action_taken", None),
            getattr(repair, "technician_id", None),
            getattr(repair, "repair_date", None),
            getattr(repair, "repair_start_date", None),
            getattr(repair, "repair_completion_date", None),
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
    """
    Return a repair by ID.

    FuElectric-AI v3.5.3
    """

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
    """
    Update an existing repair record.

    FuElectric-AI v3.5.3
    """

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
                repair_start_date = ?,
                repair_completion_date = ?,
                repair_status = ?
            WHERE repair_id = ?
        """, (
            repair.fault_reported,
            getattr(repair, "diagnosis", None),
            getattr(repair, "action_taken", None),
            getattr(repair, "technician_id", None),
            getattr(repair, "repair_date", None),
            getattr(repair, "repair_start_date", None),
            getattr(repair, "repair_completion_date", None),
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

def get_equipment_health(equipment_id: str):

    conn = get_connection()

    try:

        # ==================================================
        # GET EQUIPMENT
        # ==================================================

        equipment = conn.execute(
            """
            SELECT *
            FROM equipment
            WHERE equipment_id = ?
            """,
            (equipment_id,)
        ).fetchone()

        if equipment is None:
            return None


        # ==================================================
        # COUNT MAINTENANCE RECORDS
        # ==================================================

        maintenance_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM maintenance_history
            WHERE equipment_id = ?
            """,
            (equipment_id,)
        ).fetchone()[0]


        # ==================================================
        # COUNT REPAIRS
        # ==================================================

        repair_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM repairs
            WHERE equipment_id = ?
            """,
            (equipment_id,)
        ).fetchone()[0]


        # ==================================================
        # CALCULATE HEALTH SCORE
        # ==================================================

        score = 100

        # Repairs reduce equipment health
        score -= repair_count * 10

        # Maintenance records improve equipment health
        score += maintenance_count * 2

        # Keep score between 0 and 100
        score = max(0, min(100, score))


        # ==================================================
        # DETERMINE HEALTH STATUS
        # ==================================================

        if score >= 90:

            status = "Excellent"

        elif score >= 75:

            status = "Good"

        elif score >= 50:

            status = "Fair"

        else:

            status = "Poor"


        # ==================================================
        # RETURN HEALTH INFORMATION
        # ==================================================

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

# ==========================================================
# WORK ORDER FUNCTIONS — FuElectric-AI v3.1
# ==========================================================

def add_work_order(work_order):
    """
    Create a new work order.
    """

    conn = get_connection()

    try:

        conn.execute("""
            INSERT INTO work_orders (
                work_order_id,
                equipment_id,
                technician_id,
                work_type,
                priority,
                description,
                scheduled_date,
                due_date,
                completed_date,
                status,
                technician_notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            work_order.work_order_id,
            work_order.equipment_id,
            work_order.technician_id,
            work_order.work_type,
            work_order.priority,
            work_order.description,
            work_order.scheduled_date,
            work_order.due_date,
            work_order.completed_date,
            work_order.status,
            work_order.technician_notes,
            work_order.created_at
        ))

        conn.commit()

    finally:

        conn.close()


def get_all_work_orders():
    """
    Return all work orders.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM work_orders
            ORDER BY created_at DESC
        """)

        work_orders = cursor.fetchall()

        return [dict(row) for row in work_orders]

    finally:

        conn.close()


def get_work_order_by_id(work_order_id: str):
    """
    Return one work order by ID.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM work_orders
            WHERE work_order_id = ?
        """, (work_order_id,))

        work_order = cursor.fetchone()

        if work_order:
            return dict(work_order)

        return None

    finally:

        conn.close()


def get_work_orders_by_equipment(equipment_id: str):
    """
    Return all work orders belonging to an equipment item.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM work_orders
            WHERE equipment_id = ?
            ORDER BY created_at DESC
        """, (equipment_id,))

        work_orders = cursor.fetchall()

        return [dict(row) for row in work_orders]

    finally:

        conn.close()


def get_work_orders_by_technician(technician_id: str):
    """
    Return all work orders assigned to a technician.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT *
            FROM work_orders
            WHERE technician_id = ?
            ORDER BY created_at DESC
        """, (technician_id,))

        work_orders = cursor.fetchall()

        return [dict(row) for row in work_orders]

    finally:

        conn.close()


def update_work_order(work_order_id: str, work_order):
    """
    Update an existing work order.
    """

    conn = get_connection()

    try:

        conn.execute("""
            UPDATE work_orders
            SET
                equipment_id = ?,
                technician_id = ?,
                work_type = ?,
                priority = ?,
                description = ?,
                scheduled_date = ?,
                due_date = ?,
                completed_date = ?,
                status = ?,
                technician_notes = ?
            WHERE work_order_id = ?
        """, (
            work_order.equipment_id,
            work_order.technician_id,
            work_order.work_type,
            work_order.priority,
            work_order.description,
            work_order.scheduled_date,
            work_order.due_date,
            work_order.completed_date,
            work_order.status,
            work_order.technician_notes,
            work_order_id
        ))

        conn.commit()

    finally:

        conn.close()

def update_work_order_status(
    work_order_id: str,
    status: str
):
    """
    Update the status of a work order.
    """

    allowed_statuses = [
        "Open",
        "Assigned",
        "In Progress",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:
        return False

    conn = get_connection()

    try:

        completed_date = None

        if status == "Completed":
            completed_date = datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        conn.execute("""
            UPDATE work_orders
            SET
                status = ?,
                completed_date = ?
            WHERE work_order_id = ?
        """, (
            status,
            completed_date,
            work_order_id
        ))

        conn.commit()

        return True

    finally:

        conn.close()

def delete_work_order(work_order_id: str) -> bool:
    """
    Delete a work order.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            DELETE FROM work_orders
            WHERE work_order_id = ?
        """, (work_order_id,))

        conn.commit()

        return cursor.rowcount > 0

    finally:

        conn.close()


def get_work_order_statistics():
    """
    Return Work Order statistics for the dashboard.
    """

    conn = get_connection()

    try:

        total = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
        """).fetchone()[0]

        open_orders = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Open'
        """).fetchone()[0]

        assigned_orders = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Assigned'
        """).fetchone()[0]

        in_progress = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'In Progress'
        """).fetchone()[0]

        completed = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Completed'
        """).fetchone()[0]

        cancelled = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Cancelled'
        """).fetchone()[0]

        critical = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE priority = 'Critical'
        """).fetchone()[0]

        high_priority = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE priority = 'High'
        """).fetchone()[0]

        return {
            "total_work_orders": total,
            "open_work_orders": open_orders,
            "assigned_work_orders": assigned_orders,
            "in_progress_work_orders": in_progress,
            "completed_work_orders": completed,
            "cancelled_work_orders": cancelled,
            "critical_work_orders": critical,
            "high_priority_work_orders": high_priority
        }

    finally:

        conn.close()

# ==========================================================
# WORK ORDER INTELLIGENCE — FuElectric-AI v3.5.0
# ==========================================================


def get_overdue_work_orders():
    """
    Return work orders whose due date has passed
    and which are not completed or cancelled.
    """

    conn = get_connection()

    try:

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        cursor = conn.execute("""
            SELECT
                work_order_id,
                equipment_id,
                technician_id,
                work_type,
                priority,
                description,
                scheduled_date,
                due_date,
                status,
                technician_notes,
                created_at
            FROM work_orders
            WHERE
                due_date IS NOT NULL
                AND due_date != ''
                AND due_date < ?
                AND status NOT IN (
                    'Completed',
                    'Cancelled'
                )
            ORDER BY due_date ASC
        """, (now,))

        work_orders = cursor.fetchall()

        return [
            dict(row)
            for row in work_orders
        ]

    finally:

        conn.close()


def get_work_order_workload():
    """
    Return work-order workload grouped by technician.
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT
                technician_id,

                COUNT(*) AS total_orders,

                SUM(
                    CASE
                        WHEN status = 'Open'
                        THEN 1 ELSE 0
                    END
                ) AS open_orders,

                SUM(
                    CASE
                        WHEN status = 'Assigned'
                        THEN 1 ELSE 0
                    END
                ) AS assigned_orders,

                SUM(
                    CASE
                        WHEN status = 'In Progress'
                        THEN 1 ELSE 0
                    END
                ) AS in_progress_orders,

                SUM(
                    CASE
                        WHEN status = 'Completed'
                        THEN 1 ELSE 0
                    END
                ) AS completed_orders,

                SUM(
                    CASE
                        WHEN priority = 'Critical'
                        THEN 1 ELSE 0
                    END
                ) AS critical_orders,

                SUM(
                    CASE
                        WHEN priority = 'High'
                        THEN 1 ELSE 0
                    END
                ) AS high_priority_orders

            FROM work_orders

            WHERE technician_id IS NOT NULL

            GROUP BY technician_id

            ORDER BY total_orders DESC
        """)

        workload = cursor.fetchall()

        return [
            dict(row)
            for row in workload
        ]

    finally:

        conn.close()

# ==========================================================
# TECHNICIAN WORKLOAD INTELLIGENCE — FuElectric-AI v3.5.5
# ==========================================================

def get_technician_workload_intelligence():
    """
    Analyze technician workload and classify workload risk.

    FuElectric-AI v3.5.5
    """

    conn = get_connection()

    try:

        cursor = conn.execute("""
            SELECT
                technician_id,

                COUNT(*) AS total_orders,

                SUM(
                    CASE
                        WHEN status = 'Open'
                        THEN 1 ELSE 0
                    END
                ) AS open_orders,

                SUM(
                    CASE
                        WHEN status = 'Assigned'
                        THEN 1 ELSE 0
                    END
                ) AS assigned_orders,

                SUM(
                    CASE
                        WHEN status = 'In Progress'
                        THEN 1 ELSE 0
                    END
                ) AS in_progress_orders,

                SUM(
                    CASE
                        WHEN status = 'Completed'
                        THEN 1 ELSE 0
                    END
                ) AS completed_orders,

                SUM(
                    CASE
                        WHEN priority = 'Critical'
                        THEN 1 ELSE 0
                    END
                ) AS critical_orders,

                SUM(
                    CASE
                        WHEN priority = 'High'
                        THEN 1 ELSE 0
                    END
                ) AS high_priority_orders

            FROM work_orders

            WHERE technician_id IS NOT NULL

            GROUP BY technician_id

            ORDER BY total_orders DESC
        """)

        technicians = cursor.fetchall()

        results = []

        for row in technicians:

            data = dict(row)

            total_orders = data["total_orders"] or 0
            open_orders = data["open_orders"] or 0
            assigned_orders = data["assigned_orders"] or 0
            in_progress_orders = data["in_progress_orders"] or 0
            critical_orders = data["critical_orders"] or 0
            high_priority_orders = data["high_priority_orders"] or 0

            # --------------------------------------------------
            # ACTIVE WORKLOAD
            # --------------------------------------------------

            active_orders = (
                open_orders
                + assigned_orders
                + in_progress_orders
            )

            # --------------------------------------------------
            # WORKLOAD SCORE
            # --------------------------------------------------

            workload_score = (
                active_orders * 10
                + critical_orders * 15
                + high_priority_orders * 8
            )

            # --------------------------------------------------
            # WORKLOAD CLASSIFICATION
            # --------------------------------------------------

            if workload_score >= 80:

                workload_status = "Overloaded"

            elif workload_score >= 50:

                workload_status = "Heavy"

            elif workload_score >= 25:

                workload_status = "Moderate"

            else:

                workload_status = "Normal"

            # --------------------------------------------------
            # RISK LEVEL
            # --------------------------------------------------

            if (
                critical_orders >= 2
                or workload_score >= 80
            ):

                risk_level = "High"

            elif (
                critical_orders >= 1
                or workload_score >= 50
            ):

                risk_level = "Medium"

            else:

                risk_level = "Low"

            # --------------------------------------------------
            # RECOMMENDATION
            # --------------------------------------------------

            if workload_status == "Overloaded":

                recommendation = (
                    "Technician workload is overloaded. "
                    "Consider redistributing active work orders."
                )

            elif workload_status == "Heavy":

                recommendation = (
                    "Technician has a heavy workload. "
                    "Monitor workload and priority assignments."
                )

            elif workload_status == "Moderate":

                recommendation = (
                    "Technician workload is moderate. "
                    "Continue monitoring active assignments."
                )

            else:

                recommendation = (
                    "Technician workload is within normal range."
                )

            results.append({

                "technician_id":
                    data["technician_id"],

                "total_orders":
                    total_orders,

                "active_orders":
                    active_orders,

                "open_orders":
                    open_orders,

                "assigned_orders":
                    assigned_orders,

                "in_progress_orders":
                    in_progress_orders,

                "completed_orders":
                    data["completed_orders"] or 0,

                "critical_orders":
                    critical_orders,

                "high_priority_orders":
                    high_priority_orders,

                "workload_score":
                    workload_score,

                "workload_status":
                    workload_status,

                "risk_level":
                    risk_level,

                "recommendation":
                    recommendation

            })

        return results

    finally:

        conn.close()

def get_work_order_performance():
    """
    Return overall work-order performance metrics.
    """

    conn = get_connection()

    try:

        total = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
        """).fetchone()[0]

        completed = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Completed'
        """).fetchone()[0]

        overdue = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE
                due_date IS NOT NULL
                AND due_date != ''
                AND due_date < ?
                AND status NOT IN (
                    'Completed',
                    'Cancelled'
                )
        """, (
            datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
        )).fetchone()[0]

        active = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status IN (
                'Open',
                'Assigned',
                'In Progress'
            )
        """).fetchone()[0]

        cancelled = conn.execute("""
            SELECT COUNT(*)
            FROM work_orders
            WHERE status = 'Cancelled'
        """).fetchone()[0]

        if total > 0:

            completion_rate = round(
                (completed / total) * 100,
                2
            )

            active_rate = round(
                (active / total) * 100,
                2
            )

        else:

            completion_rate = 0
            active_rate = 0

        return {
            "total_work_orders": total,
            "completed_work_orders": completed,
            "active_work_orders": active,
            "overdue_work_orders": overdue,
            "cancelled_work_orders": cancelled,
            "completion_rate": completion_rate,
            "active_rate": active_rate
        }

    finally:

        conn.close()


def get_work_order_intelligence():
    """
    Return a unified Work Order Intelligence report.
    """

    performance = get_work_order_performance()

    overdue = get_overdue_work_orders()

    workload = get_work_order_workload()

    return {
        "performance": performance,
        "overdue_orders": overdue,
        "technician_workload": workload
    }        

    # ==========================================================
# EQUIPMENT RELIABILITY ANALYTICS — FuElectric-AI v3.5.3
# ==========================================================

def get_equipment_reliability(equipment_id: str):
    """
    Calculate reliability analytics for one equipment item.

    FuElectric-AI v3.5.3

    Reliability is intentionally separated from the
    Equipment Health Score.

    Reliability focuses on:
        - Failure frequency
        - Failure recency
        - MTBF
        - MTTR
        - Repair completion
        - Recurring failure activity

    This is an analytics score, not a physical probability
    of failure.
    """

    conn = get_connection()

    try:

        # ==================================================
        # GET EQUIPMENT
        # ==================================================

        equipment = conn.execute("""
            SELECT *
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        equipment = dict(equipment)

        # ==================================================
        # GET REPAIR HISTORY
        # ==================================================

        repairs = conn.execute("""
            SELECT
                repair_id,
                fault_reported,
                diagnosis,
                action_taken,
                technician_id,
                repair_date,
                repair_start_date,
                repair_completion_date,
                repair_status
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [
            dict(row)
            for row in repairs
        ]

        # ==================================================
        # GET MAINTENANCE HISTORY
        # ==================================================

        maintenance = conn.execute("""
            SELECT
                id,
                maintenance_date,
                maintenance_type,
                description,
                technician,
                cost,
                status
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date ASC
        """, (equipment_id,)).fetchall()

        maintenance = [
            dict(row)
            for row in maintenance
        ]

        # ==================================================
        # BASIC COUNTS
        # ==================================================

        total_repairs = len(repairs)

        completed_repairs = sum(
            1
            for repair in repairs
            if repair.get("repair_status") == "Completed"
        )

        pending_repairs = sum(
            1
            for repair in repairs
            if repair.get("repair_status") == "Pending"
        )

        total_maintenance = len(maintenance)

        # ==================================================
        # DATE PARSER
        # ==================================================

        def parse_date(value):

            if not value:
                return None

            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f"
            ]

            for date_format in formats:

                try:

                    return datetime.strptime(
                        value,
                        date_format
                    )

                except (ValueError, TypeError):

                    continue

            return None

        # ==================================================
        # VALID FAILURE DATES
        # ==================================================

        repair_dates = []

        for repair in repairs:

            parsed_date = parse_date(
                repair.get("repair_date")
            )

            if parsed_date:

                repair_dates.append(
                    parsed_date
                )

        repair_dates.sort()

        # ==================================================
        # FIRST / LAST FAILURE
        # ==================================================

        first_failure_date = None
        last_failure_date = None

        if repair_dates:

            first_failure_date = (
                repair_dates[0]
                .strftime("%Y-%m-%d")
            )

            last_failure_date = (
                repair_dates[-1]
                .strftime("%Y-%m-%d")
            )

        # ==================================================
        # DAYS SINCE LAST FAILURE
        # ==================================================

        days_since_last_failure = None

        if repair_dates:

            days_since_last_failure = max(
                0,
                (
                    datetime.now()
                    - repair_dates[-1]
                ).days
            )

        # ==================================================
        # RECENT FAILURE ACTIVITY
        # ==================================================

        now = datetime.now()

        failures_last_30_days = 0
        failures_last_90_days = 0
        failures_last_180_days = 0

        for failure_date in repair_dates:

            age_days = (
                now - failure_date
            ).days

            if 0 <= age_days <= 30:

                failures_last_30_days += 1

            if 0 <= age_days <= 90:

                failures_last_90_days += 1

            if 0 <= age_days <= 180:

                failures_last_180_days += 1

        # ==================================================
        # FAILURE FREQUENCY CLASSIFICATION
        # ==================================================

        if total_repairs == 0:

            failure_frequency_status = (
                "No Recorded Failures"
            )

        elif total_repairs <= 2:

            failure_frequency_status = "Low"

        elif total_repairs <= 4:

            failure_frequency_status = "Moderate"

        else:

            failure_frequency_status = "High"

        # ==================================================
        # MTBF
        # ==================================================
        #
        # MTBF is calculated from the intervals between
        # recorded repair/failure events.
        #
        # At least two valid dates are required.
        # ==================================================

        mtbf = None

        if len(repair_dates) >= 2:

            intervals = []

            for index in range(
                1,
                len(repair_dates)
            ):

                interval_days = (
                    repair_dates[index]
                    - repair_dates[index - 1]
                ).total_seconds() / 86400

                if interval_days >= 0:

                    intervals.append(
                        interval_days
                    )

            if intervals:

                mtbf = round(
                    sum(intervals)
                    / len(intervals),
                    2
                )

        # ==================================================
        # MTBF STATUS
        # ==================================================

        if mtbf is None:

            mtbf_status = "Insufficient Data"

        elif mtbf >= 180:

            mtbf_status = "Excellent"

        elif mtbf >= 90:

            mtbf_status = "Good"

        elif mtbf >= 30:

            mtbf_status = "Moderate"

        else:

            mtbf_status = "Poor"

        # ==================================================
        # MTTR
        # ==================================================

        repair_durations = []

        for repair in repairs:

            start = parse_date(
                repair.get(
                    "repair_start_date"
                )
            )

            completion = parse_date(
                repair.get(
                    "repair_completion_date"
                )
            )

            if (
                start
                and completion
                and completion >= start
            ):

                duration_days = (
                    completion - start
                ).total_seconds() / 86400

                repair_durations.append(
                    duration_days
                )

        mttr = None

        if repair_durations:

            mttr = round(
                sum(repair_durations)
                / len(repair_durations),
                2
            )

        # ==================================================
        # MTTR STATUS
        # ==================================================

        if mttr is None:

            mttr_status = "Insufficient Data"

        elif mttr <= 1:

            mttr_status = "Excellent"

        elif mttr <= 3:

            mttr_status = "Good"

        elif mttr <= 7:

            mttr_status = "Moderate"

        else:

            mttr_status = "Poor"

        # ==================================================
        # REPAIR COMPLETION RATE
        # ==================================================

        if total_repairs > 0:

            repair_completion_rate = round(
                (
                    completed_repairs
                    / total_repairs
                ) * 100,
                2
            )

        else:

            repair_completion_rate = 100.0

        # ==================================================
        # RELIABILITY SCORE
        # ==================================================
        #
        # IMPORTANT:
        #
        # This is deliberately NOT the same calculation
        # used by equipment health.
        #
        # Reliability considers:
        #
        # 1. Failure frequency
        # 2. Failure recency
        # 3. MTBF
        # 4. Repair completion
        #
        # Score remains between 0 and 100.
        # ==================================================

        reliability_score = 100.0

        # --------------------------------------------------
        # FAILURE FREQUENCY PENALTY
        # --------------------------------------------------

        failure_penalty = min(
            total_repairs * 7,
            35
        )

        reliability_score -= failure_penalty

        # --------------------------------------------------
        # RECENT FAILURE PENALTY
        # --------------------------------------------------

        recent_failure_penalty = 0

        if failures_last_30_days >= 3:

            recent_failure_penalty = 25

        elif failures_last_30_days == 2:

            recent_failure_penalty = 18

        elif failures_last_30_days == 1:

            recent_failure_penalty = 10

        elif failures_last_90_days >= 3:

            recent_failure_penalty = 8

        reliability_score -= recent_failure_penalty

        # --------------------------------------------------
        # MTBF CONTRIBUTION
        # --------------------------------------------------

        mtbf_adjustment = 0

        if mtbf is not None:

            if mtbf >= 180:

                mtbf_adjustment = 10

            elif mtbf >= 90:

                mtbf_adjustment = 7

            elif mtbf >= 30:

                mtbf_adjustment = 3

            else:

                mtbf_adjustment = -5

        reliability_score += mtbf_adjustment

        # --------------------------------------------------
        # REPAIR COMPLETION CONTRIBUTION
        # --------------------------------------------------

        if total_repairs > 0:

            if repair_completion_rate >= 95:

                reliability_score += 5

            elif repair_completion_rate >= 80:

                reliability_score += 2

            elif repair_completion_rate < 50:

                reliability_score -= 5

        # --------------------------------------------------
        # MAINTENANCE SUPPORT SIGNAL
        # --------------------------------------------------
        #
        # Maintenance is a supporting reliability signal,
        # not a direct replacement for failure data.
        # --------------------------------------------------

        maintenance_adjustment = min(
            total_maintenance,
            5
        )

        reliability_score += maintenance_adjustment

        # --------------------------------------------------
        # LIMIT SCORE
        # --------------------------------------------------

        reliability_score = max(
            0,
            min(
                100,
                reliability_score
            )
        )

        reliability_score = round(
            reliability_score,
            2
        )

        # ==================================================
        # RELIABILITY STATUS
        # ==================================================

        if reliability_score >= 90:

            reliability_status = (
                "Highly Reliable"
            )

        elif reliability_score >= 75:

            reliability_status = "Reliable"

        elif reliability_score >= 50:

            reliability_status = "Moderate"

        else:

            reliability_status = (
                "Low Reliability"
            )

        # ==================================================
        # RELIABILITY INDICATORS
        # ==================================================

        reliability_indicators = []

        if total_repairs == 0:

            reliability_indicators.append(
                "No recorded repair failures"
            )

        if failures_last_30_days >= 1:

            reliability_indicators.append(
                "Recent failure activity detected"
            )

        if failures_last_30_days >= 3:

            reliability_indicators.append(
                "Multiple failures recorded within 30 days"
            )

        if failures_last_90_days >= 3:

            reliability_indicators.append(
                "High failure activity within 90 days"
            )

        if mtbf is not None and mtbf < 30:

            reliability_indicators.append(
                "Short mean time between failures"
            )

        if mttr is not None and mttr > 7:

            reliability_indicators.append(
                "Long average repair duration"
            )

        if pending_repairs > 0:

            reliability_indicators.append(
                "Pending repair activity exists"
            )

        if (
            total_repairs >= 5
            and total_maintenance == 0
        ):

            reliability_indicators.append(
                "High repair activity with no recorded maintenance"
            )

        if not reliability_indicators:

            reliability_indicators.append(
                "No major reliability indicators detected"
            )

        # ==================================================
        # RELIABILITY RECOMMENDATION
        # ==================================================

        if reliability_status == "Low Reliability":

            recommendation = (
                "Equipment reliability is low. "
                "Prioritize failure investigation, "
                "root-cause analysis and corrective "
                "maintenance planning."
            )

        elif failures_last_30_days >= 3:

            recommendation = (
                "Multiple recent failures detected. "
                "Prioritize inspection and investigate "
                "recurring failure causes."
            )

        elif mtbf is not None and mtbf < 30:

            recommendation = (
                "Failure intervals are short. "
                "Investigate recurring failure mechanisms "
                "and review preventive maintenance strategy."
            )

        elif pending_repairs > 0:

            recommendation = (
                "Pending repair activity remains. "
                "Monitor outstanding repairs and "
                "restore equipment reliability."
            )

        elif reliability_status == "Moderate":

            recommendation = (
                "Equipment reliability is moderate. "
                "Continue monitoring failure patterns "
                "and preventive maintenance effectiveness."
            )

        else:

            recommendation = (
                "Equipment reliability is within a "
                "healthy range. Continue routine "
                "monitoring and maintenance."
            )

        # ==================================================
        # RETURN RELIABILITY ANALYTICS
        # ==================================================

        return {

            "equipment_id":
                equipment_id,

            "equipment_name":
                equipment["name"],

            "category":
                equipment["category"],

            "status":
                equipment["status"],

            "total_repairs":
                total_repairs,

            "completed_repairs":
                completed_repairs,

            "pending_repairs":
                pending_repairs,

            "total_maintenance":
                total_maintenance,

            "failure_frequency":
                total_repairs,

            "failure_frequency_status":
                failure_frequency_status,

            "failures_last_30_days":
                failures_last_30_days,

            "failures_last_90_days":
                failures_last_90_days,

            "failures_last_180_days":
                failures_last_180_days,

            "first_failure_date":
                first_failure_date,

            "last_failure_date":
                last_failure_date,

            "days_since_last_failure":
                days_since_last_failure,

            "mtbf_days":
                mtbf,

            "mtbf_status":
                mtbf_status,

            "mttr_days":
                mttr,

            "mttr_status":
                mttr_status,

            "repair_completion_rate":
                repair_completion_rate,

            "reliability_score":
                reliability_score,

            "reliability_status":
                reliability_status,

            "reliability_indicators":
                reliability_indicators,

            "recommendation":
                recommendation
        }

    finally:

        conn.close()


def get_all_equipment_reliability():
    """
    Return reliability analytics for all equipment.

    FuElectric-AI v3.5.3
    """

    conn = get_connection()

    try:

        equipment_list = conn.execute("""
            SELECT equipment_id
            FROM equipment
            ORDER BY name
        """).fetchall()

    finally:

        conn.close()

    results = []

    for equipment in equipment_list:

        reliability = get_equipment_reliability(
            equipment["equipment_id"]
        )

        if reliability:

            results.append(reliability)

    return results


def get_reliability_summary():
    """
    Return an overall equipment reliability summary.

    FuElectric-AI v3.5.3
    """

    reliability_data = (
        get_all_equipment_reliability()
    )

    total_equipment = len(
        reliability_data
    )

    if total_equipment == 0:

        return {
            "total_equipment": 0,
            "average_reliability_score": 0,
            "average_mtbf_days": None,
            "average_mttr_days": None,
            "highly_reliable": 0,
            "reliable": 0,
            "moderate": 0,
            "low_reliability": 0,
            "equipment_with_recent_failures": 0,
            "equipment_with_high_failure_frequency": 0,
            "equipment_with_pending_repairs": 0,
            "most_reliable_equipment": None,
            "least_reliable_equipment": None
        }

    # ======================================================
    # AVERAGE RELIABILITY
    # ======================================================

    total_score = sum(
        item["reliability_score"]
        for item in reliability_data
    )

    average_score = round(
        total_score / total_equipment,
        2
    )

    # ======================================================
    # MTBF
    # ======================================================

    mtbf_values = [
        item["mtbf_days"]
        for item in reliability_data
        if item["mtbf_days"] is not None
    ]

    if mtbf_values:

        average_mtbf = round(
            sum(mtbf_values)
            / len(mtbf_values),
            2
        )

    else:

        average_mtbf = None

    # ======================================================
    # MTTR
    # ======================================================

    mttr_values = [
        item["mttr_days"]
        for item in reliability_data
        if item["mttr_days"] is not None
    ]

    if mttr_values:

        average_mttr = round(
            sum(mttr_values)
            / len(mttr_values),
            2
        )

    else:

        average_mttr = None

    # ======================================================
    # CLASSIFICATIONS
    # ======================================================

    highly_reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Highly Reliable"
    )

    reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Reliable"
    )

    moderate = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Moderate"
    )

    low_reliability = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Low Reliability"
    )

    # ======================================================
    # RECENT FAILURE COUNT
    # ======================================================

    equipment_with_recent_failures = sum(
        1
        for item in reliability_data
        if item["failures_last_30_days"] > 0
    )

    # ======================================================
    # HIGH FAILURE FREQUENCY
    # ======================================================

    equipment_with_high_failure_frequency = sum(
        1
        for item in reliability_data
        if item["failure_frequency_status"]
        == "High"
    )

    # ======================================================
    # PENDING REPAIRS
    # ======================================================

    equipment_with_pending_repairs = sum(
        1
        for item in reliability_data
        if item["pending_repairs"] > 0
    )

    # ======================================================
    # RANKING
    # ======================================================

    sorted_data = sorted(
        reliability_data,
        key=lambda item:
            item["reliability_score"],
        reverse=True
    )

    most_reliable = sorted_data[0]

    least_reliable = sorted_data[-1]

    return {

        "total_equipment":
            total_equipment,

        "average_reliability_score":
            average_score,

        "average_mtbf_days":
            average_mtbf,

        "average_mttr_days":
            average_mttr,

        "highly_reliable":
            highly_reliable,

        "reliable":
            reliable,

        "moderate":
            moderate,

        "low_reliability":
            low_reliability,

        "equipment_with_recent_failures":
            equipment_with_recent_failures,

        "equipment_with_high_failure_frequency":
            equipment_with_high_failure_frequency,

        "equipment_with_pending_repairs":
            equipment_with_pending_repairs,

        "most_reliable_equipment": {
            "equipment_id":
                most_reliable["equipment_id"],
            "equipment_name":
                most_reliable["equipment_name"],
            "reliability_score":
                most_reliable["reliability_score"]
        },

        "least_reliable_equipment": {
            "equipment_id":
                least_reliable["equipment_id"],
            "equipment_name":
                least_reliable["equipment_name"],
            "reliability_score":
                least_reliable["reliability_score"]
        }
    }


def get_reliability_ranking():
    """
    Rank equipment by reliability score.

    FuElectric-AI v3.5.3
    """

    reliability_data = (
        get_all_equipment_reliability()
    )

    reliability_data.sort(
        key=lambda item:
            item["reliability_score"],
        reverse=True
    )

    for index, item in enumerate(
        reliability_data,
        start=1
    ):

        item["reliability_rank"] = index

    return reliability_data

# ==========================================================
# EQUIPMENT RELIABILITY ANALYTICS — FuElectric-AI v3.5.3
# ==========================================================

def get_equipment_reliability(equipment_id: str):
    """
    Calculate reliability analytics for one equipment item.

    FuElectric-AI v3.5.3

    Reliability is intentionally separated from the
    Equipment Health Score.

    Reliability considers:
        - Failure frequency
        - Failure recency
        - Recent failure activity
        - MTBF
        - MTTR
        - Repair completion
        - Pending repairs
        - Maintenance support

    This is an operational analytics score, not a
    statistical probability of failure.
    """

    conn = get_connection()

    try:

        # ==================================================
        # GET EQUIPMENT
        # ==================================================

        equipment_row = conn.execute("""
            SELECT
                equipment_id,
                name,
                category,
                status
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment_row is None:
            return None

        equipment = dict(equipment_row)

        # ==================================================
        # DATE PARSER
        # ==================================================

        def parse_date(value):

            if value is None:
                return None

            if isinstance(value, datetime):
                return value

            value = str(value).strip()

            if not value:
                return None

            formats = (
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%d %H:%M",
                "%d-%m-%Y",
                "%d/%m/%Y"
            )

            for date_format in formats:

                try:
                    return datetime.strptime(
                        value,
                        date_format
                    )

                except (ValueError, TypeError):
                    continue

            return None

        # ==================================================
        # GET REPAIR HISTORY
        # ==================================================

        repair_rows = conn.execute("""
            SELECT
                repair_id,
                fault_reported,
                diagnosis,
                action_taken,
                technician_id,
                repair_date,
                repair_start_date,
                repair_completion_date,
                repair_status
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [
            dict(row)
            for row in repair_rows
        ]

        # ==================================================
        # GET MAINTENANCE HISTORY
        # ==================================================

        maintenance_rows = conn.execute("""
            SELECT
                id,
                maintenance_date,
                maintenance_type,
                description,
                technician,
                cost,
                status
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date ASC
        """, (equipment_id,)).fetchall()

        maintenance = [
            dict(row)
            for row in maintenance_rows
        ]

        # ==================================================
        # BASIC COUNTS
        # ==================================================

        total_repairs = len(repairs)

        completed_repairs = sum(
            1
            for repair in repairs
            if str(
                repair.get("repair_status") or ""
            ).strip().lower()
            == "completed"
        )

        pending_repairs = sum(
            1
            for repair in repairs
            if str(
                repair.get("repair_status") or ""
            ).strip().lower()
            in {
                "pending",
                "open",
                "in progress",
                "in_progress"
            }
        )

        total_maintenance = len(maintenance)

        # ==================================================
        # FAILURE DATES
        # ==================================================

        repair_events = []

        for repair in repairs:

            failure_date = parse_date(
                repair.get("repair_date")
            )

            if failure_date:

                repair_events.append({
                    "date": failure_date,
                    "repair": repair
                })

        repair_events.sort(
            key=lambda item: item["date"]
        )

        repair_dates = [
            item["date"]
            for item in repair_events
        ]

        # ==================================================
        # FIRST / LAST FAILURE
        # ==================================================

        first_failure_date = None
        last_failure_date = None

        if repair_dates:

            first_failure_date = (
                repair_dates[0]
                .strftime("%Y-%m-%d")
            )

            last_failure_date = (
                repair_dates[-1]
                .strftime("%Y-%m-%d")
            )

        # ==================================================
        # FAILURE RECENCY
        # ==================================================

        now = datetime.now()

        days_since_last_failure = None

        if repair_dates:

            days_since_last_failure = max(
                0,
                (
                    now - repair_dates[-1]
                ).days
            )

        # ==================================================
        # RECENT FAILURE ACTIVITY
        # ==================================================

        failures_last_30_days = 0
        failures_last_90_days = 0
        failures_last_180_days = 0

        for failure_date in repair_dates:

            age_days = (
                now - failure_date
            ).days

            if age_days < 0:
                continue

            if age_days <= 30:
                failures_last_30_days += 1

            if age_days <= 90:
                failures_last_90_days += 1

            if age_days <= 180:
                failures_last_180_days += 1

        # ==================================================
        # FAILURE FREQUENCY
        # ==================================================

        if total_repairs == 0:

            failure_frequency_status = (
                "No Recorded Failures"
            )

        elif total_repairs <= 2:

            failure_frequency_status = "Low"

        elif total_repairs <= 4:

            failure_frequency_status = "Moderate"

        else:

            failure_frequency_status = "High"

        # ==================================================
        # MTBF
        # ==================================================
        #
        # Mean Time Between Failures.
        #
        # Requires at least two valid failure dates.
        # Duplicate/same-day events produce zero intervals
        # and are excluded from the average.
        # ==================================================

        mtbf = None

        if len(repair_dates) >= 2:

            intervals = []

            for index in range(
                1,
                len(repair_dates)
            ):

                interval_days = (
                    repair_dates[index]
                    - repair_dates[index - 1]
                ).total_seconds() / 86400

                if interval_days > 0:

                    intervals.append(
                        interval_days
                    )

            if intervals:

                mtbf = round(
                    sum(intervals)
                    / len(intervals),
                    2
                )

        # ==================================================
        # MTBF STATUS
        # ==================================================

        if mtbf is None:

            mtbf_status = "Insufficient Data"

        elif mtbf >= 180:

            mtbf_status = "Excellent"

        elif mtbf >= 90:

            mtbf_status = "Good"

        elif mtbf >= 30:

            mtbf_status = "Moderate"

        else:

            mtbf_status = "Poor"

        # ==================================================
        # MTTR
        # ==================================================
        #
        # Mean Time To Repair.
        #
        # Uses repair_start_date and
        # repair_completion_date.
        # ==================================================

        repair_durations = []

        for repair in repairs:

            start = parse_date(
                repair.get(
                    "repair_start_date"
                )
            )

            completion = parse_date(
                repair.get(
                    "repair_completion_date"
                )
            )

            if (
                start is not None
                and completion is not None
                and completion >= start
            ):

                duration_days = (
                    completion - start
                ).total_seconds() / 86400

                repair_durations.append(
                    duration_days
                )

        mttr = None

        if repair_durations:

            mttr = round(
                sum(repair_durations)
                / len(repair_durations),
                2
            )

        # ==================================================
        # MTTR STATUS
        # ==================================================

        if mttr is None:

            mttr_status = "Insufficient Data"

        elif mttr <= 1:

            mttr_status = "Excellent"

        elif mttr <= 3:

            mttr_status = "Good"

        elif mttr <= 7:

            mttr_status = "Moderate"

        else:

            mttr_status = "Poor"

        # ==================================================
        # REPAIR COMPLETION RATE
        # ==================================================

        if total_repairs > 0:

            repair_completion_rate = round(
                (
                    completed_repairs
                    / total_repairs
                ) * 100,
                2
            )

        else:

            repair_completion_rate = 100.0

        # ==================================================
        # RELIABILITY SCORE
        # ==================================================
        #
        # Starting score: 100
        #
        # Penalties:
        #   Failure frequency
        #   Recent failures
        #   Poor MTBF
        #   Incomplete repairs
        #
        # Positive signals:
        #   Strong MTBF
        #   High repair completion
        #   Maintenance support
        #
        # Score is constrained to 0-100.
        # ==================================================

        reliability_score = 100.0

        # --------------------------------------------------
        # FAILURE FREQUENCY PENALTY
        # --------------------------------------------------

        failure_penalty = min(
            total_repairs * 7,
            35
        )

        reliability_score -= (
            failure_penalty
        )

        # --------------------------------------------------
        # RECENT FAILURE PENALTY
        # --------------------------------------------------

        recent_failure_penalty = 0

        if failures_last_30_days >= 3:

            recent_failure_penalty = 25

        elif failures_last_30_days == 2:

            recent_failure_penalty = 18

        elif failures_last_30_days == 1:

            recent_failure_penalty = 10

        elif failures_last_90_days >= 3:

            recent_failure_penalty = 8

        reliability_score -= (
            recent_failure_penalty
        )

        # --------------------------------------------------
        # MTBF ADJUSTMENT
        # --------------------------------------------------

        mtbf_adjustment = 0

        if mtbf is not None:

            if mtbf >= 180:

                mtbf_adjustment = 10

            elif mtbf >= 90:

                mtbf_adjustment = 7

            elif mtbf >= 30:

                mtbf_adjustment = 3

            else:

                mtbf_adjustment = -5

        reliability_score += (
            mtbf_adjustment
        )

        # --------------------------------------------------
        # REPAIR COMPLETION ADJUSTMENT
        # --------------------------------------------------

        if total_repairs > 0:

            if repair_completion_rate >= 95:

                reliability_score += 5

            elif repair_completion_rate >= 80:

                reliability_score += 2

            elif repair_completion_rate < 50:

                reliability_score -= 5

        # --------------------------------------------------
        # PENDING REPAIR PENALTY
        # --------------------------------------------------

        if pending_repairs > 0:

            reliability_score -= min(
                pending_repairs * 5,
                15
            )

        # --------------------------------------------------
        # MAINTENANCE SUPPORT
        # --------------------------------------------------
        #
        # Maintenance provides a limited positive signal.
        # It must not overwhelm failure history.
        # --------------------------------------------------

        maintenance_adjustment = min(
            total_maintenance,
            5
        )

        reliability_score += (
            maintenance_adjustment
        )

        # --------------------------------------------------
        # LIMIT SCORE
        # --------------------------------------------------

        reliability_score = max(
            0,
            min(
                100,
                reliability_score
            )
        )

        reliability_score = round(
            reliability_score,
            2
        )

        # ==================================================
        # RELIABILITY STATUS
        # ==================================================

        if reliability_score >= 90:

            reliability_status = (
                "Highly Reliable"
            )

        elif reliability_score >= 75:

            reliability_status = "Reliable"

        elif reliability_score >= 50:

            reliability_status = "Moderate"

        else:

            reliability_status = (
                "Low Reliability"
            )

        # ==================================================
        # RELIABILITY INDICATORS
        # ==================================================

        reliability_indicators = []

        if total_repairs == 0:

            reliability_indicators.append(
                "No recorded repair failures"
            )

        if failures_last_30_days >= 1:

            reliability_indicators.append(
                "Recent failure activity detected"
            )

        if failures_last_30_days >= 3:

            reliability_indicators.append(
                "Multiple failures recorded within 30 days"
            )

        if failures_last_90_days >= 3:

            reliability_indicators.append(
                "High failure activity within 90 days"
            )

        if mtbf is not None and mtbf < 30:

            reliability_indicators.append(
                "Short mean time between failures"
            )

        if mttr is not None and mttr > 7:

            reliability_indicators.append(
                "Long average repair duration"
            )

        if pending_repairs > 0:

            reliability_indicators.append(
                "Pending repair activity exists"
            )

        if (
            total_repairs >= 5
            and total_maintenance == 0
        ):

            reliability_indicators.append(
                "High repair activity with no recorded maintenance"
            )

        if not reliability_indicators:

            reliability_indicators.append(
                "No major reliability indicators detected"
            )

        # ==================================================
        # RECOMMENDATION
        # ==================================================

        if reliability_status == "Low Reliability":

            recommendation = (
                "Equipment reliability is low. "
                "Prioritize failure investigation, "
                "root-cause analysis and corrective "
                "maintenance planning."
            )

        elif failures_last_30_days >= 3:

            recommendation = (
                "Multiple recent failures detected. "
                "Prioritize inspection and investigate "
                "recurring failure causes."
            )

        elif (
            mtbf is not None
            and mtbf < 30
        ):

            recommendation = (
                "Failure intervals are short. "
                "Investigate recurring failure mechanisms "
                "and review preventive maintenance strategy."
            )

        elif pending_repairs > 0:

            recommendation = (
                "Pending repair activity remains. "
                "Monitor outstanding repairs and "
                "restore equipment reliability."
            )

        elif reliability_status == "Moderate":

            recommendation = (
                "Equipment reliability is moderate. "
                "Continue monitoring failure patterns "
                "and preventive maintenance effectiveness."
            )

        else:

            recommendation = (
                "Equipment reliability is within a "
                "healthy range. Continue routine "
                "monitoring and maintenance."
            )

        # ==================================================
        # RETURN ANALYTICS
        # ==================================================

        return {

            "equipment_id":
                equipment["equipment_id"],

            "equipment_name":
                equipment["name"],

            "category":
                equipment["category"],

            "status":
                equipment["status"],

            "total_repairs":
                total_repairs,

            "completed_repairs":
                completed_repairs,

            "pending_repairs":
                pending_repairs,

            "total_maintenance":
                total_maintenance,

            "failure_frequency":
                total_repairs,

            "failure_frequency_status":
                failure_frequency_status,

            "failures_last_30_days":
                failures_last_30_days,

            "failures_last_90_days":
                failures_last_90_days,

            "failures_last_180_days":
                failures_last_180_days,

            "first_failure_date":
                first_failure_date,

            "last_failure_date":
                last_failure_date,

            "days_since_last_failure":
                days_since_last_failure,

            "mtbf_days":
                mtbf,

            "mtbf_status":
                mtbf_status,

            "mttr_days":
                mttr,

            "mttr_status":
                mttr_status,

            "repair_completion_rate":
                repair_completion_rate,

            "reliability_score":
                reliability_score,

            "reliability_status":
                reliability_status,

            "reliability_indicators":
                reliability_indicators,

            "recommendation":
                recommendation
        }

    finally:

        conn.close()


# ==========================================================
# ALL EQUIPMENT RELIABILITY
# ==========================================================

def get_all_equipment_reliability():
    """
    Return reliability analytics for all equipment.

    FuElectric-AI v3.5.3
    """

    conn = get_connection()

    try:

        equipment_rows = conn.execute("""
            SELECT equipment_id
            FROM equipment
            ORDER BY name ASC
        """).fetchall()

        equipment_ids = [
            row["equipment_id"]
            for row in equipment_rows
        ]

    finally:

        conn.close()

    results = []

    for equipment_id in equipment_ids:

        reliability = get_equipment_reliability(
            equipment_id
        )

        if reliability is not None:

            results.append(reliability)

    return results


# ==========================================================
# RELIABILITY SUMMARY
# ==========================================================

def get_reliability_summary():
    """
    Return an overall reliability summary.

    FuElectric-AI v3.5.3
    """

    reliability_data = (
        get_all_equipment_reliability()
    )

    total_equipment = len(
        reliability_data
    )

    if total_equipment == 0:

        return {
            "total_equipment": 0,
            "average_reliability_score": 0,
            "average_mtbf_days": None,
            "average_mttr_days": None,
            "highly_reliable": 0,
            "reliable": 0,
            "moderate": 0,
            "low_reliability": 0,
            "equipment_with_recent_failures": 0,
            "equipment_with_high_failure_frequency": 0,
            "equipment_with_pending_repairs": 0,
            "most_reliable_equipment": None,
            "least_reliable_equipment": None
        }

    # ==================================================
    # AVERAGE SCORE
    # ==================================================

    average_score = round(
        sum(
            item["reliability_score"]
            for item in reliability_data
        )
        / total_equipment,
        2
    )

    # ==================================================
    # AVERAGE MTBF
    # ==================================================

    mtbf_values = [
        item["mtbf_days"]
        for item in reliability_data
        if item["mtbf_days"] is not None
    ]

    average_mtbf = (
        round(
            sum(mtbf_values)
            / len(mtbf_values),
            2
        )
        if mtbf_values
        else None
    )

    # ==================================================
    # AVERAGE MTTR
    # ==================================================

    mttr_values = [
        item["mttr_days"]
        for item in reliability_data
        if item["mttr_days"] is not None
    ]

    average_mttr = (
        round(
            sum(mttr_values)
            / len(mttr_values),
            2
        )
        if mttr_values
        else None
    )

    # ==================================================
    # CLASSIFICATIONS
    # ==================================================

    highly_reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Highly Reliable"
    )

    reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Reliable"
    )

    moderate = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Moderate"
    )

    low_reliability = sum(
        1
        for item in reliability_data
        if item["reliability_status"]
        == "Low Reliability"
    )

    # ==================================================
    # RISK SIGNAL COUNTS
    # ==================================================

    equipment_with_recent_failures = sum(
        1
        for item in reliability_data
        if item["failures_last_30_days"] > 0
    )

    equipment_with_high_failure_frequency = sum(
        1
        for item in reliability_data
        if item["failure_frequency_status"]
        == "High"
    )

    equipment_with_pending_repairs = sum(
        1
        for item in reliability_data
        if item["pending_repairs"] > 0
    )

    # ==================================================
    # MOST / LEAST RELIABLE
    # ==================================================

    ranked = sorted(
        reliability_data,
        key=lambda item: (
            item["reliability_score"],
            item["equipment_name"]
        ),
        reverse=True
    )

    most_reliable = ranked[0]
    least_reliable = ranked[-1]

    # ==================================================
    # RETURN
    # ==================================================

    return {

        "total_equipment":
            total_equipment,

        "average_reliability_score":
            average_score,

        "average_mtbf_days":
            average_mtbf,

        "average_mttr_days":
            average_mttr,

        "highly_reliable":
            highly_reliable,

        "reliable":
            reliable,

        "moderate":
            moderate,

        "low_reliability":
            low_reliability,

        "equipment_with_recent_failures":
            equipment_with_recent_failures,

        "equipment_with_high_failure_frequency":
            equipment_with_high_failure_frequency,

        "equipment_with_pending_repairs":
            equipment_with_pending_repairs,

        "most_reliable_equipment": {
            "equipment_id":
                most_reliable["equipment_id"],
            "equipment_name":
                most_reliable["equipment_name"],
            "reliability_score":
                most_reliable["reliability_score"]
        },

        "least_reliable_equipment": {
            "equipment_id":
                least_reliable["equipment_id"],
            "equipment_name":
                least_reliable["equipment_name"],
            "reliability_score":
                least_reliable["reliability_score"]
        }
    }


# ==========================================================
# RELIABILITY RANKING
# ==========================================================

def get_reliability_ranking():
    """
    Rank equipment from highest to lowest reliability.

    FuElectric-AI v3.5.3
    """

    reliability_data = (
        get_all_equipment_reliability()
    )

    reliability_data.sort(
        key=lambda item: (
            item["reliability_score"],
            item["equipment_name"]
        ),
        reverse=True
    )

    for rank, item in enumerate(
        reliability_data,
        start=1
    ):

        item["reliability_rank"] = rank

    return reliability_data


# ==========================================================
# RELIABILITY ALERTS
# ==========================================================

def get_reliability_alerts():
    """
    Return equipment requiring reliability attention.

    FuElectric-AI v3.5.3
    """

    data = get_all_equipment_reliability()

    alerts = []

    for item in data:

        alert_level = None
        alert_reason = None

        # --------------------------------------------------
        # HIGH PRIORITY
        # --------------------------------------------------

        if item["reliability_status"] == "Low Reliability":

            alert_level = "High"

            alert_reason = (
                "Equipment has low reliability score."
            )

        elif item["failures_last_30_days"] >= 3:

            alert_level = "High"

            alert_reason = (
                "Multiple failures recorded within "
                "the last 30 days."
            )

        elif (
            item["mtbf_days"] is not None
            and item["mtbf_days"] < 30
        ):

            alert_level = "High"

            alert_reason = (
                "Equipment has a short mean time "
                "between failures."
            )

        # --------------------------------------------------
        # MEDIUM PRIORITY
        # --------------------------------------------------

        elif item["pending_repairs"] > 0:

            alert_level = "Medium"

            alert_reason = (
                "Equipment has pending repair activity."
            )

        elif item["failures_last_90_days"] >= 3:

            alert_level = "Medium"

            alert_reason = (
                "High failure activity detected "
                "within the last 90 days."
            )

        # --------------------------------------------------
        # CREATE ALERT
        # --------------------------------------------------

        if alert_level:

            alerts.append({

                "equipment_id":
                    item["equipment_id"],

                "equipment_name":
                    item["equipment_name"],

                "reliability_score":
                    item["reliability_score"],

                "reliability_status":
                    item["reliability_status"],

                "alert_level":
                    alert_level,

                "reason":
                    alert_reason,

                "recommendation":
                    item["recommendation"]
            })

    # ==================================================
    # PRIORITY SORT
    # ==================================================

    priority_order = {
        "High": 1,
        "Medium": 2,
        "Low": 3
    }

    alerts.sort(
        key=lambda item: (
            priority_order.get(
                item["alert_level"],
                99
            ),
            item["reliability_score"]
        )
    )

    return {

        "total_alerts":
            len(alerts),

        "high_alerts":
            sum(
                1
                for item in alerts
                if item["alert_level"] == "High"
            ),

        "medium_alerts":
            sum(
                1
                for item in alerts
                if item["alert_level"] == "Medium"
            ),

        "alerts":
            alerts
    }

# ==========================================================
# HEALTH & RISK TRENDS — FuElectric-AI v3.5.4
# ==========================================================

def get_equipment_health_trend(equipment_id: str):
    """
    Analyze the health and risk trend of one equipment item.

    FuElectric-AI v3.5.4
    """

    conn = get_connection()

    try:

        # --------------------------------------------------
        # GET EQUIPMENT
        # --------------------------------------------------

        equipment = conn.execute("""
            SELECT
                equipment_id,
                name,
                category,
                status
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        equipment = dict(equipment)

        # --------------------------------------------------
        # GET REPAIR HISTORY
        # --------------------------------------------------

        repairs = conn.execute("""
            SELECT
                repair_id,
                repair_date,
                repair_status,
                fault_reported
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [dict(row) for row in repairs]

        # --------------------------------------------------
        # GET MAINTENANCE HISTORY
        # --------------------------------------------------

        maintenance = conn.execute("""
            SELECT
                id,
                maintenance_date,
                maintenance_type,
                status
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date ASC
        """, (equipment_id,)).fetchall()

        maintenance = [dict(row) for row in maintenance]

        # --------------------------------------------------
        # CURRENT HEALTH SCORE
        # --------------------------------------------------

        repair_count = len(repairs)
        maintenance_count = len(maintenance)

        health_score = 100

        health_score -= repair_count * 10
        health_score += maintenance_count * 2

        health_score = max(
            0,
            min(
                100,
                health_score
            )
        )

        # --------------------------------------------------
        # RISK SCORE
        # --------------------------------------------------

        risk_score = 100 - health_score

        # --------------------------------------------------
        # RISK CLASSIFICATION
        # --------------------------------------------------

        if risk_score >= 60:

            risk_level = "High"

        elif risk_score >= 30:

            risk_level = "Medium"

        else:

            risk_level = "Low"

        # --------------------------------------------------
        # TREND SIGNAL
        # --------------------------------------------------

        if repair_count > maintenance_count:

            trend = "Deteriorating"

        elif maintenance_count > repair_count:

            trend = "Improving"

        else:

            trend = "Stable"

        # --------------------------------------------------
        # RECENT ACTIVITY
        # --------------------------------------------------

        recent_repairs = repairs[-3:]

        recent_maintenance = maintenance[-3:]

        # --------------------------------------------------
        # RISK INDICATORS
        # --------------------------------------------------

        risk_indicators = []

        if repair_count >= 3:

            risk_indicators.append(
                "Frequent repair activity"
            )

        if repair_count >= 5:

            risk_indicators.append(
                "High number of recorded repairs"
            )

        if maintenance_count == 0:

            risk_indicators.append(
                "No maintenance records available"
            )

        if health_score < 50:

            risk_indicators.append(
                "Equipment health is below 50%"
            )

        if not risk_indicators:

            risk_indicators.append(
                "No major risk indicators detected"
            )

        # --------------------------------------------------
        # AI RECOMMENDATION
        # --------------------------------------------------

        if risk_level == "High":

            recommendation = (
                "High equipment risk detected. "
                "Prioritize inspection and maintenance "
                "planning."
            )

        elif trend == "Deteriorating":

            recommendation = (
                "Equipment condition is deteriorating. "
                "Increase monitoring and schedule "
                "preventive maintenance."
            )

        elif trend == "Improving":

            recommendation = (
                "Equipment condition is improving. "
                "Continue the current maintenance strategy."
            )

        else:

            recommendation = (
                "Equipment condition is stable. "
                "Continue routine monitoring and maintenance."
            )

        # --------------------------------------------------
        # RETURN TREND ANALYTICS
        # --------------------------------------------------

        return {

            "equipment_id":
                equipment["equipment_id"],

            "equipment_name":
                equipment["name"],

            "category":
                equipment["category"],

            "equipment_status":
                equipment["status"],

            "health_score":
                health_score,

            "risk_score":
                risk_score,

            "risk_level":
                risk_level,

            "trend":
                trend,

            "total_repairs":
                repair_count,

            "total_maintenance":
                maintenance_count,

            "recent_repairs":
                recent_repairs,

            "recent_maintenance":
                recent_maintenance,

            "risk_indicators":
                risk_indicators,

            "recommendation":
                recommendation
        }

    finally:

        conn.close()

# ==========================================================
# HISTORICAL EQUIPMENT CONDITION INTELLIGENCE
# FuElectric-AI v3.5.4
# ==========================================================

def get_equipment_health_history(
    equipment_id: str,
    months: int = 3
):
    """
    Generate historical equipment condition intelligence.

    FuElectric-AI v3.5.4

    Reconstructs monthly condition using recorded
    maintenance and repair activity.

    NOTE:
    Historical health scores are calculated from
    recorded maintenance and repair activity.
    They are not direct sensor measurements.
    """

    conn = get_connection()

    try:

        # --------------------------------------------------
        # VALIDATE PERIOD
        # --------------------------------------------------

        try:
            months = int(months)
        except (TypeError, ValueError):
            months = 3

        months = max(
            1,
            min(months, 12)
        )

        # --------------------------------------------------
        # GET EQUIPMENT
        # --------------------------------------------------

        equipment = conn.execute("""
            SELECT
                equipment_id,
                name,
                category,
                status
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        equipment = dict(equipment)

        # --------------------------------------------------
        # GET REPAIR HISTORY
        # --------------------------------------------------

        repairs = conn.execute("""
            SELECT
                repair_id,
                repair_date,
                repair_status,
                fault_reported
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [
            dict(row)
            for row in repairs
        ]

        # --------------------------------------------------
        # GET MAINTENANCE HISTORY
        # --------------------------------------------------

        maintenance = conn.execute("""
            SELECT
                id,
                maintenance_date,
                maintenance_type,
                status
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date ASC
        """, (equipment_id,)).fetchall()

        maintenance = [
            dict(row)
            for row in maintenance
        ]

    finally:

        conn.close()

    # ======================================================
    # DATE HELPERS
    # ======================================================

    from datetime import datetime

    def parse_date(value):

        if not value:
            return None

        if isinstance(value, datetime):
            return value

        value = str(value).strip()

        formats = [
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y/%m/%d"
        ]

        for fmt in formats:

            try:
                return datetime.strptime(
                    value,
                    fmt
                )

            except ValueError:
                continue

        return None

    # ======================================================
    # COLLECT DATED RECORDS
    # ======================================================

    dated_records = []

    for repair in repairs:

        date = parse_date(
            repair.get("repair_date")
        )

        if date:

            dated_records.append({
                "date": date,
                "type": "repair",
                "record": repair
            })

    for record in maintenance:

        date = parse_date(
            record.get("maintenance_date")
        )

        if date:

            dated_records.append({
                "date": date,
                "type": "maintenance",
                "record": record
            })

    # ------------------------------------------------------
    # NO HISTORICAL DATA
    # ------------------------------------------------------

    if not dated_records:

        return {
            "equipment_id":
                equipment["equipment_id"],

            "equipment_name":
                equipment["name"],

            "category":
                equipment["category"],

            "equipment_status":
                equipment["status"],

            "period_months":
                months,

            "monthly_history":
                [],

            "trend":
                "No Historical Data",

            "change":
                0,

            "overall_assessment":
                "There is not enough dated maintenance or repair "
                "history to determine an equipment condition trend.",

            "immediate_actions": [
                "Begin recording equipment maintenance and repair activity.",
                "Inspect the equipment and establish a current condition baseline."
            ],

            "recommendations": [
                "Maintain consistent maintenance records.",
                "Monitor equipment condition regularly."
            ]
        }

    # ======================================================
    # DETERMINE CURRENT MONTH
    # ======================================================

    all_dates = [
        record["date"]
        for record in dated_records
    ]

    latest_date = max(all_dates)

    latest_year = latest_date.year
    latest_month = latest_date.month

    # ======================================================
    # GENERATE MONTH WINDOWS
    # ======================================================

    month_windows = []

    year = latest_year
    month = latest_month

    for _ in range(months):

        month_windows.append(
            (year, month)
        )

        month -= 1

        if month == 0:
            month = 12
            year -= 1

    month_windows.reverse()

    # ======================================================
    # HISTORICAL MONTHLY ANALYSIS
    # ======================================================

    monthly_history = []

    for year, month in month_windows:

        # --------------------------------------------------
        # CUMULATIVE RECORDS UP TO THIS MONTH
        # --------------------------------------------------

        month_end_records = [
            record
            for record in dated_records
            if (
                record["date"].year < year
                or (
                    record["date"].year == year
                    and record["date"].month <= month
                )
            )
        ]

        cumulative_repairs = sum(
            1
            for record in month_end_records
            if record["type"] == "repair"
        )

        cumulative_maintenance = sum(
            1
            for record in month_end_records
            if record["type"] == "maintenance"
        )

        # --------------------------------------------------
        # CALCULATED HISTORICAL HEALTH
        # --------------------------------------------------

        health_score = 100

        health_score -= (
            cumulative_repairs * 10
        )

        health_score += (
            cumulative_maintenance * 2
        )

        health_score = max(
            0,
            min(
                100,
                health_score
            )
        )

        risk_score = 100 - health_score

        # --------------------------------------------------
        # CONDITION
        # --------------------------------------------------

        if health_score >= 90:
            condition = "Excellent"

        elif health_score >= 75:
            condition = "Good"

        elif health_score >= 50:
            condition = "Fair"

        else:
            condition = "Poor"

        # --------------------------------------------------
        # MONTHLY ACTIVITY
        # --------------------------------------------------

        monthly_repairs = [
            record
            for record in dated_records
            if (
                record["type"] == "repair"
                and record["date"].year == year
                and record["date"].month == month
            )
        ]

        monthly_maintenance = [
            record
            for record in dated_records
            if (
                record["type"] == "maintenance"
                and record["date"].year == year
                and record["date"].month == month
            )
        ]

        monthly_history.append({

            "year":
                year,

            "month":
                month,

            "month_name":
                datetime(
                    year,
                    month,
                    1
                ).strftime("%B"),

            "health_score":
                round(
                    health_score,
                    1
                ),

            "risk_score":
                round(
                    risk_score,
                    1
                ),

            "condition":
                condition,

            "repairs":
                len(monthly_repairs),

            "maintenance":
                len(monthly_maintenance)

        })

    # ======================================================
    # TREND ANALYSIS
    # ======================================================

    first_score = (
        monthly_history[0]["health_score"]
    )

    last_score = (
        monthly_history[-1]["health_score"]
    )

    change = round(
        last_score - first_score,
        1
    )

    if change <= -20:

        trend = "Rapidly Deteriorating"

    elif change <= -5:

        trend = "Deteriorating"

    elif change >= 5:

        trend = "Improving"

    else:

        trend = "Stable"

    # ======================================================
    # OVERALL ASSESSMENT
    # ======================================================

    if trend == "Rapidly Deteriorating":

        overall_assessment = (
            "Equipment condition has deteriorated significantly "
            "over the selected period. Immediate inspection and "
            "maintenance intervention should be considered."
        )

    elif trend == "Deteriorating":

        overall_assessment = (
            "Equipment condition shows a downward trend over "
            "the selected period. Increased monitoring and "
            "preventive maintenance are recommended."
        )

    elif trend == "Improving":

        overall_assessment = (
            "Equipment condition is improving over the selected "
            "period. The current maintenance approach appears "
            "to be supporting equipment condition."
        )

    else:

        overall_assessment = (
            "Equipment condition has remained relatively stable "
            "over the selected period. Continue routine monitoring "
            "and maintenance."
        )

    # ======================================================
    # IMMEDIATE ACTIONS
    # ======================================================

    immediate_actions = []

    if trend in (
        "Deteriorating",
        "Rapidly Deteriorating"
    ):

        immediate_actions.append(
            "Inspect the equipment for emerging faults or abnormal conditions."
        )

        immediate_actions.append(
            "Review recent repair and maintenance records."
        )

        immediate_actions.append(
            "Assess whether corrective maintenance is required."
        )

    elif trend == "Stable":

        immediate_actions.append(
            "Continue routine equipment monitoring."
        )

        immediate_actions.append(
            "Maintain the existing preventive maintenance schedule."
        )

    elif trend == "Improving":

        immediate_actions.append(
            "Continue the current maintenance strategy."
        )

        immediate_actions.append(
            "Monitor the equipment to confirm continued improvement."
        )

    # ======================================================
    # RECOMMENDATIONS
    # ======================================================

    recommendations = []

    if trend == "Rapidly Deteriorating":

        recommendations.extend([
            "Prioritize the equipment for maintenance review.",
            "Investigate recurring repair causes.",
            "Consider a detailed root-cause analysis.",
            "Increase condition monitoring frequency."
        ])

    elif trend == "Deteriorating":

        recommendations.extend([
            "Increase monitoring frequency.",
            "Schedule preventive maintenance.",
            "Investigate recurring faults.",
            "Review maintenance effectiveness."
        ])

    elif trend == "Improving":

        recommendations.extend([
            "Continue the current preventive maintenance strategy.",
            "Track future condition changes.",
            "Maintain accurate maintenance records."
        ])

    else:

        recommendations.extend([
            "Continue routine monitoring.",
            "Maintain preventive maintenance activities.",
            "Keep equipment records up to date."
        ])

    # ======================================================
    # FINAL RESPONSE
    # ======================================================

    return {

        "equipment_id":
            equipment["equipment_id"],

        "equipment_name":
            equipment["name"],

        "category":
            equipment["category"],

        "equipment_status":
            equipment["status"],

        "period_months":
            months,

        "monthly_history":
            monthly_history,

        "starting_health_score":
            first_score,

        "current_health_score":
            last_score,

        "change":
            change,

        "trend":
            trend,

        "overall_assessment":
            overall_assessment,

        "immediate_actions":
            immediate_actions,

        "recommendations":
            recommendations

    }

# ==========================================================
# EQUIPMENT RISK RANKING — FuElectric-AI v3.5.4
# ==========================================================

def get_equipment_risk_ranking():
    """
    Rank equipment according to calculated risk.

    FuElectric-AI v3.5.4
    """

    conn = get_connection()

    try:

        equipment_list = conn.execute("""
            SELECT equipment_id
            FROM equipment
            ORDER BY name
        """).fetchall()

    finally:

        conn.close()

    results = []

    for equipment in equipment_list:

        trend = get_equipment_health_trend(
            equipment["equipment_id"]
        )

        if trend:

            results.append(trend)

    # Highest risk first

    results.sort(
        key=lambda item: item["risk_score"],
        reverse=True
    )

    # Add ranking

    for index, item in enumerate(
        results,
        start=1
    ):

        item["risk_rank"] = index

    return results


# ==========================================================
# HEALTH & RISK SUMMARY — FuElectric-AI v3.5.4
# ==========================================================

def get_health_risk_summary():
    """
    Return an overall health and risk summary.

    FuElectric-AI v3.5.4
    """

    data = get_equipment_risk_ranking()

    total_equipment = len(data)

    if total_equipment == 0:

        return {

            "total_equipment": 0,

            "average_health_score": 0,

            "average_risk_score": 0,

            "low_risk": 0,

            "medium_risk": 0,

            "high_risk": 0,

            "improving": 0,

            "stable": 0,

            "deteriorating": 0
        }

    average_health = sum(
        item["health_score"]
        for item in data
    ) / total_equipment

    average_risk = sum(
        item["risk_score"]
        for item in data
    ) / total_equipment

    low_risk = sum(
        1
        for item in data
        if item["risk_level"] == "Low"
    )

    medium_risk = sum(
        1
        for item in data
        if item["risk_level"] == "Medium"
    )

    high_risk = sum(
        1
        for item in data
        if item["risk_level"] == "High"
    )

    improving = sum(
        1
        for item in data
        if item["trend"] == "Improving"
    )

    stable = sum(
        1
        for item in data
        if item["trend"] == "Stable"
    )

    deteriorating = sum(
        1
        for item in data
        if item["trend"] == "Deteriorating"
    )

    return {

        "total_equipment":
            total_equipment,

        "average_health_score":
            round(
                average_health,
                2
            ),

        "average_risk_score":
            round(
                average_risk,
                2
            ),

        "low_risk":
            low_risk,

        "medium_risk":
            medium_risk,

        "high_risk":
            high_risk,

        "improving":
            improving,

        "stable":
            stable,

        "deteriorating":
            deteriorating
    }


# ==========================================================
# DETERIORATING EQUIPMENT — FuElectric-AI v3.5.4
# ==========================================================

def get_deteriorating_equipment():
    """
    Return equipment identified as deteriorating.

    FuElectric-AI v3.5.4
    """

    data = get_equipment_risk_ranking()

    deteriorating = [

        item
        for item in data
        if item["trend"] == "Deteriorating"
    ]

    return deteriorating