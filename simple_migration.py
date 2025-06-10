#!/usr/bin/env python3
"""
Script semplificato per la migrazione - usa solo operazioni REST di Supabase
"""

import os
import sys
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Errore: supabase library non installata")
    print("Installa con: pip install supabase")
    sys.exit(1)

# Configurazione Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Errore: Variabili d'ambiente mancanti")
    print("Configura SUPABASE_URL e SUPABASE_ANON_KEY nel file .env")
    print("Usa .env.example come template")
    sys.exit(1)

# Crea client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def populate_configuration_tables():
    """Popola le tabelle di configurazione con dati predefiniti"""
    print("🔄 Popolamento tabelle di configurazione...")
    
    # Dati predefiniti
    config_data = {
        'ticket_software_options': [
            {'value': 'danea-easyfatt', 'label': 'Danea EasyFatt', 'is_active': True},
            {'value': 'danea-clienti', 'label': 'Danea Clienti', 'is_active': True},
            {'value': 'gestionale-custom', 'label': 'Gestionale Custom', 'is_active': True},
            {'value': 'altro', 'label': 'Altro', 'is_active': True}
        ],
        'ticket_group_options': [
            {'value': 'supporto-tecnico', 'label': 'Supporto Tecnico', 'is_active': True},
            {'value': 'assistenza-commerciale', 'label': 'Assistenza Commerciale', 'is_active': True},
            {'value': 'amministrazione', 'label': 'Amministrazione', 'is_active': True},
            {'value': 'sviluppo', 'label': 'Sviluppo', 'is_active': True}
        ],
        'ticket_type_options': [
            {'value': 'problema-tecnico', 'label': 'Problema Tecnico', 'is_active': True},
            {'value': 'richiesta-informazioni', 'label': 'Richiesta Informazioni', 'is_active': True},
            {'value': 'installazione', 'label': 'Installazione', 'is_active': True},
            {'value': 'configurazione', 'label': 'Configurazione', 'is_active': True},
            {'value': 'formazione', 'label': 'Formazione', 'is_active': True},
            {'value': 'teleassistenza', 'label': 'Teleassistenza', 'is_active': True}
        ],
        'system_settings': [
            {'key': 'company_name', 'value': 'CRM Pro', 'description': 'Nome dell\'azienda'},
            {'key': 'default_priority', 'value': 'Medium', 'description': 'Priorità predefinita per i nuovi ticket'},
            {'key': 'auto_assign', 'value': 'false', 'description': 'Assegnazione automatica dei ticket'}
        ]
    }
    
    success_count = 0
    total_count = 0
    
    for table_name, items in config_data.items():
        print(f"\n📝 Popolamento {table_name}...")
        
        for item in items:
            total_count += 1
            try:
                # Usa upsert per evitare errori di duplicazione
                result = supabase.table(table_name).upsert(item).execute()
                print(f"  ✅ {item.get('label', item.get('key', 'Item'))} inserito")
                success_count += 1
            except Exception as e:
                print(f"  ⚠️  Errore con {item.get('label', item.get('key', 'Item'))}: {e}")
    
    print(f"\n📊 Risultato: {success_count}/{total_count} elementi inseriti con successo")
    return success_count > 0

def test_configuration_access():
    """Testa l'accesso alle configurazioni"""
    print("\n🔍 Test accesso alle configurazioni...")
    
    test_results = {}
    
    tables_to_test = [
        'ticket_software_options',
        'ticket_group_options', 
        'ticket_type_options',
        'system_settings'
    ]
    
    for table_name in tables_to_test:
        try:
            result = supabase.table(table_name).select('*').execute()
            count = len(result.data)
            test_results[table_name] = count
            print(f"  ✅ {table_name}: {count} elementi trovati")
        except Exception as e:
            test_results[table_name] = f"Errore: {e}"
            print(f"  ❌ {table_name}: {e}")
    
    return test_results

def update_existing_ticket_for_test():
    """Aggiorna un ticket esistente con i nuovi campi per testare"""
    print("\n🧪 Test aggiornamento ticket con nuovi campi...")
    
    try:
        # Prendi il primo ticket disponibile
        tickets = supabase.table('tickets').select('id').limit(1).execute()
        
        if not tickets.data:
            print("  ℹ️  Nessun ticket esistente trovato per il test")
            return False
        
        ticket_id = tickets.data[0]['id']
        
        # Prova ad aggiornare con i nuovi campi
        test_data = {
            'software': 'danea-easyfatt',
            'group': 'supporto-tecnico',
            'type': 'problema-tecnico',
            'rapporto_danea': 'TEST-001',
            'id_assistenza': 'ASS-TEST',
            'password_teleassistenza': 'TEMP123',
            'numero_richiesta_teleassistenza': 'REQ-TEST'
        }
        
        result = supabase.table('tickets').update(test_data).eq('id', ticket_id).execute()
        
        if result.data:
            print(f"  ✅ Ticket #{ticket_id} aggiornato con successo con i nuovi campi!")
            return True
        else:
            print("  ⚠️  Aggiornamento ticket non riuscito")
            return False
            
    except Exception as e:
        print(f"  ⚠️  Errore nel test aggiornamento: {e}")
        
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
            print("  📝 I nuovi campi non sono ancora stati aggiunti alla tabella tickets")
            print("  💡 Esegui lo script migration_add_ticket_fields.sql nel SQL Editor di Supabase")
            return False
        
        return False

def main():
    """Funzione principale"""
    print("🚀 CRM Pro - Setup Configurazioni")
    print("=" * 50)
    
    try:
        # Test connessione
        print("🔗 Test connessione Supabase...")
        supabase.table('tickets').select('id').limit(1).execute()
        print("✅ Connessione Supabase OK")
        
        # Popola le tabelle di configurazione
        if populate_configuration_tables():
            print("✅ Configurazioni popolate con successo")
        
        # Testa l'accesso
        test_results = test_configuration_access()
        
        # Test aggiornamento ticket
        ticket_test_ok = update_existing_ticket_for_test()
        
        print("\n" + "=" * 50)
        print("📋 RIEPILOGO MIGRAZIONE")
        print("=" * 50)
        
        # Mostra risultati
        all_tables_ok = all(isinstance(count, int) and count > 0 for count in test_results.values())
        
        if all_tables_ok:
            print("✅ Tabelle di configurazione: OK")
            for table, count in test_results.items():
                print(f"   - {table}: {count} elementi")
        else:
            print("⚠️  Alcune tabelle di configurazione hanno problemi:")
            for table, result in test_results.items():
                if isinstance(result, int):
                    print(f"   ✅ {table}: {result} elementi")
                else:
                    print(f"   ❌ {table}: {result}")
        
        if ticket_test_ok:
            print("✅ Nuovi campi ticket: FUNZIONANTI")
            print("🎉 Il modal di modifica ticket dovrebbe mostrare tutti i nuovi campi!")
        else:
            print("❌ Nuovi campi ticket: NON FUNZIONANTI")
            print("📝 AZIONE RICHIESTA:")
            print("   1. Vai nel SQL Editor di Supabase")
            print("   2. Esegui il contenuto del file migration_add_ticket_fields.sql")
            print("   3. Riavvia questo script per verificare")
        
        print("\n💡 PASSI SUCCESSIVI:")
        print("   1. Apri l'applicazione CRM")
        print("   2. Vai nella pagina /settings per configurare le opzioni")
        print("   3. Prova a modificare un ticket per vedere i nuovi campi")
        
    except Exception as e:
        print(f"❌ Errore durante il setup: {e}")
        print("\n🔧 SUGGERIMENTI:")
        print("1. Verifica le variabili d'ambiente nel file .env")
        print("2. Controlla i permessi del database Supabase")
        print("3. Assicurati che le tabelle base esistano già")
        sys.exit(1)

if __name__ == "__main__":
    main()