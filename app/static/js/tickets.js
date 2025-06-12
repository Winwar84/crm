// Tickets page specific functionality
let allTickets = [];
let filteredTickets = [];

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

// Initialize tickets page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/tickets') {
        // Close any open modals first
        closeModal('editTicketModal');
        closeModal('newTicketModal');
        closeModal('ticketDetailsModal');
        
        loadAllTickets();
        loadAgentsForTickets();
        loadTicketConfigurationOptions(); // AGGIUNTO: Carica configurazioni per i menu a tendina
        setupTicketsEventListeners();
        
        // Load current agent from localStorage
        const savedAgent = localStorage.getItem('currentAgent');
        if (savedAgent) {
            currentAgent = JSON.parse(savedAgent);
            updateCurrentAgentDisplay();
        }
    }
});

// Load all tickets
async function loadAllTickets() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets`);
        allTickets = await response.json();
        filteredTickets = [...allTickets];
        displayTicketsTable();
    } catch (error) {
        console.error('Errore nel caricamento dei ticket:', error);
        document.getElementById('ticketsTableBody').innerHTML = 
            '<tr><td colspan="8" class="error">Errore nel caricamento dei ticket</td></tr>';
    }
}

// Display tickets in table
function displayTicketsTable() {
    const tbody = document.getElementById('ticketsTableBody');
    if (!tbody) return;
    
    if (filteredTickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Nessun ticket trovato</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredTickets.map(ticket => `
        <tr class="ticket-row" onclick="openTicketDetails(${ticket.id})" style="cursor: pointer;">
            <td>#${ticket.id}</td>
            <td>${escapeHtml(ticket.title)}</td>
            <td>
                <div>${escapeHtml(ticket.customer_name)}</div>
                <small style="color: #666;">${escapeHtml(ticket.customer_email)}</small>
            </td>
            <td>
                <span class="priority-badge priority-${sanitizeForAttribute(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
            </td>
            <td>
                <span class="status-badge status-${sanitizeForAttribute(ticket.status.replace(' ', '-'))}">${escapeHtml(ticket.status)}</span>
            </td>
            <td>${escapeHtml(ticket.assigned_to) || 'Non assegnato'}</td>
            <td>${formatDate(ticket.created_at)}</td>
            <td class="ticket-actions-cell">
                <button class="btn-small btn-info" onclick="event.stopPropagation(); openTicketDetails(${ticket.id})" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-small btn-edit" onclick="event.stopPropagation(); openEditTicketModal(${ticket.id})" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-delete" onclick="event.stopPropagation(); deleteTicket(${ticket.id})" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load agents for ticket assignment
async function loadAgentsForTickets() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/agents`);
        const agents = await response.json();
        
        const select = document.getElementById('editAssignedToAgent');
        if (select) {
            // Clear existing options except the first one
            select.innerHTML = '<option value="">-- Non assegnato --</option>';
            
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = sanitizeForAttribute(agent.name);
                option.textContent = `${escapeHtml(agent.name)} (${escapeHtml(agent.department)})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento degli agenti:', error);
    }
}

// Load ticket configuration options (software, group, type)
async function loadTicketConfigurationOptions() {
    console.log('🔄 Caricamento configurazioni ticket...'); // DEBUG
    
    try {
        // Load software options
        console.log('📝 Caricamento software options...'); // DEBUG
        const softwareResponse = await fetchWithAuth(`${API_BASE}/config/software`);
        console.log('📡 Software response:', softwareResponse.status); // DEBUG
        
        if (softwareResponse.ok) {
            const softwareOptions = await softwareResponse.json();
            console.log('📋 Software options ricevute:', softwareOptions); // DEBUG
            
            const softwareSelect = document.getElementById('editTicketSoftware');
            if (softwareSelect) {
                softwareSelect.innerHTML = '<option value="">-- Seleziona Software --</option>';
                softwareOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = sanitizeForAttribute(option.value);
                    optionElement.textContent = escapeHtml(option.label);
                    softwareSelect.appendChild(optionElement);
                });
                console.log('✅ Software options popolate:', softwareOptions.length); // DEBUG
            } else {
                console.error('❌ Elemento editTicketSoftware non trovato!'); // DEBUG
            }
        } else {
            console.warn('⚠️  Software response non OK:', softwareResponse.status); // DEBUG
        }
        
        // Load group options
        const groupResponse = await fetchWithAuth(`${API_BASE}/config/groups`);
        if (groupResponse.ok) {
            const groupOptions = await groupResponse.json();
            const groupSelect = document.getElementById('editTicketGroup');
            if (groupSelect) {
                groupSelect.innerHTML = '<option value="">-- Seleziona Gruppo --</option>';
                groupOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = sanitizeForAttribute(option.value);
                    optionElement.textContent = escapeHtml(option.label);
                    groupSelect.appendChild(optionElement);
                });
            }
        }
        
        // Load type options
        const typeResponse = await fetchWithAuth(`${API_BASE}/config/types`);
        if (typeResponse.ok) {
            const typeOptions = await typeResponse.json();
            const typeSelect = document.getElementById('editTicketType');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">-- Seleziona Tipo --</option>';
                typeOptions.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = sanitizeForAttribute(option.value);
                    optionElement.textContent = escapeHtml(option.label);
                    typeSelect.appendChild(optionElement);
                });
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento delle opzioni di configurazione:', error);
        // Set default options if API fails
        setDefaultConfigurationOptions();
    }
}

// Set default configuration options if API is not available
function setDefaultConfigurationOptions() {
    const defaultSoftware = [
        { value: 'danea-easyfatt', label: 'Danea EasyFatt' },
        { value: 'danea-clienti', label: 'Danea Clienti' },
        { value: 'gestionale-custom', label: 'Gestionale Custom' },
        { value: 'altro', label: 'Altro' }
    ];
    
    const defaultGroups = [
        { value: 'supporto-tecnico', label: 'Supporto Tecnico' },
        { value: 'assistenza-commerciale', label: 'Assistenza Commerciale' },
        { value: 'amministrazione', label: 'Amministrazione' },
        { value: 'sviluppo', label: 'Sviluppo' }
    ];
    
    const defaultTypes = [
        { value: 'problema-tecnico', label: 'Problema Tecnico' },
        { value: 'richiesta-informazioni', label: 'Richiesta Informazioni' },
        { value: 'installazione', label: 'Installazione' },
        { value: 'configurazione', label: 'Configurazione' },
        { value: 'formazione', label: 'Formazione' },
        { value: 'teleassistenza', label: 'Teleassistenza' }
    ];
    
    // Populate software select
    const softwareSelect = document.getElementById('editTicketSoftware');
    if (softwareSelect) {
        softwareSelect.innerHTML = '<option value="">-- Seleziona Software --</option>';
        defaultSoftware.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = sanitizeForAttribute(option.value);
            optionElement.textContent = escapeHtml(option.label);
            softwareSelect.appendChild(optionElement);
        });
    }
    
    // Populate group select
    const groupSelect = document.getElementById('editTicketGroup');
    if (groupSelect) {
        groupSelect.innerHTML = '<option value="">-- Seleziona Gruppo --</option>';
        defaultGroups.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = sanitizeForAttribute(option.value);
            optionElement.textContent = escapeHtml(option.label);
            groupSelect.appendChild(optionElement);
        });
    }
    
    // Populate type select
    const typeSelect = document.getElementById('editTicketType');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">-- Seleziona Tipo --</option>';
        defaultTypes.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = sanitizeForAttribute(option.value);
            optionElement.textContent = escapeHtml(option.label);
            typeSelect.appendChild(optionElement);
        });
    }
}

// Setup tickets page event listeners
function setupTicketsEventListeners() {
    // Edit ticket form submission
    const editTicketForm = document.getElementById('editTicketForm');
    if (editTicketForm) {
        editTicketForm.addEventListener('submit', handleEditTicketSubmission);
    }
}

// Edit ticket from details modal (override for tickets page)
function editTicketFromDetails(ticketId) {
    closeModal('ticketDetailsModal');
    // Open edit modal directly in tickets page
    openEditTicketModal(ticketId);
}

// Assign ticket to current agent (override for tickets page)
async function assignTicketToMe(ticketId) {
    if (!currentAgent) {
        showNotification('Seleziona un agente prima', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assigned_to: currentAgent.name,
                status: 'In Progress' // Auto-change status when assigned
            })
        });
        
        if (response.ok) {
            showNotification(`Ticket assegnato a ${currentAgent.name}`, 'success');
            closeModal('ticketDetailsModal');
            loadAllTickets(); // Refresh tickets list
            if (typeof loadStats === 'function') {
                loadStats(); // Update dashboard stats if available
            }
        } else {
            throw new Error('Errore nell\'assegnazione');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'assegnazione del ticket', 'error');
    }
}

// Filter tickets
function filterTickets() {
    const statusFilter = document.getElementById('tickets-statusFilter').value;
    const priorityFilter = document.getElementById('tickets-priorityFilter').value;
    
    filteredTickets = allTickets.filter(ticket => {
        const statusMatch = !statusFilter || ticket.status === statusFilter;
        const priorityMatch = !priorityFilter || ticket.priority === priorityFilter;
        return statusMatch && priorityMatch;
    });
    
    displayTicketsTable();
}

// Search tickets
function searchTickets() {
    const searchTerm = document.getElementById('tickets-searchTickets').value.toLowerCase();
    
    if (!searchTerm) {
        filterTickets(); // Apply current filters
        return;
    }
    
    filteredTickets = allTickets.filter(ticket => {
        return ticket.title.toLowerCase().includes(searchTerm) ||
               ticket.description.toLowerCase().includes(searchTerm) ||
               ticket.customer_name.toLowerCase().includes(searchTerm) ||
               ticket.customer_email.toLowerCase().includes(searchTerm);
    });
    
    displayTicketsTable();
}

// Open edit ticket modal
async function openEditTicketModal(ticketId) {
    console.log('🔄 Apertura modal modifica ticket ID:', ticketId); // DEBUG
    
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) {
        console.error('❌ Ticket non trovato:', ticketId);
        return;
    }
    
    console.log('📄 Dati ticket:', ticket); // DEBUG
    
    // PRIMA carica le configurazioni, POI popola i campi
    console.log('🔄 Caricamento configurazioni prima di popolare i campi...'); // DEBUG
    
    try {
        // Load configuration options FIRST
        await loadTicketConfigurationOptions();
        await loadAgentsForTickets();
        
        console.log('✅ Configurazioni caricate, popolamento campi...'); // DEBUG
        
        // THEN populate all fields with current values
        document.getElementById('editTicketId').value = ticket.id;
        document.getElementById('editTicketTitle').value = ticket.title || '';
        document.getElementById('editTicketDescription').value = ticket.description || '';
        document.getElementById('editCustomerName').value = ticket.customer_name || '';
        document.getElementById('editCustomerEmail').value = ticket.customer_email || '';
        document.getElementById('editTicketStatus').value = ticket.status || 'Open';
        document.getElementById('editTicketPriority').value = ticket.priority || 'Medium';
        document.getElementById('editAssignedToAgent').value = ticket.assigned_to || '';
        
        // New fields - POPOLATI DOPO IL CARICAMENTO DELLE OPZIONI
        document.getElementById('editTicketSoftware').value = ticket.software || '';
        document.getElementById('editTicketGroup').value = ticket.group || '';
        document.getElementById('editTicketType').value = ticket.type || '';
        document.getElementById('editRapportoDanea').value = ticket.rapporto_danea || '';
        document.getElementById('editIdAssistenza').value = ticket.id_assistenza || '';
        document.getElementById('editPasswordTeleassistenza').value = ticket.password_teleassistenza || '';
        document.getElementById('editNumeroRichiestaTeleassistenza').value = ticket.numero_richiesta_teleassistenza || '';
        
        console.log('✅ Tutti i campi popolati correttamente'); // DEBUG
        console.log('🔍 Valori impostati:', {
            software: ticket.software,
            group: ticket.group,
            type: ticket.type,
            rapporto_danea: ticket.rapporto_danea
        }); // DEBUG
        
        console.log('✅ Modal pronto per essere mostrato'); // DEBUG
        document.getElementById('editTicketModal').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Errore nel caricamento configurazioni:', error);
        // Anche se il caricamento fallisce, mostra il modal con i valori di base
        document.getElementById('editTicketModal').style.display = 'block';
    }
}

// Handle edit ticket form submission
async function handleEditTicketSubmission(e) {
    e.preventDefault();
    
    const ticketIdElement = document.getElementById('editTicketId');
    console.log('🔍 EditTicketId element:', ticketIdElement);
    const ticketId = ticketIdElement ? ticketIdElement.value : null;
    console.log('🎫 Editing ticket ID:', ticketId);
    
    if (!ticketId) {
        console.error('❌ Ticket ID mancante!');
        console.log('🔍 Current form elements:', {
            form: document.getElementById('editTicketForm'),
            hiddenField: document.getElementById('editTicketId')
        });
        showNotification('Errore: ID ticket mancante', 'error');
        return;
    }
    const formData = {
        title: document.getElementById('editTicketTitle').value,
        description: document.getElementById('editTicketDescription').value,
        customer_name: document.getElementById('editCustomerName').value,
        customer_email: document.getElementById('editCustomerEmail').value,
        status: document.getElementById('editTicketStatus').value,
        priority: document.getElementById('editTicketPriority').value,
        assigned_to: document.getElementById('editAssignedToAgent').value || null,
        software: document.getElementById('editTicketSoftware').value || null,
        group: document.getElementById('editTicketGroup').value || null,
        type: document.getElementById('editTicketType').value || null,
        rapporto_danea: document.getElementById('editRapportoDanea').value || null,
        id_assistenza: document.getElementById('editIdAssistenza').value || null,
        password_teleassistenza: document.getElementById('editPasswordTeleassistenza').value || null,
        numero_richiesta_teleassistenza: document.getElementById('editNumeroRichiestaTeleassistenza').value || null
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Ticket aggiornato con successo!', 'success');
            closeModal('editTicketModal');
            loadAllTickets();
            if (typeof loadStats === 'function') {
                loadStats(); // Update dashboard stats if available
            }
        } else {
            throw new Error('Errore nell\'aggiornamento del ticket');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiornamento del ticket', 'error');
    }
}

// Delete ticket
async function deleteTicket(ticketId) {
    if (!confirm('Sei sicuro di voler eliminare questo ticket?')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Ticket eliminato con successo!', 'success');
            loadAllTickets();
            loadStats(); // Update dashboard stats
        } else {
            throw new Error('Errore nell\'eliminazione del ticket');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'eliminazione del ticket', 'error');
    }
}

// Export tickets to CSV
function exportTickets() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Titolo,Cliente,Email,Priorità,Stato,Assegnato a,Creato\n"
        + filteredTickets.map(ticket => 
            `${ticket.id},"${ticket.title}","${ticket.customer_name}","${ticket.customer_email}",${ticket.priority},${ticket.status},"${ticket.assigned_to || ''}","${ticket.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tickets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Bulk actions
function selectAllTickets() {
    const checkboxes = document.querySelectorAll('.ticket-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = true);
    updateBulkActions();
}

function updateBulkActions() {
    const checkedBoxes = document.querySelectorAll('.ticket-checkbox:checked');
    const bulkActionsDiv = document.getElementById('bulkActions');
    
    if (checkedBoxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        document.getElementById('selectedCount').textContent = checkedBoxes.length;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function bulkUpdateStatus(newStatus) {
    const checkedBoxes = document.querySelectorAll('.ticket-checkbox:checked');
    const ticketIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (ticketIds.length === 0) return;
    
    if (confirm(`Aggiornare lo stato di ${ticketIds.length} ticket a "${newStatus}"?`)) {
        // Implementation for bulk update would go here
        showNotification(`${ticketIds.length} ticket aggiornati`, 'success');
    }
}