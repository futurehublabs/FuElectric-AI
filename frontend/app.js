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


        await loadEquipment();

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

// ----------------------------------------------------------
// WORK ORDER INTELLIGENCE
// ----------------------------------------------------------

async function loadWorkOrderIntelligence() {

    const container =
        document.getElementById(
            "work-order-intelligence"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="alert alert-info">
            🧠 FuElectric-AI is analyzing Work Order Intelligence...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/work-orders/intelligence`
            );

        if (!response.ok) {

            throw new Error(
                `Intelligence request failed: ${response.status}`
            );

        }

        const data =
            await response.json();

        const intelligence =
            data.intelligence || {};

        if (
            !intelligence ||
            Object.keys(intelligence).length === 0
        ) {

            container.innerHTML = `
                <p>
                    No Work Order Intelligence available yet.
                </p>
            `;

            return;
        }

        container.innerHTML = `
            <div class="intelligence-result">

                <h3>
                    🧠 FuElectric-AI Work Order Intelligence
                </h3>

                <pre>${escapeHtml(
                    JSON.stringify(
                        intelligence,
                        null,
                        2
                    )
                )}</pre>

            </div>
        `;

    }

    catch (error) {

        console.error(
            "Work Order Intelligence error:",
            error
        );

        container.innerHTML = `
            <div class="alert alert-danger">
                ❌ Unable to load Work Order Intelligence.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

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
        document.getElementById("work-order-insights");

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

    const overdueOrders =
        intelligence.overdue_orders || [];

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
            performance.overdue_work_orders ??
            overdueOrders.length ??
            0
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


    // OVERDUE
    if (overdueWorkOrders > 0) {

        insights.push(`
            <p>
                🔴
                <strong>
                    ${overdueWorkOrders}
                    overdue work order(s)
                    detected.
                </strong>
                Immediate attention is recommended.
            </p>
        `);

    } else {

        insights.push(`
            <p>
                🟢
                No overdue work orders detected.
            </p>
        `);

    }


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


    // ------------------------------------------------------
    // OVERDUE ANALYSIS
    // ------------------------------------------------------

    if (overdue.length > 0) {

        insights.push(
            `⚠️ ${overdue.length} work order(s) require immediate attention because they are overdue.`
        );

    } else {

        insights.push(
            "✅ No overdue work orders detected."
        );

    }


    // ------------------------------------------------------
    // COMPLETION ANALYSIS
    // ------------------------------------------------------

    const completionRate =
        performance.completion_rate ?? 0;

    if (completionRate >= 80) {

        insights.push(
            `🟢 Work-order completion performance is strong at ${completionRate}%.`
        );

    } else if (completionRate >= 50) {

        insights.push(
            `🟡 Work-order completion rate is ${completionRate}%. Monitoring is recommended.`
        );

    } else {

        insights.push(
            `🔴 Work-order completion rate is low at ${completionRate}%. Management attention is recommended.`
        );

    }


    // ------------------------------------------------------
    // TECHNICIAN WORKLOAD
    // ------------------------------------------------------

    if (workload.length > 0) {

        const busiestTechnician =
            workload[0];

        insights.push(
            `👨‍🔧 ${busiestTechnician.technician_id} currently has the highest work-order workload with ${busiestTechnician.total_orders} order(s).`
        );

    }


    // ------------------------------------------------------
    // DISPLAY
    // ------------------------------------------------------

    container.innerHTML = insights.map(
        insight => `<p>${insight}</p>`
    ).join("");



// ==========================================================
// WORK ORDER INTELLIGENCE DETAILS — v3.5.1
// ==========================================================

async function loadWorkOrderIntelligenceDetails() {

    // ------------------------------------------------------
    // OVERDUE WORK ORDERS
    // ------------------------------------------------------

    try {

        const overdueResponse =
            await fetch(`${API_URL}/work-orders/overdue`);

        if (!overdueResponse.ok) {
            throw new Error("Failed to load overdue work orders.");
        }

        const overdueData =
            await overdueResponse.json();

        const overdueContainer =
            document.getElementById("wo-overdue");

        if (overdueContainer) {

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
        }

    } catch (error) {

        console.error(
            "Overdue Work Orders Error:",
            error
        );

        const overdueContainer =
            document.getElementById("wo-overdue");

        if (overdueContainer) {
            overdueContainer.innerHTML =
                "<p>⚠️ Unable to load overdue work orders.</p>";
        }
    }


    // ------------------------------------------------------
    // TECHNICIAN WORKLOAD
    // ------------------------------------------------------

    try {

        const workloadResponse =
            await fetch(`${API_URL}/work-orders/workload`);

        if (!workloadResponse.ok) {
            throw new Error("Failed to load technician workload.");
        }

        const workloadData =
            await workloadResponse.json();

        const workloadContainer =
            document.getElementById("wo-workload");

        if (workloadContainer) {

            if (
                !workloadData.workload ||
                workloadData.workload.length === 0
            ) {

                workloadContainer.innerHTML =
                    "<p>👨‍🔧 No technician workload data available.</p>";

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
        }

    } catch (error) {

        console.error(
            "Technician Workload Error:",
            error
        );

        const workloadContainer =
            document.getElementById("wo-workload");

        if (workloadContainer) {
            workloadContainer.innerHTML =
                "<p>⚠️ Unable to load technician workload.</p>";
        }
    }

} 

loadWorkOrderIntelligenceDetails();