'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaoSound } from '@/hooks/useSaoSound';

interface LoginScreenProps {
  onLogin: () => void;
}

/**
 * SAO Login Screen
 *
 * Visual layout (centered, full-screen):
 * - SAO_Login_Tech-Circle rotating slowly behind the UI
 * - SAO_Login_UI_Transparent.svg as the central login panel (contains
 *   "Login:" and "Password:" labels baked into the asset)
 * - SAO_Nervegear.svg as a small badge above the title
 * - Two transparent input fields overlaid exactly on the asset's "Login:"
 *   and "Password:" areas
 * - "Link Start" button below (uses the SAO blue button aesthetic)
 *
 * All SVG/PNG assets come from asset-gioco-di-SAO repo. No custom graphics.
 */
export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { play } = useSaoSound();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [bootingUp, setBootingUp] = useState(true);
  const techCircleRef = useRef<HTMLDivElement>(null);

  // Boot sequence: play NerveGear startup sound on mount
  useEffect(() => {
    const t = setTimeout(() => {
      play('startup', 0.4);
    }, 300);
    const t2 = setTimeout(() => {
      setBootingUp(false);
      play('welcome', 0.3);
    }, 1800);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [play]);

  // Slow rotate the tech circle
  useEffect(() => {
    let raf = 0;
    let angle = 0;
    const tick = () => {
      angle += 0.08;
      if (techCircleRef.current) {
        techCircleRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setShowError(true);
      play('warning', 0.5);
      setTimeout(() => setShowError(false), 2500);
      return;
    }
    play('click', 0.7);
    play('linkStartK', 0.6);
    onLogin();
  };

  return (
    <motion.div
      className="relative min-h-screen w-full flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: bootingUp ? 0 : 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      {/* Tech circle behind everything */}
      <div
        ref={techCircleRef}
        className="absolute left-1/2 top-1/2 pointer-events-none opacity-40"
        style={{
          width: 'min(85vmin, 780px)',
          height: 'min(85vmin, 780px)',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden
      >
        <img
          src="/sao/login/SAO_Login_Tech-Circle_v1.000.svg"
          alt=""
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 0 40px rgba(92, 196, 240, 0.45))' }}
        />
      </div>

      {/* Inner pulsing ring */}
      <motion.div
        className="absolute left-1/2 top-1/2 pointer-events-none rounded-full"
        style={{
          width: 'min(70vmin, 640px)',
          height: 'min(70vmin, 640px)',
          x: '-50%',
          y: '-50%',
          border: '1px solid rgba(92, 196, 240, 0.35)',
          boxShadow: '0 0 60px rgba(92, 196, 240, 0.15) inset, 0 0 60px rgba(92, 196, 240, 0.15)',
        }}
        animate={{ scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Main login UI - the SVG asset is the panel */}
      <div
        className="relative w-full"
        style={{ maxWidth: 'min(95vw, 1100px)' }}
      >
        {/* Top: NerveGear logo + System title */}
        <motion.div
          className="flex flex-col items-center mb-4 sm:mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <img
            src="/sao/login/SAO_Nervegear.svg"
            alt="NerveGear"
            className="h-6 sm:h-8 mb-3"
            style={{ filter: 'drop-shadow(0 0 10px rgba(92, 196, 240, 0.6))' }}
          />
          <h1
            className="text-cyan-200 tracking-[0.4em] font-light text-center"
            style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)',
              textShadow: '0 0 20px rgba(92, 196, 240, 0.6)',
              fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
            }}
          >
            SWORD ART ONLINE
          </h1>
          <p
            className="text-cyan-100/60 tracking-[0.3em] mt-1"
            style={{ fontSize: 'clamp(0.55rem, 1.5vw, 0.75rem)' }}
          >
            NERVE GEAR SYSTEM — v1.100
          </p>
        </motion.div>

        {/* The login panel SVG with overlaid form fields */}
        <motion.form
          onSubmit={handleSubmit}
          className="relative w-full"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
          onMouseEnter={() => play('popupPanel', 0.25)}
        >
          <div className="relative w-full aspect-[1920/1080]">
            {/* The SVG panel itself */}
            <img
              src="/sao/login/SAO_Login_UI_Transparent.svg"
              alt="SAO Login Panel"
              className="absolute inset-0 w-full h-full"
              style={{
                filter: 'drop-shadow(0 0 40px rgba(92, 196, 240, 0.45))',
              }}
              draggable={false}
            />

            {/* Overlay form fields positioned over the SVG's input areas.
                The SVG has "Login:" at ~y=478-539 and "Password:" at ~y=602-663,
                both in x ~983-1355. These are 1920x1080 viewBox coords. */}
            {/* Login input */}
            <div
              className="absolute"
              style={{
                left: '51.4%',
                top: '44.3%',
                width: '19.4%',
                height: '4.4%',
              }}
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => play('click', 0.15)}
                placeholder=""
                aria-label="Username"
                className="w-full h-full bg-transparent border-0 outline-none text-cyan-50 placeholder:text-cyan-200/30 px-2"
                style={{
                  fontSize: 'clamp(0.7rem, 1.4vw, 1.05rem)',
                  fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
                  letterSpacing: '0.05em',
                }}
                autoComplete="off"
              />
            </div>
            {/* Password input */}
            <div
              className="absolute"
              style={{
                left: '51.4%',
                top: '55.7%',
                width: '19.4%',
                height: '4.4%',
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => play('click', 0.15)}
                placeholder=""
                aria-label="Password"
                className="w-full h-full bg-transparent border-0 outline-none text-cyan-50 placeholder:text-cyan-200/30 px-2"
                style={{
                  fontSize: 'clamp(0.7rem, 1.4vw, 1.05rem)',
                  fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
                  letterSpacing: '0.05em',
                }}
                autoComplete="off"
              />
            </div>

            {/* "Link Start" button - bottom right of the panel */}
            <button
              type="submit"
              className="absolute group flex items-center justify-center"
              style={{
                left: '78%',
                top: '70%',
                width: '14.5%',
                height: '11%',
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={() => {
                setIsHoveringLogin(true);
                play('click', 0.3);
              }}
              onMouseLeave={() => setIsHoveringLogin(false)}
              aria-label="Link Start"
            >
              {/* Button glow */}
              <motion.div
                className="absolute inset-0 rounded-md"
                animate={{
                  opacity: isHoveringLogin ? 1 : 0.55,
                  scale: isHoveringLogin ? 1.06 : 1,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  background:
                    'linear-gradient(135deg, rgba(92,196,240,0.85), rgba(43,115,179,0.95))',
                  boxShadow: isHoveringLogin
                    ? '0 0 30px rgba(92,196,240,0.85), 0 0 60px rgba(92,196,240,0.45), inset 0 0 12px rgba(255,255,255,0.3)'
                    : '0 0 12px rgba(92,196,240,0.4), inset 0 0 6px rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.5)',
                }}
              />
              <span
                className="relative text-white font-semibold tracking-[0.2em] pointer-events-none"
                style={{
                  fontSize: 'clamp(0.65rem, 1.3vw, 0.95rem)',
                  textShadow: '0 0 8px rgba(255,255,255,0.6)',
                }}
              >
                LINK START
              </span>
            </button>
          </div>

          {/* Error toast */}
          <AnimatePresence>
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-14 px-5 py-2 rounded border border-red-400/50 bg-red-950/70 backdrop-blur"
                style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}
              >
                <p className="text-red-200 text-sm tracking-wider">
                  ⚠ Credenziali mancanti — inserire Login e Password
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Bottom hint */}
        <motion.p
          className="text-center text-cyan-100/40 mt-8 sm:mt-12 tracking-[0.3em] text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          [ PREMI <span className="text-cyan-200">LINK START</span> PER ACCEDERE AD AINCRAD ]
        </motion.p>
      </div>
    </motion.div>
  );
}
