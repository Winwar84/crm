#!/usr/bin/env python3
"""
Script per aggiornare l'intervallo di controllo email da 60 a 30 secondi
"""
import sys
import os
sys.path.append('/home/winwar84/crm/app')

from task_helper import get_from_supabase, save_to_supabase
import json

def update_email_interval():
    """Aggiorna l'intervallo di controllo email IMAP"""
    try:
        # Recupera la configurazione IMAP attuale
        print("🔍 Recuperando configurazione IMAP...")
        current_config = get_from_supabase('email_settings', {'type': 'imap'})
        
        if not current_config:
            print("❌ Nessuna configurazione IMAP trovata")
            return False
            
        # Parse della configurazione JSON
        config_data = json.loads(current_config[0]['config'])
        print(f"📋 Configurazione attuale: {config_data}")
        
        # Aggiorna l'intervallo da 60 a 30 secondi
        old_interval = config_data.get('auto_check', 60)
        config_data['auto_check'] = 30
        
        print(f"🔄 Aggiornamento intervallo: {old_interval}s → 30s")
        
        # Salva la configurazione aggiornata
        result = save_to_supabase('email_settings', {
            'type': 'imap',
            'config': json.dumps(config_data),
            'is_active': True
        }, on_conflict='type')
        
        if result:
            print("✅ Configurazione IMAP aggiornata con successo!")
            print(f"📧 Il sistema ora controllerà le email ogni 30 secondi invece di {old_interval}")
            return True
        else:
            print("❌ Errore nel salvare la configurazione")
            return False
            
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False

if __name__ == "__main__":
    update_email_interval()