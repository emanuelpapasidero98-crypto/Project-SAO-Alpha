'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Notification Window — built EXCLUSIVELY from the SVG pieces found in
 * the "Finestra notifiche SAO" folder of the asset repository.
 *
 * The canonical SAO window is composed of 3 stacked layers:
 *   1. top.svg     (Pezzo superiore finestra) — 1200x228 — gradient #EFEFEF→#DFDFDF + #A8A8A8 separator
 *   2. middle.svg  (Parte interna finestra)   — 1200x300 — #D6D6D6 background with top/bottom shadow gradients
 *   3. bottom.svg  (Parete sotto della finestra) — 1200x330 — #FFFFFF with the two circular buttons
 *      (blue OK button on the left at x=330, red X button on the right at x=870)
 *
 * Buttons (Pulsante azzurro.svg / Pulsante rosso.svg) are 240x240 circular
 * indicators with the canonical SAO ring aesthetic.
 *
 * Animation (from Progetto-SAO/qml/MenuView.qml — aniFadeIn / aniFadeOut):
 *   OPEN  (ParallelAnimation, 600ms total):
 *     - opacity: 0 → 1 over 400ms
 *     - y: -height → 0 over 600ms with easing OutQuart
 *     - play Popup.SAO.Menu.wav after 300ms delay
 *   CLOSE (SequentialAnimation → ParallelAnimation, 400ms total):
 *     - opacity: 1 → 0 over 400ms
 *     - y: 0 → -height over 300ms with easing InQuad
 *     - then visible = false
 *
 * No graphics are invented — only the existing SVG assets are stacked.
 */

export type NotificationKind = 'system' | 'message' | 'alert' | 'present';

export interface SaoNotificationData {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Optional confirm button label (defaults to "OK") */
  confirmLabel?: string;
  /** Optional cancel button label (if absent, only confirm button is shown) */
  cancelLabel?: string;
  /** Auto-dismiss after ms (0 = manual) */
  autoDismiss?: number;
}

interface SaoNotificationWindowProps {
  notification: SaoNotificationData | null;
  onConfirm?: (id: number) => void;
  onCancel?: (id: number) => void;
}

const KIND_COLORS: Record<NotificationKind, string> = {
  system: '#2B73B3',
  message: '#5CC4F0',
  alert: '#BE2156',
  present: '#EBA601',
};

const KIND_ICONS: Record<NotificationKind, string> = {
  system: '/sao/menu/Config.svg',
  message: '/sao/menu/Message.svg',
  alert: '/sao/hex/Warning.svg',
  present: '/sao/hex/SAO_Congratulations!!.svg',
};

export default function SaoNotificationWindow({
  notification,
  onConfirm,
  onCancel,
}: SaoNotificationWindowProps) {
  const { play } = useSaoSound();

  // Auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const ms = notification.autoDismiss ?? 6000;
    if (ms <= 0) return;
    const t = setTimeout(() => {
      play('dismissMessage', 0.35);
      onConfirm?.(notification.id);
    }, ms);
    return () => clearTimeout(t);
  }, [notification, onConfirm, play]);

  return (
    <AnimatePresence mode="wait">
      {notification && (
        <SaoWindow
          key={notification.id}
          notification={notification}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </AnimatePresence>
  );
}

function SaoWindow({
  notification,
  onConfirm,
  onCancel,
}: {
  notification: SaoNotificationData;
  onConfirm?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  const { play } = useSaoSound();
  const color = KIND_COLORS[notification.kind];
  const icon = KIND_ICONS[notification.kind];

  const handleConfirm = () => {
    play('click', 0.5);
    play('dismissMessage', 0.35);
    onConfirm?.(notification.id);
  };

  const handleCancel = () => {
    play('click', 0.5);
    play('dismissMessage', 0.35);
    onCancel?.(notification.id);
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'rgba(2, 8, 20, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Window container — animation from MenuView.qml aniFadeIn:
          opacity 0→1 (400ms) + y -height→0 (600ms, OutQuart) */}
      <motion.div
        className="relative"
        style={{
          width: 'min(900px, 95vw)',
          // Total height = top (228) + middle (300) + bottom (330), but we use
          // a compact proportional layout. Aspect ratio ~ 1200/858.
          aspectRatio: '1200 / 600',
        }}
        initial={{ opacity: 0, y: -300 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -200 }}
        transition={{
          opacity: { duration: 0.4, ease: 'easeOut' },
          y: { duration: 0.6, ease: [0.22, 1, 0.36, 1] /* OutQuart approximation */ },
        }}
        onAnimationStart={() => {
          // Play sound after 300ms delay (from MenuView.qml SequentialAnimation)
          setTimeout(() => play('popupMessage', 0.4), 300);
        }}
      >
        {/* Layer 1: top.svg (Pezzo superiore finestra) — header strip with
            gradient + gray separator. Used as the window's top border. */}
        <img
          src="/sao/window/top.svg"
          alt=""
          className="absolute top-0 left-0 w-full"
          style={{
            height: '14%',
            zIndex: 1,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
          }}
          draggable={false}
          aria-hidden
        />

        {/* Layer 2: middle.svg (Parte interna finestra) — main content area.
            Stretched to fill the central portion of the window. */}
        <img
          src="/sao/window/middle.svg"
          alt=""
          className="absolute left-0 w-full"
          style={{
            top: '14%',
            height: '52%',
            zIndex: 1,
          }}
          draggable={false}
          aria-hidden
        />

        {/* Layer 3: bottom.svg (Parete sotto della finestra) — footer with
            the two circular buttons (blue OK + red X). */}
        <img
          src="/sao/window/bottom.svg"
          alt=""
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: '34%',
            zIndex: 1,
            filter: 'drop-shadow(0 -2px 6px rgba(0,0,0,0.15))',
          }}
          draggable={false}
          aria-hidden
        />

        {/* ===== Content overlay (title + body text) ===== */}
        <div
          className="absolute left-0 w-full flex flex-col items-center justify-center text-center px-[8%]"
          style={{
            top: '18%',
            height: '50%',
            zIndex: 5,
          }}
        >
          {/* Title row with kind indicator */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src={icon}
              alt=""
              className="w-7 h-7"
              style={{
                filter: `drop-shadow(0 0 6px ${color})`,
              }}
              draggable={false}
            />
            <h3
              className="tracking-[0.4em]"
              style={{
                color: '#1a2a3a',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.9rem, 2vw, 1.4rem)',
                textShadow: '0 1px 2px rgba(255,255,255,0.5)',
              }}
            >
              {notification.title.toUpperCase()}
            </h3>
          </div>

          {/* Body text */}
          <p
            className="leading-relaxed"
            style={{
              color: '#1a2a3a',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.8rem, 1.6vw, 1.05rem)',
              maxWidth: '80%',
            }}
          >
            {notification.body}
          </p>

          {/* Kind color underline */}
          <motion.div
            className="mt-4 h-0.5"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}`,
              width: '60px',
            }}
            initial={{ width: 0 }}
            animate={{ width: '60px' }}
            transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* ===== Confirm button (left, blue) — positioned at bottom.svg's
            left circle (x=330/1200 ≈ 27.5%) ===== */}
        <motion.button
          type="button"
          onClick={handleConfirm}
          onMouseEnter={() => play('click', 0.2)}
          className="absolute flex items-center justify-center"
          style={{
            // Position aligned with bottom.svg's blue circle (x=330, y=165 in 1200x330 viewBox)
            left: 'calc(27.5% - 8%)',
            bottom: 'calc(17% - 8%)',
            width: '16%',
            height: '26%',
            zIndex: 10,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          aria-label={notification.confirmLabel ?? 'OK'}
        >
          {/* The blue circle SVG (Pulsante azzurro.svg) */}
          <img
            src="/sao/window/btn-blue.svg"
            alt=""
            className="w-full h-full"
            draggable={false}
            style={{
              filter: 'drop-shadow(0 4px 10px rgba(43, 115, 179, 0.6))',
            }}
          />
          {/* Label overlay on the button */}
          <span
            className="absolute text-white tracking-[0.15em] pointer-events-none"
            style={{
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.55rem, 1.2vw, 0.85rem)',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {notification.confirmLabel?.toUpperCase() ?? 'OK'}
          </span>
        </motion.button>

        {/* ===== Cancel button (right, red X) — only if cancelLabel is provided.
            Positioned at bottom.svg's red circle (x=870/1200 ≈ 72.5%) ===== */}
        {notification.cancelLabel !== undefined && (
          <motion.button
            type="button"
            onClick={handleCancel}
            onMouseEnter={() => play('click', 0.2)}
            className="absolute flex items-center justify-center"
            style={{
              left: 'calc(72.5% - 8%)',
              bottom: 'calc(17% - 8%)',
              width: '16%',
              height: '26%',
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label={notification.cancelLabel}
          >
            <img
              src="/sao/window/btn-red.svg"
              alt=""
              className="w-full h-full"
              draggable={false}
              style={{
                filter: 'drop-shadow(0 4px 10px rgba(190, 33, 86, 0.6))',
              }}
            />
            <span
              className="absolute text-white tracking-[0.15em] pointer-events-none"
              style={{
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.55rem, 1.2vw, 0.85rem)',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              {notification.cancelLabel.toUpperCase()}
            </span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
