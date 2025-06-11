import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Carica le variabili d'ambiente
load_dotenv()

# Configurazione Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Chiave segreta per JWT
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here-change-in-production")

# Crea il client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

async def init_supabase_tables():
    """Inizializza le tabelle in Supabase se non esistono"""
    try:
        # Verifica se le tabelle esistono già
        # Se non esistono, dovrai crearle manualmente nel dashboard Supabase
        # o usando SQL migration scripts
        
        # Test connessione via MCP
        from task_helper import get_from_supabase
        result = get_from_supabase('tickets', limit=1)
        print("Connessione a Supabase stabilita con successo!")
        return True
    except Exception as e:
        print(f"Errore connessione Supabase: {e}")
        return False

# Funzioni CRUD per Tickets
class TicketService:
    @staticmethod
    def get_all():
        """Recupera tutti i ticket"""
        try:
            from task_helper import get_from_supabase
            
            tickets = get_from_supabase('tickets', 
                                      select='*',
                                      order_by={'created_at': 'desc'})
            return tickets if tickets else []
        except Exception as e:
            print(f"Errore nel recupero ticket: {e}")
            return []
    
    @staticmethod
    def create(ticket_data):
        """Crea un nuovo ticket"""
        try:
            from task_helper import save_to_supabase
            
            result = save_to_supabase('tickets', ticket_data)
            
            if result:
                return result[0] if isinstance(result, list) else result
            return None
        except Exception as e:
            print(f"Errore nella creazione ticket: {e}")
            return None
    
    @staticmethod
    def update(ticket_id, update_data):
        """Aggiorna un ticket"""
        try:
            from task_helper import update_in_supabase
            
            result = update_in_supabase('tickets', update_data, {'id': ticket_id})
            
            if result:
                return result[0] if isinstance(result, list) else result
            return None
        except Exception as e:
            print(f"Errore nell'aggiornamento ticket: {e}")
            return None
    
    @staticmethod
    def delete(ticket_id):
        """Elimina un ticket"""
        try:
            from task_helper import delete_from_supabase
            
            result = delete_from_supabase('tickets', {'id': ticket_id})
            return result
        except Exception as e:
            print(f"Errore nell'eliminazione ticket: {e}")
            return False

# Funzioni CRUD per Customers
class CustomerService:
    @staticmethod
    def get_all():
        """Recupera tutti i clienti"""
        try:
            from task_helper import get_from_supabase
            
            customers = get_from_supabase('customers', 
                                        select='*',
                                        order_by={'created_at': 'desc'})
            return customers if customers else []
        except Exception as e:
            print(f"Errore nel recupero clienti: {e}")
            return []
    
    @staticmethod
    def create(customer_data):
        """Crea un nuovo cliente"""
        try:
            from task_helper import save_to_supabase
            
            result = save_to_supabase('customers', customer_data)
            
            if result:
                return result[0] if isinstance(result, list) else result
            return None
        except Exception as e:
            print(f"Errore nella creazione cliente: {e}")
            return None
    
    @staticmethod
    def update(customer_id, update_data):
        """Aggiorna un cliente"""
        try:
            from task_helper import update_in_supabase
            
            result = update_in_supabase('customers', update_data, {'id': customer_id})
            
            if result:
                return result[0] if isinstance(result, list) else result
            return None
        except Exception as e:
            print(f"Errore nell'aggiornamento cliente: {e}")
            return None
    
    @staticmethod
    def delete(customer_id):
        """Elimina un cliente e i suoi ticket associati"""
        try:
            from task_helper import delete_from_supabase
            
            # Prima elimina tutti i ticket del cliente
            tickets_deleted = delete_from_supabase('tickets', {'customer_id': customer_id})
            print(f"Eliminazione ticket per cliente {customer_id}: {'successo' if tickets_deleted else 'fallita'}")
            
            # Poi elimina il cliente
            result = delete_from_supabase('customers', {'id': customer_id})
            return result
        except Exception as e:
            print(f"Errore nell'eliminazione cliente: {e}")
            return False

# Funzioni CRUD per Agents
class AgentService:
    @staticmethod
    def get_all():
        """Recupera tutti gli agenti (utenti approvati)"""
        try:
            from task_helper import get_from_supabase
            
            # Recupera utenti approvati e li formatta come agenti
            users = get_from_supabase('users', 
                                    filters={'status': 'approved'},
                                    select='*',
                                    order_by={'created_at': 'desc'})
            
            # Converti gli utenti in formato agente
            agents = []
            for user in (users or []):
                agent = {
                    'id': user['id'],
                    'name': user.get('full_name', user.get('name', user.get('username', 'Unknown'))),  # Prova full_name, poi name, poi username
                    'email': user['email'],
                    'department': user.get('role', 'support').capitalize(),  # Usa il ruolo come dipartimento
                    'created_at': user['created_at']
                }
                agents.append(agent)
            
            return agents
        except Exception as e:
            print(f"Errore nel recupero agenti: {e}")
            return []
    
    @staticmethod
    def create(agent_data):
        """Crea un nuovo agente (deprecato - utilizzare approvazione utenti)"""
        # Metodo deprecato - gli agenti ora vengono creati tramite approvazione utenti
        print("Metodo create deprecato - utilizzare approvazione utenti")
        return None
    
    @staticmethod
    def update(agent_id, update_data):
        """Aggiorna un agente (utente approvato)"""
        try:
            from task_helper import update_in_supabase
            
            # Mappa i dati agente ai campi utente
            user_data = {
                'full_name': update_data.get('name'),
                'email': update_data.get('email'),
                'role': update_data.get('department', 'operator').lower()  # Mappa dipartimento a ruolo
            }
            
            result = update_in_supabase('users', user_data, {'id': agent_id})
            
            # Riconverti in formato agente per la risposta
            if result:
                user = result[0] if isinstance(result, list) else result
                agent = {
                    'id': user['id'],
                    'name': user.get('full_name', user.get('username', 'Unknown')),
                    'email': user['email'],
                    'department': user.get('role', 'operator').capitalize(),
                    'created_at': user['created_at']
                }
                return agent
            return None
        except Exception as e:
            print(f"Errore nell'aggiornamento agente: {e}")
            return None
    
    @staticmethod
    def delete(agent_id):
        """Elimina un agente (cambia stato utente a rejected)"""
        try:
            from task_helper import update_in_supabase
            
            # Invece di eliminare, cambia lo stato a rejected per rimuoverlo dalla lista agenti
            result = update_in_supabase('users', {'status': 'rejected'}, {'id': agent_id})
            return bool(result)
        except Exception as e:
            print(f"Errore nell'eliminazione agente: {e}")
            return False

# Funzione per le statistiche
def get_stats():
    """Recupera le statistiche"""
    try:
        from task_helper import count_in_supabase
        
        # Conta ticket per stato
        total_tickets = count_in_supabase('tickets')
        open_tickets = count_in_supabase('tickets', {'status': 'Open'})
        closed_tickets = count_in_supabase('tickets', {'status': 'Closed'})
        
        # Conta agenti (utenti approvati) e clienti
        total_agents = count_in_supabase('users', {'status': 'approved'})
        total_customers = count_in_supabase('customers')
        active_customers = count_in_supabase('customers', {'status': 'Active'})
        
        return {
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'closed_tickets': closed_tickets,
            'total_agents': total_agents,
            'total_customers': total_customers,
            'active_customers': active_customers
        }
    except Exception as e:
        print(f"Errore nel recupero statistiche: {e}")
        return {
            'total_tickets': 0,
            'open_tickets': 0,
            'closed_tickets': 0,
            'total_agents': 0,
            'total_customers': 0,
            'active_customers': 0
        }

# Funzioni CRUD per Users (Autenticazione)
class UserService:
    @staticmethod
    def hash_password(password):
        """Hash della password"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed_password):
        """Verifica la password"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def generate_token(user_data):
        """Genera un JWT token"""
        payload = {
            'user_id': user_data['id'],
            'username': user_data['username'],
            'role': user_data['role'],
            'exp': datetime.utcnow() + timedelta(days=7)  # Token valido per 7 giorni
        }
        return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Verifica un JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def create_admin_if_not_exists():
        """Crea l'admin predefinito se non esiste"""
        try:
            from task_helper import get_from_supabase, save_to_supabase
            
            # Verifica se l'admin esiste già
            existing_users = get_from_supabase('users', {'username': 'winwar84'})
            print(f"🔍 Controllo admin esistente: {len(existing_users) if existing_users else 0} risultati")
            
            if not existing_users:
                # Usa l'hash pre-generato per la password vncmtt84b
                admin_password_hash = '$2b$12$6Ztdg7ogC9Mux4tUrjwWVe.fl/hyVUhyGDlJgAPSioKCZ62kmcBDS'
                
                admin_data = {
                    'username': 'winwar84',
                    'email': 'winwar84@admin.local',
                    'password_hash': admin_password_hash,
                    'full_name': 'Administrator',
                    'role': 'admin',
                    'status': 'approved',
                    'is_active': True
                }
                
                result = save_to_supabase('users', admin_data)
                print(f"✅ Admin winwar84 creato via MCP con successo! Risultato: {result}")
            else:
                user = existing_users[0]
                print(f"ℹ️ Admin winwar84 già esistente - Status: {user.get('status')}, Role: {user.get('role')}")
                
        except Exception as e:
            print(f"❌ Errore nella creazione admin: {e}")

    @staticmethod
    def register(user_data):
        """Registra un nuovo utente (in attesa di approvazione)"""
        try:
            from task_helper import save_to_supabase
            
            # Hash della password
            hashed_password = UserService.hash_password(user_data['password'])
            
            # Prepara i dati per l'inserimento - tutti i nuovi utenti sono in pending
            insert_data = {
                'username': user_data['username'],
                'email': user_data['email'],
                'password_hash': hashed_password,
                'full_name': user_data['full_name'],
                'role': 'operator',  # Ruolo predefinito
                'status': 'pending',  # In attesa di approvazione
                'is_active': True
            }
            
            result = save_to_supabase('users', insert_data)
            
            if result:
                user = result[0] if isinstance(result, list) else result
                # Rimuovi la password hash dai dati restituiti
                if isinstance(user, dict) and 'password_hash' in user:
                    del user['password_hash']
                return user
            return None
            
        except Exception as e:
            print(f"Errore nella registrazione utente: {e}")
            return None
    
    @staticmethod
    def login(username, password):
        """Login utente"""
        try:
            from task_helper import get_from_supabase
            
            # Cerca l'utente per username nel database
            users = get_from_supabase('users', {'username': username, 'is_active': True})
            
            if not users or len(users) == 0:
                return None, "Username non trovato"
            
            user = users[0]
            
            # Verifica la password
            if not UserService.verify_password(password, user['password_hash']):
                return None, "Password non corretta"
            
            # Verifica che l'utente sia approvato
            if user['status'] != 'approved':
                return None, "Account in attesa di approvazione dall'amministratore"
            
            # Rimuovi la password hash dai dati restituiti
            del user['password_hash']
            
            # Genera il token
            token = UserService.generate_token(user)
            
            return {'user': user, 'token': token}, None
            
        except Exception as e:
            print(f"Errore nel login: {e}")
            return None, "Errore interno del server"
    
    @staticmethod
    def get_user_by_id(user_id):
        """Recupera un utente per ID"""
        try:
            from task_helper import get_from_supabase
            
            users = get_from_supabase('users', 
                                    filters={'id': user_id, 'is_active': True},
                                    select='id, username, email, full_name, role, is_active, created_at')
            
            if users and len(users) > 0:
                return users[0]
            return None
            
        except Exception as e:
            print(f"Errore nel recupero utente: {e}")
            return None
    
    @staticmethod
    def get_all_users():
        """Recupera tutti gli utenti (solo per admin)"""
        try:
            from task_helper import get_from_supabase
            
            users = get_from_supabase('users', 
                                    select='id, username, email, full_name, role, status, is_active, created_at, updated_at',
                                    order_by={'created_at': 'desc'})
            return users if users else []
        except Exception as e:
            print(f"Errore nel recupero utenti: {e}")
            return []
    
    @staticmethod
    def get_pending_users():
        """Recupera utenti in attesa di approvazione"""
        try:
            from task_helper import get_from_supabase
            
            users = get_from_supabase('users', 
                                    filters={'status': 'pending'},
                                    select='id, username, email, full_name, role, status, created_at',
                                    order_by={'created_at': 'desc'})
            return users if users else []
        except Exception as e:
            print(f"Errore nel recupero utenti pending: {e}")
            return []
    
    @staticmethod
    def approve_user(user_id, role='operator'):
        """Approva un utente e assegna un ruolo"""
        try:
            from task_helper import update_in_supabase
            
            update_data = {
                'status': 'approved',
                'role': role,
                'is_active': True
            }
            
            result = update_in_supabase('users', update_data, {'id': user_id})
            
            if result:
                user = result[0] if isinstance(result, list) else result
                # Rimuovi la password hash dai dati restituiti
                if isinstance(user, dict) and 'password_hash' in user:
                    del user['password_hash']
                return user
            return None
        except Exception as e:
            print(f"Errore nell'approvazione utente: {e}")
            return None
    
    @staticmethod
    def reject_user(user_id):
        """Rifiuta un utente"""
        try:
            from task_helper import update_in_supabase
            
            update_data = {
                'status': 'rejected',
                'is_active': False
            }
            
            result = update_in_supabase('users', update_data, {'id': user_id})
            
            if result:
                user = result[0] if isinstance(result, list) else result
                # Rimuovi la password hash dai dati restituiti
                if isinstance(user, dict) and 'password_hash' in user:
                    del user['password_hash']
                return user
            return None
        except Exception as e:
            print(f"Errore nel rifiuto utente: {e}")
            return None
    
    @staticmethod
    def delete_user(user_id):
        """Elimina completamente un utente"""
        try:
            from task_helper import delete_from_supabase
            
            result = delete_from_supabase('users', {'id': user_id})
            
            if result:
                print(f"Utente {user_id} eliminato con successo")
                return True
            return False
        except Exception as e:
            print(f"Errore nell'eliminazione utente: {e}")
            return False
    
    @staticmethod
    def update_user_permissions(user_id, role=None, status=None):
        """Aggiorna ruolo e status di un utente"""
        try:
            from task_helper import update_in_supabase
            
            update_data = {}
            if role:
                update_data['role'] = role
            if status:
                update_data['status'] = status
                # Se status è approved, attiva l'utente
                if status == 'approved':
                    update_data['is_active'] = True
                elif status == 'suspended':
                    update_data['is_active'] = False
            
            if not update_data:
                return None
                
            result = update_in_supabase('users', update_data, {'id': user_id})
            
            if result:
                user = result[0] if isinstance(result, list) else result
                # Rimuovi la password hash dai dati restituiti
                if isinstance(user, dict) and 'password_hash' in user:
                    del user['password_hash']
                return user
            return None
        except Exception as e:
            print(f"Errore nell'aggiornamento permessi utente: {e}")
            return None

# Funzioni CRUD per Email Settings
class EmailSettingsService:
    @staticmethod
    def upsert_smtp_config(smtp_config):
        """Upsert SMTP configuration"""
        try:
            from task_helper import save_to_supabase
            import json
            
            # Format data for database
            data = {
                'type': 'smtp',
                'config': json.dumps(smtp_config),
                'is_active': True
            }
            
            # Use MCP upsert with conflict resolution
            result = save_to_supabase('email_settings', data, on_conflict='type')
            
            if result:
                print(f"SMTP config salvato via MCP: {result}")
                return result[0] if isinstance(result, list) else result
            return None
                
        except Exception as e:
            print(f"Errore nell'upsert configurazione SMTP: {e}")
            return None
    
    @staticmethod
    def get_smtp_config():
        """Get SMTP configuration"""
        try:
            from task_helper import get_from_supabase
            import json
            
            result = get_from_supabase('email_settings', {'type': 'smtp'})
            
            if result and len(result) > 0:
                config_data = result[0]
                # Decode JSON config
                if config_data.get('config'):
                    return json.loads(config_data['config'])
                
            return None
        except Exception as e:
            print(f"Errore nel recupero configurazione SMTP: {e}")
            return None
    
    @staticmethod
    def get_all_email_settings():
        """Get all email settings"""
        try:
            from task_helper import get_from_supabase
            
            settings = get_from_supabase('email_settings', 
                                       select='*',
                                       order_by={'created_at': 'desc'})
            return settings if settings else []
        except Exception as e:
            print(f"Errore nel recupero impostazioni email: {e}")
            return []