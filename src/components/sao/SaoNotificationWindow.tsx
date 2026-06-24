'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Notification Window — built using the 3 canonical SVG pieces from the
 * "Finestra notifiche SAO" folder, stacked vertically:
 *
 *   1. Pezzo superiore finestra.svg  (1200×228) — header: gradient #EFEFEF→#DFDFDF
 *      + 8px gray #A8A8A8 separator at the bottom. The TITLE text is placed here.
 *
 *   2. Parte interna finestra.svg    (1200×300) — middle: #D6D6D6 background with
 *      subtle top/bottom shadow gradients. The BODY text is placed here.
 *
 *   3. Parete sotto della finestra.svg (1200×330) — footer: white background with
 *      two circular buttons at translate(330, 165) (blue OK ring) and
 *      translate(870, 165) (red X disc). The CLICK HANDLERS are placed here,
 *      without any text labels — the canonical SAO buttons are self-explanatory
 *      (blue ring = confirm, red X = cancel/close).
 *
 * Total height = 228 + 300 + 330 = 858, aspect ratio 1200/858.
 *
 * Animation (from Progetto-SAO/qml/MenuView.qml — aniFadeIn / aniFadeOut):
 *   OPEN (ParallelAnimation):
 *     - opacity: 0 → 1 over 400ms
 *     - y: -height → 0 over 600ms with easing OutQuart
 *     - play Popup.SAO.Message.wav after 300ms delay
 *   CLOSE (SequentialAnimation → ParallelAnimation):
 *     - opacity: 1 → 0 over 400ms
 *     - y: 0 → -height over 300ms with easing InQuad
 *
 * The window is sized down (max ~520px wide instead of 900px) to feel less bulky.
 *
 * Both buttons are functional:
 *   - Blue circle (left, x=330/1200=27.5%)  → onConfirm
 *   - Red circle   (right, x=870/1200=72.5%) → onCancel (always available)
 *
 * No graphics are invented — only the existing canonical SVGs are stacked.
 */

export type NotificationKind = 'system' | 'message' | 'alert' | 'present';

export interface SaoNotificationData {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
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

  // Layout proportions (matching the 3 SVGs):
  //   TOP    = 228 / 858 = 26.6%   (title area)
  //   MIDDLE = 300 / 858 = 35.0%   (body text area)
  //   BOTTOM = 330 / 858 = 38.4%   (buttons area)
  // Inside BOTTOM (1200×330), buttons are at y=165 (50% of bottom).
  //   - Blue circle center: x=330/1200=27.5%, y=165/330=50% of bottom
  //   - Red circle center:  x=870/1200=72.5%, y=165/330=50% of bottom
  //   - Each circle has r=95 → diameter 190. So button hit-areas are 190px wide,
  //     which is 190/1200 = 15.8% of width.

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
          opacity 0→1 (400ms) + y -height→0 (600ms, OutQuart).
          Sized down to ~520px max-width (was 900px) to feel less bulky. */}
      <motion.div
        className="relative"
        style={{
          width: 'min(520px, 92vw)',
          aspectRatio: '1200 / 858',
        }}
        initial={{ opacity: 0, y: -250 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -200 }}
        transition={{
          opacity: { duration: 0.4, ease: 'easeOut' },
          y: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1], // OutQuart approximation
          },
        }}
        onAnimationStart={() => {
          // Play sound after 300ms delay (from MenuView.qml SequentialAnimation)
          setTimeout(() => play('popupMessage', 0.4), 300);
        }}
      >
        {/* ===== Layer 1: TOP — Pezzo superiore finestra (header + gray separator) =====
            Takes up 26.6% of total height (228/858). */}
        <img
          src="/sao/window/Pezzo superiore finestra.svg"
          alt=""
          className="absolute top-0 left-0 w-full"
          style={{ height: '26.6%' }}
          draggable={false}
          aria-hidden
        />

        {/* ===== Layer 2: MIDDLE — Parte interna finestra (#D6D6D6 body) =====
            Takes up 35.0% of total height (300/858). */}
        <img
          src="/sao/window/Parte interna finestra.svg"
          alt=""
          className="absolute left-0 w-full"
          style={{ top: '26.6%', height: '35.0%' }}
          draggable={false}
          aria-hidden
        />

        {/* ===== Layer 3: BOTTOM — Parete sotto della finestra (white footer + 2 buttons) =====
            Takes up 38.4% of total height (330/858). */}
        <img
          src="/sao/window/Parete sotto della finestra.svg"
          alt=""
          className="absolute left-0 w-full"
          style={{ top: '61.6%', height: '38.4%' }}
          draggable={false}
          aria-hidden
        />

        {/* ===== TITLE text overlay (in the TOP layer) =====
            Centered vertically in the top header area. The top layer is
            26.6% tall, with the gradient taking up to y=220/228 ≈ 96.4% of it.
            We center the title at ~13% (half of 26.6%) so it sits in the
            middle of the gradient header. */}
        <div
          className="absolute left-0 w-full flex items-center justify-center text-center px-[12%]"
          style={{
            top: '4%',
            height: '22.6%',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src={icon}
              alt=""
              className="w-5 h-5 sm:w-6 sm:h-6"
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
                fontSize: 'clamp(0.75rem, 1.8vw, 1.1rem)',
                textShadow: '0 1px 2px rgba(255,255,255,0.5)',
              }}
            >
              {notification.title.toUpperCase()}
            </h3>
          </div>
        </div>

        {/* ===== BODY text overlay (in the MIDDLE layer) =====
            The middle layer spans 26.6% → 61.6%. We center the text in this
            area with vertical padding to leave room for the gradient shadows
            at top/bottom of the middle layer. */}
        <div
          className="absolute left-0 w-full flex items-center justify-center text-center px-[15%]"
          style={{
            top: '30%',
            height: '28%',
          }}
        >
          <p
            className="leading-relaxed"
            style={{
              color: '#1a2a3a',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.7rem, 1.4vw, 0.95rem)',
              maxWidth: '90%',
            }}
          >
            {notification.body}
          </p>
        </div>

        {/* ===== Confirm button hit-area (blue circle, left) =====
            The bottom layer is from 61.6% to 100% of the window height.
            Inside the bottom SVG (1200×330), the blue circle is at (330, 165).
            Converting to window coordinates:
              center_x = 330/1200 = 27.5% (of window width)
              center_y = 61.6% + (165/330)*38.4% = 61.6% + 19.2% = 80.8% (of window height)
            The circle has r=95 → diameter 190, which is 190/1200 = 15.8% of width.
            We add a glow overlay on hover for interactivity feedback. */}
        <HoverButton
          side="confirm"
          onClick={handleConfirm}
          onHover={() => play('click', 0.2)}
        />

        {/* ===== Cancel button hit-area (red circle, right) =====
            Same logic but at x=870/1200 = 72.5%. This is ALWAYS functional —
            it dismisses the notification (treated as cancel/dismiss).
            Same hover effects as the confirm button but in red. */}
        <HoverButton
          side="cancel"
          onClick={handleCancel}
          onHover={() => play('click', 0.2)}
        />
      </motion.div>
    </motion.div>
  );
}

/* ---------- Hover button with glow + rotating dashed ring ---------- */

function HoverButton({
  side,
  onClick,
  onHover,
}: {
  side: 'confirm' | 'cancel';
  onClick: () => void;
  onHover: () => void;
}) {
  const [isHover, setIsHover] = useState(false);
  const isConfirm = side === 'confirm';
  const left = isConfirm ? 'calc(27.5% - 9%)' : 'calc(72.5% - 9%)';
  // Colors per side
  const glowColor = isConfirm
    ? 'rgba(43, 115, 179, 0.95)'
    : 'rgba(190, 33, 86, 0.95)';
  const glowColor2 = isConfirm
    ? 'rgba(92, 196, 240, 0.6)'
    : 'rgba(255, 100, 150, 0.6)';
  const innerGlow = isConfirm
    ? 'rgba(92, 196, 240, 0.4)'
    : 'rgba(255, 100, 150, 0.4)';
  const ringColor = isConfirm
    ? 'rgba(92, 196, 240, 0.9)'
    : 'rgba(255, 100, 150, 0.9)';
  const bgRadial = isConfirm
    ? 'radial-gradient(circle, rgba(92,196,240,0.25) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(190, 33, 86, 0.25) 0%, transparent 70%)';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setIsHover(true);
        onHover();
      }}
      onMouseLeave={() => setIsHover(false)}
      className="absolute"
      style={{
        left,
        top: 'calc(80.8% - 8%)',
        width: '18%',
        height: '16%',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
        borderRadius: '50%',
      }}
      animate={{ scale: isHover ? 1.12 : 1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.2 }}
      aria-label={isConfirm ? 'Conferma' : 'Annulla'}
    >
      {/* Glow ring on hover — appears around the circle */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{ opacity: isHover ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{
          boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor2}, inset 0 0 12px ${innerGlow}`,
          background: bgRadial,
        }}
        aria-hidden
      />
      {/* Rotating dashed ring on hover (VR feel, matching the menu icon) */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none border"
        animate={{
          opacity: isHover ? 1 : 0,
          rotate: isHover ? 360 : 0,
          scale: isHover ? 1.18 : 1,
        }}
        transition={{
          opacity: { duration: 0.25 },
          rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.25 },
        }}
        style={{
          borderColor: ringColor,
          borderWidth: '1px',
          borderStyle: 'dashed',
        }}
        aria-hidden
      />
    </motion.button>
  );
}
