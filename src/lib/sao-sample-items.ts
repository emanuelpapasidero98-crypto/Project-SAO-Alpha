// === SAO Sample Items — ONE per category ===
// All icons come from the asset-gioco-di-SAO repository (Equipment Icons + Item Types).
// These are the ONLY items created for testing — no other items exist.

import type { Item } from './sao-inventory-types';

const now = Date.now();

export const SAMPLE_ITEMS: Item[] = [
  // === Spade ad una mano ===
  {
    id: 'sample-sword-1h',
    name: 'Anneal Blade',
    category: 'one-handed-sword',
    description:
      'Una spada ad una mano forgiata con metallo annealato. Equilibrio perfetto tra peso e maneggevolezza. ' +
      'L\'arma scelta da Kirito nelle prime fasi di Aincrad.',
    icon: 'icon_sword.png',
    equippable: true,
    handedness: 'one-handed',
    statBonuses: { attack: 5, str: 2 },
    location: 'inventory',
    acquiredAt: now - 100000,
  },
  // === Spadoni (spade a due mani) ===
  {
    id: 'sample-sword-2h',
    name: 'Elucidator',
    category: 'two-handed-sword',
    description:
      'Spadone nero a due mani dal peso formidabile. Forgiato da un cristallo raro di Aincrad. ' +
      'Infligge danni devastanti ma richiede grande forza per essere brandito.',
    icon: 'icon_dualblade.png',
    equippable: true,
    handedness: 'two-handed',
    statBonuses: { attack: 12, str: 5 },
    location: 'inventory',
    acquiredAt: now - 90000,
  },
  // === Asce ad una mano ===
  {
    id: 'sample-axe-1h',
    name: 'Crimson Hatchet',
    category: 'one-handed-axe',
    description:
      'Ascia ad una mano con lama cremisi. Effective contro armature pesanti. ' +
      'Permette di impugnare uno scudo nella mano secondaria.',
    icon: 'icon_mace.png',
    equippable: true,
    handedness: 'one-handed',
    statBonuses: { attack: 6, str: 3 },
    location: 'inventory',
    acquiredAt: now - 80000,
  },
  // === Asce a due mani ===
  {
    id: 'sample-axe-2h',
    name: 'War Crusher',
    category: 'two-handed-axe',
    description:
      'Ascia da guerra a due mani dall\'impatto devastante. In grado di sfondare le difese nemiche ' +
      'più resistenti. Occupa entrambe le mani — niente scudo.',
    icon: 'icon_rod.png',
    equippable: true,
    handedness: 'two-handed',
    statBonuses: { attack: 14, str: 6 },
    location: 'inventory',
    acquiredAt: now - 70000,
  },
  // === Pugnali ===
  {
    id: 'sample-dagger',
    name: 'Dark Repulser',
    category: 'dagger',
    description:
      'Pugnale leggero ad una mano con lama cristallina. Estrema velocità di attacco. ' +
      'L\'arma preferita di chi combatte con stile agile e letale.',
    icon: 'icon_dagger.png',
    equippable: true,
    handedness: 'one-handed',
    statBonuses: { attack: 4, agi: 3, dex: 2 },
    location: 'inventory',
    acquiredAt: now - 60000,
  },
  // === Fioretto ===
  {
    id: 'sample-finesword',
    name: 'Lambent Light',
    category: 'finesword',
    description:
      'Fioretto elegante ad una mano, forgiato per chi predilige la precisione alla forza bruta. ' +
      'L\'arma scelta da Asuna per la sua velocità di Thrust.',
    icon: 'icon_finesword.png',
    equippable: true,
    handedness: 'one-handed',
    statBonuses: { attack: 5, dex: 4, agi: 2 },
    location: 'inventory',
    acquiredAt: now - 50000,
  },
  // === Scudi ===
  {
    id: 'sample-shield',
    name: 'Aincrad Buckler',
    category: 'shield',
    description:
      'Scudo leggero in acciaio di Aincrad. Offre protezione senza compromettere la mobilità. ' +
      'Può essere equipaggiato solo con armi ad una mano.',
    icon: 'icon_round_protector.png',
    equippable: true,
    statBonuses: { defense: 8, vit: 2 },
    location: 'inventory',
    acquiredAt: now - 40000,
  },
  // === Armature ===
  {
    id: 'sample-armor',
    name: 'Blackwyrm Coat',
    category: 'armor',
    description:
      'Armatura leggera in pelle nera di drago. Flessibile e resistente, non ostacola i movimenti. ' +
      'Indossata da Kirito durante le esplorazioni di Aincrad.',
    icon: 'icon_light_armor.png',
    equippable: true,
    statBonuses: { defense: 10, vit: 3, agi: 1 },
    location: 'inventory',
    acquiredAt: now - 30000,
  },
  // === Accessori ===
  {
    id: 'sample-accessory',
    name: 'Ring of Agility',
    category: 'accessory',
    description:
      'Anello incantato che aumenta l\'agilità del portatore. Si possono equipaggiare fino a due accessori.',
    icon: 'icon_accessory.png',
    equippable: true,
    statBonuses: { agi: 5 },
    location: 'inventory',
    acquiredAt: now - 20000,
  },
  // === Oggetti ===
  {
    id: 'sample-item',
    name: 'Teleport Crystal',
    category: 'item',
    description:
      'Cristallo di teletrasporto. Permette di tornare istantaneamente alla città più vicina. ' +
      'Non può essere equipaggiato — solo trasportato nella borsa.',
    icon: 'icon_round_item.png',
    equippable: false,
    location: 'inventory',
    acquiredAt: now - 15000,
  },
  // === Pozioni ===
  {
    id: 'sample-potion',
    name: 'Healing Potion',
    category: 'potion',
    description:
      'Pozione curativa che ripristina 50 HP istantaneamente. Non può essere equipaggiata — solo trasportata.',
    icon: 'icon_round_meat.png',
    equippable: false,
    location: 'inventory',
    acquiredAt: now - 10000,
  },
  // === Oggetti Missione ===
  {
    id: 'sample-quest-item',
    name: 'Memory Crystal',
    category: 'quest-item',
    description:
      'Cristallo della memoria contenente ricordi perduti di Aincrad. Oggetto raro richiesto per una quest speciale. ' +
      'Non può essere equipaggiato — solo trasportato.',
    icon: 'icon_round_memory_crystal.png',
    equippable: false,
    location: 'inventory',
    acquiredAt: now - 5000,
  },
];
