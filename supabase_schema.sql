-- Script SQL per creare le tabelle in Supabase
-- Esegui questo script nel SQL Editor di Supabase

-- Tabella Utenti per autenticazione
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'operator',
    status TEXT DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci l'admin predefinito winwar84
INSERT INTO users (username, email, password_hash, full_name, role, status, is_active) 
VALUES (
    'winwar84', 
    'winwar84@admin.local', 
    '$2b$12$6Ztdg7ogC9Mux4tUrjwWVe.fl/hyVUhyGDlJgAPSioKCZ62kmcBDS', 
    'Administrator', 
    'admin', 
    'approved', 
    true
) ON CONFLICT (username) DO NOTHING;

-- Tabella Agenti
CREATE TABLE IF NOT EXISTS agents (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Clienti
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Ticket
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    customer_id BIGINT REFERENCES customers(id),
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    assigned_to TEXT,
    -- Nuovi campi per la gestione avanzata dei ticket
    software TEXT,
    "group" TEXT,
    type TEXT,
    rapporto_danea TEXT,
    id_assistenza TEXT,
    password_teleassistenza TEXT,
    numero_richiesta_teleassistenza TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Commenti (opzionale per future estensioni)
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle per le configurazioni dei menu a tendina
CREATE TABLE IF NOT EXISTS ticket_software_options (
    id BIGSERIAL PRIMARY KEY,
    value TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_group_options (
    id BIGSERIAL PRIMARY KEY,
    value TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_type_options (
    id BIGSERIAL PRIMARY KEY,
    value TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per le impostazioni di sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci le opzioni predefinite per i software
INSERT INTO ticket_software_options (value, label) VALUES
    ('danea-easyfatt', 'Danea EasyFatt'),
    ('danea-clienti', 'Danea Clienti'),
    ('gestionale-custom', 'Gestionale Custom'),
    ('altro', 'Altro')
ON CONFLICT (value) DO NOTHING;

-- Inserisci le opzioni predefinite per i gruppi
INSERT INTO ticket_group_options (value, label) VALUES
    ('supporto-tecnico', 'Supporto Tecnico'),
    ('assistenza-commerciale', 'Assistenza Commerciale'),
    ('amministrazione', 'Amministrazione'),
    ('sviluppo', 'Sviluppo')
ON CONFLICT (value) DO NOTHING;

-- Inserisci le opzioni predefinite per i tipi
INSERT INTO ticket_type_options (value, label) VALUES
    ('problema-tecnico', 'Problema Tecnico'),
    ('richiesta-informazioni', 'Richiesta Informazioni'),
    ('installazione', 'Installazione'),
    ('configurazione', 'Configurazione'),
    ('formazione', 'Formazione'),
    ('teleassistenza', 'Teleassistenza')
ON CONFLICT (value) DO NOTHING;

-- Inserisci le impostazioni di sistema predefinite
INSERT INTO system_settings (key, value, description) VALUES
    ('company_name', 'CRM Pro', 'Nome dell''azienda'),
    ('default_priority', 'Medium', 'Priorità predefinita per i nuovi ticket'),
    ('auto_assign', 'false', 'Assegnazione automatica dei ticket')
ON CONFLICT (key) DO NOTHING;

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_software ON tickets(software);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets("group");
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_software_options_active ON ticket_software_options(is_active);
CREATE INDEX IF NOT EXISTS idx_group_options_active ON ticket_group_options(is_active);
CREATE INDEX IF NOT EXISTS idx_type_options_active ON ticket_type_options(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applica il trigger alle tabelle che hanno updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - opzionale per sicurezza
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_software_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_group_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_type_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni (da personalizzare in produzione)
CREATE POLICY "Allow all operations on users" ON users FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on agents" ON agents FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on tickets" ON tickets FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on comments" ON comments FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on ticket_software_options" ON ticket_software_options FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on ticket_group_options" ON ticket_group_options FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on ticket_type_options" ON ticket_type_options FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL TO anon USING (true);