# Configuration de Supabase Auth avec Google OAuth

Ce guide vous explique comment configurer l'authentification Google OAuth dans votre projet Supabase.

## 📋 Prérequis

- Projet Supabase: `lfhmxxwcvcvslzndemzh` (Gmail Client)
- URL du projet: `https://lfhmxxwcvcvslzndemzh.supabase.co`
- Un projet Google Cloud Console avec les API activées

---

## 1️⃣ Configuration dans Google Cloud Console

### A. Créer/Configurer le projet OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionnez ou créez un projet
3. Activez les APIs nécessaires:
   - Gmail API
   - Google+ API (pour les informations de profil)

### B. Créer les credentials OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Type d'application: **Web application**
4. Nom: `Gmail Client - Supabase Auth`

### C. Configurer les Redirect URIs

**IMPORTANT**: Ajoutez ces deux URLs exactement comme indiqué :

```
https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
```

### D. Configurer les Authorized JavaScript origins

```
https://lfhmxxwcvcvslzndemzh.supabase.co
http://localhost:5173
```

### E. Configurer les scopes OAuth (écran de consentement)

1. Allez dans **OAuth consent screen**
2. Ajoutez ces scopes:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

3. **Sauvegardez** le Client ID et Client Secret

---

## 2️⃣ Configuration dans Supabase Dashboard

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet: **Gmail Client**
3. Allez dans **Authentication** > **Providers**
4. Trouvez **Google** dans la liste et cliquez dessus

### Configuration Google Provider

Activez le provider et configurez:

```yaml
Enabled: ✅ ON

Client ID: <VOTRE_GOOGLE_CLIENT_ID>
Client Secret: <VOTRE_GOOGLE_CLIENT_SECRET>

Authorized Client IDs: (laisser vide sauf si vous utilisez iOS/Android)

Skip nonce check: ❌ OFF (recommandé)
```

### Advanced Settings (optionnel mais recommandé)

```yaml
Additional Scopes:
https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify
```

5. Cliquez sur **Save**

---

## 3️⃣ Configuration des URLs de redirection autorisées

Dans **Authentication** > **URL Configuration** :

### Site URL
```
http://localhost:5173
```

### Redirect URLs
Ajoutez ces URLs :
```
http://localhost:5173/inbox
http://localhost:5173/**
```

---

## 4️⃣ Configuration RLS (Row Level Security)

Le projet utilise une table `users` personnalisée. Nous devons la lier avec `auth.users`.

### Mise à jour du schéma

Exécutez cette migration SQL dans **SQL Editor** :

```sql
-- Assurez-vous que la table users accepte les IDs de auth.users
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_pkey;

ALTER TABLE public.users
ADD PRIMARY KEY (id);

-- Désactiver le trigger de génération automatique d'ID si existant
-- et permettre d'utiliser les IDs de auth.users (UUID)

-- Créer un trigger pour créer automatiquement un user dans public.users
-- quand un utilisateur s'inscrit via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Mettre à jour les politiques RLS pour utiliser auth.uid()
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user data" ON public.users;
CREATE POLICY "Users can view own user data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own user data" ON public.users;
CREATE POLICY "Users can update own user data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
```

---

## 5️⃣ Variables d'environnement

### Frontend (`.env`)

Déjà configuré dans `/frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjA4MTEsImV4cCI6MjA4NDMzNjgxMX0.fHhgzw8HYdL7BX_FL8jobnTBZREa_lX3VnHrOj5rR1I
```

### Backend

Le backend n'a pas besoin de changements pour l'auth Supabase Auth. Il continuera à recevoir les tokens Supabase dans les headers `Authorization: Bearer <token>`.

---

## 6️⃣ Test du flow d'authentification

1. Démarrez le frontend:
   ```bash
   cd frontend && npm run dev
   ```

2. Ouvrez `http://localhost:5173`

3. Cliquez sur **"Continuer avec Google"**

4. Vous devriez:
   - Être redirigé vers Google OAuth
   - Accepter les permissions (email, profile, Gmail)
   - Être redirigé vers `/inbox`
   - Voir votre profil dans le TopBar

---

## 🎨 Nouvelle UI de Login

La nouvelle page de login inclut:
- ✅ Gradient moderne (bleu/violet)
- ✅ Logo avec icône Mail
- ✅ Bouton "Continuer avec Google" avec logo Google
- ✅ Design responsive
- ✅ Dark mode support
- ✅ Messages de sécurité rassurants

---

## 🔧 Dépannage

### Erreur "Invalid redirect URI"
- Vérifiez que l'URL de callback dans Google Console est exactement:
  `https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback`

### Erreur "Access blocked: Gmail Client has not completed verification"
- En développement, ajoutez votre email Google comme "Test user" dans l'écran de consentement OAuth

### L'utilisateur se connecte mais n'est pas créé dans `public.users`
- Vérifiez que le trigger SQL a bien été exécuté
- Regardez les logs dans Supabase Dashboard > Database > Logs

### Token expiré / 401 errors
- Les tokens Supabase expirent après 1h mais sont automatiquement rafraîchis
- Le client Supabase gère le refresh automatiquement

---

## 📊 Différences avec l'ancien système

| Ancien (JWT Custom) | Nouveau (Supabase Auth) |
|---------------------|-------------------------|
| Email + Name form   | Google OAuth direct |
| JWT custom (15min)  | Supabase JWT (1h auto-refresh) |
| localStorage manual | Supabase session auto-managed |
| Pas de profil photo | Avatar Google automatique |
| 2 étapes (signup + Gmail) | 1 clic "Sign in with Google" |

---

## ✅ Checklist finale

- [ ] Google OAuth configuré dans Google Cloud Console
- [ ] Redirect URI ajouté : `https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback`
- [ ] Scopes Gmail ajoutés dans Google consent screen
- [ ] Google Provider activé dans Supabase Dashboard
- [ ] Client ID & Secret ajoutés dans Supabase
- [ ] Migration SQL exécutée (trigger + RLS)
- [ ] Frontend `.env` mis à jour
- [ ] Test de connexion réussi
- [ ] Utilisateur créé dans `public.users`

---

## 🚀 Prochaines étapes

Une fois l'auth configurée, vous pourrez:
1. Connecter des comptes Gmail supplémentaires via Settings
2. Utiliser l'AccountSwitcher pour basculer entre comptes
3. Bénéficier du refresh automatique des tokens
4. Avoir des avatars Google automatiques

Profitez de votre nouvelle UI moderne ! 🎉
