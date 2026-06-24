'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO Notification Window — built using the canonical SVG
 * "SAO_UI-Window_blank.svg" from the "Finestra notifiche SAO" folder.
 *
 * That single SVG (viewBox 0 0 1200 550) contains the COMPLETE canonical
 * SAO notification window:
 *   - White base rect (full 1200x550)
 *   - Top gradient strip (0→220, #EFEFEF→#DFDFDF)
 *   - Gray separator (220→228, #A8A8A8)
 *   - White body (228→550) where text is placed
 *   - Left blue button circle at translate(330, 390), r=95 (stroke 6 + ring stroke 26 + center r=20)
 *     → this is the canonical "OK" / confirm button
 *   - Right red button circle at translate(870, 390), r=95 (stroke 6 + filled r=75 + white X)
 *     → this is the canonical "cancel" / close button
 *
 * We render this SVG as the window's background and overlay:
 *   - Title + body text in the body area (y 228→340, before the buttons)
 *   - Clickable hit-areas over each circle (no custom button graphics)
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
 * No graphics are invented — only the existing canonical SVG is used as
 * the window chrome, and text is overlaid on top.
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
          opacity 0→1 (400ms) + y -height→0 (600ms, OutQuart).
          The window uses the canonical SAO_UI-Window_blank.svg as background.
          SVG viewBox is 1200x550 (aspect ratio ~2.18:1). */}
      <motion.div
        className="relative"
        style={{
          width: 'min(900px, 95vw)',
          aspectRatio: '1200 / 550',
        }}
        initial={{ opacity: 0, y: -350 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -250 }}
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
        {/* ===== Canonical window background SVG (single image) ===== */}
        <img
          src="/sao/window/SAO_UI-Window_blank.svg"
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.45))',
          }}
          draggable={false}
          aria-hidden
        />

        {/* ===== Content overlay (title + body text) =====
            The SVG body area is from y=228 to y=340 (above the buttons at y=390).
            In viewBox coords (1200x550), that's:
              - title at y ≈ 270 (centered in upper body)
              - body text at y ≈ 320 (below title)
            Converting to percentages: 270/550 ≈ 49%, 320/550 ≈ 58% */}
        <div
          className="absolute left-0 w-full flex flex-col items-center justify-center text-center px-[12%]"
          style={{
            top: '42%',
            height: '18%',
          }}
        >
          {/* Title row with kind indicator */}
          <div className="flex items-center gap-3 mb-2">
            <img
              src={icon}
              alt=""
              className="w-6 h-6"
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
              fontSize: 'clamp(0.78rem, 1.5vw, 1rem)',
              maxWidth: '75%',
            }}
          >
            {notification.body}
          </p>
        </div>

        {/* ===== Confirm button hit-area (left, blue circle at x=330/1200, y=390/550)
            The circle has r=95, so the hit area is a square of ~190x190 centered
            at (330, 390) in viewBox coords. Converting to %:
              center x = 330/1200 = 27.5%
              center y = 390/550 = 70.9%
              size = 190/1200 = 15.8% (width), 190/550 = 34.5% (height) ===== */}
        <motion.button
          type="button"
          onClick={handleConfirm}
          onMouseEnter={() => play('click', 0.2)}
          className="absolute flex items-center justify-center"
          style={{
            left: 'calc(27.5% - 8%)',
            top: 'calc(70.9% - 17%)',
            width: '16%',
            height: '34%',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
            borderRadius: '50%',
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          aria-label={notification.confirmLabel ?? 'OK'}
        >
          {/* Label overlay on the blue circle (the SVG already draws the circle) */}
          <span
            className="absolute text-white tracking-[0.15em] pointer-events-none"
            style={{
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.55rem, 1.2vw, 0.85rem)',
              textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.5)',
            }}
          >
            {notification.confirmLabel?.toUpperCase() ?? 'OK'}
          </span>
        </motion.button>

        {/* ===== Cancel button hit-area (right, red circle at x=870/1200, y=390/550)
            Only shown if cancelLabel is provided. ===== */}
        {notification.cancelLabel !== undefined && (
          <motion.button
            type="button"
            onClick={handleCancel}
            onMouseEnter={() => play('click', 0.2)}
            className="absolute flex items-center justify-center"
            style={{
              left: 'calc(72.5% - 8%)',
              top: 'calc(70.9% - 17%)',
              width: '16%',
              height: '34%',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: 0,
              borderRadius: '50%',
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label={notification.cancelLabel}
          >
            <span
              className="absolute text-white tracking-[0.15em] pointer-events-none"
              style={{
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.55rem, 1.2vw, 0.85rem)',
                textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.5)',
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
