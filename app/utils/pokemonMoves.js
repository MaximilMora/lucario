/**
 * Módulo de obtención de movimientos reales desde PokeAPI.
 * La caché a nivel de módulo persiste entre requests en la misma instancia del servidor,
 * reduciendo latencia en batallas con Pokémon populares.
 */

const moveDetailsCache = new Map();

async function fetchMoveDetails(moveName) {
  if (moveDetailsCache.has(moveName)) {
    return moveDetailsCache.get(moveName);
  }
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
    const data = res.ok ? await res.json() : null;
    if (data) moveDetailsCache.set(moveName, data);
    return data;
  } catch {
    return null;
  }
}

function generateFallbackAttacks(pokemonData) {
  const primaryType = pokemonData.types?.[0]?.type?.name || 'normal';
  return [
    { id: 1, name: 'Ataque Rápido', power: 30, type: primaryType },
    { id: 2, name: 'Ataque Normal', power: 50, type: primaryType },
    { id: 3, name: 'Ataque Fuerte', power: 70, type: primaryType },
    { id: 4, name: 'Ataque Especial', power: 90, type: primaryType },
  ];
}

/**
 * Obtiene 4 movimientos reales del Pokémon desde PokeAPI.
 * Prioriza movimientos aprendidos por subida de nivel.
 * Usa caché para minimizar llamadas repetidas.
 * Aplica fallback a ataques genéricos si no hay suficientes movimientos dañinos.
 */
export async function fetchPokemonMoves(pokemonData) {
  const allMoves = pokemonData.moves || [];

  const levelUpNames = allMoves
    .filter(m =>
      m.version_group_details.some(
        d => d.move_learn_method.name === 'level-up'
      )
    )
    .map(m => m.move.name);

  const candidates = (
    levelUpNames.length >= 6 ? levelUpNames : allMoves.map(m => m.move.name)
  ).slice(0, 12);

  const details = await Promise.all(candidates.map(fetchMoveDetails));

  const damaging = details
    .filter(m => m && m.power && m.damage_class?.name !== 'status')
    .sort((a, b) => a.power - b.power);

  if (damaging.length < 4) return generateFallbackAttacks(pokemonData);

  const indices = [
    0,
    Math.floor(damaging.length / 3),
    Math.floor((damaging.length * 2) / 3),
    damaging.length - 1,
  ];

  return [...new Set(indices)].slice(0, 4).map((i, id) => ({
    id: id + 1,
    name: damaging[i].name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()),
    power: damaging[i].power,
    type: damaging[i].type.name,
  }));
}
