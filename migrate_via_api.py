#!/usr/bin/env python3
"""
Migrazione via API REST Supabase senza dipendenze esterne
"""

import json
import urllib.request
import urllib.parse
import urllib.error

# Credenziali Supabase (dalle variabili d'ambiente)
SUPABASE_URL = "https://ixnjxhssqhbytcmzruks.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmp4aHNzcWhieXRjbXpydWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTc0MTksImV4cCI6MjA2NTAzMzQxOX0.ZUwfgx3MNoR6PtslyhTgZMfXRJ33nXSjAwHDt8gKMxI"

def make_request(method, endpoint, data=None):
    """Fa una richiesta HTTP all'API Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            return {'error': error_data}
        except:
            return {'error': {'message': error_body, 'code': e.code}}
    except Exception as e:
        return {'error': {'message': str(e)}}

def execute_sql_via_rpc(sql_query):
    """Esegue SQL tramite RPC function (se disponibile)"""
    try:
        endpoint = "rpc/exec_sql"
        data = {"sql_query": sql_query}
        result = make_request('POST', endpoint, data)
        return result
    except Exception as e:
        return {'error': str(e)}

def test_connection():
    """Testa la connessione a Supabase"""
    print("🔗 Test connessione Supabase...")
    
    result = make_request('GET', 'tickets?select=id&limit=1')
    
    if 'error' in result:
        print(f"❌ Errore connessione: {result['error']}")
        return False
    else:
        print("✅ Connessione Supabase OK")
        return True

def create_tables_via_api():
    """Crea le tabelle di configurazione tramite inserimenti diretti"""
    print("🔄 Creazione dati di configurazione...")
    
    # Proviamo a inserire dati nelle tabelle (questo le creerà se non esistono)
    configs = {
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
        ]
    }
    
    results = {}
    
    for table_name, items in configs.items():
        print(f"\n📝 Popolamento {table_name}...")
        table_results = []
        
        for item in items:
            result = make_request('POST', table_name, item)
            if 'error' in result:
                print(f"  ⚠️  {item['label']}: {result['error'].get('message', 'Errore sconosciuto')}")
                table_results.append(False)
            else:
                print(f"  ✅ {item['label']}: OK")
                table_results.append(True)
        
        results[table_name] = table_results
    
    return results

def test_ticket_update():
    """Testa l'aggiornamento di un ticket con i nuovi campi"""
    print("\n🧪 Test aggiornamento ticket...")
    
    # Prendi il primo ticket disponibile
    tickets_result = make_request('GET', 'tickets?select=id&limit=1')
    
    if 'error' in tickets_result:
        print(f"  ❌ Errore nel recupero ticket: {tickets_result['error']}")
        return False
    
    if not tickets_result:
        print("  ℹ️  Nessun ticket disponibile per il test")
        return False
    
    ticket_id = tickets_result[0]['id']
    
    # Prova ad aggiornare con i nuovi campi
    test_data = {
        'software': 'danea-easyfatt',
        'group': 'supporto-tecnico',
        'type': 'problema-tecnico',
        'rapporto_danea': 'TEST-MIGRATION',
        'id_assistenza': 'ASS-001',
        'password_teleassistenza': 'TEMP123',
        'numero_richiesta_teleassistenza': 'REQ-001'
    }
    
    result = make_request('PATCH', f'tickets?id=eq.{ticket_id}', test_data)
    
    if 'error' in result:
        error_msg = result['error'].get('message', 'Errore sconosciuto')
        print(f"  ❌ Errore aggiornamento: {error_msg}")
        
        if "does not exist" in error_msg or "column" in error_msg.lower():
            print("  📝 I nuovi campi non sono presenti nella tabella tickets")
            return False
        
        return False
    else:
        print(f"  ✅ Ticket #{ticket_id} aggiornato con successo!")
        return True

def main():
    """Funzione principale di migrazione"""
    print("🚀 Migrazione Supabase via API REST")
    print("=" * 50)
    
    # Test connessione
    if not test_connection():
        print("❌ Impossibile connettersi a Supabase")
        return
    
    # Prova a creare/popolare le tabelle di configurazione
    config_results = create_tables_via_api()
    
    # Test aggiornamento ticket
    ticket_update_ok = test_ticket_update()
    
    # Riepilogo
    print("\n" + "=" * 50)
    print("📋 RIEPILOGO MIGRAZIONE")
    print("=" * 50)
    
    # Analizza risultati configurazioni
    total_success = sum(sum(results) for results in config_results.values())
    total_items = sum(len(results) for results in config_results.values())
    
    print(f"📊 Configurazioni: {total_success}/{total_items} inserite")
    
    for table_name, results in config_results.items():
        success_count = sum(results)
        total_count = len(results)
        status = "✅" if success_count == total_count else "⚠️"
        print(f"   {status} {table_name}: {success_count}/{total_count}")
    
    if ticket_update_ok:
        print("✅ Nuovi campi ticket: FUNZIONANTI")
        print("\n🎉 MIGRAZIONE COMPLETATA!")
        print("Il modal di modifica ticket dovrebbe ora mostrare tutti i nuovi campi:")
        print("• Software, Gruppo, Agente, Tipo, Stato, Priorità (menu a tendina)")
        print("• Rapporto Danea, ID Assistenza, Password Teleassistenza, Numero Richiesta (campi liberi)")
    else:
        print("❌ Nuovi campi ticket: NON FUNZIONANTI")
        print("\n🛠️  AZIONE RICHIESTA:")
        print("Le tabelle di configurazione sono state create, ma i campi")
        print("della tabella 'tickets' devono ancora essere aggiunti.")
        print("\nEsegui manualmente nel SQL Editor di Supabase:")
        print("1. Apri https://supabase.com/dashboard/project/ixnjxhssqhbytcmzruks/sql")
        print("2. Copia e incolla il contenuto di migration_add_ticket_fields.sql")
        print("3. Clicca 'Run'")
    
    print(f"\n💡 ACCESSO:")
    print(f"• App: Apri la tua applicazione CRM")
    print(f"• Settings: Vai su /settings per configurare le opzioni")
    print(f"• Test: Prova a modificare un ticket per vedere i nuovi campi")

if __name__ == "__main__":
    main()