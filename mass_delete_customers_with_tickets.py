#!/usr/bin/env python3
"""
Mass delete all customers from CRM database, handling foreign key constraints
by deleting related tickets first
"""
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import CustomerService, TicketService, supabase

def delete_all_tickets():
    """Delete all tickets to remove foreign key constraints"""
    print("🎫 Deleting all tickets to remove foreign key constraints...")
    
    try:
        # Get all tickets first
        tickets = TicketService.get_all()
        
        if not tickets:
            print("✅ No tickets found to delete")
            return True
        
        print(f"📊 Found {len(tickets)} tickets to delete")
        
        # Delete all tickets at once using Supabase
        result = supabase.table('tickets').delete().neq('id', 0).execute()
        
        print(f"✅ Successfully deleted all tickets")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting tickets: {e}")
        return False

def delete_all_customers_cascade():
    """Delete all customers after removing constraints"""
    print("👥 Deleting all customers...")
    
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
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting customers: {e}")
        return False

def delete_customers_and_tickets_sql():
    """Use SQL to delete in proper order with CASCADE"""
    print("🔧 Using SQL approach to delete customers and tickets...")
    
    try:
        # Method 1: Try to delete customers with CASCADE if supported
        try:
            # First try to set NULL for ticket references
            result1 = supabase.rpc('exec_sql', {
                'sql': 'UPDATE tickets SET customer_id = NULL WHERE customer_id IS NOT NULL;'
            }).execute()
            print("✅ Updated tickets to remove customer references")
            
            # Then delete all customers
            result2 = supabase.table('customers').delete().neq('id', 0).execute()
            print("✅ Deleted all customers")
            
            return True
            
        except Exception as e:
            print(f"⚠️  SQL approach failed: {e}")
            
        # Method 2: Delete tickets first, then customers
        print("🔄 Fallback: Delete tickets first, then customers...")
        
        # Delete all tickets
        ticket_result = supabase.table('tickets').delete().neq('id', 0).execute()
        print("✅ Deleted all tickets")
        
        # Delete all customers
        customer_result = supabase.table('customers').delete().neq('id', 0).execute()
        print("✅ Deleted all customers")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in SQL deletion: {e}")
        return False

def verify_deletion():
    """Verify that all customers and tickets have been deleted"""
    print("\n🔍 Verifying deletion...")
    
    try:
        customers = CustomerService.get_all()
        tickets = TicketService.get_all()
        
        customer_count = len(customers) if customers else 0
        ticket_count = len(tickets) if tickets else 0
        
        if customer_count == 0 and ticket_count == 0:
            print("✅ Verification successful: No customers or tickets remain in database")
            return True
        else:
            print(f"⚠️  Warning: {customer_count} customers and {ticket_count} tickets still remain")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying deletion: {e}")
        return False

def main():
    """Main function to delete all customers and tickets"""
    print("🚀 Starting mass customer and ticket deletion process...")
    print("=" * 60)
    
    # Method 1: Try SQL approach first
    success = delete_customers_and_tickets_sql()
    
    if not success:
        print("\n" + "=" * 60)
        # Method 2: Delete tickets first, then customers separately
        ticket_success = delete_all_tickets()
        
        if ticket_success:
            customer_success = delete_all_customers_cascade()
            success = customer_success
        else:
            success = False
    
    print("\n" + "=" * 60)
    
    # Verify deletion
    verification_success = verify_deletion()
    
    if success and verification_success:
        print("\n🎉 Mass deletion completed successfully!")
        return 0
    else:
        print("\n❌ Mass deletion encountered issues")
        return 1

if __name__ == "__main__":
    # Confirm deletion with user
    print("⚠️  WARNING: This will DELETE ALL CUSTOMERS AND TICKETS from the CRM database!")
    print("This action cannot be undone.")
    
    confirm = input("\nType 'DELETE ALL DATA' to proceed: ")
    
    if confirm == "DELETE ALL DATA":
        exit(main())
    else:
        print("❌ Operation cancelled - confirmation text did not match")
        exit(1)