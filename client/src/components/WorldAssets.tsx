
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldObjectType } from '../types';
import * as THREE from 'three';

interface ObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  variant?: 'real' | 'ghost';
}

const GhostMaterial: React.FC = () => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.15 + Math.sin(clock.elapsedTime * 4) * 0.05;
      matRef.current.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.3;
    }
  });
  return (
    <meshStandardMaterial 
      ref={matRef}
      color="#38bdf8" 
      transparent 
      opacity={0.2} 
      wireframe 
      emissive="#38bdf8"
      emissiveIntensity={0.8}
      side={THREE.DoubleSide}
    />
  );
};

export const WorldAsset: React.FC<{ type: WorldObjectType } & ObjectProps> = ({ 
  type, 
  position, 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1],
  variant = 'real' 
}) => {
  const isGhost = variant === 'ghost';

  const renderMaterial = (color: string, metalness = 0.3, roughness = 0.4, emissive?: string) => {
    if (isGhost) return <GhostMaterial />;
    return (
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness} 
        emissive={emissive} 
        emissiveIntensity={emissive ? 0.3 : 0} 
      />
    );
  };

  switch (type) {
    case 'wall':
      return (
        <mesh position={[position[0], position[1] + 1.25, position[2]]} rotation={rotation} scale={scale} castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.5, 0.3]} />
          {renderMaterial("#94a3b8", 0.1, 0.8)}
        </mesh>
      );
    case 'modular_unit':
      return (
        <group position={[position[0], position[1] + 1.25, position[2]]} rotation={rotation} scale={scale}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.5, 2.5, 2.5]} />
            {renderMaterial("#1e293b", 0.6, 0.1, "#334155")}
          </mesh>
          {!isGhost && (
            <mesh scale={0.9}>
              <boxGeometry args={[2.5, 2.5, 2.5]} />
              <meshStandardMaterial color="#38bdf8" opacity={0.1} transparent wireframe />
            </mesh>
          )}
        </group>
      );
    case 'solar_panel':
      return (
        <group position={[position[0], position[1] + 0.5, position[2]]} rotation={rotation} scale={scale}>
          <mesh rotation={[-Math.PI / 5, 0, 0]} position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.8, 0.08, 1.4]} />
            {renderMaterial("#1e40af", 1, 0, "#2563eb")}
          </mesh>
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1]} />
            {renderMaterial("#475569")}
          </mesh>
        </group>
      );
    case 'water_collector':
      return (
        <group position={[position[0], position[1] + 0.6, position[2]]} rotation={rotation} scale={scale}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.7, 0.9, 1.2, 16]} />
            {renderMaterial("#0369a1", 0.2, 0.1, "#0ea5e9")}
          </mesh>
          <mesh position={[0, 0.75, 0]} castShadow>
            <coneGeometry args={[1.0, 0.4, 16]} />
            {renderMaterial("#94a3b8")}
          </mesh>
        </group>
      );
    case 'roof':
      return (
        <mesh position={[position[0], position[1] + 0.75, position[2]]} rotation={rotation} scale={scale} castShadow receiveShadow>
          <coneGeometry args={[2.5, 1.5, 4]} />
          {renderMaterial("#451a03", 0, 1)}
        </mesh>
      );
    case 'tree':
      return (
        <group position={position} scale={scale}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 3]} />
            {renderMaterial("#3f2b1c")}
          </mesh>
          <mesh position={[0, 3.5, 0]} castShadow>
            <sphereGeometry args={[1.3, 12, 12]} />
            {renderMaterial("#064e3b")}
          </mesh>
        </group>
      );
    default:
      return (
        <mesh position={[position[0], position[1] + 0.5, position[2]]} scale={scale} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          {renderMaterial("#6366f1")}
        </mesh>
      );
  }
};
