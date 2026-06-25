// Tipi SAO estesi — Aincrad Death Game con Integral Factor

// === SISTEMA STATISTICHE ===
// 7 statistiche principali su cui il player investe punti:
// - str (Forza): scaling armi a due mani / disarmato
// - dex (Destrezza): scaling armi a una mano, +critico
// - agi (Agilità): scaling armi da tiro, schivata, iniziativa
// - vit (Vitalità): HP, oggetti curativi bonus
// - res (Resistenza): Energia, difesa fisica, resistenza Bruciato
// - men (Mente): MP, danno skill, resistenza Avvelenato
// - int (Intelligenza): XP/Col bonus, resistenze Congelato/Addormentato
export interface PlayerStats {
  str: number;
  dex: number;
  agi: number;
  vit: number;
  res: number;
  men: number;
  int: number;
}

export type StatKey = keyof PlayerStats;

// Bonus sbloccati ai milestone di punti investiti (5,10,20,30,40,50,60,70,80,90)
export interface StatBonus {
  pointsRequired: number;
  description: string;
  // tipo di effetto per il calcolo automatico
  type:
    | 'hp'          // +X HP (vit)
    | 'sp'          // +X Energia (res)
    | 'mp'          // +X MP (men)
    | 'healing-items' // +X oggetti curativi (vit)
    | 'attack-two-handed'  // +X% attacco armi 2 mani / disarmato (str)
    | 'attack-one-handed'  // +X% attacco armi 1 mano (dex)
    | 'defense'     // +X% difesa (str)
    | 'stun-chance' // +X% stordimento (str)
    | 'crit-chance' // +X% critico (dex)
    | 'enemy-miss'  // +X% miss avversario (dex)
    | 'dodge'       // +X% schivata (agi)
    | 'perfect-dodge' // +X% schivata perfetta (agi)
    | 'status-resist-all' // +X% resistenza tutti status (agi)
    | 'status-resist-burn' // +X% resistenza Bruciato (res)
    | 'status-resist-poison' // +X% Avvelenato (men)
    | 'status-resist-freeze' // +X% Congelato (int)
    | 'status-resist-sleep'  // +X% Addormentato (int)
    | 'skill-damage' // +X% danno skill (men)
    | 'xp-gain'     // +X% XP (int)
    | 'col-gain';   // +X% Col (int)
  value: number;
}

// Tipo scaling arma: determina quale stat moltiplica il danno
export type WeaponScaling = 'str' | 'dex' | 'agi' | 'int';

export type WeaponType = 'sword' | 'dagger' | 'bow' | 'mace' | 'rod' | 'gun' | 'dualblade' | 'finesword';
export type DeathMode = 'normal' | 'permadeath';

export interface Player {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  sp: number;
  maxSp: number;
  xp: number;
  xpToNext: number;
  col: number;
  weaponType: WeaponType;
  equippedWeapon?: string;
  equippedArmor?: string;
  equippedAccessory?: string;
  inventory: { itemId: string; quantity: number }[];
  skills: string[];
  skillPoints: number;
  statPoints: number;
  stats: PlayerStats;
  floor: number;
  position: string;
  area?: string;
  alive: boolean;
  createdAt: number;
  deathMode: DeathMode;
  gender: 'male' | 'female';
  bag: { itemId: string; quantity: number }[];
  isAdmin: boolean;
  cheats: {
    immortal: boolean;
    instantWin: boolean;
  };
}
