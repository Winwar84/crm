// Admin page specific functionality
let pendingUsers = [];
let allUsers = [];

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

// Initialize admin page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/admin') {
        // Check if user is admin
        checkAdminAccess();
        loadAdminStats();
        loadPendingUsers();
        loadAllUsers();
        setupAdminEventListeners();
    }
});

// Check if current user is admin
function checkAdminAccess() {
    const userData = localStorage.getItem('current_user');
    if (!userData) {
        window.location.href = '/login';
        return;
    }
    
    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        showNotification('Accesso negato: solo gli amministratori possono accedere a questa pagina', 'error');
        window.location.href = '/';
        return;
    }
}

// Load pending users
async function loadPendingUsers() {
    try {
        const response = await fetchWithAuth('/api/auth/users/pending');
        if (response.ok) {
            pendingUsers = await response.json();
            displayPendingUsers();
        } else {
            showNotification('Errore nel caricamento degli utenti in attesa', 'error');
        }
    } catch (error) {
        console.error('Errore nel caricamento degli utenti pending:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Load all users
async function loadAllUsers() {
    try {
        const response = await fetchWithAuth('/api/auth/users');
        if (response.ok) {
            allUsers = await response.json();
            displayAllUsers();
        } else {
            showNotification('Errore nel caricamento degli utenti', 'error');
        }
    } catch (error) {
        console.error('Errore nel caricamento di tutti gli utenti:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Display pending users
function displayPendingUsers() {
    const grid = document.getElementById('pendingUsersGrid');
    
    if (pendingUsers.length === 0) {
        grid.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-user-clock"></i>
                <p>Nessun utente in attesa di approvazione</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = pendingUsers.map(user => {
        const safeFullName = escapeHtml(user.full_name) || '';
        const initials = safeFullName.split(' ').map(n => n[0]).join('').toUpperCase();
        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${escapeHtml(user.full_name)}</div>
                        <div class="user-username">@${escapeHtml(user.username)}</div>
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-email">
                        <i class="fas fa-envelope"></i>
                        ${escapeHtml(user.email)}
                    </div>
                </div>
                
                <div class="user-meta">
                    <span class="status-badge pending">In Attesa</span>
                    <small>Registrato: ${formatDate(user.created_at)}</small>
                </div>
                
                <div class="user-actions">
                    <button class="user-action-btn btn-approve" onclick="openApproveUserModal(${user.id}, '${user.full_name}', '${user.username}', '${user.email}')" title="Approva">
                        <i class="fas fa-check"></i> Approva
                    </button>
                    <button class="user-action-btn btn-reject" onclick="confirmRejectUser(${user.id}, '${user.full_name}')" title="Rifiuta">
                        <i class="fas fa-times"></i> Rifiuta
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Display all users
function displayAllUsers() {
    const grid = document.getElementById('allUsersGrid');
    
    if (allUsers.length === 0) {
        grid.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-users"></i>
                <p>Nessun utente registrato</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = allUsers.map(user => {
        const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${user.full_name}</div>
                        <div class="user-username">@${user.username}</div>
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-email">
                        <i class="fas fa-envelope"></i>
                        ${user.email}
                    </div>
                </div>
                
                <div class="user-meta">
                    <span class="role-badge ${user.role}">
                        ${getRoleDisplayName(user.role)}
                    </span>
                    <span class="status-badge ${user.status}">
                        ${getStatusDisplayName(user.status)}
                    </span>
                </div>
                
                <div style="margin-top: 12px; font-size: 12px; color: #6c757d;">
                    Registrato: ${formatDate(user.created_at)}
                </div>
                
                <div class="user-actions" style="margin-top: 12px;">
                    <button class="user-action-btn btn-delete" onclick="confirmDeleteRejectedUser(${user.id}, '${user.full_name}')" title="Elimina">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open approve user modal
function openApproveUserModal(userId, fullName, username, email) {
    document.getElementById('approveUserId').value = userId;
    document.getElementById('approveUserInfo').textContent = `${fullName} (${username} - ${email})`;
    document.getElementById('approveUserRole').value = 'operator';
    document.getElementById('approveUserModal').style.display = 'block';
}

// Close approve user modal
function closeApproveUserModal() {
    document.getElementById('approveUserModal').style.display = 'none';
    document.getElementById('approveUserForm').reset();
}

// Approve user
async function approveUser() {
    const userId = document.getElementById('approveUserId').value;
    const role = document.getElementById('approveUserRole').value;
    
    try {
        const response = await fetchWithAuth(`/api/auth/users/${userId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Utente approvato con successo!', 'success');
            closeApproveUserModal();
            loadPendingUsers();
            loadAllUsers();
        } else {
            showNotification(data.error || 'Errore nell\'approvazione dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nell\'approvazione:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Reject user from modal
async function rejectUser() {
    const userId = document.getElementById('approveUserId').value;
    
    if (!confirm('Sei sicuro di voler rifiutare questo utente?')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/auth/users/${userId}/reject`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Utente rifiutato con successo', 'success');
            closeApproveUserModal();
            loadPendingUsers();
            loadAllUsers();
        } else {
            showNotification(data.error || 'Errore nel rifiuto dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nel rifiuto:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Confirm reject user (direct from table)
async function confirmRejectUser(userId, fullName) {
    if (!confirm(`Sei sicuro di voler rifiutare l'utente "${fullName}"?`)) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/auth/users/${userId}/reject`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Utente rifiutato con successo', 'success');
            loadPendingUsers();
            loadAllUsers();
        } else {
            showNotification(data.error || 'Errore nel rifiuto dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nel rifiuto:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Delete user completely
async function deleteUser() {
    const userId = document.getElementById('approveUserId').value;
    
    if (!confirm('Sei sicuro di voler eliminare definitivamente questo utente? Questa azione non può essere annullata.')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/auth/users/${userId}/delete`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Utente eliminato con successo', 'success');
            closeApproveUserModal();
            loadPendingUsers();
            loadAllUsers();
        } else {
            showNotification(data.error || 'Errore nell\'eliminazione dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Delete any user (direct from user card)
async function confirmDeleteRejectedUser(userId, fullName) {
    if (!confirm(`Sei sicuro di voler eliminare definitivamente l'utente "${fullName}"? Questa azione non può essere annullata.`)) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/auth/users/${userId}/delete`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Utente eliminato con successo', 'success');
            loadPendingUsers();
            loadAllUsers();
        } else {
            showNotification(data.error || 'Errore nell\'eliminazione dell\'utente', 'error');
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione:', error);
        showNotification('Errore di connessione', 'error');
    }
}

// Setup event listeners
function setupAdminEventListeners() {
    // Approve user form
    document.getElementById('approveUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        approveUser();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('approveUserModal');
        if (event.target === modal) {
            closeApproveUserModal();
        }
    });
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRoleDisplayName(role) {
    const roles = {
        'admin': 'Amministratore',
        'supervisor': 'Supervisore',
        'operator': 'Operatore'
    };
    return roles[role] || role;
}

function getStatusDisplayName(status) {
    const statuses = {
        'pending': 'In Attesa',
        'approved': 'Approvato',
        'rejected': 'Rifiutato'
    };
    return statuses[status] || status;
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const response = await fetchWithAuth('/api/auth/users');
        if (response.ok) {
            const users = await response.json();
            
            const pendingCount = users.filter(u => u.status === 'pending').length;
            const approvedCount = users.filter(u => u.status === 'approved').length;
            const adminCount = users.filter(u => u.role === 'admin').length;
            
            document.getElementById('pending-users-count').textContent = pendingCount;
            document.getElementById('approved-users-count').textContent = approvedCount;
            document.getElementById('admin-users-count').textContent = adminCount;
            document.getElementById('pending-badge').textContent = pendingCount;
            
            // System health - simple check
            document.getElementById('system-health').textContent = 'Operativo';
        }
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
    }
}

// Show admin tab
function showAdminTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.admin-tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'pending-users') {
        loadPendingUsers();
    } else if (tabName === 'all-users') {
        loadAllUsers();
    } else if (tabName === 'system-info') {
        loadSystemInfo();
    } else if (tabName === 'logs') {
        loadSystemLogs();
    }
}

// Filter users
function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filteredUsers = [...allUsers];
    
    if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
    }
    
    // Update the display with filtered users
    const grid = document.getElementById('allUsersGrid');
    
    if (filteredUsers.length === 0) {
        grid.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-filter"></i>
                <p>Nessun utente corrisponde ai filtri selezionati</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredUsers.map(user => {
        const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${user.full_name}</div>
                        <div class="user-username">@${user.username}</div>
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-email">
                        <i class="fas fa-envelope"></i>
                        ${user.email}
                    </div>
                </div>
                
                <div class="user-meta">
                    <span class="role-badge ${user.role}">
                        ${getRoleDisplayName(user.role)}
                    </span>
                    <span class="status-badge ${user.status}">
                        ${getStatusDisplayName(user.status)}
                    </span>
                </div>
                
                <div style="margin-top: 12px; font-size: 12px; color: #6c757d;">
                    Registrato: ${formatDate(user.created_at)}
                </div>
                
                <div class="user-actions" style="margin-top: 12px;">
                    <button class="user-action-btn btn-delete" onclick="confirmDeleteRejectedUser(${user.id}, '${user.full_name}')" title="Elimina">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load system information
async function loadSystemInfo() {
    try {
        // Update database info
        const ticketsResponse = await fetchWithAuth('/api/tickets');
        if (ticketsResponse.ok) {
            const tickets = await ticketsResponse.json();
            document.getElementById('totalTickets').textContent = tickets.length;
        }
        
        const customersResponse = await fetchWithAuth('/api/customers');
        if (customersResponse.ok) {
            const customers = await customersResponse.json();
            document.getElementById('totalCustomers').textContent = customers.length;
        }
        
        // Update email system status
        const smtpConfig = localStorage.getItem('smtp_config');
        const imapConfig = localStorage.getItem('imap_config');
        
        document.getElementById('smtpStatus').textContent = smtpConfig ? 'Configurato' : 'Non Configurato';
        document.getElementById('imapStatus').textContent = imapConfig ? 'Configurato' : 'Non Configurato';
        document.getElementById('monitorStatus').textContent = imapConfig ? 'Attivo' : 'Inattivo';
        
        // Update application info
        document.getElementById('lastStart').textContent = new Date().toLocaleString('it-IT');
        document.getElementById('uptime').textContent = 'Online';
        
    } catch (error) {
        console.error('Errore nel caricamento info sistema:', error);
    }
}

// Load system logs
function loadSystemLogs() {
    const logsViewer = document.getElementById('logsViewer');
    
    // Simulate log loading
    logsViewer.innerHTML = `
        <div style="color: #28a745;">[${new Date().toLocaleString()}] Sistema avviato correttamente</div>
        <div style="color: #17a2b8;">[${new Date().toLocaleString()}] Database connesso</div>
        <div style="color: #ffc107;">[${new Date().toLocaleString()}] Configurazione email caricata</div>
        <div style="color: #6c757d;">[${new Date().toLocaleString()}] Sistema in ascolto sulla porta 5000</div>
        <div style="color: #28a745;">[${new Date().toLocaleString()}] Tutti i servizi operativi</div>
    `;
}

// Clear logs
function clearLogs() {
    if (confirm('Sei sicuro di voler cancellare tutti i log?')) {
        document.getElementById('logsViewer').innerHTML = `
            <div class="log-placeholder">
                <i class="fas fa-file-alt"></i>
                <p>Log cancellati - Clicca "Aggiorna" per ricaricare</p>
            </div>
        `;
        showNotification('Log cancellati con successo', 'success');
    }
}

// Refresh all data
function refreshAllData() {
    loadAdminStats();
    loadPendingUsers();
    loadAllUsers();
    loadSystemInfo();
    showNotification('Dati aggiornati con successo', 'success');
}

// Export users data
function exportUsersData() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Nome,Username,Email,Ruolo,Stato,Data Registrazione\n"
        + allUsers.map(user => 
            `"${user.full_name}","${user.username}","${user.email}",${getRoleDisplayName(user.role)},${getStatusDisplayName(user.status)},"${user.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `utenti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export completato!', 'success');
}