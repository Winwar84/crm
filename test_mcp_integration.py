#!/usr/bin/env python3
"""
Test script to verify MCP Supabase integration is working correctly
"""
import sys
import os
import json
from datetime import datetime

# Add app directory to path
sys.path.append('/home/winwar84/crm/app')

def test_task_helper_import():
    """Test if task_helper can be imported"""
    try:
        from task_helper import get_from_supabase, save_to_supabase, update_in_supabase, delete_from_supabase, count_in_supabase
        print("✅ task_helper import successful")
        return True
    except Exception as e:
        print(f"❌ task_helper import failed: {e}")
        return False

def test_database_connection():
    """Test database connection via MCP"""
    try:
        from task_helper import get_from_supabase
        
        # Test simple query
        result = get_from_supabase('tickets', limit=1)
        print(f"✅ Database connection test successful. Result type: {type(result)}")
        return True
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def test_email_settings_operations():
    """Test email settings operations via MCP"""
    try:
        from task_helper import get_from_supabase, save_to_supabase
        
        # Test retrieving email settings
        smtp_settings = get_from_supabase('email_settings', {'type': 'smtp'})
        imap_settings = get_from_supabase('email_settings', {'type': 'imap'})
        
        print(f"✅ Email settings retrieval successful")
        print(f"   SMTP settings found: {len(smtp_settings) if smtp_settings else 0}")
        print(f"   IMAP settings found: {len(imap_settings) if imap_settings else 0}")
        
        if smtp_settings:
            config = json.loads(smtp_settings[0]['config'])
            print(f"   SMTP Host: {config.get('host', 'Not set')}")
            print(f"   SMTP Port: {config.get('port', 'Not set')}")
            print(f"   SMTP Security: {config.get('security', 'Not set')}")
        
        return True
    except Exception as e:
        print(f"❌ Email settings operations failed: {e}")
        return False

def test_email_service_integration():
    """Test email service MCP integration"""
    try:
        from email_service import EmailService
        
        # Test SMTP config retrieval
        smtp_config = EmailService.get_smtp_config()
        imap_config = EmailService.get_imap_config()
        
        print(f"✅ Email service MCP integration successful")
        print(f"   SMTP config retrieved: {smtp_config is not None}")
        print(f"   IMAP config retrieved: {imap_config is not None}")
        
        if smtp_config:
            print(f"   SMTP enabled: {smtp_config.get('enabled', False)}")
        if imap_config:
            print(f"   IMAP enabled: {imap_config.get('enabled', False)}")
        
        return True
    except Exception as e:
        print(f"❌ Email service MCP integration failed: {e}")
        return False

def test_ticket_messages_operations():
    """Test ticket messages operations via MCP"""
    try:
        from task_helper import get_from_supabase, count_in_supabase
        
        # Test ticket messages count
        messages_count = count_in_supabase('ticket_messages')
        print(f"✅ Ticket messages operations successful")
        print(f"   Total ticket messages: {messages_count}")
        
        # Test retrieving recent messages
        recent_messages = get_from_supabase('ticket_messages', 
                                          order_by={'created_at': 'desc'}, 
                                          limit=5)
        print(f"   Recent messages retrieved: {len(recent_messages) if recent_messages else 0}")
        
        return True
    except Exception as e:
        print(f"❌ Ticket messages operations failed: {e}")
        return False

def test_database_services():
    """Test database service classes using MCP"""
    try:
        from database import TicketService, CustomerService, AgentService, UserService
        
        # Test ticket service
        tickets = TicketService.get_all()
        print(f"✅ Database services MCP integration successful")
        print(f"   Tickets retrieved: {len(tickets) if tickets else 0}")
        
        # Test customer service
        customers = CustomerService.get_all()
        print(f"   Customers retrieved: {len(customers) if customers else 0}")
        
        # Test agent service
        agents = AgentService.get_all()
        print(f"   Agents retrieved: {len(agents) if agents else 0}")
        
        # Test user service
        users = UserService.get_all_users()
        print(f"   Users retrieved: {len(users) if users else 0}")
        
        return True
    except Exception as e:
        print(f"❌ Database services MCP integration failed: {e}")
        return False

def test_mcp_helper():
    """Test MCP helper functionality"""
    try:
        from mcp_helper import MCPSupabaseHelper
        
        # Test getting email setting
        smtp_setting = MCPSupabaseHelper.get_email_setting('smtp')
        print(f"✅ MCP helper functionality test successful")
        print(f"   SMTP setting retrieved via helper: {smtp_setting is not None}")
        
        return True
    except Exception as e:
        print(f"❌ MCP helper functionality failed: {e}")
        return False

def main():
    """Run all MCP integration tests"""
    print("🔍 Testing MCP Supabase Integration")
    print("=" * 50)
    
    tests = [
        ("Task Helper Import", test_task_helper_import),
        ("Database Connection", test_database_connection),
        ("Email Settings Operations", test_email_settings_operations),
        ("Email Service Integration", test_email_service_integration),
        ("Ticket Messages Operations", test_ticket_messages_operations),
        ("Database Services", test_database_services),
        ("MCP Helper", test_mcp_helper)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Testing: {test_name}")
        print("-" * 30)
        
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All MCP Supabase integrations are working correctly!")
    else:
        print("⚠️  Some MCP integrations have issues that need attention.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)