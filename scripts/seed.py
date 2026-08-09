"""Seed the hosted Supabase project with demo accounts, listings and one mandate.

This is the only code path that bypasses row level security. It runs offline, never
in response to an incoming request, and its key never reaches a browser.
"""

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

AGENTS = [
    ("owner@example.test", "Olivia", "agent"),
    ("delegate@example.test", "Diego", "agent"),
    ("outsider@example.test", "Ove", "agent"),
    ("client@example.test", "Camille", "client"),
]

LISTINGS = [
    ("Published loft", "Lyon", 320000, True),
    ("Draft townhouse", "Lyon", 480000, False),
]


def main() -> int:
    load_dotenv()
    # Same project URL the app uses; it is public, unlike the key below.
    url = os.environ.get("PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    password = os.environ.get("SEED_PASSWORD")
    if not url or not key or not password:
        print("PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_PASSWORD are required")
        return 1

    db = create_client(url, key)

    ids = {}
    for email, firstname, role in AGENTS:
        created = db.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"firstname": firstname},
            }
        )
        ids[email] = created.user.id
        # The signup trigger always writes 'client'; promotion is a separate,
        # privileged decision and this script is where it happens.
        if role == "agent":
            db.table("profiles").update({"role": "agent"}).eq("id", created.user.id).execute()

    owner = ids["owner@example.test"]
    rows = [
        {"agent_id": owner, "title": t, "city": c, "price": p, "is_published": pub}
        for t, c, p, pub in LISTINGS
    ]
    inserted = db.table("properties").insert(rows).execute()

    draft = next(r for r in inserted.data if not r["is_published"])
    db.table("property_mandates").insert(
        {"property_id": draft["id"], "agent_id": ids["delegate@example.test"]}
    ).execute()

    print(f"seeded {len(ids)} accounts, {len(rows)} listings, 1 mandate")
    return 0


if __name__ == "__main__":
    sys.exit(main())
