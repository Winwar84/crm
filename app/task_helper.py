"""
Helper completo per usare MCP Supabase server dal Python
"""
import subprocess
import json
import os

def _call_mcp_supabase(method, params):
    """
    Chiama il server MCP Supabase
    """
    try:
        # Per ora, usa la libreria diretta finché non configuriamo MCP correttamente
        # TODO: Implementare chiamata reale MCP server
        from database import supabase
        
        if method == "supabase_select":
            query = supabase.table(params["table"]).select(params.get("select", "*"))
            
            if params.get("filters"):
                for key, value in params["filters"].items():
                    query = query.eq(key, value)
                    
            if params.get("order_by"):
                order_by = params["order_by"]
                if isinstance(order_by, dict):
                    for col, direction in order_by.items():
                        desc = direction.lower() == 'desc'
                        query = query.order(col, desc=desc)
                else:
                    query = query.order(order_by)
                    
            if params.get("limit"):
                query = query.limit(params["limit"])
                
            result = query.execute()
            return {"data": result.data, "error": None}
            
        elif method == "supabase_insert":
            result = supabase.table(params["table"]).insert(params["data"]).execute()
            return {"data": result.data, "error": None}
            
        elif method == "supabase_upsert":
            table = params["table"]
            data = params["data"]
            on_conflict = params.get("on_conflict")
            
            if table == 'email_settings' and on_conflict == 'type':
                # Gestione specifica per email_settings
                existing = supabase.table(table).select('*').eq('type', data.get('type')).execute()
                if existing.data:
                    result = supabase.table(table).update(data).eq('type', data.get('type')).execute()
                else:
                    result = supabase.table(table).insert(data).execute()
            else:
                # Upsert generico
                result = supabase.table(table).upsert(data).execute()
                
            return {"data": result.data, "error": None}
            
        elif method == "supabase_update":
            query = supabase.table(params["table"]).update(params["data"])
            
            for key, value in params["filters"].items():
                query = query.eq(key, value)
                
            result = query.execute()
            return {"data": result.data, "error": None}
            
        elif method == "supabase_delete":
            query = supabase.table(params["table"]).delete()
            
            for key, value in params["filters"].items():
                query = query.eq(key, value)
                
            result = query.execute()
            return {"data": True, "error": None}
            
        elif method == "supabase_count":
            query = supabase.table(params["table"]).select('id', count='exact')
            
            if params.get("filters"):
                for key, value in params["filters"].items():
                    query = query.eq(key, value)
                    
            result = query.execute()
            return {"data": result.count, "error": None}
            
        else:
            return {"data": None, "error": f"Metodo non supportato: {method}"}
            
    except Exception as e:
        return {"data": None, "error": str(e)}

def save_to_supabase(table, data, on_conflict=None):
    """
    Salva dati in Supabase usando MCP server.
    """
    try:
        method = "supabase_upsert" if on_conflict else "supabase_insert"
        params = {
            "table": table,
            "data": data
        }
        
        if on_conflict:
            params["on_conflict"] = on_conflict
            
        result = _call_mcp_supabase(method, params)
        
        if result["error"]:
            print(f"Errore save_to_supabase: {result['error']}")
            return None
            
        return result["data"] if result["data"] else True
        
    except Exception as e:
        print(f"Errore save_to_supabase: {e}")
        return None

def get_from_supabase(table, filters=None, select="*", order_by=None, limit=None):
    """
    Recupera dati da Supabase usando MCP server.
    """
    try:
        params = {
            "table": table,
            "select": select
        }
        
        if filters:
            params["filters"] = filters
        if order_by:
            params["order_by"] = order_by
        if limit:
            params["limit"] = limit
            
        result = _call_mcp_supabase("supabase_select", params)
        
        if result["error"]:
            print(f"Errore get_from_supabase: {result['error']}")
            return None
            
        return result["data"]
        
    except Exception as e:
        print(f"Errore get_from_supabase: {e}")
        return None

def update_in_supabase(table, data, filters):
    """
    Aggiorna dati in Supabase usando MCP server.
    """
    try:
        params = {
            "table": table,
            "data": data,
            "filters": filters
        }
        
        result = _call_mcp_supabase("supabase_update", params)
        
        if result["error"]:
            print(f"Errore update_in_supabase: {result['error']}")
            return None
            
        return result["data"] if result["data"] else True
        
    except Exception as e:
        print(f"Errore update_in_supabase: {e}")
        return None

def delete_from_supabase(table, filters):
    """
    Elimina dati da Supabase usando MCP server.
    """
    try:
        params = {
            "table": table,
            "filters": filters
        }
        
        result = _call_mcp_supabase("supabase_delete", params)
        
        if result["error"]:
            print(f"Errore delete_from_supabase: {result['error']}")
            return False
            
        return True
        
    except Exception as e:
        print(f"Errore delete_from_supabase: {e}")
        return False

def count_in_supabase(table, filters=None):
    """
    Conta record in Supabase usando MCP server.
    """
    try:
        params = {
            "table": table
        }
        
        if filters:
            params["filters"] = filters
            
        result = _call_mcp_supabase("supabase_count", params)
        
        if result["error"]:
            print(f"Errore count_in_supabase: {result['error']}")
            return 0
            
        return result["data"] if result["data"] is not None else 0
        
    except Exception as e:
        print(f"Errore count_in_supabase: {e}")
        return 0