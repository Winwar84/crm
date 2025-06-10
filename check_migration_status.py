#!/usr/bin/env python3
"""
Script per verificare lo stato della migrazione senza dipendenze esterne
"""

import os
import sys

def check_env_file():
    """Controlla la configurazione del file .env"""
    print("📋 Controllo configurazione...")
    
    if not os.path.exists('.env'):
        print("❌ File .env non trovato")
        print("📝 Copia .env.example in .env e configura le variabili")
        return False
    
    print("✅ File .env trovato")
    
    # Leggi le variabili principali
    env_vars = {}
    try:
        with open('.env', 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value
    except Exception as e:
        print(f"⚠️  Errore lettura .env: {e}")
        return False
    
    # Controlla variabili essenziali
    required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
    missing_vars = []
    
    for var in required_vars:
        if var not in env_vars or not env_vars[var] or env_vars[var] in ['', 'your-url-here', 'your-key-here']:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: configurato")
    
    if missing_vars:
        print(f"❌ Variabili mancanti o non configurate: {', '.join(missing_vars)}")
        return False
    
    return True

def check_files_exist():
    """Controlla che tutti i file necessari esistano"""
    print("\n📁 Controllo file necessari...")
    
    required_files = [
        'migration_add_ticket_fields.sql',
        'app/templates/tickets.html',
        'app/templates/settings.html',
        'app/static/js/tickets.js',
        'app/static/js/settings.js',
        'app/app.py'
    ]
    
    all_exist = True
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - MANCANTE!")
            all_exist = False
    
    return all_exist

def show_migration_instructions():
    """Mostra le istruzioni per la migrazione"""
    print("\n" + "=" * 60)
    print("🛠️  ISTRUZIONI PER LA MIGRAZIONE")
    print("=" * 60)
    
    print("\n📋 OPZIONI DISPONIBILI:")
    print("\n1️⃣  MIGRAZIONE AUTOMATICA (consigliata):")
    print("   bash migrate.sh")
    print("   → Tenta migrazione automatica e fornisce istruzioni")
    
    print("\n2️⃣  MIGRAZIONE MANUALE SUPABASE:")
    print("   • Vai su: https://supabase.com/dashboard")
    print("   • Apri il tuo progetto")
    print("   • Vai in SQL Editor")
    print("   • Copia e incolla il contenuto di: migration_add_ticket_fields.sql")
    print("   • Clicca 'Run'")
    
    print("\n3️⃣  MIGRAZIONE CON PYTHON (se hai dipendenze):")
    print("   pip install supabase python-dotenv")
    print("   python3 simple_migration.py")
    
    print("\n4️⃣  MIGRAZIONE CON DOCKER:")
    print("   make migrate-supabase")
    
    print("\n🎯 COSA FA LA MIGRAZIONE:")
    print("• Aggiunge 7 nuovi campi alla tabella tickets:")
    print("  - software, group, type (configurabili)")
    print("  - rapporto_danea, id_assistenza (editabili)")
    print("  - password_teleassistenza, numero_richiesta_teleassistenza (editabili)")
    print("• Crea tabelle di configurazione per i menu a tendina")
    print("• Popola le opzioni predefinite")
    
    print("\n✅ DOPO LA MIGRAZIONE:")
    print("• Il modal di modifica ticket mostrerà tutti i campi richiesti")
    print("• Potrai configurare le opzioni in /settings")
    print("• Tutti i menu a tendina saranno configurabili")

def show_current_implementation():
    """Mostra l'implementazione attuale"""
    print("\n" + "=" * 60)
    print("📋 IMPLEMENTAZIONE CORRENTE")
    print("=" * 60)
    
    print("\n✅ GIÀ IMPLEMENTATO:")
    print("• Modal di modifica ticket con layout a due colonne")
    print("• Tutti i campi richiesti nel form HTML")
    print("• JavaScript per gestire tutti i nuovi campi")
    print("• Pagina /settings per configurare le opzioni")
    print("• API endpoints per software, gruppi, tipi, sistema")
    print("• Schema database aggiornato")
    print("• CSS responsive per il nuovo layout")
    
    print("\n🔄 RIMANE DA FARE:")
    print("• Eseguire la migrazione del database")
    print("• Testare il modal con i nuovi campi")
    
    print("\n📄 FILE CHIAVE MODIFICATI:")
    files_info = [
        ("app/templates/tickets.html", "Modal modifica con tutti i campi"),
        ("app/templates/settings.html", "Pagina impostazioni"),
        ("app/static/js/tickets.js", "Logica JavaScript completa"),
        ("app/static/js/settings.js", "Gestione configurazioni"),
        ("app/app.py", "API endpoints aggiunti"),
        ("app/static/css/style.css", "Stili per layout a colonne")
    ]
    
    for file_path, description in files_info:
        if os.path.exists(file_path):
            print(f"✅ {file_path} - {description}")
        else:
            print(f"❌ {file_path} - MANCANTE!")

def main():
    """Funzione principale"""
    print("🔍 CRM Pro - Controllo Stato Migrazione")
    print("=" * 50)
    
    # Controlli
    env_ok = check_env_file()
    files_ok = check_files_exist()
    
    # Mostra stato
    print("\n📊 RIEPILOGO STATO:")
    print(f"• Configurazione .env: {'✅ OK' if env_ok else '❌ MANCANTE'}")
    print(f"• File implementazione: {'✅ OK' if files_ok else '❌ INCOMPLETI'}")
    
    if env_ok and files_ok:
        print("\n🎉 TUTTO PRONTO PER LA MIGRAZIONE!")
        show_migration_instructions()
    else:
        print("\n⚠️  CONFIGURAZIONE INCOMPLETA")
        if not env_ok:
            print("→ Configura prima il file .env")
        if not files_ok:
            print("→ Alcuni file di implementazione mancano")
    
    show_current_implementation()
    
    print("\n" + "=" * 60)
    print("💡 PROSSIMI PASSI:")
    print("1. Assicurati che .env sia configurato")
    print("2. Esegui: bash migrate.sh")
    print("3. Apri l'app e prova a modificare un ticket")
    print("4. Configura le opzioni in /settings")
    print("=" * 60)

if __name__ == "__main__":
    main()