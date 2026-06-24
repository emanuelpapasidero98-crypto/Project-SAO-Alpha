'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaoSound } from '@/hooks/useSaoSound';

interface LoginScreenProps {
  onLogin: () => void;
}

/**
 * SAO Login Screen — NerveGear VR boot experience.
 *
 * Visual hierarchy (top → bottom):
 *   1. HUGE NerveGear SVG (preponderant brand element) + "NERVGEAR" wordmark
 *   2. "SWORD ART ONLINE" subtitle
 *   3. Tech-Circle rotating behind the login panel
 *   4. SAO_Login_UI_Transparent.svg as the central panel
 *   5. Dark-text inputs overlaid on the asset's white input rectangles
 *      (the SVG paints the input areas as #FBFBFB, so the text MUST be dark)
 *   6. "Link Start" button using the SAO blue (#2B73B3) aesthetic
 *
 * VR environment feel:
 *   - Multi-stage boot sequence (NerveGear startup → calibration → ready)
 *   - Floating VR calibration crosshair
 *   - Scanline + chromatic aberration overlay
 *   - Parallax depth on mouse move
 *   - Pulsing tech rings around the NerveGear
 *   - System log lines typing out during boot
 */
export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { play } = useSaoSound();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  // 0 = booting, 1 = calibrating, 2 = ready
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const techCircleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Boot sequence — multi-stage VR startup
  useEffect(() => {
    const steps = [
      { delay: 200, sound: 'startup' as const, vol: 0.45 },
      { delay: 1400, sound: 'system' as const, vol: 0.25 },
      { delay: 2400, sound: 'popupPanel' as const, vol: 0.3 },
      { delay: 3400, sound: 'welcome' as const, vol: 0.35 },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => {
        play(s.sound, s.vol);
        setBootStep(i + 1);
      }, s.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [play]);

  // Slow rotate the tech circle (continuous)
  useEffect(() => {
    let raf = 0;
    let angle = 0;
    const tick = () => {
      angle += 0.06;
      if (techCircleRef.current) {
        techCircleRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Parallax on mouse move (subtle VR head-tracking feel)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = (e.clientX - w / 2) / w;
      const y = (e.clientY - h / 2) / h;
      setParallax({ x, y });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const booting = bootStep < 4;

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

  // Boot log lines — typed out progressively
  const bootLines = [
    '> INITIALIZING NERVEGEAR v1.100...',
    '> CHECKING BRAIN-WAVE INTERFACE... OK',
    '> CALIBRATING VR VISUAL CORTEX... OK',
    '> SYSTEM READY — WELCOME, PLAYER',
  ];

  return (
    <motion.div
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: booting ? 0 : 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      {/* ===== Tech circle behind everything ===== */}
      <div
        ref={techCircleRef}
        className="absolute left-1/2 top-1/2 pointer-events-none opacity-25"
        style={{
          width: 'min(90vmin, 820px)',
          height: 'min(90vmin, 820px)',
          transform: 'translate(-50%, -50%)',
          x: parallax.x * -10,
          y: parallax.y * -10,
        }}
        aria-hidden
      >
        <img
          src="/sao/login/SAO_Login_Tech-Circle_v1.000.svg"
          alt=""
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 0 50px rgba(43, 115, 179, 0.55))' }}
        />
      </div>

      {/* ===== Pulsing concentric rings around NerveGear ===== */}
      {[0, 0.4, 0.8].map((delay, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute left-1/2 top-[18%] pointer-events-none rounded-full"
          style={{
            width: 'min(35vmin, 320px)',
            height: 'min(35vmin, 320px)',
            x: '-50%',
            y: '-50%',
            border: '1px solid rgba(43, 115, 179, 0.4)',
          }}
          animate={{
            scale: [1, 1.6, 1.6],
            opacity: [0.7, 0, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
          aria-hidden
        />
      ))}

      {/* ===== HUGE NerveGear brand block (preponderant) ===== */}
      <motion.div
        className="relative z-10 flex flex-col items-center mb-6"
        style={{
          x: parallax.x * 15,
          y: parallax.y * 15,
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        {/* Massive NerveGear SVG */}
        <motion.div
          className="relative"
          animate={{
            filter: [
              'drop-shadow(0 0 25px rgba(43, 115, 179, 0.6))',
              'drop-shadow(0 0 50px rgba(43, 115, 179, 0.95))',
              'drop-shadow(0 0 25px rgba(43, 115, 179, 0.6))',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src="/sao/login/SAO_Nervegear.svg"
            alt="NerveGear"
            className="w-[280px] sm:w-[420px] md:w-[520px] h-auto"
            draggable={false}
          />
        </motion.div>

        {/* NERVEGEAR wordmark — huge, preponderant */}
        <motion.h1
          className="mt-2 tracking-[0.45em] font-light text-center"
          style={{
            fontSize: 'clamp(2.2rem, 8vw, 5.5rem)',
            color: '#FBFBFB',
            textShadow:
              '0 0 20px rgba(43, 115, 179, 0.9), 0 0 40px rgba(43, 115, 179, 0.6), 0 0 80px rgba(43, 115, 179, 0.3)',
            fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
            letterSpacing: '0.45em',
          }}
        >
          NERVEGEAR
        </motion.h1>

        <motion.p
          className="tracking-[0.5em] mt-2"
          style={{
            fontSize: 'clamp(0.7rem, 2vw, 1.05rem)',
            color: '#5CC4F0',
            textShadow: '0 0 12px rgba(92, 196, 240, 0.7)',
          }}
        >
          SWORD ART ONLINE
        </motion.p>
        <p
          className="text-cyan-100/40 tracking-[0.3em] mt-1"
          style={{ fontSize: 'clamp(0.5rem, 1.3vw, 0.7rem)' }}
        >
          VRMMORPG SYSTEM — v1.100
        </p>
      </motion.div>

      {/* ===== Boot log overlay (fades out when ready) ===== */}
      <AnimatePresence>
        {booting && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[58%] z-20 font-mono text-[0.6rem] sm:text-xs tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {bootLines.slice(0, bootStep).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-cyan-300/80"
                style={{ textShadow: '0 0 8px rgba(92, 196, 240, 0.6)' }}
              >
                {line}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Main login panel (SVG asset) ===== */}
      <motion.form
        onSubmit={handleSubmit}
        className="relative w-full z-10"
        style={{ maxWidth: 'min(95vw, 900px)' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={booting ? { scale: 0.92, opacity: 0, y: 20 } : { scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        onMouseEnter={() => !booting && play('popupPanel', 0.2)}
      >
        <div className="relative w-full aspect-[1920/1080]">
          {/* The SVG panel */}
          <img
            src="/sao/login/SAO_Login_UI_Transparent.svg"
            alt="SAO Login Panel"
            className="absolute inset-0 w-full h-full"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(43, 115, 179, 0.5))',
            }}
            draggable={false}
          />

          {/* Username input — overlaid on the SVG's white input rectangle.
              The asset paints the input area as #FBFBFB (near-white), so the
              text MUST be dark (#0682BE / #1a1a1a) to be visible. */}
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
              className="w-full h-full bg-transparent border-0 outline-none px-2"
              style={{
                color: '#1a2a3a',
                fontSize: 'clamp(0.75rem, 1.5vw, 1.1rem)',
                fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
                letterSpacing: '0.05em',
                fontWeight: 600,
                caretColor: '#0682BE',
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
              className="w-full h-full bg-transparent border-0 outline-none px-2"
              style={{
                color: '#1a2a3a',
                fontSize: 'clamp(0.75rem, 1.5vw, 1.1rem)',
                fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)',
                letterSpacing: '0.05em',
                fontWeight: 600,
                caretColor: '#0682BE',
              }}
              autoComplete="off"
            />
          </div>

          {/* "Link Start" button */}
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
            <motion.div
              className="absolute inset-0 rounded-sm"
              animate={{
                opacity: isHoveringLogin ? 1 : 0.6,
                scale: isHoveringLogin ? 1.06 : 1,
              }}
              transition={{ duration: 0.25 }}
              style={{
                background:
                  'linear-gradient(135deg, #5CC4F0 0%, #2B73B3 60%, #0682BE 100%)',
                boxShadow: isHoveringLogin
                  ? '0 0 30px rgba(43,115,179,0.9), 0 0 60px rgba(92,196,240,0.5), inset 0 0 12px rgba(255,255,255,0.4)'
                  : '0 0 12px rgba(43,115,179,0.5), inset 0 0 6px rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            />
            <span
              className="relative text-white font-semibold tracking-[0.2em] pointer-events-none"
              style={{
                fontSize: 'clamp(0.7rem, 1.4vw, 1rem)',
                textShadow: '0 0 8px rgba(255,255,255,0.7), 0 0 16px rgba(43,115,179,0.9)',
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
              className="absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-14 px-5 py-2 border"
              style={{
                background: 'rgba(190, 33, 86, 0.85)',
                borderColor: 'rgba(255, 100, 150, 0.6)',
                boxShadow: '0 0 20px rgba(190, 33, 86, 0.6)',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              }}
            >
              <p className="text-white text-sm tracking-wider">
                ⚠ CREDENZIALI MANCANTI — INSERIRE LOGIN E PASSWORD
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>

      {/* Bottom hint */}
      <motion.p
        className="text-center text-cyan-100/40 mt-8 tracking-[0.3em] text-xs z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: booting ? 0 : 1 }}
        transition={{ delay: booting ? 0 : 1.6, duration: 1 }}
      >
        [ PREMI <span className="text-cyan-200">LINK START</span> PER ENTRARE AD AINCRAD ]
      </motion.p>
    </motion.div>
  );
}
