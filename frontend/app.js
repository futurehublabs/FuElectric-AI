const API_URL = "http://127.0.0.1:8000";


// ==========================================================
// GLOBAL STATE
// ==========================================================

let equipmentData = [];
let cameraStream = null;
let barcodeDetector = null;
let cameraScanning = false;


// ==========================================================
// MESSAGE
// ==========================================================

function showMessage(message) {

    const messageElement =
        document.getElementById("message");

    if (messageElement) {
        messageElement.textContent = message;
    }

}


// ==========================================================
// HTML SAFETY
// ==========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

// ==========================================================
// API JSON HELPER
// ==========================================================

async function fetchJson(endpoint) {

    const response =
        await fetch(
            `${API_URL}${endpoint}`
        );

    if (!response.ok) {

        throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
        );

    }

    return await response.json();

}


function escapeJs(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");

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
// DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        const response =
            await fetch(`${API_URL}/dashboard`);

        if (!response.ok) {

            throw new Error(
                `Dashboard request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Dashboard data:",
            data
        );


        const equipmentCount =
            document.getElementById(
                "equipment-count"
            );

        if (equipmentCount) {

            equipmentCount.textContent =
                data.total_equipment ?? 0;

        }


        const activeEquipment =
            document.getElementById(
                "active-equipment"
            );

        if (activeEquipment) {

            activeEquipment.textContent =
                data.active_equipment ?? 0;

        }


        const maintenanceCount =
            document.getElementById(
                "maintenance-count"
            );

        if (maintenanceCount) {

            maintenanceCount.textContent =
                data.maintenance_records ?? 0;

        }


        const technicianCount =
            document.getElementById(
                "technician-count"
            );

        if (technicianCount) {

            technicianCount.textContent =
                data.technicians ?? 0;

        }


        const pendingRepairs =
            document.getElementById(
                "pending-repairs"
            );

        if (pendingRepairs) {

            pendingRepairs.textContent =
                data.pending_repairs ?? 0;

        }


        const completedRepairs =
            document.getElementById(
                "completed-repairs"
            );

        if (completedRepairs) {

            completedRepairs.textContent =
                data.completed_repairs ?? 0;

        }

    }

    catch (error) {

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
// MAINTENANCE INTELLIGENCE
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

    if (!countElement || !listElement) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/maintenance/alerts`
            );

        if (!response.ok) {

            throw new Error(
                `Maintenance alert request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        countElement.textContent =
            data.total_alerts ?? 0;


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
            data.alerts
                .map(alert => {

                    const maintenanceStatus =
                        alert.last_maintenance
                            ? `Last maintenance: ${escapeHtml(alert.last_maintenance)}`
                            : "⚠️ No maintenance record";

                    return `
                        <div class="maintenance-alert-card">

                            <h3>
                                ⚠️ ${escapeHtml(alert.name)}
                            </h3>

                            <p>
                                <strong>Equipment ID:</strong>
                                ${escapeHtml(alert.equipment_id)}
                            </p>

                            <p>
                                <strong>Status:</strong>
                                ${escapeHtml(alert.status)}
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
                                onclick="viewMaintenanceEquipment('${escapeJs(alert.equipment_id)}')"
                            >
                                🔍 View Equipment
                            </button>

                        </div>
                    `;

                })
                .join("");

    }

    catch (error) {

        console.error(
            "Maintenance alert error:",
            error
        );

        countElement.textContent = "--";

        listElement.innerHTML = `
            <div class="maintenance-error">
                ❌ Unable to load maintenance alerts.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}


// ==========================================================
// EQUIPMENT MANAGEMENT
// ==========================================================

async function loadEquipment() {

    const tableBody =
        document.getElementById(
            "equipmentTableBody"
        );

    try {

        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        Loading equipment...
                    </td>
                </tr>
            `;

        }


        const response =
            await fetch(
                `${API_URL}/equipment`
            );

        if (!response.ok) {

            throw new Error(
                `Equipment request failed: ${response.status}`
            );

        }


        const equipment =
            await response.json();

        equipmentData =
            Array.isArray(equipment)
                ? equipment
                : [];


        renderEquipment(
            equipmentData
        );


        populateEquipmentSelector(
            "equipment-health-select",
            equipmentData
        );


        populateEquipmentSelector(
            "diagnosis-equipment",
            equipmentData
        );

        populateEquipmentSelector(
            "health-trend-equipment-select",
            equipmentData
);

    }

        

    catch (error) {

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
// RENDER EQUIPMENT
// ==========================================================

function renderEquipment(equipmentList) {

    const tableBody =
        document.getElementById(
            "equipmentTableBody"
        );

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
        equipmentList
            .map(item => {

                return `
                    <tr>

                        <td>
                            ${escapeHtml(item.equipment_id)}
                        </td>

                        <td>
                            ${escapeHtml(item.name)}
                        </td>

                        <td>
                            ${escapeHtml(item.category)}
                        </td>

                        <td>
                            ${escapeHtml(item.manufacturer || "-")}
                        </td>

                        <td>
                            ${escapeHtml(item.model || "-")}
                        </td>

                        <td>
                            ${escapeHtml(item.location)}
                        </td>

                        <td>
                            ${escapeHtml(item.status || "Active")}
                        </td>

                        <td>

                            <button
                                class="action-btn edit-btn"
                                onclick="editEquipment('${escapeJs(item.equipment_id)}')"
                            >
                                ✏️ Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteEquipment('${escapeJs(item.equipment_id)}')"
                            >
                                🗑️ Delete
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");

}


// ==========================================================
// EQUIPMENT SELECTOR
// ==========================================================

function populateEquipmentSelector(
    selectorId,
    equipment
) {

    const selector =
        document.getElementById(
            selectorId
        );

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
            document.createElement(
                "option"
            );

        option.value =
            item.equipment_id;

        option.textContent =
            `${item.equipment_id} — ${item.name}`;

        selector.appendChild(
            option
        );

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


    modal.style.display =
        "flex";

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

        modal.style.display =
            "none";

    }

}


// ==========================================================
// ADD / UPDATE EQUIPMENT
// ==========================================================

async function saveEquipment(event) {

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

        const url =
            editId
                ? `${API_URL}/equipment/${encodeURIComponent(editId)}`
                : `${API_URL}/equipment`;

        const method =
            editId
                ? "PUT"
                : "POST";


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


        Equipment();

        await loadDashboard();

    }

    catch (error) {

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


// ==========================================================
// EDIT EQUIPMENT
// ==========================================================

function editEquipment(
    equipmentId
) {

    const equipment =
        equipmentData.find(
            item =>
                item.equipment_id ===
                equipmentId
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
                `${API_URL}/equipment/${encodeURIComponent(equipmentId)}`,
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

    }

    catch (error) {

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


    renderEquipment(
        filtered
    );

}


// ==========================================================
// FILTER EQUIPMENT
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
                (item.status || "Active") ===
                status
        );


    renderEquipment(
        filtered
    );

}


// ==========================================================
// EQUIPMENT HEALTH
// ==========================================================

function loadEquipmentHealth() {

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
                        `${API_URL}/equipment/${encodeURIComponent(equipmentId)}/health`
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

            }

            catch (error) {

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
// MAINTENANCE ALERT → EQUIPMENT
// ==========================================================

function viewMaintenanceEquipment(
    equipmentId
) {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );

    if (!selector) {
        return;
    }


    selector.value =
        equipmentId;


    selector.dispatchEvent(
        new Event("change")
    );


    selector.closest(".card")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

}


// ==========================================================
// AI DIAGNOSIS EQUIPMENT
// ==========================================================

async function loadDiagnosisEquipment() {

    try {

        const response =
            await fetch(
                `${API_URL}/equipment`
            );


        if (!response.ok) {

            throw new Error(
                `Equipment request failed: ${response.status}`
            );

        }


        const equipment =
            await response.json();


        populateEquipmentSelector(
            "diagnosis-equipment",
            equipment
        );

    }

    catch (error) {

        console.error(
            "Diagnosis equipment loading error:",
            error
        );

    }

}


// ==========================================================
// AI DIAGNOSIS
// ==========================================================

async function runDiagnosis() {

    const equipment =
        document.getElementById(
            "diagnosis-equipment"
        ).value;


    const fault =
        document.getElementById(
            "diagnosis-fault"
        ).value;


    const result =
        document.getElementById(
            "diagnosis-result"
        );


    if (!equipment || !fault) {

        result.innerHTML = `
            <div class="alert alert-warning">
                ⚠️ Please select equipment and a fault.
            </div>
        `;

        return;
    }


    result.innerHTML = `
        <div class="alert alert-info">
            🔄 FuElectric-AI is analyzing the equipment...
        </div>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/diagnose`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            equipment:
                                equipment,

                            fault:
                                fault
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Diagnosis failed."
            );

        }


        result.innerHTML = `

            <div class="diagnosis-success">

                <h3>
                    🤖 FuElectric-AI Diagnosis
                </h3>

                <p>
                    <strong>Equipment ID:</strong>
                    ${escapeHtml(data.equipment_id)}
                </p>

                <p>
                    <strong>Equipment:</strong>
                    ${escapeHtml(data.equipment_name)}
                </p>

                <p>
                    <strong>Reported Fault:</strong>
                    ${escapeHtml(data.fault)}
                </p>

                <p>
                    <strong>Fault ID:</strong>
                    ${escapeHtml(data.id)}
                </p>

                <p>
                    <strong>Category:</strong>
                    ${escapeHtml(data.category)}
                </p>

                <p>
                    <strong>Severity:</strong>
                    ${escapeHtml(data.severity)}
                </p>

                <p>
                    <strong>Risk Level:</strong>
                    ${escapeHtml(data.risk_level)}
                </p>

                <p>
                    <strong>Emergency:</strong>
                    ${data.is_emergency
                        ? "🚨 Yes"
                        : "✅ No"}
                </p>


                <h4>
                    🔎 Possible Causes
                </h4>

                <ul>

                    ${
                        Array.isArray(data.causes)
                            ? data.causes
                                .map(
                                    cause =>
                                        `<li>${escapeHtml(cause)}</li>`
                                )
                                .join("")
                            : "<li>No causes provided.</li>"
                    }

                </ul>


                <h4>
                    🛠️ Recommendations
                </h4>

                <ul>

                    ${
                        Array.isArray(data.recommendations)
                            ? data.recommendations
                                .map(
                                    item =>
                                        `<li>${escapeHtml(item)}</li>`
                                )
                                .join("")
                            : "<li>No recommendations provided.</li>"
                    }

                </ul>


                <p>
                    <strong>Estimated Repair Time:</strong>
                    ${escapeHtml(
                        data.repair_time ||
                        "Not provided"
                    )}
                </p>


                <h4>
                    🔧 Required Tools
                </h4>

                <ul>

                    ${
                        Array.isArray(data.tools)
                            ? data.tools
                                .map(
                                    tool =>
                                        `<li>${escapeHtml(tool)}</li>`
                                )
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

    }

    catch (error) {

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
// DIAGNOSIS → WORK ORDER
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


    if (
        !equipmentInput ||
        !descriptionInput ||
        !typeInput ||
        !priorityInput
    ) {

        showMessage(
            "Work Order form not found."
        );

        return;
    }


    equipmentInput.value =
        equipmentId;


    typeInput.value =
        "Repair";


    priorityInput.value =
        "Medium";


    descriptionInput.value =
        `AI Diagnosis ${faultId || ""}: ${fault || ""}. ` +
        `Recommended action: ${
            recommendation ||
            "Inspect equipment."
        }`;


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
// CAMERA SCANNER — v3.4.5
// ==========================================================


// ----------------------------------------------------------
// CAMERA STATUS
// ----------------------------------------------------------

function setCameraStatus(
    message
) {

    const status =
        document.getElementById(
            "camera-status"
        );

    if (status) {

        status.textContent =
            message;

    }

}


// ----------------------------------------------------------
// START CAMERA
// ----------------------------------------------------------

async function startCamera() {

    const video =
        document.getElementById(
            "camera-preview"
        );


    if (!video) {

        console.error(
            "Camera preview element not found."
        );

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setCameraStatus(
            "❌ Camera access is not supported by this browser."
        );

        return;
    }


    try {

        await stopCamera();


        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        ideal: "environment"
                    }
                },

                audio: false
            });


        video.srcObject =
            cameraStream;


        cameraScanning =
            true;


        setCameraStatus(
            "🟢 Camera active. Position the Equipment ID inside the frame."
        );


        if (
            "BarcodeDetector" in window
        ) {

            barcodeDetector =
                new BarcodeDetector({
                    formats: [
                        "qr_code",
                        "code_128",
                        "code_39",
                        "code_93",
                        "ean_13",
                        "ean_8",
                        "upc_a",
                        "upc_e"
                    ]
                });


            scanCamera();

        }

        else {

            setCameraStatus(
                "🟢 Camera active. Automatic barcode scanning is not supported in this browser."
            );

        }

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraStream =
            null;


        cameraScanning =
            false;


        if (
            error.name ===
            "NotAllowedError"
        ) {

            setCameraStatus(
                "❌ Camera permission was denied."
            );

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            setCameraStatus(
                "❌ No camera was found."
            );

        }

        else {

            setCameraStatus(
                "❌ Unable to start camera."
            );

        }

    }

}


// ----------------------------------------------------------
// STOP CAMERA
// ----------------------------------------------------------

function stopCamera() {

    cameraScanning =
        false;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {

                track.stop();

            });


        cameraStream =
            null;

    }


    const video =
        document.getElementById(
            "camera-preview"
        );


    if (video) {

        video.srcObject =
            null;

    }


    setCameraStatus(
        "Camera is not active."
    );

}


// ----------------------------------------------------------
// SCAN CAMERA
// ----------------------------------------------------------

async function scanCamera() {

    const video =
        document.getElementById(
            "camera-preview"
        );


    if (!video) {
        return;
    }


    if (!cameraStream) {

        setCameraStatus(
            "⚠️ Start the camera first."
        );

        return;
    }


    if (
        !("BarcodeDetector" in window)
    ) {

        setCameraStatus(
            "⚠️ Automatic barcode scanning is not supported by this browser. Use manual Equipment ID entry."
        );

        return;
    }


    if (!barcodeDetector) {

        try {

            barcodeDetector =
                new BarcodeDetector({
                    formats: [
                        "qr_code",
                        "code_128",
                        "code_39",
                        "code_93",
                        "ean_13",
                        "ean_8",
                        "upc_a",
                        "upc_e"
                    ]
                });

        }

        catch (error) {

            console.error(
                "Barcode detector error:",
                error
            );

            setCameraStatus(
                "❌ Barcode scanner could not be initialized."
            );

            return;
        }

    }


    try {

        const barcodes =
            await barcodeDetector.detect(
                video
            );


        if (
            barcodes &&
            barcodes.length > 0
        ) {

            const detectedValue =
                barcodes[0].rawValue;


            console.log(
                "Detected Equipment ID:",
                detectedValue
            );


            const input =
                document.getElementById(
                    "scanner-equipment-id"
                );


            if (input) {

                input.value =
                    detectedValue;

            }


            setCameraStatus(
                `✅ Equipment ID detected: ${detectedValue}`
            );


            await scanEquipment(
                detectedValue
            );


            return;

        }


        if (cameraScanning) {

            requestAnimationFrame(
                scanCamera
            );

        }

    }

    catch (error) {

        console.error(
            "Camera scanning error:",
            error
        );


        if (cameraScanning) {

            requestAnimationFrame(
                scanCamera
            );

        }

    }

}


// ==========================================================
// MANUAL / CAMERA EQUIPMENT LOOKUP
// ==========================================================

async function scanEquipment(
    detectedEquipmentId = null
) {

    const input =
        document.getElementById(
            "scanner-equipment-id"
        );


    const result =
        document.getElementById(
            "scanner-result"
        );


    const equipmentId =
        detectedEquipmentId ||
        input?.value.trim();


    if (!equipmentId) {

        if (result) {

            result.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ Enter or scan an Equipment ID.
                </div>
            `;

        }

        return;
    }


    if (input) {

        input.value =
            equipmentId;

    }


    if (result) {

        result.innerHTML = `
            <div class="alert alert-info">
                🔍 Searching for equipment...
            </div>
        `;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/equipment/${encodeURIComponent(equipmentId)}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Equipment not found."
            );

        }


        if (result) {

            result.innerHTML = `

                <div class="scanner-success">

                    <h3>
                        ✅ Equipment Found
                    </h3>

                    <p>
                        <strong>Equipment ID:</strong>
                        ${escapeHtml(data.equipment_id)}
                    </p>

                    <p>
                        <strong>Name:</strong>
                        ${escapeHtml(data.name)}
                    </p>

                    <p>
                        <strong>Category:</strong>
                        ${escapeHtml(data.category)}
                    </p>

                    <p>
                        <strong>Manufacturer:</strong>
                        ${escapeHtml(data.manufacturer || "-")}
                    </p>

                    <p>
                        <strong>Model:</strong>
                        ${escapeHtml(data.model || "-")}
                    </p>

                    <p>
                        <strong>Serial Number:</strong>
                        ${escapeHtml(data.serial_number || "-")}
                    </p>

                    <p>
                        <strong>Location:</strong>
                        ${escapeHtml(data.location)}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(data.status || "Active")}
                    </p>

                    <div class="scanner-actions">

                        <button
                            type="button"
                            onclick="openScannedHealth('${escapeJs(data.equipment_id)}')"
                        >
                            ❤️ View Health
                        </button>

                        <button
                            type="button"
                            onclick="openScannedDiagnosis('${escapeJs(data.equipment_id)}')"
                        >
                            🤖 Diagnose
                        </button>

                    </div>

                </div>

            `;

        }


        stopCamera();


        showMessage(
            `Equipment ${equipmentId} found.`
        );

    }

    catch (error) {

        console.error(
            "Equipment scanner error:",
            error
        );


        if (result) {

            result.innerHTML = `
                <div class="alert alert-danger">

                    ❌ Equipment not found.

                    <br><br>

                    ${escapeHtml(error.message)}

                </div>
            `;

        }

    }

}


// ==========================================================
// SCANNER → EQUIPMENT HEALTH
// ==========================================================

function openScannedHealth(
    equipmentId
) {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    if (!selector) {
        return;
    }


    selector.value =
        equipmentId;


    selector.dispatchEvent(
        new Event("change")
    );


    selector.closest(".card")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

}


// ==========================================================
// SCANNER → AI DIAGNOSIS
// ==========================================================

function openScannedDiagnosis(
    equipmentId
) {

    const selector =
        document.getElementById(
            "diagnosis-equipment"
        );


    if (!selector) {
        return;
    }


    selector.value =
        equipmentId;


    const diagnosisSection =
        document.querySelector(
            ".diagnosis-section"
        );


    if (diagnosisSection) {

        diagnosisSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// ==========================================================
// WORK ORDER ID
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
// CREATE WORK ORDER
// ==========================================================

async function createWorkOrder() {

    const workOrderIdInput =
        document.getElementById(
            "work-order-id"
        );

    const equipmentInput =
        document.getElementById(
            "work-order-equipment"
        );

    const technicianInput =
        document.getElementById(
            "work-order-technician"
        );

    const typeInput =
        document.getElementById(
            "work-order-type"
        );

    const priorityInput =
        document.getElementById(
            "work-order-priority"
        );

    const descriptionInput =
        document.getElementById(
            "work-order-description"
        );

    const scheduledInput =
        document.getElementById(
            "work-order-scheduled"
        );

    const dueInput =
        document.getElementById(
            "work-order-due"
        );


    if (
        !equipmentInput ||
        !typeInput ||
        !priorityInput ||
        !descriptionInput
    ) {

        showMessage(
            "Work Order form is incomplete."
        );

        return;
    }


    const workOrderId =
        workOrderIdInput?.value.trim() ||
        generateWorkOrderId();


    const equipmentId =
        equipmentInput.value.trim();


    if (!equipmentId) {

        showMessage(
            "Please enter an Equipment ID."
        );

        return;
    }


    const workOrder = {

        work_order_id:
            workOrderId,

        equipment_id:
            equipmentId,

        technician_id:
            technicianInput?.value.trim() ||
            null,

        work_type:
            typeInput.value,

        priority:
            priorityInput.value,

        description:
            descriptionInput.value.trim(),

        scheduled_date:
            scheduledInput?.value ||
            null,

        due_date:
            dueInput?.value ||
            null

    };


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
                        JSON.stringify(
                            workOrder
                        )
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


        showMessage(
            `Work Order ${workOrderId} created successfully.`
        );


        if (workOrderIdInput) {
            workOrderIdInput.value = "";
        }


        descriptionInput.value = "";


        await loadWorkOrders();

        await loadWorkOrderStatistics();

        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Work Order creation error:",
            error
        );


        showMessage(
            "Work Order error: " +
            error.message
        );

    }

}


// ==========================================================
// LOAD WORK ORDERS
// ==========================================================

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


        const container =
    document.getElementById("wo-ai-insights");


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
                document.createElement(
                    "div"
                );


            card.className =
                "work-order-item";


            card.innerHTML = `

                <h3>
                    🛠️ ${escapeHtml(order.work_order_id)}
                </h3>

                <p>
                    <strong>Equipment:</strong>
                    ${escapeHtml(order.equipment_id ?? "N/A")}
                </p>

                <p>
                    <strong>Technician:</strong>
                    ${escapeHtml(order.technician_id ?? "Unassigned")}
                </p>

                <p>
                    <strong>Type:</strong>
                    ${escapeHtml(order.work_type ?? "N/A")}
                </p>

                <p>
                    <strong>Priority:</strong>
                    ${escapeHtml(order.priority ?? "N/A")}
                </p>

                <p>
                    <strong>Description:</strong>
                    ${escapeHtml(order.description ?? "N/A")}
                </p>

                <p>
                    <strong>Scheduled:</strong>
                    ${escapeHtml(order.scheduled_date ?? "N/A")}
                </p>

                <p>
                    <strong>Due:</strong>
                    ${escapeHtml(order.due_date ?? "N/A")}
                </p>

                <p>
                    <strong>Completed:</strong>
                    ${escapeHtml(order.completed_date ?? "Not completed")}
                </p>


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


            container.appendChild(
                card
            );

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
// UPDATE WORK ORDER STATUS
// ==========================================================

async function updateWorkOrderStatus(
    workOrderId,
    status
) {

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/${encodeURIComponent(workOrderId)}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status:
                                status
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
// DELETE WORK ORDER
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
                `${API_URL}/work-orders/${encodeURIComponent(workOrderId)}`,
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


// ==========================================================
// WORK ORDER STATISTICS
// ==========================================================

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
// WORK ORDER INTELLIGENCE — v3.5.0
// ==========================================================


// ----------------------------------------------------------
// TECHNICIAN WORKLOAD
// ----------------------------------------------------------

async function loadTechnicianWorkload() {

    const container =
        document.getElementById(
            "WO-workload"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "Loading technician workload...";

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/workload`
            );

        if (!response.ok) {

            throw new Error(
                `Workload request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const workload =
            data.workload || {};

        if (
            !workload ||
            Object.keys(workload).length === 0
        ) {

            container.innerHTML =
                "<p>No technician workload data available.</p>";

            return;
        }

        container.innerHTML = Object.entries(
            workload
        )
        .map(
            ([technician, count]) => `
                <div class="workload-item">

                    <strong>
                        🧑‍🔧 ${escapeHtml(technician)}
                    </strong>

                    <span>
                        ${escapeHtml(count)} Work Orders
                    </span>

                </div>
            `
        )
        .join("");

    }

    catch (error) {

        console.error(
            "Technician workload error:",
            error
        );

        container.innerHTML = `
            <div class="alert alert-danger">
                ❌ Unable to load technician workload.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}


// ----------------------------------------------------------
// OVERDUE WORK ORDERS
// ----------------------------------------------------------

async function loadOverdueWorkOrders() {

    const container =
        document.getElementById(
             "wo-overdue"
);

    if (!container) {
        return;
    }

    container.innerHTML =
        "Loading overdue work orders...";

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/overdue`
            );

        if (!response.ok) {

            throw new Error(
                `Overdue request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const workOrders =
            data.work_orders || [];

        if (workOrders.length === 0) {

            container.innerHTML = `
                <div class="maintenance-ok">
                    ✅ No overdue work orders.
                </div>
            `;

            return;
        }

        container.innerHTML =
            workOrders
                .map(order => {

                    return `
                        <div class="overdue-work-order">

                            <h3>
                                ⚠️
                                ${escapeHtml(
                                    order.work_order_id
                                )}
                            </h3>

                            <p>
                                <strong>Equipment:</strong>
                                ${escapeHtml(
                                    order.equipment_id || "N/A"
                                )}
                            </p>

                            <p>
                                <strong>Technician:</strong>
                                ${escapeHtml(
                                    order.technician_id ||
                                    "Unassigned"
                                )}
                            </p>

                            <p>
                                <strong>Priority:</strong>
                                ${escapeHtml(
                                    order.priority || "N/A"
                                )}
                            </p>

                            <p>
                                <strong>Due:</strong>
                                ${escapeHtml(
                                    order.due_date || "N/A"
                                )}
                            </p>

                            <p>
                                <strong>Status:</strong>
                                ${escapeHtml(
                                    order.status || "N/A"
                                )}
                            </p>

                        </div>
                    `;

                })
                .join("");

    }

    catch (error) {

        console.error(
            "Overdue Work Order error:",
            error
        );

        container.innerHTML = `
            <div class="alert alert-danger">
                ❌ Unable to load overdue Work Orders.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}


// ----------------------------------------------------------
// WORK ORDER PERFORMANCE
// ----------------------------------------------------------

async function loadWorkOrderPerformance() {


    const container =
        document.getElementById(
            "work-order-performance"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "Loading Work Order performance...";

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/performance`
            );

        if (!response.ok) {

            throw new Error(
                `Performance request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const performance =
            data.performance || {};

        if (
            !performance ||
            Object.keys(performance).length === 0
        ) {

            container.innerHTML =
                "<p>No performance data available.</p>";

            return;
        }

        container.innerHTML = `
            <pre>${escapeHtml(
                JSON.stringify(
                    performance,
                    null,
                    2
                )
            )}</pre>
        `;

    }

    catch (error) {

        console.error(
            "Work Order performance error:",
            error
        );

        container.innerHTML = `
            <div class="alert alert-danger">
                ❌ Unable to load Work Order performance.
            </div>
        `;

    }

}

// ==========================================================
// TECHNICIAN WORKLOAD INTELLIGENCE — FuElectric-AI v3.5.5
// ==========================================================

async function loadTechnicianWorkloadIntelligence() {

    const container =
        document.getElementById(
            "technician-workload-intelligence"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="alert alert-info">
            🧠 Analyzing technician workload...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/workload/intelligence`
            );

        if (!response.ok) {

            throw new Error(
                `Technician workload intelligence request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const technicians =
            data.technicians || [];

        // --------------------------------------------------
        // NO DATA
        // --------------------------------------------------

        if (technicians.length === 0) {

            container.innerHTML = `
                <div class="intelligence-empty">
                    <p>
                        👨‍🔧 No technician workload data available.
                    </p>

                    <small>
                        Assign active work orders to technicians
                        to generate workload intelligence.
                    </small>
                </div>
            `;

            return;
        }

        // --------------------------------------------------
        // DISPLAY TECHNICIAN INTELLIGENCE
        // --------------------------------------------------

        container.innerHTML = `

            <div class="technician-intelligence-grid">

                ${technicians.map(technician => {

                    const status =
                        technician.workload_status || "Normal";

                    const risk =
                        technician.risk_level || "Low";

                    return `

                        <div class="technician-intelligence-card">

                            <h3>
                                👨‍🔧
                                ${escapeHtml(
                                    technician.technician_id
                                )}
                            </h3>

                            <div class="technician-metric">

                                <strong>
                                    Total Orders
                                </strong>

                                <span>
                                    ${technician.total_orders ?? 0}
                                </span>

                            </div>


                            <div class="technician-metric">

                                <strong>
                                    Active Orders
                                </strong>

                                <span>
                                    ${technician.active_orders ?? 0}
                                </span>

                            </div>


                            <div class="technician-metric">

                                <strong>
                                    Critical
                                </strong>

                                <span>
                                    ${technician.critical_orders ?? 0}
                                </span>

                            </div>


                            <div class="technician-metric">

                                <strong>
                                    High Priority
                                </strong>

                                <span>
                                    ${technician.high_priority_orders ?? 0}
                                </span>

                            </div>


                            <div class="technician-metric">

                                <strong>
                                    Workload Score
                                </strong>

                                <span>
                                    ${technician.workload_score ?? 0}
                                </span>

                            </div>


                            <div class="technician-status">

                                <strong>
                                    Workload:
                                </strong>

                                ${escapeHtml(status)}

                            </div>


                            <div class="technician-risk">

                                <strong>
                                    Risk:
                                </strong>

                                ${escapeHtml(risk)}

                            </div>


                            <div class="technician-recommendation">

                                <strong>
                                    🧠 FuElectric-AI:
                                </strong>

                                <p>
                                    ${escapeHtml(
                                        technician.recommendation ||
                                        "No recommendation available."
                                    )}
                                </p>

                            </div>

                        </div>

                    `;

                }).join("")}

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Technician Workload Intelligence Error:",
            error
        );

        container.innerHTML = `

            <div class="alert alert-danger">

                ❌ Unable to load technician workload intelligence.

                <br>

                ${escapeHtml(error.message)}

            </div>

        `;

    }

}

// ==========================================================
// HEALTH & RISK INTELLIGENCE — FuElectric-AI v3.5.4
// ==========================================================


// ----------------------------------------------------------
// HEALTH & RISK SUMMARY
// ----------------------------------------------------------

async function loadHealthRiskSummary() {

    const container =
        document.getElementById(
            "risk-summary"
        ) ||
        document.getElementById(
            "health-risk-summary"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            🧠 Loading health & risk summary...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-summary`
            );

        if (!response.ok) {

            throw new Error(
                `Health & risk summary request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const summary =
            data.summary ||
            data;

        const totalEquipment =
            summary.total_equipment ??
            summary.equipment_count ??
            0;

        const averageHealth =
            summary.average_health ??
            summary.average_health_score ??
            "--";

        const averageRisk =
            summary.average_risk ??
            summary.average_risk_score ??
            "--";

        const lowRisk =
            summary.low_risk ??
            summary.low_risk_equipment ??
            0;

        const mediumRisk =
            summary.medium_risk ??
            summary.medium_risk_equipment ??
            0;

        const highRisk =
            summary.high_risk ??
            summary.high_risk_equipment ??
            0;

        container.innerHTML = `

            <div class="performance-grid">

                <div>
                    <strong>
                        Total Equipment
                    </strong>

                    <span>
                        ${escapeHtml(totalEquipment)}
                    </span>
                </div>

                <div>
                    <strong>
                        Average Health
                    </strong>

                    <span>
                        ${escapeHtml(averageHealth)}
                        ${
                            averageHealth !== "--"
                                ? "%"
                                : ""
                        }
                    </span>
                </div>

                <div>
                    <strong>
                        Average Risk
                    </strong>

                    <span>
                        ${escapeHtml(averageRisk)}
                    </span>
                </div>

                <div>
                    <strong>
                        Low Risk
                    </strong>

                    <span>
                        ${escapeHtml(lowRisk)}
                    </span>
                </div>

                <div>
                    <strong>
                        Medium Risk
                    </strong>

                    <span>
                        ${escapeHtml(mediumRisk)}
                    </span>
                </div>

                <div>
                    <strong>
                        High Risk
                    </strong>

                    <span>
                        ${escapeHtml(highRisk)}
                    </span>
                </div>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Health Risk Summary Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load health & risk summary.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// EQUIPMENT RISK RANKING
// ----------------------------------------------------------

async function loadEquipmentRiskRanking() {

    const container =
        document.getElementById(
            "risk-ranking-list"
        ) ||
        document.getElementById(
            "equipment-risk-ranking"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            ⚠️ Loading equipment risk ranking...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/equipment-risk-ranking`
            );

        if (!response.ok) {

            throw new Error(
                `Equipment risk ranking request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const ranking =
            data.ranking ||
            data.equipment ||
            data.results ||
            data ||
            [];

        if (
            !Array.isArray(ranking) ||
            ranking.length === 0
        ) {

            container.innerHTML = `
                <div class="success">
                    ✅ No equipment risk data available.
                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Rank</th>
                            <th>Equipment</th>
                            <th>Risk Score</th>
                            <th>Risk Level</th>
                            <th>Health Score</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${ranking.map(
                            (item, index) => {

                                const health =
                                    item.health_score ??
                                    item.health ??
                                    null;

                                return `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${index + 1}
                                            </strong>
                                        </td>

                                        <td>

                                            <strong>
                                                ${escapeHtml(
                                                    item.name ||
                                                    item.equipment_name ||
                                                    item.equipment_id ||
                                                    "Unknown"
                                                )}
                                            </strong>

                                            <br>

                                            <small>
                                                ${escapeHtml(
                                                    item.equipment_id ||
                                                    ""
                                                )}
                                            </small>

                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                item.risk_score ??
                                                item.score ??
                                                0
                                            )}
                                        </td>

                                        <td>

                                            <span class="badge">

                                                ${escapeHtml(
                                                    item.risk_level ||
                                                    item.risk ||
                                                    "Unknown"
                                                )}

                                            </span>

                                        </td>

                                        <td>

                                            ${
                                                health !== null
                                                    ? `${escapeHtml(health)}%`
                                                    : "N/A"
                                            }

                                        </td>

                                    </tr>

                                `;

                            }
                        ).join("")}

                    </tbody>

                </table>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Equipment Risk Ranking Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load equipment risk ranking.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// DETERIORATING EQUIPMENT
// ----------------------------------------------------------

async function loadDeterioratingEquipment() {

    const container =
        document.getElementById(
            "deteriorating-equipment-list"
        ) ||
        document.getElementById(
            "deteriorating-equipment"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            📉 Detecting deteriorating equipment...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/deteriorating-equipment`
            );

        if (!response.ok) {

            throw new Error(
                `Deteriorating equipment request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const equipment =
            data.equipment ||
            data.deteriorating_equipment ||
            data.results ||
            data ||
            [];

        if (
            !Array.isArray(equipment) ||
            equipment.length === 0
        ) {

            container.innerHTML = `
                <div class="success">

                    ✅ No deteriorating equipment detected.

                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="intelligence-grid">

                ${equipment.map(item => `

                    <div class="intelligence-card">

                        <h3>
                            📉
                            ${escapeHtml(
                                item.name ||
                                item.equipment_name ||
                                item.equipment_id ||
                                "Equipment"
                            )}
                        </h3>

                        <p>

                            <strong>
                                Equipment ID
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.equipment_id ||
                                "N/A"
                            )}

                        </p>

                        <p>

                            <strong>
                                Health Score
                            </strong>

                            <br>

                            ${
                                item.health_score ??
                                item.health ??
                                "N/A"
                            }

                            ${
                                (
                                    item.health_score ??
                                    item.health
                                ) !== "N/A"
                                    ? "%"
                                    : ""
                            }

                        </p>

                        <p>

                            <strong>
                                Risk Level
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.risk_level ||
                                item.risk ||
                                "Unknown"
                            )}

                        </p>

                        <p>

                            <strong>
                                Trend
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.trend ||
                                item.health_trend ||
                                "Deteriorating"
                            )}

                        </p>

                    </div>

                `).join("")}

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Deteriorating Equipment Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load deteriorating equipment.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// EQUIPMENT HEALTH TREND
// ----------------------------------------------------------

async function loadEquipmentTrend() {

    const selector =
        document.getElementById(
            "health-trend-equipment"
        );

    const container =
        document.getElementById(
            "health-trend-result"
        );

    if (!selector || !container) {
        return;
    }

    const equipmentId =
        selector.value;

    if (!equipmentId) {

        container.innerHTML = `
            <div class="info">
                Select equipment to view health trend.
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="info">
            📈 Loading equipment health trend...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/equipment/${encodeURIComponent(
                    equipmentId
                )}/health-trend`
            );

        if (!response.ok) {

            const errorData =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                errorData.detail ||
                `Health trend request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const trend =
            data.trend ||
            data.health_trend ||
            data.history ||
            [];

        if (
            Array.isArray(trend) &&
            trend.length === 0
        ) {

            container.innerHTML = `
                <div class="info">

                    ℹ️ No health trend data available
                    for this equipment yet.

                </div>
            `;

            return;
        }

        if (Array.isArray(trend)) {

            container.innerHTML = `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Date</th>
                                <th>Health Score</th>
                                <th>Status</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${trend.map(item => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            item.date ||
                                            item.timestamp ||
                                            item.recorded_at ||
                                            "N/A"
                                        )}
                                    </td>

                                    <td>
                                        <strong>
                                            ${
                                                item.health_score ??
                                                item.score ??
                                                0
                                            }%
                                        </strong>
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            item.status ||
                                            "Unknown"
                                        )}
                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            `;

        }

        else {

            container.innerHTML = `
                <div class="intelligence-panel">

                    <pre>
${escapeHtml(
    JSON.stringify(data, null, 2)
)}
                    </pre>

                </div>
            `;

        }

    }

    catch (error) {

        console.error(
            "Equipment Health Trend Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load equipment health trend.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// LOAD ALL v3.5.4 INTELLIGENCE
// ----------------------------------------------------------

async function loadHealthRiskIntelligence() {

    await Promise.all([
        loadHealthRiskSummary(),
        loadEquipmentRiskRanking(),
        loadDeterioratingEquipment()
    ]);

}


// ----------------------------------------------------------
// INITIALIZE v3.5.4 EQUIPMENT SELECTOR
// ----------------------------------------------------------

function initializeHealthRiskSelectors() {

    const selector =
        document.getElementById(
            "health-trend-equipment"
        );

    if (!selector) {
        return;
    }

    populateEquipmentSelector(
        "health-trend-equipment",
        equipmentData
    );

}


// ----------------------------------------------------------
// REFRESH v3.5.4
// ----------------------------------------------------------

async function refreshHealthRiskIntelligence() {

    await loadHealthRiskIntelligence();

    const selector =
        document.getElementById(
            "health-trend-equipment"
        );

    if (
        selector &&
        selector.value
    ) {

        await loadEquipmentTrend();

    }

    showMessage(
        "Health & Risk Intelligence refreshed successfully."
    );

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
        "AI Diagnosis is ready."
    );

}


function showAnalyticsMessage() {

    showMessage(
        "Analytics module coming next."
    );

}


// ==========================================================
// EQUIPMENT FORM EVENT
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const equipmentForm =
            document.getElementById(
                "equipmentForm"
            );


        if (equipmentForm) {

            equipmentForm.addEventListener(
                "submit",
                saveEquipment
            );

        }

    }
);


// ==========================================================
// CLEANUP CAMERA
// ==========================================================

window.addEventListener(
    "beforeunload",
    function() {

        stopCamera();

    }
);

// ==========================================================
// APPLICATION START
// ==========================================================

window.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "⚡ FuElectric-AI v3.5.0 frontend started."
        );


        // --------------------------------------------------
        // DASHBOARD
        // --------------------------------------------------

        await loadDashboard();


        // --------------------------------------------------
        // EQUIPMENT
        // --------------------------------------------------

        await loadEquipment();

        initializeHealthTrendSelector();
        await loadHealthRiskIntelligence();


        // --------------------------------------------------
        // WORK ORDERS
        // --------------------------------------------------

        await loadWorkOrders();

        await loadWorkOrderStatistics();


        // --------------------------------------------------
        // WORK ORDER INTELLIGENCE — v3.5.0
        // --------------------------------------------------

        await loadTechnicianWorkload();

        await loadOverdueWorkOrders();

        await loadWorkOrderPerformance();

        await loadWorkOrderIntelligence();
        
        await loadTechnicianWorkloadIntelligence();


        // --------------------------------------------------
        // EQUIPMENT HEALTH
        // --------------------------------------------------

        loadEquipmentHealth();

        


        // --------------------------------------------------
        // AI DIAGNOSIS
        // --------------------------------------------------

        await loadDiagnosisEquipment();


        // --------------------------------------------------
        // MAINTENANCE INTELLIGENCE
        // --------------------------------------------------

        await loadMaintenanceAlerts();

        // --------------------------------------------------
       // HEALTH & RISK INTELLIGENCE — v3.5.4
      // --------------------------------------------------

        await loadHealthRiskIntelligence();

        initializeHealthRiskSelectors();

        // --------------------------------------------------
        // APPLICATION READY
        // --------------------------------------------------

        console.log(
            "✅ FuElectric-AI v3.5.0 frontend fully loaded."
        );

    }
);

// ==========================================================
// WORK ORDER INTELLIGENCE — v3.5.1
// ==========================================================


async function loadWorkOrderIntelligence() {

    try {

        // --------------------------------------------------
        // STATISTICS
        // --------------------------------------------------

        const statisticsResponse =
            await fetch(`${API_URL}/work-orders/statistics`);

        if (!statisticsResponse.ok) {
            throw new Error("Failed to load work-order statistics.");
        }

        const statistics =
            await statisticsResponse.json();


        document.getElementById("wo-total").textContent =
            statistics.total_work_orders ?? 0;

        document.getElementById("wo-open").textContent =
            statistics.open_work_orders ?? 0;

        document.getElementById("wo-assigned").textContent =
            statistics.assigned_work_orders ?? 0;

        document.getElementById("wo-progress").textContent =
            statistics.in_progress_work_orders ?? 0;

        document.getElementById("wo-completed").textContent =
            statistics.completed_work_orders ?? 0;

        document.getElementById("wo-cancelled").textContent =
            statistics.cancelled_work_orders ?? 0;


        // --------------------------------------------------
        // PERFORMANCE
        // --------------------------------------------------

        const performanceResponse =
            await fetch(`${API_URL}/work-orders/performance`);

        const performanceData =
            await performanceResponse.json();

        document.getElementById("wo-performance").innerHTML = `

            <p>
                <strong>Completion Rate:</strong>
                ${performanceData.performance?.completion_rate ?? 0}%
            </p>

            <p>
                <strong>Active Rate:</strong>
                ${performanceData.performance?.active_rate ?? 0}%
            </p>

            <p>
                <strong>Active Work Orders:</strong>
                ${performanceData.performance?.active_work_orders ?? 0}
            </p>

            <p>
                <strong>Overdue:</strong>
                ${performanceData.performance?.overdue_work_orders ?? 0}
            </p>

            <p>
                <strong>Cancelled:</strong>
                ${performanceData.performance?.cancelled_work_orders ?? 0}
            </p>

        `;


        // --------------------------------------------------
        // OVERDUE WORK ORDERS
        // --------------------------------------------------

        const overdueResponse =
            await fetch(`${API_URL}/work-orders/overdue`);

        const overdueData =
            await overdueResponse.json();

        const overdueContainer =
            document.getElementById("wo-overdue");

        if (
            !overdueData.work_orders ||
            overdueData.work_orders.length === 0
        ) {

            overdueContainer.innerHTML =
                "<p>✅ No overdue work orders.</p>";

        } else {

            overdueContainer.innerHTML =
                overdueData.work_orders.map(order => `

                    <div class="work-order-alert">

                        <strong>
                            ${order.work_order_id}
                        </strong>

                        — ${order.work_type}

                        <br>

                        Equipment:
                        ${order.equipment_id}

                        <br>

                        Due:
                        ${order.due_date}

                        <br>

                        Priority:
                        ${order.priority}

                    </div>

                `).join("");

        }


        // --------------------------------------------------
        // TECHNICIAN WORKLOAD
        // --------------------------------------------------

        const workloadResponse =
            await fetch(`${API_URL}/work-orders/workload`);

        const workloadData =
            await workloadResponse.json();

        const workloadContainer =
            document.getElementById("wo-workload");


        if (
            !workloadData.workload ||
            workloadData.workload.length === 0
        ) {

            workloadContainer.innerHTML =
                "<p>No technician workload data available.</p>";

        } else {

            workloadContainer.innerHTML = `

                <table>

                    <thead>

                        <tr>
                            <th>Technician</th>
                            <th>Total</th>
                            <th>Open</th>
                            <th>Assigned</th>
                            <th>In Progress</th>
                            <th>Completed</th>
                            <th>Critical</th>
                            <th>High</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${workloadData.workload.map(item => `

                            <tr>

                                <td>
                                    ${item.technician_id}
                                </td>

                                <td>
                                    ${item.total_orders ?? 0}
                                </td>

                                <td>
                                    ${item.open_orders ?? 0}
                                </td>

                                <td>
                                    ${item.assigned_orders ?? 0}
                                </td>

                                <td>
                                    ${item.in_progress_orders ?? 0}
                                </td>

                                <td>
                                    ${item.completed_orders ?? 0}
                                </td>

                                <td>
                                    ${item.critical_orders ?? 0}
                                </td>

                                <td>
                                    ${item.high_priority_orders ?? 0}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            `;

        }


        // --------------------------------------------------
        // AI INSIGHTS
        // --------------------------------------------------

        const intelligenceResponse =
            await fetch(
                `${API_URL}/work-orders/intelligence`
            );

        const intelligenceData =
            await intelligenceResponse.json();

        generateWorkOrderInsights(
            intelligenceData
        );


    } catch (error) {

        console.error(
            "Work Order Intelligence Error:",
            error
        );

    }

}

// ==========================================================
// FuElectric-AI WORK ORDER INSIGHTS
// ==========================================================

function generateWorkOrderInsights(data) {

    const container =
        document.getElementById("wo-ai-insights")

    if (!container) {
        console.warn(
            "Work Order Insights container not found."
        );
        return;
    }


    // ------------------------------------------------------
    // SUPPORT THE ACTUAL API RESPONSE STRUCTURE
    // ------------------------------------------------------

    const intelligence =
        data?.intelligence || data || {};

    const performance =
        intelligence.performance || {};


    const technicianWorkload =
        intelligence.technician_workload || [];


    // ------------------------------------------------------
    // READ PERFORMANCE VALUES
    // ------------------------------------------------------

    const totalWorkOrders =
        Number(
            performance.total_work_orders ?? 0
        );

    const completedWorkOrders =
        Number(
            performance.completed_work_orders ?? 0
        );

    const activeWorkOrders =
        Number(
            performance.active_work_orders ?? 0
        );

    const overdueWorkOrders =
    Number(
        performance.overdue_work_orders ?? 0
    );

    const cancelledWorkOrders =
        Number(
            performance.cancelled_work_orders ?? 0
        );


    // ------------------------------------------------------
    // COMPLETION RATE
    // ------------------------------------------------------

    let completionRate;

    if (
        performance.completion_rate !== undefined &&
        performance.completion_rate !== null
    ) {

        completionRate =
            Number(
                performance.completion_rate
            );

    } else if (totalWorkOrders > 0) {

        completionRate =
            Math.round(
                (
                    completedWorkOrders /
                    totalWorkOrders
                ) * 100
            );

    } else {

        completionRate = 0;

    }


    // ------------------------------------------------------
    // ACTIVE RATE
    // ------------------------------------------------------

    let activeRate;

    if (
        performance.active_rate !== undefined &&
        performance.active_rate !== null
    ) {

        activeRate =
            Number(
                performance.active_rate
            );

    } else if (totalWorkOrders > 0) {

        activeRate =
            Math.round(
                (
                    activeWorkOrders /
                    totalWorkOrders
                ) * 100
            );

    } else {

        activeRate = 0;

    }


    // ------------------------------------------------------
    // BUILD AI INSIGHTS
    // ------------------------------------------------------

    const insights = [];

console.log("INSIGHTS ARRAY CREATED:", insights);

    // COMPLETION RATE
    if (completionRate >= 80) {

        insights.push(`
            <p>
                🟢
                Work-order completion rate is
                <strong>${completionRate}%</strong>.
                Performance is strong.
            </p>
        `);

    } else if (completionRate >= 50) {

        insights.push(`
            <p>
                🟡
                Work-order completion rate is
                <strong>${completionRate}%</strong>.
                Performance requires monitoring.
            </p>
        `);

    } else {

        insights.push(`
            <p>
                🔴
                Work-order completion rate is
                <strong>${completionRate}%</strong>.
                Management attention is recommended.
            </p>
        `);

    }


    // ACTIVE WORK
    if (activeWorkOrders > 0) {

        insights.push(`
            <p>
                🔵
                There are
                <strong>${activeWorkOrders}</strong>
                active work order(s)
                currently requiring attention.
            </p>
        `);

    }


    // TECHNICIAN WORKLOAD
    if (technicianWorkload.length > 0) {

        insights.push(`
            <p>
                👨‍🔧
                Technician workload intelligence is
                available for
                <strong>
                    ${technicianWorkload.length}
                </strong>
                technician(s).
            </p>
        `);

    }


    // CANCELLED
    if (cancelledWorkOrders > 0) {

        insights.push(`
            <p>
                ⚠️
                <strong>
                    ${cancelledWorkOrders}
                </strong>
                work order(s) have been cancelled.
            </p>
        `);

    }


    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------

    container.innerHTML = `

        <div class="intelligence-result">

            <h3>
                🤖 FuElectric-AI Insights
            </h3>

            <div class="work-order-insight-content">

                ${insights.join("")}

            </div>

            <hr>

            <p>
                <strong>Total Work Orders:</strong>
                ${totalWorkOrders}
            </p>

            <p>
                <strong>Completed:</strong>
                ${completedWorkOrders}
            </p>

            <p>
                <strong>Completion Rate:</strong>
                ${completionRate}%
            </p>

            <p>
                <strong>Active Rate:</strong>
                ${activeRate}%
            </p>

        </div>

    `;


    // ------------------------------------------------------
    // DEBUG
    // ------------------------------------------------------

    console.log(
        "🤖 FuElectric-AI Work Order Insights:",
        {
            totalWorkOrders,
            completedWorkOrders,
            activeWorkOrders,
            overdueWorkOrders,
            cancelledWorkOrders,
            completionRate,
            activeRate
        }
    );

}

// ==========================================================
// HEALTH & RISK INTELLIGENCE — FuElectric-AI v3.5.4
// ==========================================================


// ----------------------------------------------------------
// EQUIPMENT HEALTH TREND
// ----------------------------------------------------------

async function loadEquipmentHealthTrend() {

    const selector =
        document.getElementById(
            "health-trend-equipment-select"
        );

    const container =
        document.getElementById(
            "equipment-health-trend"
        );

    if (!selector || !container) {
        return;
    }

    const equipmentId =
        selector.value;

    if (!equipmentId) {

        container.innerHTML = `
            <div class="info">
                📈 Select equipment to view health trend.
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="info">
            📈 Loading equipment health trend...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/equipment/${encodeURIComponent(
                    equipmentId
                )}/health-trend`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Health trend request failed."
            );

        }

        const trend =
            data.trend ||
            data.health_trend ||
            data.history ||
            [];

        if (
            !Array.isArray(trend) ||
            trend.length === 0
        ) {

            container.innerHTML = `
                <div class="info">
                    ℹ️ No health trend data available
                    for this equipment yet.
                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Date</th>
                            <th>Health Score</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${trend.map(item => `

                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.date ||
                                        item.timestamp ||
                                        item.recorded_at ||
                                        "N/A"
                                    )}
                                </td>

                                <td>

                                    <strong>
                                        ${
                                            item.health_score ??
                                            item.score ??
                                            0
                                        }%
                                    </strong>

                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.status ||
                                        "Unknown"
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        `;

    }
    catch (error) {

        console.error(
            "Equipment Health Trend Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load equipment health trend.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// EQUIPMENT RISK RANKING
// ----------------------------------------------------------

async function loadEquipmentRiskRanking() {

    const container =
        document.getElementById(
            "equipment-risk-ranking"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            ⚠️ Loading equipment risk ranking...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/equipment-risk-ranking`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Equipment risk ranking request failed."
            );

        }

        const ranking =
            data.ranking ||
            data.equipment ||
            data.results ||
            data ||
            [];

        if (
            !Array.isArray(ranking) ||
            ranking.length === 0
        ) {

            container.innerHTML = `
                <div class="success">
                    ✅ No equipment risk data available.
                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Rank</th>
                            <th>Equipment</th>
                            <th>Risk Score</th>
                            <th>Risk Level</th>
                            <th>Health Score</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${ranking.map((item, index) => `

                            <tr>

                                <td>
                                    <strong>
                                        ${index + 1}
                                    </strong>
                                </td>

                                <td>

                                    <strong>
                                        ${escapeHtml(
                                            item.name ||
                                            item.equipment_name ||
                                            item.equipment_id ||
                                            "Unknown"
                                        )}
                                    </strong>

                                    <br>

                                    <small>
                                        ${escapeHtml(
                                            item.equipment_id ||
                                            ""
                                        )}
                                    </small>

                                </td>

                                <td>
                                    ${
                                        item.risk_score ??
                                        item.score ??
                                        0
                                    }
                                </td>

                                <td>

                                    <span class="badge">
                                        ${escapeHtml(
                                            item.risk_level ||
                                            item.risk ||
                                            "Unknown"
                                        )}
                                    </span>

                                </td>

                                <td>

                                    ${
                                        item.health_score ??
                                        item.health ??
                                        "N/A"
                                    }

                                    ${
                                        (
                                            item.health_score ??
                                            item.health
                                        ) !== "N/A"
                                            ? "%"
                                            : ""
                                    }

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        `;

    }
    catch (error) {

        console.error(
            "Equipment Risk Ranking Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load equipment risk ranking.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// HEALTH & RISK SUMMARY
// ----------------------------------------------------------

async function loadHealthRiskSummary() {

    const container =
        document.getElementById(
            "health-risk-summary"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            🧠 Loading health & risk summary...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-summary`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Health & risk summary request failed."
            );

        }

        const summary =
            data.summary ||
            data;

        container.innerHTML = `

            <div class="performance-grid">

                <div>
                    <strong>
                        Total Equipment
                    </strong>

                    <span>
                        ${
                            summary.total_equipment ??
                            summary.equipment_count ??
                            0
                        }
                    </span>
                </div>


                <div>
                    <strong>
                        High Risk
                    </strong>

                    <span>
                        ${
                            summary.high_risk ??
                            summary.high_risk_equipment ??
                            0
                        }
                    </span>
                </div>


                <div>
                    <strong>
                        Critical Risk
                    </strong>

                    <span>
                        ${
                            summary.critical_risk ??
                            summary.critical_risk_equipment ??
                            0
                        }
                    </span>
                </div>


                <div>
                    <strong>
                        Healthy Equipment
                    </strong>

                    <span>
                        ${
                            summary.healthy_equipment ??
                            summary.healthy ??
                            0
                        }
                    </span>
                </div>


                <div>
                    <strong>
                        Deteriorating
                    </strong>

                    <span>
                        ${
                            summary.deteriorating ??
                            summary.deteriorating_equipment ??
                            0
                        }
                    </span>
                </div>

            </div>


            <details>

                <summary>
                    View health & risk data
                </summary>

                <pre>
${escapeHtml(
    JSON.stringify(
        summary,
        null,
        2
    )
)}
                </pre>

            </details>

        `;

    }
    catch (error) {

        console.error(
            "Health Risk Summary Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load health & risk summary.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

    }

}


// ----------------------------------------------------------
// DETERIORATING EQUIPMENT
// ----------------------------------------------------------

async function loadDeterioratingEquipment() {

    const container =
        document.getElementById(
            "deteriorating-equipment"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="info">
            📉 Detecting deteriorating equipment...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/deteriorating-equipment`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Deteriorating equipment request failed."
            );

        }

        const equipment =
            data.equipment ||
            data.deteriorating_equipment ||
            data.results ||
            data ||
            [];

        if (
            !Array.isArray(equipment) ||
            equipment.length === 0
        ) {

            container.innerHTML = `
                <div class="success">

                    ✅ No deteriorating equipment
                    detected.

                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="intelligence-grid">

                ${equipment.map(item => `

                    <div class="intelligence-card">

                        <h3>
                            📉
                            ${escapeHtml(
                                item.name ||
                                item.equipment_name ||
                                item.equipment_id ||
                                "Equipment"
                            )}
                        </h3>


                        <p>

                            <strong>
                                Equipment ID
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.equipment_id ||
                                "N/A"
                            )}

                        </p>


                        <p>

                            <strong>
                                Health Score
                            </strong>

                            <br>

                            ${
                                item.health_score ??
                                item.health ??
                                "N/A"
                            }

                            ${
                                (
                                    item.health_score ??
                                    item.health
                                ) !== "N/A"
                                    ? "%"
                                    : ""
                            }

                        </p>


                        <p>

                            <strong>
                                Risk Level
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.risk_level ||
                                item.risk ||
                                "Unknown"
                            )}

                        </p>


                        <p>

                            <strong>
                                Trend
                            </strong>

                            <br>

                            ${escapeHtml(
                                item.trend ||
                                item.health_trend ||
                                "Deteriorating"
                            )}

                        </p>

                    </div>

                `).join("")}

            </div>

        `;

    }
    catch (error) {

        console.error(
            "Deteriorating Equipment Error:",
            error
        );

        container.innerHTML = `
            <div class="error">

                ❌ Unable to load deteriorating equipment.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

    }

}

// ---------------------------------------------------------
// LOAD ALL v3.5.4 INTELLIGENCE
// ----------------------------------------------------------

async function loadHealthRiskIntelligence() {


    await Promise.all([
        loadHealthRiskSummary(),
        loadEquipmentRiskRanking(),
        loadDeterioratingEquipment()
    ]);

}


// ----------------------------------------------------------
// HEALTH TREND SELECTOR
// ----------------------------------------------------------

function initializeHealthTrendSelector() {

    const selector =
        document.getElementById(
            "health-trend-equipment-select"
        );

    if (!selector) {
        return;
    }

    selector.onchange =
        loadEquipmentHealthTrend;

}


// ----------------------------------------------------------
// REFRESH v3.5.4
// ----------------------------------------------------------

async function refreshHealthRiskIntelligence() {

    await loadHealthRiskIntelligence();

    const selector =
        document.getElementById(
            "health-trend-equipment-select"
        );

    if (
        selector &&
        selector.value
    ) {

        await loadEquipmentHealthTrend();

    }

    showMessage(
        "Health & Risk Intelligence refreshed successfully."
    );

}

// ==========================================================
// FuElectric-AI v3.5.3 + v3.5.4
// EQUIPMENT RELIABILITY + HEALTH & RISK FRONTEND
// ==========================================================


// ==========================================================
// v3.5.3 — EQUIPMENT RELIABILITY ANALYTICS
// ==========================================================

async function loadReliabilityAnalytics() {

    const rankingContainer =
        document.getElementById(
            "reliability-ranking-list"
        );

    if (!rankingContainer) {
        console.error(
            "Reliability ranking container not found."
        );
        return;
    }

    rankingContainer.innerHTML =
        `<p class="loading">
            Loading reliability analytics...
        </p>`;

    try {

        const response = await fetch(
            `${API_URL}/reliability/analytics`
        );

        if (!response.ok) {

            throw new Error(
                `Reliability request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Reliability Analytics:",
            data
        );

        // --------------------------------------------------
        // SUMMARY
        // --------------------------------------------------

        setElementText(
            "reliability-total-equipment",
            data.total_equipment ?? 0
        );

        setElementText(
            "reliability-average-score",
            data.average_reliability !== undefined
                ? `${Number(data.average_reliability).toFixed(1)}%`
                : "--"
        );

        setElementText(
            "reliability-highly-reliable",
            data.highly_reliable ?? 0
        );

        setElementText(
            "reliability-reliable",
            data.reliable ?? 0
        );

        setElementText(
            "reliability-moderate",
            data.moderate ?? 0
        );

        setElementText(
            "reliability-low",
            data.low_reliability ??
            data.low ??
            0
        );


        // --------------------------------------------------
        // RANKING
        // --------------------------------------------------

        const ranking =
            data.ranking ||
            data.equipment ||
            data.reliability_ranking ||
            [];

        if (!Array.isArray(ranking) ||
            ranking.length === 0) {

            rankingContainer.innerHTML =
                `<div class="info">
                    No reliability data available.
                </div>`;

            return;
        }


        rankingContainer.innerHTML = `

            <div class="table-container">

                <table class="reliability-table">

                    <thead>

                        <tr>
                            <th>Rank</th>
                            <th>Equipment</th>
                            <th>Reliability</th>
                            <th>Status</th>
                            <th>Repairs</th>
                            <th>Maintenance</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${ranking.map(
                            (item, index) => {

                                const score =
                                    item.reliability_score ??
                                    item.reliability ??
                                    item.score ??
                                    0;

                                const status =
                                    item.status ??
                                    item.reliability_status ??
                                    getReliabilityStatus(score);

                                return `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${index + 1}
                                            </strong>
                                        </td>

                                        <td>
                                            <strong>
                                                ${escapeHtml(
                                                    item.equipment_id ??
                                                    item.id ??
                                                    "Unknown"
                                                )}
                                            </strong>

                                            ${
                                                item.name
                                                    ? `<br>
                                                       <small>
                                                       ${escapeHtml(item.name)}
                                                       </small>`
                                                    : ""
                                            }

                                        </td>

                                        <td class="reliability-score">

                                            ${formatNumber(score)}%

                                        </td>

                                        <td>

                                            <span class="badge">
                                                ${escapeHtml(status)}
                                            </span>

                                        </td>

                                        <td>
                                            ${item.total_repairs ??
                                              item.repairs ??
                                              0}
                                        </td>

                                        <td>
                                            ${item.maintenance_records ??
                                              item.maintenance_count ??
                                              item.maintenance ??
                                              0}
                                        </td>

                                    </tr>

                                `;

                            }
                        ).join("")}

                    </tbody>

                </table>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Reliability analytics error:",
            error
        );

        rankingContainer.innerHTML = `

            <div class="error">

                ❌ Unable to load reliability analytics.

                <br>

                ${escapeHtml(error.message)}

            </div>

        `;

    }

}

// ==========================================================
// EQUIPMENT RELIABILITY ANALYTICS — FuElectric-AI v3.5.3
// CLEAN INTEGRATED FRONTEND MODULE
// ==========================================================

/*
    v3.5.3 FRONTEND RESPONSIBILITIES

    1. Load complete reliability analytics
    2. Load reliability summary
    3. Display reliability summary cards
    4. Display equipment reliability ranking
    5. Populate equipment reliability selector
    6. Display selected equipment reliability
    7. Handle API errors cleanly

    BACKEND ENDPOINTS USED:

        GET /reliability
        GET /reliability/summary

    IMPORTANT:
    Do NOT add alternative/invented reliability endpoints here.
*/


// ==========================================================
// RELIABILITY STATE
// ==========================================================

let reliabilityData = [];
let reliabilitySummaryData = {};


// ==========================================================
// HELPER — GET RELIABILITY SCORE
// ==========================================================

function getReliabilityScore(item) {

    return Number(
        item.reliability_score ??
        item.reliability ??
        item.score ??
        0
    );

}


// ==========================================================
// HELPER — RELIABILITY STATUS
// ==========================================================

function getReliabilityStatus(item) {

    const score = getReliabilityScore(item);

    return (
        item.reliability_status ??
        item.status ??
        (
            score >= 90
                ? "Highly Reliable"
                : score >= 75
                    ? "Reliable"
                    : score >= 50
                        ? "Moderate"
                        : "Low Reliability"
        )
    );

}


// ==========================================================
// HELPER — STATUS CLASS
// ==========================================================

function getReliabilityClass(score) {

    if (score >= 90) {
        return "reliability-high";
    }

    if (score >= 75) {
        return "reliability-high";
    }

    if (score >= 50) {
        return "reliability-moderate";
    }

    return "reliability-low";

}


// ==========================================================
// LOAD COMPLETE RELIABILITY ANALYTICS
// ==========================================================

async function loadReliabilityAnalytics() {

    const rankingContainer =
        document.getElementById("reliability-ranking-list");

    if (rankingContainer) {

        rankingContainer.innerHTML =
            "<p class='loading'>Loading reliability analytics...</p>";

    }


    try {

        // --------------------------------------------------
        // LOAD COMPLETE RELIABILITY DATA
        // --------------------------------------------------

        const response =
    await fetch(`${API_URL}/reliability`);

if (!response.ok) {

    throw new Error(
        `Reliability request failed: ${response.status}`
    );

}

const data =
    await response.json();

        console.log(
            "v3.5.3 Reliability Analytics:",
            data
        );


        // --------------------------------------------------
        // NORMALIZE EQUIPMENT ARRAY
        // --------------------------------------------------

        reliabilityData =
            Array.isArray(data)
                ? data
                : (
                    data.equipment ??
                    data.reliability ??
                    data.data ??
                    []
                );


        if (!Array.isArray(reliabilityData)) {

            reliabilityData = [];

        }


        // --------------------------------------------------
        // LOAD SUMMARY
        // --------------------------------------------------

        try {

            const summaryResponse =
    await fetch(`${API_URL}/reliability/summary`);

if (!summaryResponse.ok) {

    throw new Error(
        `Reliability summary request failed: ${summaryResponse.status}`
    );

}

reliabilitySummaryData =
    await summaryResponse.json();

            console.log(
                "v3.5.3 Reliability Summary:",
                reliabilitySummaryData
            );

        }

        catch (summaryError) {

            console.warn(
                "Reliability summary could not be loaded:",
                summaryError
            );

            reliabilitySummaryData = {};

        }


        // --------------------------------------------------
        // RENDER SUMMARY
        // --------------------------------------------------

        renderReliabilitySummary(
            reliabilitySummaryData,
            reliabilityData
        );


        // --------------------------------------------------
        // RENDER RANKING
        // --------------------------------------------------

        renderReliabilityRanking(
            reliabilityData
        );


        // --------------------------------------------------
        // POPULATE EQUIPMENT SELECTOR
        // --------------------------------------------------

        populateReliabilitySelector(
            reliabilityData
        );


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        if (reliabilityData.length === 0) {

            if (rankingContainer) {

                rankingContainer.innerHTML = `
                    <div class="info">
                        No reliability data is currently available.
                    </div>
                `;

            }

        }


    }

    catch (error) {

        console.error(
            "Reliability Analytics Error:",
            error
        );


        if (rankingContainer) {

            rankingContainer.innerHTML = `
                <div class="error">
                    ❌ Unable to load reliability analytics.
                    <br>
                    ${escapeHtml(error.message)}
                </div>
            `;

        }


        showMessage(
            "Could not load Equipment Reliability Analytics: " +
            error.message
        );

    }

}


// ==========================================================
// RENDER RELIABILITY SUMMARY
// ==========================================================

function renderReliabilitySummary(
    summary,
    equipment
) {

    summary = summary || {};
    equipment = Array.isArray(equipment)
        ? equipment
        : [];


    // ------------------------------------------------------
    // TOTAL EQUIPMENT
    // ------------------------------------------------------

    const totalEquipment =
        summary.total_equipment ??
        summary.total ??
        equipment.length;


    // ------------------------------------------------------
    // AVERAGE RELIABILITY
    // ------------------------------------------------------

    let averageScore =
        summary.average_reliability ??
        summary.average_reliability_score ??
        summary.average_score;


    // If backend summary doesn't provide it,
    // calculate from equipment data.

    if (
        averageScore === undefined ||
        averageScore === null
    ) {

        if (equipment.length > 0) {

            const totalScore =
                equipment.reduce(
                    (sum, item) =>
                        sum + getReliabilityScore(item),
                    0
                );

            averageScore =
                totalScore / equipment.length;

        }

        else {

            averageScore = 0;

        }

    }


    // ------------------------------------------------------
    // CATEGORY COUNTS
    // ------------------------------------------------------

    let highlyReliable =
        summary.highly_reliable ??
        summary.high_reliability ??
        summary.highly_reliable_count;

    let reliable =
        summary.reliable ??
        summary.reliable_count;

    let moderate =
        summary.moderate ??
        summary.moderate_count;

    let low =
        summary.low_reliability ??
        summary.low ??
        summary.low_reliability_count;


    // ------------------------------------------------------
    // FALLBACK CATEGORY CALCULATION
    // ------------------------------------------------------

    if (
        highlyReliable === undefined ||
        reliable === undefined ||
        moderate === undefined ||
        low === undefined
    ) {

        highlyReliable = 0;
        reliable = 0;
        moderate = 0;
        low = 0;


        equipment.forEach(item => {

            const score =
                getReliabilityScore(item);

            if (score >= 90) {

                highlyReliable++;

            }

            else if (score >= 75) {

                reliable++;

            }

            else if (score >= 50) {

                moderate++;

            }

            else {

                low++;

            }

        });

    }


    // ------------------------------------------------------
    // UPDATE HTML
    // ------------------------------------------------------

    const values = {

        "reliability-total-equipment":
            totalEquipment,

        "reliability-average-score":
            `${Number(averageScore).toFixed(1)}%`,

        "reliability-highly-reliable":
            highlyReliable,

        "reliability-reliable":
            reliable,

        "reliability-moderate":
            moderate,

        "reliability-low":
            low

    };


    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent = value;

            }

        }
    );

}


// ==========================================================
// RENDER RELIABILITY RANKING
// ==========================================================

function renderReliabilityRanking(
    equipment
) {

    const container =
        document.getElementById(
            "reliability-ranking-list"
        );


    if (!container) return;


    if (
        !Array.isArray(equipment) ||
        equipment.length === 0
    ) {

        container.innerHTML = `
            <div class="info">
                No reliability ranking data available.
            </div>
        `;

        return;

    }


    // ------------------------------------------------------
    // SORT BY RELIABILITY SCORE
    // HIGHEST → LOWEST
    // ------------------------------------------------------

    const ranked =
        [...equipment].sort(
            (a, b) =>
                getReliabilityScore(b) -
                getReliabilityScore(a)
        );


    // ------------------------------------------------------
    // TABLE
    // ------------------------------------------------------

    container.innerHTML = `

        <div class="table-container">

            <table class="reliability-table">

                <thead>

                    <tr>

                        <th>Rank</th>

                        <th>Equipment</th>

                        <th>Reliability Score</th>

                        <th>Status</th>

                        <th>MTBF</th>

                        <th>MTTR</th>

                        <th>Failure Frequency</th>

                    </tr>

                </thead>


                <tbody>

                    ${ranked.map(
                        (item, index) => {

                            const score =
                                getReliabilityScore(item);

                            const status =
                                getReliabilityStatus(item);

                            const equipmentId =
                                item.equipment_id ??
                                item.id ??
                                "N/A";

                            const equipmentName =
                                item.name ??
                                item.equipment_name ??
                                equipmentId;

                            const mtbf =
                                item.mtbf ??
                                item.mtbf_hours ??
                                "N/A";

                            const mttr =
                                item.mttr ??
                                item.mttr_hours ??
                                "N/A";

                            const failureFrequency =
                                item.failure_frequency ??
                                item.failure_rate ??
                                item.failures ??
                                "N/A";


                            return `

                                <tr>

                                    <td>
                                        <strong>
                                            #${index + 1}
                                        </strong>
                                    </td>


                                    <td>

                                        <strong>
                                            ${escapeHtml(
                                                equipmentName
                                            )}
                                        </strong>

                                        <br>

                                        <small>
                                            ${escapeHtml(
                                                equipmentId
                                            )}
                                        </small>

                                    </td>


                                    <td>

                                        <span
                                            class="reliability-score
                                            ${getReliabilityClass(score)}"
                                        >

                                            ${score.toFixed(1)}%

                                        </span>

                                    </td>


                                    <td>

                                        <span
                                            class="${getReliabilityClass(score)}"
                                        >

                                            ${escapeHtml(
                                                status
                                            )}

                                        </span>

                                    </td>


                                    <td>
                                        ${escapeHtml(mtbf)}
                                    </td>


                                    <td>
                                        ${escapeHtml(mttr)}
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            failureFrequency
                                        )}
                                    </td>

                                </tr>

                            `;

                        }
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;

}


// ==========================================================
// POPULATE RELIABILITY EQUIPMENT SELECTOR
// ==========================================================

function populateReliabilitySelector(
    equipment
) {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );


    if (!select) return;


    const currentValue =
        select.value;


    select.innerHTML = `
        <option value="">
            Select Equipment
        </option>
    `;


    if (!Array.isArray(equipment)) {
        return;
    }


    equipment.forEach(item => {

        const equipmentId =
            item.equipment_id ??
            item.id;


        if (!equipmentId) {
            return;
        }


        const equipmentName =
            item.name ??
            item.equipment_name ??
            equipmentId;


        const option =
            document.createElement("option");


        option.value =
            equipmentId;


        option.textContent =
            `${equipmentName} (${equipmentId})`;


        select.appendChild(option);

    });


    // Restore previous selection if it still exists.

    if (
        currentValue &&
        [...select.options].some(
            option =>
                option.value === currentValue
        )
    ) {

        select.value =
            currentValue;

    }

}


// ==========================================================
// LOAD SELECTED EQUIPMENT RELIABILITY
// ==========================================================

async function loadSelectedReliability() {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );

    const result =
        document.getElementById(
            "reliability-detail-result"
        );


    if (!select || !result) {
        return;
    }


    const equipmentId =
        select.value;


    if (!equipmentId) {

        result.innerHTML = `
            <p>
                Select equipment to view reliability.
            </p>
        `;

        return;

    }


    // ------------------------------------------------------
    // FIND EQUIPMENT FROM ALREADY-LOADED DATA
    // ------------------------------------------------------

    const item =
        reliabilityData.find(
            equipment =>
                String(
                    equipment.equipment_id ??
                    equipment.id
                ) === String(equipmentId)
        );


    if (!item) {

        result.innerHTML = `
            <div class="error">
                Reliability data for
                ${escapeHtml(equipmentId)}
                was not found.
                <br>
                Refresh Reliability and try again.
            </div>
        `;

        return;

    }


    renderSelectedReliability(
        item,
        result
    );

}


// ==========================================================
// RENDER SELECTED EQUIPMENT RELIABILITY
// ==========================================================

function renderSelectedReliability(
    item,
    container
) {

    const score =
        getReliabilityScore(item);

    const status =
        getReliabilityStatus(item);

    const equipmentId =
        item.equipment_id ??
        item.id ??
        "N/A";

    const equipmentName =
        item.name ??
        item.equipment_name ??
        equipmentId;

    const mtbf =
        item.mtbf ??
        item.mtbf_hours ??
        "N/A";

    const mttr =
        item.mttr ??
        item.mttr_hours ??
        "N/A";

    const failureFrequency =
        item.failure_frequency ??
        item.failure_rate ??
        item.failures ??
        "N/A";

    const repairCount =
        item.repair_count ??
        item.repairs ??
        0;

    const maintenanceCount =
        item.maintenance_count ??
        item.maintenance_records ??
        item.maintenance ??
        0;

    const recommendation =
        item.recommendation ??
        item.reliability_recommendation ??
        "No recommendation available.";


    container.innerHTML = `

        <div class="reliability-detail-grid">

            <div class="reliability-detail-card">

                <h4>
                    Equipment
                </h4>

                <p>
                    ${escapeHtml(
                        equipmentName
                    )}
                </p>

                <small>
                    ${escapeHtml(
                        equipmentId
                    )}
                </small>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    Reliability Score
                </h4>

                <p
                    class="${getReliabilityClass(score)}"
                >
                    ${score.toFixed(1)}%
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    Reliability Status
                </h4>

                <p>
                    ${escapeHtml(status)}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    MTBF
                </h4>

                <p>
                    ${escapeHtml(mtbf)}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    MTTR
                </h4>

                <p>
                    ${escapeHtml(mttr)}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    Failure Frequency
                </h4>

                <p>
                    ${escapeHtml(
                        failureFrequency
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    Repair Count
                </h4>

                <p>
                    ${escapeHtml(
                        repairCount
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>
                    Maintenance Count
                </h4>

                <p>
                    ${escapeHtml(
                        maintenanceCount
                    )}
                </p>

            </div>

        </div>


        <div class="info">

            <strong>
                🤖 FuElectric-AI Recommendation
            </strong>

            <p>
                ${escapeHtml(
                    recommendation
                )}
            </p>

        </div>

    `;

}


// ==========================================================
// RELIABILITY SELECTOR CHANGE
// ==========================================================

function handleReliabilityEquipmentChange() {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );

    const result =
        document.getElementById(
            "reliability-detail-result"
        );


    if (!select || !result) {
        return;
    }


    if (!select.value) {

        result.innerHTML = `
            <p>
                Select equipment to view reliability.
            </p>
        `;

        return;

    }


    loadSelectedReliability();

}


// ==========================================================
// INITIALIZE RELIABILITY MODULE
// ==========================================================

function initializeReliabilityAnalytics() {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );


    if (select) {

        // Prevent duplicate listeners.

        select.removeEventListener(
            "change",
            handleReliabilityEquipmentChange
        );

        select.addEventListener(
            "change",
            handleReliabilityEquipmentChange
        );

    }

}

// ==========================================================
// v3.5.4 — HEALTH & RISK INTELLIGENCE
// ==========================================================

async function refreshHealthRiskIntelligence() {

    console.log(
        "Refreshing Health & Risk Intelligence..."
    );

    await Promise.allSettled([

        loadHealthRiskSummary(),

        loadEquipmentRiskRanking(),

        loadDeterioratingEquipment(),

        loadHealthTrendEquipmentSelector()

    ]);

}


// ==========================================================
// v3.5.4 — HEALTH & RISK SUMMARY
// ==========================================================

async function loadHealthRiskSummary() {

    const container =
        document.getElementById(
            "health-risk-summary"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-summary`
            );

        if (!response.ok) {
            throw new Error(
                `Health risk summary failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        container.innerHTML = `

            <div class="dashboard">

                <div class="card">

                    <h3>Total Equipment</h3>

                    <p>
                        ${data.total_equipment ?? 0}
                    </p>

                </div>

                <div class="card">

                    <h3>Average Health</h3>

                    <p>
                        ${
                            data.average_health !== undefined
                            ? `${formatNumber(data.average_health)}%`
                            : "--"
                        }
                    </p>

                </div>

                <div class="card">

                    <h3>Average Risk</h3>

                    <p>
                        ${
                            data.average_risk !== undefined
                            ? `${formatNumber(data.average_risk)}%`
                            : "--"
                        }
                    </p>

                </div>

                <div class="card">

                    <h3>Low Risk</h3>

                    <p>
                        ${data.low_risk ?? 0}
                    </p>

                </div>

                <div class="card">

                    <h3>Medium Risk</h3>

                    <p>
                        ${data.medium_risk ?? 0}
                    </p>

                </div>

                <div class="card">

                    <h3>High Risk</h3>

                    <p>
                        ${data.high_risk ?? 0}
                    </p>

                </div>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Health risk summary error:",
            error
        );

        container.innerHTML = `

            <div class="error">

                ❌ Health & Risk Summary unavailable.

                <br>

                ${escapeHtml(error.message)}

            </div>

        `;

    }

}


// ==========================================================
// v3.5.4 — RISK RANKING
// ==========================================================

async function loadEquipmentRiskRanking() {

    const containers = [

        document.getElementById(
            "equipment-risk-ranking"
        ),

        document.getElementById(
            "risk-ranking-list"
        )

    ].filter(Boolean);

    if (!containers.length) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-ranking`
            );

        if (!response.ok) {
            throw new Error(
                `Risk ranking failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        const ranking =
            data.ranking ||
            data.equipment ||
            data.results ||
            [];

        let html = "";

        if (!ranking.length) {

            html =
                `<div class="info">
                    No equipment risk data available.
                </div>`;

        }
        else {

            html = `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Rank</th>
                                <th>Equipment</th>
                                <th>Health</th>
                                <th>Risk</th>
                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${ranking.map(
                                (item, index) => {

                                    return `

                                        <tr>

                                            <td>
                                                ${index + 1}
                                            </td>

                                            <td>
                                                <strong>
                                                    ${escapeHtml(
                                                        item.equipment_id ??
                                                        item.id ??
                                                        "Unknown"
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                ${
                                                    item.health_score !== undefined
                                                    ? `${formatNumber(item.health_score)}%`
                                                    : "--"
                                                }
                                            </td>

                                            <td>
                                                ${
                                                    item.risk_score !== undefined
                                                    ? `${formatNumber(item.risk_score)}%`
                                                    : "--"
                                                }
                                            </td>

                                            <td>
                                                <span class="badge">
                                                    ${escapeHtml(
                                                        item.risk_level ??
                                                        item.status ??
                                                        "Unknown"
                                                    )}
                                                </span>
                                            </td>

                                        </tr>

                                    `;

                                }
                            ).join("")}

                        </tbody>

                    </table>

                </div>

            `;

        }

        containers.forEach(
            container => {
                container.innerHTML = html;
            }
        );

    }

    catch (error) {

        console.error(
            "Risk ranking error:",
            error
        );

        containers.forEach(
            container => {

                container.innerHTML = `

                    <div class="error">

                        ❌ Unable to load equipment risk ranking.

                        <br>

                        ${escapeHtml(error.message)}

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// v3.5.4 — DETERIORATING EQUIPMENT
// ==========================================================

async function loadDeterioratingEquipment() {

    const containers = [

        document.getElementById(
            "deteriorating-equipment"
        ),

        document.getElementById(
            "deteriorating-equipment-list"
        )

    ].filter(Boolean);

    if (!containers.length) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-deteriorating`
            );

        if (!response.ok) {
            throw new Error(
                `Deteriorating equipment request failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        const equipment =
            data.equipment ||
            data.results ||
            data.deteriorating ||
            [];

        if (!equipment.length) {

            containers.forEach(
                container => {

                    container.innerHTML =
                        `<div class="success">
                            ✅ No deteriorating equipment detected.
                        </div>`;

                }
            );

            return;
        }

        const html = equipment.map(
            item => `

                <div class="maintenance-alert-card">

                    <h4>
                        ⚠️ ${escapeHtml(
                            item.equipment_id ??
                            item.id ??
                            "Unknown Equipment"
                        )}
                    </h4>

                    ${
                        item.name
                        ? `<p>
                            <strong>Name:</strong>
                            ${escapeHtml(item.name)}
                           </p>`
                        : ""
                    }

                    ${
                        item.health_score !== undefined
                        ? `<p>
                            <strong>Health:</strong>
                            ${formatNumber(item.health_score)}%
                           </p>`
                        : ""
                    }

                    ${
                        item.risk_score !== undefined
                        ? `<p>
                            <strong>Risk:</strong>
                            ${formatNumber(item.risk_score)}%
                           </p>`
                        : ""
                    }

                    ${
                        item.trend
                        ? `<p>
                            <strong>Trend:</strong>
                            ${escapeHtml(item.trend)}
                           </p>`
                        : ""
                    }

                </div>

            `
        ).join("");

        containers.forEach(
            container => {
                container.innerHTML = html;
            }
        );

    }

    catch (error) {

        console.error(
            "Deteriorating equipment error:",
            error
        );

        containers.forEach(
            container => {

                container.innerHTML = `

                    <div class="error">

                        ❌ Unable to load deteriorating equipment.

                        <br>

                        ${escapeHtml(error.message)}

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// v3.5.4 — HEALTH TREND EQUIPMENT SELECTOR
// ==========================================================

async function loadHealthTrendEquipmentSelector() {

    const selectors = [

        document.getElementById(
            "health-trend-equipment-select"
        ),

        document.getElementById(
            "health-trend-equipment"
        )

    ].filter(Boolean);

    if (!selectors.length) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/equipment`
            );

        if (!response.ok) {
            throw new Error(
                `Equipment request failed: ${response.status}`
            );
        }

        const equipment =
            await response.json();

        selectors.forEach(
            selector => {

                selector.innerHTML = `
                    <option value="">
                        Select Equipment
                    </option>
                `;

                equipment.forEach(item => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        item.equipment_id;

                    option.textContent =
                        `${item.equipment_id} — ${item.name}`;

                    selector.appendChild(option);

                });

            }
        );

    }

    catch (error) {

        console.error(
            "Health trend selector error:",
            error
        );

    }

}


// ==========================================================
// v3.5.4 — EQUIPMENT HEALTH TREND
// ==========================================================

async function loadEquipmentTrend() {

    const selector =
        document.getElementById(
            "health-trend-equipment"
        );

    const result =
        document.getElementById(
            "health-trend-result"
        );

    if (!selector || !result) {
        return;
    }

    const equipmentId =
        selector.value;

    if (!equipmentId) {

        result.innerHTML =
            `<p>Select equipment.</p>`;

        return;

    }

    result.innerHTML =
        `<div class="info">
            Loading health trend...
        </div>`;

    try {

        const response =
            await fetch(
                `${API_URL}/equipment/${encodeURIComponent(
                    equipmentId
                )}/health-trend`
            );

        if (!response.ok) {

            throw new Error(
                `Health trend request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Equipment Health Trend:",
            data
        );

        const trend =
            data.trend ||
            data.history ||
            data.data ||
            [];

        if (!Array.isArray(trend) ||
            trend.length === 0) {

            result.innerHTML =
                `<div class="info">
                    No health trend data available for this equipment.
                </div>`;

            return;

        }

        result.innerHTML = `

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Date</th>
                            <th>Health Score</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${trend.map(
                            item => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            item.date ??
                                            item.timestamp ??
                                            item.recorded_at ??
                                            "--"
                                        )}
                                    </td>

                                    <td>
                                        ${
                                            item.health_score !== undefined
                                            ? `${formatNumber(item.health_score)}%`
                                            : "--"
                                        }
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            item.status ??
                                            getHealthStatus(
                                                item.health_score
                                            )
                                        )}
                                    </td>

                                </tr>

                            `
                        ).join("")}

                    </tbody>

                </table>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Health trend error:",
            error
        );

        result.innerHTML = `

            <div class="error">

                ❌ Unable to load equipment health trend.

                <br>

                ${escapeHtml(error.message)}

            </div>

        `;

    }

}

// ==========================================================
// HELPERS
// ==========================================================

function setElementText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function formatNumber(
    value
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number.toFixed(1)
        : "0.0";

}


function getReliabilityStatus(
    score
) {

    const value =
        Number(score);

    if (value >= 90) {
        return "Highly Reliable";
    }

    if (value >= 75) {
        return "Reliable";
    }

    if (value >= 50) {
        return "Moderate";
    }

    return "Low Reliability";

}


function getHealthStatus(
    score
) {

    const value =
        Number(score);

    if (value >= 90) {
        return "Excellent";
    }

    if (value >= 75) {
        return "Good";
    }

    if (value >= 50) {
        return "Fair";
    }

    return "Poor";

}

// ==========================================================
// START INTELLIGENCE LAYER
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeReliabilityAndRiskIntelligence();

    }
);

// ==========================================================
// v3.5.3 + v3.5.4 INITIALIZATION
// ==========================================================

async function initializeReliabilityAndRiskIntelligence() {

    console.log(
        "FuElectric-AI v3.5.3/v3.5.4 Intelligence initializing..."
    );

    await Promise.allSettled([

        loadReliabilityAnalytics(),

        refreshHealthRiskIntelligence()

    ]);

    initializeReliabilityAnalytics();

    console.log(
        "FuElectric-AI v3.5.3/v3.5.4 Intelligence ready."
    );

}