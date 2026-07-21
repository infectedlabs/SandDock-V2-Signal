'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Tracks 0..1 scroll progress of a DOM element through the viewport, only
// while the element is actually visible — avoids a page-wide scroll
// listener running for every section at once.
function useScrollProgress(containerRef, active) {
  const progress = useRef(0);

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const handle = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const raw = 1 - (rect.top + rect.height / 2) / (vh + rect.height);
      progress.current = Math.min(Math.max(raw, 0), 1);
    };

    handle();
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
  }, [active, containerRef]);

  return progress;
}

// ─── Scene variants (each a small crypto-themed 3D object) ───────────────

function CoinScene({ progress, color = '#3D5AFE', ringColor = '#9DB2F5' }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.5;
    group.current.rotation.x = -0.3 + progress.current * 0.6;
    group.current.position.y = -0.3 + progress.current * 0.5;
  });
  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.22, 48]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[1.0, 0.05, 16, 48]} />
        <meshStandardMaterial color={ringColor} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <torusGeometry args={[1.0, 0.05, 16, 48]} />
        <meshStandardMaterial color={ringColor} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function NetworkScene({ progress, color = '#3D5AFE' }) {
  const group = useRef();

  const { nodePositions, edgeGeometry } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.1, 0);
    const posAttr = geo.attributes.position;
    const pts = [];
    for (let i = 0; i < posAttr.count; i++) {
      const p = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (!pts.some((u) => u.distanceTo(p) < 0.001)) pts.push(p);
    }
    return { nodePositions: pts, edgeGeometry: new THREE.EdgesGeometry(geo) };
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.3;
    group.current.rotation.x = 0.2 + progress.current * 0.5;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
      {nodePositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function BarsScene({ progress, color = '#3D5AFE' }) {
  const heights = useMemo(() => [0.6, 1.2, 0.9, 1.6, 1.1, 0.7], []);
  const group = useRef();

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = 0.5 + Math.sin(progress.current * Math.PI) * 0.35;
  });

  const grow = Math.min(progress.current * 1.4, 1);

  return (
    <group ref={group} rotation={[0.15, 0, 0]}>
      {heights.map((h, i) => {
        const displayH = Math.max(h * (0.15 + grow * 0.85), 0.02);
        const x = (i - (heights.length - 1) / 2) * 0.42;
        return (
          <mesh key={i} position={[x, displayH / 2 - 0.8, 0]}>
            <boxGeometry args={[0.3, displayH, 0.3]} />
            <meshStandardMaterial color={i % 2 === 0 ? color : '#9DB2F5'} metalness={0.4} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function CandlesScene({ progress }) {
  const data = useMemo(
    () => [
      { h: 0.9, body: 0.5, up: true },
      { h: 1.1, body: 0.7, up: true },
      { h: 0.7, body: 0.3, up: false },
      { h: 1.3, body: 0.9, up: true },
      { h: 0.8, body: 0.4, up: false },
      { h: 1.5, body: 1.0, up: true },
    ],
    []
  );
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.15;
  });

  const scale = 0.3 + Math.min(progress.current * 1.3, 1) * 0.7;

  return (
    <group ref={group} rotation={[0.1, -0.3, 0]} scale={[1, scale, 1]}>
      {data.map((c, i) => {
        const x = (i - (data.length - 1) / 2) * 0.42;
        const clr = c.up ? '#10b981' : '#ef4444';
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, c.h, 8]} />
              <meshStandardMaterial color={clr} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.18, c.body, 0.18]} />
              <meshStandardMaterial color={clr} metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function CubeScene({ progress, color = '#3D5AFE' }) {
  const group = useRef();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.36, 1.36, 1.36)), []);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.x += delta * 0.25;
    group.current.rotation.y += delta * 0.35 + progress.current * 0.01;
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} transparent opacity={0.85} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#ffffff" />
      </lineSegments>
    </group>
  );
}

function ParticlesScene({ progress, color = '#3D5AFE' }) {
  const pointsRef = useRef();
  const positions = useMemo(() => {
    const count = 110;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 3.2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x = progress.current * 0.3;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.045} sizeAttenuation transparent opacity={0.65} />
    </points>
  );
}

const VARIANTS = {
  coin: CoinScene,
  network: NetworkScene,
  bars: BarsScene,
  candles: CandlesScene,
  cube: CubeScene,
  particles: ParticlesScene,
};

export default function CryptoScene3D({ variant = 'coin', className = '', color, ringColor }) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const progress = useScrollProgress(containerRef, inView);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
      rootMargin: '250px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Scene = VARIANTS[variant] || CoinScene;

  return (
    <div ref={containerRef} className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      {inView && (
        <Canvas
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0, 4], fov: 42 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <directionalLight position={[-3, -2, -3]} intensity={0.35} color="#3D5AFE" />
          <Scene progress={progress} color={color} ringColor={ringColor} />
        </Canvas>
      )}
    </div>
  );
}
