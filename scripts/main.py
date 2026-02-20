import os
import sys

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

if __name__ == "__main__":
    supabase: Client = create_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )

    print("\n── Option B : Rapport de nettoyage ──")

    rows = (supabase
            .table("properties")
            .select("id, title, price, description")
            .execute()
            .data)

    if not rows:
        sys.exit("Aucun bien trouvé.")

    issues = []

    for p in rows:
        pid = p["id"][:8]

        if p["price"] is None or p["price"] <= 0:
            issues.append(f"  [{pid}] Prix manquant ou invalide : {p['price']}")

        if not p["title"] or len(p["title"]) < 5:
            issues.append(f"  [{pid}] Titre trop court : '{p['title']}'")

        if not p.get("description"):
            issues.append(f"  [{pid}] Description vide")

    if not issues:
        print("✅ Aucun problème détecté.")
    else:
        print(f"⚠️  {len(issues)} problème(s) sur {len(rows)} bien(s) :\n")
        print("\n".join(issues))
