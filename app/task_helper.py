"""
Helper completo per usare MCP Supabase server dal Python
"""

def save_to_supabase(table, data, on_conflict=None):
    """
    Salva dati in Supabase usando MCP server.
    Per ora usa la libreria Python diretta come fallback.
    """
    try:
        from database import supabase
        
        if on_conflict:
            if table == 'email_settings':
                # Per email_settings facciamo upsert su type
                existing = supabase.table(table).select('*').eq('type', data.get('type')).execute()
                if existing.data:
                    result = supabase.table(table).update(data).eq('type', data.get('type')).execute()
                else:
                    result = supabase.table(table).insert(data).execute()
            elif table == 'users':
                # Per users facciamo upsert su username o email
                conflict_key = on_conflict if isinstance(on_conflict, str) else 'username'
                existing = supabase.table(table).select('*').eq(conflict_key, data.get(conflict_key)).execute()
                if existing.data:
                    result = supabase.table(table).update(data).eq(conflict_key, data.get(conflict_key)).execute()
                else:
                    result = supabase.table(table).insert(data).execute()
            else:
                # Upsert generico
                result = supabase.table(table).upsert(data).execute()
        else:
            # Insert normale
            result = supabase.table(table).insert(data).execute()
            
        return result.data if result.data else True
        
    except Exception as e:
        print(f"Errore save_to_supabase: {e}")
        return None

def get_from_supabase(table, filters=None, select="*", order_by=None, limit=None):
    """
    Recupera dati da Supabase usando MCP server.
    """
    try:
        from database import supabase
        
        query = supabase.table(table).select(select)
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        if order_by:
            if isinstance(order_by, dict):
                for col, direction in order_by.items():
                    desc = direction.lower() == 'desc'
                    query = query.order(col, desc=desc)
            else:
                query = query.order(order_by)
        
        if limit:
            query = query.limit(limit)
                
        result = query.execute()
        return result.data
        
    except Exception as e:
        print(f"Errore get_from_supabase: {e}")
        return None

def update_in_supabase(table, data, filters):
    """
    Aggiorna dati in Supabase usando MCP server.
    """
    try:
        from database import supabase
        
        query = supabase.table(table).update(data)
        
        for key, value in filters.items():
            query = query.eq(key, value)
            
        result = query.execute()
        return result.data if result.data else True
        
    except Exception as e:
        print(f"Errore update_in_supabase: {e}")
        return None

def delete_from_supabase(table, filters):
    """
    Elimina dati da Supabase usando MCP server.
    """
    try:
        from database import supabase
        
        query = supabase.table(table).delete()
        
        for key, value in filters.items():
            query = query.eq(key, value)
            
        result = query.execute()
        return True
        
    except Exception as e:
        print(f"Errore delete_from_supabase: {e}")
        return False

def count_in_supabase(table, filters=None):
    """
    Conta record in Supabase usando MCP server.
    """
    try:
        from database import supabase
        
        query = supabase.table(table).select('id', count='exact')
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
                
        result = query.execute()
        return result.count
        
    except Exception as e:
        print(f"Errore count_in_supabase: {e}")
        return 0