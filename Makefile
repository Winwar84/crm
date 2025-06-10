# Makefile per CRM Pro

.PHONY: help build up down dev logs shell clean backup restore

# Colori per output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

help: ## Mostra questo messaggio di help
	@echo "$(GREEN)CRM Pro - Comandi Docker disponibili:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

build: ## Builda l'immagine Docker
	@echo "$(GREEN)Building CRM Pro Docker image...$(NC)"
	docker-compose build

up: ## Avvia tutti i servizi in produzione
	@echo "$(GREEN)Starting CRM Pro services...$(NC)"
	docker-compose up -d

down: ## Ferma tutti i servizi
	@echo "$(RED)Stopping CRM Pro services...$(NC)"
	docker-compose down

dev: ## Avvia in modalità sviluppo (hot reload)
	@echo "$(GREEN)Starting CRM Pro in development mode...$(NC)"
	docker-compose -f docker-compose.dev.yml up

dev-build: ## Builda e avvia in modalità sviluppo
	@echo "$(GREEN)Building and starting CRM Pro in development mode...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

logs: ## Mostra i logs dell'applicazione
	docker-compose logs -f crm-app

logs-db: ## Mostra i logs del database
	docker-compose logs -f crm-db

shell: ## Apre una shell nel container dell'app
	docker-compose exec crm-app /bin/bash

shell-db: ## Apre una shell PostgreSQL
	docker-compose exec crm-db psql -U crm_user -d crm_pro

clean: ## Rimuove container, immagini e volumi non utilizzati
	@echo "$(RED)Cleaning up Docker resources...$(NC)"
	docker-compose down -v
	docker system prune -f
	docker volume prune -f

clean-all: ## Rimuove TUTTO (attenzione ai dati!)
	@echo "$(RED)WARNING: This will remove ALL data including volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -af; \
		docker volume prune -f; \
	fi

backup: ## Crea backup del database
	@echo "$(GREEN)Creating database backup...$(NC)"
	mkdir -p ./backups
	docker-compose exec -T crm-db pg_dump -U crm_user -d crm_pro > ./backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created in ./backups/$(NC)"

restore: ## Ripristina backup del database (specifica BACKUP_FILE=path)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Please specify BACKUP_FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(BACKUP_FILE)...$(NC)"
	docker-compose exec -T crm-db psql -U crm_user -d crm_pro < $(BACKUP_FILE)
	@echo "$(GREEN)Database restored successfully!$(NC)"

migrate: ## Esegue le migrazioni del database
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec -T crm-db psql -U crm_user -d crm_pro < ./migration_add_ticket_fields.sql

migrate-supabase: ## Esegue la migrazione su Supabase
	@echo "$(GREEN)Running Supabase migration...$(NC)"
	python3 simple_migration.py

migrate-full: ## Migrazione completa per Supabase (richiede dipendenze)
	@echo "$(GREEN)Running full Supabase migration...$(NC)"
	python3 run_migration.py

status: ## Mostra lo stato dei container
	docker-compose ps

restart: ## Riavvia tutti i servizi
	@echo "$(YELLOW)Restarting CRM Pro services...$(NC)"
	docker-compose restart

restart-app: ## Riavvia solo l'applicazione
	@echo "$(YELLOW)Restarting CRM Pro application...$(NC)"
	docker-compose restart crm-app

# Setup iniziale
setup: ## Setup iniziale del progetto
	@echo "$(GREEN)Setting up CRM Pro...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env file from template...$(NC)"; \
		cp .env.example .env; \
		echo "$(RED)Please edit .env file with your configuration!$(NC)"; \
	fi
	@echo "$(GREEN)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)Starting services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Setup completed! CRM Pro is running on http://localhost:8080$(NC)"

# Monitoring
monitor: ## Monitora l'uso delle risorse
	docker stats

# Update
update: ## Aggiorna e riavvia i servizi
	@echo "$(GREEN)Updating CRM Pro...$(NC)"
	git pull
	docker-compose build
	docker-compose up -d
	@echo "$(GREEN)Update completed!$(NC)"