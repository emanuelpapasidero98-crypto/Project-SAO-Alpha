'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from '@/components/sao/ParticleBackground';
import LoginScreen from '@/components/sao/LoginScreen';
import CharacterCreation from '@/components/sao/CharacterCreation';
import GameScreen from '@/components/sao/GameScreen';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { Gender } from '@/lib/sao-data';

type Stage = 'login' | 'linkstart' | 'creation' | 'entering' | 'game';

interface Spotlight {
  x: number;
  y: number;
  intensity: number;
}

export default function Home() {
  const { play } = useSaoSound();
  const [stage, setStage] = useState<Stage>('login');
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [glowColor, setGlowColor] = useState<string>('#2B73B3');
  const [playerName, setPlayerName] = useState<string>('');
  const [gender, setGender] = useState<Gender | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (admin: boolean = false) => {
    setIsAdmin(admin);
    setStage('linkstart');
  };

  const handleLinkStartDone = () => {
    setStage('creation');
  };

  const handleCreationComplete = (data: { name: string; gender: Gender }) => {
    setPlayerName(data.name);
    setGender(data.gender);
    setGlowColor(data.gender.glowColor);
    setStage('entering');
    setTimeout(() => {
      setStage('game');
    }, 4500);
  };

  const handleExitGame = () => {
    setStage('login');
    setPlayerName('');
    setGender(null);
  };

  const handleCardHover = (coords: { x: number; y: number } | null) => {
    if (coords) {
      setSpotlight({ ...coords, intensity: 1 });
    } else {
      setSpotlight(null);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#020814]">
      {/* Layered background gradient + R3F particle field */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background:
            'radial-gradient(ellipse at center, #06203f 0%, #020814 60%, #000408 100%)',
        }}
      />
      <ParticleBackground glowColor={glowColor} spotlight={spotlight} />

      {/* Subtle scanlines overlay for the SAO VR display feel */}
      <div
        className="fixed inset-0 -z-5 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(92,196,240,0.5) 3px, transparent 4px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* VR vignette */}
      <div
        className="fixed inset-0 -z-5 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,4,8,0.85) 100%)',
        }}
      />

      {/* VR chromatic aberration edge tint */}
      <div
        className="fixed inset-0 -z-5 pointer-events-none opacity-30"
        style={{
          background:
            'linear-gradient(90deg, rgba(190, 33, 86, 0.08) 0%, transparent 8%, transparent 92%, rgba(43, 115, 179, 0.08) 100%)',
        }}
      />

      {/* Persistent VR HUD corner markers (like a VR headset overlay) */}
      <VrCornerMarkers />

      <AnimatePresence mode="wait">
        {stage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {stage === 'linkstart' && (
          <motion.div
            key="linkstart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LinkStartTransition onDone={handleLinkStartDone} />
          </motion.div>
        )}

        {stage === 'creation' && (
          <motion.div
            key="creation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CharacterCreation
              onComplete={handleCreationComplete}
              onBack={() => setStage('login')}
              onCardHover={handleCardHover}
            />
          </motion.div>
        )}

        {stage === 'entering' && (
          <motion.div
            key="entering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <EnteringAincrad onDone={() => setStage('game')} />
          </motion.div>
        )}

        {stage === 'game' && playerName && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GameScreen playerName={playerName} gender={gender!} isAdmin={isAdmin} onExit={handleExitGame} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/**
 * VR headset-style corner markers — small angular brackets at each corner of
 * the viewport, giving the impression of looking through a VR HMD.
 */
function VrCornerMarkers() {
  const cornerStyle = (position: 'tl' | 'tr' | 'bl' | 'br') => {
    const base: React.CSSProperties = {
      position: 'fixed',
      width: '32px',
      height: '32px',
      pointerEvents: 'none',
      zIndex: 5,
      opacity: 0.6,
    };
    const color = 'rgba(92, 196, 240, 0.6)';
    switch (position) {
      case 'tl':
        return {
          ...base,
          top: '16px',
          left: '16px',
          borderTop: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
        };
      case 'tr':
        return {
          ...base,
          top: '16px',
          right: '16px',
          borderTop: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        };
      case 'bl':
        return {
          ...base,
          bottom: '16px',
          left: '16px',
          borderBottom: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
        };
      case 'br':
        return {
          ...base,
          bottom: '16px',
          right: '16px',
          borderBottom: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        };
    }
  };
  return (
    <>
      <div style={cornerStyle('tl')} aria-hidden />
      <div style={cornerStyle('tr')} aria-hidden />
      <div style={cornerStyle('bl')} aria-hidden />
      <div style={cornerStyle('br')} aria-hidden />
    </>
  );
}

/**
 * "Link Start" transition — full-screen VR dive sequence.
 * Expanding rings + flash + "LINK START" text, exactly like the anime.
 */
function LinkStartTransition({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      {/* Concentric expanding rings */}
      {[0, 0.2, 0.4, 0.6].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            borderColor: '#5CC4F0',
            boxShadow: '0 0 40px rgba(43, 115, 179, 0.8)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.9 }}
          animate={{ width: '180vmax', height: '180vmax', opacity: 0 }}
          transition={{ duration: 2.2, delay, ease: 'easeOut' }}
        />
      ))}

      {/* Center text */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.h1
          className="text-white tracking-[0.5em] font-light"
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 3.5rem)',
            textShadow:
              '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(43,115,179,0.9)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          LINK START
        </motion.h1>
        <motion.p
          className="tracking-[0.4em] mt-3 text-sm"
          style={{
            color: '#5CC4F0',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          INIZIALIZZAZIONE SISTEMA...
        </motion.p>
      </motion.div>

      {/* Final flash */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 0] }}
        transition={{ duration: 2.6, times: [0, 0.7, 0.85, 1] }}
      />
    </div>
  );
}

/**
 * Brief "Entering Aincrad" splash shown after character creation completes.
 * HUGE NerveGear (preponderant), SAO font, no extra subtitle line.
 */
function EnteringAincrad({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center px-6">
      {/* Pulsing concentric rings around NerveGear */}
      {[0, 0.5, 1].map((delay, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 'min(50vmin, 460px)',
            height: 'min(50vmin, 460px)',
            border: '1px solid rgba(43, 115, 179, 0.45)',
          }}
          animate={{
            scale: [1, 1.7, 1.7],
            opacity: [0.7, 0, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
          aria-hidden
        />
      ))}

      {/* HUGE NerveGear (preponderant) */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="mb-6"
      >
        <motion.div
          className="relative mx-auto"
          animate={{
            filter: [
              'drop-shadow(0 0 25px rgba(43, 115, 179, 0.7))',
              'drop-shadow(0 0 60px rgba(43, 115, 179, 1))',
              'drop-shadow(0 0 25px rgba(43, 115, 179, 0.7))',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src="/sao/login/SAO_Nervegear.svg"
            alt="NerveGear"
            className="w-[260px] sm:w-[400px] md:w-[500px] h-auto"
            style={{ maxWidth: '60vw' }}
          />
        </motion.div>
      </motion.div>

      {/* Subtitle: SWORD ART ONLINE VRMMORPG + V ALPHA 1.0 inline */}
      <motion.div
        className="flex items-baseline gap-3 flex-wrap justify-center mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <p
          className="tracking-[0.4em]"
          style={{
            fontSize: 'clamp(0.95rem, 2.8vw, 1.5rem)',
            color: '#5CC4F0',
            textShadow: '0 0 14px rgba(92, 196, 240, 0.8)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
          }}
        >
          SWORD ART ONLINE VRMMORPG
        </p>
        <span
          className="tracking-[0.25em]"
          style={{
            fontSize: 'clamp(0.7rem, 2vw, 1.05rem)',
            color: '#FBFBFB',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.6)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            padding: '2px 10px',
            border: '1px solid rgba(92, 196, 240, 0.6)',
            clipPath:
              'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            background: 'rgba(43, 115, 179, 0.15)',
          }}
        >
          V ALPHA 1.0
        </span>
      </motion.div>

      <motion.p
        className="tracking-[0.4em] mt-2 text-sm"
        style={{
          color: '#5CC4F0',
          textShadow: '0 0 12px rgba(92, 196, 240, 0.7)',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        BENVENUTO AD AINCRAD
      </motion.p>

      <motion.div
        className="mt-10 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#5CC4F0',
              boxShadow: '0 0 10px rgba(43,115,179,0.8)',
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
