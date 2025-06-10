-- Migrazione per aggiungere sistema di messaggi/conversazioni ai ticket
-- Questo crea una tabella per gestire le conversazioni chat-style nei ticket

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('agent', 'customer', 'system')),
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Note interne visibili solo agli agenti
    email_message_id VARCHAR(255), -- ID del messaggio email originale
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_type ON ticket_messages(sender_type);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_ticket_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_messages_updated_at
    BEFORE UPDATE ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_messages_updated_at();

-- Aggiorna la tabella tickets per tracking ultimo messaggio
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Trigger per aggiornare i contatori dei messaggi nella tabella tickets
CREATE OR REPLACE FUNCTION update_ticket_message_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tickets 
        SET 
            last_message_at = NEW.created_at,
            message_count = message_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.ticket_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tickets 
        SET 
            message_count = (
                SELECT COUNT(*) 
                FROM ticket_messages 
                WHERE ticket_id = OLD.ticket_id
            ),
            last_message_at = (
                SELECT MAX(created_at) 
                FROM ticket_messages 
                WHERE ticket_id = OLD.ticket_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.ticket_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_message_stats_trigger
    AFTER INSERT OR DELETE ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_message_stats();

-- Inserisci alcuni messaggi di esempio per testing (opzionale)
-- INSERT INTO ticket_messages (ticket_id, sender_type, sender_name, sender_email, message_text)
-- SELECT 
--     t.id,
--     'customer',
--     t.customer_name,
--     t.customer_email,
--     'Messaggio iniziale del ticket: ' || t.description
-- FROM tickets t 
-- WHERE NOT EXISTS (
--     SELECT 1 FROM ticket_messages tm WHERE tm.ticket_id = t.id
-- );