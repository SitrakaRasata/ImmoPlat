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

OWNER, DELEGATE, OUTSIDER = (
    "owner@example.test",
    "delegate@example.test",
    "outsider@example.test",
)

LISTINGS = [
    (OWNER, "Published loft", "Lyon", 320000, True, "Converted print works, exposed beams, one bedroom on a mezzanine."),
    (OWNER, "Draft townhouse", "Lyon", 480000, False, "Four bedrooms over three floors, walled garden. Awaiting the owner's photographs."),
    (OWNER, "Canal-side studio", "Lille", 148000, True, "Twenty-eight square metres facing the water, top floor, no lift."),
    (OWNER, "Vineyard cottage", "Bordeaux", 265000, True, "Two bedrooms and a stone outbuilding, fifteen minutes from Saint-Émilion."),
    (OWNER, "Corner shop with flat above", "Nantes", 392000, True, "Ground-floor retail let until 2029, two-bedroom flat above it, sold together."),
    (OWNER, "Post-war house to modernise", "Le Mans", 174000, True, "Sound roof and structure, everything else dates from 1978."),
    (DELEGATE, "Riverside duplex", "Toulouse", 415000, True, "Two floors, terrace over the Garonne, parking in the basement."),
    (DELEGATE, "Attic conversion", "Strasbourg", 231000, True, "Sixty-two square metres under the eaves, cathedral view from the study."),
    (DELEGATE, "Fisherman's house", "Rennes", 289000, True, "Three bedrooms, courtyard, a five-minute walk from the covered market."),
    (OUTSIDER, "Hillside villa", "Nice", 875000, True, "Sea view from every room, pool, olive terraces below the house."),
    (OUTSIDER, "Old bakery", "Montpellier", 356000, True, "Oven and shopfront kept, living space behind, zoned for mixed use."),
    (OUTSIDER, "Two-bedroom flat", "Marseille", 198000, True, "Third floor, balcony facing south, communal roof terrace."),
]


def main() -> int:
    load_dotenv()
    # Same project URL the app uses; it is public, unlike the key below.
    url = os.environ.get("PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    password = os.environ.get("SEED_PASSWORD")
    if not url or not key or not password:
        print(
            "skipping: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_PASSWORD "
            "are not set"
        )
        return 0

    db = create_client(url, key)

    # Creating an account that already exists raises on the duplicate email, so a second
    # run reuses what is there and only writes what is missing.
    known = {user.email: user.id for user in db.auth.admin.list_users()}

    ids = {}
    created_accounts = 0
    for email, firstname, role in AGENTS:
        if email in known:
            ids[email] = known[email]
            continue
        created = db.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"firstname": firstname},
            }
        )
        ids[email] = created.user.id
        created_accounts += 1
        # The signup trigger always writes 'client'; promotion is a separate,
        # privileged decision and this script is where it happens.
        if role == "agent":
            db.table("profiles").update({"role": "agent"}).eq("id", created.user.id).execute()

    seeded = {row["title"] for row in db.table("properties").select("title").execute().data}
    rows = [
        {
            "agent_id": ids[agent],
            "title": title,
            "city": city,
            "price": price,
            "is_published": published,
            "description": description,
        }
        for agent, title, city, price, published, description in LISTINGS
        if title not in seeded
    ]
    if rows:
        db.table("properties").insert(rows).execute()

    draft = (
        db.table("properties")
        .select("id")
        .eq("is_published", False)
        .limit(1)
        .execute()
        .data[0]
    )
    mandates = (
        db.table("property_mandates")
        .select("property_id")
        .eq("property_id", draft["id"])
        .execute()
        .data
    )
    if not mandates:
        db.table("property_mandates").insert(
            {"property_id": draft["id"], "agent_id": ids[DELEGATE]}
        ).execute()

    print(
        f"seeded {created_accounts} accounts, {len(rows)} listings, "
        f"{0 if mandates else 1} mandate"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
