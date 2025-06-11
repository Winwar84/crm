#!/usr/bin/env python3
"""
Database Schema Information for CRM Pro v2.4
Shows table schemas and sample data structures
"""

import sys
import os
import json

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def show_table_schema(table_name):
    """Show schema for a specific table"""
    try:
        from task_helper import get_from_supabase
        
        # Get one record to show structure
        records = get_from_supabase(table_name, limit=1)
        
        if records and len(records) > 0:
            record = records[0]
            print(f"\n📋 Table: {table_name}")
            print("  Columns:")
            for key, value in record.items():
                value_type = type(value).__name__
                value_preview = str(value)[:50] if value else "null"
                if len(str(value)) > 50:
                    value_preview += "..."
                print(f"    {key:<20} ({value_type:<10}) Example: {value_preview}")
        else:
            print(f"\n📋 Table: {table_name}")
            print("  ⚠️  No records found to analyze schema")
            
    except Exception as e:
        print(f"\n📋 Table: {table_name}")
        print(f"  ❌ Error: {e}")

def main():
    """Main function"""
    print("🗄️  CRM Pro v2.4 - Database Schema Information")
    print("=" * 60)
    
    # Core tables
    tables = [
        'users',
        'customers', 
        'tickets',
        'ticket_messages',
        'email_settings'
    ]
    
    try:
        from task_helper import get_from_supabase
        
        # Test connection first
        test = get_from_supabase('users', limit=1)
        if test is None:
            print("❌ Cannot connect to database")
            sys.exit(1)
        
        print("✅ Connected to Supabase database")
        
        # Show schema for each table
        for table in tables:
            show_table_schema(table)
        
        print("\n" + "=" * 60)
        print("📊 Schema analysis complete")
        print("🔗 Database: Supabase via task_helper.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()