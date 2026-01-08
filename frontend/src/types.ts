export type TeamName = "Red" | "Blue" | "Green" | "Yellow";

export type Bid = {
  team: TeamName;
  amount: number;
  timestamp: string; // backend sends datetime as string
};

export type Player = {
  name: string;
  info: string;
  base_price: number;
  photo_path: string;

  current_price: number;
  next_price: number;

  bids: Bid[];
};

export type Team = {
  name: TeamName;
  wallet: number;
  players: Player[];
};

export type State = {
  event_id: number;
  teams: Record<TeamName, Team>;
  remaining_players: Player[];
  current_player: Player | null;
  created_at: string;
};








