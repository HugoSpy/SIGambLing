"""
Casino games: Blackjack & Roulette — all logic runs server-side.
"""
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, TokenTransaction
from auth import get_current_user
from config import settings
from routers.auth import add_xp
from datetime import datetime

router = APIRouter(prefix="/api/casino", tags=["casino"])

SUITS = ["♠", "♥", "♦", "♣"]
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]


def _new_deck():
    return [{"rank": r, "suit": s} for s in SUITS for r in RANKS]


def _card_value(card):
    r = card["rank"]
    if r in ("J", "Q", "K"):
        return 10
    if r == "A":
        return 11
    return int(r)


def _hand_value(hand):
    total = sum(_card_value(c) for c in hand)
    aces = sum(1 for c in hand if c["rank"] == "A")
    while total > 21 and aces:
        total -= 10
        aces -= 1
    return total


class BlackjackStartRequest(BaseModel):
    bet: float


class BlackjackActionRequest(BaseModel):
    bet: float
    player_hand: list
    dealer_hand: list
    deck: list
    action: str


@router.post("/blackjack/start")
def blackjack_start(
    req: BlackjackStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _validate_bet(req.bet, current_user)

    current_user.tokens -= req.bet
    current_user.total_wagered += req.bet
    db.add(TokenTransaction(
        user_id=current_user.id, amount=-req.bet,
        tx_type="casino", description=f"Blackjack - mise {req.bet}"
    ))

    deck = _new_deck()
    random.shuffle(deck)
    player = [deck.pop(), deck.pop()]
    dealer = [deck.pop(), deck.pop()]
    pv = _hand_value(player)
    dv = _hand_value(dealer)

    player_bj = pv == 21
    dealer_bj = dv == 21

    result, payout, game_status = None, 0.0, "playing"

    if player_bj and dealer_bj:
        result, payout, game_status = "push", req.bet, "push"
    elif player_bj:
        result, payout, game_status = "blackjack", round(req.bet * 2.5, 2), "blackjack"
    elif dealer_bj:
        result, payout, game_status = "lose", 0.0, "dealer_blackjack"

    if game_status != "playing":
        _settle_casino(db, current_user, req.bet, payout, "Blackjack")

    db.commit()

    return {
        "player_hand": player, "dealer_hand": dealer,
        "dealer_visible": [dealer[0]], "deck": deck,
        "player_value": pv, "dealer_value": dv,
        "status": game_status, "result": result, "payout": payout,
        "tokens": current_user.tokens,
    }


@router.post("/blackjack/action")
def blackjack_action(
    req: BlackjackActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    player_hand = req.player_hand
    dealer_hand = req.dealer_hand
    deck = req.deck
    bet = req.bet
    action = req.action

    if action == "hit":
        player_hand.append(deck.pop())
        pv = _hand_value(player_hand)
        if pv > 21:
            add_xp(current_user, 2)
            db.commit()
            return {
                "player_hand": player_hand, "dealer_hand": dealer_hand,
                "player_value": pv, "dealer_value": _hand_value(dealer_hand),
                "status": "bust", "result": "lose", "payout": 0,
                "tokens": current_user.tokens,
            }
        if pv == 21:
            action = "stand"
        else:
            return {
                "player_hand": player_hand, "dealer_hand": dealer_hand,
                "dealer_visible": [dealer_hand[0]],
                "player_value": pv, "dealer_value": _hand_value(dealer_hand),
                "status": "playing", "tokens": current_user.tokens,
            }

    if action == "double":
        if current_user.tokens < bet:
            raise HTTPException(status_code=400, detail="Insufficient tokens to double")
        current_user.tokens -= bet
        current_user.total_wagered += bet
        db.add(TokenTransaction(
            user_id=current_user.id, amount=-bet,
            tx_type="casino", description="Blackjack - double down"
        ))
        bet *= 2
        player_hand.append(deck.pop())
        action = "stand"

    # Stand — dealer plays
    dv = _hand_value(dealer_hand)
    while dv < 17:
        dealer_hand.append(deck.pop())
        dv = _hand_value(dealer_hand)

    pv = _hand_value(player_hand)

    if pv > 21:
        result, payout = "lose", 0.0
    elif dv > 21 or pv > dv:
        result, payout = "win", round(bet * 2, 2)
    elif pv == dv:
        result, payout = "push", round(bet, 2)
    else:
        result, payout = "lose", 0.0

    _settle_casino(db, current_user, bet, payout, "Blackjack")
    db.commit()

    return {
        "player_hand": player_hand, "dealer_hand": dealer_hand,
        "player_value": pv, "dealer_value": dv,
        "status": "done", "result": result, "payout": payout,
        "tokens": current_user.tokens,
    }


ROULETTE_REDS = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}


def _roulette_color(n):
    if n == 0:
        return "green"
    return "red" if n in ROULETTE_REDS else "black"


def _roulette_payout(bet_type, bet_value, number):
    color = _roulette_color(number)
    is_even = number != 0 and number % 2 == 0
    is_odd = number != 0 and number % 2 == 1

    if bet_type == "straight":
        if int(bet_value) == number:
            return 36
    elif bet_type == "color":
        if bet_value == color and number != 0:
            return 2
    elif bet_type == "parity":
        if bet_value == "even" and is_even:
            return 2
        if bet_value == "odd" and is_odd:
            return 2
    elif bet_type == "half":
        if bet_value == "low" and 1 <= number <= 18:
            return 2
        if bet_value == "high" and 19 <= number <= 36:
            return 2
    elif bet_type == "dozen":
        if bet_value == "1" and 1 <= number <= 12:
            return 3
        if bet_value == "2" and 13 <= number <= 24:
            return 3
        if bet_value == "3" and 25 <= number <= 36:
            return 3
    elif bet_type == "column":
        cols = {"1": set(range(1, 37, 3)), "2": set(range(2, 37, 3)), "3": set(range(3, 37, 3))}
        if number in cols.get(bet_value, set()):
            return 3
    return 0


class RouletteSpinRequest(BaseModel):
    bet: float
    bet_type: str
    bet_value: str


@router.post("/roulette/spin")
def roulette_spin(
    req: RouletteSpinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _validate_bet(req.bet, current_user)

    number = random.randint(0, 36)
    multiplier = _roulette_payout(req.bet_type, req.bet_value, number)
    payout = round(req.bet * multiplier, 2)

    current_user.tokens -= req.bet
    current_user.total_wagered += req.bet
    db.add(TokenTransaction(
        user_id=current_user.id, amount=-req.bet,
        tx_type="casino", description=f"Roulette - {req.bet_type}:{req.bet_value}"
    ))

    _settle_casino(db, current_user, req.bet, payout, "Roulette")
    add_xp(current_user, 3)
    db.commit()

    return {
        "number": number, "color": _roulette_color(number),
        "bet_type": req.bet_type, "bet_value": req.bet_value,
        "multiplier": multiplier, "payout": payout,
        "result": "win" if multiplier > 0 else "lose",
        "tokens": current_user.tokens,
    }


def _validate_bet(bet, user):
    if bet < settings.MIN_BET:
        raise HTTPException(status_code=400, detail=f"Minimum bet: {settings.MIN_BET}")
    if bet > settings.MAX_BET:
        raise HTTPException(status_code=400, detail=f"Maximum bet: {settings.MAX_BET}")
    if user.tokens < bet:
        raise HTTPException(status_code=400, detail="Insufficient tokens")


def _settle_casino(db, user, bet, payout, game):
    if payout > 0:
        user.tokens += payout
        user.total_wins += 1
        user.total_won += payout
        add_xp(user, 10)
        db.add(TokenTransaction(
            user_id=user.id, amount=payout,
            tx_type="win", description=f"{game} - gain {payout}"
        ))
    else:
        add_xp(user, 2)
