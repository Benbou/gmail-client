# Generate Supabase API Secret

**Action requise** : Tu dois générer un nouveau API Secret dans Supabase.

---

## Pourquoi ?

Tu utilises actuellement les anciennes clés "service_role" (format JWT) qui sont **désactivées** dans ton projet Supabase. Supabase utilise maintenant les **API Secrets** (format `sb_secret_...`).

---

## Comment Générer (2 minutes)

### 1. Ouvre le Dashboard Supabase

https://supabase.com/dashboard/project/lfhmxxwcvcvslzndemzh

### 2. Va dans Settings → API

**Navigation** :
- Clique sur "Settings" (icône ⚙️ en bas à gauche)
- Clique sur "API"

### 3. Section "API Secrets"

**Scroll down** jusqu'à la section **"API Secrets"** (pas "Project API keys" qui contient les anciennes clés).

### 4. Génère un Nouveau Secret

- Clique sur le bouton **"Generate new secret"**
- Une popup apparaît avec le secret (commence par `sb_secret_...`)
- **COPIE LE SECRET MAINTENANT** (tu ne pourras plus le voir après)

### 5. Sauvegarde le Secret

Copie le secret quelque part de sûr (gestionnaire de mots de passe ou note temporaire).

Format : `sb_secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

## Prochaine Étape

Une fois que tu as le secret :

```bash
./deploy-vercel.sh
```

Le script te demandera le secret et mettra à jour automatiquement toutes les variables d'environnement Vercel.

---

## Vérification

Après déploiement, le site devrait fonctionner sans erreur "Legacy API keys disabled".

---

**Temps estimé** : 2 minutes
