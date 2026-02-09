# 🚀 Déploiement Rapide (Nouvelle Méthode Supabase)

## 📝 Nouvelles Clés Supabase

Supabase a changé leur système de clés :
- ❌ ~~service_role key~~ (deprecated)
- ✅ **API Secret** (nouvelle méthode)
- ✅ **Publishable key** (remplace anon key)

---

## Étape 1 : Récupérer les Clés Supabase (2 min)

### 1.1 Publishable Key (déjà récupérée)
```
sb_publishable_SQU74g27iA9mpU3VuFpgXA_EUuNLiwq
```

### 1.2 API Secret
```
1. Va sur https://supabase.com/dashboard
2. Ton projet "Gmail Client"
3. Settings → API
4. Section "API Secrets"
5. Copie le "secret" (commence par sb_secret_...)
```

⚠️ **Important** : Ne confonds pas avec la "legacy service_role key" !

---

## Étape 2 : Générer les Autres Secrets (1 min)

Lance dans ton terminal :

```bash
cd ~/Documents/gmail-client

# Génère tous les secrets
echo "=== COPIE CES VALEURS ==="
echo ""
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y="
```

---

## Étape 3 : Configurer Vercel (3 min)

### Option A : Script Automatique (RECOMMANDÉ)

Lance ce script, il va tout faire :

```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

Le script va te demander :
1. Ton API Secret Supabase (de l'Étape 1.2)
2. Tes Google OAuth credentials (si tu les as)

Et voilà, c'est déployé ! 🎉

### Option B : Manuellement via Dashboard

Si le script ne marche pas :

```
1. https://vercel.com/dashboard
2. Ton projet → Settings → Environment Variables
3. Ajoute ces variables pour Production, Preview, Development :
```

**Frontend** (public) :
```
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SQU74g27iA9mpU3VuFpgXA_EUuNLiwq
```

**Backend** (secret) :
```
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=<ton API Secret de l'Étape 1.2>
ENCRYPTION_KEY=<généré à l'Étape 2>
JWT_SECRET=<généré à l'Étape 2>
JWT_REFRESH_SECRET=<généré à l'Étape 2>
CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y=
FRONTEND_URL=https://gmail-client-xi-lemon.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

Ensuite :
```
4. Deployments → Redeploy
```

---

## Étape 4 : Activer Google OAuth dans Supabase (1 min)

```
1. Dashboard Supabase → Authentication → Providers
2. Active "Google"
3. Redirect URL: https://gmail-client-xi-lemon.vercel.app/**
```

---

## ✅ Vérification

Après 2-3 minutes :

1. Va sur https://gmail-client-xi-lemon.vercel.app
2. Pas de 404 ? ✅ Frontend OK
3. Ouvre la console (F12)
4. Pas d'erreurs ? ✅ Bon !

---

## 📊 Différences Anciennes vs Nouvelles Clés

| Ancienne Méthode | Nouvelle Méthode |
|------------------|------------------|
| `service_role` key | `API Secret` (sb_secret_...) |
| `anon` key | `Publishable` key (sb_publishable_...) |
| Deprecated ⚠️ | Recommandé ✅ |

---

## 🆘 Problèmes ?

**"Je ne trouve pas API Secret"**
→ Dashboard Supabase → Settings → API → Section "API Secrets"

**"Le script ne marche pas"**
→ Utilise l'Option B (Dashboard manuel)

**"Erreur CORS"**
→ Vérifie que FRONTEND_URL dans Vercel = ton URL Vercel

---

**Temps total : 7 minutes**
