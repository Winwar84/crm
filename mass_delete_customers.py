#!/usr/bin/env python3
"""
Mass delete all customers from CRM database using MCP Supabase integration
"""
import sys
import os
import json

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import CustomerService, supabase
from mcp_helper import MCPSupabaseHelper

def delete_all_customers_direct():
    """Delete all customers using direct Supabase connection as fallback"""
    print("🗑️  Using direct Supabase connection to delete all customers...")
    
    try:
        # Get all customers first
        customers = CustomerService.get_all()
        
        if not customers:
            print("✅ No customers found to delete")
            return True
        
        print(f"📊 Found {len(customers)} customers to delete")
        
        # Delete all customers at once using Supabase
        result = supabase.table('customers').delete().neq('id', 0).execute()
        
        print(f"✅ Successfully deleted all customers")
        print(f"   Deletion result: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting customers directly: {e}")
        return False

def delete_all_customers_mcp():
    """Delete all customers using MCP server integration"""
    print("🔧 Attempting to delete all customers via MCP server...")
    
    try:
        # Use MCP query to delete all customers
        delete_query = "DELETE FROM customers WHERE id > 0"
        
        result = MCPSupabaseHelper.execute_query(delete_query)
        
        if result:
            print("✅ Successfully deleted all customers via MCP")
            return True
        else:
            print("⚠️  MCP deletion returned no result, falling back to direct method")
            return False
            
    except Exception as e:
        print(f"❌ Error deleting customers via MCP: {e}")
        print("⚠️  Falling back to direct deletion method")
        return False

def delete_customers_individual():
    """Delete customers one by one using CustomerService"""
    print("🔄 Deleting customers individually using CustomerService...")
    
    try:
        customers = CustomerService.get_all()
        
        if not customers:
            print("✅ No customers found to delete")
            return True
        
        print(f"📊 Found {len(customers)} customers to delete individually")
        
        deleted_count = 0
        failed_count = 0
        
        for customer in customers:
            customer_id = customer.get('id')
            customer_name = customer.get('name', 'Unknown')
            
            print(f"🗑️  Deleting customer ID {customer_id}: {customer_name}")
            
            success = CustomerService.delete(customer_id)
            
            if success:
                deleted_count += 1
                print(f"   ✅ Deleted customer ID {customer_id}")
            else:
                failed_count += 1
                print(f"   ❌ Failed to delete customer ID {customer_id}")
        
        print(f"\n📊 Deletion Summary:")
        print(f"   ✅ Successfully deleted: {deleted_count} customers")
        print(f"   ❌ Failed to delete: {failed_count} customers")
        
        return failed_count == 0
        
    except Exception as e:
        print(f"❌ Error in individual customer deletion: {e}")
        return False

def verify_deletion():
    """Verify that all customers have been deleted"""
    print("\n🔍 Verifying customer deletion...")
    
    try:
        customers = CustomerService.get_all()
        
        if not customers or len(customers) == 0:
            print("✅ Verification successful: No customers remain in database")
            return True
        else:
            print(f"⚠️  Warning: {len(customers)} customers still remain in database")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying deletion: {e}")
        return False

def main():
    """Main function to delete all customers"""
    print("🚀 Starting mass customer deletion process...")
    print("=" * 60)
    
    # Method 1: Try MCP deletion first
    success = delete_all_customers_mcp()
    
    if not success:
        print("\n" + "=" * 60)
        # Method 2: Try direct Supabase deletion
        success = delete_all_customers_direct()
    
    if not success:
        print("\n" + "=" * 60)
        # Method 3: Individual deletion as last resort
        success = delete_customers_individual()
    
    print("\n" + "=" * 60)
    
    # Verify deletion
    verification_success = verify_deletion()
    
    if success and verification_success:
        print("\n🎉 Mass customer deletion completed successfully!")
        return 0
    else:
        print("\n❌ Mass customer deletion encountered issues")
        return 1

if __name__ == "__main__":
    # Confirm deletion with user
    print("⚠️  WARNING: This will DELETE ALL CUSTOMERS from the CRM database!")
    print("This action cannot be undone.")
    
    confirm = input("\nType 'DELETE ALL CUSTOMERS' to proceed: ")
    
    if confirm == "DELETE ALL CUSTOMERS":
        exit(main())
    else:
        print("❌ Operation cancelled - confirmation text did not match")
        exit(1)