from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import (
    User, Event, Outcome, Bet, TokenTransaction,
    EventStatus, BetStatus, EventCategory, UserChallenge
)
from auth import get_current_user, require_admin
from email_service import notify_admin_new_event, notify_user_event_approved, notify_user_event_rejected
from config import settings
from datetime import datetime
from routers.auth import add_xp

router = APIRouter(prefix="/api/events", tags=["events"])


class OutcomeCreate(BaseModel):
    label: str


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: EventCategory = EventCategory.other
    outcomes: List[OutcomeCreate]
    closes_at: Optional[str] = None
    image_url: Optional[str] = None


class BetPlace(BaseModel):
    outcome_id: int
    amount: float


@router.get("/my/bets")
def my_bets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    bets = db.query(Bet).options(
        joinedload(Bet.event),
        joinedload(Bet.outcome)
    ).filter(Bet.user_id == current_user.id).order_by(Bet.created_at.desc()).offset(skip).limit(limit).all()
    return [_bet_dict(b) for b in bets]


@router.get("/admin/pending")
def pending_events(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    events = db.query(Event).options(
        joinedload(Event.outcomes), joinedload(Event.creator)
    ).filter(Event.status == EventStatus.pending).all()
    return [_event_dict(e) for e in events]


@router.get("/")
def list_events(
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    q = db.query(Event).options(
        joinedload(Event.outcomes),
        joinedload(Event.creator)
    )
    if category:
        q = q.filter(Event.category == category)
    if status:
        q = q.filter(Event.status == status)
    else:
        q = q.filter(Event.status.in_([EventStatus.open, EventStatus.closed, EventStatus.resolved]))

    events = q.order_by(Event.created_at.desc()).offset(skip).limit(limit).all()
    return [_event_dict(e) for e in events]


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).options(
        joinedload(Event.outcomes),
        joinedload(Event.creator),
        joinedload(Event.bets).joinedload(Bet.user),
        joinedload(Event.bets).joinedload(Bet.outcome),
    ).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_dict(event, include_bets=True)


@router.post("/", status_code=201)
async def create_event(
    req: EventCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(req.outcomes) < 2:
        raise HTTPException(status_code=400, detail="At least 2 outcomes required")

    closes_at = None
    if req.closes_at:
        try:
            closes_at = datetime.fromisoformat(req.closes_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid closes_at format (ISO8601)")

    ev_status = EventStatus.open if current_user.role == "admin" else EventStatus.pending

    event = Event(
        title=req.title,
        description=req.description,
        category=req.category,
        status=ev_status,
        creator_id=current_user.id,
        closes_at=closes_at,
        image_url=req.image_url,
    )
    db.add(event)
    db.flush()

    for o in req.outcomes:
        db.add(Outcome(event_id=event.id, label=o.label))

    db.commit()
    db.refresh(event)

    if ev_status == EventStatus.pending:
        background_tasks.add_task(
            notify_admin_new_event,
            req.title, current_user.username, req.description or "", event.id
        )

    return _event_dict(event)


@router.post("/{event_id}/bet")
def place_bet(
    event_id: int,
    req: BetPlace,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or event.status != EventStatus.open:
        raise HTTPException(status_code=400, detail="Event not open for betting")

    if event.closes_at and datetime.utcnow() > event.closes_at:
        event.status = EventStatus.closed
        db.commit()
        raise HTTPException(status_code=400, detail="Betting period has closed")

    outcome = db.query(Outcome).filter(
        Outcome.id == req.outcome_id,
        Outcome.event_id == event_id
    ).first()
    if not outcome:
        raise HTTPException(status_code=404, detail="Outcome not found")

    if req.amount < settings.MIN_BET:
        raise HTTPException(status_code=400, detail=f"Minimum bet is {settings.MIN_BET} tokens")
    if req.amount > settings.MAX_BET:
        raise HTTPException(status_code=400, detail=f"Maximum bet is {settings.MAX_BET} tokens")
    if current_user.tokens < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient tokens")

    odds = _compute_odds(outcome, event, req.amount)

    current_user.tokens -= req.amount
    current_user.total_bets += 1
    current_user.total_wagered += req.amount

    outcome.total_staked += req.amount
    event.total_pool += req.amount

    bet = Bet(
        user_id=current_user.id,
        event_id=event_id,
        outcome_id=req.outcome_id,
        amount=req.amount,
        odds_at_bet=odds,
        potential_win=round(req.amount * odds, 2),
    )
    db.add(bet)
    db.add(TokenTransaction(
        user_id=current_user.id,
        amount=-req.amount,
        tx_type="bet",
        description=f"Pari sur '{event.title}' - {outcome.label}"
    ))

    add_xp(current_user, 5)
    _update_challenges(db, current_user, "place_bet", 1)

    db.commit()
    db.refresh(bet)
    return {
        "id": bet.id,
        "amount": bet.amount,
        "outcome": outcome.label,
        "odds": odds,
        "potential_win": bet.potential_win,
        "tokens_remaining": current_user.tokens,
    }


@router.patch("/{event_id}/approve")
async def approve_event(
    event_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = EventStatus.open
    db.commit()

    if event.creator_id:
        creator = db.query(User).filter(User.id == event.creator_id).first()
        if creator:
            background_tasks.add_task(notify_user_event_approved, creator.email, event.title)

    return {"message": "Event approved"}


@router.patch("/{event_id}/reject")
async def reject_event(
    event_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = EventStatus.rejected
    db.commit()

    if event.creator_id:
        creator = db.query(User).filter(User.id == event.creator_id).first()
        if creator:
            background_tasks.add_task(notify_user_event_rejected, creator.email, event.title)

    return {"message": "Event rejected"}


@router.patch("/{event_id}/resolve/{outcome_id}")
def resolve_event(
    event_id: int,
    outcome_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    event = db.query(Event).options(joinedload(Event.bets)).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status == EventStatus.resolved:
        raise HTTPException(status_code=400, detail="Event already resolved")

    winning_outcome = db.query(Outcome).filter(
        Outcome.id == outcome_id, Outcome.event_id == event_id
    ).first()
    if not winning_outcome:
        raise HTTPException(status_code=404, detail="Outcome not found")

    event.status = EventStatus.resolved
    event.winning_outcome_id = outcome_id
    event.resolved_at = datetime.utcnow()

    total_payout = 0.0
    for bet in event.bets:
        if bet.status != BetStatus.active:
            continue
        if bet.outcome_id == outcome_id:
            payout = bet.potential_win
            bet.status = BetStatus.won
            user = db.query(User).filter(User.id == bet.user_id).first()
            if user:
                user.tokens += payout
                user.total_wins += 1
                user.total_won += payout
                add_xp(user, 20)
                _update_challenges(db, user, "win_bet", 1)
                db.add(TokenTransaction(
                    user_id=user.id,
                    amount=payout,
                    tx_type="win",
                    description=f"Gain sur '{event.title}' - {winning_outcome.label}"
                ))
            total_payout += payout
        else:
            bet.status = BetStatus.lost
        bet.resolved_at = datetime.utcnow()

    db.commit()
    return {
        "message": "Event resolved",
        "winning_outcome": winning_outcome.label,
        "total_payout": total_payout,
    }


def _compute_odds(outcome: Outcome, event: Event, new_amount: float) -> float:
    new_pool = event.total_pool + new_amount
    new_staked = outcome.total_staked + new_amount
    if new_staked == 0:
        return 2.0
    raw = new_pool / new_staked
    return round(max(1.01, raw * (1 - settings.HOUSE_EDGE)), 2)


def _update_challenges(db: Session, user: User, action: str, amount: int):
    type_map = {"place_bet": "bet_count", "win_bet": "win_count", "casino_play": "casino_count"}
    c_type = type_map.get(action)
    if not c_type:
        return
    ucs = db.query(UserChallenge).filter(
        UserChallenge.user_id == user.id,
        UserChallenge.completed == False,
    ).all()
    for uc in ucs:
        ch = uc.challenge
        if ch.challenge_type in (c_type, action):
            uc.progress += amount
            if uc.progress >= ch.goal:
                uc.progress = ch.goal
                uc.completed = True
                uc.completed_at = datetime.utcnow()


def _event_dict(event: Event, include_bets: bool = False) -> dict:
    outcomes = []
    for o in event.outcomes:
        pool = event.total_pool or 0
        staked = o.total_staked or 0
        if staked == 0 or pool == 0:
            odds = 2.0
        else:
            odds = round(max(1.01, (pool / staked) * (1 - settings.HOUSE_EDGE)), 2)
        outcomes.append({
            "id": o.id,
            "label": o.label,
            "total_staked": o.total_staked,
            "odds": odds,
        })

    data = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "category": event.category,
        "status": event.status,
        "total_pool": event.total_pool,
        "closes_at": event.closes_at.isoformat() if event.closes_at else None,
        "resolved_at": event.resolved_at.isoformat() if event.resolved_at else None,
        "winning_outcome_id": event.winning_outcome_id,
        "image_url": event.image_url,
        "creator": event.creator.username if event.creator else None,
        "created_at": event.created_at.isoformat(),
        "outcomes": outcomes,
    }

    if include_bets:
        recent_bets = sorted(event.bets, key=lambda b: b.created_at, reverse=True)[:10]
        data["recent_bets"] = [_bet_dict(b) for b in recent_bets]

    return data


def _bet_dict(bet: Bet) -> dict:
    return {
        "id": bet.id,
        "event_id": bet.event_id,
        "event_title": bet.event.title if bet.event else None,
        "outcome": bet.outcome.label if bet.outcome else None,
        "amount": bet.amount,
        "odds_at_bet": bet.odds_at_bet,
        "potential_win": bet.potential_win,
        "status": bet.status,
        "created_at": bet.created_at.isoformat(),
        "resolved_at": bet.resolved_at.isoformat() if bet.resolved_at else None,
    }
