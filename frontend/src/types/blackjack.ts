export interface BlackjackCard {
  rank: string;
  suit: string;
}

export type BlackjackGameState = "BETTING" | "DEALING" | "PLAYER_TURN" | "DEALER_TURN" | "GAME_OVER";
export type BlackjackResult = "win" | "loss" | "push" | "blackjack" | "bust";

export interface BlackjackDealResponse {
  game_id: string;
  player_hand: BlackjackCard[];
  dealer_upcard: BlackjackCard;
  dealer_hand_final?: BlackjackCard[];
  dealer_visible_total?: number;
  dealer_total?: number;
  player_total: number;
  status: "playing" | "resolved";
  result?: BlackjackResult;
  payout?: number;
  insurance_bet?: number;
  insurance_payout?: number;
  insurance_available?: boolean;
  new_balance: number;
  is_immediate?: boolean;
}

export interface BlackjackActionResponse {
  player_hand?: BlackjackCard[];
  player_total?: number;
  dealer_hand_final?: BlackjackCard[];
  dealer_total?: number;
  status: "playing" | "resolved";
  result?: BlackjackResult;
  payout?: number;
  insurance_bet?: number;
  insurance_payout?: number;
  insurance_available?: boolean;
  new_balance?: number;
}
