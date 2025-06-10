#!/usr/bin/env python3
"""
MCP Helper - Interface per interagire con Supabase via MCP server
"""
import json
import os
import subprocess
import logging

class MCPSupabaseHelper:
    """Helper per interagire con Supabase via MCP server"""
    
    @staticmethod
    def execute_query(query, params=None):
        """Esegue una query Supabase via MCP"""
        try:
            # Prepara il comando MCP
            cmd = ["mcp", "query", "--table", "email_settings", "--query", query]
            
            if params:
                cmd.extend(["--params", json.dumps(params)])
            
            # Esegue il comando
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return json.loads(result.stdout) if result.stdout else None
            else:
                print(f"MCP Error: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"Errore nell'esecuzione query MCP: {e}")
            return None
    
    @staticmethod
    def upsert_email_setting(setting_type, config_data):
        """Upsert configurazione email via MCP"""
        try:
            # Converte la configurazione in JSON
            config_json = json.dumps(config_data)
            
            # Prima tenta di aggiornare
            update_query = """
            UPDATE email_settings 
            SET config = %s, is_active = true, updated_at = NOW()
            WHERE type = %s
            RETURNING *
            """
            
            result = MCPSupabaseHelper.execute_query(update_query, [config_json, setting_type])
            
            if result and result.get('data'):
                print(f"Configurazione {setting_type} aggiornata via MCP")
                return result['data'][0]
            
            # Se update non ha trovato record, fa insert
            insert_query = """
            INSERT INTO email_settings (type, config, is_active)
            VALUES (%s, %s, true)
            RETURNING *
            """
            
            result = MCPSupabaseHelper.execute_query(insert_query, [setting_type, config_json])
            
            if result and result.get('data'):
                print(f"Configurazione {setting_type} inserita via MCP")
                return result['data'][0]
            
            return None
            
        except Exception as e:
            print(f"Errore nell'upsert configurazione {setting_type}: {e}")
            return None
    
    @staticmethod
    def get_email_setting(setting_type):
        """Recupera configurazione email via MCP"""
        try:
            query = """
            SELECT * FROM email_settings 
            WHERE type = %s AND is_active = true
            ORDER BY updated_at DESC
            LIMIT 1
            """
            
            result = MCPSupabaseHelper.execute_query(query, [setting_type])
            
            if result and result.get('data') and len(result['data']) > 0:
                setting = result['data'][0]
                # Decodifica la configurazione JSON
                if setting.get('config'):
                    return json.loads(setting['config'])
            
            return None
            
        except Exception as e:
            print(f"Errore nel recupero configurazione {setting_type}: {e}")
            return None

    @staticmethod
    def direct_upsert(setting_type, config_data):
        """Upsert diretto usando python con fallback"""
        try:
            from database import supabase
            import json
            
            # Prepara i dati
            data = {
                'type': setting_type,
                'config': json.dumps(config_data),
                'is_active': True
            }
            
            # Prima controlla se esiste
            result = supabase.table('email_settings').select('*').eq('type', setting_type).execute()
            
            if result.data:
                # Aggiorna
                update_result = supabase.table('email_settings').update(data).eq('type', setting_type).execute()
                print(f"✅ Configurazione {setting_type} aggiornata: {update_result.data}")
                return update_result.data[0] if update_result.data else None
            else:
                # Inserisce
                insert_result = supabase.table('email_settings').insert(data).execute()
                print(f"✅ Configurazione {setting_type} inserita: {insert_result.data}")
                return insert_result.data[0] if insert_result.data else None
                
        except Exception as e:
            print(f"❌ Errore nell'upsert diretto {setting_type}: {e}")
            return None