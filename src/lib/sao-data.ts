/**
 * SAO static data — character classes and stat profiles.
 * Curated to be coherent with Sword Art Online lore.
 * Uses ONLY icons from the asset-gioco-di-SAO repository.
 */

export interface CharacterClass {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Equipment icon filename in /sao/equipment/ */
  icon: string;
  /** Round icon for selected state */
  iconRound: string;
  /** Primary stat keys (see STATS) */
  primaryStats: string[];
  /** Suggested weapon name (lore-friendly) */
  weapon: string;
  /** Color used for 3D light glow on card hover (hex) */
  glowColor: string;
}

export interface CharacterStat {
  id: string;
  name: string;
  /** PNG filename in /sao/stats/ */
  icon: string;
  description: string;
}

export const STATS: CharacterStat[] = [
  { id: 'STR', name: 'Forza', icon: 'Forza.png', description: 'Danno fisico e capacità di trasporto' },
  { id: 'VIT', name: 'Vita', icon: 'Vita.png', description: 'Punti ferita massimi e resistenza' },
  { id: 'AGI', name: 'Agilità', icon: 'Agilità.png', description: 'Velocità di movimento ed evasione' },
  { id: 'DEX', name: 'Destrezza', icon: 'Destrezza.png', description: 'Precisione e probabilità di colpire' },
  { id: 'INT', name: 'Intelligenza', icon: 'Intelligenza.png', description: 'Potenza delle abilità magiche' },
  { id: 'MEN', name: 'Mente', icon: 'Mente.png', description: 'Punti mana e capacità di concentrazione' },
  { id: 'RES', name: 'Resistenza', icon: 'Resistenza.png', description: 'Difesa fisica e riduzione danno' },
];

/**
 * Six character classes — each tied to an equipment icon found in the
 * asset repository and a build archetype coherent with SAO.
 */
export const CLASSES: CharacterClass[] = [
  {
    id: 'swordsman',
    name: 'Spadaccino',
    tagline: 'Il combattente frontline classico',
    description:
      'Maestro della spada a una mano, equilibrato tra attacco e difesa. ' +
      'La classe più diffusa ad Aincrad, scelta da Kirito stesso nelle prime fasi del gioco.',
    icon: 'icon_sword.png',
    iconRound: 'icon_round_sword.png',
    primaryStats: ['STR', 'VIT', 'AGI'],
    weapon: 'Anneal Blade',
    glowColor: '#5CC4F0',
  },
  {
    id: 'dagger',
    name: 'Ladro d\'Ombre',
    tagline: 'Velocità pura, colpi critici',
    description:
      'Combattente agile armato di pugnale, specializzato in attacchi rapidi e critici. ' +
      'Sfrutta l\'evasione per sopravvivere dove altri cadrebbero.',
    icon: 'icon_dagger.png',
    iconRound: 'icon_round_dagger.png',
    primaryStats: ['AGI', 'DEX', 'STR'],
    weapon: 'Dark Repulser',
    glowColor: '#9FE8FF',
  },
  {
    id: 'dualblade',
    name: 'Due Lame',
    tagline: 'Stile unico di Kirito',
    description:
      'L\'unicità Skill sbloccata al giocatore con il tempo di reazione più veloce di Aincrad. ' +
      'Permette di impugnare due spade simultaneamente, moltiplicando la potenza offensiva.',
    icon: 'icon_dualblade.png',
    iconRound: 'icon_round_dualblade.png',
    primaryStats: ['AGI', 'STR', 'DEX'],
    weapon: 'Elucidator + Dark Repulser',
    glowColor: '#7FE0FF',
  },
  {
    id: 'finesword',
    name: 'Spadaccino Fino',
    tagline: 'Eleganza e precisione letale',
    description:
      'Stile di combattimento raffinato che privilegia la precisione del colpo sopra la forza bruta. ' +
      'Adatto a chi sa leggere i pattern dei nemici.',
    icon: 'icon_finesword.png',
    iconRound: 'icon_round_finesword.png',
    primaryStats: ['DEX', 'AGI', 'STR'],
    weapon: 'Lambent Light',
    glowColor: '#A8D8FF',
  },
  {
    id: 'bow',
    name: 'Arciere',
    tagline: 'Morte silenziosa a distanza',
    description:
      'Cecchino che colpisce da lontano con arco e frecce. ' +
      'Indispensabile per abbattere nemici volanti e supportare il party dai margini del campo.',
    icon: 'icon_bow.png',
    iconRound: 'icon_round_bow.png',
    primaryStats: ['DEX', 'AGI', 'INT'],
    weapon: 'Shepherd\'s Bow',
    glowColor: '#B8E8FF',
  },
  {
    id: 'mace',
    name: 'Paladino',
    tagline: 'Difesa incrollabile e fede',
    description:
      'Tanke clericale armato di mazza e scudo. ' +
      'Mantiene in vita il party con cure e difese, reggendo l\'aggro dei boss.',
    icon: 'icon_mace.png',
    iconRound: 'icon_round_mace.png',
    primaryStats: ['VIT', 'RES', 'MEN'],
    weapon: 'Holy Mace of Aincrad',
    glowColor: '#FFE89F',
  },
];

export interface Gender {
  id: 'male' | 'female';
  label: string;
  /** SVG filename in /sao/characters/ */
  svg: string;
  /** PNG filename in /sao/characters/ */
  png: string;
  description: string;
  glowColor: string;
}

export const GENDERS: Gender[] = [
  {
    id: 'male',
    label: 'Uomo',
    svg: 'SAO_Man.svg',
    png: 'SAO_Man.png',
    description: 'Avatar maschile — modello standard di Aincrad',
    glowColor: '#5CC4F0',
  },
  {
    id: 'female',
    label: 'Donna',
    svg: 'SAO_Woman.svg',
    png: 'SAO_Woman.svg', // PNG not available in repo - reuse SVG
    description: 'Avatar femminile — modello standard di Aincrad',
    glowColor: '#FF9FCB',
  },
];

/**
 * Default starting stats for a fresh character of given class.
 */
export function getStartingStats(classId: string): Record<string, number> {
  const cls = CLASSES.find((c) => c.id === classId);
  if (!cls) {
    return { STR: 10, VIT: 10, AGI: 10, DEX: 10, INT: 10, MEN: 10, RES: 10 };
  }
  const stats: Record<string, number> = { STR: 8, VIT: 8, AGI: 8, DEX: 8, INT: 8, MEN: 8, RES: 8 };
  cls.primaryStats.forEach((statId, idx) => {
    stats[statId] = 14 - idx * 2; // 14, 12, 10
  });
  return stats;
}
