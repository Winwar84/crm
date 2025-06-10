import bcrypt

# Genera l'hash per la password vncmtt84b
password = 'vncmtt84b'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(f"Password hash per '{password}': {hashed}")