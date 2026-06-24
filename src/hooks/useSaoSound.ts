'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * SAO Sound Manager
 * Centralized audio playback for the SAO login experience.
 * Uses only audio assets found in the Progetto-SAO repository.
 */

export type SaoSoundName =
  | 'startup'        // Startup.SAO.NerveGear.wav
  | 'click'          // Feedback.SAO.Click.wav
  | 'linkStartK'     // LinkStart.SAO.Kirito.wav
  | 'linkStartA'     // LinkStart.SAO.Asuna.wav
  | 'welcome'        // Ready.SAO.Welcome.wav
  | 'alert'          // Notify.SAO.Alert.wav
  | 'system'         // Notify.SAO.System.wav
  | 'warning'        // Notify.SAO.Warning.wav
  | 'present'        // Notify.SAO.Present.wav
  | 'message'        // Notify.SAO.Message.wav
  | 'popupMenu'      // Popup.SAO.Menu.wav
  | 'popupPanel'     // Popup.SAO.Panel.wav
  | 'popupMessage'   // Popup.SAO.Message.wav
  | 'popupLauncher'  // Popup.SAO.Launcher.wav
  | 'dismissLauncher'// Dismiss.SAO.Launcher.wav
  | 'dismissMessage' // Dismiss.SAO.Message.wav
  | 'programStart'   // Sounds/ProgramStart.wav
  | 'programReady'   // Sounds/ProgramReady.wav
  | 'credits';       // Sounds/Credits.wav

const SOUND_PATHS: Record<SaoSoundName, string> = {
  startup: '/sao/audio/Startup.SAO.NerveGear.wav',
  click: '/sao/audio/Feedback.SAO.Click.wav',
  linkStartK: '/sao/audio/LinkStart.SAO.Kirito.wav',
  linkStartA: '/sao/audio/LinkStart.SAO.Asuna.wav',
  welcome: '/sao/audio/Ready.SAO.Welcome.wav',
  alert: '/sao/audio/Notify.SAO.Alert.wav',
  system: '/sao/audio/Notify.SAO.System.wav',
  warning: '/sao/audio/Notify.SAO.Warning.wav',
  present: '/sao/audio/Notify.SAO.Present.wav',
  message: '/sao/audio/Notify.SAO.Message.wav',
  popupMenu: '/sao/audio/Popup.SAO.Menu.wav',
  popupPanel: '/sao/audio/Popup.SAO.Panel.wav',
  popupMessage: '/sao/audio/Popup.SAO.Message.wav',
  popupLauncher: '/sao/audio/Popup.SAO.Launcher.wav',
  dismissLauncher: '/sao/audio/Dismiss.SAO.Launcher.wav',
  dismissMessage: '/sao/audio/Dismiss.SAO.Message.wav',
  programStart: '/sao/audio/ProgramStart.wav',
  programReady: '/sao/audio/ProgramReady.wav',
  credits: '/sao/audio/Credits.wav',
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
