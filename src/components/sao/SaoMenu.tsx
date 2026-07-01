'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Menu — top-right circular icon menu.
 *
 * Uses the SAO menu icons from the asset repo:
 *   - Man.svg / Man_on.svg   (character status)
 *   - Location.svg / Location_on.svg  (map)
 *   - Message.svg / Message_on.svg  (messages)
 *   - Config.svg / Config_on.svg  (settings)
 *
 * Each icon is rendered inside a circular white badge (as in the source SVGs)
 * with a hover state that swaps to the "_on" version (cyan-tinted).
 * Framer Motion handles the scale + glow animations.
 */

interface MenuItemDef {
  id: string;
  label: string;
  iconOff: string;
  iconOn: string;
  sound: 'popupMenu' | 'popupPanel' | 'popupMessage' | 'popupLauncher';
}

const MENU_ITEMS: MenuItemDef[] = [
  {
    id: 'character',
    label: 'Personaggio',
    iconOff: '/sao/menu/Man.svg',
    iconOn: '/sao/menu/Man_on.svg',
    sound: 'popupMenu',
  },
  {
    id: 'map',
    label: 'Mappa',
    iconOff: '/sao/menu/Location.svg',
    iconOn: '/sao/menu/Location_on.svg',
    sound: 'popupPanel',
  },
  {
    id: 'message',
    label: 'Messaggi',
    iconOff: '/sao/menu/Message.svg',
    iconOn: '/sao/menu/Message_on.svg',
    sound: 'popupMessage',
  },
  {
    id: 'config',
    label: 'Impostazioni',
    iconOff: '/sao/menu/Config.svg',
    iconOn: '/sao/menu/Config_on.svg',
    sound: 'popupLauncher',
  },
];

interface SaoMenuProps {
  onItemClick?: (id: string) => void;
}

export default function SaoMenu({ onItemClick }: SaoMenuProps) {
  const { play } = useSaoSound();
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    play('popupPanel', 0.25);
  }, [play]);

  return (
    <motion.div
      className="fixed top-4 right-4 z-30 flex flex-col gap-2.5 select-none"
      initial={{ opacity: 0, x: 30, y: -10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
    >
      {MENU_ITEMS.map((item, idx) => {
        const isHovered = hovered === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            aria-label={item.label}
            onClick={() => {
              play('click', 0.5);
              onItemClick?.(item.id);
            }}
            onMouseEnter={() => {
              setHovered(item.id);
              play(item.sound, 0.25);
            }}
            onMouseLeave={() => setHovered(null)}
            className="relative block"
            style={{ width: '48px', height: '48px' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + idx * 0.08, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
          >
            {/* Glow ring behind icon on hover */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1.3 : 1,
              }}
              transition={{ duration: 0.25 }}
              style={{
                boxShadow: '0 0 20px rgba(92, 196, 240, 0.9), 0 0 40px rgba(43, 115, 179, 0.6)',
                background: 'radial-gradient(circle, rgba(92,196,240,0.4) 0%, transparent 70%)',
              }}
              aria-hidden
            />

            {/* Rotating outer ring on hover (VR feel) */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none border"
              animate={{
                rotate: isHovered ? 360 : 0,
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1.15 : 1,
              }}
              transition={{
                rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 0.25 },
                scale: { duration: 0.25 },
              }}
              style={{
                borderColor: 'rgba(92, 196, 240, 0.8)',
                borderWidth: '1px',
                borderStyle: 'dashed',
              }}
              aria-hidden
            />

            {/* The icon — swaps between off/on based on hover state */}
            <motion.div
              className="relative w-full h-full"
              animate={{
                filter: isHovered
                  ? 'drop-shadow(0 0 10px rgba(92, 196, 240, 1))'
                  : 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.6))',
              }}
              transition={{ duration: 0.25 }}
            >
              {/* Off state icon (default) */}
              <img
                src={item.iconOff}
                alt=""
                className="absolute inset-0 w-full h-full transition-opacity duration-200"
                style={{ opacity: isHovered ? 0 : 1 }}
                draggable={false}
              />
              {/* On state icon (hover) — cyan version */}
              <img
                src={item.iconOn}
                alt={item.label}
                className="absolute inset-0 w-full h-full transition-opacity duration-200"
                style={{ opacity: isHovered ? 1 : 0 }}
                draggable={false}
              />
            </motion.div>

            {/* Tooltip label on hover */}
            <motion.div
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 pointer-events-none whitespace-nowrap"
              initial={{ opacity: 0, x: 8 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                x: isHovered ? 0 : 8,
              }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(8, 12, 20, 0.85)',
                border: '1px solid rgba(43, 115, 179, 0.6)',
                clipPath:
                  'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                color: '#5CC4F0',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textShadow: '0 0 8px rgba(92, 196, 240, 0.6)',
              }}
            >
              {item.label.toUpperCase()}
            </motion.div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
