from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class EventStatus(str, enum.Enum):
    pending = "pending"
    open = "open"
    closed = "closed"
    resolved = "resolved"
    rejected = "rejected"


class BetStatus(str, enum.Enum):
    active = "active"
    won = "won"
    lost = "lost"
    refunded = "refunded"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    tokens = Column(Float, default=100.0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    avatar = Column(String(100), default="default", nullable=False)
    badge = Column(String(100), nullable=True)
    total_bets = Column(Integer, default=0, nullable=False)
    total_wins = Column(Integer, default=0, nullable=False)
    total_wagered = Column(Float, default=0.0, nullable=False)
    total_won = Column(Float, default=0.0, nullable=False)
    last_daily_claim = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    bets = relationship("Bet", back_populates="user")
    transactions = relationship("TokenTransaction", back_populates="user")
    challenges = relationship("UserChallenge", back_populates="user")


class EventCategory(str, enum.Enum):
    sports = "sports"
    politics = "politics"
    culture = "culture"
    esports = "esports"
    finance = "finance"
    other = "other"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(EventCategory), default=EventCategory.other, nullable=False)
    status = Column(Enum(EventStatus), default=EventStatus.pending, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closes_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    winning_outcome_id = Column(Integer, ForeignKey("outcomes.id"), nullable=True)
    image_url = Column(String(500), nullable=True)
    total_pool = Column(Float, default=0.0, nullable=False)

    creator = relationship("User", foreign_keys=[creator_id])
    outcomes = relationship("Outcome", back_populates="event", foreign_keys="Outcome.event_id")
    bets = relationship("Bet", back_populates="event")


class Outcome(Base):
    __tablename__ = "outcomes"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    label = Column(String(255), nullable=False)
    total_staked = Column(Float, default=0.0, nullable=False)

    event = relationship("Event", back_populates="outcomes", foreign_keys=[event_id])
    bets = relationship("Bet", back_populates="outcome")


class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    outcome_id = Column(Integer, ForeignKey("outcomes.id"), nullable=False)
    amount = Column(Float, nullable=False)
    odds_at_bet = Column(Float, nullable=False)
    status = Column(Enum(BetStatus), default=BetStatus.active, nullable=False)
    potential_win = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="bets")
    event = relationship("Event", back_populates="bets")
    outcome = relationship("Outcome", back_populates="bets")


class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tx_type = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    challenge_type = Column(String(50), nullable=False)
    goal = Column(Integer, nullable=False)
    reward_tokens = Column(Float, nullable=False)
    reward_xp = Column(Integer, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_challenges = relationship("UserChallenge", back_populates="challenge")


class UserChallenge(Base):
    __tablename__ = "user_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    claimed = Column(Boolean, default=False, nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="challenges")
    challenge = relationship("Challenge", back_populates="user_challenges")
