'use client';

const STORAGE_KEY = 'pokemon-name-map';

/**
 * Get a Pokemon name by its ID from the local cache.
 * Returns a capitalized name or a fallback string.
 */
export function getPokemonName(id) {
  if (!id) return 'Desconocido';
  if (typeof window === 'undefined') return `Pokemon #${id}`;
  try {
    const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const name = map[id];
    return name
      ? name.charAt(0).toUpperCase() + name.slice(1)
      : `Pokemon #${id}`;
  } catch {
    return `Pokemon #${id}`;
  }
}

/**
 * Initialize the Pokemon name map in localStorage.
 * Fetches the list once from PokeAPI and caches it.
 * Subsequent calls are no-ops if the map is already loaded.
 */
export async function initPokemonMap() {
  if (typeof window === 'undefined') return;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Object.keys(parsed).length > 0) return;
    }

    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
    if (!res.ok) return;
    const data = await res.json();
    const map = {};
    data.results.forEach((p, i) => {
      map[i + 1] = p.name;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error initializing Pokemon map:', e);
  }
}
