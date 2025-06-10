#!/bin/bash
# Script per eseguire la migrazione dei nuovi campi ticket

set -e  # Exit on any error

echo "🚀 CRM Pro - Migrazione Database"
echo "=================================="

# Controlla se il file .env esiste
if [ ! -f .env ]; then
    echo "❌ File .env non trovato!"
    echo "📝 Copia .env.example in .env e configura le variabili Supabase"
    exit 1
fi

# Carica variabili d'ambiente
if command -v python3 &> /dev/null; then
    echo "🔗 Testando connessione Python..."
    
    # Prova lo script Python semplificato
    if python3 simple_migration.py; then
        echo "✅ Migrazione completata con successo tramite Python!"
        exit 0
    else
        echo "⚠️  Migrazione Python fallita, proviamo metodi alternativi..."
    fi
fi

# Metodo alternativo: curl diretto a Supabase
echo "🔄 Tentativo migrazione tramite curl..."

# Carica variabili da .env
source .env 2>/dev/null || true

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Variabili SUPABASE_URL o SUPABASE_ANON_KEY non configurate"
    echo "📝 Configura il file .env con le credenziali Supabase"
    exit 1
fi

echo "ℹ️  URL Supabase: $SUPABASE_URL"

# Test connessione
echo "🔍 Test connessione Supabase..."
response=$(curl -s -w "%{http_code}" -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    "$SUPABASE_URL/rest/v1/tickets?select=id&limit=1")

http_code="${response: -3}"
if [ "$http_code" != "200" ]; then
    echo "❌ Connessione Supabase fallita (HTTP $http_code)"
    echo "🔧 Verifica le credenziali nel file .env"
    exit 1
fi

echo "✅ Connessione Supabase OK"

# Istruzioni manuali
echo ""
echo "🛠️  MIGRAZIONE MANUALE RICHIESTA"
echo "================================="
echo ""
echo "Per completare la migrazione, esegui questi passi:"
echo ""
echo "1. 📝 Vai al SQL Editor di Supabase:"
echo "   → https://supabase.com/dashboard/project/[your-project]/sql"
echo ""
echo "2. 📋 Copia e incolla il contenuto del file:"
echo "   → migration_add_ticket_fields.sql"
echo ""
echo "3. ▶️  Clicca 'Run' per eseguire la migrazione"
echo ""
echo "4. ✅ Verifica che l'output mostri:"
echo "   → 'Migrazione completata con successo!'"
echo ""
echo "🎯 DOPO LA MIGRAZIONE:"
echo "• Il modal di modifica ticket mostrerà tutti i nuovi campi"
echo "• Potrai configurare le opzioni in /settings"
echo "• I campi saranno: Software, Gruppo, Tipo, Agente, Stato, Priorità"
echo "• Plus: Rapporto Danea, ID Assistenza, Password Teleassistenza, Numero Richiesta"
echo ""
echo "📞 In caso di problemi:"
echo "• Verifica le credenziali Supabase nel file .env"
echo "• Controlla i permessi del database"
echo "• Esegui lo script Python: python3 simple_migration.py"

# Backup del comando SQL per copia rapida
echo ""
echo "📄 ANTEPRIMA SQL DA ESEGUIRE:"
echo "=============================="
head -20 migration_add_ticket_fields.sql
echo "... (continua nel file migration_add_ticket_fields.sql)"
echo ""
echo "🔗 File completo: $(pwd)/migration_add_ticket_fields.sql"