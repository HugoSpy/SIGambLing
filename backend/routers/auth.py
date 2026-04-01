from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from database import get_db
from models import User, TokenTransaction, Challenge, UserChallenge
from auth import hash_password, verify_password, create_access_token, get_current_user
from config import settings
from datetime import datetime
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])

LEVEL_XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000]


def xp_for_level(level: int) -> int:
    if level >= len(LEVEL_XP_THRESHOLDS):
        return LEVEL_XP_THRESHOLDS[-1] + (level - len(LEVEL_XP_THRESHOLDS) + 1) * 10000
    return LEVEL_XP_THRESHOLDS[level]


def add_xp(user: User, xp_amount: int):
    user.xp += xp_amount
    while user.level < 100 and user.xp >= xp_for_level(user.level):
        user.xp -= xp_for_level(user.level)
        user.level += 1


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]{3,30}$", v):
            raise ValueError("Username must be 3-30 alphanumeric characters or underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


def _seed_daily_challenges(db: Session, user: User):
    challenges = db.query(Challenge).filter(
        Challenge.active == True,
        Challenge.challenge_type == "daily"
    ).all()
    for c in challenges:
        exists = db.query(UserChallenge).filter(
            UserChallenge.user_id == user.id,
            UserChallenge.challenge_id == c.id
        ).first()
        if not exists:
            db.add(UserChallenge(user_id=user.id, challenge_id=c.id))


@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        tokens=settings.DAILY_TOKEN_BONUS,
    )
    db.add(user)
    db.flush()

    db.add(TokenTransaction(
        user_id=user.id,
        amount=settings.DAILY_TOKEN_BONUS,
        tx_type="welcome_bonus",
        description="Bienvenue ! 100 tokens offerts"
    ))
    _seed_daily_challenges(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    now = datetime.utcnow()
    if user.last_daily_claim is None or (now - user.last_daily_claim).days >= 1:
        user.tokens += settings.DAILY_TOKEN_BONUS
        user.last_daily_claim = now
        add_xp(user, 10)
        db.add(TokenTransaction(
            user_id=user.id,
            amount=settings.DAILY_TOKEN_BONUS,
            tx_type="daily_bonus",
            description="Bonus quotidien de connexion"
        ))
        _seed_daily_challenges(db, user)
        db.commit()

    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "tokens": user.tokens,
        "level": user.level,
        "xp": user.xp,
        "avatar": user.avatar,
        "badge": user.badge,
        "total_bets": user.total_bets,
        "total_wins": user.total_wins,
        "total_wagered": user.total_wagered,
        "total_won": user.total_won,
        "last_daily_claim": user.last_daily_claim.isoformat() if user.last_daily_claim else None,
        "created_at": user.created_at.isoformat(),
    }
