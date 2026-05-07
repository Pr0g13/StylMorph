import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

const Particles = () => {
  const pointsRef = useRef();

  const count = 2500;
  const setParticles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 15 + Math.random() * 25;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta); // x
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // y
      positions[i * 3 + 2] = radius * Math.cos(phi); // z
    }
    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={setParticles.length / 3}
          array={setParticles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#8b5cf6" transparent opacity={0.6} sizeAttenuation={true} />
    </points>
  );
};

const AbstractMesh = () => {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if(meshRef.current){
      meshRef.current.rotation.y += delta * 0.06;
      meshRef.current.rotation.z += delta * 0.03;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[14, 2, 120, 16]} />
      <meshStandardMaterial color="#4f46e5" wireframe transparent opacity={0.04} />
    </mesh>
  );
};

export default function Global3DBackground() {
  return (
    <div className="fixed inset-0 z-[-10] bg-black bg-gradient-to-br from-black via-[#0a0a0e] to-[#0f0a1f] overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 30], fov: 75 }} gl={{ antialias: false, alpha: false }}>
        <fog attach="fog" args={['#0a0a0e', 15, 45]} />
        <ambientLight intensity={0.5} />
        <Particles />
        <AbstractMesh />
      </Canvas>
    </div>
  );
}
