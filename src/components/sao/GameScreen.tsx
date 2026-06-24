'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import SaoHUD, { type BarValue } from './SaoHUD';
import SaoMainMenu from './SaoMainMenu';
import SaoNotificationWindow, {
  type SaoNotificationData,
} from './SaoNotificationWindow';

interface GameScreenProps {
  playerName: string;
  onExit?: () => void;
}

/**
 * SAO Game Screen — the in-game UI.
 *
 * Layout:
 *   - Background: Aincrad.png
 *   - Top-left: SaoHUD (HP / MP / Energy + LV badge)
 *   - Top-right: SaoMainMenu (single icon → cascading menu)
 *   - Bottom-right: skill quick-slot row
 *   - Center: SaoNotificationWindow (modal-style, using the canonical
 *     3-layer SVG window from "Finestra notifiche SAO")
 *
 * All visual assets come EXCLUSIVELY from the asset-gioco-di-SAO repo.
 * No graphics are invented — only existing SVG/PNG assets are stacked.
 *
 * Audio: ambient sounds on mount, click feedback on every interaction.
 *
 * NOTE: bars do NOT auto-drain anymore. They only change via user actions
 * (menu clicks, etc.) or future combat events.
 */

export default function GameScreen({ playerName, onExit }: GameScreenProps) {
  const { play } = useSaoSound();
  const [hp] = useState<BarValue>({ current: 300, max: 300 });
  const [mp] = useState<BarValue>({ current: 120, max: 120 });
  const [energy] = useState<BarValue>({ current: 200, max: 200 });
  const [notification, setNotification] = useState<SaoNotificationData | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const pushNotification = useCallback(
    (n: Omit<SaoNotificationData, 'id'>) => {
      const full: SaoNotificationData = { ...n, id: Date.now() };
      setNotification(full);
      // Play the kind-specific alert sound (immediately, before the window
      // animation sound which fires after 300ms)
      const soundMap = {
        system: 'system' as const,
        message: 'message' as const,
        alert: 'alert' as const,
        present: 'present' as const,
      };
      play(soundMap[n.kind], 0.4);
    },
    [play],
  );

  // Boot sequence — show a welcome notification
  useEffect(() => {
    play('popupPanel', 0.4);
    const t1 = setTimeout(() => {
      play('welcome', 0.4);
      pushNotification({
        kind: 'system',
        title: 'Sistema',
        body: `Benvenuto ad Aincrad, ${playerName}. Sei al Floor 1.`,
        confirmLabel: 'OK',
        autoDismiss: 6000,
      });
    }, 800);
    const t3 = setTimeout(() => setShowWelcome(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t3);
    };
  }, [play, playerName, pushNotification]);

  const handleMenuClick = (id: string) => {
    switch (id) {
      case 'character':
        pushNotification({
          kind: 'system',
          title: 'Personaggio',
          body: `${playerName} — Lv.1  HP ${hp.current}/${hp.max}  MP ${mp.current}/${mp.max}`,
          confirmLabel: 'Chiudi',
          autoDismiss: 6000,
        });
        break;
      case 'wallet':
        pushNotification({
          kind: 'present',
          title: 'Borsa',
          body: 'Col: 0  —  Valuta iniziale. Esplora Aincrad per guadagnare.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'inventory':
        pushNotification({
          kind: 'message',
          title: 'Inventario',
          body: 'Lo zaino è vuoto. Raccogli oggetti durante le tue avventure.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'quest':
        pushNotification({
          kind: 'message',
          title: 'Quest',
          body: 'Nessuna quest attiva. Visita la città di inizi per ricevere missioni.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'floor':
        pushNotification({
          kind: 'system',
          title: 'Piano',
          body: 'Aincrad — Floor 1: Città degli Inizi.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'party':
        pushNotification({
          kind: 'message',
          title: 'Party',
          body: 'Non sei in un party. Invita altri giocatori per formarlo.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'options':
        pushNotification({
          kind: 'present',
          title: 'Opzioni',
          body: 'Sistema NerveGear v1.100 — funzionamento ottimale.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      case 'messages':
        pushNotification({
          kind: 'message',
          title: 'Messaggi',
          body: 'Nessun nuovo messaggio.',
          confirmLabel: 'OK',
          autoDismiss: 6000,
        });
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    pushNotification({
      kind: 'alert',
      title: 'Log Out',
      body: 'Vuoi davvero scollegarti da Aincrad? Verrai riportato alla schermata di login.',
      confirmLabel: 'Sì',
      cancelLabel: 'No',
      autoDismiss: 0,
    });
    // After confirm, the onConfirm handler will trigger onExit
  };

  const handleConfirm = (_id: number) => {
    if (notification?.title === 'Log Out') {
      // Logout confirmed
      play('dismissLauncher', 0.4);
      setTimeout(() => onExit?.(), 200);
      return;
    }
    setNotification(null);
  };

  const handleCancel = (_id: number) => {
    setNotification(null);
  };

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
          style={{ filter: 'brightness(0.65) saturate(1.1)' }}
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,8,20,0.7) 0%, rgba(2,8,20,0.2) 30%, rgba(2,8,20,0.2) 70%, rgba(2,8,20,0.8) 100%)',
          }}
        />
      </div>

      {/* ===== HUD (top-left) ===== */}
      <SaoHUD hp={hp} mp={mp} energy={energy} level={1} playerName={playerName} />

      {/* ===== Main Menu (top-right, single icon → cascading menu) ===== */}
      <SaoMainMenu onItemClick={handleMenuClick} onLogout={handleLogout} />

      {/* ===== Welcome splash (brief, fades out) ===== */}
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

      {/* ===== Skill quick-slot (bottom-right) ===== */}
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

      {/* ===== Crosshair (bottom-center, VR hint) ===== */}
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

      {/* ===== Canonical SAO notification window (modal overlay) ===== */}
      <SaoNotificationWindow
        notification={notification}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </motion.div>
  );
}
