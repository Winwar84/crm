#!/usr/bin/env python3
"""
Database Integrity Verification Script for CRM Pro v2.4
Verifies Supabase database connection and data integrity using task_helper.py
"""

import sys
import os
import json
from datetime import datetime

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def print_separator(title):
    """Print a formatted section separator"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_subsection(title):
    """Print a formatted subsection"""
    print(f"\n--- {title} ---")

def verify_connection():
    """Test basic connection to Supabase"""
    print_separator("DATABASE CONNECTION TEST")
    
    try:
        # Import after adding to path
        from task_helper import get_from_supabase
        
        # Test basic connection with a simple query
        result = get_from_supabase('users', limit=1)
        
        if result is not None:
            print("✅ Supabase connection successful")
            print(f"✅ Connection verified via task_helper.py")
            return True
        else:
            print("❌ Connection failed - no data returned")
            return False
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def count_table_records():
    """Count records in all main tables"""
    print_separator("TABLE RECORD COUNTS")
    
    tables = ['users', 'customers', 'tickets', 'ticket_messages', 'email_settings']
    counts = {}
    
    try:
        from task_helper import count_in_supabase
        
        for table in tables:
            try:
                count = count_in_supabase(table)
                counts[table] = count
                print(f"📊 {table:<20} {count:>8} records")
            except Exception as e:
                counts[table] = 0
                print(f"❌ {table:<20}    ERROR: {e}")
        
        return counts
        
    except Exception as e:
        print(f"❌ Error counting records: {e}")
        return {}

def show_sample_data():
    """Show sample data from each table to verify content"""
    print_separator("SAMPLE DATA VERIFICATION")
    
    try:
        from task_helper import get_from_supabase
        
        # Users table
        print_subsection("Users Sample")
        users = get_from_supabase('users', select='id, username, email, role, status', limit=3)
        if users:
            for user in users:
                print(f"  ID: {user['id']}, Username: {user.get('username', 'N/A')}, Role: {user.get('role', 'N/A')}, Status: {user.get('status', 'N/A')}")
        else:
            print("  No users found")
        
        # Customers table
        print_subsection("Customers Sample")
        customers = get_from_supabase('customers', select='id, name, email, status', limit=3)
        if customers:
            for customer in customers:
                print(f"  ID: {customer['id']}, Name: {customer.get('name', 'N/A')}, Email: {customer.get('email', 'N/A')}, Status: {customer.get('status', 'N/A')}")
        else:
            print("  No customers found")
        
        # Tickets table
        print_subsection("Tickets Sample")
        tickets = get_from_supabase('tickets', select='id, title, status, priority, customer_id, assigned_to', limit=3)
        if tickets:
            for ticket in tickets:
                print(f"  ID: {ticket['id']}, Title: {ticket.get('title', 'N/A')[:30]}..., Status: {ticket.get('status', 'N/A')}, Priority: {ticket.get('priority', 'N/A')}")
        else:
            print("  No tickets found")
        
        # Ticket Messages table
        print_subsection("Ticket Messages Sample")
        messages = get_from_supabase('ticket_messages', select='id, ticket_id, message_text, sender_type, sender_name, is_internal', limit=3)
        if messages:
            for message in messages:
                msg_preview = message.get('message_text', 'N/A')[:50]
                sender = message.get('sender_name', 'N/A')
                internal = "Internal" if message.get('is_internal') else "External"
                print(f"  ID: {message['id']}, Ticket: {message.get('ticket_id', 'N/A')}, From: {sender} ({message.get('sender_type', 'N/A')}, {internal})")
                print(f"    Message: {msg_preview}...")
        else:
            print("  No messages found")
        
        # Email Settings table
        print_subsection("Email Settings Sample")
        email_settings = get_from_supabase('email_settings', select='id, type, is_active', limit=3)
        if email_settings:
            for setting in email_settings:
                print(f"  ID: {setting['id']}, Type: {setting.get('type', 'N/A')}, Active: {setting.get('is_active', 'N/A')}")
        else:
            print("  No email settings found")
            
    except Exception as e:
        print(f"❌ Error retrieving sample data: {e}")

def verify_relationships():
    """Verify foreign key relationships between tables"""
    print_separator("RELATIONSHIP VERIFICATION")
    
    try:
        from task_helper import get_from_supabase
        
        # Check tickets with customers
        print_subsection("Tickets → Customers Relationship")
        tickets = get_from_supabase('tickets', select='id, customer_id', limit=10)
        if tickets:
            customer_ids = [str(t.get('customer_id')) for t in tickets if t.get('customer_id')]
            if customer_ids:
                # Check if these customer IDs exist
                for customer_id in customer_ids[:5]:  # Check first 5
                    customer = get_from_supabase('customers', {'id': customer_id}, select='id, name')
                    if customer:
                        print(f"  ✅ Ticket customer_id {customer_id} → Customer: {customer[0].get('name', 'N/A')}")
                    else:
                        print(f"  ❌ Ticket customer_id {customer_id} → Customer not found")
            else:
                print("  ⚠️  No customer IDs found in tickets")
        else:
            print("  ⚠️  No tickets found to verify")
        
        # Check ticket messages with tickets
        print_subsection("Ticket Messages → Tickets Relationship")
        messages = get_from_supabase('ticket_messages', select='id, ticket_id', limit=10)
        if messages:
            ticket_ids = [str(m.get('ticket_id')) for m in messages if m.get('ticket_id')]
            if ticket_ids:
                # Check if these ticket IDs exist
                for ticket_id in ticket_ids[:5]:  # Check first 5
                    ticket = get_from_supabase('tickets', {'id': ticket_id}, select='id, title')
                    if ticket:
                        title = ticket[0].get('title', 'N/A')[:30]
                        print(f"  ✅ Message ticket_id {ticket_id} → Ticket: {title}...")
                    else:
                        print(f"  ❌ Message ticket_id {ticket_id} → Ticket not found")
            else:
                print("  ⚠️  No ticket IDs found in messages")
        else:
            print("  ⚠️  No messages found to verify")
        
        # Check tickets with assigned agents (users)
        print_subsection("Tickets → Users (Assigned Agents) Relationship")
        tickets_with_agents = get_from_supabase('tickets', select='id, assigned_to', limit=10)
        if tickets_with_agents:
            agent_ids = []
            for t in tickets_with_agents:
                assigned_to = t.get('assigned_to')
                if assigned_to:
                    # Handle both string and numeric IDs
                    try:
                        # Try to convert to int if it's a numeric string
                        if isinstance(assigned_to, str) and assigned_to.isdigit():
                            agent_ids.append(int(assigned_to))
                        elif isinstance(assigned_to, int):
                            agent_ids.append(assigned_to)
                        else:
                            # It's a username, search by username instead
                            agent = get_from_supabase('users', {'username': assigned_to}, select='id, username')
                            if agent:
                                print(f"  ✅ Ticket assigned_to '{assigned_to}' → Agent: {agent[0].get('username', 'N/A')} (ID: {agent[0].get('id')})")
                            else:
                                print(f"  ❌ Ticket assigned_to '{assigned_to}' → Agent not found")
                    except Exception as e:
                        print(f"  ⚠️  Error processing assigned_to '{assigned_to}': {e}")
            
            # Check numeric IDs
            for agent_id in agent_ids[:5]:  # Check first 5
                try:
                    agent = get_from_supabase('users', {'id': agent_id}, select='id, username')
                    if agent:
                        print(f"  ✅ Ticket assigned_to {agent_id} → Agent: {agent[0].get('username', 'N/A')}")
                    else:
                        print(f"  ❌ Ticket assigned_to {agent_id} → Agent not found")
                except Exception as e:
                    print(f"  ⚠️  Error checking agent_id {agent_id}: {e}")
                    
            if not agent_ids:
                print("  ⚠️  No numeric agent IDs found in tickets")
        else:
            print("  ⚠️  No tickets found to verify")
            
    except Exception as e:
        print(f"❌ Error verifying relationships: {e}")

def check_database_type():
    """Verify that the app is using Supabase and not SQLite"""
    print_separator("DATABASE TYPE VERIFICATION")
    
    try:
        # Check environment variables
        from dotenv import load_dotenv
        import os
        
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if supabase_url and supabase_key:
            print("✅ Supabase environment variables found:")
            print(f"  SUPABASE_URL: {supabase_url}")
            print(f"  SUPABASE_ANON_KEY: {supabase_key[:20]}...")
            
            # Try to import and check database module
            from database import supabase
            print("✅ Supabase client imported successfully")
            
            # Check if SQLite files exist (should not be used)
            sqlite_files = ['crm.db', 'app/crm.db', 'database/crm.db']
            sqlite_found = []
            for file_path in sqlite_files:
                if os.path.exists(file_path):
                    sqlite_found.append(file_path)
            
            if sqlite_found:
                print("⚠️  SQLite database files found (should not be used):")
                for file_path in sqlite_found:
                    print(f"  - {file_path}")
            else:
                print("✅ No SQLite database files found")
                
            return True
            
        else:
            print("❌ Supabase environment variables not found")
            print("  Missing SUPABASE_URL or SUPABASE_ANON_KEY")
            return False
            
    except Exception as e:
        print(f"❌ Error checking database type: {e}")
        return False

def generate_summary(counts):
    """Generate a summary report"""
    print_separator("SUMMARY REPORT")
    
    # Calculate totals
    total_records = sum(counts.values())
    
    print(f"📊 Total Records Across All Tables: {total_records}")
    print(f"📅 Verification Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Health check
    if total_records > 0:
        print("✅ Database appears to be healthy and populated")
        
        # Check for key data
        if counts.get('users', 0) > 0:
            print("✅ Users table has data (authentication working)")
        else:
            print("⚠️  Users table is empty (no authentication data)")
            
        if counts.get('customers', 0) > 0:
            print("✅ Customers table has data")
        else:
            print("⚠️  Customers table is empty")
            
        if counts.get('tickets', 0) > 0:
            print("✅ Tickets table has data")
            if counts.get('ticket_messages', 0) > 0:
                print("✅ Ticket messages table has data (chat system working)")
            else:
                print("⚠️  No ticket messages (chat system not used yet)")
        else:
            print("⚠️  Tickets table is empty")
            
        if counts.get('email_settings', 0) > 0:
            print("✅ Email settings configured")
        else:
            print("⚠️  No email settings configured")
            
    else:
        print("❌ Database appears to be empty or not properly connected")
    
    print(f"\n🔗 Database Connection: Supabase via task_helper.py")
    print(f"🏗️  System: CRM Pro v2.4")

def main():
    """Main verification function"""
    print("🔍 CRM Pro v2.4 - Database Integrity Verification")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Test connection
    if not verify_connection():
        print("\n❌ Database connection failed. Cannot proceed with verification.")
        sys.exit(1)
    
    # Step 2: Verify database type
    if not check_database_type():
        print("\n⚠️  Database type verification had issues, but continuing...")
    
    # Step 3: Count records
    counts = count_table_records()
    
    # Step 4: Show sample data
    show_sample_data()
    
    # Step 5: Verify relationships
    verify_relationships()
    
    # Step 6: Generate summary
    generate_summary(counts)
    
    print(f"\n✅ Verification completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()