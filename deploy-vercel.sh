#!/bin/bash

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         DÉPLOIEMENT GMAIL CLIENT SUR VERCEL                ║${NC}"
echo -e "${BLUE}║         (Nouvelle méthode Supabase 2026)                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installation de Vercel CLI...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}[1/5] Connexion à Vercel${NC}"
echo ""
vercel login
echo ""

echo -e "${GREEN}[2/5] Liaison au projet${NC}"
vercel link --yes 2>/dev/null || echo "Projet déjà lié"
echo ""

echo -e "${GREEN}[3/5] Collecte des secrets${NC}"
echo ""
echo "J'ai besoin de 1 seule info de ta part :"
echo ""
echo -e "${BLUE}Supabase API Secret${NC}"
echo "Où le trouver :"
echo "  1. https://supabase.com/dashboard"
echo "  2. Projet 'Gmail Client' → Settings → API"
echo "  3. Section 'API Secrets'"
echo "  4. Copie le 'secret' (commence par sb_secret_...)"
echo ""
read -sp "Colle ton API Secret ici : " SUPABASE_API_SECRET
echo ""
echo ""

# Générer les autres secrets
echo -e "${GREEN}[4/5] Génération automatique des autres secrets...${NC}"
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
CRON_SECRET="WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y="
echo "✅ Secrets générés"
echo ""

echo -e "${GREEN}[5/5] Configuration de Vercel...${NC}"
echo "Cela peut prendre 1-2 minutes..."
echo ""

# Fonction pour ajouter une variable (supprime l'ancienne si existe)
add_env() {
    local name=$1
    local value=$2
    vercel env rm "$name" production preview development --yes 2>/dev/null || true
    echo "$value" | vercel env add "$name" production preview development
}

# Frontend (public)
add_env "VITE_API_URL" "/api"
add_env "VITE_SUPABASE_URL" "https://lfhmxxwcvcvslzndemzh.supabase.co"
add_env "VITE_SUPABASE_ANON_KEY" "sb_publishable_SQU74g27iA9mpU3VuFpgXA_EUuNLiwq"

# Backend (secret)
add_env "SUPABASE_URL" "https://lfhmxxwcvcvslzndemzh.supabase.co"
add_env "SUPABASE_SERVICE_KEY" "$SUPABASE_API_SECRET"
add_env "ENCRYPTION_KEY" "$ENCRYPTION_KEY"
add_env "JWT_SECRET" "$JWT_SECRET"
add_env "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
add_env "CRON_SECRET" "$CRON_SECRET"
add_env "FRONTEND_URL" "https://gmail-client.vercel.app"
add_env "NODE_ENV" "production"
add_env "LOG_LEVEL" "info"
add_env "USE_MEMORY_FALLBACK" "true"

echo ""
echo -e "${GREEN}✅ Variables configurées !${NC}"
echo ""

echo "Déploiement en cours..."
vercel --prod --yes

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ DÉPLOIEMENT TERMINÉ !                                  ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  Ton app : https://gmail-client.vercel.app       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Dernière étape (1 min) :${NC}"
echo ""
echo "1. Va sur https://supabase.com/dashboard"
echo "2. Authentication → Providers → Active 'Google'"
echo "3. Redirect URL: https://gmail-client.vercel.app/**"
echo ""
echo -e "${GREEN}Et voilà ! 🎉${NC}"
echo ""
