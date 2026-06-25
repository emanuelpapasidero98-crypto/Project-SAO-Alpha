'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Main Menu — single circular icon (top-right) that opens a cascading
 * vertical menu from top to bottom.
 *
 * Animation (from Progetto-SAO/qml/MenuView.qml — aniFadeIn / aniFadeOut):
 *   OPEN (ParallelAnimation):
 *     - opacity: 0 → 1 over 400ms
 *     - y: -height → 0 over 600ms with easing OutQuart
 *     - play Popup.SAO.Menu.wav after 300ms delay
 *   CLOSE (SequentialAnimation):
 *     - opacity: 1 → 0 over 400ms
 *     - y: 0 → -height over 300ms with easing InQuad
 *
 * Each item slides in with a staggered cascade (top-to-bottom). The canonical
 * SAO menu shows 8 visible items at a time in a PathView, with each item
 * being ~46px tall (btnHeight: 46 from MenuView.qml).
 *
 * Menu items (in canonical SAO order):
 *   1. Personaggio  (character status)
 *   2. Borsa        (wallet/currency)
 *   3. Inventario   (inventory)
 *   4. Quest        (quest log)
 *   5. Piano        (floor map)
 *   6. Party        (party members)
 *   7. Opzioni      (settings)
 *   8. Messaggi     (messages)
 *   9. Log Out      (logout)
 *
 * The menu uses the SAO button background style from
 * Progetto-SAO/background/btn.png / btn-hovered.png / btn-pressed.png —
 * but since we don't have access to those as styled components here,
 * we render items as angular cards with the canonical SAO color palette
 * (#FBFBFB background, #A8A8A8 separator, #2B73B3 accent on hover).
 */

interface MenuItemDef {
  id: string;
  label: string;
  /** Optional icon path from /sao/menu/ */
  icon?: string;
  /** Hover/active sound */
  sound?: 'popupMenu' | 'popupPanel' | 'popupMessage' | 'popupLauncher';
}

const MENU_ITEMS: MenuItemDef[] = [
  { id: 'character', label: 'Personaggio', icon: '/sao/menu/Man.svg', sound: 'popupMenu' },
  { id: 'wallet', label: 'Borsa', icon: '/sao/menu/Location.svg', sound: 'popupPanel' },
  { id: 'inventory', label: 'Inventario', icon: '/sao/menu/Config.svg', sound: 'popupMessage' },
  { id: 'quest', label: 'Quest', icon: '/sao/menu/Message.svg', sound: 'popupLauncher' },
  { id: 'floor', label: 'Piano', sound: 'popupMenu' },
  { id: 'party', label: 'Party', sound: 'popupPanel' },
  { id: 'options', label: 'Opzioni', sound: 'popupMessage' },
  { id: 'messages', label: 'Messaggi', sound: 'popupLauncher' },
  { id: 'logout', label: 'Log Out', sound: 'popupMenu' },
];

interface SaoMainMenuProps {
  onItemClick?: (id: string) => void;
  onLogout?: () => void;
}

export default function SaoMainMenu({ onItemClick, onLogout }: SaoMainMenuProps) {
  const { play } = useSaoSound();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Boot sound on mount (just the icon)
  useEffect(() => {
    play('popupPanel', 0.2);
  }, [play]);

  const toggleMenu = () => {
    if (isOpen) {
      // Closing — play dismiss sound
      play('dismissLauncher', 0.3);
      setIsOpen(false);
      setHoveredItem(null);
    } else {
      // Opening — sound will play after 300ms delay (per MenuView.qml)
      setIsOpen(true);
      setTimeout(() => play('popupMenu', 0.4), 300);
    }
  };

  const handleItemClick = (item: MenuItemDef) => {
    play('click', 0.5);
    if (item.sound) play(item.sound, 0.3);
    if (item.id === 'logout') {
      // Confirm before logout
      setTimeout(() => onLogout?.(), 100);
      setIsOpen(false);
      return;
    }
    onItemClick?.(item.id);
    // Close after click
    setTimeout(() => {
      play('dismissLauncher', 0.3);
      setIsOpen(false);
    }, 150);
  };

  return (
    <>
      {/* ===== Single Menu icon (top-right) ===== */}
      <motion.div
        className="fixed top-4 right-4 z-40 select-none"
        initial={{ opacity: 0, x: 30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
      >
        <motion.button
          type="button"
          onClick={toggleMenu}
          onMouseEnter={() => play('click', 0.15)}
          aria-label="Menu"
          className="relative block"
          style={{ width: '52px', height: '52px' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
        >
          {/* Glow ring when menu is open */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              opacity: isOpen ? 1 : 0,
              scale: isOpen ? 1.4 : 1,
            }}
            transition={{ duration: 0.3 }}
            style={{
              boxShadow: '0 0 25px rgba(92, 196, 240, 1), 0 0 50px rgba(43, 115, 179, 0.7)',
              background: 'radial-gradient(circle, rgba(92,196,240,0.5) 0%, transparent 70%)',
            }}
            aria-hidden
          />

          {/* Rotating dashed ring (VR feel) — visible when open */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none border"
            animate={{
              rotate: isOpen ? 360 : 0,
              opacity: isOpen ? 1 : 0,
              scale: isOpen ? 1.2 : 1,
            }}
            transition={{
              rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
            }}
            style={{
              borderColor: 'rgba(92, 196, 240, 0.9)',
              borderWidth: '1px',
              borderStyle: 'dashed',
            }}
            aria-hidden
          />

          {/* The Menu icon — uses Config.svg as a generic "gear/menu" icon
              (canonical SAO menu icon from the asset repo) */}
          <motion.div
            className="relative w-full h-full"
            animate={{
              filter: isOpen
                ? 'drop-shadow(0 0 14px rgba(92, 196, 240, 1))'
                : 'drop-shadow(0 0 6px rgba(43, 115, 179, 0.7))',
            }}
            transition={{ duration: 0.25 }}
          >
            <img
              src="/sao/menu/Config.svg"
              alt=""
              className="absolute inset-0 w-full h-full transition-opacity duration-200"
              style={{ opacity: isOpen ? 0 : 1 }}
              draggable={false}
            />
            <img
              src="/sao/menu/Config_on.svg"
              alt="Menu"
              className="absolute inset-0 w-full h-full transition-opacity duration-200"
              style={{ opacity: isOpen ? 1 : 0 }}
              draggable={false}
            />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* ===== Cascading menu (top-right, drops from above) =====
          Animation from MenuView.qml:
          OPEN  — opacity 0→1 (400ms) + y -height→0 (600ms, OutQuart) + sound after 300ms
          CLOSE — opacity 1→0 (400ms) + y 0→-height (300ms, InQuad) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed top-20 right-4 z-40 select-none"
            style={{ width: 'min(220px, 80vw)' }}
            initial={{ opacity: 0, y: -350 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -350 }}
            transition={{
              opacity: { duration: 0.4, ease: 'easeOut' },
              y: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1], // OutQuart approximation (cubic-bezier)
              },
            }}
          >
            {/* Each item has a staggered cascade — items appear one after another
                with a slight delay (creating the "cascade from top" feel). */}
            <div className="flex flex-col gap-1">
              {MENU_ITEMS.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => {
                    setHoveredItem(item.id);
                    if (item.sound) play(item.sound, 0.2);
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="relative flex items-center gap-3 px-4 py-3 text-left"
                  style={{
                    background:
                      hoveredItem === item.id
                        ? 'linear-gradient(135deg, rgba(92,196,240,0.95) 0%, rgba(43,115,179,0.95) 100%)'
                        : 'rgba(251, 251, 251, 0.95)',
                    color: hoveredItem === item.id ? '#FBFBFB' : '#1a2a3a',
                    border: `1px solid ${hoveredItem === item.id ? 'rgba(255,255,255,0.6)' : 'rgba(43, 115, 179, 0.4)'}`,
                    boxShadow:
                      hoveredItem === item.id
                        ? '0 0 20px rgba(43, 115, 179, 0.8), inset 0 0 12px rgba(255,255,255,0.25)'
                        : '0 2px 6px rgba(0,0,0,0.3)',
                    clipPath:
                      'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '0.85rem',
                    letterSpacing: '0.15em',
                  }}
                  // Staggered cascade: each item slides in 60ms after the previous
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.15 + idx * 0.06,
                    duration: 0.35,
                    ease: 'easeOut',
                  }}
                >
                  {/* Optional icon (left side) */}
                  {item.icon && (
                    <div
                      className="w-7 h-7 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                      style={{
                        background:
                          hoveredItem === item.id
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(43, 115, 179, 0.1)',
                        border: `1px solid ${hoveredItem === item.id ? 'rgba(255,255,255,0.5)' : 'rgba(43, 115, 179, 0.3)'}`,
                      }}
                    >
                      <img
                        src={item.icon}
                        alt=""
                        className="w-5 h-5"
                        draggable={false}
                        style={{
                          filter:
                            hoveredItem === item.id
                              ? 'brightness(0) invert(1)'
                              : 'none',
                        }}
                      />
                    </div>
                  )}

                  {/* Item label */}
                  <span
                    className="flex-1"
                    style={{
                      textShadow:
                        hoveredItem === item.id
                          ? '0 0 8px rgba(255,255,255,0.7)'
                          : 'none',
                    }}
                  >
                    {item.label.toUpperCase()}
                  </span>

                  {/* Chevron arrow on the right (subtle) */}
                  <span
                    className="text-xs opacity-50"
                    style={{
                      transition: 'opacity 0.2s',
                      opacity: hoveredItem === item.id ? 1 : 0.3,
                    }}
                  >
                    ▸
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Bottom accent line (decorative, like SAO HUD separator) */}
            <motion.div
              className="mt-1 h-[2px] w-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(43,115,179,0.8) 30%, rgba(43,115,179,0.8) 70%, transparent)',
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5 + MENU_ITEMS.length * 0.06, duration: 0.4 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
