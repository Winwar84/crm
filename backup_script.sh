#!/bin/bash

# CRM Pro Auto Backup Script
# Backup automatico ogni 30 minuti su GitHub

cd /home/winwar84/crm

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Avvio backup automatico CRM Pro...${NC}"

# Verifica se ci sono modifiche
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${GREEN}✅ Nessuna modifica da backuppare${NC}"
    exit 0
fi

# Aggiungi tutti i file modificati
git add .

# Verifica se ci sono file staged
if git diff --staged --quiet; then
    echo -e "${GREEN}✅ Nessuna modifica da commitare${NC}"
    exit 0
fi

# Crea timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Conta le modifiche
MODIFIED_FILES=$(git diff --staged --name-only | wc -l)

# Commit automatico
git commit -m "Auto-backup: $TIMESTAMP

- $MODIFIED_FILES file(s) modificati
- Backup automatico ogni 30 minuti

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push su GitHub
if git push origin main; then
    echo -e "${GREEN}✅ Backup completato su GitHub: $TIMESTAMP${NC}"
    echo -e "${GREEN}📁 File modificati: $MODIFIED_FILES${NC}"
else
    echo -e "${RED}❌ Errore durante il push su GitHub${NC}"
    exit 1
fi