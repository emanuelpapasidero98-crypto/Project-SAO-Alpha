'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { Item } from '@/lib/sao-inventory-types';
import { CATEGORIES } from '@/lib/sao-inventory-types';

/**
 * SAO Item Detail Modal — VR-style item inspection.
 *
 * When the user clicks an item icon, this modal opens:
 *   - Background dims (rgba(2,8,20,0.85) + backdrop blur)
 *   - The item icon appears CENTERED, ENLARGED, and ROTATING (3D spin)
 *   - The item name + category + description appear below/beside it
 *   - Click anywhere (or press ESC) to close
 *
 * Animation inspired by PanelView.qml:
 *   - opacity 0→1 (500ms) + scale 0.6→1 (400ms OutQuart)
 *   - The icon rotates continuously (8s per revolution, infinite)
 *
 * Assets: only the item icon PNG from /sao/equipment/ (GitHub repo).
 * Font: SAO UI. Colors: canonical SAO palette.
 */

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  // VR hover effect: 3D tilt + parallax following the mouse (same as CharacterPanel)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) {
      if (isHover) { setIsHover(false); setTilt(''); }
      return;
    }
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt(
      `perspective(1200px) rotateX(${-(py - 0.5) * 8}deg) rotateY(${(px - 0.5) * 8}deg) scale3d(1.015, 1.015, 1.015)`
    );
    setLightPos({ x: px * 100, y: py * 100 });
    if (!isHover) { setIsHover(true); }
  };

  const handleMouseLeave = () => {
    setIsHover(false);
    setTilt('');
  };

  useEffect(() => {
    if (item) {
      play('popupPanel', 0.4);
    }
  }, [item, play]);

  useEffect(() => {
    if (!item) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('dismissLauncher', 0.35);
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [item, onClose, play]);

  const categoryMeta = item
    ? CATEGORIES.find((c) => c.key === item.category)
    : null;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(2, 8, 20, 0.85)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => {
            play('dismissLauncher', 0.35);
            onClose();
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{
              opacity: { duration: 0.5, ease: 'easeOut' },
              scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(500px, 95vw)' }}
          >
            {/* Inner wrapper for VR hover tilt (separate from Framer Motion scale) */}
            <div
              ref={cardRef}
              className="relative"
              style={{
                transform: tilt,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.18s ease-out',
              }}
            >
              {/* VR cursor-following glow overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  opacity: isHover ? 1 : 0,
                  background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(92, 196, 240, 0.18) 0%, transparent 50%)`,
                  mixBlendMode: 'screen',
                  zIndex: 50,
                }}
                aria-hidden
              />
            {/* Card body — SAO style white with angular clip-path */}
            <div
              className="relative"
              style={{
                background: '#FBFBFB',
                clipPath:
                  'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                boxShadow: isHover
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.5)'
                  : '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.4)',
                transition: 'box-shadow 0.25s',
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)',
                }}
              />

              {/* Close button */}
              <button
                onClick={() => {
                  play('dismissLauncher', 0.35);
                  onClose();
                }}
                onMouseEnter={() => play('click', 0.2)}
                className="absolute top-3 right-3 z-10"
                style={{
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
                aria-label="Chiudi"
              >
                <img
                  src="/sao/window/btn-red.svg"
                  alt="Chiudi"
                  className="w-full h-full"
                  draggable={false}
                />
              </button>

              {/* === Rotating item icon (VR inspection) === */}
              <div
                className="flex items-center justify-center"
                style={{
                  height: '220px',
                  background:
                    'linear-gradient(180deg, #EFEFEF 0%, #D6D6D6 100%)',
                  borderBottom: '1px solid #A8A8A8',
                }}
              >
                <motion.div
                  style={{
                    width: '140px',
                    height: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  animate={{ rotateY: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <img
                    src={`/sao/equipment/${item.icon}`}
                    alt={item.name}
                    className="w-full h-full"
                    draggable={false}
                    style={{
                      objectFit: 'contain',
                      filter:
                        'drop-shadow(0 8px 20px rgba(0,0,0,0.4)) drop-shadow(0 0 15px rgba(43, 115, 179, 0.3))',
                    }}
                  />
                </motion.div>
              </div>

              {/* === Item info === */}
              <div className="p-6">
                {/* Category label */}
                <p
                  className="tracking-[0.25em] mb-1"
                  style={{
                    color: 'rgba(26, 42, 58, 0.5)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '0.65rem',
                  }}
                >
                  {categoryMeta?.label.toUpperCase()}
                </p>

                {/* Item name — bold with relief */}
                <h3
                  className="tracking-[0.15em] mb-3"
                  style={{
                    color: '#1a2a3a',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '1.3rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                  }}
                >
                  {item.name}
                </h3>

                {/* Description — larger, more readable */}
                <p
                  className="leading-relaxed mb-4"
                  style={{
                    color: '#1a2a3a',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  {item.description}
                </p>

                {/* Stat bonuses (if any) */}
                {item.statBonuses && Object.keys(item.statBonuses).length > 0 && (
                  <div className="mb-4">
                    <p
                      className="tracking-[0.25em] mb-2"
                      style={{
                        color: 'rgba(26, 42, 58, 0.5)',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400,
                        fontSize: '0.65rem',
                      }}
                    >
                      BONUS STATISTICHE
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.statBonuses).map(([stat, val]) => (
                        <div
                          key={stat}
                          className="px-2 py-1"
                          style={{
                            background: 'rgba(48, 48, 48, 0.08)',
                            border: '1px solid rgba(43, 115, 179, 0.3)',
                            clipPath:
                              'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                            color: '#2B73B3',
                            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                            fontWeight: 400,
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {stat.toUpperCase()} +{val}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equip info */}
                <div
                  className="px-3 py-2"
                  style={{
                    background: item.equippable
                      ? 'rgba(127, 197, 34, 0.1)'
                      : 'rgba(190, 33, 86, 0.08)',
                    border: `1px solid ${item.equippable ? 'rgba(127, 197, 34, 0.3)' : 'rgba(190, 33, 86, 0.2)'}`,
                    clipPath:
                      'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  }}
                >
                  <p
                    style={{
                      color: item.equippable ? '#3a7a0c' : '#BE2156',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.65rem',
                      letterSpacing: '0.15em',
                    }}
                  >
                    {item.equippable
                      ? item.handedness === 'two-handed'
                        ? 'EQUIPAGGIABILE — ARMA A DUE MANI (niente scudo)'
                        : 'EQUIPAGGIABILE'
                      : 'NON EQUIPAGGIABILE — SOLO TRASPORTABILE'}
                  </p>
                </div>
              </div>

              {/* Bottom accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)',
                }}
              />
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
