from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, TokenTransaction, Challenge, UserChallenge
from auth import get_current_user, require_admin
from routers.auth import add_xp
from datetime import datetime

router = APIRouter(prefix="/api/user", tags=["user"])

AVATARS = [
    "default", "wolf", "eagle", "shark", "lion", "fox",
    "bear", "dragon", "ninja", "pirate", "astronaut", "robot",
]


class ProfileUpdate(BaseModel):
    avatar: str | None = None


class ClaimChallengeRequest(BaseModel):
    challenge_id: int


class ChallengeCreate(BaseModel):
    title: str
    description: str
    challenge_type: str
    goal: int
    reward_tokens: float
    reward_xp: int


@router.get("/profile/{username}")
def get_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_profile(user)


@router.patch("/profile")
def update_profile(
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.avatar and req.avatar not in AVATARS:
        raise HTTPException(status_code=400, detail="Invalid avatar")
    if req.avatar:
        current_user.avatar = req.avatar
    db.commit()
    db.refresh(current_user)
    return _public_profile(current_user)


@router.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    txs = db.query(TokenTransaction).filter(
        TokenTransaction.user_id == current_user.id
    ).order_by(TokenTransaction.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": t.id, "amount": t.amount,
            "type": t.tx_type, "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in txs
    ]


@router.get("/challenges")
def get_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ucs = db.query(UserChallenge).filter(UserChallenge.user_id == current_user.id).all()
    return [
        {
            "id": uc.challenge_id,
            "title": uc.challenge.title,
            "description": uc.challenge.description,
            "type": uc.challenge.challenge_type,
            "goal": uc.challenge.goal,
            "progress": uc.progress,
            "completed": uc.completed,
            "claimed": uc.claimed,
            "reward_tokens": uc.challenge.reward_tokens,
            "reward_xp": uc.challenge.reward_xp,
        }
        for uc in ucs
    ]


@router.post("/challenges/claim")
def claim_challenge(
    req: ClaimChallengeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    uc = db.query(UserChallenge).filter(
        UserChallenge.user_id == current_user.id,
        UserChallenge.challenge_id == req.challenge_id,
        UserChallenge.completed == True,
        UserChallenge.claimed == False,
    ).first()
    if not uc:
        raise HTTPException(status_code=404, detail="Challenge not found or not claimable")

    current_user.tokens += uc.challenge.reward_tokens
    add_xp(current_user, uc.challenge.reward_xp)
    uc.claimed = True

    db.add(TokenTransaction(
        user_id=current_user.id,
        amount=uc.challenge.reward_tokens,
        tx_type="challenge",
        description=f"Défi accompli : {uc.challenge.title}"
    ))
    db.commit()
    return {"message": "Reward claimed!", "tokens": current_user.tokens}


@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db), limit: int = 20):
    users = db.query(User).filter(User.is_active == True).order_by(
        User.level.desc(), User.xp.desc()
    ).limit(limit).all()
    return [
        {
            "rank": i + 1,
            "username": u.username,
            "level": u.level,
            "xp": u.xp,
            "total_wins": u.total_wins,
            "avatar": u.avatar,
            "badge": u.badge,
        }
        for i, u in enumerate(users)
    ]


@router.get("/avatars")
def list_avatars():
    return AVATARS


@router.post("/admin/challenges", status_code=201)
def create_challenge(
    req: ChallengeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    c = Challenge(**req.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "title": c.title}


def _public_profile(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "level": user.level,
        "xp": user.xp,
        "avatar": user.avatar,
        "badge": user.badge,
        "total_bets": user.total_bets,
        "total_wins": user.total_wins,
        "total_wagered": user.total_wagered,
        "total_won": user.total_won,
        "created_at": user.created_at.isoformat(),
    }
