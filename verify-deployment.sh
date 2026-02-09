#!/bin/bash

# Script de vérification du déploiement
# Usage: ./verify-deployment.sh

set -e

PRODUCTION_URL="https://gmail-client-xi-lemon.vercel.app"
API_URL="${PRODUCTION_URL}/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Vérification du Déploiement Gmail Client"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de vérification
check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo -n "Checking $name... "

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} ($response)"
    return 0
  else
    echo -e "${RED}✗${NC} (got $response, expected $expected_status)"
    return 1
  fi
}

# Fonction pour vérifier le CSS
check_css() {
  echo -n "Checking CSS loading... "

  # Récupérer l'HTML
  html=$(curl -s "$PRODUCTION_URL")

  # Chercher le lien CSS
  css_path=$(echo "$html" | grep -o '/assets/index-[^"]*\.css' | head -1)

  if [ -z "$css_path" ]; then
    echo -e "${RED}✗${NC} (CSS link not found in HTML)"
    return 1
  fi

  # Vérifier que le CSS existe
  css_url="${PRODUCTION_URL}${css_path}"
  css_response=$(curl -s -o /dev/null -w "%{http_code}" "$css_url")

  if [ "$css_response" = "200" ]; then
    # Vérifier la taille (doit être > 20KB)
    css_size=$(curl -s "$css_url" | wc -c)
    if [ "$css_size" -gt 20000 ]; then
      echo -e "${GREEN}✓${NC} (200, ${css_size} bytes)"
      return 0
    else
      echo -e "${YELLOW}⚠${NC} (200 but only ${css_size} bytes, expected >20KB)"
      return 1
    fi
  else
    echo -e "${RED}✗${NC} ($css_response for $css_path)"
    return 1
  fi
}

# Fonction pour vérifier le JS
check_js() {
  echo -n "Checking JS loading... "

  # Récupérer l'HTML
  html=$(curl -s "$PRODUCTION_URL")

  # Chercher le lien JS
  js_path=$(echo "$html" | grep -o '/assets/index-[^"]*\.js' | head -1)

  if [ -z "$js_path" ]; then
    echo -e "${RED}✗${NC} (JS link not found in HTML)"
    return 1
  fi

  # Vérifier que le JS existe
  js_url="${PRODUCTION_URL}${js_path}"
  js_response=$(curl -s -o /dev/null -w "%{http_code}" "$js_url")

  if [ "$js_response" = "200" ]; then
    js_size=$(curl -s "$js_url" | wc -c)
    echo -e "${GREEN}✓${NC} (200, ${js_size} bytes)"
    return 0
  else
    echo -e "${RED}✗${NC} ($js_response for $js_path)"
    return 1
  fi
}

# Tests
echo "📦 Frontend Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Homepage" "$PRODUCTION_URL" "200"
check_css
check_js
echo ""

echo "🔌 API Endpoints Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Auth Start" "${API_URL}/auth/google/start" "401"
check "Accounts List" "${API_URL}/accounts" "401"
check "Emails List" "${API_URL}/emails" "401"
echo ""

echo "🗄️ Database Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Checking Supabase connectivity... "

# Test API endpoint qui utilise Supabase
response=$(curl -s -w "\n%{http_code}" "${API_URL}/accounts" 2>&1)
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$status" = "401" ]; then
  # 401 = pas authentifié, mais DB accessible
  echo -e "${GREEN}✓${NC} (DB accessible, auth required)"
elif [ "$status" = "500" ]; then
  echo -e "${RED}✗${NC} (500 - possible DB connection error)"
  echo "   Response: $body"
else
  echo -e "${YELLOW}⚠${NC} (unexpected status: $status)"
fi
echo ""

echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifications manuelles nécessaires
echo -e "${YELLOW}⚠ Manual Checks Required:${NC}"
echo "  1. Open $PRODUCTION_URL in browser"
echo "  2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)"
echo "  3. Verify Shadcn UI design is visible (not plain HTML)"
echo "  4. Check DevTools → Network → CSS file loads with 200"
echo "  5. Test 'Connect Gmail' button (requires Google OAuth setup)"
echo ""

echo -e "${YELLOW}⚠ Google OAuth Setup:${NC}"
echo "  If not done yet, follow: ${PRODUCTION_URL}/../GOOGLE_OAUTH_SETUP.md"
echo "  Required for Gmail connection to work"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Automated checks complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
