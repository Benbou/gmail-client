# 🔑 Activer les API Secrets Supabase (Nouvelle Méthode)

Tu as désactivé l'ancienne service_role key. Bien ! Maintenant activons le nouveau système.

---

## Étape 1 : Va dans Supabase Dashboard

```
https://supabase.com/dashboard
→ Projet "Gmail Client"
→ Settings → API
```

---

## Étape 2 : Activer les API Secrets

Tu devrais voir **deux sections** :

### Section A : "Project API keys" (Ancien Système) ❌
- anon key
- service_role key (celle que tu as disabled)

**→ IGNORE cette section !** C'est l'ancien système.

### Section B : "API Secrets" (Nouveau Système) ✅

**C'est là qu'on va !**

Tu devrais voir :
- Un bouton **"Generate new secret"** ou **"Create API secret"**
- Ou peut-être un secret déjà créé

---

## Étape 3 : Générer un Nouveau Secret

### Si tu vois "Generate new secret" :
```
1. Clique sur "Generate new secret"
2. Donne-lui un nom (ex: "production-secret")
3. Copie le secret (commence par sb_secret_...)
4. ⚠️ SAUVEGARDE-LE ! Tu ne pourras plus le revoir après
```

### Si tu vois déjà un secret créé :
```
1. Il y a peut-être déjà un secret "default"
2. Clique dessus pour voir les détails
3. Si tu peux le copier, copie-le
4. Sinon, génère-en un nouveau
```

### Si tu ne vois PAS "API Secrets" :

Ça veut dire que ton projet n'a pas encore migré. Fais ça :

```
1. Cherche un bandeau ou message "Migrate to API Secrets"
2. Clique sur "Migrate" ou "Enable API Secrets"
3. Suis les instructions
4. Génère le secret
```

---

## Étape 4 : Configurer Vercel avec le Nouveau Secret

Une fois que tu as ton **API Secret** (sb_secret_...) :

```bash
cd ~/Documents/gmail-client
./deploy-vercel.sh
```

Quand le script demande l'API Secret, **colle le nouveau secret**.

---

## Étape 5 : Vérifier que ça Marche

Après le déploiement :

```
1. Va sur https://gmail-client-xi-lemon.vercel.app
2. Plus de 404 ? ✅
3. Frontend charge ? ✅
4. Ouvre la console (F12)
5. Pas d'erreurs API ? ✅
```

---

## 🆘 Si Tu Bloques

### "Je ne vois pas API Secrets"

Fais un screenshot de ce que tu vois dans **Settings → API** et envoie-le moi.

### "J'ai généré un secret mais je l'ai perdu"

Pas grave :
1. Génère-en un nouveau
2. Revoke l'ancien si possible
3. Utilise le nouveau

### "Le script deploy-vercel.sh ne marche pas"

Utilise la méthode manuelle :

```
1. https://vercel.com/dashboard
2. Ton projet → Settings → Environment Variables
3. Trouve SUPABASE_SERVICE_KEY
4. Edit → Colle le nouveau secret (sb_secret_...)
5. Save
6. Deployments → Redeploy
```

---

## 📊 Résumé

| Ancien Système | Nouveau Système |
|----------------|-----------------|
| service_role key | API Secret (sb_secret_...) |
| Disabled ❌ | À activer ✅ |
| Deprecated | Recommandé |

---

**Prochaine étape** : Dashboard Supabase → Settings → API → Cherche "API Secrets"

Dis-moi ce que tu vois ! 😊
