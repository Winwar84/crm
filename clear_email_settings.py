#!/usr/bin/env python3
"""
Script per cancellare tutte le configurazioni email
"""
import os
import sys
sys.path.append('/home/winwar84/crm/app')

from database import supabase

def clear_email_settings():
    """Cancella tutte le configurazioni email"""
    try:
        # Cancella tutti i record dalla tabella email_settings
        result = supabase.table('email_settings').delete().neq('id', 0).execute()
        print(f"✅ Cancellate {len(result.data) if result.data else 0} configurazioni email")
        
        # Cancella tutti i template email
        result2 = supabase.table('email_templates').delete().neq('id', 0).execute()
        print(f"✅ Cancellati {len(result2.data) if result2.data else 0} template email")
        
        print("🎉 Tutte le configurazioni email sono state cancellate!")
        
    except Exception as e:
        print(f"❌ Errore nella cancellazione: {e}")

if __name__ == "__main__":
    print("🗑️ Cancellazione configurazioni email...")
    clear_email_settings()