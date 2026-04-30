document.addEventListener('DOMContentLoaded', () => {
  let companies = [];
  let currentCompany = null;
  let isEditMode = false;
  let currentTab = 'credenciales';
  let selectedCompanyId = null;

  const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 408 480"><path fill="currentColor" d="M299 5v43H43v299H0V48q0-18 12.5-30.5T43 5h256zm64 86q17 0 29.5 12.5T405 133v299q0 18-12.5 30.5T363 475H128q-18 0-30.5-12.5T85 432V133q0-17 12.5-29.5T128 91h235zm0 341V133H128v299h235z"/></svg>`;
  const ICON_EXTERNAL = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4m-8-2l8-8m0 0v5m0-5h-5"/></svg>`;

  let adminLoggedIn = localStorage.getItem('credentialsAdminLoggedIn') === 'true';

  const gamesGrid = document.getElementById('gamesGrid');
  const companyTitle = document.getElementById('companyTitle');
  const gameSearch = document.getElementById('gameSearch');
  const globalSearch = document.getElementById('globalSearch');
  const toast = document.getElementById('toast');
  const editModeBtn = document.getElementById('editModeBtn');
  const tabsContainer = document.getElementById('tabsContainer');

  // New Dropdown Elements
  const companySelectorCard = document.getElementById('companySelectorCard');
  const companyDropdown = document.getElementById('companyDropdown');
  const dropdownSearchInput = document.getElementById('dropdownSearchInput');
  const dropdownList = document.getElementById('dropdownList');
  const selectedCompanyName = document.getElementById('selectedCompanyName');
  const companyLinkWrapper = document.getElementById('companyLinkWrapper');
  const companyGlobalLink = document.getElementById('companyGlobalLink');
  const companyIconImg = document.getElementById('companyIconImg');
  const companyIconText = document.getElementById('companyIconText');


  // ==================== CONFIGURACIÓN API (MONGODB) ====================
  const API_BASE = "https://general-cashouts-production.up.railway.app/api";
  let token = localStorage.getItem("token");

  // Motor central para comunicarnos con el backend
  async function apiFetch(endpoint, options = {}) {
    const headers = { 
      Accept: "application/json", 
      Authorization: `Bearer ${token}`, 
      ...options.headers 
    };
    
    // Si enviamos datos, le decimos que es en formato JSON
    if (options.body) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    
    // Si el token expiró o no es válido, lo botamos al login
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/";
      throw new Error("Sesión expirada o sin permisos");
    }
    
    return response;
  }
  // =====================================================================
  
  // ==================== CUSTOM CONFIRM MODAL ====================
  const showConfirmModal = (title, message, acceptText = 'Aceptar', cancelText = 'Cancelar') => {
    return new Promise(resolve => {
      // Remove any existing confirm modal
      const existing = document.getElementById('customConfirmModal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'customConfirmModal';
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-box">
          <div class="confirm-icon">⚠️</div>
          <h3 class="confirm-title">${title}</h3>
          <p class="confirm-message">${message}</p>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-btn-cancel">${cancelText}</button>
            <button class="confirm-btn confirm-btn-accept">${acceptText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));

      const close = (result) => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      };

      overlay.querySelector('.confirm-btn-accept').addEventListener('click', () => close(true));
      overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => close(false));

    });
  };


  // ==================== GAME CATALOG ====================
  let gameCatalog = []; // [{id, name, link}]


  // Catalog modal
const catalogBtn = document.getElementById('catalogBtn');
  if (catalogBtn) {
    catalogBtn.addEventListener('click', async () => {
      // Validamos usando la variable de sesión
      if (!adminLoggedIn) {
        toast.textContent = '❌ Solo los supervisores pueden gestionar el catálogo';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }
      openCatalogModal();
    });
  }

  const openCatalogModal = () => {
    const existing = document.getElementById('catalogModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'catalogModal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width:560px;">
        <div class="modal-header">
          <h2 class="modal-title">📋 Catálogo de Juegos</h2>
          <button class="modal-close" id="closeCatalogBtn">✕</button>
        </div>
        <div class="modal-body" style="padding:16px 20px;">
          <p style="color:var(--text-secondary);font-size:12px;margin:0 0 12px;">
            Gestiona la lista maestra de juegos. Estos nombres aparecerán como opciones al agregar juegos a compañías.
          </p>
          <div id="catalogList" style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>
          <button type="button" id="addCatalogGameBtn" style="margin-top:10px;padding:8px 14px;background:transparent;color:var(--accent);border:1px dashed var(--accent);border-radius:var(--radius-sm);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;width:100%;transition:all 0.15s;">+ Agregar juego al catálogo</button>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-secondary" id="cancelCatalogBtn">Cerrar</button>
          <button class="modal-btn modal-btn-primary" id="saveCatalogBtn">Guardar catálogo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

let localCatalog = gameCatalog.map(g => ({ ...g }));

    const listContainer = overlay.querySelector('#catalogList');

    const renderCatalogList = () => {
      listContainer.innerHTML = '';
      if (!localCatalog.length) {
        listContainer.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;text-align:center;padding:20px 0;">No hay juegos en el catálogo</p>';
        return;
      }
      localCatalog.forEach((game, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;align-items:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);';
        row.innerHTML = `
          <span style="color:var(--text-tertiary);font-size:11px;min-width:22px;font-weight:600;">${idx + 1}.</span>
          <input type="text" value="${game.name}" data-field="name" style="flex:1;padding:6px 8px;background:var(--bg-main);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:inherit;outline:none;font-weight:600;" placeholder="Nombre del juego" />
          <input type="text" value="${game.link}" data-field="link" style="flex:1;padding:6px 8px;background:var(--bg-main);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;font-family:inherit;outline:none;" placeholder="Link del juego" />
          <button type="button" data-remove="${idx}" style="padding:4px 7px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);font-size:11px;cursor:pointer;font-family:inherit;" title="Eliminar">✕</button>
        `;
        row.querySelectorAll('input').forEach(input => {
          input.addEventListener('input', e => {
            localCatalog[idx][e.target.dataset.field] = e.target.value;
          });
        });
        row.querySelector('[data-remove]').addEventListener('click', async () => {
          const gameName = localCatalog[idx]?.name || `Juego #${idx + 1}`;
          const confirmed = await showConfirmModal(
            '¿Eliminar del catálogo?',
            `¿Estás seguro de borrar "${gameName}" del catálogo de juegos?`,
            'Eliminar',
            'Cancelar'
          );
          if (!confirmed) return;
          localCatalog.splice(idx, 1);
          renderCatalogList();
        });
        listContainer.appendChild(row);
      });
    };

    renderCatalogList();

    // Add game
    overlay.querySelector('#addCatalogGameBtn').addEventListener('click', () => {
      const maxId = localCatalog.length > 0 ? Math.max(...localCatalog.map(g => Number(g.id) || 0)) : -1;
      localCatalog.push({ id: maxId + 1, name: '', link: '' });
      renderCatalogList();
      const inputs = listContainer.querySelectorAll('input[data-field="name"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    // ==========================================
    // ✅ SAVE (ADAPTADO A MONGODB)
    // ==========================================
    overlay.querySelector('#saveCatalogBtn').addEventListener('click', async () => {
      // 1. Filtramos los vacíos y estructuramos como un arreglo limpio
      const valid = localCatalog
        .filter(g => g.name.trim())
        .map((g, idx) => ({ 
            id: idx, 
            name: g.name.trim(), 
            link: g.link.trim() 
        }));

      const saveBtn = overlay.querySelector('#saveCatalogBtn');

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        // 2. Enviamos el arreglo directamente a nuestra API
        await apiFetch('/catalog', {
          method: 'PUT',
          body: JSON.stringify({ games: valid })
        });
        
        // 3. Actualizamos la variable global para que Operapedia lo sepa
        gameCatalog = valid;

        toast.textContent = `✅ Catálogo guardado (${valid.length} juegos)`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        closeModal();

      } catch (err) {
        console.error('Error saving catalog:', err);
        toast.textContent = '❌ Error al guardar catálogo';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar catálogo';
      }
    });

    // Close
    const closeModal = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
    };
    
    overlay.querySelector('#closeCatalogBtn').addEventListener('click', closeModal);
    overlay.querySelector('#cancelCatalogBtn').addEventListener('click', closeModal);

    requestAnimationFrame(() => overlay.classList.add('show'));
  };

  // ==================== THEME SYNC ====================
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const syncThemeWithWorkspace = () => {
    const workspaceTheme = localStorage.getItem('workspaceTheme') || 'dark';
    applyTheme(workspaceTheme);
  };

  syncThemeWithWorkspace();

  window.addEventListener('storage', (e) => {
    if (e.key === 'workspaceTheme') {
      applyTheme(e.newValue || 'dark');
    }
  });
  // ==================== FIN THEME SYNC ====================

  // ==================== SIDEBAR COMPANY SEARCH (Removed, using dropdown) ====================
  // ==================== SEARCH FILTERS PANEL ====================
  const searchFiltersPanel = document.getElementById('searchFilters');
  let activeSearchCompanyIds = []; // empty = all companies

  // Load saved category filters from localStorage (default: empty = search all)
  let activeCategoryFilters = [];
  const savedCatFilters = localStorage.getItem('operapediaCategoryFilters');
  if (savedCatFilters) {
    try { activeCategoryFilters = JSON.parse(savedCatFilters); } catch { activeCategoryFilters = []; }
  }

  const saveCategoryFilters = () => {
    localStorage.setItem('operapediaCategoryFilters', JSON.stringify(activeCategoryFilters));
  };

  // Restore chip active classes on load
  document.querySelectorAll('.filter-chip[data-category]').forEach(chip => {
    if (activeCategoryFilters.includes(chip.dataset.category)) {
      chip.classList.add('active');
    }
  });

  // Show/hide filter panel when omnibar is focused
  if (globalSearch && searchFiltersPanel) {
    globalSearch.addEventListener('focus', () => {
      searchFiltersPanel.classList.add('visible');
    });

    // Close panel clicking outside
    document.addEventListener('click', e => {
      if (!e.target.closest('.omnibar-wrapper')) {
        searchFiltersPanel.classList.remove('visible');
      }
    });
  }

  // Category filter chip toggles
  document.querySelectorAll('.filter-chip[data-category]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const cat = chip.dataset.category;
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        activeCategoryFilters = activeCategoryFilters.filter(c => c !== cat);
      } else {
        chip.classList.add('active');
        activeCategoryFilters.push(cat);
      }
      saveCategoryFilters();
      if (globalSearch.value.trim()) {
        renderGlobalResults(globalSearch.value);
      }
    });
  });

  // ==================== PARTNER FILTER ====================
  const PARTNERS = ['Dragon', 'Eterniplay', 'Taparcadia', 'Wysaro', 'Manual'];
  const PARTNER_ICONS = { 
    Dragon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M200.947 18.686c-6.98.087-14.64.774-22.85 1.9c27.57 20.468 51.098 45.25 67.594 70.527c1.66 0 3.312.012 4.958.047c18.066.39 35.487 2.906 53.217 7.2c-15.695-28.457-29.935-50.19-47.45-63.22c-13.817-10.278-30.063-16.168-52.52-16.454c-.967-.013-1.95-.013-2.948 0zm-91.66 22.96c-.73-.002-1.46.006-2.195.022c-14.045.31-29.36 3.92-46.86 11.13c56.18 18.807 106.985 50.468 133.907 83.585c18.377-5.13 29.44-14.72 36.454-28.817C195.84 78.18 168.118 56.19 140.65 46.96c-10.168-3.418-20.433-5.306-31.363-5.315zm-.203 52.786c-39.42 6.758-74.73 31.854-87.822 74.19v322.345h212.73C100.352 442.58 61.19 206.49 187.115 230.104c5.838-14.164 9.92-28.027 11.018-41.465l18.627 1.522c-1.684 20.592-8.828 40.49-18.033 59.943c-.732 2.035-1.472 4.12-2.186 6.063c32.842 85.24 113.77 160.69 169.495 168.197c.915.033 1.905-.002 2.953-.09c17.016 1.035 35.86-4.222 52.21-22.304l7.984-8.83l-10.473-5.658c-6.507-3.515-14.29-7.094-18.167-10.925c-1.938-1.916-2.793-3.47-3.074-5.194c-.282-1.725-.13-4.227 2.23-8.578l10.673-19.656l-21.484 6.222c-6.304 1.825-17.305-3.032-23.224-10.71c-2.96-3.84-4.408-7.907-4.387-10.843c.02-2.938.72-5.125 4.747-8.05l19.453-14.125l-23.884-2.72c-9.974-1.137-16.37-6.658-19.17-12.294c-2.802-5.634-2.312-10.084 1.375-13.31l12.204-10.677l-15.358-5.205c-6.717-2.276-10.296-7.555-10.357-10.633c-.028-1.373.238-2.666 1.843-4.476c10.93-2.39 21.258-.45 28.088 6.374c6.154 6.146 8.35 15.128 6.977 24.832c8.55-2.254 16.985-1.616 24.112 2.494c9.34 5.387 14.647 15.692 15.67 27.965c15.212-10.132 32.152-12.725 45.262-5.164c15.467 8.92 21.36 29.513 16.805 51.75c23.992-33.355 34.588-75.717 5.617-120.43c-46.726-4.442-81.693-30.676-93.293-67.64c-5.026-16.016-21.284-28.67-42-37.904l-.08.217c-29.74-10.823-55.575-17.35-82.604-18.733l.08.155c-2.294-.093-4.56-.16-6.762-.172c-9.537 22.874-28.662 39.9-57.436 46.054l-5.906 1.262l-3.576-4.864c-14.216-19.33-41.23-40.452-74.002-58.074zm156.215 65.26c27.927-.073 44.874 11.617 42.09 44.45c-35.844 3.39-51.933-16.683-63.074-42.632c7.507-1.155 14.538-1.8 20.983-1.817zm48.407 66.363c3.708.07 7.14.994 10.014 2.812a35.171 35.171 0 0 0-4.16 3.543c-5.246 5.24-8.087 12.122-7.956 18.742c.183 9.322 5.27 17.184 12.68 22.56c-3.14 8.103-2.452 17.455 1.407 25.22c3.813 7.668 10.54 14.273 19.302 18.398c-1.445 3.366-2.375 6.862-2.4 10.33c-.062 8.407 3.38 16.042 8.273 22.39c6.792 8.81 16.862 15.936 28.026 17.91c-.183 2.18-.204 4.333.133 6.407c1.05 6.444 4.515 11.66 8.38 15.48c3.41 3.37 7.19 5.892 10.798 7.993c-6.345 4.792-12.414 7.056-18.618 7.79c-6.515-7.937-9.71-19.084-9.41-31.454c-11.767 6.177-24.21 7.156-34.12 1.44c-14.668-8.46-19.393-29.036-13.187-50.33c-11.336 2.77-22.13.92-29.187-6.132c-8.875-8.865-9.535-23.626-3.094-37.95c-3.676-.615-6.963-2.166-9.525-4.725c-8.808-8.798-5.773-26.09 6.776-38.626c7.843-7.835 17.546-11.957 25.87-11.8z"/></svg>`,
    Eterniplay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M160 32c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h352c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64zm176 96a80 80 0 1 1 0 160a80 80 0 1 1 0-160m-176 24v-48c0-4.4 3.6-8 8-8h48c4.4 0 8.1 3.6 7.5 8c-3.6 29-26.6 51.9-55.5 55.5c-4.4.5-8-3.1-8-7.5m0 112c0-4.4 3.6-8.1 8-7.5c29 3.6 51.9 26.6 55.5 55.5c.5 4.4-3.1 8-7.5 8h-48c-4.4 0-8-3.6-8-8zm344-104.5c-29-3.6-51.9-26.6-55.5-55.5c-.5-4.4 3.1-8 7.5-8h48c4.4 0 8 3.6 8 8v48c0 4.4-3.6 8.1-8 7.5m8 104.5v48c0 4.4-3.6 8-8 8h-48c-4.4 0-8.1-3.6-7.5-8c3.6-29 26.6-51.9 55.5-55.5c4.4-.5 8 3.1 8 7.5M48 152c0-13.3-10.7-24-24-24S0 138.7 0 152v264c0 35.3 28.7 64 64 64h392c13.3 0 24-10.7 24-24s-10.7-24-24-24H64c-8.8 0-16-7.2-16-16z"/></svg>`,
    Taparcadia: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 717 669"><path fill="currentColor" d="M143 96V24h72v72h-72zm359-72h71v72h-71V24zm143 215V96h72v287h-72v71h-72v72h72v72h72v71H573v-71h-71v-72H215v72h-72v71H0v-71h72v-72h71v-72H72v-71H0V96h72v143h71v-71h72V96h72v72h143V96h72v72h71v71h72zm-358 72v-72h-72v72h72zm215 0v-72h-72v72h72z"/></svg>`,
    Wysaro: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="currentColor" d="M27.287 34.627c-.404 0-.806-.124-1.152-.371L18 28.422l-8.135 5.834a1.97 1.97 0 0 1-2.312-.008a1.971 1.971 0 0 1-.721-2.194l3.034-9.792l-8.062-5.681a1.98 1.98 0 0 1-.708-2.203a1.978 1.978 0 0 1 1.866-1.363L12.947 13l3.179-9.549a1.976 1.976 0 0 1 3.749 0L23 13l10.036.015a1.975 1.975 0 0 1 1.159 3.566l-8.062 5.681l3.034 9.792a1.97 1.97 0 0 1-.72 2.194a1.957 1.957 0 0 1-1.16.379z"/></svg>`,
    Manual: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/></svg>`
  };

  // Load saved partner filters from localStorage (default: empty = show all)
  let activePartnerFilters = [];
  const savedPartnerFilters = localStorage.getItem('operapediaPartnerFilters');
  if (savedPartnerFilters) {
    try { activePartnerFilters = JSON.parse(savedPartnerFilters); } catch { activePartnerFilters = []; }
  }

  const savePartnerFilters = () => {
    localStorage.setItem('operapediaPartnerFilters', JSON.stringify(activePartnerFilters));
  };

  // Restore partner chip active classes on load
  document.querySelectorAll('.partner-chip[data-partner]').forEach(chip => {
    if (activePartnerFilters.includes(chip.dataset.partner)) {
      chip.classList.add('active');
    }
  });

  // Partner chip toggle handlers
  document.querySelectorAll('.partner-chip[data-partner]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const partner = chip.dataset.partner;
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        activePartnerFilters = activePartnerFilters.filter(p => p !== partner);
      } else {
        chip.classList.add('active');
        activePartnerFilters.push(partner);
      }
      savePartnerFilters();
      // Re-render dropdown and re-trigger search
      renderCompanies();
      if (globalSearch.value.trim()) {
        renderGlobalResults(globalSearch.value);
      }
    });
  });






  // ========= RENDER COMPAÑÍAS =========
  let dropdownSearchTerm = '';
  
  if (dropdownSearchInput) {
    dropdownSearchInput.addEventListener('input', e => {
      dropdownSearchTerm = e.target.value.toLowerCase().trim();
      renderCompanies();
    });
  }
  
  if (companySelectorCard) {
    companySelectorCard.addEventListener('click', () => {
      const isOpen = companyDropdown.style.display === 'flex';
      if (isOpen) {
        companyDropdown.style.display = 'none';
        companySelectorCard.classList.remove('open');
      } else {
        companyDropdown.style.display = 'flex';
        companySelectorCard.classList.add('open');
        dropdownSearchInput.focus();
        renderCompanies(); // re-render to make sure it's up to date
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.company-selector-container')) {
        companyDropdown.style.display = 'none';
        companySelectorCard.classList.remove('open');
      }
    });
  }

  const renderCompanies = () => {
    if (!dropdownList) return;
    dropdownList.innerHTML = '';

    const visibleCompanies = companies.filter(c => {
      const passesSearch = !dropdownSearchTerm || c.name.toLowerCase().includes(dropdownSearchTerm);
      const passesPartnerFilter = activePartnerFilters.length === 0 || activePartnerFilters.includes(c.partner || '');
      return passesSearch && passesPartnerFilter;
    });

    const partnerSortOrder = {
      'Dragon': 1,
      'Taparcadia': 2,
      'Eterniplay': 3,
      'Wysaro': 4,
      'Manual': 5
    };

    visibleCompanies.sort((a, b) => {
      const orderA = partnerSortOrder[a.partner] || 99;
      const orderB = partnerSortOrder[b.partner] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    visibleCompanies.forEach(company => {
      const isActive = currentCompany && String(currentCompany.id) === String(company.id);
      const item = document.createElement('div');
      item.className = `dropdown-item ${isActive ? 'active' : ''}`;
      
      const iconContent = company.iconUrl 
        ? `<img src="${company.iconUrl}" style="width:24px; height:24px; object-fit:cover; border-radius:4px;" />` 
        : `<div style="width:24px; height:24px; background:${company.color}; border-radius:4px;"></div>`;

      let partnerHtml = '';
      if (company.partner) {
        const partnerIcon = PARTNER_ICONS[company.partner] || '';
        partnerHtml = `<span class="partner-badge" data-partner="${company.partner}" style="transform: scale(0.85); margin-left: auto;">${partnerIcon} ${company.partner}</span>`;
      }

      item.innerHTML = `
        ${iconContent}
        <span style="font-size: 13px; font-weight: 500; flex: 1;">${company.name}</span>
        ${partnerHtml}
      `;

      item.addEventListener('click', () => {
        companyDropdown.style.display = 'none';
        companySelectorCard.classList.remove('open');

        // Guard: block company switch while in edit mode
        if (isEditMode && currentCompany && String(currentCompany.id) !== String(company.id)) {
          showConfirmModal(
            '¿Guardar cambios?',
            'Estás en modo edición. ¿Deseas guardar los cambios antes de cambiar de compañía?',
            'Guardar y cambiar',
            'Cancelar'
          ).then(accepted => {
            if (accepted) {
              saveCurrentTab();
              isEditMode = false;
              if (editModeBtn) {
                editModeBtn.innerHTML = '<span class="btn-edit-icon">✏️</span><span class="btn-edit-label">Editar</span>';
              }
              updateAddCompanyBtnVisibility();
              selectCompany(company);
            }
          });
          return;
        }
        
        selectCompany(company);
      });
      dropdownList.appendChild(item);
    });

    if (
      currentCompany &&
      !companies.find(c => String(c.id) === String(currentCompany.id))
    ) {
      currentCompany = null;
      selectedCompanyName.textContent = 'Selecciona una compañía';
      companyIconImg.style.display = 'none';
      companyIconText.style.display = 'block';
      companyIconText.textContent = '🏛️';
      companyLinkWrapper.style.display = 'none';

      if (editModeBtn) {
        isEditMode = false;
        editModeBtn.textContent = 'Editar';
        editModeBtn.disabled = true;
      }
      if (tabsContainer) {
        tabsContainer.style.display = 'none';
      }
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p>Selecciona una compañía para ver sus credenciales</p>
        </div>`;
    }
  };
  // ========= PARTNER BADGE (reusable) =========
  const updatePartnerBadge = () => {
    const partnerBadge = document.getElementById('partnerBadge');
    if (!partnerBadge || !currentCompany) return;

    const company = currentCompany;
    if (company.partner) {
      const icon = PARTNER_ICONS[company.partner] || '';
      partnerBadge.innerHTML = `${icon} <span>${company.partner}</span>`;
      partnerBadge.setAttribute('data-partner', company.partner);
      partnerBadge.style.display = 'inline-flex';
      partnerBadge.title = isEditMode ? 'Clic para cambiar partner' : '';
      partnerBadge.style.cursor = isEditMode ? 'pointer' : 'default';
    } else {
      if (isEditMode) {
        partnerBadge.textContent = '+ Asignar partner';
        partnerBadge.removeAttribute('data-partner');
        partnerBadge.style.display = 'inline-flex';
        partnerBadge.style.cursor = 'pointer';
        partnerBadge.title = 'Clic para asignar partner';
      } else {
        partnerBadge.style.display = 'none';
      }
    }

    // Click handler for editing partner
    partnerBadge.onclick = async () => {
      if (!isEditMode || !currentCompany) return;
      const sel = document.createElement('select');
      sel.style.cssText = 'padding:4px 10px;background:var(--bg-input);border:1px solid var(--accent);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:inherit;outline:none;';
      sel.innerHTML = `<option value="">Sin partner</option>` +
        PARTNERS.map(p => `<option value="${p}" ${company.partner === p ? 'selected' : ''}>${p}</option>`).join('');
      partnerBadge.replaceWith(sel);
      sel.focus();

const finishEdit = async () => {
        const newPartner = sel.value;
        company.partner = newPartner || '';
        try {
          await apiFetch(`/companies/${company.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ partner: company.partner })
          });
        } catch (e) { console.error('Error saving partner', e); }
        
        sel.replaceWith(partnerBadge);
        updatePartnerBadge();
        renderCompanies();
      };

      sel.addEventListener('change', finishEdit);
      sel.addEventListener('blur', finishEdit);
    };
  };

  // ========= DELETE COMPANY =========
  const deleteCompanyBtn = document.getElementById('deleteCompanyBtn');

  const updateDeleteBtn = () => {
    if (!deleteCompanyBtn) return;
    deleteCompanyBtn.style.display = (isEditMode && currentCompany) ? 'inline-flex' : 'none';
  };

  if (deleteCompanyBtn) {
    deleteCompanyBtn.addEventListener('click', async () => {
      if (!currentCompany) return;

      const confirmed = await showConfirmModal(
        '¿Eliminar compañía?',
        `Se eliminará permanentemente "${currentCompany.name}" y todos sus datos. Esta acción no se puede deshacer.`,
        'Eliminar',
        'Cancelar'
      );
      if (!confirmed) return;

      try {
        const deletedName = currentCompany.name;
// ==========================================
        // ✅ ELIMINAR EN MONGODB (Adiós Firebase)
        // ==========================================
        await apiFetch(`/companies/${currentCompany.id}`, { 
            method: 'DELETE' 
        });

        // Recargamos la lista desde la base de datos para que desaparezca
        const compRes = await apiFetch('/companies');
        const compJson = await compRes.json();
        if (compJson.success && compJson.data) {
          companies = compJson.data;
          renderCompanies();
        }

        // Reset UI
        currentCompany = null;
        isEditMode = false;
        if (editModeBtn) {
          editModeBtn.innerHTML = '<span class="btn-edit-icon">✏️</span><span class="btn-edit-label">Editar</span>';
          editModeBtn.disabled = true;
        }
        companyTitle.textContent = 'Selecciona una compañía';
        if (tabsContainer) tabsContainer.style.display = 'none';
        deleteCompanyBtn.style.display = 'none';
        const partnerBadge = document.getElementById('partnerBadge');
        if (partnerBadge) partnerBadge.style.display = 'none';
        gamesGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <p>Selecciona una compañía para ver sus credenciales</p>
          </div>`;
        updateAddCompanyBtnVisibility();

        toast.textContent = `✅ Compañía "${deletedName}" eliminada correctamente`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      } catch (error) {
        console.error('Error al eliminar compañía:', error);
        toast.textContent = '❌ Error al eliminar compañía';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    });
  }

  // ========= SELECCIÓN DE COMPAÑÍA Y TABS =========
  const selectCompany = company => {
    currentCompany = company;
    selectedCompanyId = company.id;
    selectedCompanyName.textContent = company.name;
    
    // Set the icon
    if (company.iconUrl) {
      companyIconImg.src = company.iconUrl;
      companyIconImg.style.display = 'block';
      companyIconText.style.display = 'none';
      companyIconBox.style.background = 'transparent';
    } else {
      companyIconImg.style.display = 'none';
      companyIconText.style.display = 'block';
      companyIconText.textContent = company.name.charAt(0).toUpperCase();
      companyIconBox.style.background = company.color || 'var(--bg-elevated)';
    }

    // Set the global link if available
    if (company.globalLink) {
      companyGlobalLink.href = company.globalLink;
      companyGlobalLink.textContent = company.globalLink;
      companyLinkWrapper.style.display = 'block';
    } else {
      companyLinkWrapper.style.display = 'none';
    }
    // Update partner badge in header
    updatePartnerBadge();
    updateDeleteBtn();
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `
        <span class="breadcrumb-item">Inicio</span>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">${company.name}</span>
      `;
    }
    gameSearch.value = '';

    if (isEditMode) {
      isEditMode = false;
      editModeBtn.textContent = 'Editar';
      updateAddCompanyBtnVisibility();
    }

    if (editModeBtn) {
      editModeBtn.disabled = false;
    }

    if (tabsContainer) {
      tabsContainer.style.display = 'flex';
    }

    currentTab = 'credenciales';
    switchTab('credenciales');
  };

  const switchTab = async (tabName) => {
    if (!currentCompany) return;

    if (isEditMode && currentTab !== tabName) {
      const confirmSwitch = await showConfirmModal(
        '¿Salir del modo edición?',
        'Los cambios no guardados se perderán.',
        'Salir',
        'Cancelar'
      );
      if (!confirmSwitch) return;
      isEditMode = false;
      editModeBtn.textContent = 'Editar';
    }

    currentTab = tabName;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('tab-active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('tab-pane-active', pane.dataset.pane === tabName);
    });

    switch (tabName) {
      case 'credenciales':
        renderGames(currentCompany.games, '');
        break;
      case 'deposito':
        renderDeposito(currentCompany);
        break;
      case 'cashout':
        renderCashout(currentCompany);
        break;
      case 'promociones':
        renderPromociones(currentCompany);
        break;
      case 'notas':
        renderNotas(currentCompany);
        break;
    }
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // ========= RENDER CREDENCIALES =========
  const renderGames = (games, term) => {
    const t = term.toLowerCase();
    const filtered = games.filter(
      g =>
        g.name.toLowerCase().includes(t) ||
        g.username.toLowerCase().includes(t)
    );

    let html = '';

    if (!filtered.length && !isEditMode) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No se encontraron juegos</p>
        </div>`;
    } else if (filtered.length) {
      html += filtered
        .map(g => {
          if (!isEditMode) {
            return `
          <div class="game-card">
            <div class="game-header">
              <div class="game-name">${g.name}</div>
            </div>
            <div class="game-details">
              <div class="detail-row">
                <span class="detail-label">Username:</span>
                <span class="detail-value">${g.username}</span>
                <button class="copy-btn" data-copy="${g.username}">${ICON_COPY}</button>
              </div>
              <div class="detail-row">
                <span class="detail-label">Link:</span>
                <span class="detail-value">${g.link}</span>
                <button class="link-btn"
                        data-link="${g.link}" title="Abrir enlace">${ICON_EXTERNAL}</button>
              </div>
            </div>
          </div>
        `;
          }

          return `
        <div class="game-card" data-edit-card="1"
             data-company-id="${currentCompany.id}" data-game-id="${g.id}">
          <div class="game-header">
            <div class="game-name">${g.name}</div>
          </div>
          <div class="game-details">
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <input class="edit-username-input"
                     data-company-id="${currentCompany.id}"
                     data-game-id="${g.id}"
                     value="${g.username}">
            </div>
            <div class="detail-row">
              <span class="detail-label">Link:</span>
              <input class="edit-link-input"
                     data-company-id="${currentCompany.id}"
                     data-game-id="${g.id}"
                     value="${g.link}">
            </div>
          </div>
          <div class="edit-actions">
            <button class="save-edit-btn"
                    data-company-id="${currentCompany.id}"
                    data-game-id="${g.id}">
              Guardar
            </button>
            <button class="delete-game-btn"
                    data-company-id="${currentCompany.id}"
                    data-game-id="${g.id}">
              Eliminar
            </button>
          </div>
        </div>
      `;
        })
        .join('');
    }

    if (isEditMode && currentCompany) {
      const catalogOptions = gameCatalog.map(g =>
        `<option value="${g.id}" data-link="${g.link}">${g.name}</option>`
      ).join('');
      html += `
        <div class="game-card new-game-card">
          <div class="game-header">
            <div class="game-name">Nuevo juego</div>
          </div>
          <div class="game-details">
            <div class="detail-row">
              <span class="detail-label">Juego:</span>
              <select class="new-game-select" style="flex:1;padding:7px 10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:inherit;outline:none;">
                <option value="" disabled selected>Selecciona del catálogo...</option>
                ${catalogOptions}
                <option value="__custom__">✏️ Otro (escribir nombre)</option>
              </select>
            </div>
            <div class="detail-row new-game-custom-row" style="display:none;">
              <span class="detail-label">Nombre:</span>
              <input class="new-game-name-input" placeholder="Nombre personalizado">
            </div>
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <input class="new-game-username-input">
            </div>
            <div class="detail-row">
              <span class="detail-label">Link:</span>
              <input class="new-game-link-input">
            </div>
          </div>
          <div class="edit-actions" style="display:flex;gap:8px;">
            <button class="add-game-btn">Agregar juego</button>
            <button class="import-games-btn" style="padding:8px 16px;background:transparent;color:var(--accent);border:1px dashed var(--accent);border-radius:var(--radius-sm);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;">📥 Importar juegos</button>
          </div>
        </div>
      `;
    }

    gamesGrid.innerHTML = html;
    if (isEditMode && currentCompany) {
      attachEditInputsListeners();
      // Catalog select handler
      const gameSelect = gamesGrid.querySelector('.new-game-select');
      if (gameSelect) {
        gameSelect.addEventListener('change', () => {
          const val = gameSelect.value;
          const customRow = gamesGrid.querySelector('.new-game-custom-row');
          const linkInput = gamesGrid.querySelector('.new-game-link-input');
          const nameInput = gamesGrid.querySelector('.new-game-name-input');
          if (val === '__custom__') {
            customRow.style.display = 'flex';
            if (nameInput) nameInput.value = '';
            if (linkInput) linkInput.value = '';
            nameInput.focus();
          } else {
            customRow.style.display = 'none';
            const selectedOption = gameSelect.options[gameSelect.selectedIndex];
            const catalogLink = selectedOption.getAttribute('data-link') || '';
            if (linkInput) linkInput.value = catalogLink;
            if (nameInput) nameInput.value = selectedOption.textContent;
          }
        });
      }
    }
  };

  // ========= RENDER MÉTODOS DE DEPÓSITO =========
  const renderDeposito = (company) => {
    const container = document.getElementById('depositoContent');
    if (!container) return;

    const metodos = company.metodosDeposito || [];

    if (!isEditMode) {
      if (metodos.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Métodos de depósito</h3>
            <p>No hay métodos de depósito disponibles.</p>
          </div>
        `;
        return;
      }

      let html = '<div class="section-header"><h3>Métodos de depósito</h3></div><div class="methods-grid">';

      metodos.forEach((metodo) => {
        const title = metodo.metodo || metodo.metodoPago || 'Método de depósito';
        const provider = metodo.proveedor || 'N/A';
        const min = metodo.montoMinimo || 'N/A';
        const max = metodo.montoMaximo || 'N/A';
        
        html += `
          <div class="method-card">
            <div class="method-header">
              <div class="method-title">${title}</div>
            </div>
            <div class="method-details">
              <div class="method-row">
                <span class="method-label">Proveedor</span>
                <span class="method-value">${provider}</span>
              </div>
              <div class="method-row">
                <span class="method-label">Monto mínimo</span>
                <span class="method-value highlight">${min}</span>
              </div>
              <div class="method-row">
                <span class="method-label">Monto máximo</span>
                <span class="method-value highlight">${max}</span>
              </div>
            </div>
          </div>
        `;
      });

      html += '</div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Métodos de depósito</h3>';

      metodos.forEach((metodo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.metodo || metodo.metodoPago || ''}" 
                data-index="${index}"
                data-field="metodo"
                placeholder="Nombre del método"
              />
              <button class="delete-btn" data-index="${index}" data-type="deposito">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Proveedor:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.proveedor || ''}" 
                data-index="${index}"
                data-field="proveedor"
              />
              <label>Monto mínimo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMinimo || ''}" 
                data-index="${index}"
                data-field="montoMinimo"
              />
              <label>Monto máximo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMaximo || ''}" 
                data-index="${index}"
                data-field="montoMaximo"
              />
            </div>
          </div>
        `;
      });

      html += `
        <button class="add-new-btn" data-type="deposito">
          + Agregar método de depósito
        </button>
      `;

      html += '</div>';
      container.innerHTML = html;
    }
  };

  // ========= RENDER MÉTODOS DE CASHOUT =========
  const renderCashout = (company) => {
    const container = document.getElementById('cashoutContent');
    if (!container) return;

    const metodos = company.metodosCashout || [];

    if (!isEditMode) {
      if (metodos.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Métodos de cashout</h3>
            <p>No hay métodos de cashout disponibles.</p>
          </div>
        `;
        return;
      }

      let html = '<div class="section-header"><h3>Métodos de cashout</h3></div><div class="methods-grid">';

      metodos.forEach((metodo) => {
        const title = metodo.metodo || metodo.metodoPago || 'Método de cashout';
        const provider = metodo.proveedor || 'N/A';
        const min = metodo.montoMinimo || 'N/A';
        const max = metodo.montoMaximo || 'N/A';

        html += `
          <div class="method-card">
            <div class="method-header">
              <div class="method-title">${title}</div>
            </div>
            <div class="method-details">
              <div class="method-row">
                <span class="method-label">Proveedor</span>
                <span class="method-value">${provider}</span>
              </div>
              <div class="method-row">
                <span class="method-label">Monto mínimo</span>
                <span class="method-value highlight">${min}</span>
              </div>
              <div class="method-row">
                <span class="method-label">Monto máximo</span>
                <span class="method-value highlight">${max}</span>
              </div>
            </div>
          </div>
        `;
      });

      html += '</div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Métodos de cashout</h3>';

      metodos.forEach((metodo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.metodo || metodo.metodoPago || ''}" 
                data-index="${index}"
                data-field="metodo"
                placeholder="Nombre del método"
              />
              <button class="delete-btn" data-index="${index}" data-type="cashout">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Proveedor:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.proveedor || ''}" 
                data-index="${index}"
                data-field="proveedor"
              />
              <label>Monto mínimo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMinimo || ''}" 
                data-index="${index}"
                data-field="montoMinimo"
              />
              <label>Monto máximo:</label>
              <input 
                type="text" 
                class="edit-input" 
                value="${metodo.montoMaximo || ''}" 
                data-index="${index}"
                data-field="montoMaximo"
              />
            </div>
          </div>
        `;
      });

      html += `
        <button class="add-new-btn" data-type="cashout">
          + Agregar método de cashout
        </button>
      `;

      html += '</div>';
      container.innerHTML = html;
    }
  };



  // ========= RENDER PROMOCIONES =========
  const renderPromociones = (company) => {
    const container = document.getElementById('promocionesContent');
    if (!container) return;

    const promociones = company.promociones || [];

    if (!isEditMode) {
      if (promociones.length === 0) {
        container.innerHTML = `
          <div class="tab-info-card">
            <h3>Promociones activas</h3>
            <p>No hay promociones disponibles.</p>
          </div>
        `;
        return;
      }

      let html = '<div class="tab-info-card"><h3>Promociones activas</h3>';
      html += '<div class="promociones-simple-list">';

      promociones.forEach((promo, index) => {
        html += `
          <div class="promocion-simple-item">
            <div class="promocion-simple-title">${promo.titulo || 'Promoción ' + (index + 1)}</div>
            <div class="promocion-simple-desc">${promo.descripcion || 'Sin descripción'}</div>
          </div>
        `;
      });

      html += '</div></div>';
      container.innerHTML = html;
    } else {
      let html = '<div class="edit-section"><h3>Promociones activas</h3>';

      promociones.forEach((promo, index) => {
        html += `
          <div class="edit-metodo-card">
            <div class="edit-card-header">
              <input 
                type="text" 
                class="edit-input" 
                value="${promo.titulo || ''}" 
                data-index="${index}"
                data-field="titulo"
                placeholder="Título de la promoción"
              />
              <button class="delete-btn" data-index="${index}" data-type="promociones">🗑️</button>
            </div>
            <div class="edit-card-body">
              <label>Descripción:</label>
              <textarea 
                class="edit-textarea" 
                rows="3"
                data-index="${index}"
                data-field="descripcion"
                placeholder="Descripción de la promoción"
              >${promo.descripcion || ''}</textarea>
            </div>
          </div>
        `;
      });

      html += `
        <button class="add-new-btn" data-type="promociones">
          + Agregar promoción
        </button>
      `;

      html += '</div>';
      container.innerHTML = html;
    }
  };



  // ========= RENDER NOTAS (TIMELINE) =========
  const renderNotas = (company) => {
    const container = document.getElementById('notasContent');
    if (!container) return;

    const notas = Array.isArray(company.notas) ? company.notas : [];

    if (!isEditMode) {
      // MODO VISTA
      if (notas.length === 0) {
        container.innerHTML = `
        <div class="tab-info-card">
          <h3>Notas</h3>
          <p>No hay notas registradas para esta compañía.</p>
        </div>
      `;
        return;
      }

      const sortedNotas = [...notas].sort((a, b) =>
        new Date(b.fecha) - new Date(a.fecha)
      );

      let html = '<div class="notas-list">';
      sortedNotas.forEach((nota) => {
        const fechaObj = new Date(nota.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
        <div class="nota-item">
          <div class="nota-header">
            <span class="nota-fecha">📌 ${fechaFormateada}</span>
          </div>
          <div class="nota-texto">${nota.texto}</div>
        </div>
      `;
      });
      html += '</div>';

      container.innerHTML = html;

    } else {
      // MODO EDICIÓN - USAR ÍNDICES ORIGINALES
      let html = '<div class="edit-section"><h3>Notas</h3>';

      // Crear array con índices originales para mapeo correcto
      const notasConIndice = notas.map((nota, originalIndex) => ({
        nota,
        originalIndex
      })).sort((a, b) =>
        new Date(b.nota.fecha) - new Date(a.nota.fecha)
      );

      notasConIndice.forEach(({ nota, originalIndex }) => {
        const fechaObj = new Date(nota.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
        <div class="edit-nota-card">
          <div class="edit-card-header">
            <span class="nota-fecha-edit">📌 ${fechaFormateada}</span>
            <button class="delete-btn" data-index="${originalIndex}" data-type="nota">🗑️</button>
          </div>
          <textarea 
            class="edit-textarea edit-nota-textarea" 
            rows="4" 
            data-index="${originalIndex}"
          >${nota.texto}</textarea>
        </div>
      `;
      });

      html += `
      <div class="new-nota-card">
        <h4>➕ Nueva nota</h4>
        <textarea 
          id="newNotaTextarea"
          class="edit-textarea" 
          rows="5"
          placeholder="Escribe tu nueva nota aquí..."
        ></textarea>
        <button class="add-new-btn" data-type="nota">Agregar nota</button>
      </div>
    `;

      html += '</div>';
      container.innerHTML = html;
    }
  };

// ========= GUARDAR CAMBIOS POR TAB (100% MONGODB) =========
  const saveCurrentTab = async () => {
    if (!currentCompany) return;

    const companyIndex = companies.findIndex(c => c.id === currentCompany.id);
    if (companyIndex === -1) return;

    let updateData = {}; // Aquí empacaremos lo que enviaremos a Mongo

    try {
      switch (currentTab) {
        case 'credenciales':
          updateData.games = currentCompany.games;
          break;

        case 'deposito':
          const depositoContainer = document.getElementById('depositoContent');
          const metodosDeposito = [];
          depositoContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            metodosDeposito.push({
              metodo: card.querySelector('[data-field="metodo"]').value,
              proveedor: card.querySelector('[data-field="proveedor"]').value,
              montoMinimo: card.querySelector('[data-field="montoMinimo"]').value,
              montoMaximo: card.querySelector('[data-field="montoMaximo"]').value
            });
          });
          updateData.metodosDeposito = metodosDeposito;
          currentCompany.metodosDeposito = metodosDeposito;
          break;

        case 'cashout':
          const cashoutContainer = document.getElementById('cashoutContent');
          const metodosCashout = [];
          cashoutContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            metodosCashout.push({
              metodo: card.querySelector('[data-field="metodo"]').value,
              proveedor: card.querySelector('[data-field="proveedor"]').value,
              montoMinimo: card.querySelector('[data-field="montoMinimo"]').value,
              montoMaximo: card.querySelector('[data-field="montoMaximo"]').value
            });
          });
          updateData.metodosCashout = metodosCashout;
          currentCompany.metodosCashout = metodosCashout;
          break;

        case 'promociones':
          const promocionesContainer = document.getElementById('promocionesContent');
          const promociones = [];
          promocionesContainer.querySelectorAll('.edit-metodo-card').forEach((card) => {
            promociones.push({
              titulo: card.querySelector('[data-field="titulo"]').value,
              descripcion: card.querySelector('[data-field="descripcion"]').value
            });
          });
          updateData.promociones = promociones;
          currentCompany.promociones = promociones;
          break;

        case 'notas':
          const notaTextareas = document.querySelectorAll('.edit-nota-textarea');
          notaTextareas.forEach(textarea => {
            const index = parseInt(textarea.dataset.index);
            if (currentCompany.notas[index]) {
              currentCompany.notas[index].texto = textarea.value.trim();
            }
          });
          updateData.notas = currentCompany.notas;
          break;
      }

      // ✅ EL ÚNICO LLAMADO A MONGODB PARA GUARDAR LA PESTAÑA ACTUAL
      await apiFetch(`/companies/${currentCompany.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      toast.textContent = '✅ Cambios guardados correctamente';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);

    } catch (error) {
      console.error('Error al guardar en MongoDB:', error);
      toast.textContent = '❌ Error al guardar cambios';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  };

  // ========= EVENT DELEGATION PARA BOTONES DE EDICIÓN =========
  document.addEventListener('click', (e) => {
    // Agregar nuevo elemento
    const addBtn = e.target.closest('.add-new-btn');
    if (addBtn && isEditMode) {
      const type = addBtn.dataset.type;

      switch (type) {
        case 'deposito':
          if (!currentCompany.metodosDeposito) currentCompany.metodosDeposito = [];
          currentCompany.metodosDeposito.push({ metodo: '', proveedor: '', montoMinimo: '', montoMaximo: '' });
          renderDeposito(currentCompany);
          break;
        case 'cashout':
          if (!currentCompany.metodosCashout) currentCompany.metodosCashout = [];
          currentCompany.metodosCashout.push({ metodo: '', proveedor: '', montoMinimo: '', montoMaximo: '' });
          renderCashout(currentCompany);
          break;
        case 'promociones':
          if (!currentCompany.promociones) currentCompany.promociones = [];
          currentCompany.promociones.push({ titulo: '', descripcion: '' });
          renderPromociones(currentCompany);
          break;
        case 'nota':
          const textarea = document.getElementById('newNotaTextarea');
          if (!textarea) return;

          const textoNota = textarea.value.trim();
          if (!textoNota) {
            toast.textContent = 'Escribe algo en la nota';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 1500);
            return;
          }

          const nuevaNota = {
            texto: textoNota,
            fecha: new Date().toISOString()
          };

          if (!Array.isArray(currentCompany.notas)) {
            currentCompany.notas = [];
          }

          currentCompany.notas.push(nuevaNota);
          renderNotas(currentCompany);

          toast.textContent = '✅ Nota agregada (recuerda guardar)';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1500);
          break;
      }
    }

    // Eliminar elemento
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn && isEditMode) {
      const type = deleteBtn.dataset.type;
      const index = parseInt(deleteBtn.dataset.index);

      if (!confirm('¿Eliminar este elemento?')) return;

      switch (type) {
        case 'deposito':
          currentCompany.metodosDeposito.splice(index, 1);
          renderDeposito(currentCompany);
          break;
        case 'cashout':
          currentCompany.metodosCashout.splice(index, 1);
          renderCashout(currentCompany);
          break;
        case 'promociones':
          currentCompany.promociones.splice(index, 1);
          renderPromociones(currentCompany);
          break;
        case 'nota':
          if (Array.isArray(currentCompany.notas)) {
            currentCompany.notas.splice(index, 1);
            renderNotas(currentCompany);

            toast.textContent = '🗑️ Nota eliminada (recuerda guardar)';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 1500);
          }
          break;
      }
    }
  });

  // ========= MARCAR INPUTS MODIFICADOS (CREDENCIALES) =========
  const attachEditInputsListeners = () => {
    if (!currentCompany || !isEditMode) return;

    const usernameInputs = gamesGrid.querySelectorAll('.edit-username-input');
    const linkInputs = gamesGrid.querySelectorAll('.edit-link-input');

    usernameInputs.forEach(input => {
      const companyId = input.getAttribute('data-company-id');
      const gameId = input.getAttribute('data-game-id');
      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const original = game.username ?? '';
      input.addEventListener('input', () => {
        const current = input.value.trim();
        if (current !== original) {
          input.classList.add('input-dirty');
        } else {
          input.classList.remove('input-dirty');
        }
      });
    });

    linkInputs.forEach(input => {
      const companyId = input.getAttribute('data-company-id');
      const gameId = input.getAttribute('data-game-id');
      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const original = game.link ?? '';
      input.addEventListener('input', () => {
        const current = input.value.trim();
        if (current !== original) {
          input.classList.add('input-dirty');
        } else {
          input.classList.remove('input-dirty');
        }
      });
    });
  };

  // ========= BÚSQUEDAS =========
  gameSearch.addEventListener('input', e => {
    if (!currentCompany) return;
    renderGames(currentCompany.games, e.target.value);
  });

  const renderGlobalResults = term => {
    const t = term.toLowerCase();
    if (!t) {
      gamesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <p>Selecciona una compañía</p>
      </div>`;
      return;
    }

    const results = [];
    const shouldSearch = (category) => activeCategoryFilters.length === 0 || activeCategoryFilters.includes(category);

    companies.forEach(company => {
      // Company filter: check omnibar company pills + partner filter
      const isVisibleBySearchFilter =
        activeSearchCompanyIds.length === 0 ||
        activeSearchCompanyIds.includes(company.id);
      const isVisibleByPartner =
        activePartnerFilters.length === 0 ||
        activePartnerFilters.includes(company.partner || '');
      if (!isVisibleBySearchFilter || !isVisibleByPartner) return;

      const matches = {
        credenciales: [],
        deposito: [],
        cashout: [],
        promociones: [],
        notas: []
      };

      let hasMatches = false;

      // 1. BUSCAR EN CREDENCIALES (juegos)
      if (shouldSearch('credenciales')) {
        company.games.forEach(g => {
          if (
            g.name.toLowerCase().includes(t) ||
            g.username.toLowerCase().includes(t) ||
            g.link.toLowerCase().includes(t)
          ) {
            matches.credenciales.push(g);
            hasMatches = true;
          }
        });
      }

      // 2. BUSCAR EN MÉTODOS DE DEPÓSITO
      if (shouldSearch('deposito') && Array.isArray(company.metodosDeposito)) {
        company.metodosDeposito.forEach(m => {
          const searchText = `${m.metodo || ''} ${m.proveedor || ''} ${m.montoMinimo || ''} ${m.montoMaximo || ''}`.toLowerCase();
          if (searchText.includes(t)) {
            matches.deposito.push(m);
            hasMatches = true;
          }
        });
      }

      // 3. BUSCAR EN MÉTODOS DE CASHOUT
      if (shouldSearch('cashout') && Array.isArray(company.metodosCashout)) {
        company.metodosCashout.forEach(m => {
          const searchText = `${m.metodo || ''} ${m.proveedor || ''} ${m.montoMinimo || ''} ${m.montoMaximo || ''}`.toLowerCase();
          if (searchText.includes(t)) {
            matches.cashout.push(m);
            hasMatches = true;
          }
        });
      }



      // 5. BUSCAR EN PROMOCIONES
      if (shouldSearch('promociones') && Array.isArray(company.promociones)) {
        company.promociones.forEach(p => {
          const searchText = `${p.titulo || ''} ${p.descripcion || ''}`.toLowerCase();
          if (searchText.includes(t)) {
            matches.promociones.push(p);
            hasMatches = true;
          }
        });
      }



      // 8. BUSCAR EN NOTAS
      if (shouldSearch('notas') && Array.isArray(company.notas)) {
        company.notas.forEach(n => {
          if (n.texto.toLowerCase().includes(t)) {
            matches.notas.push(n);
            hasMatches = true;
          }
        });
      }

      if (hasMatches) {
        results.push({ company, matches });
      }
    });

    if (!results.length) {
      gamesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No se encontraron resultados para "${term}"</p>
      </div>`;
      return;
    }

    gamesGrid.innerHTML = results.map(({ company, matches }) => {
      let html = `
      <div class="global-results">
        <h3>
          <div style="background:${company.color};width:4px;height:20px;display:inline-block;margin-right:8px;"></div>
          ${company.name}
        </h3>
    `;

      // CREDENCIALES
      if (matches.credenciales.length > 0) {
        html += `<div class="result-section"><h4>🎮 Credenciales (${matches.credenciales.length})</h4>`;
        matches.credenciales.forEach(g => {
          const disabledAttr = g.active ? '' : 'disabled';
          const disabledClass = g.active ? '' : 'disabled';
          html += `
          <div class="game-card">
            <div class="game-header">
              <div class="game-name">${g.name}</div>
            </div>
            <div class="game-details">
              <div class="detail-row">
                <span class="detail-label">Username:</span>
                <span class="detail-value">${g.username}</span>
                <button class="copy-btn" data-copy="${g.username}">${ICON_COPY}</button>
              </div>
              <div class="detail-row">
                <span class="detail-label">Link:</span>
                <span class="detail-value">${g.link}</span>
                <button class="link-btn"
                        data-link="${g.link}" title="Abrir enlace">${ICON_EXTERNAL}</button>
              </div>
            </div>
          </div>
        `;
        });
        html += '</div>';
      }

      // DEPÓSITO
      if (matches.deposito.length > 0) {
        html += `<div class="result-section"><h4>💰 Métodos de depósito (${matches.deposito.length})</h4>`;
        matches.deposito.forEach(m => {
          html += `
          <div class="search-result-card">
            <div class="search-result-title">${m.metodo || m.metodoPago || 'Método de depósito'}</div>
            <div class="search-result-text">Proveedor: ${m.proveedor || 'N/A'}</div>
            <div class="search-result-text">Monto: ${m.montoMinimo || 'N/A'} - ${m.montoMaximo || 'N/A'}</div>
          </div>
        `;
        });
        html += '</div>';
      }

      // CASHOUT
      if (matches.cashout.length > 0) {
        html += `<div class="result-section"><h4>💸 Métodos de cashout (${matches.cashout.length})</h4>`;
        matches.cashout.forEach(m => {
          html += `
          <div class="search-result-card">
            <div class="search-result-title">${m.metodo || m.metodoPago || 'Método de cashout'}</div>
            <div class="search-result-text">Proveedor: ${m.proveedor || 'N/A'}</div>
            <div class="search-result-text">Monto: ${m.montoMinimo || 'N/A'} - ${m.montoMaximo || 'N/A'}</div>
          </div>
        `;
        });
        html += '</div>';
      }



      // PROMOCIONES
      if (matches.promociones.length > 0) {
        html += `<div class="result-section"><h4>🎁 Promociones (${matches.promociones.length})</h4>`;
        matches.promociones.forEach(p => {
          html += `
          <div class="search-result-card">
            <div class="search-result-title">${p.titulo || 'Promoción'}</div>
            <div class="search-result-text">${p.descripcion || 'Sin descripción'}</div>
          </div>
        `;
        });
        html += '</div>';
      }



      // NOTAS
      if (matches.notas.length > 0) {
        html += `<div class="result-section"><h4>📝 Notas (${matches.notas.length})</h4>`;
        matches.notas.forEach(n => {
          const fechaObj = new Date(n.fecha);
          const fechaFormateada = fechaObj.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          const preview = n.texto.substring(0, 120) + (n.texto.length > 120 ? '...' : '');
          html += `
          <div class="search-result-card">
            <div class="search-result-date">📌 ${fechaFormateada}</div>
            <div class="search-result-text">${preview}</div>
          </div>
        `;
        });
        html += '</div>';
      }

      html += '</div>';
      return html;
    }).join('');
  };

  globalSearch.addEventListener('input', e => {
    renderGlobalResults(e.target.value);
  });

  // ========= HELPERS CREAR / ELIMINAR (CREDENCIALES) =========
  const getNextGameId = company => {
    if (!company.games.length) return 1;
    const maxId = company.games.reduce(
      (max, g) => Math.max(max, Number(g.id)),
      0
    );
    return maxId + 1;
  };

// ========= MONGO: ELIMINAR JUEGO =========
  const deleteGameFromCompany = async (companyId, gameId) => {
    const company = companies.find(c => String(c.id) === String(companyId));
    if (!company) return;

    company.games = company.games.filter(g => String(g.id) !== String(gameId));

    try {
      await apiFetch(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ games: company.games })
      });
    } catch (e) { console.error("Error eliminando juego:", e); }

    renderCompanies();
    if (currentCompany && String(currentCompany.id) === String(companyId)) {
      renderGames(currentCompany.games, gameSearch.value);
    }
  };

// ========= MONGO: AGREGAR JUEGO =========
  const addGameToCurrentCompany = async () => {
    if (!currentCompany) return;

    const gameSelect = gamesGrid.querySelector('.new-game-select');
    const nameInput = gamesGrid.querySelector('.new-game-name-input');
    const userInput = gamesGrid.querySelector('.new-game-username-input');
    const linkInput = gamesGrid.querySelector('.new-game-link-input');

    if (!userInput || !linkInput) return;

    let name = '';
    if (gameSelect && gameSelect.value && gameSelect.value !== '__custom__') {
      name = gameSelect.options[gameSelect.selectedIndex].textContent.trim();
    } else if (nameInput) {
      name = nameInput.value.trim();
    }

    const username = userInput.value.trim();
    const link = linkInput.value.trim();

    if (!name) {
      toast.textContent = '⚠️ Selecciona o escribe un nombre de juego';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1500);
      return;
    }

    const newId = getNextGameId(currentCompany);
    const newGame = { id: newId, name, username, link, active: true };

    const ok = await showConfirmModal(
      '¿Crear juego?',
      `Estás a punto de crear el juego "${name}" en ${currentCompany.name}. ¿Quieres proceder?`,
      'Crear', 'Cancelar'
    );
    if (!ok) return;

    currentCompany.games.push(newGame);

    try {
      await apiFetch(`/companies/${currentCompany.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ games: currentCompany.games })
      });
    } catch(e) { console.error("Error agregando juego:", e); }

    renderCompanies();
    renderGames(currentCompany.games, gameSearch.value);

    if(nameInput) nameInput.value = '';
    userInput.value = '';
    linkInput.value = '';

    toast.textContent = 'Juego agregado';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1200);
  };

// ========= EVENTOS GRID (CREDENCIALES) =========
  gamesGrid.addEventListener('click', async e => { // <-- Se agregó "async" aquí
    if (!companies || !companies.length) return;

    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn && !isEditMode) {
      if (
        copyBtn.classList.contains('disabled') ||
        copyBtn.hasAttribute('disabled')
      ) {
        return;
      }
      const text = copyBtn.getAttribute('data-copy') || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        toast.textContent =
          'Copiado: ' +
          (text.length > 20 ? text.slice(0, 20) + '…' : text);
        toast.classList.add('show');
        copyBtn.innerHTML = '✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          toast.classList.remove('show');
          copyBtn.innerHTML = ICON_COPY;
          copyBtn.classList.remove('copied');
        }, 1500);
      });
      return;
    }

    const linkBtn = e.target.closest('.link-btn');
    if (linkBtn && !isEditMode) {
      if (
        linkBtn.classList.contains('disabled') ||
        linkBtn.hasAttribute('disabled')
      ) {
        return;
      }
      const url = linkBtn.getAttribute('data-link');
      if (url) {
        window.open(url, '_blank', 'noopener');
      }
      return;
    }

    const saveBtn = e.target.closest('.save-edit-btn');
    if (saveBtn && isEditMode) {
      const companyId = saveBtn.getAttribute('data-company-id');
      const gameId = saveBtn.getAttribute('data-game-id');

      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const usernameInput = gamesGrid.querySelector(
        `.edit-username-input[data-company-id="${companyId}"][data-game-id="${gameId}"]`
      );
      const linkInput = gamesGrid.querySelector(
        `.edit-link-input[data-company-id="${companyId}"][data-game-id="${gameId}"]`
      );

      const newUsername = usernameInput ? usernameInput.value.trim() : game.username;
      const newLink = linkInput ? linkInput.value.trim() : game.link;

      if (newUsername === game.username && newLink === game.link) {
        return;
      }

      const okEdit = confirm(
        `¿Estás seguro que quieres editar los datos del juego "${game.name}"?`
      );
      if (!okEdit) return;

      // Actualizamos los datos en la memoria local
      game.username = newUsername;
      game.link = newLink;

      // ===============================================
      // ✅ NUEVA LLAMADA A MONGODB (Reemplaza a Firebase)
      // ===============================================
      try {
        saveBtn.textContent = "Guardando...";
        saveBtn.disabled = true;

        await apiFetch(`/companies/${companyId}`, {
          method: 'PATCH',
          body: JSON.stringify({ games: company.games }) // Enviamos la lista de juegos actualizada
        });

        // Refrescamos la vista de la cuadrícula
        renderGames(currentCompany.games, gameSearch.value);

        toast.textContent = 'Cambios guardados';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1200);

      } catch (error) {
        console.error("Error al guardar edición de juego:", error);
        saveBtn.textContent = "Guardar";
        saveBtn.disabled = false;
        toast.textContent = '❌ Error al guardar';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
      }
      // ===============================================

      return;
    }

    const deleteBtn = e.target.closest('.delete-game-btn');
    if (deleteBtn && isEditMode) {
      const companyId = deleteBtn.getAttribute('data-company-id');
      const gameId = deleteBtn.getAttribute('data-game-id');

      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return;
      const game = company.games.find(g => String(g.id) === String(gameId));
      if (!game) return;

      const okDel = confirm(
        `¿Seguro que quieres eliminar el juego "${game.name}"?`
      );
      if (okDel) {
        deleteGameFromCompany(companyId, gameId);
      }
      return;
    }

    const addBtn = e.target.closest('.add-game-btn');
    if (addBtn && isEditMode) {
      addGameToCurrentCompany();
      return;
    }

    const importBtn = e.target.closest('.import-games-btn');
    if (importBtn && isEditMode && currentCompany) {
      // Build source company options (same partner, with games)
      const partner = currentCompany.partner;
      const sources = companies.filter(c =>
        String(c.id) !== String(currentCompany.id) &&
        c.partner === partner &&
        c.games && c.games.length > 0
      );

      if (!sources.length) {
        toast.textContent = '⚠️ No hay otras compañías del mismo partner con juegos';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
        return;
      }

      // Show import modal
      const existing = document.getElementById('customConfirmModal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'customConfirmModal';
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-box" style="max-width:400px;">
          <div class="confirm-icon">📥</div>
          <h3 class="confirm-title">Importar juegos</h3>
          <p class="confirm-message">Selecciona una compañía de ${partner} para copiar sus juegos (nombre, username y link).</p>
          <select id="importSourceSelect" style="width:100%;padding:9px 12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;margin-bottom:16px;">
            <option value="">Selecciona una compañía...</option>
            ${sources.map(c => `<option value="${c.id}">${c.name} (${c.games.length} juegos)</option>`).join('')}
          </select>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-btn-cancel">Cancelar</button>
            <button class="confirm-btn confirm-btn-accept">Importar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));

      const closeOverlay = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
      };

      overlay.querySelector('.confirm-btn-cancel').addEventListener('click', closeOverlay);

      overlay.querySelector('.confirm-btn-accept').addEventListener('click', async () => {
        const sourceId = overlay.querySelector('#importSourceSelect').value;
        if (!sourceId) {
          toast.textContent = '⚠️ Selecciona una compañía de origen';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
          return;
        }
        const source = companies.find(c => String(c.id) === String(sourceId));
        if (!source) return;

        // Get current max game id
        const maxGameId = currentCompany.games.length > 0
          ? Math.max(...currentCompany.games.map(g => Number(g.id) || 0))
          : -1;

        const newGames = source.games.map((g, i) => ({
          id: maxGameId + 1 + i,
          name: g.name,
          username: g.username || '',
          link: g.link || '',
          active: true,
          lastModified: new Date().toISOString().split('T')[0]
        }));

        // Add to local array
        currentCompany.games.push(...newGames);

        // Save all to MongoDB
        try {
          await apiFetch(`/companies/${currentCompany.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ games: currentCompany.games })
          });
          toast.textContent = `✅ ${newGames.length} juegos importados de ${source.name}`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
          renderCompanies();
          switchTab('credenciales');
        } catch (err) {
          console.error('Error importing games:', err);
          toast.textContent = '❌ Error al importar juegos';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
        closeOverlay();
      });

      return;
    }


  });

  // ========= BOTÓN EDITAR =========
if (editModeBtn) {
    editModeBtn.addEventListener('click', async () => {
      if (!currentCompany) return;

      if (!isEditMode) {
        // ========== ENTRAR EN MODO EDICIÓN ==========
        
        // 1. Verificamos la llave que nos dejó el Hub
        const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
        adminLoggedIn = storedAdmin === 'true';

        // 2. Si es Analista (false), le denegamos el acceso directamente
        if (!adminLoggedIn) {
          toast.textContent = '❌ Solo los supervisores pueden editar';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
          return;
        }

        // 3. Si es Supervisor, entra directo sin pedir clave (El Hub ya validó)
        isEditMode = true;
        editModeBtn.textContent = 'Guardar';
        updateAddCompanyBtnVisibility();
        updatePartnerBadge();
        updateDeleteBtn();
        switchTab(currentTab);

      } else {
        // ========== GUARDAR Y SALIR DE MODO EDICIÓN (Queda Intacto) ==========
        const confirmSave = await showConfirmModal(
          '¿Guardar cambios?',
          'Se guardarán los cambios realizados en esta sección.',
          'Guardar',
          'Cancelar'
        );
        if (!confirmSave) return;

        await saveCurrentTab();

        isEditMode = false;
        editModeBtn.textContent = 'Editar';
        updateAddCompanyBtnVisibility();
        updatePartnerBadge();
        updateDeleteBtn();
        switchTab(currentTab);
      }
    });
}

  // ========= INICIALIZACIÓN =========
  const initApp = () => {
    const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
    adminLoggedIn = storedAdmin === 'true';

    updateAddCompanyBtnVisibility();

    renderCompanies();

    if (!companies.length) return;

    let target = null;

    if (selectedCompanyId != null) {
      target = companies.find(c => String(c.id) === String(selectedCompanyId));
    }

    if (!target) {
      target = companies[0];
    }

    if (target) {
      selectCompany(target);
    }
  };

  // ==================== AGREGAR COMPAÑÍA ==================== 
  const addCompanyBtn = document.getElementById('addCompanyBtn');

  // Crear modal HTML
  const createCompanyModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'addCompanyModal';
    modal.innerHTML = `
  <div class="modal-content" style="max-width:520px;">
    <div class="modal-header">
      <h2 class="modal-title">➕ Nueva compañía</h2>
      <button class="modal-close" id="closeModalBtn">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-field">
        <label for="companyName">Nombre de la compañía *</label>
        <input type="text" id="companyName" placeholder="Ej: Betsson, Inkabet, etc." />
      </div>
      
      <div class="modal-field">
        <label for="companyColor">Color identificador *</label>
        <div class="color-picker-container">
          <div class="color-preview" id="colorPreview" style="background: #3b82f6;"></div>
          <input type="text" id="companyColor" value="#3b82f6" placeholder="#3b82f6" />
        </div>
        <div class="color-suggestions" id="colorSuggestions"></div>
      </div>
      
      <div class="modal-field">
        <label for="companyPartner">Partner / Licencia *</label>
        <select id="companyPartner" style="width:100%;padding:9px 12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;">
          <option value="" disabled selected>Selecciona un partner</option>
          <option value="Dragon">🐲 Dragon</option>
          <option value="Eterniplay">🔒 Eterniplay</option>
          <option value="Taparcadia">🎮 Taparcadia</option>
          <option value="Wysaro">⭐ Wysaro</option>
          <option value="Manual">⚙️ Manual</option>
        </select>
      </div>

      <!-- Games clone section (hidden until partner selected) -->
      <div class="modal-field" id="gamesCloneSection" style="display:none;">
        <label>Juegos iniciales</label>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <select id="cloneSourceCompany" style="flex:1;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:inherit;outline:none;">
            <option value="">Copiar juegos de...</option>
          </select>
          <button type="button" id="cloneGamesBtn" style="padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;">Copiar</button>
        </div>
        <div id="gamesListContainer" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>
        <button type="button" id="addGameRow" style="margin-top:8px;padding:7px 14px;background:transparent;color:var(--accent);border:1px dashed var(--accent);border-radius:var(--radius-sm);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;width:100%;transition:all 0.15s;">+ Agregar juego</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn modal-btn-secondary" id="cancelModalBtn">Cancelar</button>
      <button class="modal-btn modal-btn-primary" id="createCompanyBtn">Crear compañía</button>
    </div>
  </div>
`;
    document.body.appendChild(modal);
    return modal;
  };

  // Paleta de colores sugeridos
  const coloresSugeridos = [
    '#3b82f6', // Azul
    '#ef4444', // Rojo
    '#10b981', // Verde
    '#f59e0b', // Naranja
    '#8b5cf6', // Morado
    '#ec4899', // Rosa
    '#06b6d4', // Cyan
    '#84cc16', // Lima
    '#f97316', // Naranja oscuro
    '#6366f1', // Índigo
    '#14b8a6', // Teal
    '#f43f5e', // Rosa rojo
  ];

  // Renderizar sugerencias de color
  const renderColorSuggestions = (container, inputElement, previewElement) => {
    container.innerHTML = '';
    coloresSugeridos.forEach(color => {
      const suggestion = document.createElement('div');
      suggestion.className = 'color-suggestion';
      suggestion.style.background = color;
      suggestion.title = color;
      suggestion.addEventListener('click', () => {
        inputElement.value = color;
        previewElement.style.background = color;
      });
      container.appendChild(suggestion);
    });
  };

  // Abrir modal
  const openAddCompanyModal = () => {
    let modal = document.getElementById('addCompanyModal');
    if (!modal) {
      modal = createCompanyModal();
    }

    const nameInput = document.getElementById('companyName');
    const colorInput = document.getElementById('companyColor');
    const colorPreview = document.getElementById('colorPreview');
    const colorSuggestions = document.getElementById('colorSuggestions');
    const partnerSelect = document.getElementById('companyPartner');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const createBtn = document.getElementById('createCompanyBtn');

    // Reset inputs
    nameInput.value = '';
    colorInput.value = '#3b82f6';
    colorPreview.style.background = '#3b82f6';
    partnerSelect.value = '';

    // Games clone elements
    const gamesCloneSection = document.getElementById('gamesCloneSection');
    const cloneSourceSelect = document.getElementById('cloneSourceCompany');
    const cloneBtn = document.getElementById('cloneGamesBtn');
    const gamesListContainer = document.getElementById('gamesListContainer');
    const addGameRowBtn = document.getElementById('addGameRow');
    let modalGamesList = []; // {name: string}

    // Hide games section initially
    gamesCloneSection.style.display = 'none';
    gamesListContainer.innerHTML = '';

    // Helper: render game rows
    const renderModalGames = () => {
      gamesListContainer.innerHTML = '';
      modalGamesList.forEach((game, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);';
        row.innerHTML = `
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="color:var(--text-tertiary);font-size:11px;min-width:20px;font-weight:600;">${idx + 1}.</span>
            <input type="text" value="${game.name}" data-field="name" data-idx="${idx}" style="flex:1;padding:5px 8px;background:var(--bg-main);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:inherit;outline:none;font-weight:600;" placeholder="Nombre del juego" />
            <button type="button" data-remove="${idx}" style="padding:4px 7px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);font-size:11px;cursor:pointer;font-family:inherit;" title="Eliminar">✕</button>
          </div>
          <div style="display:flex;gap:6px;padding-left:26px;">
            <input type="text" value="${game.username || ''}" data-field="username" data-idx="${idx}" style="flex:1;padding:4px 8px;background:var(--bg-main);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;font-family:inherit;outline:none;" placeholder="Username" />
            <input type="text" value="${game.link || ''}" data-field="link" data-idx="${idx}" style="flex:1;padding:4px 8px;background:var(--bg-main);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;font-family:inherit;outline:none;" placeholder="Link" />
          </div>
        `;
        // Edit handlers
        row.querySelectorAll('input').forEach(input => {
          input.addEventListener('input', e => {
            modalGamesList[idx][e.target.dataset.field] = e.target.value;
          });
        });
        // Remove handler
        row.querySelector('[data-remove]').addEventListener('click', () => {
          modalGamesList.splice(idx, 1);
          renderModalGames();
        });
        gamesListContainer.appendChild(row);
      });
    };

    // Partner change: show games section + populate source dropdown
    partnerSelect.onchange = () => {
      const selectedPartner = partnerSelect.value;
      if (!selectedPartner) {
        gamesCloneSection.style.display = 'none';
        return;
      }
      gamesCloneSection.style.display = 'block';
      // Populate source company dropdown with same-partner companies
      const samePartnerCompanies = companies.filter(c => c.partner === selectedPartner);
      cloneSourceSelect.innerHTML = '<option value="">Copiar juegos de...</option>';
      samePartnerCompanies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.games.length} juegos)`;
        cloneSourceSelect.appendChild(opt);
      });
      // Clear game list when partner changes
      modalGamesList = [];
      renderModalGames();
    };

    // Clone button: copy games from selected source
    cloneBtn.onclick = () => {
      const sourceId = cloneSourceSelect.value;
      if (!sourceId) {
        toast.textContent = '⚠️ Selecciona una compañía de origen';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }
      const sourceCompany = companies.find(c => String(c.id) === String(sourceId));
      if (!sourceCompany) return;
      modalGamesList = sourceCompany.games.map(g => ({ name: g.name, username: g.username || '', link: g.link || '' }));
      renderModalGames();
      toast.textContent = `✅ ${modalGamesList.length} juegos copiados de ${sourceCompany.name}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    };

    // Add game row
    addGameRowBtn.onclick = () => {
      modalGamesList.push({ name: '', username: '', link: '' });
      renderModalGames();
      // Focus last input
      const inputs = gamesListContainer.querySelectorAll('input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };

    // Renderizar sugerencias
    renderColorSuggestions(colorSuggestions, colorInput, colorPreview);

    // Actualizar preview en tiempo real
    colorInput.addEventListener('input', () => {
      const color = colorInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        colorPreview.style.background = color;
      }
    });

    // Cerrar modal
    const closeModal = () => {
      modal.classList.remove('show');
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;


    // Crear compañía
    createBtn.onclick = async () => {
      const name = nameInput.value.trim();
      const color = colorInput.value.trim();
      const partner = partnerSelect.value;

      // Validaciones
      if (!name) {
        toast.textContent = '⚠️ El nombre es obligatorio';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }

      if (!partner) {
        toast.textContent = '⚠️ Selecciona un partner';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        toast.textContent = '⚠️ Color inválido. Usa formato #RRGGBB';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }

      // Verificar nombre duplicado
      if (companies.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        toast.textContent = '⚠️ Ya existe una compañía con ese nombre';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
        return;
      }

      // Obtener el próximo ID disponible
      const maxId = companies.length > 0
        ? Math.max(...companies.map(c => Number(c.id) || 0))
        : 0;
      const newId = maxId + 1;

// Build games ARRAY (No un objeto, MongoDB usa Arrays)
      const validGames = modalGamesList.filter(g => g.name.trim());
      const gamesArray = validGames.map((g, idx) => ({
          id: idx,
          name: g.name.trim(),
          username: g.username || '',
          link: g.link || '',
          active: true,
          lastModified: new Date().toISOString().split('T')[0]
      }));

      // Crear estructura completa
      const newCompany = {
        id: newId,
        name: name,
        color: color,
        partner: partner,
        games: gamesArray,
        metodosDeposito: [],
        metodosCashout: [],
        consideracionesCashout: '',
        promociones: [],
        terminosLink: '',
        canales: [],
        notas: [
          {
            texto: `Compañía "${name}" creada en el sistema${validGames.length ? ` con ${validGames.length} juegos` : ''}`,
            fecha: new Date().toISOString()
          }
        ]
      };

      try {
        // Deshabilitar botón mientras se crea
        createBtn.disabled = true;
        createBtn.textContent = 'Creando...';

// ==========================================
        // ✅ GUARDAR EN MONGODB (Adiós Firebase)
        // ==========================================
        await apiFetch('/companies', {
            method: 'POST',
            body: JSON.stringify(newCompany)
        });

        // Recargamos todas las compañías desde el backend para ver la nueva
        const compRes = await apiFetch('/companies');
        const compJson = await compRes.json();
        if (compJson.success && compJson.data) {
          companies = compJson.data;
          renderCompanies();
        }

        updateAddCompanyBtnVisibility();

        toast.textContent = `✅ Compañía "${name}" creada correctamente`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);

        closeModal();

      } catch (error) {
        console.error('Error al crear compañía:', error);
        toast.textContent = '❌ Error al crear compañía';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);

      } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Crear compañía';
      }
    };

    modal.classList.add('show');
    nameInput.focus();
  }; // Cierra openAddCompanyModal

  // Event listener del botón
  if (addCompanyBtn) {
    addCompanyBtn.addEventListener('click', openAddCompanyModal);
  }

  // Mostrar botón solo si está logueado como admin
  const updateAddCompanyBtnVisibility = () => {
    if (addCompanyBtn) {
      const shouldShow = adminLoggedIn && isEditMode;
      addCompanyBtn.style.display = shouldShow ? 'inline-flex' : 'none';
    }
  };

  // Llamar después de login admin
  updateAddCompanyBtnVisibility();

// ========= CARGA INICIAL UNIFICADA (MONGO) =========
  const loadInitialData = async () => {
    try {
      // Pedimos las compañías y el catálogo AL MISMO TIEMPO
      const [compRes, catRes] = await Promise.all([
        apiFetch('/companies'),
        apiFetch('/catalog')
      ]);

      const compJson = await compRes.json();
      const catJson = await catRes.json();

      if (compJson.success && compJson.data) {
        companies = compJson.data.map(c => { if (c.partner === 'Tierlock') c.partner = 'Eterniplay'; return c; });
      }
      
      // Aseguramos que el catálogo cargue ANTES de arrancar la interfaz
      if (catJson.success && catJson.data) {
        gameCatalog = catJson.data;
      }

      const storedAdmin = localStorage.getItem('credentialsAdminLoggedIn');
      adminLoggedIn = storedAdmin === 'true';

      // Ahora sí, arrancamos la interfaz con todos los datos listos
      initApp(); 
      
    } catch (error) {
      console.error('Error cargando bases de datos:', error);
      toast.textContent = '❌ Error de conexión con el servidor';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  };

  // 1. Ejecutar carga inicial maestra
  loadInitialData();

  // 2. Auto-refrescar cada 30 segundos (Silencioso)
  setInterval(async () => {
    if (!isEditMode) {
      try {
        const res = await apiFetch('/companies');
        const json = await res.json();

        if (json.success && json.data) {
          companies = json.data.map(c => { if (c.partner === 'Tierlock') c.partner = 'Eterniplay'; return c; });
          if (currentCompany) {
            currentCompany = companies.find(c => c.id === currentCompany.id) || currentCompany;
          }
          renderCompanies();
        }
      } catch (e) {
        console.error("Error en auto-refresh:", e);
      }
    }
  }, 300000);

});