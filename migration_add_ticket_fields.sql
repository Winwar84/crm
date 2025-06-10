-- Script di migrazione per aggiungere i nuovi campi ai ticket esistenti
-- Esegui questo script se hai già un database esistente

-- Aggiungi i nuovi campi alla tabella tickets se non esistono già
DO $$ 
BEGIN
    -- Aggiungi campo software
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='software') THEN
        ALTER TABLE tickets ADD COLUMN software TEXT;
    END IF;
    
    -- Aggiungi campo group (usando virgolette perché "group" è una parola riservata)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='group') THEN
        ALTER TABLE tickets ADD COLUMN "group" TEXT;
    END IF;
    
    -- Aggiungi campo type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='type') THEN
        ALTER TABLE tickets ADD COLUMN type TEXT;
    END IF;
    
    -- Aggiungi campo rapporto_danea
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='rapporto_danea') THEN
        ALTER TABLE tickets ADD COLUMN rapporto_danea TEXT;
    END IF;
    
    -- Aggiungi campo id_assistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='id_assistenza') THEN
        ALTER TABLE tickets ADD COLUMN id_assistenza TEXT;
    END IF;
    
    -- Aggiungi campo password_teleassistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='password_teleassistenza') THEN
        ALTER TABLE tickets ADD COLUMN password_teleassistenza TEXT;
    END IF;
    
    -- Aggiungi campo numero_richiesta_teleassistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='numero_richiesta_teleassistenza') THEN
        ALTER TABLE tickets ADD COLUMN numero_richiesta_teleassistenza TEXT;
    END IF;
END $$;

-- Crea le tabelle di configurazione se non esistono
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

CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci le opzioni predefinite (solo se non esistono già)
INSERT INTO ticket_software_options (value, label) VALUES
    ('danea-easyfatt', 'Danea EasyFatt'),
    ('danea-clienti', 'Danea Clienti'),
    ('gestionale-custom', 'Gestionale Custom'),
    ('altro', 'Altro')
ON CONFLICT (value) DO NOTHING;

INSERT INTO ticket_group_options (value, label) VALUES
    ('supporto-tecnico', 'Supporto Tecnico'),
    ('assistenza-commerciale', 'Assistenza Commerciale'),
    ('amministrazione', 'Amministrazione'),
    ('sviluppo', 'Sviluppo')
ON CONFLICT (value) DO NOTHING;

INSERT INTO ticket_type_options (value, label) VALUES
    ('problema-tecnico', 'Problema Tecnico'),
    ('richiesta-informazioni', 'Richiesta Informazioni'),
    ('installazione', 'Installazione'),
    ('configurazione', 'Configurazione'),
    ('formazione', 'Formazione'),
    ('teleassistenza', 'Teleassistenza')
ON CONFLICT (value) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
    ('company_name', 'CRM Pro', 'Nome dell''azienda'),
    ('default_priority', 'Medium', 'Priorità predefinita per i nuovi ticket'),
    ('auto_assign', 'false', 'Assegnazione automatica dei ticket')
ON CONFLICT (key) DO NOTHING;

-- Aggiungi nuovi indici
CREATE INDEX IF NOT EXISTS idx_tickets_software ON tickets(software);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets("group");
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_software_options_active ON ticket_software_options(is_active);
CREATE INDEX IF NOT EXISTS idx_group_options_active ON ticket_group_options(is_active);
CREATE INDEX IF NOT EXISTS idx_type_options_active ON ticket_type_options(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Abilita RLS per le nuove tabelle (se già non abilitato)
DO $$
BEGIN
    BEGIN
        ALTER TABLE ticket_software_options ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE ticket_group_options ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE ticket_type_options ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Crea le policy per le nuove tabelle (se non esistono già)
DO $$
BEGIN
    BEGIN
        CREATE POLICY "Allow all operations on ticket_software_options" ON ticket_software_options FOR ALL TO anon USING (true);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        CREATE POLICY "Allow all operations on ticket_group_options" ON ticket_group_options FOR ALL TO anon USING (true);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        CREATE POLICY "Allow all operations on ticket_type_options" ON ticket_type_options FOR ALL TO anon USING (true);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL TO anon USING (true);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Messaggio di completamento
SELECT 'Migrazione completata con successo! I nuovi campi sono stati aggiunti ai ticket.' as status;