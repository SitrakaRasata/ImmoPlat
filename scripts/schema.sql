-- ────────────────────────────────────────
-- TYPE & TABLES
-- ────────────────────────────────────────

CREATE TYPE profile_role AS ENUM ('agent', 'client');

CREATE TABLE public.profiles
(
    id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    role       profile_role   NOT NULL DEFAULT 'client',
    firstname  TEXT        NOT NULL DEFAULT '',
    lastname   TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.properties
(
    id           UUID PRIMARY KEY        DEFAULT gen_random_uuid(),
    title        TEXT           NOT NULL,
    description  TEXT,
    price        NUMERIC(12, 2) NOT NULL,
    city         TEXT           NOT NULL,
    agent_id     UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    is_published BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- TRIGGER : création automatique du profil
-- ────────────────────────────────────────

CREATE
OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
INSERT INTO public.profiles (id, role, firstname, lastname)
VALUES (NEW.id,
        COALESCE((NEW.raw_user_meta_data ->>'role')::profile_role, 'client'),
        COALESCE(NEW.raw_user_meta_data ->>'firstname', ''),
        COALESCE(NEW.raw_user_meta_data ->>'lastname', ''));
RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT
    ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Fonction utilitaire : rôle de l'utilisateur connecté
CREATE
OR REPLACE FUNCTION public.get_profile_role()
RETURNS profile_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT role
FROM public.profiles
WHERE id = auth.uid();
$$;

-- PROFILES : chaque utilisateur accède uniquement à son propre profil
CREATE
POLICY "profiles_select_own" ON public.profiles
  FOR
SELECT USING (auth.uid() = id);

CREATE
POLICY "profiles_update_own" ON public.profiles
  FOR
UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Insert bloqué (géré par le trigger)
CREATE
POLICY "profiles_no_insert" ON public.profiles
  FOR INSERT WITH CHECK (false);

-- PROPERTIES : clients voient les publiés, agents voient les leurs
CREATE
POLICY "properties_select" ON public.properties
  FOR
SELECT USING (is_published = TRUE OR agent_id = auth.uid());

-- Seuls les agents peuvent créer/modifier/supprimer leurs biens
CREATE
POLICY "properties_insert" ON public.properties
  FOR INSERT WITH CHECK (get_profile_role() = 'agent' AND agent_id = auth.uid());

CREATE
POLICY "properties_update" ON public.properties
  FOR
UPDATE USING (get_profile_role() = 'agent' AND agent_id = auth.uid());

CREATE
POLICY "properties_delete" ON public.properties
  FOR DELETE
USING (get_profile_role() = 'agent' AND agent_id = auth.uid());