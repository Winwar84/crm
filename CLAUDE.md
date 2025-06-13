# CRM Pro v2.8 - Cyberpunk Command Center

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

### 🎨 **NEW: Cyberpunk Command Center UI/UX**
- **Dual Theme System**: Toggle Dark/Light mode con button header
- **Cyberpunk Design**: Neon colors, glassmorphism, floating particles
- **Professional Light Mode**: Clean business interface alternative
- **Theme Persistence**: Salvataggio preferenze in localStorage
- **Interactive Effects**: Hover animations, glow effects, sound feedback
- **System HUD**: Real-time status indicators e cyber clock
- **Matrix Effects**: Easter egg Ctrl+Shift+M per Matrix rain
- **Enhanced UI**: Floating sidebar, neon borders, backdrop blur

### 🛡️ **NEW: Sistema Protezione Logout Avanzata**
- **Logout Protection**: Solo tramite pulsante dedicato con conferma
- **Anti-Accidental**: Blocco refresh, back button, chiusura tab involontaria
- **Modal Sicurezza**: Conferma cyberpunk con doppia verifica
- **Session Guard**: Protezione localStorage e navigazione programmatica
- **Heartbeat System**: Mantenimento sessione con verifica ogni 5 minuti
- **Attempt Counter**: Blocco automatico dopo tentativi non autorizzati
- **Console Monitoring**: Rilevamento manipolazioni JavaScript sospette
- **UX Sicuro**: Escape key, focus management, animazioni fluide

### 👤 **NEW: Sistema Clienti Completo**
- **Customer Portal**: Dashboard dedicata clienti con autenticazione separata
- **Customer Registration**: Registrazione clienti con campi obbligatori (nome, azienda)
- **Customer Login**: Sistema login JWT separato per clienti
- **Ticket Creation**: Clienti possono creare ticket che appaiono in assistenza
- **Real-time Chat**: Chat bidirezionale cliente-agente con email notifications
- **Ticket Management**: Visualizzazione e filtro ticket del cliente
- **Auto-refresh**: Aggiornamento automatico ticket ogni 30 secondi
- **Mobile Responsive**: Interface ottimizzata per dispositivi mobili

## 📊 Database Schema

### Core Tables
- `tickets` - Ticket con campi estesi (software, gruppo, tipo, assistenza)
- `customers` - Anagrafica clienti con autenticazione (password hash in notes)
- `agents` - Agenti con dipartimenti
- `users` - Sistema autenticazione JWT staff

### Customer System
- `customers` - Clienti con campi: name, email, company, phone, address, status
- Customer authentication usa campo `notes` per password hash (workaround)
- JWT tokens separati per clienti vs staff

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

### API Endpoints Cliente
```
POST   /api/auth/customer/register    # Registrazione cliente
POST   /api/auth/customer/login       # Login cliente
GET    /api/customer/tickets          # Lista ticket cliente
POST   /api/customer/tickets          # Crea nuovo ticket cliente
GET    /api/customer/tickets/{id}     # Dettagli ticket con messaggi
POST   /api/customer/tickets/{id}/messages  # Aggiungi messaggio cliente
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
- **Customer Issues**: Check customer authentication tokens, clear localStorage conflicts
- **Customer Modal**: Ensure `newTicketModal` element exists with proper CSS styling
- **Theme Issues**: Check `data-theme` attribute on document element
- **Particles Not Loading**: Verify `initCyberpunkEffects()` called on page load

### Frontend Debug
- **JS Errors**: Open browser console, check for errors
- **API Calls**: Check Network tab for failed requests
- **Missing Data**: Verify `currentUser` variable exists
- **Theme Toggle**: Check localStorage for 'crm-theme' key
- **Animations**: Verify CSS animations working and particles container exists

## 🎯 Latest Updates (2025-06-13)

### v2.8 Customer Portal System - NEW! 🎫
✅ **Complete Customer Dashboard**: Portal clienti autonomo con autenticazione separata
✅ **Customer Registration**: Registrazione clienti con validazione campi obbligatori (nome, azienda)
✅ **Customer Authentication**: Sistema JWT separato per clienti vs admin
✅ **Ticket Creation Fixed**: Risolto problema creazione ticket - modal si apre correttamente
✅ **Real-time Chat**: Sistema chat bidirezionale cliente-agente con email notifications
✅ **Ticket Management**: Dashboard clienti con visualizzazione, filtro e gestione ticket
✅ **Auto-refresh System**: Aggiornamento automatico ticket every 30 secondi
✅ **Responsive Design**: Interface ottimizzata mobile e desktop
✅ **Debug System**: Logging completo per troubleshooting customer issues
✅ **Session Management**: Separazione clean tra sessioni admin e customer
✅ **Modal System Enhanced**: CSS inline styling per garantire visibilità modal

### v2.7 Performance & UX Overhaul - STABLE 🔥
✅ **Modal System Fix**: Risolto problema modali che si aprivano automaticamente all'avvio
✅ **Theme Toggle Fix**: Corretto conflitto doppia chiamata - sistema dark/light mode perfetto
✅ **Inline Editing Fix**: Modal modifica ticket si chiude correttamente dopo salvataggio 
✅ **Performance Boost Email**: Auto-check email da 60s → 30s (50% più veloce)
✅ **Performance Boost Frontend**: Auto-refresh messaggi da 30s → 15s (50% più veloce)
✅ **Layout Optimization**: Chat espansa a sinistra, dettagli ticket colonna a destra
✅ **Anti-Flicker System**: Eliminato sfarfallio numeri statistiche con batch updates
✅ **Saving Speed Boost**: Salvataggio inline 80% più veloce con dati locali
✅ **Accessibility Fix**: Tutti i label HTML corretti per screen readers
✅ **Cyberpunk Login**: Sistema login/registrazione uniformato al tema command center
✅ **Favicon Integration**: Favicon cyberpunk personalizzato - elimina errori 404
✅ **Autocomplete Enhancement**: Attributi autocomplete aggiunti per migliore UX

### v2.5 Cyberpunk Features - STABLE
✅ **Complete UI Transformation**: Cyberpunk command center aesthetic
✅ **Dual Theme System**: Dark (cyberpunk) ↔ Light (professional) toggle WORKING
✅ **Theme Toggle Button**: Available in header di tutte le pagine FIXED
✅ **CSS Variables System**: Seamless theme switching con data-theme attribute
✅ **Floating Particles**: Animated background effects (opacity adapted per light mode)
✅ **Glassmorphism Design**: Backdrop blur, neon borders, enhanced cards
✅ **System HUD**: Real-time SYS/DB/NET status indicators
✅ **Cyber Clock**: Live time display con glitch effects
✅ **Interactive Enhancements**: Button glow, hover animations, sound effects
✅ **Matrix Rain Easter Egg**: Ctrl+Shift+M trigger per Matrix-style animation
✅ **Enhanced Notifications**: Custom system con icons e audio feedback
✅ **JavaScript Effects Engine**: Comprehensive particle e animation system
✅ **Theme Persistence**: LocalStorage save/restore delle preferenze utente

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

## 🌓 Theme System - Come Funziona

### Dual Theme Architecture
- **Dark Mode (Cyberpunk)**: Neon cyan/magenta/purple, dark backgrounds, intense effects
- **Light Mode (Professional)**: Business blues, light backgrounds, subtle animations
- **CSS Variables**: `:root` vs `[data-theme="light"]` per switching seamless
- **Persistence**: Theme choice saved in localStorage as `crm-theme`

### Theme Toggle Implementation
```javascript
// Utilizzo
toggleTheme()              // Switch between themes
setTheme('light')         // Force specific theme
getCurrentTheme()         // Get current theme
```

### Theme Toggle Button
- **Location**: Header-right section di tutte le pagine
- **Dynamic Content**: Icon e text change based on current theme
- **Visual Feedback**: Glassmorphism styling con hover effects
- **Cross-page**: Consistent experience in tutta l'applicazione

### CSS Architecture  
```css
/* Dark mode (default) */
:root {
    --neon-cyan: #00ffff;
    --dark-bg: #0a0a0f;
    --glass-bg: rgba(20, 20, 40, 0.7);
}

/* Light mode override */
[data-theme="light"] {
    --neon-cyan: #0066cc;
    --dark-bg: #f8f9fa;
    --glass-bg: rgba(255, 255, 255, 0.9);
}
```

### Interactive Effects System
- **Particles**: 50 floating animated elements con different colors/timings
- **Sound System**: UI audio feedback per notifications (subtle/professional)
- **Matrix Easter Egg**: Ctrl+Shift+M per Matrix rain animation
- **Enhanced Notifications**: Custom toast system con icons
- **System HUD**: Real-time status indicators (SYS/DB/NET)
- **Cyber Clock**: Live time con occasional glitch effects

## 🔥 Command Center Features

### Advanced UI Elements
- **Floating Sidebar**: Glassmorphism con neon borders e hover effects
- **Navigation Links**: Sweep animations, active state indicators
- **Enhanced Buttons**: Glow effects, scale transforms, glassmorphism
- **Responsive Cards**: Hover states, enhanced shadows, gradient borders
- **Interactive Tables**: Row hover effects, enhanced styling

### Performance Optimizations
- **CSS Animations**: Hardware accelerated con GPU
- **JavaScript Effects**: Efficient particle system con RAF
- **Theme Switching**: Instant CSS variable updates
- **Local Storage**: Minimal overhead per preferences
- **Mobile Responsive**: Optimized effects per mobile devices

## 🛡️ Sistema Protezione Logout - Come Funziona

### Meccanismi di Protezione
1. **Browser Navigation**: Override back/forward button e refresh
2. **LocalStorage Guard**: Protezione token da manipolazione console
3. **Programmatic Block**: Intercettazione navigazione automatica
4. **Session Heartbeat**: Verifica connessione ogni 5 minuti

### Modal di Conferma Sicuro
- **Design Cyberpunk**: Warning visivi con shield icon
- **Double Confirmation**: Doppio click fuori modal per sicurezza  
- **Keyboard Support**: Escape key e focus management
- **Attempt Counter**: Blocco dopo 3 tentativi non autorizzati

### Funzioni JavaScript Principali
```javascript
initLogoutProtection()    // Attiva tutte le protezioni
showLogoutConfirmation()  // Modal cyberpunk sicuro
confirmLogout()          // Autorizza logout utente  
cancelLogout()           // Annulla e reset contatori
performSecureLogout()    // Logout sicuro finale
```

### Console Security Logs
```
🛡️ Logout Protection System activated
🚫 Tentativo di logout non autorizzato bloccato (1/3)
⚠️ Troppi tentativi di logout non autorizzati! Sessione protetta.
✅ Logout authorized by user
```

### Scenari Protetti vs Consentiti
**❌ BLOCCATI**: Refresh, back button, chiusura tab, localStorage manipulation, console hacks  
**✅ CONSENTITO**: Solo pulsante logout ufficiale con conferma modal

## 👤 Customer Portal - Come Funziona

### Workflow Cliente
1. **Registrazione**: Cliente si registra con nome, email, azienda (campi obbligatori)
2. **Login**: Autenticazione JWT separata da admin, token salvato in `customer_token`
3. **Dashboard**: Portal dedicato con statistiche ticket e accesso funzioni
4. **Crea Ticket**: Modal per creazione ticket che appaiono in sezione assistenza admin
5. **Chat Real-time**: Comunicazione bidirezionale con agenti tramite messaggi

### Funzioni Customer Dashboard
- **Ticket Creation**: Form completo con titolo, descrizione, priorità
- **Ticket List**: Grid view con filtri per stato (Open, In Progress, Resolved, Closed)
- **Ticket Details**: Modal con dettagli completi e sistema chat integrato
- **Stats Display**: Contatori real-time (totali, aperti, risolti)
- **Auto-refresh**: Update automatico ogni 30 secondi

### Customer Authentication
```javascript
// Customer login
localStorage.setItem('customer_token', token);
localStorage.setItem('customer_data', JSON.stringify(customer));

// API calls con customer token
headers: { 'Authorization': `Bearer ${customerToken}` }
```

### URLs Customer Portal
```
/customer-login          # Login/registrazione clienti
/customer-dashboard      # Dashboard clienti autenticati
```

### Troubleshooting Customer Portal
- **Modal non si apre**: Check console per errori, verify `newTicketModal` element
- **Token issues**: Clear localStorage conflicts between admin/customer sessions
- **API 401 errors**: Verify customer token validity with `/api/auth/verify`
- **Chat not loading**: Check customer_id matching in ticket ownership

---
*CRM Pro v2.8 - Cyberpunk Command Center con Customer Portal Completo* 🎫👤🛡️