#!/bin/bash

# =============================================================================
# SETUP AUTOMATIQUE GMAIL CLIENT (VERSION SIMPLE)
# =============================================================================
#
# Ce script fait TOUT automatiquement.
# Tu n'as qu'à fournir 1 seule info : ta clé Supabase service_role
#
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║         SETUP AUTOMATIQUE GMAIL CLIENT                     ║${NC}"
echo -e "${BLUE}║         (Version Simple - Non-Tech)                        ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Ce script va tout configurer automatiquement."
echo "Tu n'as qu'à répondre à UNE question !"
echo ""
read -p "Prêt ? (Appuie sur Entrée pour continuer)"
echo ""

# =============================================================================
# ÉTAPE 1 : Vérifier Vercel CLI
# =============================================================================

echo -e "${YELLOW}[1/5] Vérification de Vercel CLI...${NC}"

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI n'est pas installé${NC}"
    echo ""
    echo "Installation automatique..."
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI prêt${NC}"
echo ""

# =============================================================================
# ÉTAPE 2 : Demander la clé Supabase
# =============================================================================

echo -e "${YELLOW}[2/5] Récupération de ta clé Supabase...${NC}"
echo ""
echo "J'ai besoin de ta clé Supabase service_role."
echo ""
echo -e "${BLUE}Où la trouver :${NC}"
echo "1. Va sur https://supabase.com/dashboard"
echo "2. Clique sur ton projet 'Gmail Client'"
echo "3. Settings → API"
echo "4. Copie la clé 'service_role' (commence par eyJhbGc...)"
echo ""
read -sp "Colle la clé ici et appuie sur Entrée : " SUPABASE_SERVICE_KEY
echo ""
echo ""
echo -e "${GREEN}✅ Clé reçue${NC}"
echo ""

# =============================================================================
# ÉTAPE 3 : Générer tous les secrets automatiquement
# =============================================================================

echo -e "${YELLOW}[3/5] Génération automatique des secrets...${NC}"

ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
CRON_SECRET="2w6rcevwSKHFNFxI0c0Do8FsjjW6yA+LiEGIvC+8YQU="

echo -e "${GREEN}✅ Secrets générés${NC}"
echo ""

# =============================================================================
# ÉTAPE 4 : Connexion à Vercel et configuration
# =============================================================================

echo -e "${YELLOW}[4/5] Connexion à Vercel...${NC}"
echo ""
echo "Une page web va s'ouvrir pour te connecter à Vercel."
echo "Clique sur 'Continue' pour autoriser."
echo ""
read -p "Appuie sur Entrée quand tu es prêt..."

vercel login

echo ""
echo -e "${GREEN}✅ Connecté à Vercel${NC}"
echo ""

# Link au projet
echo "Liaison au projet Vercel..."
vercel link --yes 2>/dev/null || echo "Projet déjà lié"

echo ""
echo -e "${YELLOW}Configuration des variables d'environnement...${NC}"
echo "Cela va prendre 1-2 minutes..."
echo ""

# Variables Frontend
vercel env rm VITE_API_URL production preview development --yes 2>/dev/null || true
echo "/api" | vercel env add VITE_API_URL production preview development

vercel env rm VITE_SUPABASE_URL production preview development --yes 2>/dev/null || true
echo "https://lfhmxxwcvcvslzndemzh.supabase.co" | vercel env add VITE_SUPABASE_URL production preview development

vercel env rm VITE_SUPABASE_ANON_KEY production preview development --yes 2>/dev/null || true
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjA4MTEsImV4cCI6MjA4NDMzNjgxMX0.fHhgzw8HYdL7BX_FL8jobnTBZREa_lX3VnHrOj5rR1I" | vercel env add VITE_SUPABASE_ANON_KEY production preview development

# Variables Backend
vercel env rm SUPABASE_URL production preview development --yes 2>/dev/null || true
echo "https://lfhmxxwcvcvslzndemzh.supabase.co" | vercel env add SUPABASE_URL production preview development

vercel env rm SUPABASE_SERVICE_KEY production preview development --yes 2>/dev/null || true
echo "$SUPABASE_SERVICE_KEY" | vercel env add SUPABASE_SERVICE_KEY production preview development

vercel env rm ENCRYPTION_KEY production preview development --yes 2>/dev/null || true
echo "$ENCRYPTION_KEY" | vercel env add ENCRYPTION_KEY production preview development

vercel env rm JWT_SECRET production preview development --yes 2>/dev/null || true
echo "$JWT_SECRET" | vercel env add JWT_SECRET production preview development

vercel env rm JWT_REFRESH_SECRET production preview development --yes 2>/dev/null || true
echo "$JWT_REFRESH_SECRET" | vercel env add JWT_REFRESH_SECRET production preview development

vercel env rm CRON_SECRET production preview development --yes 2>/dev/null || true
echo "$CRON_SECRET" | vercel env add CRON_SECRET production preview development

vercel env rm FRONTEND_URL production preview development --yes 2>/dev/null || true
echo "https://gmail-client-xi-lemon.vercel.app" | vercel env add FRONTEND_URL production preview development

vercel env rm NODE_ENV production preview development --yes 2>/dev/null || true
echo "production" | vercel env add NODE_ENV production preview development

vercel env rm LOG_LEVEL production preview development --yes 2>/dev/null || true
echo "info" | vercel env add LOG_LEVEL production preview development

vercel env rm USE_MEMORY_FALLBACK production preview development --yes 2>/dev/null || true
echo "true" | vercel env add USE_MEMORY_FALLBACK production preview development

echo -e "${GREEN}✅ Variables configurées${NC}"
echo ""

# Pour Google OAuth, on utilisera Supabase Auth (pas besoin de Google Cloud Console)
echo ""
echo -e "${BLUE}📝 Note sur Google OAuth :${NC}"
echo "On utilisera Supabase Auth pour gérer Google OAuth."
echo "Plus besoin de configurer Google Cloud Console !"
echo ""

# =============================================================================
# ÉTAPE 5 : Déploiement
# =============================================================================

echo -e "${YELLOW}[5/5] Déploiement sur Vercel...${NC}"
echo ""
echo "Cela peut prendre 2-3 minutes..."
echo ""

vercel --prod --yes

echo ""
echo -e "${GREEN}✅ Déployé !${NC}"
echo ""

# =============================================================================
# FIN
# =============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✅ SETUP TERMINÉ !                                        ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  Ton app est en ligne !                                    ║${NC}"
echo -e "${GREEN}║  https://gmail-client-xi-lemon.vercel.app                  ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Dernière étape (2 minutes) :${NC}"
echo ""
echo "1. Va sur https://supabase.com/dashboard"
echo "2. Ton projet 'Gmail Client' → Authentication → Providers"
echo "3. Active 'Google'"
echo "4. Dans Redirect URL, ajoute :"
echo "   https://gmail-client-xi-lemon.vercel.app/**"
echo ""
echo -e "${GREEN}Et c'est tout ! 🎉${NC}"
echo ""
echo "Tu peux maintenant aller sur ton app et te connecter avec Google !"
echo ""
