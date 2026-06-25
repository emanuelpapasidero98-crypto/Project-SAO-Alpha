'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * SAO Particle Background
 * Interactive 3D particle field rendered with React Three Fiber.
 *
 * Features:
 * - ~1500 floating particles arranged in a 3D volume
 * - Two point lights that follow the mouse (one cool cyan, one warm white)
 * - Particles react to cursor proximity (gentle repulsion)
 * - Subtle parallax depth on mouse move
 * - All visuals are procedurally generated (no external assets needed here)
 */

interface ParticleFieldProps {
  glowColor?: string;
  spotlight?: { x: number; y: number; intensity: number } | null;
}

function ParticleField({ glowColor = '#2B73B3', spotlight }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const { mouse } = useThree();

  const { positions, basePositions, sizes } = useMemo(() => {
    const COUNT = 1500;
    const positions = new Float32Array(COUNT * 3);
    const basePositions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 36;
      const z = (Math.random() - 0.5) * 30 - 5;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      sizes[i] = Math.random() * 0.08 + 0.02;
    }
    return { positions, basePositions, sizes };
  }, []);

  // Uniforms object — created once, updated in useFrame via ref
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(glowColor) },
      uColor2: { value: new THREE.Color('#ffffff') },
    }),
    // glowColor is stable across renders for our use case
    [],
  );

  const vertexShader = useMemo(
    () => /* glsl */ `
      attribute float size;
      uniform float uTime;
      varying vec3 vPosition;
      varying float vSize;
      void main() {
        vPosition = position;
        vSize = size;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    [],
  );

  const fragmentShader = useMemo(
    () => /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uTime;
      varying vec3 vPosition;
      varying float vSize;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        alpha = pow(alpha, 1.6);
        float twinkle = 0.7 + 0.3 * sin(uTime * 1.5 + vPosition.x * 0.5 + vPosition.y * 0.3);
        vec3 color = mix(uColor, uColor2, 0.3);
        gl_FragColor = vec4(color, alpha * twinkle * 0.85);
      }
    `,
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
    }

    if (pointsRef.current) {
      const targetRotY = mouse.x * 0.15;
      const targetRotX = -mouse.y * 0.1;
      pointsRef.current.rotation.y += (targetRotY - pointsRef.current.rotation.y) * 0.04;
      pointsRef.current.rotation.x += (targetRotX - pointsRef.current.rotation.x) * 0.04;

      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const mx = mouse.x * 30;
      const my = mouse.y * 18;

      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePositions[i];
        const by = basePositions[i + 1];
        const bz = basePositions[i + 2];

        const wx = bx + Math.sin(t * 0.3 + by * 0.2) * 0.4;
        const wy = by + Math.cos(t * 0.25 + bx * 0.15) * 0.4;
        const wz = bz + Math.sin(t * 0.2 + bx * 0.1) * 0.3;

        const dx = wx - mx;
        const dy = wy - my;
        const dist2 = dx * dx + dy * dy;
        const radius = 8;
        if (dist2 < radius * radius) {
          const dist = Math.sqrt(dist2) + 0.0001;
          const force = (1 - dist / radius) * 1.5;
          arr[i] = wx + (dx / dist) * force;
          arr[i + 1] = wy + (dy / dist) * force;
          arr[i + 2] = wz;
        } else {
          arr[i] = wx;
          arr[i + 1] = wy;
          arr[i + 2] = wz;
        }
      }
      posAttr.needsUpdate = true;
    }

    if (light1Ref.current) {
      const targetX = mouse.x * 20;
      const targetY = mouse.y * 12;
      light1Ref.current.position.x += (targetX - light1Ref.current.position.x) * 0.08;
      light1Ref.current.position.y += (targetY - light1Ref.current.position.y) * 0.08;
      light1Ref.current.position.z = 8;
    }
    if (light2Ref.current) {
      const targetX = -mouse.x * 12;
      const targetY = -mouse.y * 8;
      light2Ref.current.position.x += (targetX - light2Ref.current.position.x) * 0.06;
      light2Ref.current.position.y += (targetY - light2Ref.current.position.y) * 0.06;
      light2Ref.current.position.z = 12;
    }

    if (spotlight && spotlight.intensity > 0 && light1Ref.current) {
      const boost = spotlight.intensity * 2;
      light1Ref.current.intensity = 6 + boost;
    } else if (light1Ref.current) {
      light1Ref.current.intensity += (6 - light1Ref.current.intensity) * 0.1;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <pointLight
        ref={light1Ref}
        color={glowColor}
        intensity={6}
        distance={45}
        decay={1.5}
        position={[0, 0, 8]}
      />
      <pointLight
        ref={light2Ref}
        color="#ffffff"
        intensity={2.5}
        distance={50}
        decay={1.8}
        position={[0, 0, 12]}
      />
      <ambientLight intensity={0.18} color={glowColor} />
    </>
  );
}

function VolumetricPlanes({ glowColor = '#2B73B3' }: { glowColor?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -12]}>
      <planeGeometry args={[80, 50, 1, 1]} />
      <meshBasicMaterial
        color={glowColor}
        transparent
        opacity={0.025}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function ParticleBackground({
  glowColor = '#2B73B3',
  spotlight = null,
}: ParticleFieldProps) {
  // Lazy initial state — avoids setState-in-effect lint error
  const [dpr] = useState<[number, number]>(() => {
    if (typeof window === 'undefined') return [1, 2];
    return window.innerWidth < 768 ? [1, 1.2] : [1, 2];
  });

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 18], fov: 60 }}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ParticleField glowColor={glowColor} spotlight={spotlight} />
        <VolumetricPlanes glowColor={glowColor} />
        <fog attach="fog" args={['#020814', 25, 55]} />
      </Canvas>
    </div>
  );
}
