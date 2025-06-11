#!/usr/bin/env python3
"""
Script to extract specific data from SQLite that needs to be migrated to Supabase.
This script focuses on the agents table that has data in SQLite but not in Supabase.
"""

import sqlite3
import json
import os
from datetime import datetime

# Database paths
SQLITE_DB_PATH = '/home/winwar84/crm/database/freshdesk_clone.db'

def connect_to_sqlite():
    """Connect to local SQLite database"""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        return conn
    except Exception as e:
        print(f"❌ Error connecting to SQLite: {e}")
        return None

def extract_agents_data(conn):
    """Extract all agents data from SQLite"""
    print("🔍 Extracting agents data from SQLite...")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents ORDER BY id;")
    agents = cursor.fetchall()
    
    agents_data = []
    for agent in agents:
        agent_dict = dict(agent)
        agents_data.append(agent_dict)
        print(f"  📝 Agent {agent_dict['id']}: {agent_dict['name']} ({agent_dict['email']})")
    
    return agents_data

def extract_tickets_data(conn):
    """Extract all tickets data from SQLite for comparison"""
    print("🔍 Extracting tickets data from SQLite...")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets ORDER BY id;")
    tickets = cursor.fetchall()
    
    tickets_data = []
    for ticket in tickets:
        ticket_dict = dict(ticket)
        tickets_data.append(ticket_dict)
        print(f"  🎫 Ticket {ticket_dict['id']}: {ticket_dict['title']} - {ticket_dict['status']}")
    
    return tickets_data

def extract_customers_data(conn):
    """Extract all customers data from SQLite for comparison"""
    print("🔍 Extracting customers data from SQLite...")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY id;")
    customers = cursor.fetchall()
    
    customers_data = []
    for customer in customers:
        customer_dict = dict(customer)
        customers_data.append(customer_dict)
        print(f"  👤 Customer {customer_dict['id']}: {customer_dict['name']} ({customer_dict['email']})")
    
    return customers_data

def compare_supabase_agents():
    """Check current agents in Supabase"""
    print("🔗 Checking current agents in Supabase...")
    
    try:
        import sys
        sys.path.append('/home/winwar84/crm/app')
        from task_helper import get_from_supabase
        
        # Get users that are treated as agents (approved users)
        users = get_from_supabase('users', {'status': 'approved'})
        print(f"  📊 Found {len(users) if users else 0} approved users in Supabase:")
        
        if users:
            for user in users:
                print(f"    👤 {user.get('full_name', user.get('username'))}: {user.get('email')} - Role: {user.get('role')}")
        
        return users
    except Exception as e:
        print(f"❌ Error accessing Supabase: {e}")
        return None

def generate_migration_script(agents_data):
    """Generate a Python script to migrate agents data"""
    print("📝 Generating migration script...")
    
    script_content = '''#!/usr/bin/env python3
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
    agents_data = ''' + json.dumps(agents_data, indent=4) + '''
    
    print("🚀 Starting agents migration...")
    
    for agent in agents_data:
        print(f"\\n📤 Migrating agent: {agent['name']} ({agent['email']})")
        
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
    
    print("\\n🎉 Migration complete!")

if __name__ == "__main__":
    migrate_agents()
'''
    
    script_path = '/home/winwar84/crm/migrate_agents.py'
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make script executable
    os.chmod(script_path, 0o755)
    
    print(f"✅ Migration script created: {script_path}")
    return script_path

def export_migration_data(agents_data, tickets_data, customers_data):
    """Export all migration data to JSON files"""
    print("💾 Exporting migration data to JSON files...")
    
    migration_data = {
        'export_date': datetime.now().isoformat(),
        'source_database': SQLITE_DB_PATH,
        'agents': agents_data,
        'tickets': tickets_data,
        'customers': customers_data,
        'summary': {
            'agents_count': len(agents_data),
            'tickets_count': len(tickets_data),
            'customers_count': len(customers_data)
        }
    }
    
    # Save complete migration data
    output_file = '/home/winwar84/crm/migration_data.json'
    with open(output_file, 'w') as f:
        json.dump(migration_data, f, indent=2)
    
    print(f"✅ Migration data exported to: {output_file}")
    
    # Also save individual files for easier processing
    for data_type, data in [('agents', agents_data), ('tickets', tickets_data), ('customers', customers_data)]:
        if data:
            individual_file = f'/home/winwar84/crm/migration_{data_type}.json'
            with open(individual_file, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"✅ {data_type.capitalize()} data saved to: {individual_file}")

def main():
    """Main extraction function"""
    print("🔧 SQLite Data Extraction Tool")
    print("=" * 50)
    
    # Check if SQLite database exists
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ SQLite database not found at: {SQLITE_DB_PATH}")
        return
    
    # Connect to SQLite
    conn = connect_to_sqlite()
    if not conn:
        return
    
    try:
        # Extract data from SQLite
        agents_data = extract_agents_data(conn)
        tickets_data = extract_tickets_data(conn)
        customers_data = extract_customers_data(conn)
        
        print("\\n" + "="*50)
        print("📊 EXTRACTION SUMMARY")
        print("="*50)
        print(f"Agents extracted: {len(agents_data)}")
        print(f"Tickets extracted: {len(tickets_data)}")
        print(f"Customers extracted: {len(customers_data)}")
        
        # Compare with Supabase
        print("\\n" + "="*50)
        print("🔄 SUPABASE COMPARISON")
        print("="*50)
        compare_supabase_agents()
        
        # Generate migration script for agents (main missing data)
        if agents_data:
            script_path = generate_migration_script(agents_data)
            print(f"\\n🚀 To migrate agents, run: python3 {script_path}")
        
        # Export all data
        export_migration_data(agents_data, tickets_data, customers_data)
        
        print("\\n✅ Data extraction complete!")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()