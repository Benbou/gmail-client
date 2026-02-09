# Google OAuth Setup Guide

Ce guide vous aide à configurer Google OAuth pour permettre aux utilisateurs de connecter leurs comptes Gmail.

---

## Étape 1: Créer un Projet Google Cloud

1. **Aller sur**: https://console.cloud.google.com
2. **Créer un nouveau projet** (ou sélectionner un existant)
   - Nom suggéré: "Gmail Client"
   - Click "CREATE"

---

## Étape 2: Activer Gmail API

1. **Dans le menu de gauche**: APIs & Services → Library
2. **Chercher**: "Gmail API"
3. **Cliquer sur "Gmail API"**
4. **Click "ENABLE"**

---

## Étape 3: Créer OAuth 2.0 Credentials

1. **Dans le menu de gauche**: APIs & Services → Credentials
2. **Click "CREATE CREDENTIALS"** → OAuth client ID
3. **Si demandé, configurer OAuth consent screen d'abord**:
   - User Type: **External**
   - App name: **Gmail Client**
   - User support email: **votre email**
   - Developer contact: **votre email**
   - Scopes: Ajouter les scopes suivants:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Test users: Ajouter votre email Gmail (obligatoire en mode testing)
   - Click "SAVE AND CONTINUE"

4. **Revenir à Credentials** → CREATE CREDENTIALS → OAuth client ID
5. **Application type**: Web application
6. **Name**: "Gmail Client Web"
7. **Authorized JavaScript origins**:
   ```
   https://gmail-client-xi-lemon.vercel.app
   ```

8. **Authorized redirect URIs** (ajouter les 2):
   ```
   https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
   https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
   ```

   ⚠️ **IMPORTANT**: Pas de trailing slash ! Les URLs doivent matcher exactement.

9. **Click "CREATE"**
10. **Copier les credentials** (vous allez les utiliser plus tard):
    - Client ID (format: `xxxxx.apps.googleusercontent.com`)
    - Client secret (format: `GOCSPX-xxxxx`)

---

## Étape 4: Configurer Variables d'Environnement Vercel

1. **Aller sur**: https://vercel.com/dashboard
2. **Sélectionner votre projet**: gmail-client
3. **Settings** → **Environment Variables**
4. **Ajouter les variables suivantes** (pour Production, Preview, Development):

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
```

**Remplacer `xxxxx`** par vos vraies valeurs copiées à l'étape 3.

5. **Click "Save"** pour chaque variable

---

## Étape 5: Configurer Google Provider dans Supabase

1. **Aller sur**: https://supabase.com/dashboard
2. **Sélectionner votre projet**: lfhmxxwcvcvslzndemzh
3. **Authentication** → **Providers**
4. **Trouver "Google"** et click pour développer
5. **Enable Google provider**: Toggle ON
6. **Client ID**: Copier votre Google Client ID (étape 3)
7. **Client Secret**: Copier votre Google Client Secret (étape 3)
8. **Click "Save"**

---

## Étape 6: Redéployer l'Application

1. **Aller sur Vercel Dashboard** → Deployments
2. **Click sur le dernier deployment** (celui avec le CSS fix)
3. **Click "..." (three dots)** → **Redeploy**
4. **Confirmer** → Use existing Build Cache: **NO** (forcer rebuild complet)

**Attendre 2-3 minutes** que le déploiement se termine.

---

## Étape 7: Tester l'Application

### Test 1: Vérifier que le CSS fonctionne

1. **Ouvrir**: https://gmail-client-xi-lemon.vercel.app
2. **Hard refresh**: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows)
3. **Vérifier**:
   - ✅ Sidebar avec design Shadcn UI (pas de HTML brut)
   - ✅ Bouton "Connect Gmail" stylé
   - ✅ Dark mode actif

**Si le CSS ne charge toujours pas**:
- Ouvrir DevTools (F12) → Network tab → Filter "CSS"
- Vérifier que `/assets/index-*.css` charge avec status **200**
- Si 404: Attendre 2-3 min (CDN propagation)
- Si encore 404: Check vercel build logs

### Test 2: Tester le Login Google (Supabase Auth)

1. **Click "Continue with Google"** (si pas encore connecté)
2. **Devrait rediriger vers Google OAuth**
3. **Sélectionner votre compte Google**
4. **Accepter les permissions**
5. **Devrait rediriger vers** `/inbox`
6. **Vérifier**: Vous êtes logged in (voir bouton user en haut)

### Test 3: Connecter un Compte Gmail

1. **Click "Connect Gmail"** button
2. **Devrait rediriger vers Google OAuth consent screen**
3. **Important**: Si vous voyez "This app isn't verified":
   - Click "Advanced"
   - Click "Go to Gmail Client (unsafe)" (c'est normal en mode testing)
4. **Accepter toutes les permissions** (Gmail read, send, modify)
5. **Devrait rediriger vers** `/inbox?connected=true&accountId=xxx`
6. **Page reload** et devrait afficher:
   - ✅ Email list (ou "No emails yet" si inbox vide)
   - ✅ Votre email Gmail dans la sidebar

### Test 4: Vérifier la Synchronisation

1. **Ouvrir Supabase Dashboard** → Table Editor → `gmail_accounts`
2. **Vérifier**: Votre account apparaît avec:
   - `email`: votre Gmail
   - `access_token_encrypted`: Valeur cryptée (non vide)
   - `token_expires_at`: Date future

3. **Table `emails`**: Devrait contenir vos emails synchronisés
   - Si vide: Attendre 2 min (cron job run)
   - Ou forcer sync: `POST /api/accounts/{accountId}/sync`

---

## Troubleshooting

### Erreur: "redirect_uri_mismatch"

**Cause**: Les redirect URIs ne matchent pas exactement entre:
- Google Console
- Variable d'environnement Vercel `GOOGLE_REDIRECT_URI`

**Solution**:
1. Vérifier Google Console → Credentials → Authorized redirect URIs
2. Vérifier Vercel → Environment Variables → `GOOGLE_REDIRECT_URI`
3. **DOIVENT être identiques** (pas de trailing slash, même protocole)

### Erreur: "access_denied"

**Cause**: L'app est en mode "Testing" et votre email n'est pas dans la liste des test users

**Solution**:
1. Google Console → APIs & Services → OAuth consent screen
2. Section "Test users" → Add users
3. Ajouter votre email Gmail
4. Save

### Pas d'emails synchronisés

**Cause**: Cron job pas encore exécuté ou erreur dans le worker

**Solution**:
1. Supabase Dashboard → SQL Editor:
   ```sql
   SELECT * FROM cron.job_run_details
   ORDER BY start_time DESC
   LIMIT 10;
   ```
2. Vérifier le status de "sync-emails-job"
3. Si erreurs: Check les logs (`sync_logs` table)

### CSS ne charge toujours pas

**Cause**: Cache browser ou CDN Vercel

**Solution**:
1. Hard refresh: `Cmd+Shift+R`
2. Essayer en mode incognito
3. Vérifier Network tab (DevTools) → `/assets/index-*.css` devrait être 200
4. Si 404: Attendre 5 min (CDN propagation)
5. Si toujours 404: Check Vercel build logs (assets générés?)

---

## Checklist Complète

- [ ] Projet Google Cloud créé
- [ ] Gmail API activée
- [ ] OAuth 2.0 Client créé
- [ ] Redirect URIs configurés (x2)
- [ ] OAuth consent screen configuré
- [ ] Test user ajouté (votre email)
- [ ] Variables Vercel configurées (GOOGLE_CLIENT_ID, SECRET, REDIRECT_URI)
- [ ] Google provider activé dans Supabase
- [ ] Application redéployée
- [ ] CSS fonctionne (Shadcn UI visible)
- [ ] Login Google fonctionne
- [ ] Connect Gmail fonctionne
- [ ] Emails synchronisés

---

## Notes Importantes

1. **Mode Testing vs Production**:
   - En mode "Testing", seuls les test users peuvent utiliser l'app
   - Pour passer en Production: OAuth consent screen → "PUBLISH APP"
   - ⚠️ Google review peut prendre 1-6 semaines

2. **Scopes Gmail**:
   - `gmail.readonly`: Lire les emails
   - `gmail.send`: Envoyer des emails
   - `gmail.modify`: Modifier (archive, star, etc.)
   - `userinfo.email`: Obtenir l'email de l'utilisateur

3. **Token Refresh**:
   - Les access tokens expirent après 1h
   - Le cron job `refresh-tokens-job` les rafraîchit toutes les 5 min
   - Les refresh tokens n'expirent jamais (sauf révocation)

4. **Sécurité**:
   - OAuth tokens sont encryptés (AES-256-GCM) dans la DB
   - Jamais exposés au frontend
   - Rotation automatique des tokens

---

**Dernière mise à jour**: 2026-02-09
**Support**: Si problème, check les logs Vercel et Supabase
