import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, Text3D, Environment, Lightformer } from '@react-three/drei';

function GlassText({ text }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <Center>
      <Text3D
        ref={meshRef}
        font="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/droid/droid_sans_bold.typeface.json"
        size={3.5}
        height={0.5}
        curveSegments={64}
        bevelEnabled
        bevelThickness={0.15}
        bevelSize={0.05}
        bevelOffset={0}
        bevelSegments={32}
      >
        {text}
        {/* Using pure transparency + clearcoat instead of transmission to avoid black rendering on HTML backgrounds */}
        <meshPhysicalMaterial
          color="#ffffff"
          transparent={true}
          opacity={0.15}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          envMapIntensity={3.0}
          side={2} // THREE.DoubleSide
        />
      </Text3D>
    </Center>
  );
}

export default function LiquidGlassText({ text }) {
  return (
    <div className="w-full h-64 md:h-96 pointer-events-auto z-50">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1} />
        
        <GlassText text={text} />

        <Environment resolution={512}>
          {/* Intense studio lighting to create sharp, glossy reflections on the glass bevels */}
          <group rotation={[-Math.PI / 4, -0.3, 0]}>
            <Lightformer intensity={10} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
            <Lightformer intensity={5} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 0.1, 1]} />
            <Lightformer rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[20, 0.5, 1]} />
            <Lightformer rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1, 1]} />
            <Lightformer type="ring" intensity={5} rotation-y={Math.PI / 2} position={[-0.1, -1, -5]} scale={10} />
          </group>
        </Environment>
      </Canvas>
    </div>
  );
}
