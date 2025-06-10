-- ============================================
-- MIGRAZIONE TABELLE EMAIL E CONFIGURAZIONI PER SUPABASE
-- ============================================

-- Tabella per configurazioni email (SMTP/IMAP)
CREATE TABLE IF NOT EXISTS email_settings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('smtp', 'imap')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella per template email
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella opzioni software per ticket
CREATE TABLE IF NOT EXISTS ticket_software_options (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella opzioni gruppi per ticket
CREATE TABLE IF NOT EXISTS ticket_group_options (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella opzioni tipi per ticket
CREATE TABLE IF NOT EXISTS ticket_type_options (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella impostazioni sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERIMENTO DATI PREDEFINITI
-- ============================================

-- Template email predefiniti
INSERT INTO email_templates (type, subject, body) VALUES 
('new_ticket', 'Nuovo Ticket #{ticket_id} - {ticket_title}', 
'Gentile {customer_name},

Il suo ticket #{ticket_id} "{ticket_title}" è stato creato con successo.

Descrizione: {ticket_description}
Priorità: {ticket_priority}
Stato: {ticket_status}

La terremo aggiornata sui progressi.

Cordiali saluti,
Il Team di Supporto'),

('update_ticket', 'Aggiornamento Ticket #{ticket_id}',
'Gentile {customer_name},

Il suo ticket #{ticket_id} "{ticket_title}" è stato aggiornato.

Nuovo stato: {ticket_status}
{update_message}

Cordiali saluti,
Il Team di Supporto')
ON CONFLICT (type) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = CURRENT_TIMESTAMP;

-- Opzioni software predefinite
INSERT INTO ticket_software_options (value, label) VALUES 
('danea-easyfatt', 'Danea EasyFatt'),
('danea-clienti', 'Danea Clienti'),
('gestionale-custom', 'Gestionale Custom'),
('altro', 'Altro')
ON CONFLICT DO NOTHING;

-- Opzioni gruppi predefinite
INSERT INTO ticket_group_options (value, label) VALUES 
('supporto-tecnico', 'Supporto Tecnico'),
('assistenza-commerciale', 'Assistenza Commerciale'),
('amministrazione', 'Amministrazione'),
('sviluppo', 'Sviluppo')
ON CONFLICT DO NOTHING;

-- Opzioni tipi predefinite
INSERT INTO ticket_type_options (value, label) VALUES 
('problema-tecnico', 'Problema Tecnico'),
('richiesta-informazioni', 'Richiesta Informazioni'),
('installazione', 'Installazione'),
('configurazione', 'Configurazione'),
('formazione', 'Formazione'),
('teleassistenza', 'Teleassistenza')
ON CONFLICT DO NOTHING;

-- Impostazioni sistema predefinite
INSERT INTO system_settings (key, value) VALUES 
('company_name', 'CRM Pro'),
('default_priority', 'Medium'),
('auto_assign', 'false')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_settings_type ON email_settings(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_ticket_software_options_active ON ticket_software_options(is_active);
CREATE INDEX IF NOT EXISTS idx_ticket_group_options_active ON ticket_group_options(is_active);
CREATE INDEX IF NOT EXISTS idx_ticket_type_options_active ON ticket_type_options(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ============================================
-- TRIGGER PER UPDATED_AT
-- ============================================

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per email_settings
CREATE TRIGGER update_email_settings_updated_at
    BEFORE UPDATE ON email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per email_templates
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per system_settings
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICA CREAZIONE TABELLE
-- ============================================

-- Lista tutte le tabelle email e config create
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE tablename IN (
    'email_settings', 
    'email_templates', 
    'ticket_software_options', 
    'ticket_group_options', 
    'ticket_type_options', 
    'system_settings'
)
ORDER BY tablename;