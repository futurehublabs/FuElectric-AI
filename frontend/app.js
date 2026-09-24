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

// ==========================================================
// v3.5.4 — HISTORICAL EQUIPMENT CONDITION INTELLIGENCE
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

        result.innerHTML = `
            <div class="info">
                Select equipment to view its historical condition.
            </div>
        `;

        return;
    }

    result.innerHTML = `
        <div class="info">
            Loading historical equipment condition...
        </div>
    `;

    try {

        // --------------------------------------------------
        // V3.5.4 HISTORICAL HEALTH-RISK ENDPOINT
        // --------------------------------------------------

        const response =
            await fetch(
                `${API_URL}/health-risk-history/${encodeURIComponent(
                    equipmentId
                )}?months=3`
            );

        if (!response.ok) {

            throw new Error(
                `Historical health request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Equipment Historical Health Intelligence:",
            data
        );

        // --------------------------------------------------
        // MONTHLY HISTORY
        // --------------------------------------------------

        const monthlyHistory =
            Array.isArray(data.monthly_history)
                ? data.monthly_history
                : [];

        // --------------------------------------------------
        // BUILD MONTHLY HISTORY TABLE
        // --------------------------------------------------

        const historyRows =
            monthlyHistory.map(
                month => {

                    const condition =
                        month.condition ??
                        "Unknown";

                    const trend =
                        month.trend ??
                        "No Data";

                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        month.month ?? "--"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${
                                    month.health_score !== undefined
                                    ? `${formatNumber(
                                        month.health_score
                                    )}%`
                                    : "--"
                                }
                            </td>

                            <td>
                                ${
                                    month.risk_score !== undefined
                                    ? `${formatNumber(
                                        month.risk_score
                                    )}%`
                                    : "--"
                                }
                            </td>

                            <td>
                                ${escapeHtml(condition)}
                            </td>

                            <td>
                                ${escapeHtml(trend)}
                            </td>

                            <td>
                                ${month.repair_count ?? 0}
                            </td>

                            <td>
                                ${month.maintenance_count ?? 0}
                            </td>

                        </tr>

                    `;

                }
            ).join("");

        // --------------------------------------------------
        // IMMEDIATE ACTIONS
        // --------------------------------------------------

        const immediateActions =
            Array.isArray(data.immediate_actions)
                ? data.immediate_actions
                : [];

        const immediateActionsHtml =
            immediateActions.length

            ? `
                <ul>

                    ${immediateActions.map(
                        action => `

                            <li>
                                ${escapeHtml(action)}
                            </li>

                        `
                    ).join("")}

                </ul>
              `

            : `
                <p>
                    No immediate actions identified.
                </p>
              `;

        // --------------------------------------------------
        // RECOMMENDATIONS
        // --------------------------------------------------

        const recommendations =
            Array.isArray(data.recommendations)
                ? data.recommendations
                : [];

        const recommendationsHtml =
            recommendations.length

            ? `
                <ul>

                    ${recommendations.map(
                        recommendation => `

                            <li>
                                ${escapeHtml(
                                    recommendation
                                )}
                            </li>

                        `
                    ).join("")}

                </ul>
              `

            : `
                <p>
                    No additional recommendations.
                </p>
              `;

        // --------------------------------------------------
        // RENDER COMPLETE HISTORICAL INTELLIGENCE
        // --------------------------------------------------

        result.innerHTML = `

            <div class="dashboard">

                <!-- ====================================== -->
                <!-- CURRENT CONDITION -->
                <!-- ====================================== -->

                <div class="card">

                    <h3>
                        Current Health
                    </h3>

                    <p>
                        <strong>
                            ${
                                data.current_health_score !== undefined
                                ? `${formatNumber(
                                    data.current_health_score
                                )}%`
                                : "--"
                            }
                        </strong>
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Current Risk
                    </h3>

                    <p>
                        <strong>
                            ${
                                data.current_risk_score !== undefined
                                ? `${formatNumber(
                                    data.current_risk_score
                                )}%`
                                : "--"
                            }
                        </strong>
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Overall Trend
                    </h3>

                    <p>
                        <strong>
                            ${escapeHtml(
                                data.overall_trend ??
                                "Unknown"
                            )}
                        </strong>
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Period
                    </h3>

                    <p>
                        Last
                        ${data.period_months ?? 3}
                        months
                    </p>

                </div>

            </div>


            <!-- ========================================== -->
            <!-- EQUIPMENT OVERVIEW -->
            <!-- ========================================== -->

            <div class="card">

                <h3>
                    📊 Historical Condition Overview
                </h3>

                <p>
                    ${escapeHtml(
                        data.overview ??
                        "No historical overview available."
                    )}
                </p>

            </div>


            <!-- ========================================== -->
            <!-- MONTHLY HISTORY -->
            <!-- ========================================== -->

            <div class="card">

                <h3>
                    📅 Monthly Equipment Condition
                </h3>

                ${
                    historyRows

                    ? `

                        <div class="table-container">

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            Month
                                        </th>

                                        <th>
                                            Health
                                        </th>

                                        <th>
                                            Risk
                                        </th>

                                        <th>
                                            Condition
                                        </th>

                                        <th>
                                            Trend
                                        </th>

                                        <th>
                                            Repairs
                                        </th>

                                        <th>
                                            Maintenance
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    ${historyRows}

                                </tbody>

                            </table>

                        </div>

                      `

                    : `
                        <div class="info">
                            No monthly history available.
                        </div>
                      `
                }

            </div>


            <!-- ========================================== -->
            <!-- IMMEDIATE ACTIONS -->
            <!-- ========================================== -->

            <div class="card">

                <h3>
                    🚨 Immediate Actions
                </h3>

                ${immediateActionsHtml}

            </div>


            <!-- ========================================== -->
            <!-- RECOMMENDATIONS -->
            <!-- ========================================== -->

            <div class="card">

                <h3>
                    💡 FuElectric-AI Recommendations
                </h3>

                ${recommendationsHtml}

            </div>


            <!-- ========================================== -->
            <!-- ACTIVITY SUMMARY -->
            <!-- ========================================== -->

            <div class="card">

                <h3>
                    🔧 Activity Summary
                </h3>

                <p>
                    <strong>
                        Total Repairs:
                    </strong>

                    ${data.total_repairs ?? 0}
                </p>

                <p>
                    <strong>
                        Total Maintenance:
                    </strong>

                    ${data.total_maintenance ?? 0}
                </p>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Historical equipment condition error:",
            error
        );

        result.innerHTML = `

            <div class="error">

                ❌ Unable to load historical equipment condition.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

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

       initializeHealthTrendSelector();

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
        loadHealthTrendEquipmentSelector(),
        loadDeterioratingEquipment()
    ]);

}

// ----------------------------------------------------------
// REFRESH v3.5.4
// ----------------------------------------------------------

async function refreshHealthRiskIntelligence() {

    await loadHealthRiskIntelligence();

    const selector =
        document.getElementById(
            "health-risk-equipment-select"
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
// v3.5.4 — HEALTH TREND SELECTOR
// ==========================================================

function initializeHealthTrendSelector() {

    const selector =
        document.getElementById(
            "health-trend-equipment-select"
        );

    if (!selector) {

        console.warn(
            "⚠️ Health trend selector not found."
        );

        return;
    }

    selector.onchange =
        loadEquipmentHealthTrend;

    console.log(
        "✅ Health trend selector initialized."
    );
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
// FuElectric-AI
// v3.5.3 + v3.5.4 INTELLIGENCE LAYER
// CLEAN INTEGRATED FRONTEND
// ==========================================================
//
// v3.5.3 — EQUIPMENT RELIABILITY ANALYTICS
// v3.5.4 — HEALTH & RISK INTELLIGENCE
//
// IMPORTANT:
// This is the SINGLE final intelligence block.
// It replaces all previous v3.5.3 / v3.5.4 intelligence
// blocks from line 5200 to the end of app.js.
//
// EXISTING HTML IDS SUPPORTED:
//
// Reliability:
//   reliability-ranking-list
//   reliability-total-equipment
//   reliability-average-score
//   reliability-highly-reliable
//   reliability-reliable
//   reliability-moderate
//   reliability-low
//   reliability-equipment-select
//   reliability-detail-result
//
// Health:
//   equipment-health-select
//   health-trend-result
//   health-risk-summary
//   equipment-risk-ranking
//   risk-ranking-list
//   deteriorating-equipment
//   deteriorating-equipment-list
//
// BACKEND ENDPOINTS:
//
// v3.5.3
// GET /reliability
// GET /reliability/summary
//
// v3.5.4
// GET /health-risk-summary
// GET /health-risk-ranking
// GET /health-risk-deteriorating
// GET /health-risk-history/{equipment_id}?months=3
//
// ==========================================================


// ==========================================================
// GLOBAL INTELLIGENCE STATE
// ==========================================================

let reliabilityData = [];

let reliabilitySummaryData = {};


// ==========================================================
// COMMON HELPERS
// ==========================================================

function intelligenceSetText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function intelligenceFormatNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number.toFixed(1)
        : "0.0";

}


function intelligenceGetReliabilityScore(item) {

    if (!item) {
        return 0;
    }

    return Number(
        item.reliability_score ??
        item.reliability ??
        item.score ??
        0
    );

}


function intelligenceGetReliabilityStatus(item) {

    if (!item) {
        return "Unknown";
    }

    const score =
        intelligenceGetReliabilityScore(item);

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


function intelligenceGetReliabilityClass(score) {

    const value =
        Number(score);

    if (value >= 75) {
        return "reliability-high";
    }

    if (value >= 50) {
        return "reliability-moderate";
    }

    return "reliability-low";

}


// ==========================================================
// v3.5.3
// RELIABILITY ANALYTICS
// ==========================================================

async function loadReliabilityAnalytics() {

    const rankingContainer =
        document.getElementById(
            "reliability-ranking-list"
        );

    try {

        const response =
            await fetch(
                `${API_URL}/reliability`
            );

        if (!response.ok) {

            throw new Error(
                `Reliability request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "✅ v3.5.3 Reliability Analytics:",
            data
        );


        // --------------------------------------------------
        // NORMALIZE RELIABILITY DATA
        // --------------------------------------------------

        reliabilityData =
            Array.isArray(data)
                ? data
                : (
                    data.equipment ??
                    data.reliability ??
                    data.results ??
                    data.ranking ??
                    []
                );


        if (!Array.isArray(reliabilityData)) {
            reliabilityData = [];
        }


        // --------------------------------------------------
        // LOAD RELIABILITY SUMMARY
        // --------------------------------------------------

        try {

            const summaryResponse =
                await fetch(
                    `${API_URL}/reliability/summary`
                );

            if (!summaryResponse.ok) {

                throw new Error(
                    `Reliability summary failed: ${summaryResponse.status}`
                );

            }

            reliabilitySummaryData =
                await summaryResponse.json();

            console.log(
                "✅ v3.5.3 Reliability Summary:",
                reliabilitySummaryData
            );

        }

        catch (summaryError) {

            console.warn(
                "⚠️ Reliability summary unavailable:",
                summaryError
            );

            reliabilitySummaryData = {};

        }


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        renderReliabilitySummary(
            reliabilitySummaryData,
            reliabilityData
        );


        renderReliabilityRanking(
            reliabilityData
        );


        populateReliabilitySelector(
            reliabilityData
        );


        initializeReliabilityAnalytics();


    }

    catch (error) {

        console.error(
            "❌ Reliability analytics error:",
            error
        );

        if (rankingContainer) {

            rankingContainer.innerHTML = `

                <div class="error">

                    ❌ Unable to load reliability analytics.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            `;

        }

    }

}


// ==========================================================
// v3.5.3
// RELIABILITY SUMMARY
// ==========================================================

function renderReliabilitySummary(
    summary,
    equipment
) {

    summary =
        summary || {};

    equipment =
        Array.isArray(equipment)
            ? equipment
            : [];


    const totalEquipment =
        summary.total_equipment ??
        summary.total ??
        equipment.length;


    let averageScore =
        summary.average_reliability ??
        summary.average_reliability_score ??
        summary.average_score;


    if (
        averageScore === undefined ||
        averageScore === null
    ) {

        if (equipment.length > 0) {

            const totalScore =
                equipment.reduce(
                    (sum, item) =>
                        sum +
                        intelligenceGetReliabilityScore(item),
                    0
                );

            averageScore =
                totalScore /
                equipment.length;

        }

        else {

            averageScore = 0;

        }

    }


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


        equipment.forEach(
            item => {

                const score =
                    intelligenceGetReliabilityScore(item);

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

            }
        );

    }


    intelligenceSetText(
        "reliability-total-equipment",
        totalEquipment
    );


    intelligenceSetText(
        "reliability-average-score",
        `${Number(
            averageScore
        ).toFixed(1)}%`
    );


    intelligenceSetText(
        "reliability-highly-reliable",
        highlyReliable
    );


    intelligenceSetText(
        "reliability-reliable",
        reliable
    );


    intelligenceSetText(
        "reliability-moderate",
        moderate
    );


    intelligenceSetText(
        "reliability-low",
        low
    );

}


// ==========================================================
// v3.5.3
// RELIABILITY RANKING
// ==========================================================

function renderReliabilityRanking(
    equipment
) {

    const container =
        document.getElementById(
            "reliability-ranking-list"
        );


    if (!container) {
        return;
    }


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


    const ranked =
        [...equipment].sort(
            (a, b) =>
                intelligenceGetReliabilityScore(b) -
                intelligenceGetReliabilityScore(a)
        );


    container.innerHTML = `

        <div class="table-container">

            <table class="reliability-table">

                <thead>

                    <tr>

                        <th>Rank</th>
                        <th>Equipment</th>
                        <th>Reliability</th>
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
                                intelligenceGetReliabilityScore(
                                    item
                                );

                            const status =
                                intelligenceGetReliabilityStatus(
                                    item
                                );

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
                                                String(
                                                    equipmentName
                                                )
                                            )}
                                        </strong>

                                        <br>

                                        <small>
                                            ${escapeHtml(
                                                String(
                                                    equipmentId
                                                )
                                            )}
                                        </small>

                                    </td>

                                    <td>

                                        <span
                                            class="reliability-score ${intelligenceGetReliabilityClass(
                                                score
                                            )}"
                                        >

                                            ${intelligenceFormatNumber(
                                                score
                                            )}%

                                        </span>

                                    </td>

                                    <td>

                                        <span
                                            class="${intelligenceGetReliabilityClass(
                                                score
                                            )}"
                                        >

                                            ${escapeHtml(
                                                String(
                                                    status
                                                )
                                            )}

                                        </span>

                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            String(mtbf)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            String(mttr)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            String(
                                                failureFrequency
                                            )
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
// v3.5.3
// RELIABILITY SELECTOR
// ==========================================================

function populateReliabilitySelector(
    equipment
) {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );


    if (!select) {
        return;
    }


    const previousValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Select Equipment
        </option>

    `;


    if (!Array.isArray(equipment)) {
        return;
    }


    equipment.forEach(
        item => {

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
                document.createElement(
                    "option"
                );


            option.value =
                equipmentId;


            option.textContent =
                `${equipmentName} (${equipmentId})`;


            select.appendChild(
                option
            );

        }
    );


    if (
        previousValue &&
        [...select.options].some(
            option =>
                option.value ===
                previousValue
        )
    ) {

        select.value =
            previousValue;

    }

}


// ==========================================================
// v3.5.3
// SELECTED RELIABILITY
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

            <div class="info">

                Select equipment to view reliability.

            </div>

        `;

        return;

    }


    const item =
        reliabilityData.find(
            equipment =>
                String(
                    equipment.equipment_id ??
                    equipment.id
                ) ===
                String(equipmentId)
        );


    if (!item) {

        result.innerHTML = `

            <div class="error">

                Reliability data for
                ${escapeHtml(
                    equipmentId
                )}
                was not found.

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
// v3.5.3
// RENDER SELECTED RELIABILITY
// ==========================================================

function renderSelectedReliability(
    item,
    container
) {

    const score =
        intelligenceGetReliabilityScore(item);

    const status =
        intelligenceGetReliabilityStatus(item);

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
        item.total_repairs ??
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

                <h4>Equipment</h4>

                <p>
                    ${escapeHtml(
                        String(
                            equipmentName
                        )
                    )}
                </p>

                <small>
                    ${escapeHtml(
                        String(
                            equipmentId
                        )
                    )}
                </small>

            </div>


            <div class="reliability-detail-card">

                <h4>Reliability Score</h4>

                <p
                    class="${intelligenceGetReliabilityClass(
                        score
                    )}"
                >

                    ${intelligenceFormatNumber(
                        score
                    )}%

                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>Reliability Status</h4>

                <p>
                    ${escapeHtml(
                        String(status)
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>MTBF</h4>

                <p>
                    ${escapeHtml(
                        String(mtbf)
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>MTTR</h4>

                <p>
                    ${escapeHtml(
                        String(mttr)
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>Failure Frequency</h4>

                <p>
                    ${escapeHtml(
                        String(
                            failureFrequency
                        )
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>Repair Count</h4>

                <p>
                    ${escapeHtml(
                        String(
                            repairCount
                        )
                    )}
                </p>

            </div>


            <div class="reliability-detail-card">

                <h4>Maintenance Count</h4>

                <p>
                    ${escapeHtml(
                        String(
                            maintenanceCount
                        )
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
                    String(
                        recommendation
                    )
                )}
            </p>

        </div>

    `;

}


// ==========================================================
// v3.5.3
// RELIABILITY INITIALIZATION
// ==========================================================

function initializeReliabilityAnalytics() {

    const select =
        document.getElementById(
            "reliability-equipment-select"
        );


    if (!select) {
        return;
    }


    select.onchange =
        loadSelectedReliability;

}


// ==========================================================
// v3.5.4
// HEALTH & RISK SUMMARY
// ==========================================================

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

            Loading Health & Risk Intelligence...

        </div>

    `;


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


        console.log(
            "✅ v3.5.4 Health Risk Summary:",
            data
        );


        const totalEquipment =
            data.total_equipment ??
            data.total ??
            0;

        const averageHealth =
            data.average_health_score ??
            data.average_health ??
            0;

        const averageRisk =
            data.average_risk_score ??
            data.average_risk ??
            0;


        container.innerHTML = `

            <div class="dashboard">

                <div class="card">

                    <h3>
                        Total Equipment
                    </h3>

                    <p>
                        ${totalEquipment}
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Average Health
                    </h3>

                    <p>
                        ${intelligenceFormatNumber(
                            averageHealth
                        )}%
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Average Risk
                    </h3>

                    <p>
                        ${intelligenceFormatNumber(
                            averageRisk
                        )}%
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Low Risk
                    </h3>

                    <p>
                        ${data.low_risk ?? 0}
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Medium Risk
                    </h3>

                    <p>
                        ${data.medium_risk ?? 0}
                    </p>

                </div>


                <div class="card">

                    <h3>
                        High Risk
                    </h3>

                    <p>
                        ${data.high_risk ?? 0}
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Critical Risk
                    </h3>

                    <p>
                        ${
                            data.critical_risk ??
                            data.critical_risk_equipment ??
                            0
                        }
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Healthy Equipment
                    </h3>

                    <p>
                        ${
                            data.healthy_equipment ??
                            data.healthy ??
                            0
                        }
                    </p>

                </div>


                <div class="card">

                    <h3>
                        Deteriorating
                    </h3>

                    <p>
                        ${
                            data.deteriorating ??
                            data.deteriorating_equipment ??
                            0
                        }
                    </p>

                </div>

            </div>


            <details>

                <summary>
                    View health & risk data
                </summary>

                <pre>
${escapeHtml(
    JSON.stringify(
        data,
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

                ❌ Unable to load Health & Risk Summary.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


// ==========================================================
// v3.5.4
// EQUIPMENT RISK RANKING
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


        console.log(
            "✅ v3.5.4 Health Risk Ranking:",
            data
        );


        const ranking =
            Array.isArray(data)
                ? data
                : (
                    data.ranking ??
                    data.equipment ??
                    data.results ??
                    []
                );


        if (
            !Array.isArray(ranking) ||
            ranking.length === 0
        ) {

            const emptyHtml = `

                <div class="info">

                    No equipment risk data available.

                </div>

            `;


            containers.forEach(
                container => {
                    container.innerHTML =
                        emptyHtml;
                }
            );


            return;

        }


        const html = `

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

                                const equipmentId =
                                    item.equipment_id ??
                                    item.id ??
                                    "Unknown";

                                const equipmentName =
                                    item.equipment_name ??
                                    item.name ??
                                    equipmentId;

                                const healthScore =
                                    item.health_score ??
                                    item.health;

                                const riskScore =
                                    item.risk_score ??
                                    item.risk;

                                const riskLevel =
                                    item.risk_level ??
                                    item.status ??
                                    "Unknown";


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
                                                    String(
                                                        equipmentName
                                                    )
                                                )}
                                            </strong>

                                            <br>

                                            <small>
                                                ${escapeHtml(
                                                    String(
                                                        equipmentId
                                                    )
                                                )}
                                            </small>

                                        </td>


                                        <td>

                                            ${
                                                healthScore !==
                                                undefined &&
                                                healthScore !==
                                                null

                                                    ? `${intelligenceFormatNumber(
                                                        healthScore
                                                    )}%`

                                                    : "--"
                                            }

                                        </td>


                                        <td>

                                            ${
                                                riskScore !==
                                                undefined &&
                                                riskScore !==
                                                null

                                                    ? `${intelligenceFormatNumber(
                                                        riskScore
                                                    )}%`

                                                    : "--"
                                            }

                                        </td>


                                        <td>

                                            <span class="badge">

                                                ${escapeHtml(
                                                    String(
                                                        riskLevel
                                                    )
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


        containers.forEach(
            container => {

                container.innerHTML =
                    html;

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

                        <br><br>

                        ${escapeHtml(
                            error.message
                        )}

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// v3.5.4
// DETERIORATING EQUIPMENT
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


        console.log(
            "✅ v3.5.4 Deteriorating Equipment:",
            data
        );


        const equipment =
            Array.isArray(data)
                ? data
                : (
                    data.equipment ??
                    data.deteriorating ??
                    data.results ??
                    data.deteriorating_equipment ??
                    []
                );


        if (
            !Array.isArray(equipment) ||
            equipment.length === 0
        ) {

            const successHtml = `

                <div class="success">

                    ✅ No deteriorating equipment detected.

                </div>

            `;


            containers.forEach(
                container => {
                    container.innerHTML =
                        successHtml;
                }
            );


            return;

        }


        const html =
            equipment.map(
                item => {

                    const equipmentId =
                        item.equipment_id ??
                        item.id ??
                        "Unknown Equipment";

                    const name =
                        item.name ??
                        item.equipment_name;

                    const health =
                        item.health_score ??
                        item.health;

                    const risk =
                        item.risk_score ??
                        item.risk;

                    const trend =
                        item.trend ??
                        item.health_trend ??
                        "Deteriorating";


                    return `

                        <div class="maintenance-alert-card">

                            <h4>

                                ⚠️
                                ${escapeHtml(
                                    String(
                                        equipmentId
                                    )
                                )}

                            </h4>


                            ${
                                name
                                    ? `
                                        <p>

                                            <strong>
                                                Name:
                                            </strong>

                                            ${escapeHtml(
                                                String(name)
                                            )}

                                        </p>
                                    `
                                    : ""
                            }


                            ${
                                health !==
                                undefined &&
                                health !==
                                null

                                    ? `
                                        <p>

                                            <strong>
                                                Health:
                                            </strong>

                                            ${intelligenceFormatNumber(
                                                health
                                            )}%

                                        </p>
                                    `
                                    : ""
                            }


                            ${
                                risk !==
                                undefined &&
                                risk !==
                                null

                                    ? `
                                        <p>

                                            <strong>
                                                Risk:
                                            </strong>

                                            ${intelligenceFormatNumber(
                                                risk
                                            )}%

                                        </p>
                                    `
                                    : ""
                            }


                            <p>

                                <strong>
                                    Trend:
                                </strong>

                                ${escapeHtml(
                                    String(
                                        trend
                                    )
                                )}

                            </p>

                        </div>

                    `;

                }
            ).join("");


        containers.forEach(
            container => {

                container.innerHTML =
                    html;

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

                        <br><br>

                        ${escapeHtml(
                            error.message
                        )}

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// v3.5.4
// HEALTH EQUIPMENT SELECTOR
//
// IMPORTANT:
// Your actual HTML uses:
//
// <select id="equipment-health-select">
//
// Therefore this function uses THAT ID.
// ==========================================================

async function loadHealthTrendEquipmentSelector() {

        const selector =
        document.getElementById(
            "health-risk-equipment-select"
        );


    if (!selector) {

        console.warn(
            "⚠️ equipment-health-select not found."
        );

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


        const data =
            await response.json();


        const equipment =
            Array.isArray(data)
                ? data
                : (
                    data.equipment ??
                    data.results ??
                    []
                );


        const previousValue =
            selector.value;


        selector.innerHTML = `

            <option value="">
                Select Equipment
            </option>

        `;


        equipment.forEach(
            item => {

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
                    document.createElement(
                        "option"
                    );


                option.value =
                    equipmentId;


                option.textContent =
                    `${equipmentName} (${equipmentId})`;


                selector.appendChild(
                    option
                );

            }
        );


        if (
            previousValue &&
            [...selector.options].some(
                option =>
                    option.value ===
                    previousValue
            )
        ) {

            selector.value =
                previousValue;

        }


        console.log(
            "✅ Health equipment selector populated."
        );

    }

    catch (error) {

        console.error(
            "Health equipment selector error:",
            error
        );


        selector.innerHTML = `

            <option value="">
                Unable to load equipment
            </option>

        `;

    }

}


// ==========================================================
// v3.5.4
// HEALTH TREND ANALYZE BUTTON
//
// This creates the button automatically after the existing
// equipment-health-select selector.
//
// Result:
// [ Select Equipment ]
// [ 📈 Analyze Health Trend ]
// ==========================================================

function initializeHealthTrendAnalyzeButton() {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    if (!selector) {

        console.warn(
            "⚠️ Health selector not found."
        );

        return;

    }


    let button =
    document.getElementById(
        "analyze-health-trend-btn"
    );


    if (!button) {

        button =
            document.createElement(
                "button"
            );


        button.id =
            "analyze-health-trend-button";


        button.type =
            "button";


        button.textContent =
            "📈 Analyze Health Trend";


        button.style.marginTop =
            "10px";


        button.style.cursor =
            "pointer";


        selector.insertAdjacentElement(
            "afterend",
            button
        );

    }


    button.onclick =
        loadEquipmentHealthTrend;


    console.log(
        "✅ Analyze Health Trend button initialized."
    );

}


// ==========================================================
// v3.5.4
// HEALTH TREND RESULT CONTAINER
// ==========================================================

function ensureHealthTrendResultContainer() {

    const existing =
        document.getElementById(
            "health-trend-result"
        );


    if (existing) {
        return existing;
    }


    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    if (!selector) {
        return null;
    }


    const result =
        document.createElement(
            "div"
        );


    result.id =
        "health-trend-result";


    result.style.marginTop =
        "20px";


    result.innerHTML = `

        <div class="info">

            Select equipment to view health trend.

        </div>

    `;


    selector.parentNode.appendChild(
        result
    );


    return result;

}


// ==========================================================
// v3.5.4
// LOAD SELECTED EQUIPMENT HEALTH TREND
// ==========================================================

async function loadEquipmentHealthTrend() {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    const result =
        ensureHealthTrendResultContainer();


    if (!selector || !result) {

        console.warn(
            "⚠️ Health trend selector/result unavailable."
        );

        return;

    }


    const equipmentId =
        selector.value;


    if (!equipmentId) {

        result.innerHTML = `

            <div class="info">

                Select equipment to view health trend.

            </div>

        `;

        return;

    }


    result.innerHTML = `

        <div class="info">

            📈 Loading health trend for
            <strong>
                ${escapeHtml(
                    equipmentId
                )}
            </strong>...

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/health-risk-history/${encodeURIComponent(
                    equipmentId
                )}?months=3`
            );


        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                errorData.detail ??
                `Health trend request failed: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "✅ v3.5.4 Equipment Health Trend:",
            data
        );


        // --------------------------------------------------
        // CURRENT VALUES
        // --------------------------------------------------

        const currentHealth =
            data.current_health_score ??
            data.health_score ??
            data.current_health;

        const currentRisk =
            data.current_risk_score ??
            data.risk_score ??
            data.current_risk;

        const overallTrend =
            data.overall_trend ??
            data.trend ??
            "Unknown";

        const periodMonths =
            data.period_months ??
            3;


        // --------------------------------------------------
        // MONTHLY HISTORY
        // --------------------------------------------------

        const monthlyHistory =
            Array.isArray(
                data.monthly_history
            )
                ? data.monthly_history
                : [];


        let historyHtml = "";


        if (monthlyHistory.length > 0) {

            historyHtml = `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Month</th>
                                <th>Health</th>
                                <th>Risk</th>
                                <th>Condition</th>
                                <th>Trend</th>
                                <th>Repairs</th>
                                <th>Maintenance</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${monthlyHistory.map(
                                month => {

                                    const health =
                                        month.health_score ??
                                        month.health;

                                    const risk =
                                        month.risk_score ??
                                        month.risk;

                                    const repairs =
                                        month.repair_count ??
                                        month.repairs ??
                                        0;

                                    const maintenance =
                                        month.maintenance_count ??
                                        month.maintenance ??
                                        0;


                                    return `

                                        <tr>

                                            <td>

                                                <strong>
                                                    ${escapeHtml(
                                                        String(
                                                            month.month ??
                                                            "--"
                                                        )
                                                    )}
                                                </strong>

                                            </td>


                                            <td>

                                                ${
                                                    health !==
                                                    undefined &&
                                                    health !==
                                                    null

                                                        ? `${intelligenceFormatNumber(
                                                            health
                                                        )}%`

                                                        : "--"
                                                }

                                            </td>


                                            <td>

                                                ${
                                                    risk !==
                                                    undefined &&
                                                    risk !==
                                                    null

                                                        ? `${intelligenceFormatNumber(
                                                            risk
                                                        )}%`

                                                        : "--"
                                                }

                                            </td>


                                            <td>

                                                ${escapeHtml(
                                                    String(
                                                        month.condition ??
                                                        "Unknown"
                                                    )
                                                )}

                                            </td>


                                            <td>

                                                ${escapeHtml(
                                                    String(
                                                        month.trend ??
                                                        "No Data"
                                                    )
                                                )}

                                            </td>


                                            <td>
                                                ${repairs}
                                            </td>


                                            <td>
                                                ${maintenance}
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

        else {

            historyHtml = `

                <div class="info">

                    No monthly historical data available
                    for this equipment yet.

                </div>

            `;

        }


        // --------------------------------------------------
        // IMMEDIATE ACTIONS
        // --------------------------------------------------

        const immediateActions =
            Array.isArray(
                data.immediate_actions
            )
                ? data.immediate_actions
                : [];


        const immediateActionsHtml =
            immediateActions.length > 0

                ? `

                    <ul>

                        ${immediateActions.map(
                            action => `

                                <li>
                                    ${escapeHtml(
                                        String(
                                            action
                                        )
                                    )}
                                </li>

                            `
                        ).join("")}

                    </ul>

                `

                : `

                    <p>
                        No immediate actions identified.
                    </p>

                `;


        // --------------------------------------------------
        // RECOMMENDATIONS
        // --------------------------------------------------

        const recommendations =
            Array.isArray(
                data.recommendations
            )
                ? data.recommendations
                : [];


        const recommendationsHtml =
            recommendations.length > 0

                ? `

                    <ul>

                        ${recommendations.map(
                            recommendation => `

                                <li>
                                    ${escapeHtml(
                                        String(
                                            recommendation
                                        )
                                    )}
                                </li>

                            `
                        ).join("")}

                    </ul>

                `

                : `

                    <p>
                        No additional recommendations.
                    </p>

                `;


        // --------------------------------------------------
        // RENDER HEALTH TREND
        // --------------------------------------------------

        result.innerHTML = `

            <div class="dashboard">

                <div class="card">

                    <h3>
                        ❤️ Current Health
                    </h3>

                    <p>

                        <strong>

                            ${
                                currentHealth !==
                                undefined &&
                                currentHealth !==
                                null

                                    ? `${intelligenceFormatNumber(
                                        currentHealth
                                    )}%`

                                    : "--"
                            }

                        </strong>

                    </p>

                </div>


                <div class="card">

                    <h3>
                        ⚠️ Current Risk
                    </h3>

                    <p>

                        <strong>

                            ${
                                currentRisk !==
                                undefined &&
                                currentRisk !==
                                null

                                    ? `${intelligenceFormatNumber(
                                        currentRisk
                                    )}%`

                                    : "--"
                            }

                        </strong>

                    </p>

                </div>


                <div class="card">

                    <h3>
                        📈 Overall Trend
                    </h3>

                    <p>

                        <strong>

                            ${escapeHtml(
                                String(
                                    overallTrend
                                )
                            )}

                        </strong>

                    </p>

                </div>


                <div class="card">

                    <h3>
                        📅 Analysis Period
                    </h3>

                    <p>

                        Last
                        ${periodMonths}
                        months

                    </p>

                </div>

            </div>


            <div class="card">

                <h3>
                    📊 Historical Condition Overview
                </h3>

                <p>

                    ${escapeHtml(
                        String(
                            data.overview ??
                            "Historical equipment condition analysis generated by FuElectric-AI."
                        )
                    )}

                </p>

            </div>


            <div class="card">

                <h3>
                    📅 Monthly Equipment Condition
                </h3>

                ${historyHtml}

            </div>


            <div class="card">

                <h3>
                    🚨 Immediate Actions
                </h3>

                ${immediateActionsHtml}

            </div>


            <div class="card">

                <h3>
                    🤖 FuElectric-AI Recommendations
                </h3>

                ${recommendationsHtml}

            </div>


            <div class="card">

                <h3>
                    🔧 Equipment Activity
                </h3>

                <p>

                    <strong>
                        Total Repairs:
                    </strong>

                    ${
                        data.total_repairs ??
                        0
                    }

                </p>


                <p>

                    <strong>
                        Total Maintenance:
                    </strong>

                    ${
                        data.total_maintenance ??
                        0
                    }

                </p>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Equipment Health Trend Error:",
            error
        );


        result.innerHTML = `

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


// ==========================================================
// BACKWARD COMPATIBILITY
// ==========================================================

async function loadEquipmentTrend() {

    return loadEquipmentHealthTrend();

}


// ==========================================================
// v3.5.4
// HEALTH TREND INITIALIZATION
// ==========================================================

function initializeHealthTrendSelector() {

    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    if (!selector) {

        console.warn(
            "⚠️ equipment-health-select not found."
        );

        return;

    }


    selector.onchange =
        function () {

            const result =
                ensureHealthTrendResultContainer();


            if (result) {

                result.innerHTML = `

                    <div class="info">

                        Equipment selected:
                        <strong>
                            ${escapeHtml(
                                selector.value
                            )}
                        </strong>

                        <br><br>

                        Click
                        <strong>
                            📈 Analyze Health Trend
                        </strong>
                        to generate the historical analysis.

                    </div>

                `;

            }

        };


    initializeHealthTrendAnalyzeButton();


    ensureHealthTrendResultContainer();


    console.log(
        "✅ v3.5.4 Health Trend initialized."
    );

}


// ==========================================================
// v3.5.4
// LOAD ALL HEALTH & RISK INTELLIGENCE
// ==========================================================

async function loadHealthRiskIntelligence() {

    console.log(
        "🧠 Loading Health & Risk Intelligence..."
    );


    await Promise.allSettled([

        loadHealthRiskSummary(),

        loadEquipmentRiskRanking(),

        loadDeterioratingEquipment(),

        loadHealthTrendEquipmentSelector()

    ]);

    console.log(
        "✅ Health & Risk Intelligence loaded."
    );

}


// ==========================================================
// v3.5.4
// REFRESH HEALTH & RISK INTELLIGENCE
// ==========================================================

async function refreshHealthRiskIntelligence() {

    console.log(
        "🔄 Refreshing Health & Risk Intelligence..."
    );


    await loadHealthRiskIntelligence();


    const selector =
        document.getElementById(
            "equipment-health-select"
        );


    if (
        selector &&
        selector.value
    ) {

        ensureHealthTrendResultContainer();

    }


    if (
        typeof showMessage ===
        "function"
    ) {

        showMessage(
            "Health & Risk Intelligence refreshed successfully."
        );

    }


    console.log(
        "✅ Health & Risk Intelligence refreshed."
    );

}


// ==========================================================
// MASTER INTELLIGENCE INITIALIZATION
// ==========================================================

async function initializeReliabilityAndRiskIntelligence() {

    console.log(
        "🚀 FuElectric-AI v3.5.3 + v3.5.4 Intelligence initializing..."
    );


    await Promise.allSettled([

        loadReliabilityAnalytics(),

        loadHealthRiskIntelligence()

    ]);

    console.log(
        "✅ FuElectric-AI v3.5.3 + v3.5.4 Intelligence ready."
    );

}


// ==========================================================
// DOM READY
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeReliabilityAndRiskIntelligence();

    }
);


// ==========================================================
// END
// FuElectric-AI v3.5.3 + v3.5.4
// ==========================================================