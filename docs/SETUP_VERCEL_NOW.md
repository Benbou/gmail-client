# Configuration Vercel - Guide Rapide

## Étape 1 : Générer les secrets (2 min)

Ouvre ton terminal et lance ces commandes. **Copie les résultats** dans un fichier texte :

```bash
echo "=== ENCRYPTION_KEY ==="
openssl rand -hex 32

echo -e "\n=== CRON_SECRET ==="
openssl rand -base64 32

echo -e "\n=== JWT_SECRET ==="
openssl rand -base64 32

echo -e "\n=== JWT_REFRESH_SECRET ==="
openssl rand -base64 32
```

**Sauvegarde ces 4 valeurs** — tu en auras besoin dans 2 minutes.

---

## Étape 2 : Récupérer les infos Supabase (1 min)

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionne ton projet
3. Va dans **Settings** → **API**
4. Copie ces 3 valeurs :
   - **Project URL** (ex: `https://lfhmxxwcvcvslzndemzh.supabase.co`)
   - **anon public** (commence par `eyJhbGc...`)
   - **service_role** ⚠️ (commence par `eyJhbGc...` — DIFFÉRENT de anon)

---

## Étape 3 : Configurer Vercel (5 min)

### A. Va dans Vercel

1. [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionne ton projet `gmail-client`
3. **Settings** → **Environment Variables**

### B. Ajoute ces variables

**Copie-colle EXACTEMENT** (remplace les `<...>` par tes vraies valeurs) :

```bash
# === FRONTEND ===
VITE_API_URL=/api
VITE_SUPABASE_URL=<TON_SUPABASE_PROJECT_URL>
VITE_SUPABASE_ANON_KEY=<TON_SUPABASE_ANON_KEY>

# === BACKEND ===
SUPABASE_URL=<TON_SUPABASE_PROJECT_URL>
SUPABASE_SERVICE_KEY=<TON_SUPABASE_SERVICE_ROLE_KEY>
GOOGLE_CLIENT_ID=<TON_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<TON_GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=<VALEUR_ETAPE_1>
CRON_SECRET=<VALEUR_ETAPE_1>
JWT_SECRET=<VALEUR_ETAPE_1>
JWT_REFRESH_SECRET=<VALEUR_ETAPE_1>
FRONTEND_URL=https://gmail-client-xi-lemon.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

### C. Important : Environnement

Pour **chaque variable**, sélectionne les 3 environnements :
- ✅ Production
- ✅ Preview
- ✅ Development

### D. Redéployer

Après avoir ajouté TOUTES les variables :

1. Va dans **Deployments**
2. Clique sur **...** à côté du dernier déploiement
3. Clique **Redeploy**
4. Attends 2-3 minutes

---

## Étape 4 : Vérifier que ça marche (1 min)

1. Va sur `https://gmail-client-xi-lemon.vercel.app`
2. Tu dois voir le frontend (pas de 404)
3. Appuie sur F12 → Console
4. Pas d'erreurs rouges = ✅ bon !

Si tu vois des erreurs, vérifie que tu as bien :
- Copié TOUTES les variables
- Sélectionné les 3 environnements
- Redéployé

---

## Étape 5 : Configurer Google OAuth (2 min)

1. Va sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Clique sur ton OAuth 2.0 Client ID
3. Dans **Authorized redirect URIs**, ajoute :
   ```
   https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
   https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
   ```
4. **Save**

---

## Étape 6 : Configurer Supabase Site URL (1 min)

1. [Supabase Dashboard](https://supabase.com/dashboard) → Ton projet
2. **Authentication** → **URL Configuration**
3. Modifie :
   - **Site URL** : `https://gmail-client-xi-lemon.vercel.app`
   - **Redirect URLs** : `https://gmail-client-xi-lemon.vercel.app/**`
4. **Save**

---

## Étape 7 : Setup Supabase pg_cron (3 min)

### A. Créer le secret cron

1. [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**
2. Copie-colle cette commande (remplace `XXX` par ton `CRON_SECRET` de l'Étape 1) :

```sql
SELECT vault.create_secret('XXX', 'cron_secret');
```

3. **Run** (ou `Cmd+Enter`)

### B. Appliquer la migration cron

**Option 1 : Via CLI** (recommandé)
```bash
cd ~/Documents/gmail-client
supabase link --project-ref lfhmxxwcvcvslzndemzh
supabase db push
```

**Option 2 : Via Dashboard**
1. Ouvre le fichier `supabase/migrations/20260209_001_setup_cron_jobs.sql`
2. Copie TOUT le contenu
3. Supabase Dashboard → **SQL Editor**
4. Colle et **Run**

### C. Vérifier que les jobs sont créés

Dans le SQL Editor, lance :

```sql
SELECT jobid, jobname, schedule, active FROM cron.job;
```

Tu dois voir 3 jobs :
- `gmail-sync` (schedule: `*/2 * * * *`)
- `token-refresh` (schedule: `*/5 * * * *`)
- `scheduled-actions` (schedule: `* * * * *`)

---

## ✅ C'est bon !

Ton app est maintenant déployée sur Vercel + Supabase.

**Teste** :
1. Va sur `https://gmail-client-xi-lemon.vercel.app`
2. Clique "Sign in with Google"
3. Login
4. Clique "Connect Gmail"
5. Autorise
6. Attends 2-5 minutes
7. Les emails devraient apparaître !

---

## 🚨 Problèmes ?

### "404 Not Found"
- Attends 2-3 minutes (propagation Vercel)
- Vérifie que le déploiement est **Ready** dans Vercel

### "OAuth failed"
- Vérifie que `GOOGLE_REDIRECT_URI` dans Vercel = URI dans Google Console
- Pas d'espace, pas de `/` à la fin

### "No emails syncing"
Vérifie les cron jobs :

```sql
SELECT jobname, status, start_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

Si vide → le secret cron n'est pas bon. Vérifie que `CRON_SECRET` dans Vercel = secret dans Supabase Vault.

---

## 📚 Guides complets

- Variables d'environnement : `VERCEL_ENV_VARIABLES.md`
- Setup cron détaillé : `SUPABASE_CRON_SETUP.md`
- Déploiement complet : `QUICK_START.md`

---

**Temps total : ~15 minutes**
**Coût : $0/mois** 🎉
