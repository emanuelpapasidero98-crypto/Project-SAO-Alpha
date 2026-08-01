'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * SAO Sound Manager
 * Centralized audio playback for the SAO login experience.
 * Uses audio assets from asset-gioco-di-SAO repo (Sword Art Online Sound FX).
 *
 * 6 audio files mapped to 19 sound names:
 *   - ConfirmSound.wav  → click, confirm
 *   - BackSound.wav      → dismiss, back, cancel
 *   - EnterMenu.wav      → popup open (menu, panel, message, launcher)
 *   - ExitMenu.wav       → dismiss popup (launcher, message)
 *   - MenuTick.wav       → tick, hover, warning, alert, system, message
 *   - AchievementSound.wav → welcome, present, achievement
 */

export type SaoSoundName =
  | 'startup'        // EnterMenu.wav (boot sequence)
  | 'click'          // ConfirmSound.wav
  | 'linkStartK'     // AchievementSound.wav
  | 'linkStartA'     // AchievementSound.wav
  | 'welcome'        // AchievementSound.wav
  | 'alert'          // MenuTick.wav
  | 'system'         // MenuTick.wav
  | 'warning'        // MenuTick.wav
  | 'present'        // AchievementSound.wav
  | 'message'        // MenuTick.wav
  | 'popupMenu'      // EnterMenu.wav
  | 'popupPanel'     // EnterMenu.wav
  | 'popupMessage'   // EnterMenu.wav
  | 'popupLauncher'  // EnterMenu.wav
  | 'dismissLauncher'// ExitMenu.wav
  | 'dismissMessage' // ExitMenu.wav
  | 'programStart'   // EnterMenu.wav
  | 'programReady'   // ConfirmSound.wav
  | 'credits'        // AchievementSound.wav
  | 'diceRoll'       // MenuTick.wav (ripetuto rapidamente per simulare il rotolamento)
  | 'diceLand';      // ConfirmSound.wav (il dado si ferma)

const SOUND_PATHS: Record<SaoSoundName, string> = {
  startup: '/sao/audio/EnterMenu.wav',
  click: '/sao/audio/ConfirmSound.wav',
  linkStartK: '/sao/audio/AchievementSound.wav',
  linkStartA: '/sao/audio/AchievementSound.wav',
  welcome: '/sao/audio/AchievementSound.wav',
  alert: '/sao/audio/MenuTick.wav',
  system: '/sao/audio/MenuTick.wav',
  warning: '/sao/audio/MenuTick.wav',
  present: '/sao/audio/AchievementSound.wav',
  message: '/sao/audio/MenuTick.wav',
  popupMenu: '/sao/audio/EnterMenu.wav',
  popupPanel: '/sao/audio/EnterMenu.wav',
  popupMessage: '/sao/audio/EnterMenu.wav',
  popupLauncher: '/sao/audio/EnterMenu.wav',
  dismissLauncher: '/sao/audio/ExitMenu.wav',
  dismissMessage: '/sao/audio/ExitMenu.wav',
  programStart: '/sao/audio/EnterMenu.wav',
  programReady: '/sao/audio/ConfirmSound.wav',
  credits: '/sao/audio/AchievementSound.wav',
  diceRoll: '/sao/audio/MenuTick.wav',
  diceLand: '/sao/audio/ConfirmSound.wav',
};

/**
 * Pre-loads audio files into a shared cache so playback is instant.
 */
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(path: string): HTMLAudioElement {
  if (typeof window === 'undefined') {
    throw new Error('Audio can only be used in the browser');
  }
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
  return audio;
}

export function useSaoSound() {
  const mutedRef = useRef(false);

  const play = useCallback((name: SaoSoundName, volume = 0.6) => {
    if (mutedRef.current) return;
    if (typeof window === 'undefined') return;
    try {
      const audio = getAudio(SOUND_PATHS[name]);
      // Clone to allow overlapping playbacks (e.g. fast hover sounds)
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      clone.volume = Math.max(0, Math.min(1, volume));
      clone.currentTime = 0;
      const playPromise = clone.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay might be blocked until first user interaction - silent fail
        });
      }
    } catch {
      // silent fail
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);

  // Preload all sounds on mount (best effort)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.values(SOUND_PATHS).forEach((p) => {
      try {
        getAudio(p);
      } catch {
        // ignore
      }
    });
  }, []);

  return { play, setMuted };
}
