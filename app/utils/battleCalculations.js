import {
  getTypeEffectiveness,
  getEffectivenessMessage,
} from './typeChart';

/**
 * Calcula el daño de un ataque considerando efectividad de tipos.
 * Es la fuente de verdad del servidor — nunca se ejecuta en el cliente.
 *
 * @param {number} attackStat  - Stat de ataque del atacante
 * @param {number} defenseStat - Stat de defensa del defensor
 * @param {number} movePower   - Poder del movimiento
 * @param {string} moveType    - Tipo del movimiento (e.g. 'fire')
 * @param {string[]} defenderTypes - Tipos del Pokémon defensor (e.g. ['water', 'flying'])
 * @returns {{ damage: number, effectiveness: number }}
 */
export function calculateDamage(
  attackStat,
  defenseStat,
  movePower,
  moveType,
  defenderTypes
) {
  const effectiveness = getTypeEffectiveness(moveType, defenderTypes);
  if (effectiveness === 0) return { damage: 0, effectiveness };
  const baseDamage = (attackStat / defenseStat) * movePower * effectiveness;
  const variation = 0.8 + Math.random() * 0.4; // 80-120%
  return {
    damage: Math.max(1, Math.floor(baseDamage * variation)),
    effectiveness,
  };
}

export { getEffectivenessMessage };
