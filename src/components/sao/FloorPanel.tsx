'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Floor Panel — shown when the user clicks "Piano" in the menu.
 *
 * Flow:
 *   1. Floor selection: shows a large clickable image of Floor 1 (Aincrad.png)
 *      Only Floor 1 is available for now.
 *   2. Zone selection: shows the zones available on the selected floor.
 *      - "Città degli Inizi" (city zone — uses Città dell'inizio.png)
 *      - "Pianure dell'inizio" (explorable zone — uses Aincrad.png as bg)
 *
 * Same card style as CharacterPanel/InventoryPanel:
 *   - White SAO card with angular clip-path corners
 *   - PanelView.qml animation (opacity + scale, OutQuart)
 *   - VR hover effect (3D tilt + cursor-following glow)
 *   - Red X close button
 *
 * Assets (SOLO dai repo GitHub):
 *   - Aincrad.png (floor 1 image + plains zone bg)
 *   - Città dell'inizio.png (city zone image)
 *   - Font SAO UI, colors canonici SAO
 */

interface FloorPanelProps {
  open: boolean;
  onClose: () => void;
  onZoneSelect?: (zoneId: string) => void;
}

interface Zone {
  id: string;
  name: string;
  description: string;
  image: string;
  type: 'city' | 'explore';
}

const FLOOR_1_ZONES: Zone[] = [
  {
    id: 'city-of-beginnings',
    name: 'Città degli Inizi',
    description: 'La città principale del Piano 1 di Aincrad. Qui puoi riposare, comprare oggetti e accettare quest dai NPC.',
    image: '/sao/backgrounds/Città dell\'inizio.png',
    type: 'city',
  },
  {
    id: 'starting-plains',
    name: 'Pianure dell\'inizio',
    description: 'Ampie pianure appena fuori dalla città. Ideali per i primi combattimenti e per esplorare. Mostri di basso livello.',
    image: '/sao/backgrounds/Pianure dell\'inizio.svg',
    type: 'explore',
  },
];

export default function FloorPanel({ open, onClose, onZoneSelect }: FloorPanelProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);
  const [view, setView] = useState<'floors' | 'zones'>('floors');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => play('popupPanel', 0.4), 300);
      return () => clearTimeout(t);
    }
  }, [open, play]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'zones') {
          play('dismissLauncher', 0.3);
          setView('floors');
        } else {
          play('dismissLauncher', 0.35);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose, play, view]);

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
    if (!isHover) { setIsHover(true); }
  };

  const handleMouseLeave = () => {
    setIsHover(false);
    setTransform('');
  };

  const handleFloorClick = () => {
    play('click', 0.5);
    setView('zones');
  };

  const handleZoneClick = (zone: Zone) => {
    play('click', 0.5);
    setSelectedZone(zone.id);
    onZoneSelect?.(zone.id);
  };

  const handleBack = () => {
    play('dismissLauncher', 0.3);
    if (view === 'zones') setView('floors');
    else onClose();
  };

  return (
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
          onMouseLeave={handleMouseLeave}
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
            style={{ width: 'min(1100px, 95vw)' }}
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
                  onClick={handleBack}
                  className="absolute top-3 left-3 z-10"
                  style={{
                    color: 'rgba(26, 42, 58, 0.5)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '0.65rem',
                    letterSpacing: '0.2em',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 8px',
                  }}
                >
                  {view === 'zones' ? '◀ PIANI' : 'CHIUDI'}
                </button>

                {/* Close X button */}
                <button
                  onClick={() => { play('dismissLauncher', 0.35); onClose(); }}
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
                    {view === 'floors' ? 'SELEZIONA PIANO' : 'ZONE DEL PIANO 1'}
                  </h2>
                </div>

                {/* Content */}
                <div className="p-8 sao-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {view === 'floors' && (
                    <>
                      {/* Floor 1 — large clickable image */}
                      <motion.div
                        onClick={handleFloorClick}
                        className="relative cursor-pointer overflow-hidden group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        style={{
                          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                          border: '2px solid rgba(43, 115, 179, 0.5)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Floor image */}
                        <div className="relative" style={{ aspectRatio: '16 / 9' }}>
                          <img
                            src="/sao/backgrounds/Aincrad.png"
                            alt="Piano 1 — Aincrad"
                            className="w-full h-full object-cover"
                            draggable={false}
                            style={{ filter: 'brightness(0.7)' }}
                          />
                          {/* Overlay gradient */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(180deg, transparent 40%, rgba(2,8,20,0.8) 100%)',
                            }}
                          />
                          {/* Floor info */}
                          <div className="absolute bottom-0 left-0 right-0 p-5">
                            <p
                              className="tracking-[0.3em] mb-1"
                              style={{
                                color: '#5CC4F0',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '0.7rem',
                                textShadow: '0 0 8px rgba(92, 196, 240, 0.6)',
                              }}
                            >
                              DISPONIBILE
                            </p>
                            <h3
                              className="tracking-[0.2em]"
                              style={{
                                color: '#FBFBFB',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '1.5rem',
                                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                              }}
                            >
                              PIANO 1 — AINCRAD
                            </h3>
                            <p
                              className="mt-1"
                              style={{
                                color: 'rgba(251, 251, 251, 0.6)',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '0.7rem',
                                letterSpacing: '0.1em',
                              }}
                            >
                              Clicca per selezionare le zone
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Locked floors (placeholder for future) */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {[2, 3, 4].map((floor) => (
                          <div
                            key={floor}
                            className="flex flex-col items-center justify-center p-4"
                            style={{
                              background: 'rgba(48, 48, 48, 0.08)',
                              border: '1px solid rgba(190, 33, 86, 0.2)',
                              clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                              opacity: 0.5,
                            }}
                          >
                            <span
                              style={{
                                color: 'rgba(190, 33, 86, 0.5)',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '0.6rem',
                                letterSpacing: '0.2em',
                              }}
                            >
                              BLOCCATO
                            </span>
                            <span
                              className="mt-1"
                              style={{
                                color: 'rgba(26, 42, 58, 0.3)',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '0.8rem',
                              }}
                            >
                              PIANO {floor}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {view === 'zones' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {FLOOR_1_ZONES.map((zone, idx) => (
                        <motion.div
                          key={zone.id}
                          onClick={() => handleZoneClick(zone)}
                          className="relative cursor-pointer overflow-hidden group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.15 + idx * 0.1 }}
                          style={{
                            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                            border: `2px solid ${selectedZone === zone.id ? 'rgba(127, 197, 34, 0.6)' : 'rgba(43, 115, 179, 0.4)'}`,
                            boxShadow: selectedZone === zone.id
                              ? '0 4px 20px rgba(127, 197, 34, 0.3)'
                              : '0 4px 12px rgba(0,0,0,0.2)',
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Zone image */}
                          <div className="relative" style={{ aspectRatio: '4 / 3' }}>
                            <img
                              src={zone.image}
                              alt={zone.name}
                              className="w-full h-full object-cover"
                              draggable={false}
                              style={{ filter: 'brightness(0.7)' }}
                            />
                            <div
                              className="absolute inset-0"
                              style={{
                                background: 'linear-gradient(180deg, transparent 40%, rgba(2,8,20,0.85) 100%)',
                              }}
                            />
                            {/* Zone type badge */}
                            <div
                              className="absolute top-2 right-2 px-2 py-0.5"
                              style={{
                                background: zone.type === 'city'
                                  ? 'rgba(43, 115, 179, 0.8)'
                                  : 'rgba(235, 166, 1, 0.8)',
                                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                              }}
                            >
                              <span
                                style={{
                                  color: '#FBFBFB',
                                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                  fontWeight: 400,
                                  fontSize: '0.5rem',
                                  letterSpacing: '0.15em',
                                }}
                              >
                                {zone.type === 'city' ? 'CITTÀ' : 'ESPLORA'}
                              </span>
                            </div>
                            {/* Zone info */}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <h4
                                className="tracking-[0.15em] mb-1"
                                style={{
                                  color: '#FBFBFB',
                                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                  fontWeight: 700,
                                  fontSize: '1rem',
                                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                                }}
                              >
                                {zone.name}
                              </h4>
                              <p
                                style={{
                                  color: 'rgba(251, 251, 251, 0.6)',
                                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                  fontWeight: 400,
                                  fontSize: '0.6rem',
                                  letterSpacing: '0.05em',
                                  lineHeight: 1.4,
                                }}
                              >
                                {zone.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>
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
  );
}
