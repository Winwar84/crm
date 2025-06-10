-- Tabelle per la configurazione email

-- Tabella per le impostazioni email (SMTP e IMAP)
CREATE TABLE IF NOT EXISTS email_settings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('smtp', 'imap')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unica configurazione per tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_settings_type ON email_settings(type);

-- Tabella per i template email
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template predefiniti
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
ON CONFLICT (type) DO NOTHING;

-- Aggiorna timestamp su modifica
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per email_settings
DROP TRIGGER IF EXISTS update_email_settings_updated_at ON email_settings;
CREATE TRIGGER update_email_settings_updated_at 
    BEFORE UPDATE ON email_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per email_templates
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();