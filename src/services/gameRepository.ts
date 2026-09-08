import type { Board, BoardId, Category, Clue, Game } from "../types/game";

const STORAGE_KEY = "jeopardy:games:v1";
const SESSION_KEY = "jeopardy:sessions:v1";

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function createEmptyClue(): Clue {
  return {
    id: uid(),
    question: "",
    answer: "",
    valueOverride: null,
    media: [],
    isDailyDouble: false,
    timeLimit: null,
  };
}

export function createEmptyCategory(colIdx: number, rows: number): Category {
  return {
    id: uid(),
    title: `Category ${colIdx + 1}`,
    clues: Array.from({ length: rows }, () => createEmptyClue()),
  };
}

export function createEmptyBoard(
  id: BoardId,
  cols: number,
  rows: number,
  enabled: boolean
): Board {
  return {
    id,
    categories: Array.from({ length: cols }, (_, i) =>
      createEmptyCategory(i, rows)
    ),
    showCategories: true,
    enabled,
  };
}

export function createNewGame(allGames: Game[]): Game {
  // auto name counter: find highest Game N
  let maxN = 0;
  for (const g of allGames) {
    const m = g.title.match(/^Game\s+(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    // also consider auto-display fallback: we store empty title, but we also need to consider stored empty titles count?
  }
  void maxN;

  const now = Date.now();
  return {
    id: uid(),
    title: "", // empty => displays as Game N in UI; placeholder will show that
    coverImageUrl: "",
    createdAt: now,
    updatedAt: now,
    boards: {
      jeopardy: createEmptyBoard("jeopardy", 4, 4, true),
      double: createEmptyBoard("double", 4, 4, false),
      final: {
        id: "final",
        categories: [
          {
            id: uid(),
            title: "Final Category",
            clues: [createEmptyClue()],
          },
        ],
        showCategories: true,
        enabled: false,
      },
    },
  };
}

export function displayTitle(game: Game, fallbackIndex?: number): string {
  if (game.title.trim()) return game.title.trim();
  if (fallbackIndex != null) return `Game ${fallbackIndex}`;
  return `Untitled Game`;
}

export function getAutoNumberForNew(allGames: Game[]): number {
  let maxN = 0;
  for (const g of allGames) {
    const m = g.title.match(/^Game\s+(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return maxN > 0 ? maxN + 1 : allGames.length + 1;
}

// Repository interface (future backend swappable)
export interface GameRepository {
  list(): Game[];
  get(id: string): Game | undefined;
  save(game: Game): void;
  delete(id: string): void;
}

export const localGameRepository: GameRepository = {
  list(): Game[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Game[];
      // migration: ensure all boards have required fields
      return parsed.map(migrateGame);
    } catch {
      return [];
    }
  },
  get(id: string) {
    return this.list().find((g) => g.id === id);
  },
  save(game: Game) {
    try {
      const all = this.list();
      const idx = all.findIndex((g) => g.id === game.id);
      const toSave = { ...game, updatedAt: Date.now() };
      if (idx >= 0) all[idx] = toSave;
      else all.unshift(toSave);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.error("Failed to save game to localStorage:", err);
    }
  },
  delete(id: string) {
    const all = this.list().filter((g) => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // also delete session
    deleteSession(id);
  },
};

function migrateGame(g: Game): Game {
  // ensure double/final exist with enabled field
  const anyG = g as unknown as Record<string, unknown>;
  if (!g.boards) {
    g.boards = {
      jeopardy: createEmptyBoard("jeopardy", 4, 4, true),
      double: createEmptyBoard("double", 4, 4, false),
      final: createEmptyBoard("final", 1, 1, false),
    };
  }
  if (!g.boards.jeopardy) g.boards.jeopardy = createEmptyBoard("jeopardy", 4, 4, true);
  if (!g.boards.double) g.boards.double = createEmptyBoard("double", 4, 4, false);
  if (!g.boards.final) g.boards.final = createEmptyBoard("final", 1, 1, false);
  // ensure showCategories & enabled
  for (const bid of ["jeopardy", "double", "final"] as BoardId[]) {
    const b = g.boards[bid];
    if (b.showCategories == null) b.showCategories = true;
    if (b.enabled == null) b.enabled = bid === "jeopardy";
    for (const c of b.categories) {
      if (!c.clues) c.clues = [];
      for (const clue of c.clues) {
        if (clue.media == null) (clue as unknown as Record<string, unknown>).media = [];
        if (clue.isDailyDouble == null) clue.isDailyDouble = false;
        if (clue.valueOverride === undefined) clue.valueOverride = null;
        if (clue.timeLimit === undefined) clue.timeLimit = null;
      }
    }
  }
  if (g.coverImageUrl == null) g.coverImageUrl = "";
  // keep stale disabled boards data as requested (no auto-delete)
  void anyG;
  return g;
}

// Session repository
import type { GameSession } from "../types/game";

export function listSessions(): GameSession[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GameSession[];
  } catch {
    return [];
  }
}

export function getSession(gameId: string): GameSession | undefined {
  return listSessions().find((s) => s.gameId === gameId);
}

export function saveSession(sess: GameSession) {
  try {
    const all = listSessions();
    const idx = all.findIndex((s) => s.gameId === sess.gameId);
    const toSave = { ...sess, updatedAt: Date.now() };
    if (idx >= 0) all[idx] = toSave;
    else all.push(toSave);
    localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch (err) {
    console.error("Failed to save session to localStorage:", err);
  }
}

export function deleteSession(gameId: string) {
  const all = listSessions().filter((s) => s.gameId !== gameId);
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

export function hasActiveSession(gameId: string): boolean {
  const s = getSession(gameId);
  return !!s && s.phase !== "finished";
}
