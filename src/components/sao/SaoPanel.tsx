'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { Item, EquipmentState } from '@/lib/sao-inventory-types';
import { CATEGORIES, BAG_MAX_ITEMS, isTwoHanded, getEquipmentSlot } from '@/lib/sao-inventory-types';
import ItemDetailModal from './ItemDetailModal';

/**
 * SAO Inventory/Bag Panel — shared component for both the Inventory and Bag cards.
 *
 * Same look & feel as the CharacterPanel:
 *   - White SAO card with angular clip-path corners
 *   - Top/bottom accent bars (#2B73B3 gradient)
 *   - PanelView.qml animation (opacity + scale, OutQuart)
 *   - VR hover effect (3D tilt + cursor-following glow)
 *   - Red X close button
 *
 * Inventory mode:
 *   - Left sidebar: 12 category tabs
 *   - Right: items grid for the selected category
 *   - Sort options: most recent / alphabetical
 *   - Search bar
 *   - Each item: icon + name, click to open ItemDetailModal
 *   - Equippable items show "EQUIPAGGIA" button
 *   - All items show "METTI IN BORSA" button (if bag has space)
 *
 * Bag mode:
 *   - Shows up to BAG_MAX_ITEMS (10) slots
 *   - Each item: icon + name, click to open ItemDetailModal
 *   - Equippable items show "EQUIPAGGIA" button
 *   - All items show "METTI IN INVENTARIO" button
 */

interface SaoPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  mode: 'inventory' | 'bag';
  items: Item[];
  equipment: EquipmentState;
  onEquip: (item: Item) => void;
  onMoveToBag: (item: Item) => void;
  onMoveToInventory: (item: Item) => void;
}

type SortMode = 'recent' | 'alphabetical';

export default function SaoPanel({
  open,
  onClose,
  title,
  mode,
  items,
  equipment,
  onEquip,
  onMoveToBag,
  onMoveToInventory,
}: SaoPanelProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Inventory-specific state
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => play('popupPanel', 0.4), 300);
      return () => clearTimeout(t);
    }
  }, [open, play]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedItem) {
        play('dismissLauncher', 0.35);
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose, play, selectedItem]);

  // VR hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) {
      if (isHover) { setIsHover(false); setTransform(''); }
      return;
    }
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTransform(
      `perspective(1200px) rotateX(${-(py - 0.5) * 6}deg) rotateY(${(px - 0.5) * 6}deg) scale3d(1.01, 1.01, 1.01)`
    );
    setLightPos({ x: px * 100, y: py * 100 });
    if (!isHover) { setIsHover(true); play('click', 0.12); }
  };

  // Filter + sort items
  const displayItems = useMemo(() => {
    let list = items;
    if (mode === 'inventory') {
      if (activeCategory !== 'all') {
        list = list.filter((i) => i.category === activeCategory);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter((i) => i.name.toLowerCase().includes(q));
      }
    }
    const sorted = [...list];
    if (sortMode === 'recent') {
      sorted.sort((a, b) => b.acquiredAt - a.acquiredAt);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [items, mode, activeCategory, searchQuery, sortMode]);

  const isItemEquipped = (item: Item): boolean => {
    return Object.values(equipment).includes(item.id);
  };

  const canMoveToBag = (item: Item): boolean => {
    if (mode !== 'inventory') return false;
    const bagCount = items.filter((i) => i.location === 'bag').length;
    return item.location === 'inventory' && bagCount < BAG_MAX_ITEMS;
  };

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
            style={{
              background: 'rgba(2, 8, 20, 0.7)',
              backdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setIsHover(false); setTransform(''); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                opacity: { duration: 0.5, ease: 'easeOut' },
                scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(900px, 95vw)' }}
            >
              <div
                ref={cardRef}
                className="relative"
                style={{
                  maxHeight: '90vh',
                  overflow: 'hidden',
                  transform,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.18s ease-out',
                }}
              >
                {/* VR glow */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    opacity: isHover ? 1 : 0,
                    background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(92, 196, 240, 0.18) 0%, transparent 50%)`,
                    mixBlendMode: 'screen',
                    zIndex: 50,
                  }}
                />
                {/* Card body */}
                <div
                  className="relative w-full"
                  style={{
                    background: '#FBFBFB',
                    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                    boxShadow: isHover
                      ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.5)'
                      : '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)',
                    transition: 'box-shadow 0.25s',
                  }}
                >
                  <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />

                  {/* Close button */}
                  <button
                    onClick={() => { play('dismissLauncher', 0.35); onClose(); }}
                    onMouseEnter={() => play('click', 0.2)}
                    className="absolute top-3 right-3 z-10"
                    style={{ width: '28px', height: '28px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                    aria-label="Chiudi"
                  >
                    <img src="/sao/window/btn-red.svg" alt="Chiudi" className="w-full h-full" draggable={false} />
                  </button>

                  {/* Title */}
                  <div
                    className="px-8 pt-5 pb-3 text-center"
                    style={{ background: 'linear-gradient(180deg, #EFEFEF 0%, #DFDFDF 100%)', borderBottom: '1px solid #A8A8A8' }}
                  >
                    <h2
                      className="tracking-[0.4em]"
                      style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}
                    >
                      {title}
                    </h2>
                    {mode === 'bag' && (
                      <p
                        className="mt-1 tracking-[0.2em]"
                        style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}
                      >
                        {items.filter(i => i.location === 'bag').length} / {BAG_MAX_ITEMS} SLOT
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 sao-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {mode === 'inventory' && (
                      <>
                        {/* Search + Sort */}
                        <div className="flex gap-3 mb-4">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cerca oggetto..."
                            className="flex-1 px-3 py-1.5 outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.95)',
                              color: '#1a2a3a',
                              border: '1px solid rgba(43, 115, 179, 0.4)',
                              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                              fontWeight: 400,
                              fontSize: '0.75rem',
                              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                            }}
                          />
                          <div className="flex gap-1">
                            <SortButton active={sortMode === 'recent'} onClick={() => setSortMode('recent')} label="RECENTE" />
                            <SortButton active={sortMode === 'alphabetical'} onClick={() => setSortMode('alphabetical')} label="A-Z" />
                          </div>
                        </div>

                        {/* Category tabs */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          <CategoryTab
                            active={activeCategory === 'all'}
                            onClick={() => setActiveCategory('all')}
                            label="TUTTI"
                          />
                          {CATEGORIES.map((cat) => (
                            <CategoryTab
                              key={cat.key}
                              active={activeCategory === cat.key}
                              onClick={() => setActiveCategory(cat.key)}
                              label={cat.label}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Items grid */}
                    {displayItems.length === 0 ? (
                      <p
                        className="text-center py-8"
                        style={{ color: 'rgba(26,42,58,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem', letterSpacing: '0.2em' }}
                      >
                        NESSUN OGGETTO
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {displayItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            equipped={isItemEquipped(item)}
                            onInspect={() => { play('click', 0.3); setSelectedItem(item); }}
                            onEquip={() => { play('click', 0.4); onEquip(item); }}
                            onMove={mode === 'inventory' ? onMoveToBag : onMoveToInventory}
                            canMove={mode === 'inventory' ? canMoveToBag(item) : true}
                            moveLabel={mode === 'inventory' ? 'BORSA' : 'INV.'}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item detail modal */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}

/* ---------- Sub-components ---------- */

function SortButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5"
      style={{
        background: active ? 'rgba(43, 115, 179, 0.15)' : 'transparent',
        border: `1px solid ${active ? 'rgba(43, 115, 179, 0.5)' : 'rgba(43, 115, 179, 0.2)'}`,
        color: active ? '#2B73B3' : 'rgba(26,42,58,0.5)',
        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        fontWeight: 400,
        fontSize: '0.6rem',
        letterSpacing: '0.15em',
        cursor: 'pointer',
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
      }}
    >
      {label}
    </button>
  );
}

function CategoryTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1"
      style={{
        background: active ? '#2B73B3' : 'rgba(48, 48, 48, 0.08)',
        color: active ? '#FBFBFB' : 'rgba(26,42,58,0.6)',
        border: `1px solid ${active ? '#2B73B3' : 'rgba(43, 115, 179, 0.2)'}`,
        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        fontWeight: 400,
        fontSize: '0.6rem',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
        whiteSpace: 'nowrap',
      }}
    >
      {label.toUpperCase()}
    </button>
  );
}

function ItemCard({
  item,
  equipped,
  onInspect,
  onEquip,
  onMove,
  canMove,
  moveLabel,
}: {
  item: Item;
  equipped: boolean;
  onInspect: () => void;
  onEquip: () => void;
  onMove: (item: Item) => void;
  canMove: boolean;
  moveLabel: string;
}) {
  const { play } = useSaoSound();
  return (
    <div
      className="flex flex-col items-center p-2"
      style={{
        background: 'rgba(48, 48, 48, 0.06)',
        border: `1px solid ${equipped ? 'rgba(127, 197, 34, 0.5)' : 'rgba(43, 115, 179, 0.2)'}`,
        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
      }}
    >
      {/* Item icon — click to inspect (VR detail) */}
      <button
        onClick={onInspect}
        onMouseEnter={() => play('click', 0.1)}
        className="relative mb-1"
        style={{ width: '48px', height: '48px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
        title={item.name}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(43, 115, 179, 0.15)',
            borderRadius: '2px',
          }}
        >
          <img
            src={`/sao/equipment/${item.icon}`}
            alt={item.name}
            className="w-10 h-10"
            draggable={false}
            style={{ objectFit: 'contain' }}
          />
        </div>
        {equipped && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ background: '#7FC522', boxShadow: '0 0 6px rgba(127, 197, 34, 0.8)' }}
          />
        )}
      </button>

      {/* Item name — larger with stronger relief effect */}
      <p
        className="truncate w-full text-center mb-1"
        style={{
          color: '#1a2a3a',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          textShadow: '0 1px 0 rgba(255,255,255,0.9), 0 -1px 2px rgba(0,0,0,0.2), 0 0 4px rgba(43, 115, 179, 0.15)',
        }}
      >
        {item.name}
      </p>

      {/* Action buttons */}
      <div className="flex gap-1">
        {item.equippable && !equipped && (
          <button
            onClick={onEquip}
            className="px-1.5 py-0.5"
            style={{
              background: 'rgba(127, 197, 34, 0.15)',
              border: '1px solid rgba(127, 197, 34, 0.4)',
              color: '#3a7a0c',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.5rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
            }}
          >
            EQUIP
          </button>
        )}
        {equipped && (
          <span
            className="px-1.5 py-0.5"
            style={{
              background: 'rgba(127, 197, 34, 0.2)',
              border: '1px solid rgba(127, 197, 34, 0.5)',
              color: '#3a7a0c',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.5rem',
              letterSpacing: '0.05em',
              clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
            }}
          >
            EQUIP.
          </span>
        )}
        {canMove && !equipped && (
          <button
            onClick={() => onMove(item)}
            className="px-1.5 py-0.5"
            style={{
              background: 'rgba(43, 115, 179, 0.1)',
              border: '1px solid rgba(43, 115, 179, 0.3)',
              color: '#2B73B3',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.5rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
            }}
          >
            {moveLabel}
          </button>
        )}
      </div>
    </div>
  );
}
