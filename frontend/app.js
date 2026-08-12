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
// MAINTENANCE INTELLIGENCE — v3.3
// ==========================================================

async function loadMaintenanceAlerts() {

    const countElement =
        document.getElementById(
            "maintenance-alert-count"
        );

    const listElement =
        document.getElementById(
            "maintenance-alert-list"
        );

    // Check that the HTML elements exist
    if (!countElement || !listElement) {

        console.error(
            "Maintenance alert elements not found."
        );

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/maintenance/alerts`
        );

        if (!response.ok) {

            throw new Error(
                `Maintenance alert request failed: ${response.status}`
            );

        }

        const data = await response.json();

        console.log(
            "Maintenance alerts:",
            data
        );

        countElement.textContent =
            data.total_alerts;

        if (
            !data.alerts ||
            data.alerts.length === 0
        ) {

            listElement.innerHTML = `
                <div class="maintenance-ok">
                    ✅ No maintenance alerts.
                </div>
            `;

            return;
        }

        listElement.innerHTML =
            data.alerts.map(alert => {

                const maintenanceStatus =
                    alert.last_maintenance
                        ? `Last maintenance: ${alert.last_maintenance}`
                        : "⚠️ No maintenance record";

                return `
                    <div class="maintenance-alert-card">

                        <h3>
                            ⚠️ ${alert.name}
                        </h3>

                        <p>
                            <strong>Equipment ID:</strong>
                            ${alert.equipment_id}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            ${alert.status}
                        </p>

                        <p>
                            <strong>Maintenance:</strong>
                            ${maintenanceStatus}
                        </p>

                        <div class="maintenance-action">

                            🛠️ Recommended Action:

                            <strong>
                                Schedule maintenance inspection
                            </strong>

                        </div>

                        <button
                            onclick="viewMaintenanceEquipment('${alert.equipment_id}')"
                        >
                            🔍 View Equipment
                        </button>

                    </div>
                `;

            }).join("");

    } catch (error) {

        console.error(
            "Maintenance alert error:",
            error
        );

        countElement.textContent = "--";

        listElement.innerHTML = `
            <div class="maintenance-error">

                ❌ Unable to load maintenance alerts.

                <br>

                ${error.message}

            </div>
        `;
    }
}

// ==========================================================
// FuElectric-AI v3.4.1
// EQUIPMENT MANAGEMENT
// ==========================================================

let equipmentData = [];


// ==========================================================
// LOAD EQUIPMENT
// ==========================================================

async function loadEquipment() {

    const tableBody =
        document.getElementById("equipmentTableBody");

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
            "Equipment loaded:",
            equipment
        );

        equipmentData = Array.isArray(equipment)
            ? equipment
            : [];

        // Display equipment table
        renderEquipment(equipmentData);

        // Populate health selector
        populateEquipmentSelector(
            "equipment-health-select",
            equipmentData
        );

        // Populate diagnosis selector
        populateEquipmentSelector(
            "diagnosis-equipment",
            equipmentData
        );

    } catch (error) {

        console.error(
            "Equipment loading error:",
            error
        );

        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        ❌ Unable to load equipment.
                    </td>
                </tr>
            `;

        }

    }
}


// ==========================================================
// RENDER EQUIPMENT TABLE
// ==========================================================

function renderEquipment(equipmentList) {

    const tableBody =
        document.getElementById("equipmentTableBody");

    if (!tableBody) {
        return;
    }


    if (
        !equipmentList ||
        equipmentList.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    No equipment found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        equipmentList.map(item => `

            <tr>

                <td>
                    ${escapeHtml(
                        item.equipment_id || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.name || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.category || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.manufacturer || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.model || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.location || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.status || "Active"
                    )}
                </td>

                <td>

                    <button
                        class="action-btn edit-btn"
                        onclick="editEquipment('${escapeJs(
                            item.equipment_id
                        )}')"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        class="action-btn delete-btn"
                        onclick="deleteEquipment('${escapeJs(
                            item.equipment_id
                        )}')"
                    >
                        🗑️ Delete
                    </button>

                </td>

            </tr>

        `).join("");
}


// ==========================================================
// POPULATE EQUIPMENT SELECTOR
// ==========================================================

function populateEquipmentSelector(
    selectorId,
    equipment
) {

    const selector =
        document.getElementById(selectorId);

    if (!selector) {
        return;
    }


    selector.innerHTML = `
        <option value="">
            Select Equipment
        </option>
    `;


    equipment.forEach(item => {

        const option =
            document.createElement("option");

        option.value =
            item.equipment_id;

        option.textContent =
            `${item.equipment_id} — ${item.name}`;

        selector.appendChild(option);

    });

}


// ==========================================================
// OPEN EQUIPMENT FORM
// ==========================================================

function openEquipmentForm() {

    const modal =
        document.getElementById(
            "equipmentModal"
        );

    const form =
        document.getElementById(
            "equipmentForm"
        );

    const title =
        document.getElementById(
            "equipmentModalTitle"
        );

    const editId =
        document.getElementById(
            "editEquipmentId"
        );


    if (!modal || !form) {
        return;
    }


    form.reset();

    if (title) {
        title.textContent =
            "Add Equipment";
    }

    if (editId) {
        editId.value = "";
    }


    modal.style.display = "flex";

}


// ==========================================================
// CLOSE EQUIPMENT FORM
// ==========================================================

function closeEquipmentForm() {

    const modal =
        document.getElementById(
            "equipmentModal"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


// ==========================================================
// ADD / UPDATE EQUIPMENT
// ==========================================================

const equipmentForm =
    document.getElementById(
        "equipmentForm"
    );

if (equipmentForm) {

    equipmentForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const editId =
                document.getElementById(
                    "editEquipmentId"
                ).value.trim();


            const equipment = {

                equipment_id:
                    editId ||
                    generateEquipmentId(),

                name:
                    document.getElementById(
                        "equipmentName"
                    ).value.trim(),

                category:
                    document.getElementById(
                        "equipmentCategory"
                    ).value.trim(),

                manufacturer:
                    document.getElementById(
                        "equipmentManufacturer"
                    ).value.trim(),

                model:
                    document.getElementById(
                        "equipmentModel"
                    ).value.trim(),

                serial_number:
                    document.getElementById(
                        "equipmentSerialNumber"
                    ).value.trim(),

                location:
                    document.getElementById(
                        "equipmentLocation"
                    ).value.trim(),

                installation_date:
                    document.getElementById(
                        "equipmentInstallationDate"
                    ).value,

                status:
                    document.getElementById(
                        "equipmentStatus"
                    ).value

            };


            try {

                const url = editId
                    ? `${API_URL}/equipment/${encodeURIComponent(editId)}`
                    : `${API_URL}/equipment`;


                const method =
                    editId ? "PUT" : "POST";


                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    equipment
                                )
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Equipment save failed."
                    );

                }


                closeEquipmentForm();


                showMessage(
                    editId
                        ? "Equipment updated successfully."
                        : "Equipment registered successfully."
                );


                await loadEquipment();

                await loadDashboard();


            } catch (error) {

                console.error(
                    "Equipment save error:",
                    error
                );

                showMessage(
                    "Equipment error: " +
                    error.message
                );

            }

        }
    );

}


// ==========================================================
// EDIT EQUIPMENT
// ==========================================================

function editEquipment(equipmentId) {

    const equipment =
        equipmentData.find(
            item =>
                item.equipment_id === equipmentId
        );


    if (!equipment) {

        showMessage(
            "Equipment not found."
        );

        return;
    }


    document.getElementById(
        "equipmentModalTitle"
    ).textContent =
        "Edit Equipment";


    document.getElementById(
        "editEquipmentId"
    ).value =
        equipment.equipment_id || "";


    document.getElementById(
        "equipmentName"
    ).value =
        equipment.name || "";


    document.getElementById(
        "equipmentCategory"
    ).value =
        equipment.category || "";


    document.getElementById(
        "equipmentManufacturer"
    ).value =
        equipment.manufacturer || "";


    document.getElementById(
        "equipmentModel"
    ).value =
        equipment.model || "";


    document.getElementById(
        "equipmentSerialNumber"
    ).value =
        equipment.serial_number || "";


    document.getElementById(
        "equipmentLocation"
    ).value =
        equipment.location || "";


    document.getElementById(
        "equipmentInstallationDate"
    ).value =
        equipment.installation_date || "";


    document.getElementById(
        "equipmentStatus"
    ).value =
        equipment.status || "Active";


    document.getElementById(
        "equipmentModal"
    ).style.display =
        "flex";

}


// ==========================================================
// DELETE EQUIPMENT
// ==========================================================

async function deleteEquipment(
    equipmentId
) {

    const confirmed =
        confirm(
            `Delete equipment ${equipmentId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/equipment/${encodeURIComponent(
                    equipmentId
                )}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Equipment deletion failed."
            );

        }


        showMessage(
            "Equipment deleted successfully."
        );


        await loadEquipment();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Delete equipment error:",
            error
        );

        showMessage(
            "Delete error: " +
            error.message
        );

    }

}


// ==========================================================
// SEARCH EQUIPMENT
// ==========================================================

function searchEquipment() {

    const searchInput =
        document.getElementById(
            "equipmentSearch"
        );


    if (!searchInput) {
        return;
    }


    const searchValue =
        searchInput.value
            .toLowerCase()
            .trim();


    const filtered =
        equipmentData.filter(item => {

            return (

                String(
                    item.equipment_id || ""
                )
                .toLowerCase()
                .includes(searchValue)

                ||

                String(
                    item.name || ""
                )
                .toLowerCase()
                .includes(searchValue)

                ||

                String(
                    item.category || ""
                )
                .toLowerCase()
                .includes(searchValue)

                ||

                String(
                    item.manufacturer || ""
                )
                .toLowerCase()
                .includes(searchValue)

                ||

                String(
                    item.location || ""
                )
                .toLowerCase()
                .includes(searchValue)

            );

        });


    renderEquipment(filtered);

}


// ==========================================================
// FILTER EQUIPMENT BY STATUS
// ==========================================================

function filterEquipment() {

    const filter =
        document.getElementById(
            "equipmentStatusFilter"
        );


    if (!filter) {
        return;
    }


    const status =
        filter.value;


    if (!status) {

        renderEquipment(
            equipmentData
        );

        return;
    }


    const filtered =
        equipmentData.filter(
            item =>
                (item.status || "Active") === status
        );


    renderEquipment(
        filtered
    );

}


// ==========================================================
// GENERATE EQUIPMENT ID
// ==========================================================

function generateEquipmentId() {

    return (
        "EQ-" +
        Date.now()
            .toString()
            .slice(-8)
    );

}


// ==========================================================
// HTML SAFETY
// ==========================================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeJs(value) {

    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );

}


// ==========================================================
// LOAD EQUIPMENT
// ==========================================================

async function loadEquipment() {

    const tableBody = document.getElementById("equipmentTableBody");

    try {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">Loading equipment...</td>
            </tr>
        `;

        const response = await fetch(`${API_URL}/equipment`);

        if (!response.ok) {
            throw new Error("Failed to load equipment");
        }

        equipmentData = await response.json();

        renderEquipment(equipmentData);

    } catch (error) {

        console.error("Equipment loading error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Unable to load equipment.
                </td>
            </tr>
        `;
    }
}


// ==========================================================
// RENDER EQUIPMENT
// ==========================================================

function renderEquipment(equipmentList) {

    const tableBody =
        document.getElementById("equipmentTableBody");

    if (!equipmentList || equipmentList.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    No equipment found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = equipmentList.map(item => `

        <tr>

            <td>${escapeHtml(item.equipment_id || "")}</td>

            <td>${escapeHtml(item.name || "")}</td>

            <td>${escapeHtml(item.category || "")}</td>

            <td>${escapeHtml(item.manufacturer || "-")}</td>

            <td>${escapeHtml(item.model || "-")}</td>

            <td>${escapeHtml(item.location || "")}</td>

            <td>${escapeHtml(item.status || "")}</td>

            <td>

                <button
                    class="action-btn edit-btn"
                    onclick="editEquipment('${escapeJs(item.equipment_id)}')"
                >
                    Edit
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteEquipment('${escapeJs(item.equipment_id)}')"
                >
                    Delete
                </button>

            </td>

        </tr>

    `).join("");
}


// ==========================================================
// OPEN FORM
// ==========================================================

function openEquipmentForm() {

    document.getElementById("equipmentModal").style.display = "flex";

    document.getElementById("equipmentModalTitle").textContent =
        "Add Equipment";

    document.getElementById("equipmentForm").reset();

    document.getElementById("editEquipmentId").value = "";

}


// ==========================================================
// CLOSE FORM
// ==========================================================

function closeEquipmentForm() {

    document.getElementById("equipmentModal").style.display = "none";

}


// ==========================================================
// ADD / UPDATE EQUIPMENT
// ==========================================================

document
    .getElementById("equipmentForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const editId =
            document.getElementById("editEquipmentId").value;

        const equipment = {

            equipment_id: editId ||
                generateEquipmentId(),

            name:
                document.getElementById("equipmentName").value.trim(),

            category:
                document.getElementById("equipmentCategory").value.trim(),

            manufacturer:
                document.getElementById("equipmentManufacturer").value.trim(),

            model:
                document.getElementById("equipmentModel").value.trim(),

            serial_number:
                document.getElementById("equipmentSerialNumber").value.trim(),

            location:
                document.getElementById("equipmentLocation").value.trim(),

            installation_date:
                document.getElementById("equipmentInstallationDate").value,

            status:
                document.getElementById("equipmentStatus").value

        };


        try {

            let response;

            if (editId) {

                // UPDATE
                response = await fetch(
                    `${API_URL}/equipment/${encodeURIComponent(editId)}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(equipment)
                    }
                );

            } else {

                // CREATE
                response = await fetch(
                    `${API_URL}/equipment`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(equipment)
                    }
                );
            }


            if (!response.ok) {

                const errorText = await response.text();

                throw new Error(errorText);
            }


            document.getElementById("equipmentMessage").textContent =
                editId
                    ? "Equipment updated successfully."
                    : "Equipment added successfully.";

            closeEquipmentForm();

            await loadEquipment();

        } catch (error) {

            console.error("Equipment save error:", error);

            document.getElementById("equipmentMessage").textContent =
                "Failed to save equipment.";
        }

    });


// ==========================================================
// EDIT EQUIPMENT
// ==========================================================

function editEquipment(equipmentId) {

    const equipment = equipmentData.find(
        item => item.equipment_id === equipmentId
    );

    if (!equipment) {
        alert("Equipment not found.");
        return;
    }


    document.getElementById("equipmentModalTitle").textContent =
        "Edit Equipment";


    document.getElementById("editEquipmentId").value =
        equipment.equipment_id || "";

    document.getElementById("equipmentName").value =
        equipment.name || "";

    document.getElementById("equipmentCategory").value =
        equipment.category || "";

    document.getElementById("equipmentManufacturer").value =
        equipment.manufacturer || "";

    document.getElementById("equipmentModel").value =
        equipment.model || "";

    document.getElementById("equipmentSerialNumber").value =
        equipment.serial_number || "";

    document.getElementById("equipmentLocation").value =
        equipment.location || "";

    document.getElementById("equipmentInstallationDate").value =
        equipment.installation_date || "";

    document.getElementById("equipmentStatus").value =
        equipment.status || "Active";


    document.getElementById("equipmentModal").style.display =
        "flex";
}


// ==========================================================
// DELETE EQUIPMENT
// ==========================================================

async function deleteEquipment(equipmentId) {

    const confirmed = confirm(
        "Are you sure you want to delete this equipment?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/equipment/${encodeURIComponent(equipmentId)}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(errorText);
        }


        await loadEquipment();

        alert("Equipment deleted successfully.");

    } catch (error) {

        console.error("Delete error:", error);

        alert("Failed to delete equipment.");
    }
}


// ==========================================================
// SEARCH EQUIPMENT
// ==========================================================

function searchEquipment() {

    const searchValue =
        document.getElementById("equipmentSearch")
            .value
            .toLowerCase()
            .trim();


    const filtered = equipmentData.filter(item => {

        return (

            (item.equipment_id || "")
                .toLowerCase()
                .includes(searchValue)

            ||

            (item.name || "")
                .toLowerCase()
                .includes(searchValue)

            ||

            (item.category || "")
                .toLowerCase()
                .includes(searchValue)

            ||

            (item.manufacturer || "")
                .toLowerCase()
                .includes(searchValue)

            ||

            (item.location || "")
                .toLowerCase()
                .includes(searchValue)

        );

    });


    renderEquipment(filtered);
}


// ==========================================================
// FILTER BY STATUS
// ==========================================================

function filterEquipment() {

    const status =
        document.getElementById("equipmentStatusFilter").value;


    if (!status) {

        renderEquipment(equipmentData);

        return;
    }


    const filtered =
        equipmentData.filter(
            item => item.status === status
        );


    renderEquipment(filtered);
}


// ==========================================================
// GENERATE EQUIPMENT ID
// ==========================================================

function generateEquipmentId() {

    return "EQ-" +
        Date.now().toString().slice(-8);
}


// ==========================================================
// HTML SAFETY
// ==========================================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeJs(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ==========================================================
// INITIAL LOAD
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadEquipment();

    }
);

// ==========================================================
// MAINTENANCE ALERT — VIEW EQUIPMENT
// ==========================================================

function viewMaintenanceEquipment(equipmentId) {

    console.log(
        "Viewing maintenance equipment:",
        equipmentId
    );

    const selector =
        document.getElementById(
            "equipment-health-select"
        );

    if (!selector) {

        console.error(
            "Equipment health selector not found."
        );

        return;
    }

    // Select the equipment
    selector.value = equipmentId;

    // Trigger the health lookup
    selector.dispatchEvent(
        new Event("change")
    );

    // Find the Equipment Health card
    const healthCard =
        selector.closest(".card");

    if (healthCard) {

        healthCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    } else {

        // Fallback
        selector.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

// ==========================================================
// EQUIPMENT HEALTH — v3.2.1
// ==========================================================

async function loadEquipmentHealth() {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );

    if (!selector) {
        return;
    }


    selector.onchange =
        async function() {

            const equipmentId =
                this.value;


            const healthElement =
                document.getElementById(
                    "equipment-health"
                );

            const statusElement =
                document.getElementById(
                    "equipment-health-status"
                );


            if (!equipmentId) {

                if (healthElement) {
                    healthElement.textContent =
                        "--";
                }

                if (statusElement) {
                    statusElement.textContent =
                        "Select equipment to view health";
                }

                return;
            }


            try {

                const response =
                    await fetch(
                        `${API_URL}/equipment/${encodeURIComponent(
                            equipmentId
                        )}/health`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Health request failed."
                    );

                }


                if (healthElement) {

                    healthElement.textContent =
                        `${data.health_score}%`;

                }


                if (statusElement) {

                    statusElement.textContent =
                        `${data.status} — ${data.equipment_id}`;

                }


            } catch (error) {

                console.error(
                    "Equipment health error:",
                    error
                );


                if (healthElement) {
                    healthElement.textContent =
                        "--";
                }


                if (statusElement) {
                    statusElement.textContent =
                        "Could not load equipment health.";
                }

            }

        };

}

// ==========================================================
// AI DIAGNOSIS
// ==========================================================

async function loadDiagnosisEquipment() {

    try {

        const response = await fetch(
            `${API_URL}/equipment`
        );

        if (!response.ok) {
            throw new Error(
                `Equipment request failed: ${response.status}`
            );
        }

        const equipment = await response.json();

        const selector =
            document.getElementById(
                "diagnosis-equipment"
            );

        if (!selector) {
            return;
        }

        selector.innerHTML =
            `<option value="">Select Equipment</option>`;

        equipment.forEach(item => {

            const option =
                document.createElement("option");

            option.value =
                item.equipment_id;

            option.textContent =
                `${item.equipment_id} — ${item.name}`;

            selector.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Diagnosis equipment loading error:",
            error
        );

    }

}

// ==========================================================
// AI DIAGNOSIS — v3.4.3
// ==========================================================

async function runDiagnosis() {

    const equipment =
        document.getElementById("diagnosis-equipment").value;

    const fault =
        document.getElementById("diagnosis-fault").value;

    const result =
        document.getElementById("diagnosis-result");


    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (!equipment || !fault) {

        result.innerHTML = `
            <div class="alert alert-warning">
                ⚠️ Please select equipment and a fault.
            </div>
        `;

        return;
    }


    // ------------------------------------------------------
    // SHOW LOADING
    // ------------------------------------------------------

    result.innerHTML = `
        <div class="alert alert-info">
            🔄 FuElectric-AI is analyzing the equipment...
        </div>
    `;


    try {

        // --------------------------------------------------
        // SEND REQUEST TO FASTAPI
        // --------------------------------------------------

        const response = await fetch(
            `${API_URL}/diagnose`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    equipment: equipment,
                    fault: fault
                })
            }
        );


        const data = await response.json();


        // --------------------------------------------------
        // HANDLE API ERROR
        // --------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Diagnosis failed."
            );

        }


        // --------------------------------------------------
       // DISPLAY REAL FU-ELECTRIC-AI RESPONSE
      // --------------------------------------------------

result.innerHTML = `

    <div class="diagnosis-success">

        <h3>
            🤖 FuElectric-AI Diagnosis
        </h3>

        <p>
            <strong>Equipment ID:</strong>
            ${data.equipment_id}
        </p>

        <p>
            <strong>Equipment:</strong>
            ${data.equipment_name}
        </p>

        <p>
            <strong>Reported Fault:</strong>
            ${data.fault}
        </p>

        <p>
            <strong>Fault ID:</strong>
            ${data.id}
        </p>

        <p>
            <strong>Category:</strong>
            ${data.category}
        </p>

        <p>
            <strong>Severity:</strong>
            ${data.severity}
        </p>

        <p>
            <strong>Risk Level:</strong>
            ${data.risk_level}
        </p>

        <p>
            <strong>Emergency:</strong>
            ${data.is_emergency ? "🚨 Yes" : "✅ No"}
        </p>


        <h4>🔎 Possible Causes</h4>

        <ul>
            ${
                Array.isArray(data.causes)
                    ? data.causes
                        .map(cause => `<li>${cause}</li>`)
                        .join("")
                    : "<li>No causes provided.</li>"
            }
        </ul>


        <h4>🛠️ Recommendations</h4>

        <ul>
            ${
                Array.isArray(data.recommendations)
                    ? data.recommendations
                        .map(item => `<li>${item}</li>`)
                        .join("")
                    : "<li>No recommendations provided.</li>"
            }
        </ul>


        <p>
            <strong>Estimated Repair Time:</strong>
            ${data.repair_time || "Not provided"}
        </p>


        <h4>🔧 Required Tools</h4>

        <ul>
            ${
                Array.isArray(data.tools)
                    ? data.tools
                        .map(tool => `<li>${tool}</li>`)
                        .join("")
                    : "<li>No tools listed.</li>"
            }
            </ul>

    </div>
    <button
    class="primary-btn"
    onclick="createWorkOrderFromDiagnosis(
        '${escapeJs(data.equipment_id)}',
        '${escapeJs(data.id || "")}',
        '${escapeJs(data.fault || "")}',
        '${escapeJs(
            Array.isArray(data.recommendations)
                ? data.recommendations.join("; ")
                : ""
        )}'
    )"
>
    🛠️ Create Work Order
</button>
`;

    } catch (error) {

        console.error(
            "Diagnosis error:",
            error
        );

        result.innerHTML = `
            <div class="alert alert-danger">
                ❌ Diagnosis failed:
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}

// ==========================================================
// CREATE WORK ORDER FROM AI DIAGNOSIS — v3.4.0
// ==========================================================

function createWorkOrderFromDiagnosis(
    equipmentId,
    faultId,
    fault,
    recommendation
) {

    const equipmentInput =
        document.getElementById(
            "work-order-equipment"
        );

    const descriptionInput =
        document.getElementById(
            "work-order-description"
        );

    const typeInput =
        document.getElementById(
            "work-order-type"
        );

    const priorityInput =
        document.getElementById(
            "work-order-priority"
        );

    if (!equipmentInput ||
        !descriptionInput ||
        !typeInput ||
        !priorityInput) {

        showMessage(
            "Work Order form not found."
        );

        return;
    }

    // Populate equipment
    equipmentInput.value = equipmentId;

    // Work type
    typeInput.value = "Repair";

    // Determine priority from diagnosis
    priorityInput.value = "Medium";

    // Build description
    descriptionInput.value =
        `AI Diagnosis ${faultId || ""}: ${fault || ""}. ` +
        `Recommended action: ${recommendation || "Inspect equipment."}`;

    // Scroll to Work Order section
    const workOrderSection =
        document.querySelector(
            ".work-order-section"
        );

    if (workOrderSection) {

        workOrderSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    showMessage(
        "AI diagnosis transferred to Work Order."
    );
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
            ).value.trim() ||
            generateWorkOrderId(),

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

        loadEquipmentHealth();

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

// ==========================================================
// GENERATE WORK ORDER ID — v3.4.0
// ==========================================================

function generateWorkOrderId() {

    return (
        "WO-" +
        Date.now()
            .toString()
            .slice(-8)
    );

}

// ==========================================================
// LOAD WORK ORDERS — v3.4.2
// ==========================================================

async function loadWorkOrders() {

    try {

        const response = await fetch(
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
                    <strong>Completed:</strong>
                    ${order.completed_date ?? "Not completed"}
                </p>


                <!-- STATUS -->

                <div class="work-order-status-control">

                    <strong>Status:</strong>

                    <select
                        onchange="updateWorkOrderStatus(
                            '${escapeJs(order.work_order_id)}',
                            this.value
                        )"
                    >

                        <option
                            value="Open"
                            ${order.status === "Open" ? "selected" : ""}
                        >
                            Open
                        </option>

                        <option
                            value="In Progress"
                            ${order.status === "In Progress" ? "selected" : ""}
                        >
                            In Progress
                        </option>

                        <option
                            value="Completed"
                            ${order.status === "Completed" ? "selected" : ""}
                        >
                            Completed
                        </option>

                        <option
                            value="Cancelled"
                            ${order.status === "Cancelled" ? "selected" : ""}
                        >
                            Cancelled
                        </option>

                    </select>

                </div>


                <!-- ACTIONS -->

                <div class="work-order-actions">

                    <button
                        onclick="deleteWorkOrder(
                            '${escapeJs(order.work_order_id)}'
                        )"
                    >
                        🗑️ Delete
                    </button>

                </div>

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

// ==========================================================
// UPDATE WORK ORDER STATUS — v3.4.2
// ==========================================================

async function updateWorkOrderStatus(
    workOrderId,
    status
) {

    try {

        const response = await fetch(
            `${API_URL}/work-orders/${encodeURIComponent(
                workOrderId
            )}/status`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    status: status
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Status update failed."
            );

        }


        console.log(
            "Work Order status updated:",
            data
        );


        showMessage(
            `Work Order ${workOrderId} is now ${status}.`
        );


        await loadWorkOrders();

        await loadWorkOrderStatistics();

        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Status update error:",
            error
        );

        showMessage(
            "Status update error: " +
            error.message
        );

        await loadWorkOrders();

    }

}

// ==========================================================
// DELETE WORK ORDER — v3.4.2
// ==========================================================

async function deleteWorkOrder(
    workOrderId
) {

    const confirmed =
        confirm(
            `Delete Work Order ${workOrderId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/${encodeURIComponent(
                    workOrderId
                )}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Work Order deletion failed."
            );

        }


        showMessage(
            `Work Order ${workOrderId} deleted successfully.`
        );


        await loadWorkOrders();

        await loadWorkOrderStatistics();

        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Work Order deletion error:",
            error
        );

        showMessage(
            "Delete error: " +
            error.message
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

        loadEquipmentHealth();

        loadDiagnosisEquipment();

        loadMaintenanceAlerts();

    }
);