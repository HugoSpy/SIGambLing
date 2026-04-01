const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["S", "H", "D", "C"];

const cardValue = (rank) => (rank === "A" ? 11 : ["K", "Q", "J"].includes(rank) ? 10 : Number(rank));

function computeHandValue(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card.rank), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

const drawCard = () => {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank, suit, display: `${rank}${suit}` };
};

function sessionView(session) {
  return {
    sessionId: session.id,
    status: session.status,
    playerHand: session.playerHand.map((card) => card.display),
    dealerHand: session.status === "playing" ? [session.dealerHand[0].display, "??"] : session.dealerHand.map((card) => card.display),
    playerValue: computeHandValue(session.playerHand),
    dealerValue: session.status === "playing" ? "?" : computeHandValue(session.dealerHand),
    message: session.message,
  };
}

export function createGameEngine(state, helpers) {
  const { getUser, ensure, normalizeUser, updateBadges, createId, fail } = helpers;

  function playRoulette({ userId, amount, selectionType, selectionValue }) {
    const user = getUser(userId);
    const numericAmount = Number(amount);
    ensure(numericAmount > 0, "La mise doit etre positive.");
    ensure(user.tokens >= numericAmount, "Solde insuffisant.");

    user.tokens -= numericAmount;
    user.stats.totalLost += numericAmount;
    user.stats.gamesPlayed += 1;

    const number = Math.floor(Math.random() * 37);
    const win =
      (selectionType === "parity" && number !== 0 && ((selectionValue === "even" && number % 2 === 0) || (selectionValue === "odd" && number % 2 === 1))) ||
      (selectionType === "color" && number !== 0 && ((selectionValue === "red" && RED_NUMBERS.has(number)) || (selectionValue === "black" && !RED_NUMBERS.has(number)))) ||
      (selectionType === "half" && ((selectionValue === "low" && number >= 1 && number <= 18) || (selectionValue === "high" && number >= 19 && number <= 36))) ||
      (selectionType === "dozen" && ((selectionValue === "1" && number <= 12) || (selectionValue === "2" && number >= 13 && number <= 24) || (selectionValue === "3" && number >= 25 && number <= 36))) ||
      (selectionType === "straight" && number === Number(selectionValue));

    const payout = win ? numericAmount * (selectionType === "straight" ? 36 : selectionType === "dozen" ? 3 : 2) : 0;
    if (win) {
      user.tokens += payout;
      user.stats.totalWon += payout;
      user.stats.gamesWon += 1;
    }
    updateBadges(user);

    return {
      result: { number, color: number === 0 ? "green" : RED_NUMBERS.has(number) ? "red" : "black", payout },
      user: normalizeUser(user),
      message: win ? `Victoire a la roulette. Numero ${number}, gain ${payout} tokens.` : `Perdu a la roulette. Numero ${number}, aucune correspondance.`,
    };
  }

  function finishBlackjack(session, user) {
    const playerValue = computeHandValue(session.playerHand);
    const dealerValue = computeHandValue(session.dealerHand);
    let payout = 0;

    if (playerValue > 21) {
      session.message = "Le joueur depasse 21. Main perdue.";
    } else if (dealerValue > 21 || playerValue > dealerValue) {
      payout = session.isBlackjack ? Math.round(session.bet * 2.5) : session.bet * 2;
      user.tokens += payout;
      user.stats.totalWon += payout;
      user.stats.gamesWon += 1;
      session.message = `Main gagnee. Retour ${payout} tokens.`;
    } else if (playerValue === dealerValue) {
      payout = session.bet;
      user.tokens += payout;
      user.stats.totalWon += payout;
      session.message = "Egalite. Mise remboursee.";
    } else {
      session.message = "Le croupier garde l'avantage.";
    }

    session.status = "resolved";
    updateBadges(user);
    return sessionView(session);
  }

  function getSession(sessionId, userId) {
    const session = state.blackjackSessions.get(sessionId);
    if (!session) fail(404, "Session Blackjack introuvable.");
    ensure(session.userId === userId, "Session invalide.", 403);
    ensure(session.status === "playing", "Cette main est deja terminee.");
    return session;
  }

  function playBlackjack({ mode, userId, amount, sessionId }) {
    const user = getUser(userId);

    if (mode === "start") {
      const numericAmount = Number(amount);
      ensure(numericAmount > 0, "La mise doit etre positive.");
      ensure(user.tokens >= numericAmount, "Solde insuffisant.");
      user.tokens -= numericAmount;
      user.stats.totalLost += numericAmount;
      user.stats.gamesPlayed += 1;

      const session = {
        id: createId("bj"),
        userId,
        bet: numericAmount,
        status: "playing",
        playerHand: [drawCard(), drawCard()],
        dealerHand: [drawCard(), drawCard()],
        message: "Main distribuee.",
        isBlackjack: false,
      };

      if (computeHandValue(session.playerHand) === 21) {
        session.isBlackjack = true;
        while (computeHandValue(session.dealerHand) < 17) session.dealerHand.push(drawCard());
        state.blackjackSessions.set(session.id, session);
        return finishBlackjack(session, user);
      }

      state.blackjackSessions.set(session.id, session);
      return sessionView(session);
    }

    const session = getSession(sessionId, userId);

    if (mode === "hit") {
      session.playerHand.push(drawCard());
      return computeHandValue(session.playerHand) > 21 ? finishBlackjack(session, user) : sessionView({ ...session, message: "Carte ajoutee au joueur." });
    }

    if (mode === "stand") {
      while (computeHandValue(session.dealerHand) < 17) session.dealerHand.push(drawCard());
      return finishBlackjack(session, user);
    }

    if (mode === "double") {
      ensure(session.playerHand.length === 2, "Double uniquement disponible sur les deux premieres cartes.");
      ensure(user.tokens >= session.bet, "Solde insuffisant pour doubler.");
      user.tokens -= session.bet;
      user.stats.totalLost += session.bet;
      session.bet *= 2;
      session.playerHand.push(drawCard());
      while (computeHandValue(session.dealerHand) < 17) session.dealerHand.push(drawCard());
      return finishBlackjack(session, user);
    }

    fail(400, "Action Blackjack inconnue.");
  }

  return (payload) => {
    if (payload.game === "roulette") return playRoulette(payload);
    if (payload.game === "blackjack") return playBlackjack(payload);
    fail(400, "Jeu inconnu.");
  };
}
