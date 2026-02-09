# Setup Simple (pour non-tech)

## 🤔 Pourquoi j'ai besoin de faire quelque chose ?

**Le problème** : Ton app a besoin de **secrets** (comme des mots de passe). Ces secrets ne peuvent PAS être dans le code public, sinon n'importe qui pourrait voler tes données.

**La bonne nouvelle** : Tu n'as qu'à faire ça **UNE SEULE FOIS**, et je t'ai préparé un guide ultra-simple.

---

## ✨ Setup en 3 Étapes (10 minutes)

### Étape 1 : Récupère 1 seule clé Supabase (2 min)

1. Va sur https://supabase.com/dashboard
2. Clique sur ton projet "Gmail Client"
3. Settings → API
4. Copie la clé **service_role** (commence par `eyJhbGc...`)
5. **Garde-la quelque part** (notes, fichier texte)

---

### Étape 2 : Configure Google OAuth DANS SUPABASE (3 min)

**Pas besoin de Google Cloud Console !** Supabase fait tout.

1. Va sur https://supabase.com/dashboard
2. Ton projet "Gmail Client"
3. **Authentication** → **Providers**
4. Active **Google**
5. Supabase te donne automatiquement un Client ID et Secret
6. **C'est tout !** ✅

---

### Étape 3 : Lance le script automatique (5 min)

Ouvre ton terminal et tape :

```bash
cd ~/Documents/gmail-client
chmod +x setup-auto.sh
./setup-auto.sh
```

Le script va te demander **2 choses** :
1. La clé service_role de l'Étape 1
2. Confirmer le déploiement

Et **c'est tout** ! Le script fait le reste :
- ✅ Génère tous les secrets
- ✅ Configure Vercel
- ✅ Déploie l'app
- ✅ Configure Google OAuth

**Durée totale : 10 minutes**

---

## 🎉 Après le Setup

Ton app sera en ligne sur :
**https://gmail-client-xi-lemon.vercel.app**

Tu pourras :
- Te connecter avec Google
- Voir tes emails de 2 comptes Gmail
- Gérer tes emails

**Et tu n'auras plus JAMAIS à reconfigurer !**

---

## ❓ Pourquoi ce n'est pas automatique à 100% ?

**Sécurité** : Les secrets (comme ta clé service_role) sont personnels. Si je les mettais dans le code public sur GitHub, n'importe qui pourrait :
- Accéder à ta base de données
- Lire tes emails
- Se faire passer pour toi

C'est comme un mot de passe : tu ne peux pas le donner publiquement.

**Mais** : Tu ne le fais qu'une fois, et après c'est fini !

---

## 🆘 Besoin d'Aide ?

Si tu bloques sur une étape, dis-moi juste à quelle étape et je t'aide !

Les 3 étapes en résumé :
1. Copie 1 clé Supabase
2. Active Google OAuth dans Supabase (1 clic)
3. Lance le script

C'est vraiment tout ! 💪
