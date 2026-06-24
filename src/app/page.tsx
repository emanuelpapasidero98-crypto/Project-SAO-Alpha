'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from '@/components/sao/ParticleBackground';
import LoginScreen from '@/components/sao/LoginScreen';
import CharacterCreation from '@/components/sao/CharacterCreation';
import { useSaoSound } from '@/hooks/useSaoSound';

type Stage = 'login' | 'linkstart' | 'creation' | 'entering';

interface Spotlight {
  x: number;
  y: number;
  intensity: number;
}

export default function Home() {
  const { play } = useSaoSound();
  const [stage, setStage] = useState<Stage>('login');
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [glowColor, setGlowColor] = useState<string>('#5CC4F0');

  const handleLogin = () => {
    setStage('linkstart');
    // Link Start sequence plays in the transition component
  };

  const handleLinkStartDone = () => {
    setStage('creation');
  };

  const handleCreationComplete = () => {
    setStage('entering');
    setTimeout(() => {
      // Loop back to login for demo purposes
      setStage('login');
    }, 5000);
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

      {/* Subtle scanlines overlay for the SAO "VR display" feel */}
      <div
        className="fixed inset-0 -z-5 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(92,196,240,0.5) 3px, transparent 4px)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Vignette */}
      <div
        className="fixed inset-0 -z-5 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,4,8,0.8) 100%)',
        }}
      />

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
            <EnteringAincrad onDone={() => setStage('login')} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/**
 * "Link Start" transition — full-screen blue/white flash sequence
 * inspired by the iconic SAO login moment.
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
          className="absolute rounded-full border border-cyan-300"
          initial={{ width: 0, height: 0, opacity: 0.9 }}
          animate={{ width: '180vmax', height: '180vmax', opacity: 0 }}
          transition={{ duration: 2.2, delay, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 40px rgba(92,196,240,0.8)',
          }}
        />
      ))}

      {/* Center logo / text */}
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
            textShadow: '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(92,196,240,0.9)',
          }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          LINK START
        </motion.h1>
        <motion.p
          className="text-cyan-200 tracking-[0.4em] mt-3 text-sm"
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
 */
function EnteringAincrad({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <div className="relative w-32 h-32 mx-auto">
          <img
            src="/sao/login/SAO_Nervegear.svg"
            alt="NerveGear"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 0 30px rgba(92,196,240,0.8))' }}
          />
        </div>
      </motion.div>
      <motion.h2
        className="text-cyan-100 tracking-[0.4em] font-light"
        style={{
          fontSize: 'clamp(1.2rem, 3vw, 2rem)',
          textShadow: '0 0 25px rgba(92, 196, 240, 0.7)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        BENVENUTO AD AINCRAD
      </motion.h2>
      <motion.p
        className="text-cyan-200/60 tracking-[0.3em] mt-4 text-xs sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        IL MONDO DI SPADA E MAGIA TI ATTENDE
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
            className="w-2 h-2 rounded-full bg-cyan-300"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{ boxShadow: '0 0 10px rgba(92,196,240,0.8)' }}
          />
        ))}
      </motion.div>
    </div>
  );
}
