# Guide de Configuration des Variables d'Environnement

## 🚨 Configuration Critique pour le Backend

Le backend nécessite plusieurs clés pour fonctionner correctement. Suivez ce guide pour les configurer.

---

## 1. Supabase Service Key (PRIORITÉ 1)

### Où la trouver ?
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet : **Gmail Client** (`lfhmxxwcvcvslzndemzh`)
3. Settings > API
4. Copiez la clé **`service_role`** (⚠️ **secret** - ne jamais exposer publiquement !)

### Mettre à jour backend/.env
```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M....  # Collez votre vraie clé ici
```

---

## 2. Google OAuth Credentials (PRIORITÉ 1)

### Créer ou récupérer les credentials

#### Si vous avez déjà configuré Google OAuth :
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionnez votre projet
3. APIs & Services > Credentials
4. Copiez Client ID et Client Secret

#### Si vous n'avez PAS encore configuré :
Suivez le guide détaillé dans `SUPABASE_AUTH_SETUP.md` section "Google Cloud Console"

### Mettre à jour backend/.env
```bash
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-client-secret
```

---

## 3. Encryption Key pour OAuth Tokens (PRIORITÉ 1)

Cette clé chiffre les tokens OAuth stockés dans la base de données (AES-256-GCM).

### Générer une clé sécurisée

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Exemple de sortie : `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

### Mettre à jour backend/.env
```bash
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456  # Votre clé générée
```

⚠️ **IMPORTANT** : Ne changez JAMAIS cette clé après avoir stocké des tokens OAuth, sinon vous ne pourrez plus les déchiffrer !

---

## 4. JWT Secrets (PRIORITÉ 2)

Secrets pour signer les tokens JWT d'authentification.

### Générer des secrets aléatoires

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Mettre à jour backend/.env
```bash
JWT_SECRET=votre_secret_jwt_genere_ici
JWT_REFRESH_SECRET=votre_refresh_secret_genere_ici
```

---

## 5. Redis (Optionnel en Dev)

En développement, vous pouvez utiliser le fallback mémoire :

```bash
USE_MEMORY_FALLBACK=true
```

Si vous voulez utiliser Redis local :

```bash
# Installer Redis (Mac)
brew install redis

# Démarrer Redis
brew services start redis

# Mettre à jour backend/.env
REDIS_URL=redis://localhost:6379
USE_MEMORY_FALLBACK=false
```

---

## 6. Autres Variables (Déjà Configurées)

Ces variables sont déjà correctement configurées dans `.env` :

```bash
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co  ✅
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback  ✅
FRONTEND_URL=http://localhost:5173  ✅
PORT=3000  ✅
NODE_ENV=development  ✅
LOG_LEVEL=info  ✅
```

---

## ✅ Checklist de Configuration

Avant de redémarrer le backend, vérifiez que vous avez configuré :

- [ ] `SUPABASE_SERVICE_KEY` (récupéré depuis Supabase Dashboard)
- [ ] `GOOGLE_CLIENT_ID` (depuis Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` (depuis Google Cloud Console)
- [ ] `ENCRYPTION_KEY` (généré avec node crypto)
- [ ] `JWT_SECRET` (généré avec node crypto)
- [ ] `JWT_REFRESH_SECRET` (généré avec node crypto)
- [ ] `USE_MEMORY_FALLBACK=true` (ou Redis configuré)

---

## 🚀 Redémarrer le Backend

Une fois toutes les variables configurées :

```bash
# Arrêter le backend actuel (Ctrl+C dans le terminal)

# Redémarrer
cd backend && npm run dev
```

### Vérifier que ça fonctionne :

1. Les logs doivent montrer :
   ```
   INFO: All background workers started
   DEBUG: Running scheduled email sync...
   ```

2. Plus d'erreurs `ENOTFOUND placeholder-project.supabase.co` ✅

3. Tester l'API :
   ```bash
   curl http://localhost:3000/health
   ```
   Devrait retourner : `{"status":"ok",...}`

---

## 🔐 Sécurité - IMPORTANT

⚠️ **Ne JAMAIS commit le fichier `.env` dans git !**

Le fichier `.gitignore` doit contenir :
```
.env
.env.local
.env.*.local
```

⚠️ **En production** :
- Utilisez des variables d'environnement sécurisées (Railway, Vercel, etc.)
- Activez Redis (pas de USE_MEMORY_FALLBACK)
- Changez tous les secrets
- Utilisez HTTPS partout

---

## 🆘 Dépannage

### Erreur : "fetch failed ENOTFOUND"
→ Vérifiez `SUPABASE_URL` et `SUPABASE_SERVICE_KEY`

### Erreur : "Invalid API key"
→ Vérifiez que vous avez copié la `service_role` key, pas l'`anon` key

### Erreur : "Encryption key must be 32 bytes"
→ Régénérez `ENCRYPTION_KEY` avec la commande crypto

### Workers ne démarrent pas
→ Vérifiez les logs, probablement un problème de connexion Supabase

---

**Fichier à éditer** : `/Users/benjaminbouquet/Documents/gmail-client/backend/.env`

Une fois configuré, passez à la configuration de Google OAuth dans Supabase (voir `SUPABASE_AUTH_SETUP.md`) !
