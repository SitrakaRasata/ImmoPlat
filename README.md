# ImmoPlat

Plateforme immobilière : les agents publient des biens, les clients les consultent.

## Stack
- **Backend** : Supabase (Auth, PostgreSQL, RLS)
- **Frontend** : React 19 + Vite + TypeScript
- **Scripts** : Python 3.14.0

## Lancement

### Frontend
```bash
npm install
# Créer .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
