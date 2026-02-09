# Documentation Index

Tous les guides du projet Gmail Client (architecture 2-service : Vercel + Supabase).

---

## 🚀 Pour Démarrer (Nouveaux Utilisateurs)

**Lis dans cet ordre** :

1. **[README.md](./README.md)** — Vue d'ensemble du projet (5 min)
   - Qu'est-ce que c'est ?
   - Tech stack
   - Architecture à 2 services

2. **[QUICK_START.md](./QUICK_START.md)** — Déploiement en 10 minutes (10 min)
   - Guide pas-à-pas complet
   - De zéro à production
   - Toutes les étapes expliquées

3. **[SETUP_VERCEL_NOW.md](./SETUP_VERCEL_NOW.md)** — Setup rapide Vercel (15 min)
   - Guide ultra-concis
   - Commandes copy-paste
   - Vérifications en fin de chaque étape

---

## 🔧 Configuration

### Variables d'Environnement

**[VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md)** — Checklist complète
- Liste de TOUTES les variables nécessaires
- Comment les générer
- Exemples de valeurs
- Erreurs courantes à éviter
- ⏱️ 10 min

**[ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)** — Guide détaillé
- Explication de chaque variable
- Pourquoi elles sont nécessaires
- Valeurs par défaut
- ⏱️ 15 min

### Cron Jobs (Supabase pg_cron)

**[SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md)** — Setup automatisation
- Configuration pg_cron + pg_net
- Création du secret Vault
- Vérification des jobs
- Tests manuels
- Troubleshooting
- ⏱️ 10 min

**[SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md)** — Configuration auth
- Setup OAuth Supabase
- Configuration site URL
- ⏱️ 5 min

---

## 📐 Architecture & Migration

**[MIGRATION_STATUS.md](./MIGRATION_STATUS.md)** — État du projet
- Architecture actuelle (2-service)
- Historique des migrations
- Diagrammes
- Comparaison avant/après
- ⏱️ 10 min

**[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** — Résumé des migrations
- Railway → Vercel
- Cloudflare → Supabase pg_cron
- ⏱️ 5 min

**[VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md)** — ⚠️ OBSOLÈTE
- Ancien guide avec Cloudflare Worker
- Gardé pour référence historique
- **N'utilise plus ce guide** (voir QUICK_START.md)

---

## 💻 Développement

**[CLAUDE.md](./CLAUDE.md)** — ⭐ Guide complet pour développeurs
- Context complet du projet
- Architecture détaillée
- Tous les endpoints API
- Schema base de données
- Commandes de développement
- Standards de code
- Troubleshooting
- **LIS CE FICHIER si tu reprends le projet**
- ⏱️ 20 min (lecture complète)

**[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — Déploiement général
- Processus de déploiement
- CI/CD (si configuré)
- ⏱️ 10 min

**[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** — Spécifique Vercel
- Configuration vercel.json
- Fonctions serverless
- ⏱️ 5 min

---

## 📊 Organisation par Cas d'Usage

### "Je veux déployer rapidement"
→ [SETUP_VERCEL_NOW.md](./SETUP_VERCEL_NOW.md)

### "Je veux comprendre l'architecture"
→ [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)
→ [CLAUDE.md](./CLAUDE.md) (section "Architecture")

### "J'ai un problème avec les variables d'environnement"
→ [VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md)

### "Les cron jobs ne fonctionnent pas"
→ [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md) (section "Troubleshooting")

### "Je reprends le projet dans 6 mois"
→ [CLAUDE.md](./CLAUDE.md) (lis-le en entier)

### "Je veux contribuer du code"
→ [CLAUDE.md](./CLAUDE.md) (section "Working Standards")

### "OAuth Google ne marche pas"
→ [QUICK_START.md](./QUICK_START.md) (section "Troubleshooting")
→ [VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md) (section "Common Mistakes")

---

## 🎯 Guide pour Claude Code / LLM

Si tu es Claude Code (ou un autre LLM) et que tu reprends ce projet **sans contexte** :

### Étape 1 : Lis CLAUDE.md
**[CLAUDE.md](./CLAUDE.md)** contient :
- État actuel du projet
- Architecture complète
- Tous les fichiers critiques
- Endpoints API
- Schema DB
- Commandes de dev
- Standards de code

### Étape 2 : Lis les commits récents
```bash
git log --oneline -20
```

### Étape 3 : Comprends la tâche
- Pose des questions de clarification si nécessaire
- Entre en mode plan pour les tâches non-triviales

### Étape 4 : Travaille
- Suis les standards dans CLAUDE.md
- Utilise TaskCreate/TaskUpdate pour tracking
- Vérifie avant de marquer comme terminé

---

## 📏 Ordre de Lecture Recommandé

### Pour un dev qui rejoint le projet

1. **[README.md](./README.md)** — Vue d'ensemble (5 min)
2. **[CLAUDE.md](./CLAUDE.md)** — Context complet (20 min)
3. **[MIGRATION_STATUS.md](./MIGRATION_STATUS.md)** — Architecture (10 min)
4. Explore le code avec le contexte acquis

**Temps total : ~35 minutes pour être 100% opérationnel**

### Pour quelqu'un qui veut juste déployer

1. **[SETUP_VERCEL_NOW.md](./SETUP_VERCEL_NOW.md)** (15 min)
2. C'est tout !

---

## 📁 Structure de la Documentation

```
docs/
├── README.md                    # Vue d'ensemble
├── CLAUDE.md                    # ⭐ Guide développeur complet
├── QUICK_START.md               # Déploiement 10 min
├── SETUP_VERCEL_NOW.md          # Setup Vercel rapide
├── VERCEL_ENV_VARIABLES.md      # Checklist env vars
├── SUPABASE_CRON_SETUP.md       # Setup pg_cron
├── MIGRATION_STATUS.md          # Architecture & historique
├── ENV_SETUP_GUIDE.md           # Détails env vars
├── SUPABASE_AUTH_SETUP.md       # Setup auth
├── DEPLOYMENT_GUIDE.md          # Déploiement général
├── VERCEL_DEPLOYMENT.md         # Spécifique Vercel
├── MIGRATION_SUMMARY.md         # Résumé migrations
├── VERCEL_MIGRATION_GUIDE.md    # ⚠️ Obsolète (Cloudflare)
└── DOCS_INDEX.md                # Ce fichier
```

---

## 🆘 Besoin d'Aide ?

### Problèmes de déploiement
1. Vérifie [QUICK_START.md](./QUICK_START.md) section "Troubleshooting"
2. Vérifie [VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md) section "Common Mistakes"
3. Check Vercel logs : `vercel logs`
4. Check Supabase logs : Dashboard → Logs

### Problèmes de cron
1. [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md) section "Troubleshooting"
2. Vérifie les jobs :
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
   ```

### Questions sur le code
1. [CLAUDE.md](./CLAUDE.md) — Probablement déjà documenté
2. Explore le code avec le contexte de CLAUDE.md
3. Check les commits récents : `git log --oneline -20`

---

## 📊 Statistiques de la Documentation

- **Nombre de guides** : 13 fichiers
- **Temps de lecture total** : ~2h (tout lire)
- **Temps pour démarrer** : 15 min (SETUP_VERCEL_NOW.md)
- **Temps pour maîtriser** : 35 min (README + CLAUDE + MIGRATION_STATUS)
- **Couverture** : 100% du projet (architecture, déploiement, dev, troubleshooting)

---

## ✅ Checklist : "Suis-je Prêt à Travailler ?"

Coche ce que tu as lu :

- [ ] README.md (vue d'ensemble)
- [ ] CLAUDE.md (architecture + standards)
- [ ] MIGRATION_STATUS.md (état actuel)
- [ ] Variables d'environnement configurées (VERCEL_ENV_VARIABLES.md)
- [ ] Cron jobs configurés (SUPABASE_CRON_SETUP.md)
- [ ] Derniers commits lus (`git log --oneline -20`)

Si tout est coché → ✅ Tu es prêt à contribuer !

---

**Dernière mise à jour** : 2026-02-09
**État de la doc** : ✅ Production-ready, complète, à jour
