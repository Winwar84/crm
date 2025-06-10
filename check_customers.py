#!/usr/bin/env python3
"""
Script to check current customers in the CRM database
"""
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import CustomerService

def main():
    """Check and display current customers"""
    print("🔍 Checking current customers in database...")
    
    try:
        customers = CustomerService.get_all()
        
        if not customers:
            print("✅ No customers found in database")
            return
        
        print(f"📊 Found {len(customers)} customers:")
        print("-" * 50)
        
        for customer in customers:
            print(f"ID: {customer.get('id', 'N/A')}")
            print(f"Name: {customer.get('name', 'N/A')}")
            print(f"Email: {customer.get('email', 'N/A')}")
            print(f"Status: {customer.get('status', 'N/A')}")
            print(f"Created: {customer.get('created_at', 'N/A')}")
            print("-" * 30)
        
    except Exception as e:
        print(f"❌ Error checking customers: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())