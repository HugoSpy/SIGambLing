from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, SessionLocal
from models import User, Challenge, EventCategory, EventStatus, Outcome, Event
from auth import hash_password
from config import settings

from routers import auth, events, casino, user

app = FastAPI(title="SIGambling", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(casino.router)
app.include_router(user.router)

# Serve static frontend
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def serve_index():
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "Frontend not found. Run from project root."}


@app.get("/{path:path}", include_in_schema=False)
def serve_spa(path: str):
    # Avoid catching API routes
    if path.startswith("api/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "Frontend not found"}


@app.on_event("startup")
def startup():
    init_db()
    _seed_data()


def _seed_data():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password("Admin1234!"),
                role="admin",
                tokens=999999,
                level=99,
            )
            db.add(admin)
            db.flush()

        if db.query(Challenge).count() == 0:
            challenges = [
                Challenge(title="Premier pari", description="Placez votre premier pari du jour",
                          challenge_type="daily", goal=1, reward_tokens=50, reward_xp=25),
                Challenge(title="Parieur actif", description="Placez 5 paris dans la journée",
                          challenge_type="daily", goal=5, reward_tokens=100, reward_xp=50),
                Challenge(title="Chance du casino", description="Jouez 3 fois au casino aujourd'hui",
                          challenge_type="daily", goal=3, reward_tokens=75, reward_xp=30),
                Challenge(title="Semaine gagnante", description="Gagnez 10 paris cette semaine",
                          challenge_type="weekly", goal=10, reward_tokens=500, reward_xp=200),
                Challenge(title="Grand joueur", description="Misez 1000 tokens cette semaine",
                          challenge_type="weekly", goal=1000, reward_tokens=250, reward_xp=100),
            ]
            for c in challenges:
                db.add(c)
            db.flush()

        if db.query(Event).count() == 0:
            sample_events = [
                {"title": "Vainqueur de la Ligue des Champions 2026",
                 "description": "Qui remportera la Ligue des Champions cette saison ?",
                 "category": EventCategory.sports,
                 "outcomes": ["Real Madrid", "Manchester City", "PSG", "Bayern Munich"]},
                {"title": "Prochaine élection présidentielle US",
                 "description": "Qui sera élu président des États-Unis ?",
                 "category": EventCategory.politics,
                 "outcomes": ["Candidat Démocrate", "Candidat Républicain", "Autre"]},
                {"title": "Champion du monde FIFA 2026",
                 "description": "Quelle équipe remportera la Coupe du Monde 2026 ?",
                 "category": EventCategory.sports,
                 "outcomes": ["France", "Brésil", "Argentine", "Angleterre", "Allemagne", "Autre"]},
                {"title": "Meilleur film - Oscars 2027",
                 "description": "Quel film remportera l'Oscar du meilleur film ?",
                 "category": EventCategory.culture,
                 "outcomes": ["Film A", "Film B", "Film C", "Autre"]},
                {"title": "Vainqueur Worlds 2026 (LoL)",
                 "description": "Quelle équipe remportera les Worlds League of Legends 2026 ?",
                 "category": EventCategory.esports,
                 "outcomes": ["T1", "JDG", "G2 Esports", "Cloud9", "Autre"]},
            ]
            for ev_data in sample_events:
                ev = Event(
                    title=ev_data["title"], description=ev_data["description"],
                    category=ev_data["category"], status=EventStatus.open,
                    creator_id=admin.id,
                )
                db.add(ev)
                db.flush()
                for label in ev_data["outcomes"]:
                    db.add(Outcome(event_id=ev.id, label=label))

        db.commit()
    finally:
        db.close()
