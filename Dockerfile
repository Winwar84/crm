# Multi-stage build per ottimizzare l'immagine finale
FROM python:3.11-slim as base

# Imposta variabili d'ambiente per Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Crea utente non-root per sicurezza
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash appuser

# Installa dipendenze di sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia e installa dipendenze Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'applicazione
COPY . .

# Crea directory necessarie e imposta permessi
RUN mkdir -p /app/database /app/logs && \
    chown -R appuser:appuser /app

# Passa all'utente non-root
USER appuser

# Esponi la porta
EXPOSE 8080

# Healthcheck per monitorare lo stato dell'applicazione
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=10)" || exit 1

# Comando di avvio
CMD ["python", "app/app.py"]