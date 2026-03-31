/**
 * ShiftLog - Operapedia Designed JS
 */
lucide.createIcons();

// --- DOM Elements ---
const htmlEl = document.documentElement;

const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-pane');

const btnNewIncident = document.getElementById('btn-new-incident');
const modalOverlay = document.getElementById('incident-form-overlay');
const closeBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-modal-btn');

const resModalOverlay = document.getElementById('resolution-modal-overlay');
const closeResBtn = document.getElementById('close-res-btn');
const cancelResBtn = document.getElementById('cancel-res-btn');
const saveResBtn = document.getElementById('save-res-btn');
const resInputText = document.getElementById('res-input-text');
let pendingResolveId = null;

const delModalOverlay = document.getElementById('delete-modal-overlay');
const cancelDelBtn = document.getElementById('cancel-delete-btn');
const confirmDelBtn = document.getElementById('confirm-delete-btn');
let pendingDeleteId = null;

// Categories Elements
const btnNewCategory = document.getElementById('btn-new-category');
const addCatModal = document.getElementById('add-category-modal');
const closeCatBtn = document.getElementById('close-cat-btn');
const cancelCatBtn = document.getElementById('cancel-cat-btn');
const saveCatBtn = document.getElementById('save-cat-btn');
const catInputText = document.getElementById('cat-input-text');

const delCatModal = document.getElementById('delete-cat-modal');
const cancelDelCatBtn = document.getElementById('cancel-delcat-btn');
const confirmDelCatBtn = document.getElementById('confirm-delcat-btn');
let pendingDeleteCat = null;
const categoriesContainer = document.getElementById('categories-container');

const incForm = document.getElementById('incident-form');
const incCompany = document.getElementById('inc-company');
const incCategory = document.getElementById('inc-category');
const filterCompany = document.getElementById('filter-company');
const filterCategory = document.getElementById('filter-category');
const filterSearch = document.getElementById('filter-search');
const filterDate = document.getElementById('filter-date');
const incidentsContainer = document.getElementById('incidents-container');

const logBtn = document.getElementById('open-log-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const logDrawer = document.getElementById('activity-drawer');
const logOverlay = document.getElementById('drawer-overlay');
const logContainer = document.getElementById('activity-log-container');
const logCount = document.getElementById('log-count');

// --- Utility Functions ---
function showLoader() { document.getElementById('globalLoader').style.display = 'flex'; }
function hideLoader() { document.getElementById('globalLoader').style.display = 'none'; }
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if(type === 'error') icon = '❌';
    if(type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span style="flex-grow: 1; font-weight: 500;">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fadeOut');
        setTimeout(() => toast.remove(), 400); 
    }, 3500);
}

document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupModal();
    setupDrawer();
    
    showLoader();
    await populateSelects();
    await renderIncidents();
    await renderLogs();
    hideLoader();

    incForm.addEventListener('submit', handleIncidentSubmit);
    filterCompany.addEventListener('change', renderIncidents);
    filterCategory.addEventListener('change', renderIncidents);
    filterSearch.addEventListener('input', renderIncidents);
    filterDate.addEventListener('change', renderIncidents);
});


// --- Navigation ---
function setupNavigation() {
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${targetId}`) {
                    content.classList.add('active');
                }
            });

            if (targetId === 'categories') await renderCategories();
        });
    });
}

// --- Modals & Drawers ---
function setupModal() {
    const openModal = () => {
        document.getElementById('inc-id').value = '';
        document.getElementById('inc-modal-title').textContent = 'Report New Incident';
        document.getElementById('inc-submit-btn').textContent = 'Save Incident';
        incForm.reset();
        modalOverlay.classList.add('show');
    };
    const closeModal = () => { modalOverlay.classList.remove('show'); incForm.reset(); };
    btnNewIncident.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Categories Modals
    btnNewCategory.addEventListener('click', () => { catInputText.value = ''; addCatModal.classList.add('show'); });
    const closeCatModal = () => { addCatModal.classList.remove('show'); };
    closeCatBtn.addEventListener('click', closeCatModal);
    cancelCatBtn.addEventListener('click', closeCatModal);

    saveCatBtn.addEventListener('click', async () => {
        const val = catInputText.value.trim();
        if (val) {
            showLoader();
            await window.db.addCategory(val);
            await renderCategories();
            await populateSelects();
            await renderLogs();
            closeCatModal();
            hideLoader();
            showToast("Categoría creada exitosamente", "success");
        }
    });

    const closeDelCatModal = () => { delCatModal.classList.remove('show'); pendingDeleteCat = null; };
    cancelDelCatBtn.addEventListener('click', closeDelCatModal);
    confirmDelCatBtn.addEventListener('click', async () => {
        if (pendingDeleteCat) {
            showLoader();
            await window.db.deleteCategory(pendingDeleteCat);
            await renderCategories();
            await populateSelects();
            await renderLogs();
            hideLoader();
            showToast("Categoría eliminada", "success");
        }
        closeDelCatModal();
    });
}

function setupDrawer() {
    const openDrawer = () => { logDrawer.classList.add('open'); logOverlay.style.display = 'block'; };
    const closeDrawer = () => { logDrawer.classList.remove('open'); logOverlay.style.display = 'none'; };

    logBtn.addEventListener('click', openDrawer);
    closeDrawerBtn.addEventListener('click', closeDrawer);
    logOverlay.addEventListener('click', closeDrawer);
}

// --- Render Logic ---
async function populateSelects() {
    const companies = await window.db.getCompanies();
    const categories = await window.db.getCategories();

    incCompany.innerHTML = '<option value="">Select Company...</option>';
    filterCompany.innerHTML = '<option value="">All Companies</option>';
    incCategory.innerHTML = '<option value="">Select Category...</option>';
    filterCategory.innerHTML = '<option value="">All Categories</option>';

    companies.forEach(c => {
        incCompany.add(new Option(c.name, c.name));
        filterCompany.add(new Option(c.name, c.name));
    });

    categories.forEach(c => {
        incCategory.add(new Option(c.name, c.name));
        filterCategory.add(new Option(c.name, c.name));
    });
}

async function handleIncidentSubmit(e) {
    e.preventDefault();

    const incIdVal = document.getElementById('inc-id').value;

    const incData = {
        company: incCompany.value,
        category: incCategory.value,
        shift: document.getElementById('inc-shift').value,
        description: document.getElementById('inc-desc').value,
        actionTaken: document.getElementById('inc-action').value,
    };

    // Word count limits
    const descWords = incData.description.trim().split(/\s+/).filter(w => w.length > 0).length;
    const actionWords = incData.actionTaken.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (descWords > 50) {
        alert(`Description is too long (${descWords} palabras). El límite es de 50 palabras.`);
        return;
    }
    if (actionWords > 2000) {
        alert(`Action Taken is too long (${actionWords} palabras). El límite es de 2000 palabras.`);
        return;
    }

    showLoader();
    if (incIdVal) {
        // Edit mode
        await window.db.updateIncidentData(incIdVal, incData);
    } else {
        // Create mode
        await window.db.addIncident(incData);
    }

    modalOverlay.classList.remove('show');
    incForm.reset();
    document.getElementById('inc-id').value = '';
    await renderIncidents();
    await renderLogs();
    hideLoader();
    showToast(incIdVal ? "Incidente editado exitosamente" : "Incidente reportado exitosamente", "success");
}

async function renderIncidents() {
    let incidents = await window.db.getIncidents();

    const fc = filterCompany.value;
    const fcat = filterCategory.value;
    const fsearch = filterSearch.value.toLowerCase();
    const fdate = filterDate.value; // Formato YYYY-MM-DD

    // 1. Filtro por Compañía
    if (fc) incidents = incidents.filter(i => i.company === fc);

    // 2. Filtro por Categoría
    if (fcat) incidents = incidents.filter(i => i.category === fcat);

    // 3. Filtro por Palabras Clave (Busca en descripción y acción tomada)
    if (fsearch) {
        incidents = incidents.filter(i =>
            i.description.toLowerCase().includes(fsearch) ||
            (i.actionTaken && i.actionTaken.toLowerCase().includes(fsearch))
        );
    }

    // 4. Filtro por Fecha
    if (fdate) {
        incidents = incidents.filter(i => {
            if (!i.createdAt) return false;
            const incDate = new Date(i.createdAt);
            const yyyy = incDate.getFullYear();
            const mm = String(incDate.getMonth() + 1).padStart(2, '0');
            const dd = String(incDate.getDate()).padStart(2, '0');
            const localDateStr = `${yyyy}-${mm}-${dd}`;
            return localDateStr === fdate;
        });
    }

    // El resto de la función (separar por status y renderizar tablas) se mantiene igual...
    const important = incidents.filter(i => i.status === 'Important');
    const pending = incidents.filter(i => i.status === 'Pending');
    const resolved = incidents.filter(i => i.status === 'Resolved');

    incidentsContainer.innerHTML = '';

    let renderedCount = 0;
    if (important.length > 0) { incidentsContainer.appendChild(createTable('Important', important, 'important')); renderedCount++; }
    if (pending.length > 0) { incidentsContainer.appendChild(createTable('Pending', pending, 'pending')); renderedCount++; }
    if (resolved.length > 0) { incidentsContainer.appendChild(createTable('Resolved', resolved, 'resolved')); renderedCount++; }

    if (renderedCount === 0) {
        incidentsContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clipboard-list"></i>
                <h3>No results found</h3>
                <p style="font-size: 13px; margin-top:8px">Try adjusting your filters or search keywords.</p>
            </div>
        `;
    }
    lucide.createIcons();
}

function createTable(title, data, cssClass) {
    const wrapper = document.createElement('div');
    wrapper.className = `data-table-wrapper`;

    const isResolvedTable = (title === 'Resolved');

    let iconHTML = cssClass === 'important' ? '<i data-lucide="alert-triangle" style="width:16px; height:16px;"></i>' :
        cssClass === 'resolved' ? '<i data-lucide="check-circle" style="width:16px; height:16px;"></i>' :
            '<i data-lucide="clock" style="width:16px; height:16px;"></i>';

    // 💡 REPARTO EXACTO DEL 100% PARA EVITAR QUE SE AMONTONEN
    let headersHTML = isResolvedTable
        ? `<th style="width: 10%">Time / Shift</th>
           <th style="width: 15%">Company / Category</th>
           <th style="width: 10%">Reported By</th>
           <th style="width: 20%">Description</th>
           <th style="width: 20%">Action Taken</th>
           <th style="width: 15%">Resolution Info</th>
           <th style="width: 10%">Log Actions</th>`
        : `<th style="width: 10%">Time / Shift</th>
           <th style="width: 15%">Company / Category</th>
           <th style="width: 10%">Reported By</th>
           <th style="width: 25%">Description</th>
           <th style="width: 25%">Action Taken</th>
           <th style="width: 15%">Log Actions</th>`;

    let tableHTML = `
        <div class="table-header ${cssClass}">
            ${iconHTML}
            <h3>${title}</h3>
            <span class="count-pill">${data.length}</span>
        </div>
        <table>
            <thead>
                <tr>${headersHTML}</tr>
            </thead>
            <tbody>`;

    data.forEach(inc => {
        const dateStr = inc.createdAt || new Date().toISOString();
        const timeFormatted = new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateFormatted = new Date(dateStr).toISOString().substring(0, 10);

        tableHTML += `
                <tr>
                    <td>
                        <span style="font-weight:600; color:var(--text-primary)">${timeFormatted}</span><br>
                        <span style="font-size:11px; color:var(--text-secondary)">${dateFormatted}</span><br>
                        <span style="font-size:11px; color:var(--text-tertiary)">${inc.shift}</span>
                    </td>
                    <td>
                        <span class="badge-company">${inc.company}</span><br>
                        <span style="font-size:11px; color:var(--text-secondary)">${inc.category}</span>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="width:24px; height:24px; border-radius:50%; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">
                                ${(inc.reportedBy || 'U')[0].toUpperCase()}
                            </div>
                            <span style="font-size:12px; font-weight:500; color:var(--text-primary)">${inc.reportedBy || 'Unknown'}</span>
                        </div>
                    </td>
                    <td><div style="white-space: pre-wrap; word-break: break-word; line-height: 1.5; color: var(--text-secondary); font-size: 13px; max-height: 100px; overflow-y: auto; padding-right: 8px;">${inc.description}</div></td>
                    <td><div style="white-space: pre-wrap; word-break: break-word; line-height: 1.5; color: var(--text-secondary); font-size: 13px; max-height: 100px; overflow-y: auto; padding-right: 8px;">${inc.actionTaken || ''}</div></td>
                    
                    ${isResolvedTable ? `<td><span class="resolution-text" data-tooltip="${inc.resolutionDetails || ''}">${inc.resolutionDetails || 'N/A'}</span></td>` : ''}

                    <td>
                        <div class="btn-action-col" style="flex-wrap: wrap;">
                            ${!isResolvedTable ? `<button class="btn-mini edit" onclick="editIncident('${inc._id}')" style="width:auto; padding:0 8px; gap:4px; font-size:11px; font-weight:600;"><i data-lucide="edit" style="width:14px; height:14px;"></i> Edit</button>` : ''}
                            ${!isResolvedTable ? `<button class="btn-mini resolve" onclick="updateStatus('${inc._id}', 'Resolved')" style="width:auto; padding:0 8px; gap:4px; font-size:11px; font-weight:600;"><i data-lucide="check" style="width:14px; height:14px;"></i> Resolve</button>` : ''}
                            ${title === 'Pending' ? `<button class="btn-mini warn" onclick="updateStatus('${inc._id}', 'Important')" style="width:auto; padding:0 8px; gap:4px; font-size:11px; font-weight:600;"><i data-lucide="alert-circle" style="width:14px; height:14px;"></i> Important</button>` : ''}
                            <button class="btn-mini delete" onclick="deleteIncident('${inc._id}')" style="width:auto; padding:0 8px; gap:4px; font-size:11px; font-weight:600;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i> Delete</button>
                        </div>
                    </td>
                </tr>`;
    });

    tableHTML += `</tbody></table>`;
    wrapper.innerHTML = tableHTML;
    return wrapper;
}

// Función para cerrar el modal de resolución
const closeResModal = () => {
    resModalOverlay.classList.remove('show');
    resInputText.value = '';
    pendingResolveId = null;
};

// Listeners para cerrar el modal
closeResBtn.addEventListener('click', closeResModal);
cancelResBtn.addEventListener('click', closeResModal);

// Lógica al hacer clic en "Aceptar" en el nuevo modal
saveResBtn.addEventListener('click', async () => {
    const resolution = resInputText.value.trim();
    if (!resolution) {
        alert("Debe proporcionar información de resolución para marcarlo como resuelto.");
        return;
    }

    const resWords = resolution.split(/\s+/).filter(w => w.length > 0).length;
    if (resWords > 2000) {
        alert(`Resolution info is too long (${resWords} palabras). El límite es de 2000 palabras.`);
        return;
    }

    if (pendingResolveId) {
        showLoader();
        await window.db.updateIncidentStatus(pendingResolveId, 'Resolved', resolution);
        await renderIncidents();
        await renderLogs();
        hideLoader();
        showToast("Incidente resuelto con éxito", "success");
    }
    closeResModal();
});

window.updateStatus = async function (id, status) {
    if (status === 'Resolved') {
        // En lugar del prompt(), abrimos nuestro hermoso modal CSS
        pendingResolveId = id;
        resModalOverlay.classList.add('show');
        setTimeout(() => resInputText.focus(), 100); // Hace focus en el input automáticamente
    } else {
        // Si es "Important" o "Pending", se cambia directo sin pedir texto
        showLoader();
        await window.db.updateIncidentStatus(id, status, '');
        await renderIncidents();
        await renderLogs();
        hideLoader();
        showToast("Estado de incidente actualizado", "success");
    }
};

// Lógica Delete
const closeDelModal = () => { delModalOverlay.classList.remove('show'); pendingDeleteId = null; };
cancelDelBtn.addEventListener('click', closeDelModal);

confirmDelBtn.addEventListener('click', async () => {
    if (pendingDeleteId) {
        showLoader();
        await window.db.deleteIncident(pendingDeleteId);
        await renderIncidents();
        await renderLogs();
        hideLoader();
        showToast("Incidente borrado permanentemente", "success");
    }
    closeDelModal();
});

window.deleteIncident = function (id) {
    pendingDeleteId = id;
    delModalOverlay.classList.add('show');
};

window.editIncident = async function (id) {
    const inc = await window.db.getIncidentById(id);
    if (!inc) return;

    document.getElementById('inc-id').value = inc._id;
    incCompany.value = inc.company;
    incCategory.value = inc.category;
    document.getElementById('inc-shift').value = inc.shift;
    document.getElementById('inc-desc').value = inc.description;
    document.getElementById('inc-action').value = inc.actionTaken || '';

    document.getElementById('inc-modal-title').textContent = 'Edit Incident';
    document.getElementById('inc-submit-btn').textContent = 'Save Changes';

    modalOverlay.classList.add('show');
};

function getLogActionClass(action) {
    const a = action.toLowerCase();
    if (a === 'created') return 'created';
    if (a === 'resolved') return 'resolved';
    if (a === 'deleted') return 'deleted';
    if (a === 'important') return 'important';
    if (a === 'edited') return 'important'; // Reusing important styling for edit logs
    return 'created';
}

async function renderLogs() {
    const logs = await window.db.getLogs();
    logCount.textContent = logs.length;

    if (logs.length === 0) {
        logContainer.innerHTML = '<div class="empty-state"><i data-lucide="list"></i><p style="font-size:13px">No historical activity yet.</p></div>';
        lucide.createIcons();
        return;
    }

    logContainer.innerHTML = logs.map(log => `
        <div class="log-item">
            <span class="log-action ${getLogActionClass(log.action)}">${log.action.toUpperCase()}</span>
            <div class="log-title" style="margin-bottom: 2px;">${log.title}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <div class="log-time" style="color: var(--accent); font-weight: 500; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="user" style="width:12px; height:12px;"></i> ${log.user}
                </div>
                <div class="log-time">${log.time}</div>
            </div>
        </div>
    `).join('');
}



async function renderCategories() {
    const categories = await window.db.getCategories();

    categoriesContainer.innerHTML = categories.map(c => `
        <div class="company-hub-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h3 style="font-size:16px; color:var(--text-primary); margin:0;">${c.name}</h3>
            </div>
            <button class="btn-mini delete" onclick="deleteSystemCategory('${c.name}')" style="width:auto; padding:0 8px; gap:4px; font-size:11px; font-weight:600;">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Delete
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

window.deleteSystemCategory = function (name) {
    pendingDeleteCat = name;
    delCatModal.classList.add('show');
};
