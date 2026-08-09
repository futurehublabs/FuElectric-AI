const API_URL = "http://127.0.0.1:8000";


// ==========================================================
// MESSAGE
// ==========================================================

function showMessage(message) {

    const messageElement = document.getElementById("message");

    if (messageElement) {
        messageElement.textContent = message;
    }

}


// ==========================================================
// LIVE DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_URL}/dashboard`
        );

        if (!response.ok) {
            throw new Error(
                `Dashboard request failed: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Dashboard data:", data);


        // Total equipment
        const equipmentCount =
            document.getElementById("equipment-count");

        if (equipmentCount) {
            equipmentCount.textContent =
                data.total_equipment ?? 0;
        }


        // Active equipment
        const activeEquipment =
            document.getElementById("active-equipment");

        if (activeEquipment) {
            activeEquipment.textContent =
                data.active_equipment ?? 0;
        }


        // Maintenance records
        const maintenanceCount =
            document.getElementById("maintenance-count");

        if (maintenanceCount) {
            maintenanceCount.textContent =
                data.maintenance_records ?? 0;
        }


        // Technicians
        const technicianCount =
            document.getElementById("technician-count");

        if (technicianCount) {
            technicianCount.textContent =
                data.technicians ?? 0;
        }


        // Pending repairs
        const pendingRepairs =
            document.getElementById("pending-repairs");

        if (pendingRepairs) {
            pendingRepairs.textContent =
                data.pending_repairs ?? 0;
        }


        // Completed repairs
        const completedRepairs =
            document.getElementById("completed-repairs");

        if (completedRepairs) {
            completedRepairs.textContent =
                data.completed_repairs ?? 0;
        }


        showMessage(
            "Dashboard connected successfully."
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        showMessage(
            "Could not connect to FuElectric-AI."
        );

    }

}


// ==========================================================
// REGISTER EQUIPMENT
// ==========================================================

async function registerEquipment() {

    const equipment = {

        equipment_id:
            document.getElementById("equipment-id").value.trim(),

        name:
            document.getElementById("equipment-name").value.trim(),

        category:
            document.getElementById("equipment-category").value.trim(),

        location:
            document.getElementById("equipment-location").value.trim(),

        manufacturer:
            document.getElementById("equipment-manufacturer").value.trim(),

        model:
            document.getElementById("equipment-model").value.trim(),

        serial_number:
            document.getElementById("equipment-serial").value.trim(),

        installation_date:
            document.getElementById("equipment-date").value.trim()
    };


    // Basic validation

    if (!equipment.equipment_id) {

        showMessage("Please enter an Equipment ID.");

        return;

    }


    if (!equipment.name) {

        showMessage("Please enter an Equipment Name.");

        return;

    }


    if (!equipment.category) {

        showMessage("Please enter an Equipment Category.");

        return;

    }


    if (!equipment.location) {

        showMessage("Please enter the Equipment Location.");

        return;

    }


    console.log(
        "Sending equipment:",
        equipment
    );


    try {

        const response = await fetch(
            `${API_URL}/equipment`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(equipment)
            }
        );


        console.log(
            "Registration response:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Registration data:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Equipment registration failed."
            );

        }


        showMessage(
            "Equipment registered successfully."
        );


        // Clear form

        document.getElementById(
            "equipment-id"
        ).value = "";

        document.getElementById(
            "equipment-name"
        ).value = "";

        document.getElementById(
            "equipment-category"
        ).value = "";

        document.getElementById(
            "equipment-location"
        ).value = "";

        document.getElementById(
            "equipment-manufacturer"
        ).value = "";

        document.getElementById(
            "equipment-model"
        ).value = "";

        document.getElementById(
            "equipment-serial"
        ).value = "";

        document.getElementById(
            "equipment-date"
        ).value = "";


        // Refresh equipment list

        await loadEquipment();


        // Refresh dashboard

        await loadDashboard();


    } catch (error) {

        console.error(
            "FULL REGISTRATION ERROR:",
            error
        );


        showMessage(
            "Registration error: " +
            error.message
        );

    }

}


// ==========================================================
// LOAD EQUIPMENT
// ==========================================================

async function loadEquipment() {

    try {

        const response = await fetch(
            `${API_URL}/equipment`
        );


        if (!response.ok) {

            throw new Error(
                `Equipment request failed: ${response.status}`
            );

        }


        const equipment =
            await response.json();


        console.log(
            "Equipment data:",
            equipment
        );


        const container =
            document.getElementById(
                "equipment-list"
            );


        if (!container) {
            return;
        }


        container.innerHTML = "";


        if (
            !Array.isArray(equipment) ||
            equipment.length === 0
        ) {

            container.innerHTML =
                "<p>No equipment registered yet.</p>";

            return;

        }


        equipment.forEach(item => {

            const card =
                document.createElement("div");


            card.className =
                "equipment-item";


            card.innerHTML = `

                <h3>
                    ⚙️ ${item.name ?? "Unnamed Equipment"}
                </h3>

                <p>
                    <strong>ID:</strong>
                    ${item.equipment_id ?? "N/A"}
                </p>

                <p>
                    <strong>Category:</strong>
                    ${item.category ?? "N/A"}
                </p>

                <p>
                    <strong>Location:</strong>
                    ${item.location ?? "N/A"}
                </p>

                <p>
                    <strong>Manufacturer:</strong>
                    ${item.manufacturer ?? "N/A"}
                </p>

                <p>
                    <strong>Model:</strong>
                    ${item.model ?? "N/A"}
                </p>

                <p>
                    <strong>Serial Number:</strong>
                    ${item.serial_number ?? "N/A"}
                </p>

                <p>
                    <strong>Installation Date:</strong>
                    ${item.installation_date ?? "N/A"}
                </p>

            `;


            container.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Equipment loading error:",
            error
        );


        showMessage(
            "Could not load equipment."
        );

    }

}


// ==========================================================
// BUTTON MESSAGES
// ==========================================================

function showEquipmentMessage() {

    showMessage(
        "Equipment management is ready."
    );

}


function showDiagnosisMessage() {

    showMessage(
        "Diagnosis module coming next."
    );

}


function showAnalyticsMessage() {

    showMessage(
        "Analytics module coming next."
    );

}


// ==========================================================
// START APPLICATION
// ==========================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "FuElectric-AI frontend started."
        );


        loadDashboard();

        loadEquipment();

    }
);