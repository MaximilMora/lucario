// Utilidades básicas para el sistema de combate por turnos

/**
 * Calcula el HP máximo basado en el nivel y HP base
 * @param {number} baseHP - HP base
 * @param {number} level - Nivel (default 50)
 * @returns {number} HP máximo
 */
export function calculateMaxHP(baseHP, level = 50) {
  return Math.floor(baseHP * (level / 50)) + 50;
}

/**
 * Obtiene los ataques disponibles para un Pokémon
 * @param {Object} pokemon - Datos del Pokémon
 * @returns {Array} Lista de ataques
 */
export function getPokemonAttacks(pokemon) {
  const types = pokemon.types?.map(t => t.type.name) || [];
  const primaryType = types[0] || 'normal';

  return [
    { id: 1, name: 'Ataque Rápido', power: 30, type: primaryType },
    { id: 2, name: 'Ataque Normal', power: 50, type: primaryType },
    { id: 3, name: 'Ataque Fuerte', power: 70, type: primaryType },
    { id: 4, name: 'Ataque Especial', power: 90, type: primaryType },
  ];
}

/**
 * Obtiene el stat de ataque de un Pokémon
 */
export function getAttackStat(pokemon) {
  return pokemon.stats?.find(s => s.stat.name === 'attack')?.base_stat || 50;
}

/**
 * Obtiene el stat de defensa de un Pokémon
 */
export function getDefenseStat(pokemon) {
  return pokemon.stats?.find(s => s.stat.name === 'defense')?.base_stat || 50;
}

/**
 * Obtiene el stat de HP de un Pokémon
 */
export function getHPStat(pokemon) {
  return pokemon.stats?.find(s => s.stat.name === 'hp')?.base_stat || 50;
}

/**
 * Capitaliza la primera letra de un string
 * @param {string} str - String a capitalizar
 * @returns {string} String con la primera letra en mayúscula
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
