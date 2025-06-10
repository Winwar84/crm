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
                    print(f"📧 Configurazione SMTP recuperata via MCP: {config}")
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
                    print(f"📬 Configurazione IMAP recuperata via MCP: {config}")
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
            
            print(f"💾 Tentativo salvataggio SMTP config via MCP: {config}")
            
            # Prepara i dati per il database
            data = {
                'type': 'smtp',
                'config': json.dumps(config),
                'is_active': True
            }
            
            # Usa MCP helper per salvare
            result = save_to_supabase('email_settings', data, on_conflict='type')
            
            if result:
                print(f"✅ Configurazione SMTP salvata via MCP: {result}")
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
            
            print(f"📬 Tentativo salvataggio IMAP config via MCP: {config}")
            
            # Prepara i dati per il database
            data = {
                'type': 'imap',
                'config': json.dumps(config),
                'is_active': True
            }
            
            # Usa MCP helper per salvare
            result = save_to_supabase('email_settings', data, on_conflict='type')
            
            if result:
                print(f"✅ Configurazione IMAP salvata via MCP: {result}")
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
        print(f"🔍 IMAP check - Config: {config}")
        
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
                                print(f"Messaggio aggiunto al ticket #{ticket_id} da {sender_email}")
                                
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
            
            body = f"""Gentile {ticket['customer_name']},

{message['message_text']}

---
Ticket ID: #{ticket['id']}
Titolo: {ticket['title']}
Stato: {ticket['status']}
Priorità: {ticket['priority']}

Per rispondere, basta rispondere a questa email.

Cordiali saluti,
Il Team di Supporto"""
            
            # Configura SMTP
            smtp = smtplib.SMTP(config['host'], config['port'])
            smtp.starttls() if config['security'] == 'TLS' else None
            smtp.login(config['username'], config['password'])
            
            # Crea messaggio
            msg = MIMEText(body)
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