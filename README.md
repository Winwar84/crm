# CRM Pro - Sistema di Gestione Ticket

Un sistema CRM completo per la gestione di ticket, clienti e agenti con funzionalità avanzate di modifica e configurazione.

## 🚀 Avvio Rapido con Docker

### Prerequisiti
- Docker e Docker Compose installati
- Account Supabase (opzionale, può usare PostgreSQL locale)

### Setup Iniziale

1. **Clona il repository e entra nella directory:**
```bash
cd crm
```

2. **Configura le variabili d'ambiente:**
```bash
cp .env.example .env
# Modifica .env con le tue configurazioni
```

3. **Avvia l'applicazione:**
```bash
make setup
```

L'applicazione sarà disponibile su http://localhost:8080

### Comandi Make Disponibili

```bash
make help              # Mostra tutti i comandi disponibili
make build             # Builda l'immagine Docker
make up                # Avvia tutti i servizi in produzione
make down              # Ferma tutti i servizi
make dev               # Avvia in modalità sviluppo
make logs              # Mostra i logs dell'applicazione
make shell             # Apre una shell nel container
make clean             # Rimuove container e immagini non utilizzati
make backup            # Crea backup del database
make migrate           # Esegue le migrazioni del database
```

## 🐳 Configurazioni Docker

### Docker Compose - Produzione
Il file `docker-compose.yml` include:
- **crm-app**: Applicazione Flask
- **crm-db**: Database PostgreSQL (opzionale)
- **crm-cache**: Redis per caching (opzionale)

### Docker Compose - Sviluppo
Il file `docker-compose.dev.yml` per sviluppo include:
- Hot reload del codice
- Debug abilitato
- Volumi per modifiche in tempo reale

## 📋 Funzionalità Principali

### ✅ Gestione Ticket Avanzata
- **Form di modifica completo** con layout a due colonne
- **Campi configurabili**: Software, Gruppo, Tipo, Agente, Stato, Priorità
- **Campi editabili**: Rapporto Danea, ID Assistenza, Password Teleassistenza, Numero Richiesta
- **Filtri e ricerca** avanzata

### ⚙️ Pagina Impostazioni
- Configurazione opzioni menu a tendina
- Gestione software, gruppi e tipi di ticket
- Impostazioni di sistema
- Interface admin per personalizzazione

### 🗄️ Database
- Schema ottimizzato con indici
- Tabelle di configurazione
- Sistema di migrazione
- Supporto PostgreSQL e Supabase

## 🔧 Configurazione

### Variabili d'Ambiente (.env)
```bash
# Supabase (se utilizzato)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT Security
JWT_SECRET=your-secret-key-change-in-production

# Database locale (se utilizzato)
DB_PASSWORD=your-secure-password

# App Configuration
FLASK_ENV=production
COMPANY_NAME=CRM Pro
```

### Database Setup

**Opzione 1 - Supabase (Consigliato):**
1. Crea progetto su https://supabase.com
2. Esegui `supabase_schema.sql` nel SQL Editor
3. Configura le variabili in `.env`

**Opzione 2 - PostgreSQL locale:**
```bash
make up  # Avvia tutto incluso PostgreSQL
```

## 🔐 Accesso Admin

**Credenziali predefinite:**
- Username: `winwar84`
- Password: `vncmtt84b`

## 📁 Struttura Progetto

```
crm/
├── app/
│   ├── templates/         # Template HTML
│   ├── static/           # CSS, JS, Assets
│   ├── app.py            # Applicazione Flask principale
│   └── database.py       # Logica database
├── docker-compose.yml    # Config produzione
├── docker-compose.dev.yml # Config sviluppo
├── Dockerfile           # Immagine applicazione
├── Makefile            # Comandi helper
├── requirements.txt    # Dipendenze Python
├── supabase_schema.sql # Schema database completo
└── migration_add_ticket_fields.sql # Migrazione campi ticket
```

## 🔄 Workflow di Sviluppo

1. **Sviluppo locale:**
```bash
make dev  # Avvia con hot reload
```

2. **Test modifiche:**
```bash
make logs  # Monitora i logs
```

3. **Deploy produzione:**
```bash
make build
make up
```

## 📦 Backup e Restore

**Backup automatico:**
```bash
make backup  # Crea backup in ./backups/
```

**Restore da backup:**
```bash
make restore BACKUP_FILE=./backups/backup_20231201_120000.sql
```

## 🚨 Troubleshooting

**Container non si avvia:**
```bash
make logs  # Controlla i logs
make clean && make build  # Rebuild pulito
```

**Database issues:**
```bash
make logs-db  # Logs database
make shell-db  # Accesso diretto DB
```

**Reset completo:**
```bash
make clean-all  # ⚠️ Rimuove TUTTI i dati
```

## 🔧 Personalizzazione

### Aggiungere nuovi campi ticket:
1. Modifica `supabase_schema.sql`
2. Aggiorna form in `templates/tickets.html`
3. Modifica logica in `static/js/tickets.js`
4. Esegui migrazione

### Modificare impostazioni:
- Accedi a `/settings` nell'applicazione
- Configura opzioni tramite interfaccia admin

## 📞 Supporto

Per problemi o domande:
1. Controlla i logs con `make logs`
2. Verifica la configurazione `.env`
3. Consulta la documentazione Supabase se utilizzato