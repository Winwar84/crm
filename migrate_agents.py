#!/usr/bin/env python3
"""
Auto-generated script to migrate agents from SQLite to Supabase.
This script converts SQLite agents to Supabase users with approved status.
"""

import sys
import os
sys.path.append('/home/winwar84/crm/app')

from task_helper import save_to_supabase
from database import UserService

def migrate_agents():
    """Migrate agents from SQLite to Supabase as approved users"""
    
    # Agent data extracted from SQLite
    agents_data = [
    {
        "id": 1,
        "name": "Matteo",
        "email": "matteo.vinciguerra@vinciinside.it",
        "department": "Support",
        "created_at": "2025-06-09 08:03:51"
    },
    {
        "id": 2,
        "name": "Guido",
        "email": "alebuju@yahoo.it",
        "department": "Billing",
        "created_at": "2025-06-09 08:27:41"
    }
]
    
    print("🚀 Starting agents migration...")
    
    for agent in agents_data:
        print(f"\n📤 Migrating agent: {agent['name']} ({agent['email']})")
        
        # Create user data structure
        user_data = {
            'username': agent['email'].split('@')[0],  # Use email prefix as username
            'email': agent['email'],
            'full_name': agent['name'],
            'role': agent.get('department', 'support').lower(),  # Map department to role
            'status': 'approved',  # Auto-approve migrated agents
            'is_active': True,
            'password_hash': '$2b$12$6Ztdg7ogC9Mux4tUrjwWVe.fl/hyVUhyGDlJgAPSioKCZ62kmcBDS'  # Default password hash
        }
        
        try:
            # Check if user already exists
            from task_helper import get_from_supabase
            existing = get_from_supabase('users', {'email': agent['email']})
            
            if existing and len(existing) > 0:
                print(f"  ⚠️  User already exists: {agent['email']}")
                continue
            
            # Save to Supabase
            result = save_to_supabase('users', user_data)
            
            if result:
                print(f"  ✅ Successfully migrated: {agent['name']}")
            else:
                print(f"  ❌ Failed to migrate: {agent['name']}")
                
        except Exception as e:
            print(f"  ❌ Error migrating {agent['name']}: {e}")
    
    print("\n🎉 Migration complete!")

if __name__ == "__main__":
    migrate_agents()
