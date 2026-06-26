// === SAO Inventory & Equipment Types ===

export type ItemCategory =
  | 'one-handed-sword'  // Spade ad una mano
  | 'two-handed-sword'  // Spadoni
  | 'one-handed-axe'    // Asce ad una mano
  | 'two-handed-axe'    // Asce a due mani
  | 'dagger'            // Pugnali
  | 'finesword'         // Fioretto
  | 'shield'            // Scudi
  | 'armor'             // Armature
  | 'accessory'         // Accessori
  | 'item'              // Oggetti
  | 'potion'            // Pozioni
  | 'quest-item';       // Oggetti Missione

export type EquipmentSlot =
  | 'weapon'    // Arma (1 mano o 2 mani)
  | 'shield'    // Scudo
  | 'armor'     // Armatura
  | 'accessory1' // Accessorio 1
  | 'accessory2'; // Accessorio 2

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  icon: string;          // PNG filename in /sao/equipment/
  /** Whether this item can be equipped (weapons, shields, armor, accessories) */
  equippable: boolean;
  /** Weapon handedness (only for weapons) */
  handedness?: 'one-handed' | 'two-handed';
  /** Rarity tier for loot tables */
  rarity?: ItemRarity;
  /** Optional stats bonuses granted when equipped */
  statBonuses?: Partial<{
    str: number; dex: number; agi: number; vit: number;
    res: number; men: number; int: number;
    hp: number; mp: number; sp: number;
    attack: number; defense: number; dodge: number; crit: number;
  }>;
  /** Whether the item is currently in the bag (carried) or inventory (stored) */
  location: 'inventory' | 'bag';
  /** Timestamp when acquired (for sorting by most recent) */
  acquiredAt: number;
}

export interface EquipmentState {
  weapon: string | null;    // item id
  shield: string | null;    // item id
  armor: string | null;     // item id
  accessory1: string | null; // item id
  accessory2: string | null; // item id
}

export const BAG_MAX_ITEMS = 10;

// Category metadata for UI display
export interface CategoryMeta {
  key: ItemCategory;
  label: string;
  /** Whether items in this category can be equipped */
  canEquip: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'one-handed-sword', label: 'Spade ad una mano', canEquip: true },
  { key: 'two-handed-sword', label: 'Spadoni', canEquip: true },
  { key: 'one-handed-axe', label: 'Asce ad una mano', canEquip: true },
  { key: 'two-handed-axe', label: 'Asce a due mani', canEquip: true },
  { key: 'dagger', label: 'Pugnali', canEquip: true },
  { key: 'finesword', label: 'Fioretto', canEquip: true },
  { key: 'shield', label: 'Scudi', canEquip: true },
  { key: 'armor', label: 'Armature', canEquip: true },
  { key: 'accessory', label: 'Accessori', canEquip: true },
  { key: 'item', label: 'Oggetti', canEquip: false },
  { key: 'potion', label: 'Pozioni', canEquip: false },
  { key: 'quest-item', label: 'Oggetti Missione', canEquip: false },
];

// Helper: get the equipment slot for an item
export function getEquipmentSlot(item: Item): EquipmentSlot | null {
  switch (item.category) {
    case 'one-handed-sword':
    case 'two-handed-sword':
    case 'one-handed-axe':
    case 'two-handed-axe':
    case 'dagger':
    case 'finesword':
      return 'weapon';
    case 'shield':
      return 'shield';
    case 'armor':
      return 'armor';
    case 'accessory':
      return 'accessory1'; // will be assigned to accessory1 or accessory2
    default:
      return null;
  }
}

// Helper: check if an item is a two-handed weapon
export function isTwoHanded(item: Item): boolean {
  return (
    (item.category === 'two-handed-sword' || item.category === 'two-handed-axe') ||
    item.handedness === 'two-handed'
  );
}
