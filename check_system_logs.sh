#!/bin/bash

echo "============================================"
echo "🔍 CONTROLLO COMPLETO SISTEMA CRM PRO"
echo "============================================"
echo ""

echo "📋 Status Container Docker:"
echo "----------------------------"
docker ps | grep crm
echo ""

echo "📊 Health Check:"
echo "----------------"
curl -s http://localhost:8080/health | jq '.' 2>/dev/null || curl -s http://localhost:8080/health
echo ""

echo "🔍 Log Container (ultimi 20 righe):"
echo "------------------------------------"
docker logs crm-pro --tail=20
echo ""

echo "🌐 Variabili Ambiente Supabase:"
echo "-------------------------------"
docker exec crm-pro env | grep SUPABASE
echo ""

echo "🔧 Test Connessioni API:"
echo "------------------------"
echo "• Test Stats API:"
curl -s http://localhost:8080/api/stats | jq '.' 2>/dev/null || curl -s http://localhost:8080/api/stats
echo ""

echo "• Test Software Config API:"
curl -s http://localhost:8080/api/config/software | jq '.[0:2]' 2>/dev/null || curl -s http://localhost:8080/api/config/software
echo ""

echo "• Test Email SMTP Config API:"
curl -s http://localhost:8080/api/email/smtp | jq '.' 2>/dev/null || curl -s http://localhost:8080/api/email/smtp
echo ""

echo "============================================"
echo "🚀 STATO SISTEMA:"
echo "✅ Se vedi dati JSON sopra = API funzionanti"
echo "❌ Se vedi errori = Tabelle mancanti su Supabase"
echo "============================================"