#!/usr/bin/env python3
"""
Script to analyze local SQLite database and compare with Supabase data.
This script helps identify what data exists locally that might need migration.
"""

import sqlite3
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

def get_supabase_data():
    """Get data from Supabase for comparison"""
    try:
        # Import Supabase connection from the app
        import sys
        sys.path.append('/home/winwar84/crm/app')
        from task_helper import get_from_supabase, count_in_supabase
        
        print("🔗 Connecting to Supabase...")
        
        # Get counts from each table
        supabase_data = {}
        tables = ['tickets', 'customers', 'users', 'agents', 'ticket_messages', 'email_settings']
        
        for table in tables:
            try:
                count = count_in_supabase(table)
                data = get_from_supabase(table, limit=5)  # Get sample data
                supabase_data[table] = {
                    'count': count,
                    'sample_data': data if data else []
                }
                print(f"✅ {table}: {count} records")
            except Exception as e:
                print(f"⚠️  {table}: Error accessing table - {e}")
                supabase_data[table] = {'count': 0, 'sample_data': [], 'error': str(e)}
        
        return supabase_data
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return None

def analyze_sqlite_tables(conn):
    """Analyze all tables in the SQLite database"""
    print("\n" + "="*60)
    print("📊 ANALYZING LOCAL SQLITE DATABASE")
    print("="*60)
    
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    if not tables:
        print("❌ No tables found in SQLite database")
        return {}
    
    sqlite_data = {}
    
    for table_row in tables:
        table_name = table_row[0]
        print(f"\n📋 TABLE: {table_name}")
        print("-" * 40)
        
        try:
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name});")
            schema = cursor.fetchall()
            
            print("🏗️  Schema:")
            for col in schema:
                col_info = f"  - {col[1]} ({col[2]})"
                if col[5]:  # Primary key
                    col_info += " [PRIMARY KEY]"
                if col[3]:  # NOT NULL
                    col_info += " [NOT NULL]"
                print(col_info)
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            count = cursor.fetchone()[0]
            print(f"\n📊 Row count: {count}")
            
            # Get sample data (first 5 rows)
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
            sample_rows = cursor.fetchall()
            
            sample_data = []
            if sample_rows:
                print("\n🔍 Sample data (first 5 rows):")
                for i, row in enumerate(sample_rows, 1):
                    row_dict = dict(row)
                    sample_data.append(row_dict)
                    print(f"  Row {i}:")
                    for key, value in row_dict.items():
                        # Truncate long values
                        display_value = str(value)
                        if len(display_value) > 50:
                            display_value = display_value[:47] + "..."
                        print(f"    {key}: {display_value}")
            else:
                print("\n🔍 No data in this table")
            
            sqlite_data[table_name] = {
                'count': count,
                'schema': [dict(zip(['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'], col)) for col in schema],
                'sample_data': sample_data
            }
            
        except Exception as e:
            print(f"❌ Error analyzing table {table_name}: {e}")
            sqlite_data[table_name] = {'error': str(e)}
    
    return sqlite_data

def compare_with_supabase(sqlite_data, supabase_data):
    """Compare SQLite data with Supabase data"""
    print("\n" + "="*60)
    print("🔄 COMPARISON: SQLITE vs SUPABASE")
    print("="*60)
    
    if not supabase_data:
        print("❌ Cannot compare - Supabase data not available")
        return
    
    # Compare each table
    all_tables = set(list(sqlite_data.keys()) + list(supabase_data.keys()))
    
    migration_needed = []
    
    for table in sorted(all_tables):
        print(f"\n📋 TABLE: {table}")
        print("-" * 40)
        
        sqlite_count = sqlite_data.get(table, {}).get('count', 0)
        supabase_count = supabase_data.get(table, {}).get('count', 0)
        
        print(f"SQLite records:  {sqlite_count}")
        print(f"Supabase records: {supabase_count}")
        
        if sqlite_count > 0 and supabase_count == 0:
            print("🚨 MIGRATION NEEDED: Data exists in SQLite but not in Supabase")
            migration_needed.append(table)
        elif sqlite_count > supabase_count:
            print(f"⚠️  POTENTIAL MIGRATION: SQLite has {sqlite_count - supabase_count} more records")
            migration_needed.append(table)
        elif sqlite_count == supabase_count and sqlite_count > 0:
            print("✅ Data counts match")
        elif sqlite_count == 0 and supabase_count > 0:
            print("ℹ️  Data only exists in Supabase")
        elif sqlite_count == 0 and supabase_count == 0:
            print("ℹ️  No data in either database")
    
    if migration_needed:
        print(f"\n🚨 TABLES REQUIRING MIGRATION: {', '.join(migration_needed)}")
    else:
        print("\n✅ No migration appears to be needed")

def show_migration_candidates(sqlite_data):
    """Show tables that have data and might need migration"""
    print("\n" + "="*60)
    print("🎯 MIGRATION CANDIDATES")
    print("="*60)
    
    candidates = []
    for table, data in sqlite_data.items():
        if isinstance(data, dict) and data.get('count', 0) > 0:
            candidates.append((table, data['count']))
    
    if candidates:
        print("\n📋 Tables with data that might need migration:")
        for table, count in sorted(candidates, key=lambda x: x[1], reverse=True):
            print(f"  • {table}: {count} records")
            
            # Show sample record structure for important tables
            if table in ['tickets', 'customers', 'users', 'ticket_messages'] and sqlite_data[table]['sample_data']:
                sample = sqlite_data[table]['sample_data'][0]
                print(f"    Sample fields: {', '.join(sample.keys())}")
    else:
        print("\n✅ No tables with data found")

def export_sqlite_data_summary(sqlite_data, supabase_data):
    """Export a summary to JSON file for reference"""
    summary = {
        'analysis_date': datetime.now().isoformat(),
        'sqlite_database': SQLITE_DB_PATH,
        'sqlite_tables': {},
        'supabase_tables': {},
        'migration_recommendations': []
    }
    
    # Process SQLite data
    for table, data in sqlite_data.items():
        if isinstance(data, dict) and 'count' in data:
            summary['sqlite_tables'][table] = {
                'count': data['count'],
                'has_data': data['count'] > 0,
                'fields': [col['name'] for col in data.get('schema', [])]
            }
    
    # Process Supabase data
    if supabase_data:
        for table, data in supabase_data.items():
            if isinstance(data, dict):
                summary['supabase_tables'][table] = {
                    'count': data.get('count', 0),
                    'has_data': data.get('count', 0) > 0,
                    'error': data.get('error')
                }
    
    # Generate recommendations
    for table in summary['sqlite_tables']:
        sqlite_count = summary['sqlite_tables'][table]['count']
        supabase_count = summary['supabase_tables'].get(table, {}).get('count', 0)
        
        if sqlite_count > 0 and supabase_count == 0:
            summary['migration_recommendations'].append({
                'table': table,
                'action': 'full_migration',
                'reason': f'{sqlite_count} records in SQLite, 0 in Supabase'
            })
        elif sqlite_count > supabase_count:
            summary['migration_recommendations'].append({
                'table': table,
                'action': 'partial_migration',
                'reason': f'{sqlite_count} records in SQLite, {supabase_count} in Supabase'
            })
    
    # Save to file
    output_file = '/home/winwar84/crm/sqlite_analysis_summary.json'
    try:
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\n💾 Analysis summary saved to: {output_file}")
    except Exception as e:
        print(f"❌ Error saving summary: {e}")

def main():
    """Main analysis function"""
    print("🔍 SQLite Database Analysis Tool")
    print("=" * 60)
    
    # Check if SQLite database exists
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ SQLite database not found at: {SQLITE_DB_PATH}")
        return
    
    print(f"📁 Analyzing database: {SQLITE_DB_PATH}")
    
    # Connect to SQLite
    conn = connect_to_sqlite()
    if not conn:
        return
    
    try:
        # Analyze SQLite database
        sqlite_data = analyze_sqlite_tables(conn)
        
        # Get Supabase data for comparison
        supabase_data = get_supabase_data()
        
        # Compare the two databases
        compare_with_supabase(sqlite_data, supabase_data)
        
        # Show migration candidates
        show_migration_candidates(sqlite_data)
        
        # Export summary
        export_sqlite_data_summary(sqlite_data, supabase_data)
        
    finally:
        conn.close()
        print("\n✅ Analysis complete!")

if __name__ == "__main__":
    main()