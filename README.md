# ImmoPlat

Plateforme immobilière : les agents publient des biens, les clients les consultent.

## 1. Stack
- **Backend** : Supabase (Auth, PostgreSQL, RLS)
- **Frontend** : React 19 + Vite + TypeScript
- **Scripts** : Python 3.14.0

## 2. Lancement

### Backend
Créer un projet Supabase puis lancer le script dans `ImmoPlat\scripts\schema.sql` dans SQL editor dans Supabase.

### Frontend
```bash
npm install
# Créer .env avec VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
npm run dev
```

### Script python
```bash
pip install -r requirements.txt
# Créer .env avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
python main.py
```

## 3. Structure

```bash
src/
├── shared/
│   └── hooks/       
│       └── useAuth.ts        # Hook session + profil
│   └── supabase.ts           # Client Supabase (singleton)
│   └── types.ts              # Interfaces TypeScript
├── pages/
│   └── LoginPage.tsx         # Connexion / Inscription
│   └── PropertiesPage.tsx    # Annonces publiques
│   └── MyPropertiesPage.tsx  # Biens de l'agent
├── App.tsx                   # Router + layout
├── App.css                   # Styles globaux simples
```

## 4. Modèle de données

**profiles** : `id (FK auth.users)` · `role (agent|client)` · `firstname` · `lastname`

**properties** : `id` · `title` · `description` · `price` · `city` · `agent_id (FK profiles)` · `is_published` · `created_at`

## 5. RLS

| Table | Action | Règle |
|-------|--------|-------|
| profiles | SELECT / UPDATE | Uniquement son propre profil |
| properties | SELECT | Publiés OU appartenant à l'agent connecté |
| properties | INSERT / UPDATE / DELETE | Rôle `agent` + propriétaire du bien |

## 6. Raisonnement technique

**Supabase** : Auth + BDD + API + RLS dans une seule plateforme → idéal pour un MVP rapide.

**Logique métier** : Sécurité dans le RLS (non négociable), UX dans le frontend, tâches batch dans Python.

**Python** : Exports planifiés, rapports, nettoyage de données, notifications automatiques.

**Limites** : Performance RLS à grande échelle, vendor lock-in, pas de cache natif, logique métier complexe difficile à exprimer dans le RLS seul.

## Améliorations possibles
- Filtres par ville / prix sur la page annonces
- Upload de photos via Supabase Storage
- Pagination côté serveur

---

© Copyright - [Rasatarivony Andriamalala Sitraka](mailto:rasatasitraka2@gmail.com)  - 2026