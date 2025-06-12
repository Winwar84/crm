"""
Fallback database locale usando SQLite per quando Supabase non è disponibile
"""
import sqlite3
import json
import os
import bcrypt
from datetime import datetime
import uuid

DB_PATH = '/app/data/crm_fallback.db'

def init_local_db():
    """Inizializza il database locale SQLite"""
    try:
        # Crea la directory se non esiste
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Crea tabella users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT DEFAULT 'operator',
                status TEXT DEFAULT 'approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Crea tabella tickets
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT DEFAULT 'Medium',
                status TEXT DEFAULT 'Open',
                customer_id INTEGER,
                customer_name TEXT,
                customer_email TEXT,
                assigned_to TEXT,
                software TEXT,
                "group" TEXT,
                type TEXT,
                rapporto_danea TEXT,
                id_assistenza TEXT,
                password_teleassistenza TEXT,
                numero_richiesta_teleassistenza TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Crea tabella customers
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                company TEXT,
                address TEXT,
                notes TEXT,
                status TEXT DEFAULT 'Active',
                password_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Crea tabella ticket_messages
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ticket_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                sender_email TEXT NOT NULL,
                message_text TEXT NOT NULL,
                is_internal BOOLEAN DEFAULT FALSE,
                email_message_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id)
            )
        ''')
        
        # Crea tabella email_settings
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT UNIQUE NOT NULL,
                config TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        print("✅ Database locale SQLite inizializzato con successo")
        return True
        
    except Exception as e:
        print(f"❌ Errore nell'inizializzazione database locale: {e}")
        return False

def create_admin_user():
    """Crea l'utente admin predefinito"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Controlla se admin esiste già
        cursor.execute("SELECT id FROM users WHERE username = ?", ('winwar84',))
        if cursor.fetchone():
            print("✅ Admin winwar84 già esistente nel database locale")
            conn.close()
            return True
        
        # Crea hash password
        password = 'vncmtt84b'
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Inserisci admin
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, full_name, role, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('winwar84', 'admin@crm.local', password_hash, 'Amministratore CRM', 'admin', 'approved'))
        
        conn.commit()
        conn.close()
        
        print("✅ Admin winwar84 creato nel database locale")
        return True
        
    except Exception as e:
        print(f"❌ Errore nella creazione admin locale: {e}")
        return False

class LocalDBService:
    """Servizio per operazioni database locale"""
    
    @staticmethod
    def get_user_by_username(username):
        """Recupera utente per username"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            conn.close()
            
            if user:
                return dict(user)
            return None
            
        except Exception as e:
            print(f"Errore get_user_by_username: {e}")
            return None
    
    @staticmethod
    def save_data(table, data, on_conflict=None):
        """Salva dati nel database locale"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            if on_conflict and table == 'email_settings':
                # Upsert per email_settings
                cursor.execute("SELECT id FROM email_settings WHERE type = ?", (data.get('type'),))
                if cursor.fetchone():
                    # Update
                    set_clause = ', '.join([f"{k} = ?" for k in data.keys() if k != 'type'])
                    values = [v for k, v in data.items() if k != 'type']
                    values.append(data['type'])
                    
                    cursor.execute(f"UPDATE email_settings SET {set_clause} WHERE type = ?", values)
                else:
                    # Insert
                    columns = ', '.join(data.keys())
                    placeholders = ', '.join(['?' for _ in data])
                    cursor.execute(f"INSERT INTO email_settings ({columns}) VALUES ({placeholders})", list(data.values()))
            else:
                # Insert normale
                columns = ', '.join(data.keys())
                placeholders = ', '.join(['?' for _ in data])
                cursor.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", list(data.values()))
            
            conn.commit()
            row_id = cursor.lastrowid
            conn.close()
            
            return [{'id': row_id, **data}]
            
        except Exception as e:
            print(f"Errore save_data: {e}")
            return None
    
    @staticmethod
    def get_data(table, filters=None, select="*", order_by=None, limit=None):
        """Recupera dati dal database locale"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = f"SELECT {select} FROM {table}"
            params = []
            
            if filters:
                where_clause = ' AND '.join([f"{k} = ?" for k in filters.keys()])
                query += f" WHERE {where_clause}"
                params.extend(filters.values())
            
            if order_by:
                if isinstance(order_by, dict):
                    order_parts = []
                    for col, direction in order_by.items():
                        order_parts.append(f"{col} {direction.upper()}")
                    query += f" ORDER BY {', '.join(order_parts)}"
                else:
                    query += f" ORDER BY {order_by}"
            
            if limit:
                query += f" LIMIT {limit}"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            print(f"Errore get_data: {e}")
            return None