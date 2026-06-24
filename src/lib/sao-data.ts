/**
 * SAO static data.
 *
 * IMPORTANT: Sword Art Online is a SKILL-BASED system, not a class-based one.
 * Any player can learn any skill, and there are NO fixed classes at character
 * creation. All avatars start with the same base stats and grow them through
 * play. This module therefore exposes only the starting stats and the list of
 * primary attributes — no classes, no archetypes.
 *
 * All icons referenced here come exclusively from the asset-gioco-di-SAO repo.
 */

export interface CharacterStat {
  id: string;
  name: string;
  /** PNG filename in /sao/stats/ */
  icon: string;
  description: string;
}

/**
 * The seven primary attributes of an SAO avatar.
 * Sourced from the "Icone statistiche" folder of the asset repo.
 */
export const STATS: CharacterStat[] = [
  { id: 'STR', name: 'Forza', icon: 'Forza.png', description: 'Danno fisico dei colpi e capacità di carico' },
  { id: 'VIT', name: 'Vita', icon: 'Vita.png', description: 'Punti ferita massimi e resistenza ai colpi' },
  { id: 'AGI', name: 'Agilità', icon: 'Agilità.png', description: 'Velocità di movimento e di evasione' },
  { id: 'DEX', name: 'Destrezza', icon: 'Destrezza.png', description: 'Precisione dei colpi e probabilità di critico' },
  { id: 'INT', name: 'Intelligenza', icon: 'Intelligenza.png', description: 'Potenza delle abilità speciali' },
  { id: 'MEN', name: 'Mente', icon: 'Mente.png', description: 'Punti mana e concentrazione' },
  { id: 'RES', name: 'Resistenza', icon: 'Resistenza.png', description: 'Difesa fisica e riduzione del danno subito' },
];

export interface Gender {
  id: 'male' | 'female';
  label: string;
  /** SVG filename in /sao/characters/ */
  svg: string;
  description: string;
  glowColor: string;
}

export const GENDERS: Gender[] = [
  {
    id: 'male',
    label: 'Uomo',
    svg: 'Avatar_maschio.svg',
    description: 'Avatar maschile — modello standard di Aincrad',
    glowColor: '#2B73B3',
  },
  {
    id: 'female',
    label: 'Donna',
    svg: 'Avatar_femmina.svg',
    description: 'Avatar femminile — modello standard di Aincrad',
    glowColor: '#BE2156',
  },
];

/**
 * Starting stats for a fresh SAO avatar.
 * In SAO every player begins with the same minimal baseline (all stats at 1)
 * and grows them through play. There are NO classes — growth is purely
 * skill-based.
 */
export function getStartingStats(): Record<string, number> {
  return { STR: 1, VIT: 1, AGI: 1, DEX: 1, INT: 1, MEN: 1, RES: 1 };
}
