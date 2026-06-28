'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { Item, ItemCategory } from '@/lib/sao-inventory-types';
import { CATEGORIES } from '@/lib/sao-inventory-types';
import { EXPLORE_AREAS, EXPLORE_SUBAREAS } from '@/lib/sao-explore-data';

/**
 * SAO Journal Panel (Diario) — shows all discovered information.
 *
 * Same card style and animations as CharacterPanel:
 *   - White SAO card with angular clip-path
 *   - VR hover (3D tilt + cursor-following glow)
 *   - Open: opacity 0→1 (500ms) + scale 0.85→1 (400ms OutQuart)
 *   - Close: opacity 1→0 (250ms) + scale 1→0.9
 *
 * Categories:
 *   - Armi (subcategorized: spade, asce, pugnali, fioretti)
 *   - Oggetti (items + potions)
 *   - Armature
 *   - Accessori
 *   - Oggetti Missione
 *   - Aree e Zone (mapped areas/subareas)
 *   - MOB (enemies defeated — placeholder for combat system)
 *
 * Click on an item → its image appears on the LEFT side, rotating.
 */

interface JournalPanelProps {
  open: boolean;
  onClose: () => void;
  items: Item[];
}

// Macro categories for the journal
type JournalTab = 'weapons' | 'items' | 'armor' | 'accessories' | 'quest' | 'areas' | 'mob';

const TAB_LABELS: Record<JournalTab, string> = {
  weapons: 'ARMI',
  items: 'OGGETTI',
  armor: 'ARMATURE',
  accessories: 'ACCESSORI',
  quest: 'OGGETTI MISSIONE',
  areas: 'AREE E ZONE',
  mob: 'NEMICI',
};

// Weapon subcategories
const WEAPON_SUBCATS: { key: ItemCategory; label: string }[] = [
  { key: 'one-handed-sword', label: 'Spade ad una mano' },
  { key: 'two-handed-sword', label: 'Spadoni' },
  { key: 'one-handed-axe', label: 'Asce ad una mano' },
  { key: 'two-handed-axe', label: 'Asce a due mani' },
  { key: 'dagger', label: 'Pugnali' },
  { key: 'finesword', label: 'Fioretti' },
];

// Category icon mapping (uses GitHub assets)
const CAT_ICON: Record<string, string> = {
  'one-handed-sword': '/sao/equipment-types/icon_sword.png',
  'two-handed-sword': '/sao/equipment-types/icon_sword.png',
  'one-handed-axe': '/sao/equipment-types/icon_mace.png',
  'two-handed-axe': '/sao/equipment-types/icon_mace.png',
  'dagger': '/sao/equipment-types/icon_dagger.png',
  'finesword': '/sao/equipment-types/icon_finesword.png',
  'shield': '/sao/equipment-types/icon_round_protector.png',
  'armor': '/sao/equipment-types/icon_light_armor.png',
  'accessory': '/sao/equipment-types/icon_accessory.png',
  'item': '/sao/equipment-types/icon_round_item.png',
  'potion': '/sao/equipment-types/icon_round_meat.png',
  'quest-item': '/sao/equipment-types/icon_round_memory_crystal.png',
};

const textBorder = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';

export default function JournalPanel({ open, onClose, items }: JournalPanelProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);
  const [activeTab, setActiveTab] = useState<JournalTab>('weapons');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => play('popupPanel', 0.4), 300);
      return () => clearTimeout(t);
    }
  }, [open, play]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (isHover) { setIsHover(false); setTransform(''); }
      return;
    }
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTransform(`perspective(1200px) rotateX(${-(py - 0.5) * 8}deg) rotateY(${(px - 0.5) * 8}deg) scale3d(1.015, 1.015, 1.015)`);
    setLightPos({ x: px * 100, y: py * 100 });
    if (!isHover) setIsHover(true);
  };

  const handleMouseLeave = () => { setIsHover(false); setTransform(''); };

  const handleItemClick = (item: Item) => {
    play('click', 0.3);
    setSelectedItem(item);
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 3000);
  };

  // Filter items by category
  const getItemsByCategory = (cats: ItemCategory[]) => items.filter(i => cats.includes(i.category));

  const weaponItems = getItemsByCategory(['one-handed-sword', 'two-handed-sword', 'one-handed-axe', 'two-handed-axe', 'dagger', 'finesword']);
  const itemItems = getItemsByCategory(['item', 'potion']);
  const armorItems = getItemsByCategory(['armor', 'shield']);
  const accessoryItems = getItemsByCategory(['accessory']);
  const questItems = getItemsByCategory(['quest-item']);

  const tabs: { key: JournalTab; label: string; count: number }[] = [
    { key: 'weapons', label: TAB_LABELS.weapons, count: weaponItems.length },
    { key: 'items', label: TAB_LABELS.items, count: itemItems.length },
    { key: 'armor', label: TAB_LABELS.armor, count: armorItems.length },
    { key: 'accessories', label: TAB_LABELS.accessories, count: accessoryItems.length },
    { key: 'quest', label: TAB_LABELS.quest, count: questItems.length },
    { key: 'areas', label: TAB_LABELS.areas, count: EXPLORE_AREAS.length },
    { key: 'mob', label: TAB_LABELS.mob, count: 0 },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ background: 'rgba(2, 8, 20, 0.7)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ opacity: { duration: 0.5, ease: 'easeOut' }, scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(900px, 95vw)' }}
            >
              <div
                ref={cardRef}
                className="relative"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => { if (!isHover) setIsHover(true); }}
                onMouseLeave={handleMouseLeave}
                style={{ maxHeight: '90vh', overflow: 'hidden', transform, transformStyle: 'preserve-3d', transition: 'transform 0.18s ease-out' }}
              >
                {/* VR glow */}
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ opacity: isHover ? 1 : 0, background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(92, 196, 240, 0.18) 0%, transparent 50%)`, mixBlendMode: 'screen', zIndex: 50 }} aria-hidden />

                {/* Card body — white SAO style */}
                <div className="relative w-full" style={{ background: '#FBFBFB', clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)', boxShadow: isHover ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.5)' : '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}>

                  {/* Header */}
                  <div className="flex items-center justify-between p-6 pb-3" style={{ borderBottom: '2px solid #2B73B3' }}>
                    <h2 className="tracking-[0.3em]" style={{ color: '#2B73B3', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.5rem' }}>
                      DIARIO
                    </h2>
                    <button onClick={() => { play('dismissLauncher', 0.35); onClose(); }} className="flex items-center justify-center" style={{ width: '36px', height: '36px', background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Chiudi">
                      <img src="/sao/window/btn-red.svg" alt="Chiudi" className="w-full h-full" draggable={false} />
                    </button>
                  </div>

                  {/* Content: left (image preview) + right (tabs + list) */}
                  <div className="flex" style={{ minHeight: '400px' }}>

                    {/* LEFT: selected item image (rotating) */}
                    <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '280px', padding: '20px', borderRight: '1px solid rgba(43,115,179,0.15)' }}>
                      {selectedItem ? (
                        <div className="flex flex-col items-center gap-3">
                          <motion.img
                            key={selectedItem.id}
                            src={`/sao/equipment/${selectedItem.icon}`}
                            alt={selectedItem.name}
                            className="w-32 h-32"
                            style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
                            draggable={false}
                            initial={{ rotateY: 0 }}
                            animate={{ rotateY: isRotating ? [0, 360] : 0 }}
                            transition={{ duration: 3, ease: 'easeInOut' }}
                          />
                          <p className="text-center" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.85rem', textShadow: '0 1px 0 rgba(0,0,0,0.15), 0 2px 1px rgba(0,0,0,0.1)' }}>
                            {selectedItem.name}
                          </p>
                          <p className="text-center" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', lineHeight: 1.5, opacity: 0.7, textShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
                            {selectedItem.description}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2" style={{ opacity: 0.3 }}>
                          <img src="/sao/equipment-types/icon_round_item.png" alt="" className="w-20 h-20" style={{ opacity: 0.4 }} draggable={false} />
                          <p style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                            SELEZIONA UN OGGETTO
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: tabs + item list */}
                    <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>

                      {/* Tabs */}
                      <div className="flex flex-wrap gap-1 p-3" style={{ borderBottom: '1px solid rgba(43,115,179,0.15)' }}>
                        {tabs.map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => { play('click', 0.3); setActiveTab(tab.key); setSelectedItem(null); }}
                            className="px-3 py-1.5 transition-all"
                            style={{
                              background: activeTab === tab.key ? 'rgba(43,115,179,0.15)' : 'transparent',
                              border: `1px solid ${activeTab === tab.key ? 'rgba(43,115,179,0.4)' : 'rgba(43,115,179,0.1)'}`,
                              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                              color: activeTab === tab.key ? '#2B73B3' : 'rgba(26,42,58,0.5)',
                              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                              fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.1em',
                              cursor: 'pointer',
                            }}
                          >
                            {tab.label} ({tab.count})
                          </button>
                        ))}
                      </div>

                      {/* Item list */}
                      <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '400px' }}>

                        {/* WEAPONS tab */}
                        {activeTab === 'weapons' && (
                          <div className="flex flex-col gap-3">
                            {WEAPON_SUBCATS.map(subcat => {
                              const subItems = weaponItems.filter(i => i.category === subcat.key);
                              if (subItems.length === 0) return null;
                              return (
                                <div key={subcat.key}>
                                  <p className="tracking-[0.1em] mb-1.5" style={{ color: '#2B73B3', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.75rem' }}>
                                    {subcat.label.toUpperCase()}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {subItems.map(item => (
                                      <ItemEntry key={item.id} item={item} isSelected={selectedItem?.id === item.id} onClick={() => handleItemClick(item)} />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {weaponItems.length === 0 && <EmptyState text="Nessun'arma scoperta." />}
                          </div>
                        )}

                        {/* ITEMS tab */}
                        {activeTab === 'items' && (
                          <div className="grid grid-cols-2 gap-2">
                            {itemItems.map(item => <ItemEntry key={item.id} item={item} isSelected={selectedItem?.id === item.id} onClick={() => handleItemClick(item)} />)}
                            {itemItems.length === 0 && <EmptyState text="Nessun oggetto scoperto." />}
                          </div>
                        )}

                        {/* ARMOR tab */}
                        {activeTab === 'armor' && (
                          <div className="grid grid-cols-2 gap-2">
                            {armorItems.map(item => <ItemEntry key={item.id} item={item} isSelected={selectedItem?.id === item.id} onClick={() => handleItemClick(item)} />)}
                            {armorItems.length === 0 && <EmptyState text="Nessun'armatura scoperta." />}
                          </div>
                        )}

                        {/* ACCESSORIES tab */}
                        {activeTab === 'accessories' && (
                          <div className="grid grid-cols-2 gap-2">
                            {accessoryItems.map(item => <ItemEntry key={item.id} item={item} isSelected={selectedItem?.id === item.id} onClick={() => handleItemClick(item)} />)}
                            {accessoryItems.length === 0 && <EmptyState text="Nessun accessorio scoperto." />}
                          </div>
                        )}

                        {/* QUEST ITEMS tab */}
                        {activeTab === 'quest' && (
                          <div className="grid grid-cols-2 gap-2">
                            {questItems.map(item => <ItemEntry key={item.id} item={item} isSelected={selectedItem?.id === item.id} onClick={() => handleItemClick(item)} />)}
                            {questItems.length === 0 && <EmptyState text="Nessun oggetto missione scoperto." />}
                          </div>
                        )}

                        {/* AREAS tab */}
                        {activeTab === 'areas' && (
                          <div className="flex flex-col gap-3">
                            {EXPLORE_AREAS.map(area => (
                              <div key={area.id}>
                                <p className="tracking-[0.1em] mb-1.5" style={{ color: '#2B73B3', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.7rem' }}>
                                  {area.name.toUpperCase()}
                                </p>
                                <p style={{ color: 'rgba(26,42,58,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '8px' }}>
                                  {area.description}
                                </p>
                                <div className="flex flex-col gap-1">
                                  {EXPLORE_SUBAREAS.filter(sa => sa.areaId === area.id).map(sa => (
                                    <div key={sa.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'rgba(43,115,179,0.05)', border: '1px solid rgba(43,115,179,0.1)', clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                                      <span style={{ color: '#2B73B3', fontSize: '0.7rem' }}>◈</span>
                                      <span style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem' }}>
                                        {sa.name}
                                      </span>
                                      <span className="ml-auto" style={{ color: 'rgba(26,42,58,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.75rem' }}>
                                        {sa.terrainPalette.length} terreni
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MOB tab */}
                        {activeTab === 'mob' && (
                          <EmptyState text="Nessun nemico sconfitto. Il sistema di combattimento non è ancora implementato." />
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Item Entry (small card in the list) ---------- */

function ItemEntry({ item, isSelected, onClick }: { item: Item; isSelected: boolean; onClick: () => void }) {
  const icon = CAT_ICON[item.category] || '/sao/equipment-types/icon_round_item.png';
  const rarityColor: Record<string, string> = {
    common: '#999', uncommon: '#7FC522', rare: '#5CC4F0', epic: '#9b6dff', legendary: '#EBA601',
  };
  const accent = rarityColor[item.rarity || 'common'] || '#999';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 text-left transition-all"
      style={{
        background: isSelected ? `${accent}15` : 'rgba(43,115,179,0.04)',
        border: `1px solid ${isSelected ? accent + '60' : 'rgba(43,115,179,0.1)'}`,
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
        cursor: 'pointer',
      }}
    >
      <img src={icon} alt="" className="w-8 h-8 flex-shrink-0" style={{ objectFit: 'contain' }} draggable={false} />
      <div className="flex flex-col min-w-0">
        <span className="truncate" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.75rem' }}>
          {item.name}
        </span>
        <span style={{ color: accent, fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>
          {item.rarity || 'common'}
        </span>
      </div>
    </button>
  );
}

/* ---------- Empty State ---------- */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8" style={{ opacity: 0.4 }}>
      <p style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', textAlign: 'center' }}>
        {text}
      </p>
    </div>
  );
}
