// Agents page specific functionality
let allAgents = [];
let filteredAgents = [];
let agentTickets = {};

// ===== SECURITY FUNCTIONS =====
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function sanitizeForAttribute(text) {
    if (text == null) return '';
    return String(text).replace(/[<>"'&]/g, function(match) {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        }[match];
    });
}

// Function to make authenticated requests
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('user_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Initialize agents page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/agents' || window.location.pathname === '/settings') {
        // Don't auto-load on settings page, wait for tab switch
        if (window.location.pathname === '/agents') {
            loadAllAgents();
            setupAgentsEventListeners();
        }
    }
});

// Load all agents and users
async function loadAllAgents() {
    try {
        // Load agents first
        const agentsResponse = await fetchWithAuth(`${API_BASE}/agents`);
        const agents = await agentsResponse.json();
        
        // Start with agents
        allAgents = [...agents];
        
        // Try to load users if user has admin privileges
        try {
            const usersResponse = await fetchWithAuth(`${API_BASE}/auth/users`);
            if (usersResponse.ok) {
                const users = await usersResponse.json();
                
                // Combine agents and users data if we have admin access
                if (Array.isArray(users)) {
                    const userAgents = users.map(user => ({
                        ...user,
                        isUser: true,
                        name: user.full_name || user.username,
                        department: 'Users',
                        email: user.email
                    }));
                    allAgents = [...agents, ...userAgents];
                }
            }
        } catch (userError) {
            console.log('Non hai i permessi per gestire gli utenti (solo agenti visibili)');
        }
        
        filteredAgents = [...allAgents];
        
        // Load ticket counts for each agent
        await loadAgentTicketCounts();
        
        // Update statistics after agents are loaded
        loadAgentStats();
        
        displayAgentsCards();
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
        const grid = document.getElementById('agentsGrid');
        if (grid) {
            grid.innerHTML = '<div class="error">Errore nel caricamento degli agenti</div>';
        }
    }
}

// Load ticket counts for agents
async function loadAgentTicketCounts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets`);
        const tickets = await response.json();
        
        // Count tickets by agent
        agentTickets = {};
        tickets.forEach(ticket => {
            if (ticket.assigned_to) {
                agentTickets[ticket.assigned_to] = (agentTickets[ticket.assigned_to] || 0) + 1;
            }
        });
    } catch (error) {
        console.error('Errore nel caricamento dei ticket:', error);
    }
}

// Load agent statistics
async function loadAgentStats() {
    try {
        // Calculate total agents (exclude users department)
        const realAgents = allAgents.filter(agent => agent.department !== 'Users');
        document.getElementById('total-agents-count').textContent = realAgents.length;
        
        // Calculate departments count (exclude Users)
        const departments = new Set(realAgents.map(agent => agent.department));
        document.getElementById('departments-count').textContent = departments.size;
        
        // Calculate total assigned tickets
        const totalAssigned = Object.values(agentTickets).reduce((sum, count) => sum + count, 0);
        document.getElementById('assigned-tickets-count').textContent = totalAssigned;
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        // Set default values
        document.getElementById('total-agents-count').textContent = '0';
        document.getElementById('departments-count').textContent = '0';
        document.getElementById('assigned-tickets-count').textContent = '0';
    }
}

// Display agents in cards
function displayAgentsCards() {
    const grid = document.getElementById('agentsGrid');
    if (!grid) return;
    
    if (filteredAgents.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <h3>Nessun agente trovato</h3>
                <p>Non ci sono agenti che corrispondono ai criteri di ricerca</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredAgents.map(agent => {
        const initials = agent.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const assignedTickets = agentTickets[agent.name] || 0;
        const departmentClass = `department-${agent.department.toLowerCase()}`;
        
        // Different display for users vs agents
        if (agent.isUser) {
            const statusClass = agent.status === 'approved' ? 'approved' : 
                              agent.status === 'pending' ? 'pending' : 'suspended';
            const roleClass = `role-${agent.role}`;
            
            return `
                <div class="agent-card user-card">
                    <div class="agent-card-header">
                        <div class="agent-avatar">${initials}</div>
                        <div class="agent-info">
                            <div class="agent-name">${escapeHtml(agent.name)}</div>
                            <div class="agent-id">@${escapeHtml(agent.username)}</div>
                        </div>
                        <div class="user-status ${statusClass}">
                            ${escapeHtml(agent.status)}
                        </div>
                    </div>
                    
                    <div class="agent-details">
                        <div class="agent-email">
                            <i class="fas fa-envelope"></i>
                            <a href="mailto:${sanitizeForAttribute(agent.email)}">${escapeHtml(agent.email)}</a>
                        </div>
                        <div class="user-role ${roleClass}">
                            <i class="fas fa-user-tag"></i>
                            ${escapeHtml(agent.role)}
                        </div>
                    </div>
                    
                    <div class="agent-stats">
                        <div class="agent-stat">
                            <div class="agent-stat-number">${assignedTickets}</div>
                            <div class="agent-stat-label">Ticket</div>
                        </div>
                        <div class="agent-stat">
                            <div class="agent-stat-number">${agent.is_active ? 'Attivo' : 'Inattivo'}</div>
                            <div class="agent-stat-label">Stato</div>
                        </div>
                    </div>
                    
                    <div class="agent-joined">
                        <i class="fas fa-calendar-alt"></i>
                        Registrato il ${formatDate(agent.created_at)}
                    </div>
                    
                    <div class="agent-actions">
                        <button class="agent-action-btn btn-permissions" onclick="openUserPermissionsModal(${agent.id})" title="Permessi">
                            <i class="fas fa-user-cog"></i> Permessi
                        </button>
                        ${agent.status === 'pending' ? 
                            `<button class="agent-action-btn btn-approve" onclick="approveUser(${agent.id})" title="Approva">
                                <i class="fas fa-check"></i> Approva
                            </button>` : ''
                        }
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="agent-card">
                    <div class="agent-card-header">
                        <div class="agent-avatar">${initials}</div>
                        <div class="agent-info">
                            <div class="agent-name">${escapeHtml(agent.name)}</div>
                            <div class="agent-id">ID: #${agent.id}</div>
                        </div>
                        <div class="agent-department ${departmentClass}">
                            ${escapeHtml(agent.department)}
                        </div>
                    </div>
                    
                    <div class="agent-details">
                        <div class="agent-email">
                            <i class="fas fa-envelope"></i>
                            <a href="mailto:${sanitizeForAttribute(agent.email)}">${escapeHtml(agent.email)}</a>
                        </div>
                    </div>
                    
                    <div class="agent-stats">
                        <div class="agent-stat">
                            <div class="agent-stat-number">${assignedTickets}</div>
                            <div class="agent-stat-label">Ticket</div>
                        </div>
                        <div class="agent-stat">
                            <div class="agent-stat-number">${escapeHtml(calculateAgentWorkload(assignedTickets))}</div>
                            <div class="agent-stat-label">Carico</div>
                        </div>
                    </div>
                    
                    <div class="agent-joined">
                        <i class="fas fa-calendar-alt"></i>
                        Unito il ${formatDate(agent.created_at)}
                    </div>
                    
                    <div class="agent-actions">
                        <button class="agent-action-btn btn-view" onclick="viewAgentDetails(${agent.id})" title="Dettagli">
                            <i class="fas fa-eye"></i> Dettagli
                        </button>
                        <button class="agent-action-btn btn-edit" onclick="openEditAgentModal(${agent.id})" title="Modifica">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="agent-action-btn btn-delete" onclick="deleteAgent(${agent.id})" title="Elimina">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Calculate agent workload
function calculateAgentWorkload(ticketCount) {
    if (ticketCount === 0) return 'Libero';
    if (ticketCount <= 3) return 'Basso';
    if (ticketCount <= 7) return 'Medio';
    if (ticketCount <= 12) return 'Alto';
    return 'Pieno';
}

// Setup agents page event listeners
function setupAgentsEventListeners() {
    // Agent form submission
    const agentForm = document.getElementById('agentForm');
    if (agentForm) {
        agentForm.addEventListener('submit', handleAgentSubmission);
    }
    
    // Edit agent form submission
    const editAgentForm = document.getElementById('editAgentForm');
    if (editAgentForm) {
        editAgentForm.addEventListener('submit', handleEditAgentSubmission);
    }
}

// Handle agent form submission
async function handleAgentSubmission(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('agentName').value,
        email: document.getElementById('agentEmail').value,
        department: document.getElementById('agentDepartment').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Agente aggiunto con successo!', 'success');
            closeModal('newAgentModal');
            document.getElementById('agentForm').reset();
            loadAllAgents();
            loadAgentStats();
        } else {
            throw new Error('Errore nell\'aggiunta dell\'agente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiunta dell\'agente', 'error');
    }
}

// Handle edit agent form submission
async function handleEditAgentSubmission(e) {
    e.preventDefault();
    
    const agentId = document.getElementById('editAgentId').value;
    const formData = {
        name: document.getElementById('editAgentName').value,
        email: document.getElementById('editAgentEmail').value,
        department: document.getElementById('editAgentDepartment').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents/${agentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Agente aggiornato con successo!', 'success');
            closeModal('editAgentModal');
            loadAllAgents();
            loadAgentStats();
        } else {
            throw new Error('Errore nell\'aggiornamento dell\'agente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiornamento dell\'agente', 'error');
    }
}

// Filter agents
function filterAgents() {
    const departmentFilter = document.getElementById('departmentFilter').value;
    
    filteredAgents = allAgents.filter(agent => {
        const departmentMatch = !departmentFilter || agent.department === departmentFilter;
        return departmentMatch;
    });
    
    displayAgentsCards();
}

// Search agents
function searchAgents() {
    const searchTerm = document.getElementById('searchAgents').value.toLowerCase();
    
    if (!searchTerm) {
        filterAgents(); // Apply current filters
        return;
    }
    
    filteredAgents = allAgents.filter(agent => {
        return agent.name.toLowerCase().includes(searchTerm) ||
               agent.email.toLowerCase().includes(searchTerm) ||
               agent.department.toLowerCase().includes(searchTerm);
    });
    
    displayAgentsTable();
}

// Open new agent modal
function openNewAgentModal() {
    document.getElementById('newAgentModal').style.display = 'block';
}

// Open edit agent modal
function openEditAgentModal(agentId) {
    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) return;
    
    document.getElementById('editAgentId').value = agent.id;
    document.getElementById('editAgentName').value = agent.name;
    document.getElementById('editAgentEmail').value = agent.email;
    document.getElementById('editAgentDepartment').value = agent.department;
    
    document.getElementById('editAgentModal').style.display = 'block';
}

// View agent details
function viewAgentDetails(agentId) {
    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) return;
    
    const assignedTickets = agentTickets[agent.name] || 0;
    
    const detailsContent = document.getElementById('agentDetailsContent');
    detailsContent.innerHTML = `
        <div class="agent-details">
            <div class="detail-section">
                <h3>Informazioni Agente</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="field-label">Nome:</span>
                        <span>${escapeHtml(agent.name)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Email:</span>
                        <span><a href="mailto:${sanitizeForAttribute(agent.email)}">${escapeHtml(agent.email)}</a></span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Dipartimento:</span>
                        <span class="department-badge department-${sanitizeForAttribute(agent.department)}">${escapeHtml(agent.department)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Ticket Assegnati:</span>
                        <span>${assignedTickets}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Informazioni Sistema</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="field-label">Registrato:</span>
                        <span>${formatDate(agent.created_at)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn primary" onclick="openEditAgentModal(${agent.id}); closeModal('agentDetailsModal');">
                    <i class="fas fa-edit"></i> Modifica Agente
                </button>
                <button class="btn secondary" onclick="viewAgentTickets('${escapeHtml(agent.name)}')">
                    <i class="fas fa-ticket-alt"></i> Vedi Ticket
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('agentDetailsModal').style.display = 'block';
}

// Delete agent
async function deleteAgent(agentId) {
    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) return;
    
    if (!confirm(`Sei sicuro di voler eliminare l'agente "${agent.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents/${agentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Agente eliminato con successo!', 'success');
            loadAllAgents();
            loadAgentStats();
        } else {
            // Get the specific error message from the server
            const errorData = await response.json();
            const errorMessage = errorData.error || 'Errore nell\'eliminazione dell\'agente';
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification(error.message, 'error');
    }
}

// Export agents to CSV
function exportAgents() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Nome,Email,Dipartimento,Ticket Assegnati,Registrato\n"
        + filteredAgents.map(agent => 
            `${agent.id},"${agent.name}","${agent.email}",${agent.department},${agentTickets[agent.name] || 0},"${agent.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agenti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export completato!', 'success');
}

// View agent tickets
function viewAgentTickets(agentName) {
    // Navigate to tickets page with filter
    window.location.href = '/tickets?agent=' + encodeURIComponent(agentName);
}

// Open user permissions modal
function openUserPermissionsModal(userId) {
    const user = allAgents.find(agent => agent.isUser && agent.id === userId);
    if (!user) return;
    
    const modal = `
        <div class="modal fade show" id="userPermissionsModal" style="display: block;">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-cog"></i> Gestione Permessi - ${escapeHtml(user.name)}
                        </h5>
                        <button type="button" class="close" onclick="closeUserPermissionsModal()">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="userPermissionsForm">
                            <input type="hidden" id="userPermissionsUserId" value="${sanitizeForAttribute(userId)}">
                            
                            <div class="form-group">
                                <label for="userPermissionsRole">Ruolo:</label>
                                <select class="form-control" id="userPermissionsRole" required>
                                    <option value="operator" ${user.role === 'operator' ? 'selected' : ''}>Operatore</option>
                                    <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>Supervisore</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Amministratore</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="userPermissionsStatus">Stato:</label>
                                <select class="form-control" id="userPermissionsStatus" required>
                                    <option value="approved" ${user.status === 'approved' ? 'selected' : ''}>Approvato</option>
                                    <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>In Attesa</option>
                                    <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Sospeso</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <div class="user-info-display">
                                    <p><strong>Username:</strong> ${escapeHtml(user.username)}</p>
                                    <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
                                    <p><strong>Registrato:</strong> ${formatDate(user.created_at)}</p>
                                    <p><strong>Ultimo Login:</strong> ${user.last_login ? formatDate(user.last_login) : 'Mai'}</p>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeUserPermissionsModal()">Annulla</button>
                        <button type="button" class="btn btn-primary" onclick="updateUserPermissions()">Salva Modifiche</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

// Close user permissions modal
function closeUserPermissionsModal() {
    const modal = document.getElementById('userPermissionsModal');
    if (modal) {
        modal.remove();
    }
}

// Update user permissions
async function updateUserPermissions() {
    const userId = document.getElementById('userPermissionsUserId').value;
    const role = document.getElementById('userPermissionsRole').value;
    const status = document.getElementById('userPermissionsStatus').value;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/auth/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ role, status })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Permessi utente aggiornati con successo', 'success');
            closeUserPermissionsModal();
            loadAllAgents(); // Reload the page
        } else {
            const error = await response.json();
            showNotification(error.error || 'Errore nell\'aggiornamento dei permessi', 'error');
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento permessi:', error);
        showNotification('Errore nell\'aggiornamento dei permessi', 'error');
    }
}

// Approve user quickly
async function approveUser(userId) {
    if (!confirm('Sei sicuro di voler approvare questo utente?')) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/auth/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'approved' })
        });
        
        if (response.ok) {
            showNotification('Utente approvato con successo', 'success');
            loadAllAgents(); // Reload the page
        } else {
            const error = await response.json();
            showNotification(error.error || 'Errore nell\'approvazione dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nell\'approvazione utente:', error);
        showNotification('Errore nell\'approvazione dell\'utente', 'error');
    }
}