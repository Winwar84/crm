// Settings page functionality
let configData = {
    software: [],
    groups: [],
    types: []
};

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

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/settings') {
        loadAllConfigurations();
        loadSystemSettings();
        loadEmailConfiguration();
        loadEmailStatus();
    }
});

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'agents-management') {
        loadAllAgents();
        loadAgentStats();
    } else if (tabName === 'admin-panel') {
        loadAdminStats();
        loadPendingUsers();
        loadAllUsers();
    }
}

// Load all configuration options
async function loadAllConfigurations() {
    await loadConfiguration('software');
    await loadConfiguration('groups');
    await loadConfiguration('types');
}

// Load specific configuration
async function loadConfiguration(type) {
    try {
        const response = await fetchWithAuth(`${API_BASE}/config/${type}`);
        if (response.ok) {
            const data = await response.json();
            configData[type] = data;
        } else {
            // If API fails, use default data
            setDefaultConfiguration(type);
        }
        displayConfiguration(type);
    } catch (error) {
        console.error(`Errore nel caricamento configurazione ${type}:`, error);
        setDefaultConfiguration(type);
        displayConfiguration(type);
    }
}

// Set default configuration data
function setDefaultConfiguration(type) {
    switch (type) {
        case 'software':
            configData.software = [
                { value: 'danea-easyfatt', label: 'Danea EasyFatt' },
                { value: 'danea-clienti', label: 'Danea Clienti' },
                { value: 'gestionale-custom', label: 'Gestionale Custom' },
                { value: 'altro', label: 'Altro' }
            ];
            break;
        case 'groups':
            configData.groups = [
                { value: 'supporto-tecnico', label: 'Supporto Tecnico' },
                { value: 'assistenza-commerciale', label: 'Assistenza Commerciale' },
                { value: 'amministrazione', label: 'Amministrazione' },
                { value: 'sviluppo', label: 'Sviluppo' }
            ];
            break;
        case 'types':
            configData.types = [
                { value: 'problema-tecnico', label: 'Problema Tecnico' },
                { value: 'richiesta-informazioni', label: 'Richiesta Informazioni' },
                { value: 'installazione', label: 'Installazione' },
                { value: 'configurazione', label: 'Configurazione' },
                { value: 'formazione', label: 'Formazione' },
                { value: 'teleassistenza', label: 'Teleassistenza' }
            ];
            break;
    }
}

// Display configuration options
function displayConfiguration(type) {
    const container = document.getElementById(`${type}List`);
    if (!container) return;
    
    container.innerHTML = configData[type].map((option, index) => `
        <div class="config-item">
            <div class="config-item-info">
                <span class="config-value">${option.value}</span>
                <span class="config-label">${option.label}</span>
            </div>
            <div class="config-actions">
                <button onclick="editConfigOption('${type}', ${index})" class="btn-small btn-edit" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteConfigOption('${type}', ${index})" class="btn-small btn-delete" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Add new configuration option
async function addConfigOption(type) {
    let inputPrefix;
    if (type === 'software') {
        inputPrefix = 'newSoftware';
    } else if (type === 'groups') {
        inputPrefix = 'newGroup';
    } else if (type === 'types') {
        inputPrefix = 'newType';
    }
    
    const valueInput = document.getElementById(`${inputPrefix}Value`);
    const labelInput = document.getElementById(`${inputPrefix}Label`);
    
    const value = valueInput.value.trim();
    const label = labelInput.value.trim();
    
    if (!value || !label) {
        showNotification('Inserisci sia valore che etichetta', 'error');
        return;
    }
    
    // Check if value already exists
    if (configData[type].some(option => option.value === value)) {
        showNotification('Valore già esistente', 'error');
        return;
    }
    
    const newOption = { value, label };
    configData[type].push(newOption);
    
    try {
        await saveConfiguration(type);
        displayConfiguration(type);
        valueInput.value = '';
        labelInput.value = '';
        showNotification('Opzione aggiunta con successo', 'success');
    } catch (error) {
        configData[type].pop(); // Remove the added option if save fails
        showNotification('Errore nel salvataggio', 'error');
    }
}

// Edit configuration option
function editConfigOption(type, index) {
    const option = configData[type][index];
    const newValue = prompt('Modifica valore:', option.value);
    const newLabel = prompt('Modifica etichetta:', option.label);
    
    if (newValue && newLabel) {
        // Check if new value already exists (excluding current item)
        if (configData[type].some((opt, idx) => opt.value === newValue && idx !== index)) {
            showNotification('Valore già esistente', 'error');
            return;
        }
        
        configData[type][index] = { value: newValue, label: newLabel };
        saveConfiguration(type);
        displayConfiguration(type);
        showNotification('Opzione modificata con successo', 'success');
    }
}

// Delete configuration option
async function deleteConfigOption(type, index) {
    if (!confirm('Sei sicuro di voler eliminare questa opzione?')) {
        return;
    }
    
    const removedOption = configData[type].splice(index, 1)[0];
    
    try {
        await saveConfiguration(type);
        displayConfiguration(type);
        showNotification('Opzione eliminata con successo', 'success');
    } catch (error) {
        configData[type].splice(index, 0, removedOption); // Restore the option if save fails
        showNotification('Errore nel salvataggio', 'error');
    }
}

// Save configuration to backend
async function saveConfiguration(type) {
    try {
        const response = await fetchWithAuth(`${API_BASE}/config/${type}`, {
            method: 'POST',
            body: JSON.stringify(configData[type])
        });
        
        if (!response.ok) {
            throw new Error('Errore nel salvataggio');
        }
        
        // Save to localStorage as fallback
        localStorage.setItem(`config_${type}`, JSON.stringify(configData[type]));
        
    } catch (error) {
        console.error(`Errore nel salvataggio configurazione ${type}:`, error);
        // Save to localStorage if API fails
        localStorage.setItem(`config_${type}`, JSON.stringify(configData[type]));
        throw error;
    }
}

// Load system settings
function loadSystemSettings() {
    const companyName = localStorage.getItem('company_name') || 'CRM Pro';
    const defaultPriority = localStorage.getItem('default_priority') || 'Medium';
    const autoAssign = localStorage.getItem('auto_assign') === 'true';
    
    document.getElementById('companyName').value = companyName;
    document.getElementById('defaultPriority').value = defaultPriority;
    document.getElementById('autoAssign').checked = autoAssign;
}

// Save system settings
async function saveSystemSettings() {
    const companyName = document.getElementById('companyName').value;
    const defaultPriority = document.getElementById('defaultPriority').value;
    const autoAssign = document.getElementById('autoAssign').checked;
    
    const settings = {
        company_name: companyName,
        default_priority: defaultPriority,
        auto_assign: autoAssign
    };
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/config/system`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            // Save to localStorage as well
            localStorage.setItem('company_name', companyName);
            localStorage.setItem('default_priority', defaultPriority);
            localStorage.setItem('auto_assign', autoAssign);
            
            showNotification('Impostazioni salvate con successo', 'success');
        } else {
            throw new Error('Errore nel salvataggio');
        }
    } catch (error) {
        console.error('Errore nel salvataggio impostazioni sistema:', error);
        // Save to localStorage if API fails
        localStorage.setItem('company_name', companyName);
        localStorage.setItem('default_priority', defaultPriority);
        localStorage.setItem('auto_assign', autoAssign);
        
        showNotification('Impostazioni salvate localmente', 'warning');
    }
}

// Load configuration from localStorage if API fails
function loadConfigurationFromStorage() {
    ['software', 'groups', 'types'].forEach(type => {
        const stored = localStorage.getItem(`config_${type}`);
        if (stored) {
            try {
                configData[type] = JSON.parse(stored);
            } catch (error) {
                setDefaultConfiguration(type);
            }
        } else {
            setDefaultConfiguration(type);
        }
        displayConfiguration(type);
    });
}

// Email configuration functions
async function testSmtpConnection() {
    const smtpData = {
        host: document.getElementById('smtpHost').value,
        port: document.getElementById('smtpPort').value,
        username: document.getElementById('smtpUsername').value,
        password: document.getElementById('smtpPassword').value,
        security: document.getElementById('smtpSecurity').value,
        from_email: document.getElementById('smtpFromEmail').value,
        from_name: document.getElementById('smtpFromName').value
    };
    
    if (!smtpData.host || !smtpData.username || !smtpData.password || !smtpData.from_email) {
        showNotification('Compila tutti i campi obbligatori SMTP', 'error');
        return;
    }
    
    try {
        showNotification('Test connessione SMTP in corso...', 'info');
        
        const response = await fetchWithAuth(`${API_BASE}/email/test-smtp`, {
            method: 'POST',
            body: JSON.stringify(smtpData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('✅ Connessione SMTP riuscita!', 'success');
        } else {
            showNotification(`❌ Test SMTP fallito: ${result.error || 'Errore sconosciuto'}`, 'error');
        }
    } catch (error) {
        console.error('Errore test SMTP:', error);
        showNotification('❌ Errore durante il test SMTP', 'error');
    }
}

async function testImapConnection() {
    const imapData = {
        host: document.getElementById('imapHost').value,
        port: document.getElementById('imapPort').value,
        username: document.getElementById('imapUsername').value,
        password: document.getElementById('imapPassword').value,
        security: document.getElementById('imapSecurity').value,
        folder: document.getElementById('imapFolder').value,
        auto_check: document.getElementById('imapAutoCheck').value,
        create_tickets: document.getElementById('imapCreateTickets').checked
    };
    
    if (!imapData.host || !imapData.username || !imapData.password) {
        showNotification('Compila tutti i campi obbligatori IMAP', 'error');
        return;
    }
    
    try {
        showNotification('Test connessione IMAP in corso...', 'info');
        
        const response = await fetchWithAuth(`${API_BASE}/email/test-imap`, {
            method: 'POST',
            body: JSON.stringify(imapData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('✅ Connessione IMAP riuscita!', 'success');
        } else {
            showNotification(`❌ Test IMAP fallito: ${result.error || 'Errore sconosciuto'}`, 'error');
        }
    } catch (error) {
        console.error('Errore test IMAP:', error);
        showNotification('❌ Errore durante il test IMAP', 'error');
    }
}

async function saveEmailSettings(type) {
    console.log('🚀 saveEmailSettings called with type:', type);
    
    if (type === 'smtp') {
        console.log('📧 Processing SMTP save...');
        
        // Debug: check if elements exist
        const hostEl = document.getElementById('smtpHost');
        const portEl = document.getElementById('smtpPort');
        const usernameEl = document.getElementById('smtpUsername');
        const passwordEl = document.getElementById('smtpPassword');
        const securityEl = document.getElementById('smtpSecurity');
        const fromEmailEl = document.getElementById('smtpFromEmail');
        const fromNameEl = document.getElementById('smtpFromName');
        
        console.log('🔍 Elements check:', {
            host: hostEl ? hostEl.value : 'MISSING',
            port: portEl ? portEl.value : 'MISSING',
            username: usernameEl ? usernameEl.value : 'MISSING',
            password: passwordEl ? (passwordEl.value ? `${passwordEl.value.length} chars` : 'EMPTY') : 'MISSING',
            security: securityEl ? securityEl.value : 'MISSING',
            fromEmail: fromEmailEl ? fromEmailEl.value : 'MISSING',
            fromName: fromNameEl ? fromNameEl.value : 'MISSING'
        });
        
        const smtpData = {
            type: 'smtp',
            host: hostEl?.value || '',
            port: parseInt(portEl?.value || '587'),
            username: usernameEl?.value || '',
            password: passwordEl?.value || '',
            security: securityEl?.value || 'TLS',
            from_email: fromEmailEl?.value || '',
            from_name: fromNameEl?.value || '',
            enabled: true
        };
        
        console.log('🔍 DEBUG SMTP Data:', smtpData);
        console.log('🔍 Password length:', smtpData.password ? smtpData.password.length : 'EMPTY');
        console.log('🔍 API_BASE value:', typeof API_BASE !== 'undefined' ? API_BASE : 'UNDEFINED');
        
        if (!smtpData.host || !smtpData.username || !smtpData.from_email) {
            console.log('❌ Missing required fields');
            showNotification('Compila tutti i campi obbligatori SMTP', 'error');
            return;
        }
        
        if (!smtpData.password || smtpData.password.trim() === '') {
            console.log('❌ Missing password');
            showNotification('Inserisci la password SMTP', 'error');
            return;
        }
        
        console.log('✅ Validation passed, making API call...');
        
        try {
            const response = await fetchWithAuth(`${API_BASE}/email/smtp`, {
                method: 'POST',
                body: JSON.stringify(smtpData)
            });
            
            if (response.ok) {
                localStorage.setItem('smtp_config', JSON.stringify(smtpData));
                showNotification('✅ Configurazione SMTP salvata con successo!', 'success');
                loadEmailStatus(); // Aggiorna lo status
            } else {
                const error = await response.json();
                showNotification(`❌ Errore salvataggio SMTP: ${error.error || 'Errore sconosciuto'}`, 'error');
            }
        } catch (error) {
            console.error('Errore salvataggio SMTP:', error);
            localStorage.setItem('smtp_config', JSON.stringify(smtpData));
            showNotification('⚠️ SMTP salvato localmente (server non disponibile)', 'warning');
        }
        
    } else if (type === 'imap') {
        console.log('📬 Processing IMAP save...');
        
        // Debug: check if elements exist
        const hostEl = document.getElementById('imapHost');
        const portEl = document.getElementById('imapPort');
        const usernameEl = document.getElementById('imapUsername');
        const passwordEl = document.getElementById('imapPassword');
        const securityEl = document.getElementById('imapSecurity');
        const folderEl = document.getElementById('imapFolder');
        const autoCheckEl = document.getElementById('imapAutoCheck');
        const createTicketsEl = document.getElementById('imapCreateTickets');
        
        console.log('🔍 IMAP Elements check:', {
            host: hostEl ? hostEl.value : 'MISSING',
            port: portEl ? portEl.value : 'MISSING',
            username: usernameEl ? usernameEl.value : 'MISSING',
            password: passwordEl ? (passwordEl.value ? `${passwordEl.value.length} chars` : 'EMPTY') : 'MISSING',
            security: securityEl ? securityEl.value : 'MISSING',
            folder: folderEl ? folderEl.value : 'MISSING',
            autoCheck: autoCheckEl ? autoCheckEl.value : 'MISSING',
            createTickets: createTicketsEl ? createTicketsEl.checked : 'MISSING'
        });
        
        const imapData = {
            type: 'imap',
            host: hostEl?.value || '',
            port: parseInt(portEl?.value || '993'),
            username: usernameEl?.value || '',
            password: passwordEl?.value || '',
            security: securityEl?.value || 'SSL',
            folder: folderEl?.value || 'INBOX',
            auto_check: parseInt(autoCheckEl?.value || '0'),
            create_tickets: createTicketsEl?.checked || false,
            enabled: true
        };
        
        console.log('🔍 DEBUG IMAP Data:', imapData);
        console.log('🔍 IMAP Password length:', imapData.password ? imapData.password.length : 'EMPTY');
        
        if (!imapData.host || !imapData.username || !imapData.password) {
            console.log('❌ Missing required IMAP fields');
            showNotification('Compila tutti i campi obbligatori IMAP', 'error');
            return;
        }
        
        console.log('✅ IMAP Validation passed, making API call...');
        
        try {
            const response = await fetchWithAuth(`${API_BASE}/email/imap`, {
                method: 'POST',
                body: JSON.stringify(imapData)
            });
            
            if (response.ok) {
                localStorage.setItem('imap_config', JSON.stringify(imapData));
                showNotification('✅ Configurazione IMAP salvata con successo!', 'success');
                loadEmailStatus(); // Aggiorna lo status
            } else {
                const error = await response.json();
                showNotification(`❌ Errore salvataggio IMAP: ${error.error || 'Errore sconosciuto'}`, 'error');
            }
        } catch (error) {
            console.error('Errore salvataggio IMAP:', error);
            localStorage.setItem('imap_config', JSON.stringify(imapData));
            showNotification('⚠️ IMAP salvato localmente (server non disponibile)', 'warning');
        }
    }
}

async function saveEmailTemplates() {
    const templatesData = {
        new_ticket: {
            subject: document.getElementById('newTicketSubject').value,
            template: document.getElementById('newTicketTemplate').value
        },
        update_ticket: {
            subject: document.getElementById('updateTicketSubject').value,
            template: document.getElementById('updateTicketTemplate').value
        }
    };
    
    if (!templatesData.new_ticket.subject || !templatesData.new_ticket.template ||
        !templatesData.update_ticket.subject || !templatesData.update_ticket.template) {
        showNotification('Compila tutti i campi dei template', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/email/templates`, {
            method: 'POST',
            body: JSON.stringify(templatesData)
        });
        
        if (response.ok) {
            localStorage.setItem('email_templates', JSON.stringify(templatesData));
            showNotification('✅ Template email salvati con successo!', 'success');
        } else {
            const error = await response.json();
            showNotification(`❌ Errore salvataggio template: ${error.error || 'Errore sconosciuto'}`, 'error');
        }
    } catch (error) {
        console.error('Errore salvataggio template:', error);
        localStorage.setItem('email_templates', JSON.stringify(templatesData));
        showNotification('⚠️ Template salvati localmente (server non disponibile)', 'warning');
    }
}

// Load email configuration on page load
async function loadEmailConfiguration() {
    try {
        // Load SMTP configuration
        const smtpResponse = await fetchWithAuth(`${API_BASE}/email/smtp`);
        if (smtpResponse.ok) {
            const smtpConfig = await smtpResponse.json();
            if (smtpConfig) {
                document.getElementById('smtpHost').value = smtpConfig.host || '';
                document.getElementById('smtpPort').value = smtpConfig.port || 587;
                document.getElementById('smtpUsername').value = smtpConfig.username || '';
                document.getElementById('smtpPassword').value = smtpConfig.password || '';
                document.getElementById('smtpSecurity').value = smtpConfig.security || 'TLS';
                document.getElementById('smtpFromEmail').value = smtpConfig.from_email || '';
                document.getElementById('smtpFromName').value = smtpConfig.from_name || '';
            }
        } else {
            // Load from localStorage if API fails
            const storedSmtp = localStorage.getItem('smtp_config');
            if (storedSmtp) {
                const smtpConfig = JSON.parse(storedSmtp);
                document.getElementById('smtpHost').value = smtpConfig.host || '';
                document.getElementById('smtpPort').value = smtpConfig.port || 587;
                document.getElementById('smtpUsername').value = smtpConfig.username || '';
                document.getElementById('smtpPassword').value = smtpConfig.password || '';
                document.getElementById('smtpSecurity').value = smtpConfig.security || 'TLS';
                document.getElementById('smtpFromEmail').value = smtpConfig.from_email || '';
                document.getElementById('smtpFromName').value = smtpConfig.from_name || '';
            }
        }
        
        // Load IMAP configuration
        const imapResponse = await fetchWithAuth(`${API_BASE}/email/imap`);
        if (imapResponse.ok) {
            const imapConfig = await imapResponse.json();
            if (imapConfig) {
                document.getElementById('imapHost').value = imapConfig.host || '';
                document.getElementById('imapPort').value = imapConfig.port || 993;
                document.getElementById('imapUsername').value = imapConfig.username || '';
                document.getElementById('imapPassword').value = imapConfig.password || '';
                document.getElementById('imapSecurity').value = imapConfig.security || 'SSL';
                document.getElementById('imapFolder').value = imapConfig.folder || 'INBOX';
                document.getElementById('imapAutoCheck').value = imapConfig.auto_check || '0';
                document.getElementById('imapCreateTickets').checked = imapConfig.create_tickets || false;
            }
        } else {
            // Load from localStorage if API fails
            const storedImap = localStorage.getItem('imap_config');
            if (storedImap) {
                const imapConfig = JSON.parse(storedImap);
                document.getElementById('imapHost').value = imapConfig.host || '';
                document.getElementById('imapPort').value = imapConfig.port || 993;
                document.getElementById('imapUsername').value = imapConfig.username || '';
                document.getElementById('imapPassword').value = imapConfig.password || '';
                document.getElementById('imapSecurity').value = imapConfig.security || 'SSL';
                document.getElementById('imapFolder').value = imapConfig.folder || 'INBOX';
                document.getElementById('imapAutoCheck').value = imapConfig.auto_check || '0';
                document.getElementById('imapCreateTickets').checked = imapConfig.create_tickets || false;
            }
        }
        
        // Load email templates
        const templatesResponse = await fetchWithAuth(`${API_BASE}/email/templates`);
        if (templatesResponse.ok) {
            const templates = await templatesResponse.json();
            if (templates) {
                document.getElementById('newTicketSubject').value = templates.new_ticket?.subject || 'Nuovo Ticket #{ticket_id} - {ticket_title}';
                document.getElementById('newTicketTemplate').value = templates.new_ticket?.template || 'Gentile {customer_name},\n\nIl suo ticket #{ticket_id} "{ticket_title}" è stato creato con successo.\n\nDescrizione: {ticket_description}\nPriorità: {ticket_priority}\nStato: {ticket_status}\n\nLa terremo aggiornata sui progressi.\n\nCordiali saluti,\nIl Team di Supporto';
                document.getElementById('updateTicketSubject').value = templates.update_ticket?.subject || 'Aggiornamento Ticket #{ticket_id}';
                document.getElementById('updateTicketTemplate').value = templates.update_ticket?.template || 'Gentile {customer_name},\n\nIl suo ticket #{ticket_id} "{ticket_title}" è stato aggiornato.\n\nNuovo stato: {ticket_status}\n{update_message}\n\nCordiali saluti,\nIl Team di Supporto';
            }
        } else {
            // Load from localStorage if API fails
            const storedTemplates = localStorage.getItem('email_templates');
            if (storedTemplates) {
                const templates = JSON.parse(storedTemplates);
                document.getElementById('newTicketSubject').value = templates.new_ticket?.subject || 'Nuovo Ticket #{ticket_id} - {ticket_title}';
                document.getElementById('newTicketTemplate').value = templates.new_ticket?.template || 'Gentile {customer_name},\n\nIl suo ticket #{ticket_id} "{ticket_title}" è stato creato con successo.\n\nDescrizione: {ticket_description}\nPriorità: {ticket_priority}\nStato: {ticket_status}\n\nLa terremo aggiornata sui progressi.\n\nCordiali saluti,\nIl Team di Supporto';
                document.getElementById('updateTicketSubject').value = templates.update_ticket?.subject || 'Aggiornamento Ticket #{ticket_id}';
                document.getElementById('updateTicketTemplate').value = templates.update_ticket?.template || 'Gentile {customer_name},\n\nIl suo ticket #{ticket_id} "{ticket_title}" è stato aggiornato.\n\nNuovo stato: {ticket_status}\n{update_message}\n\nCordiali saluti,\nIl Team di Supporto';
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento configurazione email:', error);
    }
}

// Load email status and update UI indicators
async function loadEmailStatus() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/email/status`);
        if (response.ok) {
            const status = await response.json();
            
            // Update SMTP status
            const smtpStatusEl = document.getElementById('smtpStatus');
            if (smtpStatusEl) {
                if (status.smtp_configured) {
                    smtpStatusEl.innerHTML = `<span class="status-configured">✅ Configurato</span>`;
                    smtpStatusEl.innerHTML += `<div class="status-details">${status.smtp_config.username}@${status.smtp_config.host}:${status.smtp_config.port}</div>`;
                } else {
                    smtpStatusEl.innerHTML = `<span class="status-not-configured">❌ Non Configurato</span>`;
                }
            }
            
            // Update IMAP status
            const imapStatusEl = document.getElementById('imapStatus');
            if (imapStatusEl) {
                if (status.imap_configured) {
                    imapStatusEl.innerHTML = `<span class="status-configured">✅ Configurato</span>`;
                    imapStatusEl.innerHTML += `<div class="status-details">${status.imap_config.username}@${status.imap_config.host}:${status.imap_config.port}</div>`;
                } else {
                    imapStatusEl.innerHTML = `<span class="status-not-configured">❌ Non Configurato</span>`;
                }
            }
            
            // Update Monitor status
            const monitorStatusEl = document.getElementById('monitorStatus');
            if (monitorStatusEl) {
                if (status.monitor_active) {
                    monitorStatusEl.innerHTML = `<span class="status-active">🟢 Attivo</span>`;
                    if (status.imap_config.auto_check > 0) {
                        monitorStatusEl.innerHTML += `<div class="status-details">Controllo ogni ${status.imap_config.auto_check} secondi</div>`;
                    }
                } else {
                    monitorStatusEl.innerHTML = `<span class="status-inactive">🔴 Inattivo</span>`;
                }
            }
        } else {
            console.error('Failed to load email status');
        }
    } catch (error) {
        console.error('Errore nel caricamento status email:', error);
    }
}