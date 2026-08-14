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
    """

    conn = get_connection()

    try:

        # --------------------------------------------------
        # GET EQUIPMENT
        # --------------------------------------------------

        equipment = conn.execute("""
            SELECT *
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        equipment = dict(equipment)

        # --------------------------------------------------
        # REPAIR DATA
        # --------------------------------------------------

        repairs = conn.execute("""
            SELECT
                repair_id,
                fault_reported,
                diagnosis,
                action_taken,
                technician_id,
                repair_date,
                repair_status
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [dict(row) for row in repairs]

        # --------------------------------------------------
        # MAINTENANCE DATA
        # --------------------------------------------------

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

        maintenance = [dict(row) for row in maintenance]

        # --------------------------------------------------
        # BASIC COUNTS
        # --------------------------------------------------

        total_repairs = len(repairs)

        completed_repairs = sum(
            1
            for repair in repairs
            if repair.get("repair_status") == "Completed"
        )

        total_maintenance = len(maintenance)

        # --------------------------------------------------
        # VALID REPAIR DATES
        # --------------------------------------------------

        repair_dates = []

        for repair in repairs:

            repair_date = repair.get("repair_date")

            if not repair_date:
                continue

            try:
                parsed_date = datetime.strptime(
                    repair_date,
                    "%Y-%m-%d %H:%M:%S"
                )

                repair_dates.append(parsed_date)

            except ValueError:

                try:
                    parsed_date = datetime.strptime(
                        repair_date,
                        "%Y-%m-%d"
                    )

                    repair_dates.append(parsed_date)

                except ValueError:
                    continue

        # --------------------------------------------------
        # FAILURE FREQUENCY
        # --------------------------------------------------

        failure_frequency = total_repairs

        # --------------------------------------------------
        # FIRST / LAST FAILURE
        # --------------------------------------------------

        first_failure_date = None
        last_failure_date = None

        if repair_dates:

            first_failure_date = min(repair_dates).strftime(
                "%Y-%m-%d"
            )

            last_failure_date = max(repair_dates).strftime(
                "%Y-%m-%d"
            )

        # --------------------------------------------------
        # MTBF
        # --------------------------------------------------
        # MTBF requires at least two dated failures.
        #
        # We calculate the average number of days between
        # recorded repair events.
        # --------------------------------------------------

        mtbf = None

        if len(repair_dates) >= 2:

            repair_dates.sort()

            intervals = []

            for index in range(1, len(repair_dates)):

                interval = (
                    repair_dates[index]
                    - repair_dates[index - 1]
                ).total_seconds() / 86400

                intervals.append(interval)

            if intervals:

                mtbf = round(
                    sum(intervals) / len(intervals),
                    2
                )

        # --------------------------------------------------
        # MTTR
        # --------------------------------------------------
        #
        # The current database has only one repair_date.
        # It does not contain a separate repair-start and
        # repair-completion timestamp.
        #
        # Therefore MTTR cannot be reliably calculated yet.
        # --------------------------------------------------

        mttr = None

        # --------------------------------------------------
        # RELIABILITY SCORE
        # --------------------------------------------------
        #
        # Initial v3.5.3 reliability model:
        #
        # Start at 100.
        #
        # Repeated repairs reduce reliability.
        # Maintenance activity provides a small positive
        # reliability signal.
        #
        # This is an analytics score, not a physical
        # engineering reliability probability.
        # --------------------------------------------------

        reliability_score = 100.0

        reliability_score -= total_repairs * 10

        reliability_score += total_maintenance * 2

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

        # --------------------------------------------------
        # RELIABILITY STATUS
        # --------------------------------------------------

        if reliability_score >= 90:

            reliability_status = "Highly Reliable"

        elif reliability_score >= 75:

            reliability_status = "Reliable"

        elif reliability_score >= 50:

            reliability_status = "Moderate"

        else:

            reliability_status = "Low Reliability"

        # --------------------------------------------------
        # RETURN RELIABILITY ANALYTICS
        # --------------------------------------------------

        return {
            "equipment_id": equipment_id,
            "equipment_name": equipment["name"],
            "category": equipment["category"],
            "status": equipment["status"],

            "total_repairs": total_repairs,
            "completed_repairs": completed_repairs,
            "total_maintenance": total_maintenance,

            "failure_frequency": failure_frequency,

            "first_failure_date": first_failure_date,
            "last_failure_date": last_failure_date,

            "mtbf_days": mtbf,
            "mttr_days": mttr,

            "reliability_score": reliability_score,
            "reliability_status": reliability_status
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

    reliability_data = get_all_equipment_reliability()

    total_equipment = len(reliability_data)

    if total_equipment == 0:

        return {
            "total_equipment": 0,
            "average_reliability_score": 0,
            "highly_reliable": 0,
            "reliable": 0,
            "moderate": 0,
            "low_reliability": 0
        }

    total_score = sum(
        item["reliability_score"]
        for item in reliability_data
    )

    highly_reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"] == "Highly Reliable"
    )

    reliable = sum(
        1
        for item in reliability_data
        if item["reliability_status"] == "Reliable"
    )

    moderate = sum(
        1
        for item in reliability_data
        if item["reliability_status"] == "Moderate"
    )

    low_reliability = sum(
        1
        for item in reliability_data
        if item["reliability_status"] == "Low Reliability"
    )

    return {
        "total_equipment": total_equipment,

        "average_reliability_score": round(
            total_score / total_equipment,
            2
        ),

        "highly_reliable": highly_reliable,
        "reliable": reliable,
        "moderate": moderate,
        "low_reliability": low_reliability
    }


def get_reliability_ranking():
    """
    Rank equipment by reliability score.

    FuElectric-AI v3.5.3
    """

    reliability_data = get_all_equipment_reliability()

    reliability_data.sort(
        key=lambda item: item["reliability_score"],
        reverse=True
    )

    for index, item in enumerate(
        reliability_data,
        start=1
    ):

        item["reliability_rank"] = index

    return reliability_data