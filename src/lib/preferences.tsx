import { createContext, useContext, useState, type ReactNode } from 'react';
import { games } from '../data/games';
import { addRecent, deviceStorage, FAVORITES_KEY, LEGACY_FAVORITES_KEY, LEGACY_RECENT_KEY, readList, RECENT_KEY, writeList } from './storage';
const valid = games.map(game => game.slug);
interface Preferences { favorites: string[]; recent: string[]; toggleFavorite: (slug: string) => void; rememberGame: (slug: string) => void; clearHistory: () => void; }
const Context = createContext<Preferences | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [favorites,setFavorites] = useState(() => readList(FAVORITES_KEY,deviceStorage(),valid));
  const [recent,setRecent] = useState(() => readList(RECENT_KEY,deviceStorage(),valid));
  const toggleFavorite = (slug: string) => setFavorites(old => { const next = old.includes(slug) ? old.filter(item => item !== slug) : [...old,slug]; writeList(FAVORITES_KEY,next,deviceStorage()); return next; });
  const rememberGame = (slug: string) => setRecent(old => { const next = addRecent(old,slug); writeList(RECENT_KEY,next,deviceStorage()); return next; });
  const clearHistory = () => { setFavorites([]); setRecent([]); try { const storage = deviceStorage(); for (const key of [FAVORITES_KEY,RECENT_KEY,LEGACY_FAVORITES_KEY,LEGACY_RECENT_KEY]) { try { storage?.removeItem(key); } catch { /* Only our own lists are cleared. */ } } } catch { /* No storage available. */ } };
  return <Context.Provider value={{ favorites,recent,toggleFavorite,rememberGame,clearHistory }}>{children}</Context.Provider>;
}
export function usePreferences() { const context = useContext(Context); if (!context) throw new Error('Missing preferences provider'); return context; }
