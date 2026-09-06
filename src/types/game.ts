export type MediaType = "image" | "video" | "audio";
export type Media = {
  id: string;
  type: MediaType;
  url: string;
  alt?: string;
};

// seconds; null = unlimited
export type TimeLimit = 10 | 20 | 30 | 60 | 120 | 180 | null;

export type Clue = {
  id: string;
  question: string;
  answer: string;
  valueOverride?: number | null; // if null, derived from row + board
  media: Media[];
  isDailyDouble: boolean;
  timeLimit?: TimeLimit; // seconds; null/undefined = unlimited
};

export type Category = {
  id: string;
  title: string;
  clues: Clue[]; // length = rows
};

export type BoardId = "jeopardy" | "double" | "final";

export type Board = {
  id: BoardId;
  categories: Category[]; // columns 1..10
  showCategories: boolean; // per-board toggle
  enabled: boolean; // false = stale but hidden (keep data)
};

export type Game = {
  id: string;
  title: string; // empty => auto display Game N
  coverImageUrl?: string; // same image for Home card + Play board background
  createdAt: number;
  updatedAt: number;
  boards: {
    jeopardy: Board;
    double: Board;
    final: Board;
  };
};

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type GameSession = {
  gameId: string;
  players: Player[];
  // answered clue ids per board id
  answeredClueIds: string[];
  currentBoard: BoardId;
  currentTurnIndex: number;
  phase: "setup" | "playing" | "finished";
  startedAt: number;
  updatedAt: number;
};

// Helpers for derived values
export function getClueValue(
  clue: Clue,
  rowIndex: number, // 0-based
  boardId: BoardId
): number {
  if (clue.valueOverride != null) return clue.valueOverride;
  if (boardId === "jeopardy") return (rowIndex + 1) * 100;
  if (boardId === "double") return (rowIndex + 1) * 200;
  // final is wager, not fixed
  return 0;
}

export function getDefaultBoardLabel(boardId: BoardId): string {
  if (boardId === "jeopardy") return "Jeopardy";
  if (boardId === "double") return "Double Jeopardy";
  return "Final Jeopardy";
}
