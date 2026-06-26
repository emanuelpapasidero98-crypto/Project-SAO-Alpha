'use client';

import { useEffect, useState } from 'react';

/**
 * useImagePreload — preloads one or more images and reports when all are loaded.
 *
 * Uses native Image() constructor to trigger browser fetch + decode.
 * Once loaded, the browser caches them, so subsequent <img> tags render
 * instantly without flicker.
 *
 * Usage:
 *   const loaded = useImagePreload([
 *     '/sao/hpbar/blank-hp.png',
 *     '/sao/hpbar/blank-mp.png',
 *   ]);
 *   // loaded === true when all images are decoded and ready
 */

export function useImagePreload(srcs: string[]): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (srcs.length === 0) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    let remaining = srcs.length;

    const onDone = () => {
      remaining--;
      if (remaining === 0 && !cancelled) {
        setLoaded(true);
      }
    };

    srcs.forEach((src) => {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone; // count errors as "done" to avoid hanging
      // decode=true triggers decode before paint, reducing flicker
      img.src = src;
      // For browsers that support decode(), wait for it
      if (img.decode) {
        img.decode().then(onDone).catch(onDone);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcs.join(',')]);

  return loaded;
}

/**
 * Preloads ALL images used in the game at startup.
 * Call once in GameScreen or _app to warm the browser cache.
 */
export const SAO_CRITICAL_IMAGES: string[] = [
  // HP/MP/Energy bars
  '/sao/hpbar/blank-hp.png',
  '/sao/hpbar/blank-mp.png',
  '/sao/hpbar/blank-energy.png',
  // Background
  '/sao/backgrounds/Aincrad.png',
  // Avatars
  '/sao/avatar/SAO_Man.svg',
  '/sao/avatar/SAO_Woman.svg',
  // Menu icons (critical path)
  '/sao/menu/Config.svg',
  '/sao/menu/Message.svg',
  // Notification window layers
  '/sao/window/Pezzo superiore finestra.svg',
  '/sao/window/Parte interna finestra.svg',
  '/sao/window/Parete sotto della finestra.svg',
  // Window buttons
  '/sao/window/btn-red.svg',
  // Hex icons
  '/sao/hex/Warning.svg',
  '/sao/hex/SAO_Congratulations!!.svg',
];
