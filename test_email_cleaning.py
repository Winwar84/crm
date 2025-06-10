#!/usr/bin/env python3
"""
Test per la funzione di pulizia dei messaggi email
"""
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from email_service import EmailService

def test_clean_reply_message():
    """Test della funzione clean_reply_message"""
    
    # Test 1: con un messaggio tipico di risposta
    test_message = """Questo è il mio nuovo messaggio!

-----Messaggio originale-----
Da: CRM PRO <crmpro84@gmail.com> 
Inviato: martedì 10 giugno 2025 12:15
A: matteo.vinciguerra@vinciinside.it
Oggetto: Re: Ticket #410 - Test Ticket Email

Gentile Matteo Test,
            
Ha ricevuto un nuovo messaggio per il ticket #410.

Da: Administrator (winwar84@admin.local)
Data: 2025-06-10T10:14:47.705444

Messaggio:
ciao

---
Questo è un messaggio automatico del sistema CRM.
Ticket ID: #410
Titolo: Test Ticket Email
Stato: Open
Priorità: Medium

Per rispondere, basta rispondere a questa email.

Cordiali saluti,
Il Team di Supporto"""

    print("📧 Test 1 - Messaggio originale:")
    print(f"'{test_message}'")
    print("\n" + "="*50 + "\n")
    
    cleaned = EmailService.clean_reply_message(test_message)
    
    print("✅ Messaggio pulito:")
    print(f"'{cleaned}'")
    print(f"\nLunghezza originale: {len(test_message)}")
    print(f"Lunghezza pulita: {len(cleaned)}")
    
    # Test 2: con nuovo template (senza CRM text)
    test_message2 = """Solo questo messaggio

---
Ticket ID: #410
Titolo: Test Ticket Email
Stato: Open
Priorità: Medium"""

    print("\n" + "="*50 + "\n")
    print("📧 Test 2 - Messaggio con CRM separator:")
    print(f"'{test_message2}'")
    
    cleaned2 = EmailService.clean_reply_message(test_message2)
    
    print("✅ Messaggio pulito:")
    print(f"'{cleaned2}'")

if __name__ == "__main__":
    test_clean_reply_message()