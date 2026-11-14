import { create } from "zustand";
import type { City } from "@iw/shared/cities";
import { cityByName, guessHomeCity, storeCity } from "@/utils/home";

interface HomeState {
  /** The viewer's city for the local weather card. */
  city: City;
  /** Pick a city by name; remembered in this browser. */
  setCity(name: string): void;
}

export const useHomeStore = create<HomeState>((set) => ({
  city: guessHomeCity(),
  setCity: (name) => {
    const c = cityByName(name);
    if (!c) return;
    storeCity(c.name);
    set({ city: c });
  },
}));
