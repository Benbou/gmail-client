# 🔒 Révoquer les Clés Supabase Exposées

GitGuardian a détecté des secrets dans ton Git history. Voici comment les révoquer.

---

## Étape 1 : Identifier les Clés à Révoquer

Les clés exposées étaient dans l'ancien système Supabase :
- ❌ **service_role key** (ancien système, deprecated)
- ⚠️ Peut-être aussi **anon key** (mais moins grave car publique)

**Note** : On utilise maintenant les **API Secrets** (nouvelle méthode), donc il faut révoquer les anciennes.

---

## Étape 2 : Révoquer via Supabase Dashboard

### Option A : Regénérer l'API Secret (Recommandé)

Si Supabase te montre "API Secrets" :

```
1. https://supabase.com/dashboard
2. Projet "Gmail Client"
3. Settings → API
4. Section "API Secrets"
5. Clique sur "Rotate Secret" ou "Regenerate"
6. Copie le NOUVEAU secret
7. Update Vercel avec le nouveau (voir ci-dessous)
```

### Option B : Si tu vois encore "Service Keys"

Si Supabase montre encore l'ancien système :

```
1. https://supabase.com/dashboard
2. Projet "Gmail Client"
3. Settings → API
4. Section "Project API keys" ou "Service Keys"
5. Cherche un bouton "Reset" ou "Regenerate" à côté de service_role
6. Clique dessus
7. Copie la NOUVELLE clé
8. Update Vercel avec la nouvelle (voir ci-dessous)
```

### Option C : Migrer vers API Secrets (Meilleure Solution)

Si tu vois les deux systèmes :

```
1. Dashboard Supabase → Settings → API
2. Cherche la section "API Secrets" (nouveau système)
3. S'il y a un bouton "Migrate" ou "Generate API Secret", clique dessus
4. Copie le nouveau API Secret
5. Ignore complètement les "service_role" keys (deprecated)
6. Update Vercel avec le nouveau (voir ci-dessous)
```

---

## Étape 3 : Mettre à Jour Vercel

### Via Script (Plus Simple)

```bash
cd ~/Documents/gmail-client
./deploy-vercel.sh
```

Quand le script demande l'API Secret, colle le NOUVEAU secret de l'Étape 2.

### Via Dashboard Vercel (Manuel)

```
1. https://vercel.com/dashboard
2. Ton projet → Settings → Environment Variables
3. Trouve "SUPABASE_SERVICE_KEY"
4. Clique "Edit"
5. Colle le NOUVEAU secret
6. Save
7. Deployments → Redeploy
```

---

## Étape 4 : Vérifier GitGuardian

Une fois les clés révoquées :

```
1. Va sur ton email GitGuardian
2. Clique sur "Mark as revoked" ou "Resolve"
3. Confirme que tu as révoqué les clés
```

GitGuardian arrêtera les alertes.

---

## ❓ FAQ

### "Je ne trouve pas de bouton Reset/Regenerate"

Essaie ça :
1. Dashboard → Settings → API
2. Scroll tout en bas
3. Cherche "Rotate keys" ou "Reset service_role"
4. Ou contacte le support Supabase

### "J'ai peur de casser mon app"

C'est OK ! Voici la séquence safe :
1. Note l'ancienne clé quelque part (backup)
2. Génère la nouvelle
3. Update Vercel avec la nouvelle
4. Redéploie
5. Teste l'app
6. Si ça marche, supprime le backup
7. Si ça casse, remets l'ancienne et contacte-moi

### "Les nouvelles clés cassent mon app"

Vérifie que tu as bien mis à jour :
- ✅ Variable `SUPABASE_SERVICE_KEY` dans Vercel
- ✅ Pour Production, Preview, ET Development
- ✅ Redéployé après l'update

---

## 🎯 Récap

1. Dashboard Supabase → Settings → API
2. Cherche "API Secrets" ou "Reset service_role"
3. Génère nouveau secret
4. `./deploy-vercel.sh` (colle nouveau secret)
5. Marque comme "Revoked" dans GitGuardian

**Durée : 5 minutes**

---

## 🆘 Besoin d'Aide ?

Dis-moi :
1. Ce que tu vois dans Settings → API (fais un screenshot si possible)
2. Si tu vois "API Secrets" ou "Service Keys"
3. S'il y a un bouton "Reset" ou "Rotate"

Je t'aiderai avec les étapes exactes !
