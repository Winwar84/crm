#!/usr/bin/env python3
"""
Script to check email_settings table in Supabase
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def check_email_settings():
    """Check and display email settings from database"""
    try:
        print("Connecting to Supabase...")
        
        # Query all email settings
        result = supabase.table('email_settings').select('*').order('created_at', desc=True).execute()
        
        if not result.data:
            print("No email settings found in database")
            return
        
        print(f"\nFound {len(result.data)} email setting record(s):")
        print("=" * 60)
        
        for setting in result.data:
            print(f"ID: {setting.get('id')}")
            print(f"Type: {setting.get('type')}")
            print(f"Active: {setting.get('is_active')}")
            print(f"Created: {setting.get('created_at')}")
            print(f"Updated: {setting.get('updated_at')}")
            
            # Parse and display config
            config_str = setting.get('config')
            if config_str:
                try:
                    config = json.loads(config_str)
                    print("Configuration:")
                    for key, value in config.items():
                        if key.lower() in ['password', 'pass', 'pwd']:
                            # Mask password for security
                            print(f"  {key}: {'*' * len(str(value))}")
                        else:
                            print(f"  {key}: {value}")
                except json.JSONDecodeError as e:
                    print(f"  Raw config (JSON decode error): {config_str}")
            else:
                print("  No configuration data")
            
            print("-" * 60)
        
        # Specifically check for SMTP config
        print("\nSMTP Configuration Details:")
        smtp_result = supabase.table('email_settings').select('*').eq('type', 'smtp').execute()
        
        if smtp_result.data:
            smtp_config = smtp_result.data[0]
            config_str = smtp_config.get('config')
            if config_str:
                try:
                    config = json.loads(config_str)
                    print("SMTP Settings:")
                    print(f"  Server: {config.get('smtp_server', 'Not set')}")
                    print(f"  Port: {config.get('smtp_port', 'Not set')}")
                    print(f"  Username: {config.get('smtp_username', 'Not set')}")
                    
                    # Check if the password matches the expected one
                    stored_password = config.get('smtp_password', '')
                    expected_password = "mlgi xhfq qmfl rfgh"
                    
                    print(f"  Password stored: {'Yes' if stored_password else 'No'}")
                    print(f"  Password length: {len(stored_password)} characters")
                    
                    if stored_password == expected_password:
                        print("  ✓ Password matches expected value")
                    else:
                        print("  ✗ Password does NOT match expected value")
                        print(f"  Expected: {expected_password}")
                        print(f"  Stored:   {stored_password}")
                    
                    print(f"  Use TLS: {config.get('use_tls', 'Not set')}")
                    print(f"  From Email: {config.get('from_email', 'Not set')}")
                    print(f"  From Name: {config.get('from_name', 'Not set')}")
                    
                except json.JSONDecodeError as e:
                    print(f"Error parsing SMTP config JSON: {e}")
        else:
            print("No SMTP configuration found")
            
    except Exception as e:
        print(f"Error checking email settings: {e}")

if __name__ == "__main__":
    check_email_settings()