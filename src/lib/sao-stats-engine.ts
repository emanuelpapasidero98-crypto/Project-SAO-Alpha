// === MOTORE STATISTICHE SAO ===
// Implementazione completa del sistema statistiche con milestone bonus,
// scaling armi, sotto-statistiche derivate (attacco, difesa, schivata, critico)
// e resistenze status.

// === MILESTONE BONUS ===
// Ogni statistica ha 10 milestone (a 5, 10, 20, 30, 40, 50, 60, 70, 80, 90 punti).
// Quando il player investe punti sufficienti, il bonus viene sbloccato.
// I bonus sono CUMULATIVI: raggiungere 90 punti sblocca tutti i bonus precedenti.

import type { PlayerStats, StatKey, StatBonus, WeaponScaling } from './sao-types';

export interface StatMilestoneDef {
  pointsRequired: number;
  description: string;
  type: StatBonus['type'];
  value: number;
}

// Esportiamo sia il tipo che i dati delle milestone
export type StatMilestone = StatMilestoneDef;

export const STAT_MILESTONES: Record<StatKey, StatMilestone[]> = {
  // === VITALITÀ ===
  vit: [
    { pointsRequired: 5,  description: '+20 HP',                                  type: 'hp',             value: 20  },
    { pointsRequired: 10, description: '+10 HP',                                  type: 'hp',             value: 10  },
    { pointsRequired: 20, description: '+20 HP',                                  type: 'hp',             value: 20  },
    { pointsRequired: 30, description: '+10 HP',                                  type: 'hp',             value: 10  },
    { pointsRequired: 40, description: '+20 HP',                                  type: 'hp',             value: 20  },
    { pointsRequired: 50, description: '+100 Oggetti Curativi',                   type: 'healing-items',  value: 100 },
    { pointsRequired: 60, description: '+30 HP',                                  type: 'hp',             value: 30  },
    { pointsRequired: 70, description: '+20 HP',                                  type: 'hp',             value: 20  },
    { pointsRequired: 80, description: '+50 Oggetti Curativi',                    type: 'healing-items',  value: 50  },
    { pointsRequired: 90, description: '+100 HP',                                 type: 'hp',             value: 100 },
  ],

  // === RESISTENZA ===
  res: [
    { pointsRequired: 5,  description: '+10 Energia',                             type: 'sp',                    value: 10 },
    { pointsRequired: 10, description: '+5 Energia',                              type: 'sp',                    value: 5  },
    { pointsRequired: 20, description: '+10 Energia',                             type: 'sp',                    value: 10 },
    { pointsRequired: 30, description: '+5 Energia',                              type: 'sp',                    value: 5  },
    { pointsRequired: 40, description: '+10 Energia',                             type: 'sp',                    value: 10 },
    { pointsRequired: 50, description: '+5% Resistenza Bruciato',                 type: 'status-resist-burn',    value: 5  },
    { pointsRequired: 60, description: '+20 Energia',                             type: 'sp',                    value: 20 },
    { pointsRequired: 70, description: '+10 Energia',                             type: 'sp',                    value: 10 },
    { pointsRequired: 80, description: '+5% Resistenza Bruciato',                 type: 'status-resist-burn',    value: 5  },
    { pointsRequired: 90, description: '+30 Energia',                             type: 'sp',                    value: 30 },
  ],

  // === FORZA ===
  str: [
    { pointsRequired: 5,  description: '+3% Attacco (armi 2 mani / disarmato)',   type: 'attack-two-handed', value: 3 },
    { pointsRequired: 10, description: '+3% Difesa',                              type: 'defense',           value: 3 },
    { pointsRequired: 20, description: '+3% Attacco (armi 2 mani / disarmato)',   type: 'attack-two-handed', value: 3 },
    { pointsRequired: 30, description: '+3% Difesa',                              type: 'defense',           value: 3 },
    { pointsRequired: 40, description: '+5% Stordimento (qualsiasi arma)',        type: 'stun-chance',       value: 5 },
    { pointsRequired: 50, description: '+3% Difesa',                              type: 'defense',           value: 3 },
    { pointsRequired: 60, description: '+3% Attacco (armi 2 mani / disarmato)',   type: 'attack-two-handed', value: 3 },
    { pointsRequired: 70, description: '+3% Difesa',                              type: 'defense',           value: 3 },
    { pointsRequired: 80, description: '+5% Stordimento (qualsiasi arma)',        type: 'stun-chance',       value: 5 },
    { pointsRequired: 90, description: '+5% Attacco (armi 2 mani / disarmato)',   type: 'attack-two-handed', value: 5 },
  ],

  // === DESTREZZA ===
  dex: [
    { pointsRequired: 5,  description: '+3% Attacco (armi 1 mano)',              type: 'attack-one-handed', value: 3 },
    { pointsRequired: 10, description: '+2% Critico (qualsiasi arma)',           type: 'crit-chance',      value: 2 },
    { pointsRequired: 20, description: '+3% Attacco (armi 1 mano)',              type: 'attack-one-handed', value: 3 },
    { pointsRequired: 30, description: '+2% Critico (qualsiasi arma)',           type: 'crit-chance',      value: 2 },
    { pointsRequired: 40, description: '+3% Miss Avversario',                    type: 'enemy-miss',       value: 3 },
    { pointsRequired: 50, description: '+2% Critico (qualsiasi arma)',           type: 'crit-chance',      value: 2 },
    { pointsRequired: 60, description: '+3% Attacco (armi 1 mano)',              type: 'attack-one-handed', value: 3 },
    { pointsRequired: 70, description: '+2% Critico (qualsiasi arma)',           type: 'crit-chance',      value: 2 },
    { pointsRequired: 80, description: '+3% Miss Avversario',                    type: 'enemy-miss',       value: 3 },
    { pointsRequired: 90, description: '+5% Attacco (armi 1 mano)',              type: 'attack-one-handed', value: 5 },
  ],

  // === AGILITÀ ===
  agi: [
    { pointsRequired: 5,  description: '+2% Schivata',                           type: 'dodge',             value: 2 },
    { pointsRequired: 10, description: '+2% Resistenza tutti gli status',        type: 'status-resist-all', value: 2 },
    { pointsRequired: 20, description: '+2% Schivata',                           type: 'dodge',             value: 2 },
    { pointsRequired: 30, description: '+2% Resistenza tutti gli status',        type: 'status-resist-all', value: 2 },
    { pointsRequired: 40, description: '+3% Schivata Perfetta',                  type: 'perfect-dodge',     value: 3 },
    { pointsRequired: 50, description: '+2% Resistenza tutti gli status',        type: 'status-resist-all', value: 2 },
    { pointsRequired: 60, description: '+2% Schivata',                           type: 'dodge',             value: 2 },
    { pointsRequired: 70, description: '+2% Resistenza tutti gli status',        type: 'status-resist-all', value: 2 },
    { pointsRequired: 80, description: '+3% Schivata Perfetta',                  type: 'perfect-dodge',     value: 3 },
    { pointsRequired: 90, description: '+5% Schivata',                           type: 'dodge',             value: 5 },
  ],

  // === MENTE ===
  men: [
    { pointsRequired: 5,  description: '+10 MP',                                  type: 'mp',                    value: 10 },
    { pointsRequired: 10, description: '+3% Danno Skill',                         type: 'skill-damage',          value: 3  },
    { pointsRequired: 20, description: '+10 MP',                                  type: 'mp',                    value: 10 },
    { pointsRequired: 30, description: '+3% Danno Skill',                         type: 'skill-damage',          value: 3  },
    { pointsRequired: 40, description: '+20 MP',                                  type: 'mp',                    value: 20 },
    { pointsRequired: 50, description: '+5% Resistenza Avvelenato',               type: 'status-resist-poison',  value: 5  },
    { pointsRequired: 60, description: '+3% Danno Skill',                         type: 'skill-damage',          value: 3  },
    { pointsRequired: 70, description: '+3% Danno Skill',                         type: 'skill-damage',          value: 3  },
    { pointsRequired: 80, description: '+5% Resistenza Avvelenato',               type: 'status-resist-poison',  value: 5  },
    { pointsRequired: 90, description: '+30 MP',                                  type: 'mp',                    value: 30 },
  ],

  // === INTELLIGENZA ===
  int: [
    { pointsRequired: 5,  description: '+5% Esperienza ottenuta',                 type: 'xp-gain',               value: 5  },
    { pointsRequired: 10, description: '+5% Col ottenuti',                        type: 'col-gain',              value: 5  },
    { pointsRequired: 20, description: '+3% Esperienza ottenuta',                 type: 'xp-gain',               value: 3  },
    { pointsRequired: 30, description: '+3% Col ottenuti',                        type: 'col-gain',              value: 3  },
    { pointsRequired: 40, description: '+3% Esperienza ottenuta',                 type: 'xp-gain',               value: 3  },
    { pointsRequired: 50, description: '+5% Resistenza Congelato',                type: 'status-resist-freeze',  value: 5  },
    { pointsRequired: 60, description: '+5% Resistenza Addormentato',             type: 'status-resist-sleep',   value: 5  },
    { pointsRequired: 70, description: '+5% Resistenza Congelato',                type: 'status-resist-freeze',  value: 5  },
    { pointsRequired: 80, description: '+5% Resistenza Addormentato',             type: 'status-resist-sleep',   value: 5  },
    { pointsRequired: 90, description: '+100% Col ottenuti',                      type: 'col-gain',              value: 100 },
  ],
};

// === METADATI STATISTICHE (per UI) ===
export interface StatMeta {
  key: StatKey;
  name: string;
  short: string;
  color: string;
  icon: string;
  description: string;
}

export const STAT_META: Record<StatKey, StatMeta> = {
  str: {
    key: 'str',
    name: 'Forza',
    short: 'FOR',
    color: '#cc2233',
    icon: '/sao/stats/Forza.png',
    description:
      'Influenza il danno fisico senza armi e il danno delle armi che scalano su Forza. ' +
      'Le armi a due mani e il combattimento a mani nude beneficiano maggiormente di questa statistica. ' +
      'Aumentare la Forza conferisce bonus attacco con armi a due mani, difesa passiva e probabilità di stordimento.',
  },
  dex: {
    key: 'dex',
    name: 'Destrezza',
    short: 'DES',
    color: '#ff7a00',
    icon: '/sao/stats/Destrezza.png',
    description:
      'Influenza il danno delle armi che scalano su Destrezza, in particolare le armi a una mano. ' +
      'Aumentare la Destrezza conferisce bonus attacco con armi a una mano, probabilità di critico maggiore ' +
      'e una piccola probabilità che gli attacchi avversari manchino il bersaglio.',
  },
  agi: {
    key: 'agi',
    name: 'Agilità',
    short: 'AGI',
    color: '#3a7a0c',
    icon: '/sao/stats/Agilità.png',
    description:
      'Influenza il danno delle armi che scalano su Agilità (armi da tiro) e determina chi attacca per primo ' +
      'all\'inizio del combattimento. Aumentare l\'Agilità conferisce bonus Schivata, Schivata Perfetta ' +
      'e resistenza passiva a tutti gli status negativi.',
  },
  vit: {
    key: 'vit',
    name: 'Vitalità',
    short: 'VIT',
    color: '#d4a017',
    icon: '/sao/stats/Vita.png',
    description:
      'Influenza direttamente la quantità di HP del giocatore. Aumentare la Vitalità conferisce bonus HP ' +
      'incrementali e, ai livelli più alti, oggetti curativi gratuiti che vengono aggiunti direttamente all\'inventario.',
  },
  res: {
    key: 'res',
    name: 'Resistenza',
    short: 'RES',
    color: '#8b5cf6',
    icon: '/sao/stats/Resistenza.png',
    description:
      'Influenza la quantità di Energia e contribuisce alla difesa fisica. Aumentare la Resistenza conferisce ' +
      'bonus Energia incrementali e resistenza specifica allo status Bruciato.',
  },
  men: {
    key: 'men',
    name: 'Mente',
    short: 'MEN',
    color: '#06b6d4',
    icon: '/sao/stats/Mente.png',
    description:
      'Influenza la quantità di MP del giocatore. Aumentare la Mente conferisce bonus MP, danno delle Skill ' +
      'maggiore e resistenza specifica allo status Avvelenato.',
  },
  int: {
    key: 'int',
    name: 'Intelligenza',
    short: 'INT',
    color: '#3b82f6',
    icon: '/sao/stats/Intelligenza.png',
    description:
      'Influenza il danno delle armi che scalano su Intelligenza. Aumentare l\'Intelligenza conferisce bonus ' +
      'Esperienza e Col ottenuti, oltre a resistenze specifiche agli status Congelato e Addormentato.',
  },
};

// === PUNTI STAT PER LIVELLO ===
// Dal livello 2 al 10: 3 punti per livello
// Dal livello 11 al 40: 2 punti per livello
// Dal livello 41 al 90: 1 punto per livello
// Oltre il 90: 0 punti (cap)
export function getStatPointsForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 10) return 3;
  if (level <= 40) return 2;
  if (level <= 90) return 1;
  return 0;
}

// Calcola i punti stat TOTALI spettanti a un dato livello (esclusi quelli iniziali)
export function getTotalStatPointsAtLevel(level: number): number {
  let total = 0;
  for (let lv = 2; lv <= level; lv++) {
    total += getStatPointsForLevel(lv);
  }
  return total;
}

// === FORMULE HP / MP / SP ===
// HP: base 120, +5% per livello (composto)
// MP: base 50, +5% per livello (composto)
// SP: base 60, +5% per livello (composto)
// I bonus da VIT/RES/MEN si sommano DOPO il calcolo base.

export const MAX_PLAYER_LEVEL = 90;

// === TABELLA XP — XP richiesti per salire DAL livello N al livello N+1 ===
// Tabella fissa come da specifica canonica SAO (1→90).
// Per livelli oltre il 90 (non dovrebbero essere raggiungibili), usa fallback.
export const XP_TABLE: Record<number, number> = {
  1: 100,    2: 300,    3: 600,    4: 1000,   5: 1500,
  6: 2100,   7: 2800,   8: 3600,   9: 4500,   10: 5500,
  11: 6600,  12: 7800,  13: 9100,  14: 10500, 15: 12000,
  16: 13600, 17: 15300, 18: 17100, 19: 19000, 20: 21000,
  21: 23100, 22: 25300, 23: 27600, 24: 30000, 25: 32500,
  26: 35100, 27: 37800, 28: 40600, 29: 43500, 30: 46500,
  31: 49600, 32: 52800, 33: 56100, 34: 59500, 35: 63000,
  36: 66600, 37: 70300, 38: 74100, 39: 78000, 40: 82000,
  41: 86100, 42: 90300, 43: 94600, 44: 99000, 45: 103500,
  46: 108100, 47: 112800, 48: 117600, 49: 122500, 50: 127500,
  51: 132600, 52: 137800, 53: 143100, 54: 148500, 55: 154000,
  56: 159600, 57: 165300, 58: 171100, 59: 177000, 60: 183000,
  61: 189100, 62: 195300, 63: 201600, 64: 208000, 65: 214500,
  66: 221100, 67: 227800, 68: 234600, 69: 241500, 70: 248500,
  71: 255600, 72: 262800, 73: 270100, 74: 277500, 75: 285000,
  76: 292600, 77: 300300, 78: 308100, 79: 316000, 80: 324000,
  81: 332100, 82: 340300, 83: 348600, 84: 357000, 85: 365500,
  86: 374100, 87: 382800, 88: 391600, 89: 400500,
};

export function calcMaxHp(level: number, vit: number): number {
  // Base 120, +5% per livello (composto)
  let base = 120;
  for (let i = 1; i < level; i++) {
    base = Math.floor(base * 1.05);
  }
  // Bonus da VIT attraverso milestone
  const vitBonus = getStatBonusSum(vit, 'vit', 'hp');
  return base + vitBonus;
}

export function calcMaxMp(level: number, men: number): number {
  // Base 50, +5% per livello (composto)
  let base = 50;
  for (let i = 1; i < level; i++) {
    base = Math.floor(base * 1.05);
  }
  const menBonus = getStatBonusSum(men, 'men', 'mp');
  return base + menBonus;
}

export function calcMaxSp(level: number, res: number): number {
  // Base 60, +5% per livello (composto)
  let base = 60;
  for (let i = 1; i < level; i++) {
    base = Math.floor(base * 1.05);
  }
  const resBonus = getStatBonusSum(res, 'res', 'sp');
  return base + resBonus;
}

// === SOTTO-STATISTICHE BASE ===
// Attacco a mani nude: 5 al livello 1, +3 per livello
// Difesa pura: 5 al livello 1, +3 per livello
// Schivata: 5 al livello 1, +3 per livello
// Critico: 5% base, NON sale con il livello (solo con Destrezza)
export function calcBaseAttack(level: number): number {
  return 5 + (level - 1) * 3;
}

export function calcBaseDefense(level: number): number {
  return 5 + (level - 1) * 3;
}

export function calcBaseDodge(level: number): number {
  // Schivata passiva (base del personaggio, separata dai bonus Agilità)
  return 5 + (level - 1) * 3;
}

export const BASE_CRIT_CHANCE = 5; // 5% al livello 1, non cresce col livello

// === CALCOLO BONUS DA STAT ===
// Restituisce la SOMMA di tutti i bonus di un certo tipo che sono stati sbloccati
// per una data statistica a un dato valore di punti investiti.
export function getStatBonusSum(
  statValue: number,
  statKey: StatKey,
  bonusType: StatBonus['type']
): number {
  const milestones = STAT_MILESTONES[statKey];
  if (!milestones) return 0;
  let sum = 0;
  for (const m of milestones) {
    if (statValue >= m.pointsRequired && m.type === bonusType) {
      sum += m.value;
    }
  }
  return sum;
}

// Restituisce tutti i bonus sbloccati per una statistica a un dato valore
export function getUnlockedBonuses(statValue: number, statKey: StatKey): StatBonus[] {
  const milestones = STAT_MILESTONES[statKey];
  if (!milestones) return [];
  return milestones
    .filter((m) => statValue >= m.pointsRequired)
    .map((m) => ({
      pointsRequired: m.pointsRequired,
      description: m.description,
      type: m.type,
      value: m.value,
    }));
}

// Restituisce il prossimo bonus da sbloccare (o null se tutti sbloccati)
export function getNextBonus(statValue: number, statKey: StatKey): StatMilestone | null {
  const milestones = STAT_MILESTONES[statKey];
  if (!milestones) return null;
  for (const m of milestones) {
    if (statValue < m.pointsRequired) return m;
  }
  return null;
}

// === DERIVATE COMPLETE ===
export interface DerivedStats {
  // Sotto-statistiche base (al livello, SENZA bonus stat)
  baseAttackRaw: number;
  baseDefenseRaw: number;
  baseDodgeRaw: number;
  // Sotto-statistiche con bonus stat applicati (visualizzate al player)
  attack: number;
  defense: number;
  dodge: number;
  // Critico e altri %
  critChance: number;
  enemyMissChance: number;
  perfectDodgeChance: number;
  stunChance: number;
  // Moltiplicatori danno per tipo arma (per debug/visualizzazione)
  attackMultTwoHanded: number;
  attackMultOneHanded: number;
  // Moltiplicatori utility
  xpMult: number;
  colMult: number;
  skillDamageMult: number;
  // Resistenze status (% riduzione danno/durata)
  resistBurn: number;
  resistPoison: number;
  resistFreeze: number;
  resistSleep: number;
  resistAllStatus: number;
  // Healing items bonus (aggiunti in automatico)
  bonusHealingItems: number;
}

export function calcDerivedStats(
  level: number,
  stats: PlayerStats,
  opts?: {
    weaponAttack?: number;
    weaponScaling?: WeaponScaling;
    weaponCategory?: 'one-handed' | 'two-handed' | 'ranged' | 'none';
    armorDefense?: number;
  }
): DerivedStats {
  const baseAttackRaw = calcBaseAttack(level);
  const baseDefenseRaw = calcBaseDefense(level);
  const baseDodgeRaw = calcBaseDodge(level);

  // === Moltiplicatori attacco per categoria arma ===
  const attackMultTwoHanded = 1 + getStatBonusSum(stats.str, 'str', 'attack-two-handed') / 100;
  const attackMultOneHanded = 1 + getStatBonusSum(stats.dex, 'dex', 'attack-one-handed') / 100;

  let attackMult = 1;
  if (opts?.weaponCategory === 'two-handed' || opts?.weaponCategory === 'none') {
    attackMult = attackMultTwoHanded;
  } else if (opts?.weaponCategory === 'one-handed') {
    attackMult = attackMultOneHanded;
  }

  const attack = Math.round(baseAttackRaw * attackMult);

  // === Difesa pura ===
  const defenseMult = 1 + getStatBonusSum(stats.str, 'str', 'defense') / 100;
  const defense = Math.round(baseDefenseRaw * defenseMult);

  // === Schivata ===
  const dodgeBonus = getStatBonusSum(stats.agi, 'agi', 'dodge');
  const dodge = baseDodgeRaw + dodgeBonus;

  // === Critico ===
  const critBonus = getStatBonusSum(stats.dex, 'dex', 'crit-chance');
  const critChance = BASE_CRIT_CHANCE + critBonus;

  // === Altri % ===
  const enemyMissChance = getStatBonusSum(stats.dex, 'dex', 'enemy-miss');
  const perfectDodgeChance = getStatBonusSum(stats.agi, 'agi', 'perfect-dodge');
  const stunChance = getStatBonusSum(stats.str, 'str', 'stun-chance');
  const xpMult = 1 + getStatBonusSum(stats.int, 'int', 'xp-gain') / 100;
  const colMult = 1 + getStatBonusSum(stats.int, 'int', 'col-gain') / 100;
  const skillDamageMult = 1 + getStatBonusSum(stats.men, 'men', 'skill-damage') / 100;

  // === Resistenze status ===
  const resistAllStatus = getStatBonusSum(stats.agi, 'agi', 'status-resist-all');
  const resistBurn = 5 + getStatBonusSum(stats.res, 'res', 'status-resist-burn') + resistAllStatus;
  const resistPoison = 5 + getStatBonusSum(stats.men, 'men', 'status-resist-poison') + resistAllStatus;
  const resistFreeze = 5 + getStatBonusSum(stats.int, 'int', 'status-resist-freeze') + resistAllStatus;
  const resistSleep = 5 + getStatBonusSum(stats.int, 'int', 'status-resist-sleep') + resistAllStatus;

  // === Healing items bonus ===
  const bonusHealingItems = getStatBonusSum(stats.vit, 'vit', 'healing-items');

  return {
    baseAttackRaw,
    baseDefenseRaw,
    baseDodgeRaw,
    attack,
    defense,
    dodge,
    critChance,
    enemyMissChance,
    perfectDodgeChance,
    stunChance,
    attackMultTwoHanded,
    attackMultOneHanded,
    xpMult,
    colMult,
    skillDamageMult,
    resistBurn,
    resistPoison,
    resistFreeze,
    resistSleep,
    resistAllStatus,
    bonusHealingItems,
  };
}

// === XP per livello ===
export function calcXpToNext(level: number): number {
  if (level < 1) return 100;
  if (level >= MAX_PLAYER_LEVEL) return 0; // cap
  return XP_TABLE[level] ?? Math.floor(100 * Math.pow(1.18, level - 1));
}
