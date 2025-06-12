// Customers page specific functionality
let allCustomers = [];
let filteredCustomers = [];

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

// Initialize customers page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/customers') {
        loadAllCustomers();
        loadCustomerStats();
        setupCustomersEventListeners();
    }
});

// Load all customers
async function loadAllCustomers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`);
        allCustomers = await response.json();
        filteredCustomers = [...allCustomers];
        displayCustomersTable();
        populateCompanyFilter();
    } catch (error) {
        console.error('Errore nel caricamento dei clienti:', error);
        document.getElementById('customersTableBody').innerHTML = 
            '<tr><td colspan="8" class="error">Errore nel caricamento dei clienti</td></tr>';
    }
}

// Load customer statistics
async function loadCustomerStats() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/stats`);
        const stats = await response.json();
        
        document.getElementById('total-customers-count').textContent = stats.total_customers || 0;
        document.getElementById('active-customers-count').textContent = stats.active_customers || 0;
        
        // Calculate unique companies
        const companies = new Set(allCustomers.filter(c => c.company).map(c => c.company));
        document.getElementById('companies-count').textContent = companies.size;
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
    }
}

// Display customers in table
function displayCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    
    if (filteredCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Nessun cliente trovato</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredCustomers.map(customer => `
        <tr>
            <td>#${customer.id}</td>
            <td>
                <div class="customer-info">
                    <strong>${escapeHtml(customer.name)}</strong>
                    ${customer.company ? `<br><small>${escapeHtml(customer.company)}</small>` : ''}
                </div>
            </td>
            <td>
                <a href="mailto:${sanitizeForAttribute(customer.email)}">${escapeHtml(customer.email)}</a>
            </td>
            <td>
                ${customer.phone ? `<a href="tel:${sanitizeForAttribute(customer.phone)}">${escapeHtml(customer.phone)}</a>` : '-'}
            </td>
            <td>${escapeHtml(customer.company) || '-'}</td>
            <td>
                <span class="status-badge status-${sanitizeForAttribute(customer.status)}">${escapeHtml(customer.status)}</span>
            </td>
            <td>${formatDate(customer.created_at)}</td>
            <td class="customer-actions-cell">
                <button class="btn-small btn-info" onclick="viewCustomerDetails(${customer.id})" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-small btn-edit" onclick="openEditCustomerModal(${customer.id})" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-delete" onclick="deleteCustomer(${customer.id})" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Setup customers page event listeners
function setupCustomersEventListeners() {
    // Customer form submission
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', handleCustomerSubmission);
    }
    
    // Edit customer form submission
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', handleEditCustomerSubmission);
    }
}

// Handle customer form submission
async function handleCustomerSubmission(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        company: document.getElementById('customerCompany').value,
        address: document.getElementById('customerAddress').value,
        notes: document.getElementById('customerNotes').value,
        status: document.getElementById('customerStatus').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Cliente aggiunto con successo!', 'success');
            closeModal('newCustomerModal');
            document.getElementById('customerForm').reset();
            loadAllCustomers();
            loadCustomerStats();
        } else {
            throw new Error('Errore nell\'aggiunta del cliente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiunta del cliente', 'error');
    }
}

// Handle edit customer form submission
async function handleEditCustomerSubmission(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('editCustomerId').value;
    const formData = {
        name: document.getElementById('editCustomerName').value,
        email: document.getElementById('editCustomerEmail').value,
        phone: document.getElementById('editCustomerPhone').value,
        company: document.getElementById('editCustomerCompany').value,
        address: document.getElementById('editCustomerAddress').value,
        notes: document.getElementById('editCustomerNotes').value,
        status: document.getElementById('editCustomerStatus').value
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Cliente aggiornato con successo!', 'success');
            closeModal('editCustomerModal');
            loadAllCustomers();
            loadCustomerStats();
        } else {
            throw new Error('Errore nell\'aggiornamento del cliente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'aggiornamento del cliente', 'error');
    }
}

// Filter customers
function filterCustomers() {
    const statusFilter = document.getElementById('customers-statusFilter').value;
    const companyFilter = document.getElementById('customers-companyFilter').value;
    
    filteredCustomers = allCustomers.filter(customer => {
        const statusMatch = !statusFilter || customer.status === statusFilter;
        const companyMatch = !companyFilter || customer.company === companyFilter;
        return statusMatch && companyMatch;
    });
    
    displayCustomersTable();
}

// Search customers
function searchCustomers() {
    const searchTerm = document.getElementById('customers-searchCustomers').value.toLowerCase();
    
    if (!searchTerm) {
        filterCustomers(); // Apply current filters
        return;
    }
    
    filteredCustomers = allCustomers.filter(customer => {
        return customer.name.toLowerCase().includes(searchTerm) ||
               customer.email.toLowerCase().includes(searchTerm) ||
               (customer.company && customer.company.toLowerCase().includes(searchTerm)) ||
               (customer.phone && customer.phone.includes(searchTerm));
    });
    
    displayCustomersTable();
}

// Populate company filter dropdown
function populateCompanyFilter() {
    const companyFilter = document.getElementById('customers-companyFilter');
    const companies = [...new Set(allCustomers.filter(c => c.company).map(c => c.company))].sort();
    
    // Clear existing options except "Tutte"
    companyFilter.innerHTML = '<option value="">Tutte</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyFilter.appendChild(option);
    });
}

// Open new customer modal
function openNewCustomerModal() {
    document.getElementById('newCustomerModal').style.display = 'block';
}

// Open edit customer modal
function openEditCustomerModal(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editCustomerEmail').value = customer.email;
    document.getElementById('editCustomerPhone').value = customer.phone || '';
    document.getElementById('editCustomerCompany').value = customer.company || '';
    document.getElementById('editCustomerAddress').value = customer.address || '';
    document.getElementById('editCustomerNotes').value = customer.notes || '';
    document.getElementById('editCustomerStatus').value = customer.status;
    
    document.getElementById('editCustomerModal').style.display = 'block';
}

// View customer details
function viewCustomerDetails(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    const detailsContent = document.getElementById('customerDetailsContent');
    detailsContent.innerHTML = `
        <div class="customer-details">
            <div class="detail-section">
                <h3>Informazioni Generali</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="field-label">Nome:</span>
                        <span>${customer.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Email:</span>
                        <span><a href="mailto:${customer.email}">${customer.email}</a></span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Telefono:</span>
                        <span>${customer.phone ? `<a href="tel:${customer.phone}">${customer.phone}</a>` : 'Non specificato'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Azienda:</span>
                        <span>${customer.company || 'Non specificata'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Stato:</span>
                        <span class="status-badge status-${customer.status}">${customer.status}</span>
                    </div>
                </div>
            </div>
            
            ${customer.address ? `
            <div class="detail-section">
                <h3>Indirizzo</h3>
                <p>${customer.address}</p>
            </div>
            ` : ''}
            
            ${customer.notes ? `
            <div class="detail-section">
                <h3>Note</h3>
                <p>${customer.notes}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>Informazioni Sistema</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="field-label">Registrato:</span>
                        <span>${formatDate(customer.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="field-label">Ultimo aggiornamento:</span>
                        <span>${formatDate(customer.updated_at)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn primary" onclick="openEditCustomerModal(${customer.id}); closeModal('customerDetailsModal');">
                    <i class="fas fa-edit"></i> Modifica Cliente
                </button>
                <button class="btn secondary" onclick="createTicketForCustomer(${customer.id})">
                    <i class="fas fa-ticket-alt"></i> Crea Ticket
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('customerDetailsModal').style.display = 'block';
}

// Delete customer
async function deleteCustomer(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!confirm(`Sei sicuro di voler eliminare il cliente "${customer.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Cliente eliminato con successo!', 'success');
            loadAllCustomers();
            loadCustomerStats();
        } else {
            throw new Error('Errore nell\'eliminazione del cliente');
        }
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'eliminazione del cliente', 'error');
    }
}

// Export customers to CSV
function exportCustomers() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Nome,Email,Telefono,Azienda,Indirizzo,Stato,Registrato\n"
        + filteredCustomers.map(customer => 
            `${customer.id},"${customer.name}","${customer.email}","${customer.phone || ''}","${customer.company || ''}","${customer.address || ''}",${customer.status},"${customer.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clienti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export completato!', 'success');
}

// Create ticket for customer
function createTicketForCustomer(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Pre-fill customer data in new ticket modal
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerEmail').value = customer.email;
    
    // Close details modal and open ticket modal
    closeModal('customerDetailsModal');
    openNewTicketModal();
}