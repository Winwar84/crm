#!/usr/bin/env python3
"""
Esecuzione diretta SQL tramite Supabase RPC
"""

import json
import urllib.request
import urllib.parse
import urllib.error

# Credenziali Supabase
SUPABASE_URL = "https://ixnjxhssqhbytcmzruks.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmp4aHNzcWhieXRjbXpydWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTc0MTksImV4cCI6MjA2NTAzMzQxOX0.ZUwfgx3MNoR6PtslyhTgZMfXRJ33nXSjAwHDt8gKMxI"

def execute_sql(sql_query):
    """Esegue SQL tramite RPC"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json'
    }
    
    data = json.dumps({"sql_query": sql_query}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return {'success': True, 'result': result}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            return {'success': False, 'error': error_data}
        except:
            return {'success': False, 'error': {'message': error_body, 'code': e.code}}

def add_ticket_columns():
    """Aggiunge i nuovi campi alla tabella tickets"""
    print("🔄 Aggiunta campi alla tabella tickets...")
    
    columns_to_add = [
        ("software", "Software del ticket"),
        ('"group"', "Gruppo di appartenenza (usando virgolette per parola riservata)"),
        ("type", "Tipo di ticket"),
        ("rapporto_danea", "Rapporto Danea"),
        ("id_assistenza", "ID Assistenza"),
        ("password_teleassistenza", "Password Teleassistenza"),
        ("numero_richiesta_teleassistenza", "Numero Richiesta Teleassistenza")
    ]
    
    success_count = 0
    
    for column_name, description in columns_to_add:
        sql = f"ALTER TABLE tickets ADD COLUMN {column_name} TEXT;"
        print(f"  📝 Aggiungendo {column_name}...")
        
        result = execute_sql(sql)
        
        if result['success']:
            print(f"  ✅ {column_name}: aggiunto con successo")
            success_count += 1
        else:
            error_msg = result['error'].get('message', 'Errore sconosciuto')
            if 'already exists' in error_msg.lower() or 'duplicate column' in error_msg.lower():
                print(f"  ℹ️  {column_name}: già esistente")
                success_count += 1
            else:
                print(f"  ❌ {column_name}: {error_msg}")
    
    return success_count

def create_config_table(table_name, table_sql):
    """Crea una singola tabella di configurazione"""
    print(f"📝 Creando tabella {table_name}...")
    
    result = execute_sql(table_sql)
    
    if result['success']:
        print(f"✅ Tabella {table_name} creata")
        return True
    else:
        error_msg = result['error'].get('message', 'Errore sconosciuto')
        if 'already exists' in error_msg.lower():
            print(f"ℹ️  Tabella {table_name} già esistente")
            return True
        else:
            print(f"❌ Errore creazione {table_name}: {error_msg}")
            return False

def run_full_migration():
    """Esegue l'intera migrazione SQL"""
    print("🚀 Esecuzione migrazione completa tramite SQL...")
    
    # Leggi il file di migrazione
    try:
        with open('migration_add_ticket_fields.sql', 'r', encoding='utf-8') as f:
            migration_sql = f.read()
    except Exception as e:
        print(f"❌ Errore lettura file migrazione: {e}")
        return False
    
    # Dividi in sezioni per esecuzione graduale
    sections = migration_sql.split('--')
    
    success_count = 0
    total_sections = 0
    
    for i, section in enumerate(sections):
        section = section.strip()
        if not section or len(section) < 10:
            continue
            
        total_sections += 1
        print(f"\n📝 Esecuzione sezione {i+1}...")
        
        result = execute_sql(section)
        
        if result['success']:
            print("✅ Sezione eseguita con successo")
            success_count += 1
        else:
            error_msg = result['error'].get('message', 'Errore sconosciuto')
            print(f"⚠️  Errore sezione: {error_msg}")
    
    print(f"\n📊 Risultato: {success_count}/{total_sections} sezioni eseguite")
    return success_count > 0

def main():
    """Funzione principale"""
    print("🚀 Migrazione Diretta SQL via RPC")
    print("=" * 50)
    
    # Test dell'RPC endpoint
    print("🔍 Test RPC endpoint...")
    test_result = execute_sql("SELECT version();")
    
    if test_result['success']:
        print("✅ RPC endpoint funzionante")
        print("📄 Esecuzione migrazione completa...")
        
        if run_full_migration():
            print("\n🎉 MIGRAZIONE COMPLETATA!")
            print("I nuovi campi dovrebbero ora essere disponibili!")
        else:
            print("\n⚠️  Migrazione parziale o fallita")
            
    else:
        print("❌ RPC endpoint non disponibile")
        print("Errore:", test_result['error'])
        print("\n🛠️  SOLUZIONE ALTERNATIVA:")
        print("Esegui manualmente il file migration_add_ticket_fields.sql")
        print("nel SQL Editor di Supabase:")
        print("https://supabase.com/dashboard/project/ixnjxhssqhbytcmzruks/sql")

if __name__ == "__main__":
    main()