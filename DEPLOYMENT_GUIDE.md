# Guide de Déploiement sur Vercel + Railway

Ce guide vous aide à déployer le Gmail Client sur un environnement de test.

## 🏗️ Architecture de Déploiement

- **Frontend** : Vercel (React + Vite)
- **Backend** : Railway ou Render (Express + Cron Jobs)
- **Database** : Supabase (déjà configuré)

**Pourquoi Railway/Render pour le backend ?**
- Vercel Serverless Functions ne supporte PAS les cron jobs en background
- Les workers (sync toutes les 2 min, token refresh, etc.) nécessitent un serveur qui tourne en continu

---

## 🚀 Déploiement Frontend sur Vercel

### 1. Créer le projet Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" > "Project"
4. Importez `Benbou/gmail-client`
5. Configuration :
   - **Framework Preset** : Vite
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 2. Variables d'Environnement Vercel

Dans Vercel Dashboard > Settings > Environment Variables, ajoutez :

```bash
VITE_API_URL=https://votre-backend.railway.app  # À remplacer après déploiement backend
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjA4MTEsImV4cCI6MjA4NDMzNjgxMX0.fHhgzw8HYdL7BX_FL8jobnTBZREa_lX3VnHrOj5rR1I
```

### 3. Déployer

```bash
# Dans votre terminal local
git add .
git commit -m "feat: prepare for Vercel deployment"
git push origin main
```

Vercel déploiera automatiquement ! 🎉

---

## 🚂 Déploiement Backend sur Railway

### 1. Créer un compte Railway

1. Allez sur [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Choisissez "Deploy from GitHub repo"
5. Sélectionnez `Benbou/gmail-client`

### 2. Configuration Railway

**Root Directory** : `backend`

Railway détecte automatiquement Node.js et utilise `npm start`.

### 3. Variables d'Environnement Railway

Dans Railway Dashboard > Variables, ajoutez :

```bash
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=https://votre-backend.railway.app/api/auth/google/callback

SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2MDgxMSwiZXhwIjoyMDg0MzM2ODExfQ.Mkl8uwGK-8alfjyJSSkVDYxwWtQqJa9_NpAYnCGzRnc

JWT_SECRET=jqat9r/1RnOVIfOSMbd+xJ9Ng4+eR9y2/fK4PEjzzj8rEHP801DjEu8VZFm/WloSZPiXtYgeMvC7n6E0L5L2vw==
JWT_REFRESH_SECRET=yAJTM9+9bwYqmomG4FtwfiII3oKJ7x/e3iWRiYupnKIaF5V4D4xFddMAxPR/WVCjad6GaEWAu4cDN6D79m5t3Q==

ENCRYPTION_KEY=446bdbaa803f4b05b342374beb25d002f0138aa43d6ded73b344c1cbd6f95d04

REDIS_URL=${{RAILWAY_REDIS_URL}}  # Railway Redis addon
USE_MEMORY_FALLBACK=false  # Utilisez Redis en production

FRONTEND_URL=https://votre-frontend.vercel.app

PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

### 4. Ajouter Redis (Optionnel mais recommandé)

Dans Railway Dashboard :
1. Click "New" > "Database" > "Add Redis"
2. La variable `REDIS_URL` sera automatiquement configurée

### 5. Déployer

Railway déploie automatiquement après push sur GitHub !

```bash
git push origin main
```

### 6. Récupérer l'URL du backend

Après déploiement, copiez l'URL Railway (ex: `https://gmail-client-production.up.railway.app`)

### 7. Mettre à jour Vercel

Retournez dans Vercel > Environment Variables et mettez à jour :

```bash
VITE_API_URL=https://gmail-client-production.up.railway.app
```

Redéployez le frontend Vercel.

---

## 🔐 Configuration Google OAuth en Production

### 1. Google Cloud Console

Dans votre projet Google Cloud :

**Authorized JavaScript origins** :
```
https://votre-frontend.vercel.app
https://lfhmxxwcvcvslzndemzh.supabase.co
```

**Authorized redirect URIs** :
```
https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback  # Supabase Auth
https://votre-backend.railway.app/api/auth/google/callback  # Backend OAuth
```

### 2. Supabase Dashboard

Dans Supabase Dashboard > Authentication > URL Configuration :

**Site URL** :
```
https://votre-frontend.vercel.app
```

**Redirect URLs** :
```
https://votre-frontend.vercel.app/inbox
https://votre-frontend.vercel.app/**
```

---

## 📋 Checklist de Déploiement

### Préparation
- [ ] Repository GitHub à jour (`git push origin main`)
- [ ] Google OAuth Client ID et Secret récupérés
- [ ] Supabase service key copiée

### Frontend Vercel
- [ ] Projet Vercel créé et lié au repo GitHub
- [ ] Root directory = `frontend`
- [ ] Build command = `npm run build`
- [ ] Output directory = `dist`
- [ ] Variables d'environnement configurées (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Premier déploiement réussi
- [ ] URL frontend récupérée

### Backend Railway
- [ ] Projet Railway créé et lié au repo GitHub
- [ ] Root directory = `backend`
- [ ] Toutes les variables d'environnement configurées
- [ ] Redis addon ajouté (optionnel)
- [ ] Premier déploiement réussi
- [ ] URL backend récupérée
- [ ] Logs Railway montrent "All background workers started"

### Configuration Google OAuth
- [ ] Authorized origins mis à jour avec URL Vercel
- [ ] Redirect URIs mis à jour avec URLs production
- [ ] Variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans Railway

### Configuration Supabase
- [ ] Site URL mis à jour dans Supabase Dashboard
- [ ] Redirect URLs mises à jour

### Tests
- [ ] Visiter l'URL Vercel → page de login s'affiche
- [ ] Cliquer "Sign in with Google" → OAuth fonctionne
- [ ] Après login → redirecté vers inbox
- [ ] Backend logs Railway → sync automatique démarre
- [ ] Emails apparaissent dans l'inbox (2-5 min)

---

## 🔧 Dépannage

### Erreur : "CORS policy"
→ Vérifiez `FRONTEND_URL` dans Railway variables

### Erreur : "OAuth redirect_uri_mismatch"
→ Vérifiez Authorized redirect URIs dans Google Console

### Workers ne démarrent pas
→ Vérifiez Railway logs : `railway logs`

### Erreur : "ENOTFOUND Supabase"
→ Vérifiez `SUPABASE_URL` dans Railway

---

## 🎯 URLs Finales

Après déploiement, vous aurez :

- **Frontend** : `https://gmail-client-xxxxxx.vercel.app`
- **Backend** : `https://gmail-client-production.up.railway.app`
- **Database** : `https://lfhmxxwcvcvslzndemzh.supabase.co`

---

## 🚀 Déploiement Rapide (TL;DR)

```bash
# 1. Commit et push
git add .
git commit -m "feat: deploy to production"
git push origin main

# 2. Vercel
# - Import repo
# - Root: frontend
# - Add env vars
# - Deploy

# 3. Railway
# - Import repo
# - Root: backend
# - Add env vars
# - Add Redis
# - Deploy

# 4. Mettre à jour VITE_API_URL dans Vercel avec URL Railway
# 5. Mettre à jour Google OAuth redirect URIs
# 6. Tester !
```

Bonne chance ! 🎉
