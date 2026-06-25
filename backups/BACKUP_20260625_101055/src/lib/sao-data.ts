/**
 * SAO static data — character creation data (gender, stat display).
 *
 * IMPORTANT: Sword Art Online is a SKILL-BASED system, not a class-based one.
 * Any player can learn any skill, and there are NO fixed classes at character
 * creation. All avatars start with the same base stats and grow them through
 * play.
 *
 * The actual stats engine (milestones, XP table, derived stats, formulas) is
 * in `sao-stats.ts`. This file re-exports the key types and functions for
 * convenience, plus holds the gender display data.
 *
 * All icons referenced here come exclusively from the asset-gioco-di-SAO repo.
 */

// Re-export everything from the stats engine
export {
  type StatKey,
  type PlayerStats,
  type StatBonus,
  type StatMilestone,
  type StatMeta,
  type WeaponScaling,
  type DerivedStats,
  STAT_MILESTONES,
  STAT_META,
  XP_TABLE,
  MAX_PLAYER_LEVEL,
  BASE_CRIT_CHANCE,
  getStatPointsForLevel,
  getTotalStatPointsAtLevel,
  calcMaxHp,
  calcMaxMp,
  calcMaxSp,
  calcBaseAttack,
  calcBaseDefense,
  calcBaseDodge,
  getStatBonusSum,
  getUnlockedBonuses,
  getNextBonus,
  calcDerivedStats,
  calcXpToNext,
  getStartingStats,
  getStartingPlayerStats,
  getStartingVitals,
} from './sao-stats';

import { STAT_META, type StatKey } from './sao-stats';

/**
 * Display-friendly stat list (built from STAT_META in sao-stats.ts).
 * Used by UI components that need to iterate over the 7 stats.
 */
export interface CharacterStat {
  id: string;       // uppercase short code (FOR, VIT, AGI, DES, MEN, INT, RES)
  key: StatKey;     // lowercase key used in PlayerStats
  name: string;
  icon: string;     // PNG filename in /sao/stats/
  color: string;
  description: string;
}

export const STATS: CharacterStat[] = (
  Object.keys(STAT_META) as StatKey[]
).map((key) => {
  const meta = STAT_META[key];
  return {
    id: meta.short,
    key: meta.key,
    name: meta.name,
    icon: meta.icon.split('/').pop() || '',
    color: meta.color,
    description: meta.description,
  };
});

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
    svg: 'SAO_Man.svg',
    description: 'Avatar maschile — modello standard di Aincrad',
    glowColor: '#2B73B3',
  },
  {
    id: 'female',
    label: 'Donna',
    svg: 'SAO_Woman.svg',
    description: 'Avatar femminile — modello standard di Aincrad',
    glowColor: '#BE2156',
  },
];
