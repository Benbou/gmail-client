# Infrastructure Cleanup Summary

**Date** : 2026-02-09
**Status** : ✅ Complete

---

## 🎯 Objectif

Simplifier l'infrastructure pour passer sous la limite Vercel Hobby (12 fonctions) et migrer vers Supabase API Secrets.

---

## ✅ Résultats

### Avant
- ❌ **14 Vercel Functions** (dépassement limite Hobby)
- ❌ Backend Railway legacy (2,620 lignes de code mort)
- ❌ 7 fichiers documentation éparpillés
- ❌ Supabase service_role key désactivée
- ❌ 3 services (Vercel + Supabase + Railway)

### Après
- ✅ **10 Vercel Functions** (sous limite avec marge confortable)
- ✅ Backend unifié (Vercel serverless uniquement)
- ✅ 3 fichiers documentation consolidés
- ✅ Supabase API Secret (nouveau système)
- ✅ 2 services (Vercel + Supabase)

---

## 📊 Métriques

| Métrique | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Vercel Functions | 14 | 10 | **-29%** |
| Lignes backend | ~5,500 | ~2,500 | **-55%** |
| Fichiers docs | 10 | 3 | **-70%** |
| Services | 3 | 2 | **-33%** |
| Dossiers racine | 4 | 3 | **-25%** |

**Total supprimé** : 8,764 lignes de code + 40 fichiers

---

## 🗑️ Fichiers Supprimés

### Backend Railway (deprecated)
```
/backend/
├── src/ (2,620 lignes)
├── package.json
├── tsconfig.json
├── railway.json
└── API.md
```

### API Routes (non-MVP)
```
api/emails/schedule.ts         # Scheduled send (Phase 2)
api/workers/sync.ts            # → Supabase pg_cron
api/workers/refresh-tokens.ts  # → Supabase pg_cron
api/workers/scheduled-actions.ts # → Supabase pg_cron
api/accounts/[id]/stats.ts     # Analytics (Phase 2)
api/sync/[accountId]/index.ts  # Non-critical
api/sync/[accountId]/labels.ts # Non-critical
api/sync/logs/[accountId].ts   # Non-critical
api/sync/status/[accountId].ts # Non-critical
```

### Documentation (consolidée dans README.md)
```
ACTIVATE_API_SECRETS.md
REVOKE_KEYS.md
DEPLOY_NOW.md
SETUP.md
backend/API.md
frontend/README.md
supabase/SETUP.md
```

---

## 📁 Routes API Finales (10/12)

**Auth (2)**
1. `GET /api/auth/google/start`
2. `GET /api/auth/google/callback`

**Accounts (3)**
3. `GET /api/accounts`
4. `DELETE /api/accounts/[id]`
5. `POST /api/accounts/[id]/sync`

**Emails (5)**
6. `GET /api/emails`
7. `GET /api/emails/[id]`
8. `POST /api/emails/send`
9. `PATCH /api/emails/[id]/archive`
10. `PATCH /api/emails/[id]/snooze`

**Marge** : 2 fonctions disponibles pour extensions futures

---

## 🔧 Modifications Techniques

### vercel.json
```diff
- "destination": "/index.html"  # ❌ 404 sur routes frontend
+ "destination": "/"             # ✅ SPA routing correct
```

### Supabase Keys
```diff
- service_role (JWT format)      # ❌ Deprecated, désactivé
+ API Secret (sb_secret_...)     # ✅ Nouveau système
```

---

## 📝 Documentation Finale

1. **README.md** : Source unique de vérité
   - Setup complet (Supabase + Vercel + Google OAuth)
   - Troubleshooting
   - Architecture overview

2. **CLAUDE.md** : Instructions pour AI assistant
   - Architecture détaillée
   - Standards de code
   - Routes API complètes

3. **SUPABASE_API_SECRET.md** : Guide API Secret
   - Steps pour générer le secret
   - Screenshots (bientôt)

---

## 🚀 Prochaines Étapes

### Action Requise (2 minutes)

1. **Générer Supabase API Secret**
   ```
   Dashboard → Settings → API → "API Secrets" → Generate new secret
   ```
   Voir `SUPABASE_API_SECRET.md` pour guide détaillé.

2. **Déployer sur Vercel**
   ```bash
   ./deploy-vercel.sh
   ```
   Le script demandera juste l'API Secret, génère tout le reste automatiquement.

### Vérification Post-Déploiement

- [ ] Site accessible : https://gmail-client-xi-lemon.vercel.app
- [ ] Pas d'erreur "Legacy API keys disabled"
- [ ] OAuth Google fonctionne
- [ ] Emails se synchronisent (check après 2 min)
- [ ] Vercel Functions ≤12 (voir Vercel Dashboard)

---

## 💡 Avantages

**Simplicité**
- 1 backend au lieu de 2
- 1 fichier README au lieu de 7 docs
- 0 code legacy/mort

**Performance**
- Moins de fonctions = build plus rapide
- Pas de duplication code

**Coût**
- Reste gratuit (free tier)
- Marge confortable (10/12 functions)

**Maintenance**
- Source unique de vérité
- Architecture claire
- Deployment automatisé

---

## 🔒 Sécurité

**Avant** : service_role key exposée (format JWT)
**Après** : API Secret (format moderne, révocable)

**Encryption** : AES-256-GCM pour OAuth tokens (inchangé)
**JWT** : Access (15min) + Refresh (7d) tokens (inchangé)

---

## 📈 Impact Business

**Avant** : ❌ Impossible de déployer (>12 functions)
**Après** : ✅ Déployable sur Vercel Hobby (gratuit)

**Avant** : ❌ Complexité freine développement
**Après** : ✅ Architecture simple = développement rapide

**Avant** : ❌ Documentation éparpillée
**Après** : ✅ Onboarding facile (1 fichier README)

---

## 🎉 Conclusion

Infrastructure MVP simplifiée et prête pour déploiement.

**Prochaine action** : Générer API Secret + `./deploy-vercel.sh`

**Temps estimé** : 5 minutes total

---

**Questions** : Voir README.md section Troubleshooting
