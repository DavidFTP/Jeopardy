import { create } from "zustand";
import type { Game } from "../types/game";
import { localGameRepository } from "../services/gameRepository";

type GameStore = {
  games: Game[];
  load: () => void;
  saveGame: (g: Game) => void;
  deleteGame: (id: string) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  games: [],
  load: () => set({ games: localGameRepository.list() }),
  saveGame: (g: Game) => {
    localGameRepository.save(g);
    set({ games: localGameRepository.list() });
  },
  deleteGame: (id: string) => {
    localGameRepository.delete(id);
    set({ games: localGameRepository.list() });
  },
}));
