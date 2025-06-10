# CRM Pro v2.2 - Sistema Chat Ticket

## 🚀 Quick Start
```bash
docker-compose up -d  # Start sistema
# URL: http://localhost:8080
# Login: winwar84 / vncmtt84b
```

## 🛠️ Development
```bash
# Update file in container
docker cp app/file.py crm-pro:/app/app/file.py

# Check logs
docker logs crm-pro --tail=20

# Restart if needed
docker restart crm-pro
```

## ✅ Features Complete

### 🎫 Sistema Ticket
- **CRUD Completo**: Creazione, modifica, visualizzazione, eliminazione
- **Modals**: Fullscreen per edit, hybrid layout per details  
- **Layout Fixes**: Form containers corretti, sezioni non escono più dai riquadri
- **Campi Avanzati**: Software, Gruppo, Tipo, Assistenza Danea
- **Assegnazione**: Agenti con default utente corrente
- **Dashboard Consistency**: Form nuovo ticket identico tra dashboard e tickets page

### 💬 **NEW: Sistema Chat**
- **Chat Integrata**: Conversazione bidirezionale nel modal ticket
- **Email Unidirezionale**: Solo risposte agenti inviano email, clienti solo chat
- **Template Puliti**: Email senza "Messaggio:" e testo automatico sistema
- **Auto-refresh Veloce**: Aggiornamento messaggi ogni 5 secondi  
- **Note Interne**: Messaggi visibili solo agli agenti (no email)
- **Smart Email**: Risposte email automatiche nei ticket esistenti

### 👥 Gestione Entità
- **Agenti**: Cards responsive, dipartimenti, statistiche
- **Clienti**: Tabella completa, filtri, anagrafica, modal unificato tra dashboard e gestione
- **Utenti**: Admin dashboard, approvazione account

### 📧 Sistema Email Avanzato
- **SMTP/IMAP**: Configurazione completa nelle impostazioni con MCP Supabase
- **Auto-Ticket**: Email→Ticket automatico
- **Template**: Email personalizzabili
- **Monitor**: Controllo automatico casella email
- **Persistenza**: Configurazioni email salvate permanentemente via MCP

### 🎨 UI/UX
- **Responsive**: Mobile-first design
- **Layout Ibrido**: Main content + sidebar 300px per ticket details
- **Stili Modern**: Gradient, cards, animazioni
- **Dark Theme**: Supporto preferenze utente

## 📊 Database Schema

### Core Tables
- `tickets` - Ticket con campi estesi (software, gruppo, tipo, assistenza)
- `customers` - Anagrafica clienti
- `agents` - Agenti con dipartimenti
- `users` - Sistema autenticazione JWT

### Chat System
- `ticket_messages` - Messaggi conversazione ticket
- `email_settings` - Configurazioni SMTP/IMAP
- `email_templates` - Template email personalizzabili

### Configuration
- `ticket_*_options` - Opzioni configurabili (software, gruppi, tipi)
- `system_settings` - Configurazioni generali
- `email_settings` - Configurazioni SMTP/IMAP via MCP Supabase

## 🔧 Sistema Chat - Come Funziona

### Workflow Conversazione
1. **Agente scrive messaggio** → Salvato DB → Email automatica al cliente
2. **Cliente risponde via email** → Sistema riconosce `Re: Ticket #X` → Messaggio in chat
3. **Note interne** → Solo agenti, no email
4. **Notifiche** → Agenti ricevono email per nuovi messaggi cliente

### API Endpoints Chat
```
GET    /api/tickets/{id}/messages     # Lista messaggi
POST   /api/tickets/{id}/messages     # Nuovo messaggio
PUT    /api/tickets/{id}/messages/{msgId}  # Modifica messaggio
DELETE /api/tickets/{id}/messages/{msgId}  # Elimina messaggio
```

### Interfaccia Chat
- **Header**: Gradient blu con controlli refresh
- **Messaggi**: Bubble chat (blu=agenti, viola=clienti, arancio=interni)
- **Input**: Textarea con checkbox "nota interna"
- **Auto-scroll**: Sempre ai messaggi più recenti

## 🔍 Troubleshooting

### Container Issues
```bash
docker ps                           # Check status
docker logs crm-pro --tail=50      # Check errors
docker restart crm-pro             # Restart if needed
```

### Common Fixes
- **Import Error**: Use `from database import` (not `from .database`)
- **Modal Issues**: Check `calc(100vw - 250px)` width calculations
- **Chat Not Loading**: Verify `ticketMainContent` and `loadTicketMessages()` 
- **Email Issues**: Check SMTP/IMAP config in settings
- **MCP Email**: Use `task_helper.py` for email settings operations
- **Password Save**: Email passwords now persist via MCP Supabase

### Frontend Debug
- **JS Errors**: Open browser console, check for errors
- **API Calls**: Check Network tab for failed requests
- **Missing Data**: Verify `currentUser` variable exists

## 🎯 Latest Updates (2025-06-10)

### v2.4 Features
✅ **UI Layout Fixes**: Risolti problemi layout form che escono dai contenitori
✅ **Dashboard Consistency**: Form nuovo ticket dashboard ora identico a tickets page  
✅ **Customer Modal**: Dashboard nuovo cliente ora usa stesso modal di gestione clienti
✅ **Edit Ticket Fix**: Modal modifica ticket con layout corretto e sezioni bilanciate
✅ **Email Template Clean**: Template email puliti senza "Messaggio:" e testo automatico
✅ **Email Flow Fix**: Solo risposte agenti inviano email, cliente solo chat
✅ **Auto-refresh Speed**: Chat messages aggiornamento ogni 5 secondi

### v2.3 Features  
✅ **MCP Integration**: Sistema completamente integrato con MCP Supabase
✅ **Email Config Fix**: Risolto problema salvataggio configurazioni SMTP/IMAP
✅ **Password Persistence**: Password email ora persistono correttamente
✅ **Task Helper**: Implementato helper MCP per database operations

### v2.2 Features
✅ **Chat System**: Complete ticket conversation system
✅ **Email Integration**: Bidirectional email↔chat sync  
✅ **Inline Editing**: Edit ticket details directly in sidebar
✅ **Smart Email Parser**: Auto-detect ticket replies
✅ **Internal Notes**: Agent-only messages
✅ **Real-time UI**: Auto-refresh, loading states

### Performance
- **Database**: Optimized with indexes on ticket_messages
- **Frontend**: Efficient message loading with pagination
- **Email**: Background processing with monitor thread
- **Responsive**: Mobile-optimized chat interface

## 📱 Mobile Support
- **Layout**: Stacked modals on mobile (<768px)
- **Chat**: Scrollable messages, touch-friendly inputs
- **Navigation**: Collapsible sidebar
- **Performance**: Optimized for mobile networks

## 🔐 Security
- **JWT Authentication**: Secure API access
- **Email Validation**: Prevent spam/injection
- **Input Sanitization**: XSS protection
- **Role-based Access**: Admin/operator/supervisor roles

## 🔧 Architettura MCP

### MCP Supabase Integration
- **task_helper.py**: Helper per operazioni database via MCP
- **email_service.py**: Usa MCP per configurazioni SMTP/IMAP  
- **Fallback Safety**: Sistema di fallback per garantire operatività
- **Upsert Logic**: Gestione intelligente insert/update configurazioni

### MCP Operations
```python
# Salvataggio via MCP
from task_helper import save_to_supabase
result = save_to_supabase('email_settings', data, on_conflict='type')

# Recupero via MCP  
from task_helper import get_from_supabase
config = get_from_supabase('email_settings', {'type': 'smtp'})
```

---
*Sistema completamente funzionale con chat integrata e MCP Supabase per gestione ticket professionale*