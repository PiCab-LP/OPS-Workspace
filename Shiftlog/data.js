/**
 * ShiftLog Data Service - Connected to General Cashouts Backend
 */

const API_BASE = "https://general-cashouts-production.up.railway.app/api";

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = options.headers ? { ...options.headers } : {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

const DEFAULT_CATEGORIES = [
    { name: "Depositos", private: false },
    { name: "Cashouts", private: false },
    { name: "Bonos", private: false }
];

class DataStore {
    constructor() {
        this.init();
    }

    init() {
        // Backend handles categories now
    }

    // --- Companies API ---
    async getCompanies() {
        try {
            const res = await authenticatedFetch(`${API_BASE}/rules`);
            const data = await res.json();
            if (data.success) {
                // Returns only unique company names
                const companyNames = [...new Set(data.data.map(rule => rule.name))];
                return companyNames.map(name => ({ name }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching companies:", error);
            return [];
        }
    }
    
    // --- Categories API (Backend) ---
    async getCategories() {
        try {
            const res = await authenticatedFetch(`${API_BASE}/config/all`);
            const data = await res.json();
            if (data.success) {
                return data.categories.map(name => ({ name }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching categories:", error);
            return [];
        }
    }

    async addCategory(name) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/config/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'category', name, operator: operatorName })
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error("Error adding category:", error);
            return false;
        }
    }

    async deleteCategory(name) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/config/delete/${encodeURIComponent(name)}?operator=${encodeURIComponent(operatorName)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error("Error deleting category:", error);
            return false;
        }
    }

    // --- Incidents API (Backend) ---
    async getIncidents() {
        try {
            const res = await authenticatedFetch(`${API_BASE}/incidents/all`);
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error("Error fetching incidents:", error);
            return [];
        }
    }

    async addIncident(incidentData) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/incidents/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...incidentData,
                    reportedBy: operatorName,
                    operator: operatorName
                })
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error("Error adding incident:", error);
            return null;
        }
    }

    async updateIncidentStatus(id, status, resolution) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/incidents/update/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    resolutionDetails: resolution || "",
                    operator: operatorName
                })
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error("Error updating status:", error);
            return false;
        }
    }

    async getIncidentById(id) {
        // Since we don't have a single GET by ID, we'll find it in the all list (or we can just skip this if not used much)
        const incidents = await this.getIncidents();
        return incidents.find(i => i._id === id);
    }

    async updateIncidentData(id, updatedData) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/incidents/update/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...updatedData, operator: operatorName })
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error("Error updating incident data:", error);
            return false;
        }
    }

    async deleteIncident(id) {
        try {
            let operatorName = 'Operador Local';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    operatorName = userObj.name || userObj.username || 'Operador';
                }
            } catch (e) {}

            const res = await authenticatedFetch(`${API_BASE}/incidents/delete/${id}?operator=${encodeURIComponent(operatorName)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error("Error deleting incident:", error);
            return false;
        }
    }

    // --- Activity Log API (Backend) ---
    async getLogs() {
        try {
            const res = await authenticatedFetch(`${API_BASE}/incidents/logs`);
            const data = await res.json();
            if (data.success) {
                // Map the DB logs to frontend structure
                return data.data.map(log => ({
                    id: log._id,
                    action: log.action || 'Unknown',
                    title: log.details || 'No details', 
                    user: log.user || 'Sistema',
                    time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching logs:", error);
            return [];
        }
    }
}

// Global instance
window.db = new DataStore();
