import smtplib
import imaplib
import email
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from database import TicketService, CustomerService
import json
import re
from datetime import datetime
import time
import threading

def sanitize_config_for_logging(config):
    """Rimuove dati sensibili dalla configurazione per il logging sicuro"""
    if not config or not isinstance(config, dict):
        return config
    
    sanitized = config.copy()
    # Rimuovi campi sensibili
    sensitive_fields = ['password', 'api_key', 'secret', 'token', 'auth']
    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = '***HIDDEN***'
    return sanitized

class EmailService:
    @staticmethod
    def get_smtp_config():
        """Recupera la configurazione SMTP dal database usando MCP"""
        try:
            from task_helper import get_from_supabase
            import json
            
            # Usa MCP helper per recuperare
            result = get_from_supabase('email_settings', {'type': 'smtp'})
            
            if result and len(result) > 0:
                config_data = result[0]
                # Decodifica la configurazione JSON
                if config_data.get('config'):
                    config = json.loads(config_data['config'])
                    print(f"📧 Configurazione SMTP recuperata via MCP: {sanitize_config_for_logging(config)}")
                    return config
                    
            print("❌ Nessuna configurazione SMTP trovata")
            return None
                    
        except Exception as e:
            print(f"❌ Errore nel recupero configurazione SMTP: {e}")
            return None
    
    @staticmethod
    def get_imap_config():
        """Recupera la configurazione IMAP dal database usando MCP"""
        try:
            from task_helper import get_from_supabase
            import json
            
            # Usa MCP helper per recuperare
            result = get_from_supabase('email_settings', {'type': 'imap'})
            
            if result and len(result) > 0:
                config_data = result[0]
                # Decodifica la configurazione JSON
                if config_data.get('config'):
                    config = json.loads(config_data['config'])
                    print(f"📬 Configurazione IMAP recuperata via MCP: {sanitize_config_for_logging(config)}")
                    return config
                    
            print("❌ Nessuna configurazione IMAP trovata")
            return None
                    
        except Exception as e:
            print(f"❌ Errore nel recupero configurazione IMAP: {e}")
            return None
    
    @staticmethod
    def save_smtp_config(config):
        """Salva la configurazione SMTP nel database usando MCP"""
        try:
            from task_helper import save_to_supabase
            import json
            
            print(f"💾 Tentativo salvataggio SMTP config via MCP: {sanitize_config_for_logging(config)}")
            
            # Prepara i dati per il database
            data = {
                'type': 'smtp',
                'config': json.dumps(config),
                'is_active': True
            }
            
            # Usa MCP helper per salvare
            result = save_to_supabase('email_settings', data, on_conflict='type')
            
            if result:
                print(f"✅ Configurazione SMTP salvata via MCP: {sanitize_config_for_logging(result)}")
                return True
            else:
                print("❌ Errore nel salvataggio via MCP")
                return False
                
        except Exception as e:
            print(f"❌ Errore nel salvataggio configurazione SMTP: {e}")
            return False
    
    @staticmethod
    def save_imap_config(config):
        """Salva la configurazione IMAP nel database usando MCP"""
        try:
            from task_helper import save_to_supabase
            import json
            
            print(f"📬 Tentativo salvataggio IMAP config via MCP: {sanitize_config_for_logging(config)}")
            
            # Prepara i dati per il database
            data = {
                'type': 'imap',
                'config': json.dumps(config),
                'is_active': True
            }
            
            # Usa MCP helper per salvare
            result = save_to_supabase('email_settings', data, on_conflict='type')
            
            if result:
                print(f"✅ Configurazione IMAP salvata via MCP: {sanitize_config_for_logging(result)}")
                return True
            else:
                print("❌ Errore nel salvataggio via MCP")
                return False
                
        except Exception as e:
            print(f"❌ Errore nel salvataggio configurazione IMAP: {e}")
            return False
    
    @staticmethod
    def test_smtp_connection(config):
        """Testa la connessione SMTP"""
        try:
            if config['security'] == 'SSL':
                server = smtplib.SMTP_SSL(config['host'], int(config['port']))
            else:
                server = smtplib.SMTP(config['host'], int(config['port']))
                if config['security'] == 'TLS':
                    server.starttls()
            
            server.login(config['username'], config['password'])
            server.quit()
            return True, "Connessione SMTP riuscita!"
        except Exception as e:
            return False, f"Errore connessione SMTP: {str(e)}"
    
    @staticmethod
    def test_imap_connection(config):
        """Testa la connessione IMAP"""
        try:
            if config['security'] == 'SSL':
                mail = imaplib.IMAP4_SSL(config['host'], int(config['port']))
            else:
                mail = imaplib.IMAP4(config['host'], int(config['port']))
                if config['security'] == 'TLS':
                    mail.starttls()
            
            mail.login(config['username'], config['password'])
            mail.select(config.get('folder', 'INBOX'))
            mail.logout()
            return True, "Connessione IMAP riuscita!"
        except Exception as e:
            return False, f"Errore connessione IMAP: {str(e)}"
    
    @staticmethod
    def save_email_template(template_type, subject, body):
        """Salva un template email nel database"""
        try:
            from task_helper import save_to_supabase
            
            result = save_to_supabase('email_templates', {
                'type': template_type,
                'subject': subject,
                'body': body
            }, on_conflict='type')
            
            print(f"Template {template_type} salvato: {result}")
            return bool(result)
            
        except Exception as e:
            print(f"Errore nel salvataggio template {template_type}: {e}")
            return False
    
    @staticmethod
    def get_email_template(template_type):
        """Recupera un template email dal database"""
        try:
            from task_helper import get_from_supabase
            
            templates = get_from_supabase('email_templates', {'type': template_type})
            if templates:
                return templates[0]
            return None
        except Exception as e:
            print(f"Errore nel recupero template {template_type}: {e}")
            return None
    
    @staticmethod
    def send_email(to_email, subject, body, config=None):
        """Invia un email utilizzando la configurazione SMTP"""
        if not config:
            config = EmailService.get_smtp_config()
        
        if not config:
            return False, "Configurazione SMTP non trovata"
        
        try:
            # Crea il messaggio
            msg = MIMEMultipart()
            msg['From'] = f"{config.get('from_name', 'CRM Pro')} <{config['from_email']}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Corpo del messaggio
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Connessione al server SMTP
            if config['security'] == 'SSL':
                server = smtplib.SMTP_SSL(config['host'], int(config['port']))
            else:
                server = smtplib.SMTP(config['host'], int(config['port']))
                if config['security'] == 'TLS':
                    server.starttls()
            
            server.login(config['username'], config['password'])
            server.send_message(msg)
            server.quit()
            
            return True, "Email inviata con successo"
        except Exception as e:
            return False, f"Errore nell'invio email: {str(e)}"
    
    @staticmethod
    def get_email_template(template_type):
        """Recupera un template email"""
        try:
            from task_helper import get_from_supabase
            
            templates = get_from_supabase('email_templates', {'type': template_type})
            if templates:
                return templates[0]
            return None
        except Exception as e:
            print(f"Errore nel recupero template: {e}")
            return None
    
    @staticmethod
    def save_email_template(template_type, subject, body):
        """Salva un template email"""
        try:
            from task_helper import save_to_supabase
            
            save_to_supabase('email_templates', {
                'type': template_type,
                'subject': subject,
                'body': body
            }, on_conflict='type')
            return True
        except Exception as e:
            print(f"Errore nel salvataggio template: {e}")
            return False
    
    @staticmethod
    def send_new_ticket_notification(ticket_data):
        """Invia notifica per nuovo ticket"""
        template = EmailService.get_email_template('new_ticket')
        if not template:
            # Template predefinito
            subject = "Nuovo Ticket #{ticket_id} - {ticket_title}"
            body = """Gentile {customer_name},

Il suo ticket #{ticket_id} "{ticket_title}" è stato creato con successo.

Descrizione: {ticket_description}
Priorità: {ticket_priority}
Stato: {ticket_status}

La terremo aggiornata sui progressi.

Cordiali saluti,
Il Team di Supporto"""
        else:
            subject = template['subject']
            body = template['body']
        
        # Sostituisci i placeholder
        subject = subject.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', ''),
            ticket_description=ticket_data.get('description', ''),
            ticket_priority=ticket_data.get('priority', ''),
            ticket_status=ticket_data.get('status', 'Open')
        )
        
        body = body.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', ''),
            ticket_description=ticket_data.get('description', ''),
            ticket_priority=ticket_data.get('priority', ''),
            ticket_status=ticket_data.get('status', 'Open')
        )
        
        return EmailService.send_email(ticket_data['customer_email'], subject, body)
    
    @staticmethod
    def send_ticket_update_notification(ticket_data, update_message=""):
        """Invia notifica per aggiornamento ticket"""
        template = EmailService.get_email_template('update_ticket')
        if not template:
            # Template predefinito
            subject = "Aggiornamento Ticket #{ticket_id}"
            body = """Gentile {customer_name},

Il suo ticket #{ticket_id} "{ticket_title}" è stato aggiornato.

Nuovo stato: {ticket_status}
{update_message}

Cordiali saluti,
Il Team di Supporto"""
        else:
            subject = template['subject']
            body = template['body']
        
        # Sostituisci i placeholder
        subject = subject.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', ''),
            ticket_status=ticket_data.get('status', ''),
            update_message=update_message
        )
        
        body = body.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', ''),
            ticket_status=ticket_data.get('status', ''),
            update_message=update_message
        )
        
        return EmailService.send_email(ticket_data['customer_email'], subject, body)
    
    @staticmethod
    def send_ticket_resolved_notification(ticket_data):
        """Invia notifica specifica quando ticket è risolto"""
        template = EmailService.get_email_template('resolved_ticket')
        if not template:
            # Template cyberpunk uniformato per risoluzione
            subject = "🎯 Ticket #{ticket_id} - RISOLTO"
            body = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #00ffff 0%, #0066cc 100%); color: white; padding: 30px 25px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 30px 25px; line-height: 1.6; color: #333; }}
        .ticket-info {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ffff; }}
        .status-resolved {{ color: #00ff41; font-weight: bold; font-size: 18px; }}
        .footer {{ background: #f8f9fa; padding: 20px 25px; text-align: center; color: #666; font-size: 14px; }}
        .btn {{ display: inline-block; background: #00ffff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: 500; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 TICKET RISOLTO</h1>
        </div>
        <div class="content">
            <p>Gentile <strong>{customer_name}</strong>,</p>
            
            <p>Siamo lieti di informarla che il suo ticket è stato <span class="status-resolved">RISOLTO</span> con successo!</p>
            
            <div class="ticket-info">
                <strong>Ticket #{ticket_id}:</strong> {ticket_title}<br>
                <strong>Stato:</strong> <span class="status-resolved">✅ RISOLTO</span><br>
                <strong>Priorità:</strong> {priority}
            </div>
            
            <p>La problematica è stata gestita dal nostro team tecnico e dovrebbe ora essere completamente risolta.</p>
            
            <p><strong>🔄 Cosa succede ora?</strong></p>
            <ul>
                <li>Il ticket è stato marcato come risolto</li>
                <li>Se ha ancora problemi, può rispondere a questa email</li>
                <li>La sua risposta riaprirà automaticamente il ticket</li>
                <li>Il nostro team sarà immediatamente notificato</li>
            </ul>
            
            <p style="margin-top: 25px;">
                <strong>📧 Serve altro supporto?</strong><br>
                Risponda direttamente a questa email e il ticket sarà riaperto automaticamente.
            </p>
        </div>
        <div class="footer">
            <p>🤖 <strong>CRM Pro v2.7 - Cyberpunk Command Center</strong></p>
            <p>Questo è un messaggio automatico del sistema di supporto</p>
        </div>
    </div>
</body>
</html>
"""
        else:
            subject = template['subject']
            body = template['body']
        
        # Sostituisci i placeholder
        subject = subject.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', '')
        )
        
        body = body.format(
            ticket_id=ticket_data.get('id', ''),
            ticket_title=ticket_data.get('title', ''),
            customer_name=ticket_data.get('customer_name', ''),
            priority=ticket_data.get('priority', 'Media'),
            ticket_status=ticket_data.get('status', '')
        )
        
        print(f"📧 Invio email risoluzione ticket #{ticket_data.get('id')} a {ticket_data.get('customer_email')}")
        return EmailService.send_email(ticket_data['customer_email'], subject, body)
    
    @staticmethod
    def clean_reply_message(body):
        """Pulisce il messaggio email estraendo solo la parte nuova della risposta"""
        if not body:
            return ""
        
        # Pattern comuni per identificare l'inizio dell'email originale
        dividers = [
            r'-----Messaggio originale-----',
            r'-----Original Message-----',
            r'-------- Messaggio originale --------',
            r'On .* wrote:',
            r'Il .* ha scritto:',
            r'From:.*\n.*To:.*\n.*Subject:',
            r'Da:.*\n.*A:.*\n.*Oggetto:',
            r'---\nQuesto è un messaggio automatico del sistema CRM\.',
            r'---.*CRM.*Ticket.*ID.*#\d+',
            r'---\nTicket ID: #\d+'
        ]
        
        # Cerca il primo divider e taglia tutto quello che viene dopo
        for pattern in dividers:
            match = re.search(pattern, body, re.IGNORECASE | re.MULTILINE | re.DOTALL)
            if match:
                body = body[:match.start()]
                break
        
        # Rimuovi spazi vuoti e righe vuote alla fine
        body = body.strip()
        
        # Rimuovi righe vuote eccessive (più di 2 consecutive)
        body = re.sub(r'\n{3,}', '\n\n', body)
        
        return body
    
    @staticmethod
    def parse_email_for_ticket(email_msg):
        """Analizza un email per creare un ticket"""
        try:
            # Decodifica l'oggetto
            subject = ""
            if email_msg["Subject"]:
                subject_decoded = decode_header(email_msg["Subject"])[0]
                if isinstance(subject_decoded[0], bytes):
                    subject = subject_decoded[0].decode(subject_decoded[1] or 'utf-8')
                else:
                    subject = subject_decoded[0]
            
            # Estrai l'email del mittente
            from_email = email_msg.get("From", "")
            # Estrai solo l'indirizzo email
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', from_email)
            sender_email = email_match.group() if email_match else from_email
            
            # Estrai il nome del mittente
            sender_name = from_email.replace(f"<{sender_email}>", "").strip()
            if not sender_name or sender_name == sender_email:
                sender_name = sender_email.split('@')[0]
            
            # Estrai il corpo del messaggio
            body = ""
            if email_msg.is_multipart():
                for part in email_msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        break
            else:
                body = email_msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            
            # Pulisci il corpo del messaggio
            body = body.strip()
            
            return {
                'title': subject or 'Email senza oggetto',
                'description': body or 'Email senza contenuto',
                'customer_email': sender_email,
                'customer_name': sender_name,
                'priority': 'Medium',
                'status': 'Open'
            }
        except Exception as e:
            print(f"Errore nel parsing email: {e}")
            return None
    
    @staticmethod
    def check_emails_and_create_tickets():
        """Controlla le email in arrivo e crea ticket automaticamente"""
        config = EmailService.get_imap_config()
        print(f"🔍 IMAP check - Config: {sanitize_config_for_logging(config)}")
        
        if not config:
            print("❌ Nessuna configurazione IMAP trovata")
            return
            
        if not config.get('enabled', False):
            print("❌ IMAP non abilitato")
            return
        
        try:
            # Connessione IMAP
            if config['security'] == 'SSL':
                mail = imaplib.IMAP4_SSL(config['host'], int(config['port']))
            else:
                mail = imaplib.IMAP4(config['host'], int(config['port']))
                if config['security'] == 'TLS':
                    mail.starttls()
            
            mail.login(config['username'], config['password'])
            mail.select(config.get('folder', 'INBOX'))
            
            # Cerca email non lette
            status, messages = mail.search(None, 'UNSEEN')
            email_ids = messages[0].split()
            
            print(f"📬 Trovate {len(email_ids)} email non lette")
            
            for email_id in email_ids:
                try:
                    # Scarica l'email
                    status, msg_data = mail.fetch(email_id, '(RFC822)')
                    email_msg = email.message_from_bytes(msg_data[0][1])
                    
                    # Verifica se è una risposta a un ticket esistente
                    subject = ""
                    if email_msg["Subject"]:
                        subject_decoded = decode_header(email_msg["Subject"])[0]
                        if isinstance(subject_decoded[0], bytes):
                            subject = subject_decoded[0].decode(subject_decoded[1] or 'utf-8')
                        else:
                            subject = subject_decoded[0]
                    
                    print(f"📧 Email trovata - Subject: '{subject}' - From: '{email_msg.get('From', '')}'")
                    
                    # Controlla se è una risposta a un ticket
                    ticket_match = re.search(r'(?:Re:\s*)?Ticket\s*#(\d+)', subject, re.IGNORECASE)
                    
                    print(f"🔍 Ticket match: {ticket_match}")
                    
                    if ticket_match:
                        # È una risposta a un ticket esistente
                        ticket_id = int(ticket_match.group(1))
                        
                        # Verifica che il ticket esista
                        from task_helper import get_from_supabase
                        
                        tickets = get_from_supabase('tickets', {'id': ticket_id})
                        
                        if tickets:
                            ticket = tickets[0]
                            current_status = ticket.get('status', '')
                            
                            # Estrai info mittente
                            from_email = email_msg.get("From", "")
                            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', from_email)
                            sender_email = email_match.group() if email_match else from_email
                            sender_name = from_email.replace(f"<{sender_email}>", "").strip()
                            if not sender_name or sender_name == sender_email:
                                sender_name = sender_email.split('@')[0]
                            
                            # Estrai corpo messaggio
                            body = ""
                            if email_msg.is_multipart():
                                for part in email_msg.walk():
                                    if part.get_content_type() == "text/plain":
                                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                                        break
                            else:
                                body = email_msg.get_payload(decode=True).decode('utf-8', errors='ignore')
                            
                            # Pulisci il messaggio estraendo solo la parte nuova
                            body = EmailService.clean_reply_message(body)
                            
                            # 🔄 AUTO-RIAPERTURA: Se ticket è RISOLTO e cliente risponde → RIAPRI
                            if current_status == 'Resolved':
                                print(f"🔄 RIAPERTURA AUTOMATICA: Ticket #{ticket_id} era RISOLTO, cliente ha risposto")
                                
                                # Aggiorna stato ticket a "In Progress"
                                from task_helper import update_in_supabase
                                reopen_result = update_in_supabase('tickets', 
                                                                 {'id': ticket_id}, 
                                                                 {'status': 'In Progress'})
                                
                                if reopen_result:
                                    print(f"✅ Ticket #{ticket_id} riaperto automaticamente: Resolved → In Progress")
                                    
                                    # Aggiungi messaggio di sistema per notificare la riapertura
                                    system_message = {
                                        'ticket_id': ticket_id,
                                        'sender_type': 'system',
                                        'sender_name': 'Sistema CRM',
                                        'sender_email': 'system@crm.local',
                                        'message_text': f"🔄 Ticket riaperto automaticamente - Il cliente {sender_name} ha risposto a un ticket risolto",
                                        'is_internal': True,
                                        'email_message_id': ''
                                    }
                                    
                                    from task_helper import save_to_supabase
                                    save_to_supabase('ticket_messages', system_message)
                                else:
                                    print(f"❌ Errore nella riapertura del ticket #{ticket_id}")
                            
                            # Crea un messaggio per il ticket esistente
                            message_data = {
                                'ticket_id': ticket_id,
                                'sender_type': 'customer',
                                'sender_name': sender_name,
                                'sender_email': sender_email,
                                'message_text': body.strip(),
                                'is_internal': False,
                                'email_message_id': email_msg.get('Message-ID', '')
                            }
                            
                            from task_helper import save_to_supabase
                            message_result = save_to_supabase('ticket_messages', message_data)
                            
                            if message_result:
                                print(f"📬 Messaggio aggiunto al ticket #{ticket_id} da {sender_email}")
                                
                                # NON inviare notifica email agli agenti per risposte clienti
                                # I messaggi appaiono solo nella chat del CRM
                            
                            # Marca l'email come letta
                            mail.store(email_id, '+FLAGS', '\\Seen')
                            continue
                    
                    # Non è una risposta, crea un nuovo ticket
                    ticket_data = EmailService.parse_email_for_ticket(email_msg)
                    
                    if ticket_data:
                        # Verifica se il cliente esiste già
                        customers = CustomerService.get_all()
                        customer = None
                        for c in customers:
                            if c['email'] == ticket_data['customer_email']:
                                customer = c
                                break
                        
                        # Crea il cliente se non esiste
                        if not customer:
                            customer_data = {
                                'name': ticket_data['customer_name'],
                                'email': ticket_data['customer_email'],
                                'status': 'Active'
                            }
                            customer = CustomerService.create(customer_data)
                        
                        if customer:
                            ticket_data['customer_id'] = customer['id']
                        
                        # Crea il ticket
                        new_ticket = TicketService.create(ticket_data)
                        
                        if new_ticket:
                            print(f"Ticket creato da email: #{new_ticket['id']} - {ticket_data['title']}")
                            
                            # Invia conferma al cliente
                            EmailService.send_new_ticket_notification(new_ticket)
                        
                        # Marca l'email come letta
                        mail.store(email_id, '+FLAGS', '\\Seen')
                
                except Exception as e:
                    print(f"Errore nel processare email {email_id}: {e}")
                    continue
            
            mail.logout()
            
        except Exception as e:
            print(f"Errore nel controllo email: {e}")
    
    @staticmethod
    def send_ticket_message_to_customer(ticket, message):
        """Invia un messaggio del ticket al cliente via email"""
        try:
            config = EmailService.get_smtp_config()
            if not config:
                print("Configurazione SMTP non trovata")
                return False
            
            # Prepara il contenuto email
            subject = f"Re: Ticket #{ticket['id']} - {ticket['title']}"
            
            # Template HTML cyberpunk uniformato
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #00ffff 0%, #0066cc 100%); color: white; padding: 30px 25px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 30px 25px; line-height: 1.6; color: #333; }}
        .message-box {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ffff; }}
        .ticket-info {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ffff; }}
        .footer {{ background: #f8f9fa; padding: 20px 25px; text-align: center; color: #666; font-size: 14px; }}
        .status-badge {{ background: #00ffff; color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💬 NUOVO MESSAGGIO</h1>
        </div>
        <div class="content">
            <p>Gentile <strong>{ticket['customer_name']}</strong>,</p>
            
            <p>Hai ricevuto un nuovo messaggio per il tuo ticket:</p>
            
            <div class="ticket-info">
                <strong>Ticket #{ticket['id']}:</strong> {ticket['title']}<br>
                <strong>Stato:</strong> <span class="status-badge">{ticket['status']}</span><br>
                <strong>Priorità:</strong> {ticket['priority']}
            </div>
            
            <div class="message-box">
                <strong>📨 Messaggio dal supporto:</strong><br><br>
                {message['message_text'].replace(chr(10), '<br>')}
            </div>
            
            <p><strong>🔄 Per rispondere:</strong></p>
            <ul>
                <li>Rispondi direttamente a questa email</li>
                <li>Il tuo messaggio sarà aggiunto automaticamente al ticket</li>
                <li>Il nostro team riceverà immediatamente la notifica</li>
            </ul>
        </div>
        <div class="footer">
            <p>🤖 <strong>CRM Pro v2.7 - Cyberpunk Command Center</strong></p>
            <p>Questo è un messaggio automatico del sistema di supporto</p>
        </div>
    </div>
</body>
</html>
                    
                    <!-- Ticket Details -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 30px 40px;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">📋 Dettagli Ticket</h3>
                            <table width="100%" cellpadding="8" cellspacing="0">
                                <tr>
                                    <td style="color: #666; font-size: 14px; width: 30%;"><strong>ID Ticket:</strong></td>
                                    <td style="color: #333; font-size: 14px;">#{ticket['id']}</td>
                                </tr>
                                <tr>
                                    <td style="color: #666; font-size: 14px;"><strong>Priorità:</strong></td>
                                    <td style="color: #333; font-size: 14px;">
                                        <span style="color: #{'#f44336' if ticket['priority'] == 'Urgent' else '#ff9800' if ticket['priority'] == 'High' else '#4caf50'};">
                                            {ticket['priority']}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #666; font-size: 14px;"><strong>Agente Assegnato:</strong></td>
                                    <td style="color: #333; font-size: 14px;">{message['sender_name']}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px 40px; text-align: center;">
                            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">
                                Grazie per aver scelto il nostro servizio di supporto
                            </p>
                            <p style="color: rgba(255,255,255,0.7); margin: 10px 0 0 0; font-size: 12px;">
                                CRM Pro - Sistema di Gestione Clienti | Non rispondere a questo indirizzo
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
"""
            
            # Template testo fallback per client che non supportano HTML
            text_body = f"""Gentile {ticket['customer_name']},

{message['message_text']}

---
Ticket ID: #{ticket['id']}
Titolo: {ticket['title']}
Stato: {ticket['status']}
Priorità: {ticket['priority']}
Agente: {message['sender_name']}

Per rispondere, basta rispondere a questa email.

Cordiali saluti,
Il Team di Supporto CRM Pro"""
            
            # Configura SMTP
            smtp = smtplib.SMTP(config['host'], config['port'])
            smtp.starttls() if config['security'] == 'TLS' else None
            smtp.login(config['username'], config['password'])
            
            # Crea messaggio multipart (HTML + testo)
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            
            msg = MIMEMultipart('alternative')
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            msg['Subject'] = subject
            msg['From'] = f"{config['from_name']} <{config['from_email']}>"
            msg['To'] = ticket['customer_email']
            msg['Reply-To'] = config['from_email']
            
            # Invia
            smtp.send_message(msg)
            smtp.quit()
            
            print(f"Messaggio ticket inviato al cliente: {ticket['customer_email']}")
            return True
            
        except Exception as e:
            print(f"Errore nell'invio messaggio ticket al cliente: {e}")
            return False
    
    @staticmethod
    def send_ticket_message_to_agents(ticket, message):
        """Invia un messaggio del cliente agli agenti via email"""
        try:
            config = EmailService.get_smtp_config()
            if not config:
                print("Configurazione SMTP non trovata")
                return False
            
            # Trova agenti da notificare (agente assegnato + admin)
            agent_emails = []
            
            # Agente assegnato
            if ticket.get('assigned_to'):
                try:
                    # Skip agents table - use users instead
                    from task_helper import get_from_supabase
                    users = get_from_supabase('users', {'full_name': ticket['assigned_to']}, select='email')
                    if users:
                        agent_emails.append(users[0]['email'])
                except Exception as e:
                    print(f"Errore nel recupero email agente: {e}")
            
            # Admin users
            try:
                from task_helper import get_from_supabase
                
                admin_users = get_from_supabase('users', 
                                               filters={'role': 'admin', 'status': 'approved'},
                                               select='email')
                admin_emails = [user['email'] for user in (admin_users or [])]
                agent_emails.extend(admin_emails)
            except Exception as e:
                print(f"Errore nel recupero email admin: {e}")
            
            # Rimuovi duplicati
            agent_emails = list(set(agent_emails))
            
            if not agent_emails:
                print("Nessun agente da notificare")
                return False
            
            # Prepara il contenuto email
            subject = f"Nuovo Messaggio Cliente - Ticket #{ticket['id']}"
            
            body = f"""Nuovo messaggio ricevuto per il ticket #{ticket['id']}.

Da: {message['sender_name']} ({message['sender_email']})
Data: {message['created_at']}

Messaggio:
{message['message_text']}

---
Dettagli Ticket:
ID: #{ticket['id']}
Titolo: {ticket['title']}
Cliente: {ticket['customer_name']} ({ticket['customer_email']})
Stato: {ticket['status']}
Priorità: {ticket['priority']}
Assegnato a: {ticket.get('assigned_to', 'Non assegnato')}

Accedi al CRM per rispondere al cliente.

Il Sistema CRM"""
            
            # Configura SMTP
            smtp = smtplib.SMTP(config['host'], config['port'])
            smtp.starttls() if config['security'] == 'TLS' else None
            smtp.login(config['username'], config['password'])
            
            # Invia a tutti gli agenti
            for agent_email in agent_emails:
                try:
                    msg = MIMEText(body)
                    msg['Subject'] = subject
                    msg['From'] = f"{config['from_name']} <{config['from_email']}>"
                    msg['To'] = agent_email
                    
                    smtp.send_message(msg)
                    print(f"Notifica inviata all'agente: {agent_email}")
                    
                except Exception as e:
                    print(f"Errore nell'invio a {agent_email}: {e}")
            
            smtp.quit()
            return True
            
        except Exception as e:
            print(f"Errore nell'invio messaggio ticket agli agenti: {e}")
            return False
    
    @staticmethod
    def send_user_activation_email(user):
        """Invia email di attivazione account a un utente approvato"""
        try:
            config = EmailService.get_smtp_config()
            if not config:
                print("❌ Configurazione SMTP non trovata per email attivazione")
                return False
            
            # Prepara il contenuto dell'email
            subject = "Account CRM Pro Attivato"
            
            # Template HTML per email di attivazione
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    .email-container {{
                        max-width: 600px;
                        margin: 0 auto;
                        font-family: Arial, sans-serif;
                        background-color: #f8f9fa;
                    }}
                    .email-header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }}
                    .email-body {{
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }}
                    .activation-card {{
                        background: #e8f5e8;
                        border-left: 4px solid #28a745;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .user-info {{
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 15px 0;
                    }}
                    .footer {{
                        text-align: center;
                        color: #6c757d;
                        font-size: 12px;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                    }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>🎉 Account Attivato!</h1>
                        <p>Il tuo account CRM Pro è stato approvato</p>
                    </div>
                    
                    <div class="email-body">
                        <div class="activation-card">
                            <h3>✅ Congratulazioni!</h3>
                            <p>Il tuo account è stato approvato dall'amministratore e ora puoi accedere al sistema CRM Pro.</p>
                        </div>
                        
                        <div class="user-info">
                            <h4>Dettagli Account:</h4>
                            <p><strong>Nome:</strong> {user.get('full_name', 'N/A')}</p>
                            <p><strong>Username:</strong> {user.get('username', 'N/A')}</p>
                            <p><strong>Email:</strong> {user.get('email', 'N/A')}</p>
                            <p><strong>Ruolo:</strong> {user.get('role', 'N/A').title()}</p>
                        </div>
                        
                        <h4>Prossimi Passi:</h4>
                        <ol>
                            <li>Accedi al sistema CRM Pro con le tue credenziali</li>
                            <li>Completa il tuo profilo se necessario</li>
                            <li>Inizia a gestire ticket e clienti</li>
                        </ol>
                        
                        <p>Se hai domande o problemi di accesso, contatta l'amministratore di sistema.</p>
                        
                        <div class="footer">
                            <p>Questa email è stata generata automaticamente dal sistema CRM Pro.</p>
                            <p>Data di attivazione: {datetime.now().strftime('%d/%m/%Y alle %H:%M')}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versione testo semplice
            text_body = f"""
            Account CRM Pro Attivato
            
            Congratulazioni! Il tuo account è stato approvato dall'amministratore.
            
            Dettagli Account:
            - Nome: {user.get('full_name', 'N/A')}
            - Username: {user.get('username', 'N/A')}
            - Email: {user.get('email', 'N/A')}
            - Ruolo: {user.get('role', 'N/A').title()}
            
            Ora puoi accedere al sistema CRM Pro con le tue credenziali.
            
            Se hai domande, contatta l'amministratore di sistema.
            
            Data di attivazione: {datetime.now().strftime('%d/%m/%Y alle %H:%M')}
            """
            
            # Crea il messaggio multipart
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{config.get('from_name', 'CRM Pro')} <{config.get('from_email', config['username'])}>"
            msg['To'] = user['email']
            msg['Subject'] = subject
            
            # Aggiungi entrambe le versioni
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            html_part = MIMEText(html_body, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Invia l'email
            context = ssl.create_default_context()
            with smtplib.SMTP(config['host'], config['port']) as smtp:
                if config.get('security') == 'TLS':
                    smtp.starttls(context=context)
                elif config.get('security') == 'SSL':
                    smtp = smtplib.SMTP_SSL(config['host'], config['port'], context=context)
                
                smtp.login(config['username'], config['password'])
                smtp.send_message(msg)
                smtp.quit()
            
            print(f"✅ Email di attivazione inviata a {user['email']}")
            return True
            
        except Exception as e:
            print(f"❌ Errore nell'invio email di attivazione: {e}")
            return False

class EmailMonitor:
    """Monitor per il controllo automatico delle email"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        """Avvia il monitor"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.thread.start()
            print("Monitor email avviato")
    
    def stop(self):
        """Ferma il monitor"""
        self.running = False
        if self.thread:
            self.thread.join()
        print("Monitor email fermato")
    
    def _monitor_loop(self):
        """Loop di monitoraggio"""
        while self.running:
            try:
                config = EmailService.get_imap_config()
                if config and config.get('auto_check', 0) > 0:
                    EmailService.check_emails_and_create_tickets()
                    time.sleep(config['auto_check'])
                else:
                    time.sleep(15)  # Controlla ogni 15 secondi se il servizio è attivo
            except Exception as e:
                print(f"Errore nel monitor email: {e}")
                time.sleep(15)

# Istanza globale del monitor
email_monitor = EmailMonitor()