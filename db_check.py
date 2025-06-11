#!/usr/bin/env python3
"""
Quick Database Check for CRM Pro v2.4
Simple command-line tool for basic database verification
"""

import sys
import os

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def quick_check():
    """Quick database status check"""
    print("🔍 CRM Pro v2.4 - Quick Database Check")
    print("-" * 50)
    
    try:
        from task_helper import get_from_supabase, count_in_supabase
        
        # Test connection
        test = get_from_supabase('users', limit=1)
        if test is None:
            print("❌ Database connection failed")
            return False
        
        print("✅ Database connection: OK")
        
        # Quick counts
        tables = ['users', 'customers', 'tickets', 'ticket_messages', 'email_settings']
        total = 0
        
        for table in tables:
            count = count_in_supabase(table)
            total += count
            status = "✅" if count > 0 else "⚠️ "
            print(f"{status} {table}: {count} records")
        
        print(f"\n📊 Total records: {total}")
        
        # Quick health check
        if total > 0:
            print("✅ Database is healthy and populated")
        else:
            print("❌ Database appears empty")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("Usage: python3 db_check.py")
        print("Quick database integrity check for CRM Pro v2.4")
        return
    
    success = quick_check()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()