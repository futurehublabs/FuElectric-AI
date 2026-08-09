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

        const response = await fetch(`${API_URL}/dashboard`);

        if (!response.ok) {
            throw new Error(
                `Dashboard request failed: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Dashboard data:", data);


        const equipmentCount =
            document.getElementById("equipment-count");

        if (equipmentCount) {
            equipmentCount.textContent =
                data.total_equipment ?? 0;
        }


        const activeEquipment =
            document.getElementById("active-equipment");

        if (activeEquipment) {
            activeEquipment.textContent =
                data.active_equipment ?? 0;
        }


        const maintenanceCount =
            document.getElementById("maintenance-count");

        if (maintenanceCount) {
            maintenanceCount.textContent =
                data.maintenance_records ?? 0;
        }


        const technicianCount =
            document.getElementById("technician-count");

        if (technicianCount) {
            technicianCount.textContent =
                data.technicians ?? 0;
        }


        const pendingRepairs =
            document.getElementById("pending-repairs");

        if (pendingRepairs) {
            pendingRepairs.textContent =
                data.pending_repairs ?? 0;
        }


        const completedRepairs =
            document.getElementById("completed-repairs");

        if (completedRepairs) {
            completedRepairs.textContent =
                data.completed_repairs ?? 0;
        }


        console.log("Dashboard loaded successfully.");

    }

    catch (error) {

        console.error("Dashboard error:", error);

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


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Equipment registration failed."
            );
        }


        showMessage(
            "Equipment registered successfully."
        );


        document.getElementById("equipment-id").value = "";
        document.getElementById("equipment-name").value = "";
        document.getElementById("equipment-category").value = "";
        document.getElementById("equipment-location").value = "";
        document.getElementById("equipment-manufacturer").value = "";
        document.getElementById("equipment-model").value = "";
        document.getElementById("equipment-serial").value = "";
        document.getElementById("equipment-date").value = "";


        await loadEquipment();
        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Equipment registration error:",
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

        const response =
            await fetch(`${API_URL}/equipment`);


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
            document.getElementById("equipment-list");


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

    }

    catch (error) {

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
// WORK ORDER MANAGEMENT
// ==========================================================


// ----------------------------------------------------------
// CREATE WORK ORDER
// ----------------------------------------------------------

async function createWorkOrder() {

    const workOrder = {

        work_order_id:
            document.getElementById(
                "work-order-id"
            ).value.trim(),

        equipment_id:
            document.getElementById(
                "work-order-equipment"
            ).value.trim(),

        technician_id:
            document.getElementById(
                "work-order-technician"
            ).value.trim() || null,

        work_type:
            document.getElementById(
                "work-order-type"
            ).value,

        priority:
            document.getElementById(
                "work-order-priority"
            ).value,

        description:
            document.getElementById(
                "work-order-description"
            ).value.trim(),

        scheduled_date:
            document.getElementById(
                "work-order-scheduled"
            ).value || null,

        due_date:
            document.getElementById(
                "work-order-due"
            ).value || null,

        completed_date: null,

        status: "Open",

        technician_notes: null,

        created_at: null
    };


    // Validation

    if (!workOrder.work_order_id) {

        showMessage(
            "Please enter a Work Order ID."
        );

        return;
    }


    if (!workOrder.equipment_id) {

        showMessage(
            "Please enter an Equipment ID."
        );

        return;
    }


    if (!workOrder.description) {

        showMessage(
            "Please enter a Work Order description."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/work-orders`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(workOrder)
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Work Order creation failed."
            );
        }


        console.log(
            "Work Order created:",
            data
        );


        showMessage(
            "Work Order created successfully."
        );


        // Clear form

        document.getElementById(
            "work-order-id"
        ).value = "";

        document.getElementById(
            "work-order-equipment"
        ).value = "";

        document.getElementById(
            "work-order-technician"
        ).value = "";

        document.getElementById(
            "work-order-description"
        ).value = "";

        document.getElementById(
            "work-order-scheduled"
        ).value = "";

        document.getElementById(
            "work-order-due"
        ).value = "";


        // Refresh

        await loadWorkOrders();

        await loadWorkOrderStatistics();

    }

    catch (error) {

        console.error(
            "Work Order error:",
            error
        );

        showMessage(
            "Work Order error: " +
            error.message
        );
    }
}


// ----------------------------------------------------------
// LOAD WORK ORDERS
// ----------------------------------------------------------

async function loadWorkOrders() {

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders`
            );


        if (!response.ok) {

            throw new Error(
                `Work Order request failed: ${response.status}`
            );
        }


        const workOrders =
            await response.json();


        console.log(
            "Work Orders:",
            workOrders
        );


        const container =
            document.getElementById(
                "work-order-list"
            );


        if (!container) {
            return;
        }


        container.innerHTML = "";


        if (
            !Array.isArray(workOrders) ||
            workOrders.length === 0
        ) {

            container.innerHTML =
                "<p>No work orders registered yet.</p>";

            return;
        }


        workOrders.forEach(order => {

            const card =
                document.createElement("div");


            card.className =
                "work-order-item";


            card.innerHTML = `

                <h3>
                    🛠️ ${order.work_order_id}
                </h3>

                <p>
                    <strong>Equipment:</strong>
                    ${order.equipment_id ?? "N/A"}
                </p>

                <p>
                    <strong>Technician:</strong>
                    ${order.technician_id ?? "Unassigned"}
                </p>

                <p>
                    <strong>Type:</strong>
                    ${order.work_type ?? "N/A"}
                </p>

                <p>
                    <strong>Priority:</strong>
                    ${order.priority ?? "N/A"}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${order.status ?? "N/A"}
                </p>

                <p>
                    <strong>Description:</strong>
                    ${order.description ?? "N/A"}
                </p>

                <p>
                    <strong>Scheduled:</strong>
                    ${order.scheduled_date ?? "N/A"}
                </p>

                <p>
                    <strong>Due:</strong>
                    ${order.due_date ?? "N/A"}
                </p>

                <p>
                    <strong>Created:</strong>
                    ${order.created_at ?? "N/A"}
                </p>

            `;


            container.appendChild(card);

        });

    }

    catch (error) {

        console.error(
            "Work Order loading error:",
            error
        );

        showMessage(
            "Could not load Work Orders."
        );
    }
}


// ----------------------------------------------------------
// WORK ORDER STATISTICS
// ----------------------------------------------------------

async function loadWorkOrderStatistics() {

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/statistics`
            );


        if (!response.ok) {

            throw new Error(
                `Statistics request failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Work Order statistics:",
            data
        );


        const total =
            document.getElementById(
                "total-work-orders"
            );

        if (total) {

            total.textContent =
                data.total_work_orders ?? 0;
        }


        const open =
            document.getElementById(
                "open-work-orders"
            );

        if (open) {

            open.textContent =
                data.open_work_orders ?? 0;
        }


        const inProgress =
            document.getElementById(
                "in-progress-work-orders"
            );

        if (inProgress) {

            inProgress.textContent =
                data.in_progress_work_orders ?? 0;
        }


        const completed =
            document.getElementById(
                "completed-work-orders"
            );

        if (completed) {

            completed.textContent =
                data.completed_work_orders ?? 0;
        }


        const highPriority =
            document.getElementById(
                "high-priority-work-orders"
            );

        if (highPriority) {

            highPriority.textContent =
                data.high_priority_work_orders ?? 0;
        }


        console.log(
            "Work Order statistics loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "Work Order statistics error:",
            error
        );

        showMessage(
            "Could not load Work Order statistics."
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

        loadWorkOrders();

        loadWorkOrderStatistics();

    }
);