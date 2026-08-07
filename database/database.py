import sqlite3

DATABASE_NAME = "fuelectric_ai.db"

def get_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn 
def create_tables():
    conn = get_connection()  

    conn.execute("""
        CREATE TABLE IF NOT EXISTS equipment (
            equipment_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            manufacturer TEXT,
            model TEXT,
            serial_number TEXT,
            location TEXT NOT NULL, 
            installation_date TEXT 
        )
    
    """,
    )

    conn.commit()
    conn.close()

def add_equipment(equipment):
    conn = get_connection()

    conn.execute("""
    INSERT INTO equipment(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
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

def get_all_equipment():
   conn = get_connection()

   cursor = conn.execute("SELECT * FROM equipment")

   equipment = cursor.fetchall()

   conn.close()

   return [dict(row)for row in equipment]

def get_equipment_by_id(equipment_id):
    conn = get_connection()

    cursor = conn.execute("SELECT * FROM equipment WHERE equipment_id = ?",
                           (equipment_id,))

    equipment = cursor.fetchone()

    conn.close()

    if equipment:
        return dict(equipment)
    else:
        return None

def update_equipment(equipment_id, equipment):
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
        """, (
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

def delete_equipment(equipment_id):
    conn = get_connection()

    cursor = conn.execute(
        "DELETE FROM equipment WHERE equipment_id = ?",
        (equipment_id,)
    )

    conn.commit()
    conn.close()

    return cursor.rowcount > 0

def search_equipment(keyword):
    conn = get_connection()

    cursor = conn.execute(
        """
        SELECT * FROM equipment
        WHERE name LIKE ?
        OR category LIKE ?
        OR manufacturer LIKE ?
        OR location LIKE ?
        """,
        (
            f"%{keyword}%",
            f"%{keyword}%",
            f"%{keyword}%",
            f"%{keyword}%"
        )
    )

    equipment = cursor.fetchall()

    conn.close()

    return [dict(row) for row in equipment]