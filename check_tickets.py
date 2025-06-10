#!/usr/bin/env python3
"""
Script to check current tickets in the CRM database
"""
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from database import TicketService

def main():
    """Check and display current tickets"""
    print("🎫 Checking current tickets in database...")
    
    try:
        tickets = TicketService.get_all()
        
        if not tickets:
            print("✅ No tickets found in database")
            return
        
        print(f"📊 Found {len(tickets)} tickets:")
        print("-" * 50)
        
        for ticket in tickets:
            print(f"ID: {ticket.get('id', 'N/A')}")
            print(f"Subject: {ticket.get('subject', 'N/A')}")
            print(f"Status: {ticket.get('status', 'N/A')}")
            print(f"Customer ID: {ticket.get('customer_id', 'N/A')}")
            print(f"Created: {ticket.get('created_at', 'N/A')}")
            print("-" * 30)
        
    except Exception as e:
        print(f"❌ Error checking tickets: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())