import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, MeshDistortMaterial, Environment } from '@react-three/drei';

const AbstractHologram = () => {
  return (
    <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere args={[1.5, 64, 64]} scale={1.2}>
        <MeshDistortMaterial
          color="#818cf8"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.1}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.85}
        />
      </Sphere>
      {/* Dynamic inner core */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial color="#c084fc" wireframe emissive="#c084fc" emissiveIntensity={1.5} />
      </Sphere>
    </Float>
  );
};

export default function Hero3DAnimation() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <pointLight position={[-10, -5, -5]} intensity={1.2} color="#e879f9" />
        
        <AbstractHologram />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={1.5} 
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
