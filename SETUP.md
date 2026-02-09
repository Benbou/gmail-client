# Setup Gmail Client

## 🎯 Pour Déployer (Version Simple)

### Tu as besoin de :
1. Un compte Vercel (gratuit)
2. Un projet Supabase (déjà créé : "Gmail Client")

### Étapes :

#### 1. Récupère ta clé Supabase (2 min)
```
https://supabase.com/dashboard
→ Projet "Gmail Client"
→ Settings → API
→ Copie "service_role" key
```

#### 2. Configure Vercel avec Vercel Secrets (5 min)

**Option A : Via Dashboard Vercel** (plus simple)
```
https://vercel.com/dashboard
→ Ton projet → Settings → Environment Variables
→ Ajoute ces variables (avec TES vraies valeurs) :
```

Variables Frontend :
```
VITE_API_URL=/api
VITE_SUPABASE_URL=<ton-url-supabase>
VITE_SUPABASE_ANON_KEY=<ta-clé-anon>
```

Variables Backend :
```
SUPABASE_URL=<ton-url-supabase>
SUPABASE_SERVICE_KEY=<la-clé-de-étape-1>
ENCRYPTION_KEY=<génère avec: openssl rand -hex 32>
JWT_SECRET=<génère avec: openssl rand -base64 32>
JWT_REFRESH_SECRET=<génère avec: openssl rand -base64 32>
CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y=
FRONTEND_URL=https://ton-app.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

**Option B : Via Vercel CLI** (automatique)
```bash
vercel login
vercel link
vercel env add SUPABASE_SERVICE_KEY production
# (colle ta clé quand demandé)
# Répète pour chaque variable
```

#### 3. Déploie
```bash
vercel --prod
```

#### 4. Active Google OAuth dans Supabase (1 min)
```
Dashboard Supabase → Authentication → Providers
→ Active "Google"
→ Redirect URL: https://ton-app.vercel.app/**
```

## ✅ C'est Tout !

Ton app est en ligne. Les cron jobs tournent automatiquement (déjà configurés dans Supabase).

---

## 🔒 Sécurité : Pourquoi des Variables d'Environnement ?

Les **secrets** (clés API) ne peuvent PAS être dans le code Git public.

**Solution** : Vercel Secrets (ou Environment Variables)
- Les secrets sont stockés de manière sécurisée chez Vercel
- Jamais exposés dans le code
- Accessibles uniquement par ton app

C'est la méthode standard pour toutes les apps (Next.js, Vercel, etc.)

---

## 🆘 Problème : Secrets Exposés dans Git ?

Si GitHub t'a alerté :

1. **Révoquer les secrets compromis** :
   ```
   Supabase Dashboard → Settings → API
   → Reset service_role key (génère une nouvelle)
   ```

2. **Supprimer du Git history** :
   ```bash
   # Les fichiers avec secrets sont déjà supprimés
   git add -A
   git commit -m "fix: Remove exposed secrets"
   git push --force
   ```

3. **Reconfigurer Vercel** avec les nouvelles clés

---

Pour plus de détails : voir `CLAUDE.md`
