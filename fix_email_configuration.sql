-- ============================================
-- MIGRAZIONE COMPLETA CONFIGURAZIONE EMAIL
-- ============================================

-- Tabella per configurazioni email (SMTP/IMAP)
CREATE TABLE IF NOT EXISTS email_settings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('smtp', 'imap')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type)
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

-- ============================================
-- FUNZIONI E TRIGGER
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
DROP TRIGGER IF EXISTS update_email_settings_updated_at ON email_settings;
CREATE TRIGGER update_email_settings_updated_at
    BEFORE UPDATE ON email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per email_templates
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERIMENTO TEMPLATE PREDEFINITI
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
Il Team di Supporto'),

('message_to_customer', 'Re: Ticket #{ticket_id} - {ticket_title}',
'Gentile {customer_name},

Ha ricevuto un nuovo messaggio per il ticket #{ticket_id}.

Da: {sender_name} ({sender_email})
Data: {message_date}

Messaggio:
{message_text}

---
Questo è un messaggio automatico del sistema CRM.
Ticket ID: #{ticket_id}
Titolo: {ticket_title}
Stato: {ticket_status}
Priorità: {ticket_priority}

Per rispondere, basta rispondere a questa email.

Cordiali saluti,
Il Team di Supporto')
ON CONFLICT (type) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_settings_type ON email_settings(type);
CREATE INDEX IF NOT EXISTS idx_email_settings_active ON email_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);

-- ============================================
-- VERIFICA CREAZIONE TABELLE
-- ============================================

-- Mostra le tabelle create
SELECT 
    schemaname,
    tablename,
    'Tabella email creata con successo' as status
FROM pg_tables 
WHERE tablename IN ('email_settings', 'email_templates')
ORDER BY tablename;

-- Mostra i template inseriti
SELECT type, subject FROM email_templates ORDER BY type;