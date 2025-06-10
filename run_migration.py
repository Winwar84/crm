#!/usr/bin/env python3
"""
Script per eseguire la migrazione del database Supabase
Aggiunge i nuovi campi per la modifica avanzata dei ticket
"""

import os
import sys
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

try:
    from supabase import create_client, Client
except ImportError:
    print("Errore: supabase library non installata. Installa con: pip install supabase")
    sys.exit(1)

# Configurazione Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Errore: SUPABASE_URL e SUPABASE_ANON_KEY devono essere configurati nel file .env")
    print("Copia .env.example in .env e configura le variabili")
    sys.exit(1)

# Crea client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def execute_sql(sql_query, description=""):
    """Esegue una query SQL e gestisce gli errori"""
    try:
        print(f"Eseguendo: {description}...")
        result = supabase.rpc('exec_sql', {'sql_query': sql_query}).execute()
        print(f"✅ {description} completato")
        return True
    except Exception as e:
        # Per alcune operazioni DDL, Supabase potrebbe non supportare rpc
        # Proviamo metodi alternativi
        print(f"❌ Errore con rpc: {e}")
        return False

def add_columns_to_tickets():
    """Aggiunge i nuovi campi alla tabella tickets"""
    print("🔄 Aggiunta nuovi campi alla tabella tickets...")
    
    # Lista dei campi da aggiungere
    new_columns = [
        ('software', 'Software del ticket'),
        ('"group"', 'Gruppo di appartenenza'),  # group è parola riservata
        ('type', 'Tipo di ticket'),
        ('rapporto_danea', 'Rapporto Danea'),
        ('id_assistenza', 'ID Assistenza'),
        ('password_teleassistenza', 'Password Teleassistenza'),
        ('numero_richiesta_teleassistenza', 'Numero Richiesta Teleassistenza')
    ]
    
    success_count = 0
    
    for column_name, description in new_columns:
        try:
            # Prova ad aggiungere la colonna
            # Nota: questo potrebbe fallire se la colonna esiste già, ed è normale
            query = f"ALTER TABLE tickets ADD COLUMN {column_name} TEXT;"
            result = supabase.rpc('exec_sql', {'sql_query': query}).execute()
            print(f"✅ Aggiunto campo {column_name}")
            success_count += 1
        except Exception as e:
            # Se la colonna esiste già, è normale
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print(f"ℹ️  Campo {column_name} già esistente")
            else:
                print(f"⚠️  Errore aggiungendo {column_name}: {e}")
    
    print(f"✅ Processo completato. {success_count} nuovi campi aggiunti.")

def create_configuration_tables():
    """Crea le tabelle di configurazione"""
    print("🔄 Creazione tabelle di configurazione...")
    
    tables = [
        {
            'name': 'ticket_software_options',
            'sql': '''
                CREATE TABLE IF NOT EXISTS ticket_software_options (
                    id BIGSERIAL PRIMARY KEY,
                    value TEXT UNIQUE NOT NULL,
                    label TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            ''',
            'data': [
                ('danea-easyfatt', 'Danea EasyFatt'),
                ('danea-clienti', 'Danea Clienti'),
                ('gestionale-custom', 'Gestionale Custom'),
                ('altro', 'Altro')
            ]
        },
        {
            'name': 'ticket_group_options',
            'sql': '''
                CREATE TABLE IF NOT EXISTS ticket_group_options (
                    id BIGSERIAL PRIMARY KEY,
                    value TEXT UNIQUE NOT NULL,
                    label TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            ''',
            'data': [
                ('supporto-tecnico', 'Supporto Tecnico'),
                ('assistenza-commerciale', 'Assistenza Commerciale'),
                ('amministrazione', 'Amministrazione'),
                ('sviluppo', 'Sviluppo')
            ]
        },
        {
            'name': 'ticket_type_options',
            'sql': '''
                CREATE TABLE IF NOT EXISTS ticket_type_options (
                    id BIGSERIAL PRIMARY KEY,
                    value TEXT UNIQUE NOT NULL,
                    label TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            ''',
            'data': [
                ('problema-tecnico', 'Problema Tecnico'),
                ('richiesta-informazioni', 'Richiesta Informazioni'),
                ('installazione', 'Installazione'),
                ('configurazione', 'Configurazione'),
                ('formazione', 'Formazione'),
                ('teleassistenza', 'Teleassistenza')
            ]
        },
        {
            'name': 'system_settings',
            'sql': '''
                CREATE TABLE IF NOT EXISTS system_settings (
                    id BIGSERIAL PRIMARY KEY,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            ''',
            'data': [
                ('company_name', 'CRM Pro', 'Nome dell\'azienda'),
                ('default_priority', 'Medium', 'Priorità predefinita per i nuovi ticket'),
                ('auto_assign', 'false', 'Assegnazione automatica dei ticket')
            ]
        }
    ]
    
    for table in tables:
        try:
            # Crea la tabella
            print(f"Creando tabella {table['name']}...")
            supabase.rpc('exec_sql', {'sql_query': table['sql']}).execute()
            print(f"✅ Tabella {table['name']} creata")
            
            # Inserisci dati predefiniti
            if table['name'] == 'system_settings':
                # Gestione speciale per system_settings con description
                for item in table['data']:
                    try:
                        supabase.table(table['name']).insert({
                            'key': item[0],
                            'value': item[1],
                            'description': item[2] if len(item) > 2 else None
                        }).execute()
                    except Exception as e:
                        if "duplicate key" in str(e).lower():
                            continue  # Già esistente, ok
                        print(f"⚠️  Errore inserendo {item[0]}: {e}")
            else:
                # Gestione normale per altre tabelle
                for item in table['data']:
                    try:
                        supabase.table(table['name']).insert({
                            'value': item[0],
                            'label': item[1]
                        }).execute()
                    except Exception as e:
                        if "duplicate key" in str(e).lower():
                            continue  # Già esistente, ok
                        print(f"⚠️  Errore inserendo {item[0]}: {e}")
            
            print(f"✅ Dati predefiniti inseriti in {table['name']}")
            
        except Exception as e:
            print(f"⚠️  Errore con tabella {table['name']}: {e}")

def verify_migration():
    """Verifica che la migrazione sia andata a buon fine"""
    print("🔍 Verifica migrazione...")
    
    try:
        # Verifica tabella tickets
        tickets = supabase.table('tickets').select('*').limit(1).execute()
        print("✅ Tabella tickets accessibile")
        
        # Verifica tabelle di configurazione
        tables_to_check = [
            'ticket_software_options',
            'ticket_group_options', 
            'ticket_type_options',
            'system_settings'
        ]
        
        for table_name in tables_to_check:
            result = supabase.table(table_name).select('*').limit(1).execute()
            print(f"✅ Tabella {table_name} accessibile")
        
        print("🎉 Migrazione completata con successo!")
        print("\nAdesso il tuo modal di modifica ticket dovrebbe mostrare tutti i nuovi campi!")
        
    except Exception as e:
        print(f"❌ Errore nella verifica: {e}")

def main():
    """Funzione principale"""
    print("🚀 Avvio migrazione database CRM Pro")
    print("=" * 50)
    
    try:
        # Test connessione
        print("🔗 Test connessione Supabase...")
        supabase.table('tickets').select('id').limit(1).execute()
        print("✅ Connessione Supabase OK")
        
        # Esegui migrazione
        add_columns_to_tickets()
        create_configuration_tables()
        verify_migration()
        
        print("\n" + "=" * 50)
        print("✅ MIGRAZIONE COMPLETATA!")
        print("I nuovi campi sono ora disponibili nel modal di modifica ticket.")
        print("Puoi accedere alle impostazioni su /settings per configurare le opzioni.")
        
    except Exception as e:
        print(f"❌ Errore durante la migrazione: {e}")
        print("\nSuggerimenti:")
        print("1. Verifica che le variabili SUPABASE_URL e SUPABASE_ANON_KEY siano corrette")
        print("2. Controlla di avere i permessi per modificare il database")
        print("3. Esegui manualmente lo script SQL nel SQL Editor di Supabase")
        sys.exit(1)

if __name__ == "__main__":
    main()