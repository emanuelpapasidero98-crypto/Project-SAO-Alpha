'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import SaoHUD, { type BarValue } from './SaoHUD';
import SaoMenu from './SaoMenu';

interface GameScreenProps {
  playerName: string;
  onExit?: () => void;
}

/**
 * SAO Game Screen — the actual in-game UI.
 *
 * Layout:
 *   - Full-screen background = Aincrad.png (the floating iron city)
 *   - Top-left: SaoHUD (HP / MP / Energy bars + LV badge)
 *   - Top-right: SaoMenu (4 circular icons)
 *   - Bottom-left: party member indicator (small)
 *   - Bottom-center: notification window (transient SAO-style message)
 *   - Bottom-right: equipment/skill quick-slot row (placeholder for next phase)
 *
 * All visual assets come from the asset-gioco-di-SAO repo:
 *   - Background: Aincrad.png
 *   - HUD bars: rebuilt from "Pezzi barra HP, Mana e Energia" SVGs
 *   - Menu icons: 1_Menu-1/*.svg
 *   - Notification window: built referencing "Finestra notifiche SAO" SVGs
 *
 * Audio: ambient sounds triggered on mount, click feedback on every
 * interaction, alert sound when notification appears.
 */

interface GameNotification {
  id: number;
  title: string;
  body: string;
  kind: 'system' | 'message' | 'alert' | 'present';
}

const NOTIF_KIND_COLORS: Record<GameNotification['kind'], string> = {
  system: '#2B73B3',
  message: '#5CC4F0',
  alert: '#BE2156',
  present: '#EBA601',
};

const NOTIF_KIND_SOUND = {
  system: 'system' as const,
  message: 'message' as const,
  alert: 'alert' as const,
  present: 'present' as const,
};

export default function GameScreen({ playerName, onExit }: GameScreenProps) {
  const { play } = useSaoSound();
  const [hp, setHp] = useState<BarValue>({ current: 240, max: 300 });
  const [mp, setMp] = useState<BarValue>({ current: 80, max: 120 });
  const [energy, setEnergy] = useState<BarValue>({ current: 180, max: 200 });
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Boot sequence
  useEffect(() => {
    play('popupPanel', 0.4);
    const t1 = setTimeout(() => {
      play('welcome', 0.4);
      pushNotification({
        id: Date.now(),
        title: 'SISTEMA',
        body: `Benvenuto ad Aincrad, ${playerName}. Sei al Floor 1.`,
        kind: 'system',
      });
    }, 600);
    const t2 = setTimeout(() => {
      pushNotification({
        id: Date.now() + 1,
        title: 'TUTORIAL',
        body: 'Esplora la città di inizi e parla con gli NPC per la tua prima missione.',
        kind: 'message',
      });
    }, 3500);
    const t3 = setTimeout(() => setShowWelcome(false), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const pushNotification = (n: GameNotification) => {
    setNotifications((prev) => [...prev, n]);
    play(NOTIF_KIND_SOUND[n.kind], 0.4);
    // Auto-dismiss after 5s
    setTimeout(() => {
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      play('dismissMessage', 0.25);
    }, 5000);
  };

  const handleMenuClick = (id: string) => {
    if (id === 'character') {
      pushNotification({
        id: Date.now(),
        title: 'PERSONAGGIO',
        body: `${playerName} — Lv.1  HP ${hp.current}/${hp.max}  MP ${mp.current}/${mp.max}`,
        kind: 'system',
      });
    } else if (id === 'map') {
      pushNotification({
        id: Date.now(),
        title: 'MAPPA',
        body: 'Aincrad — Floor 1: Città degli Inizi',
        kind: 'message',
      });
    } else if (id === 'message') {
      pushNotification({
        id: Date.now(),
        title: 'MESSAGGI',
        body: 'Nessun nuovo messaggio.',
        kind: 'message',
      });
    } else if (id === 'config') {
      pushNotification({
        id: Date.now(),
        title: 'IMPOSTAZIONI',
        body: 'Sistema NerveGear v1.100 — funzionamento ottimale.',
        kind: 'present',
      });
    }
  };

  // Demo: simulate HP drain / regen cycle to showcase the bar animations
  useEffect(() => {
    const interval = setInterval(() => {
      setHp((prev) => {
        const next = prev.current - 5;
        if (next <= 30) {
          return { ...prev, current: prev.max }; // reset on low
        }
        return { ...prev, current: next };
      });
      setMp((prev) => ({
        ...prev,
        current: Math.min(prev.max, prev.current + 3),
      }));
      setEnergy((prev) => ({
        ...prev,
        current: Math.max(0, prev.current - 1),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* ===== Background: Aincrad ===== */}
      <div className="absolute inset-0 -z-20">
        <img
          src="/sao/backgrounds/Aincrad.png"
          alt="Aincrad"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.6) saturate(1.1)' }}
          draggable={false}
        />
        {/* Dark gradient overlay for readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,8,20,0.7) 0%, rgba(2,8,20,0.2) 30%, rgba(2,8,20,0.2) 70%, rgba(2,8,20,0.8) 100%)',
          }}
        />
      </div>

      {/* VR overlays (scanlines, vignette) inherited from parent page */}

      {/* ===== HUD (top-left) ===== */}
      <SaoHUD
        hp={hp}
        mp={mp}
        energy={energy}
        level={1}
        playerName={playerName}
      />

      {/* ===== Menu (top-right) ===== */}
      <SaoMenu onItemClick={handleMenuClick} />

      {/* ===== Welcome splash (brief) ===== */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.p
                className="tracking-[0.4em]"
                style={{
                  fontSize: 'clamp(1rem, 3vw, 2rem)',
                  color: '#FBFBFB',
                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  fontWeight: 400,
                  textShadow:
                    '0 0 20px rgba(43, 115, 179, 0.9), 0 0 40px rgba(43, 115, 179, 0.5)',
                }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                FLOOR 1 — AINCRAD
              </motion.p>
              <motion.p
                className="tracking-[0.3em] mt-2 text-sm"
                style={{
                  color: '#5CC4F0',
                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  fontWeight: 400,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                BENVENUTO, {playerName.toUpperCase()}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Notifications (bottom-left, stacked) ===== */}
      <div className="fixed bottom-4 left-4 z-30 flex flex-col gap-2 max-w-[340px]">
        <AnimatePresence>
          {notifications.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </AnimatePresence>
      </div>

      {/* ===== Bottom-right: equipment quick-slot (placeholder for next phase) ===== */}
      <motion.div
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{
          background: 'rgba(8, 12, 20, 0.6)',
          border: '1px solid rgba(43, 115, 179, 0.5)',
          clipPath:
            'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          className="text-[0.65rem] tracking-[0.25em] mr-2 pr-2"
          style={{
            color: '#5CC4F0',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            borderRight: '1px solid rgba(43, 115, 179, 0.4)',
          }}
        >
          SKILL
        </span>
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-8 h-8 flex items-center justify-center"
            style={{
              background: 'rgba(43, 115, 179, 0.15)',
              border: '1px solid rgba(43, 115, 179, 0.4)',
              clipPath:
                'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: '0 0 12px rgba(92, 196, 240, 0.7)',
            }}
          >
            <span
              className="text-[0.65rem]"
              style={{
                color: 'rgba(92, 196, 240, 0.6)',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
              }}
            >
              {i}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== Bottom-center: crosshair (VR interaction hint) ===== */}
      <motion.div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div
          className="w-6 h-6 rounded-full border"
          style={{ borderColor: 'rgba(92, 196, 240, 0.6)' }}
        />
      </motion.div>

      {/* ===== Exit button (top-center, small) ===== */}
      <motion.button
        onClick={() => {
          play('dismissLauncher', 0.4);
          onExit?.();
        }}
        onMouseEnter={() => play('click', 0.2)}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 text-[0.65rem] tracking-[0.3em]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          color: 'rgba(251, 251, 251, 0.6)',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          background: 'rgba(8, 12, 20, 0.55)',
          border: '1px solid rgba(251, 251, 251, 0.2)',
          clipPath:
            'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        }}
      >
        ESCI
      </motion.button>
    </motion.div>
  );
}

/* ---------- Sub-component: notification card ---------- */

function NotificationCard({ notification }: { notification: GameNotification }) {
  const color = NOTIF_KIND_COLORS[notification.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.9 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden"
      style={{
        background: 'rgba(251, 251, 251, 0.95)',
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        boxShadow: `0 0 20px ${color}55, 0 4px 12px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color} 30%, ${color} 70%, transparent)`,
        }}
      />

      <div className="px-4 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          {/* Small square indicator */}
          <div
            className="w-2 h-2"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}`,
              clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
            }}
          />
          <span
            className="text-[0.65rem] tracking-[0.3em]"
            style={{
              color,
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
            }}
          >
            {notification.title}
          </span>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{
            color: '#1a2a3a',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
          }}
        >
          {notification.body}
        </p>
      </div>

      {/* Bottom accent bar */}
      <div
        className="h-0.5 w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}66 50%, transparent)`,
        }}
      />
    </motion.div>
  );
}
