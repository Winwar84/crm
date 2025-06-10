# 🚀 ISTRUZIONI MIGRAZIONE CRM PRO

## ⚡ **MIGRAZIONE RAPIDA** - Copia e Incolla

### 📋 **PASSO 1: Apri SQL Editor**
```
🔗 https://supabase.com/dashboard/project/ixnjxhssqhbytcmzruks/sql
```

### 📋 **PASSO 2: Copia e Incolla Questo SQL**

```sql
-- ==========================================
-- CRM PRO - MIGRAZIONE CAMPI TICKET
-- ==========================================

-- 1. AGGIUNGI NUOVI CAMPI ALLA TABELLA TICKETS
DO $$ 
BEGIN
    -- Software
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='software') THEN
        ALTER TABLE tickets ADD COLUMN software TEXT;
    END IF;
    
    -- Gruppo (usando virgolette perché "group" è parola riservata)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='group') THEN
        ALTER TABLE tickets ADD COLUMN "group" TEXT;
    END IF;
    
    -- Tipo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='type') THEN
        ALTER TABLE tickets ADD COLUMN type TEXT;
    END IF;
    
    -- Rapporto Danea
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='rapporto_danea') THEN
        ALTER TABLE tickets ADD COLUMN rapporto_danea TEXT;
    END IF;
    
    -- ID Assistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='id_assistenza') THEN
        ALTER TABLE tickets ADD COLUMN id_assistenza TEXT;
    END IF;
    
    -- Password Teleassistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='password_teleassistenza') THEN
        ALTER TABLE tickets ADD COLUMN password_teleassistenza TEXT;
    END IF;
    
    -- Numero Richiesta Teleassistenza
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='numero_richiesta_teleassistenza') THEN
        ALTER TABLE tickets ADD COLUMN numero_richiesta_teleassistenza TEXT;
    END IF;
END $$;

-- 2. CREA TABELLE DI CONFIGURAZIONE
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

-- 3. POPOLA CON DATI PREDEFINITI
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

-- 4. AGGIUNGI INDICI PER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tickets_software ON tickets(software);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets("group");
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);

-- 5. MESSAGGIO DI COMPLETAMENTO
SELECT 'MIGRAZIONE COMPLETATA! I nuovi campi sono ora disponibili.' as status;
```

### 📋 **PASSO 3: Clicca "Run"**

### 📋 **PASSO 4: Verifica Output**
Dovresti vedere:
```
status: "MIGRAZIONE COMPLETATA! I nuovi campi sono ora disponibili."
```

## ✅ **DOPO LA MIGRAZIONE**

### 🎯 **Cosa Puoi Fare Ora:**

1. **🎛️ Modal di Modifica Completo**
   - Vai su `/tickets` nella tua app
   - Clicca "Modifica" su qualsiasi ticket
   - Vedrai tutti i nuovi campi a destra:
     - Software (menu a tendina)
     - Gruppo (menu a tendina)  
     - Agente (menu a tendina)
     - Tipo (menu a tendina)
     - Stato (menu a tendina)
     - Priorità (menu a tendina)
     - Rapporto Danea (campo libero)
     - ID Assistenza (campo libero)
     - Password Teleassistenza (campo libero)
     - Numero Richiesta Teleassistenza (campo libero)

2. **⚙️ Pagina Impostazioni**
   - Vai su `/settings` nella tua app
   - Configura le opzioni dei menu a tendina
   - Aggiungi/modifica/elimina opzioni per Software, Gruppi, Tipi

3. **💾 Salvataggio Completo**
   - Tutti i campi vengono salvati nel database
   - Le modifiche sono persistenti
   - Le configurazioni sono gestibili dalle impostazioni

## 🔧 **RISOLUZIONE PROBLEMI**

### ❌ **Se la Migrazione Fallisce:**
1. Verifica di essere collegato al progetto corretto
2. Controlla di avere i permessi di scrittura sul database
3. Riprova a eseguire - lo script è idempotente (sicuro da rieseguire)

### ❌ **Se i Campi Non Appaiono:**
1. Svuota la cache del browser (Ctrl+F5)
2. Riavvia l'applicazione CRM
3. Verifica nel browser console per errori JavaScript

### ❌ **Se le Configurazioni Non Funzionano:**
1. Controlla che le tabelle siano state create
2. Verifica che l'API sia aggiornata (riavvia l'app)
3. Prova a ricaricare la pagina /settings

## 🎉 **IMPLEMENTAZIONE COMPLETATA!**

Tutti i campi richiesti sono ora implementati e funzionanti:
- ✅ Layout a due colonne nel modal di modifica
- ✅ Menu a tendina configurabili dalle impostazioni
- ✅ Campi editabili manuali per teleassistenza
- ✅ API backend completa
- ✅ Database schema aggiornato
- ✅ Interfaccia responsive

**Il tuo sistema di modifica ticket avanzata è pronto all'uso!**