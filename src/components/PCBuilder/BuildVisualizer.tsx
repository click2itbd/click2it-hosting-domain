import React, { Suspense, useRef } from 'react';
import { Product } from '../../types';
import { RefreshCw } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Text, Plane, Edges } from '@react-three/drei';
import * as THREE from 'three';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div className="p-4 text-red-500">3D Preview Error: {this.state.error?.message}</div>;
    return this.props.children;
  }
}

interface BuildVisualizerProps {
  selectedComponents: Record<string, Product>;
}

const ComponentModel = ({ category, selected }: { category: string, selected: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    if (selected && category !== 'motherboard' && category !== 'casing') {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + category.length) * 0.1 + (meshRef.current.userData.baseY || 0);
    }
  });

  const wireframeProps = { wireframe: true, color: "#38bdf8", transparent: true, opacity: 0.3 };
  
  switch (category) {
    case 'casing':
      return (
        <group position={[0, 4, 0]}>
          <Box args={[14, 16, 12]} position={[0, 0, 1]}>
            <meshStandardMaterial color="#020617" transparent opacity={0.1} depthWrite={false} />
            <Edges scale={1.0} color="#334155" />
          </Box>
        </group>
      );
    case 'motherboard':
      return (
        <group position={[0, 4, -4.5]}>
          <Box args={[11, 14, 0.4]}>
            <meshStandardMaterial color={selected ? "#0f172a" : "#1e293b"} {...(selected ? {} : wireframeProps)} />
          </Box>
          {selected && (
            <>
              <Box args={[2, 4, 0.6]} position={[-4, 4, 0.5]}>
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </Box>
              <Box args={[8, 2, 0.6]} position={[0, -5, 0.5]}>
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </Box>
            </>
          )}
        </group>
      );
    case 'cpu':
      return (
        <group position={[0, 7, -4]} ref={meshRef} userData={{ baseY: 7 }}>
          <Box args={[2.5, 2.5, 0.4]} position={[0, 0, 0]}>
            <meshStandardMaterial color={selected ? "#94a3b8" : "#3b82f6"} metalness={selected ? 0.9 : 0} {...(selected ? {} : wireframeProps)} />
          </Box>
          {selected && <Text position={[0, 0, 0.25]} fontSize={0.5} color="#0f172a" fontWeight="bold">CPU</Text>}
        </group>
      );
    case 'ram':
      return (
        <group position={[3.5, 7, -4]} ref={meshRef} userData={{ baseY: 7 }}>
          {[0, 0.8, 1.6, 2.4].map((offset, i) => (
            <group key={i} position={[offset - 1.2, 0, 0.8]}>
              <Box args={[0.3, 3.5, 1.2]}>
                <meshStandardMaterial color={selected ? "#1e293b" : "#3b82f6"} metalness={selected ? 0.8 : 0} {...(selected ? {} : wireframeProps)} />
              </Box>
              {selected && (
                <Box args={[0.2, 3.4, 0.1]} position={[0, 0, 0.6]}>
                  <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} toneMapped={false} />
                </Box>
              )}
            </group>
          ))}
        </group>
      );
    case 'graphics-card':
      return (
        <group position={[0, 1, -2]} ref={meshRef} userData={{ baseY: 1 }}>
          <Box args={[9.5, 1.8, 4.5]} position={[0, -0.9, 0]}>
            <meshStandardMaterial color={selected ? "#0f172a" : "#3b82f6"} metalness={selected ? 0.7 : 0} {...(selected ? {} : wireframeProps)} />
          </Box>
          {selected && (
            <group position={[-3, -0.5, 2.3]}>
              <Box args={[2.5, 0.4, 0.1]}>
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} toneMapped={false} />
              </Box>
              <Text position={[0, 0, 0.1]} fontSize={0.25} color="black" fontWeight="bold">RTX GEFORCE</Text>
            </group>
          )}
        </group>
      );
    case 'power-supply':
      return (
        <group position={[-3, -2.5, -1]} ref={meshRef} userData={{ baseY: -2.5 }}>
          <Box args={[4.5, 3.5, 4.5]}>
            <meshStandardMaterial color={selected ? "#020617" : "#3b82f6"} metalness={selected ? 0.9 : 0} {...(selected ? {} : wireframeProps)} />
          </Box>
          {selected && <Text position={[0, 0, 2.3]} fontSize={0.8} color="white">PSU</Text>}
        </group>
      );
    case 'storage':
      return (
        <group position={[3, -3, -1]} ref={meshRef} userData={{ baseY: -3 }}>
          <Box args={[3.5, 0.6, 4.5]}>
            <meshStandardMaterial color={selected ? "#1e293b" : "#3b82f6"} metalness={selected ? 0.8 : 0} {...(selected ? {} : wireframeProps)} />
          </Box>
          {selected && <Text position={[0, 0.35, 0]} fontSize={0.6} rotation={[-Math.PI/2, 0, 0]} color="#38bdf8">SSD</Text>}
        </group>
      );
    case 'cpu-cooler':
      return (
        <group position={[0, 7, -3]} ref={meshRef} userData={{ baseY: 7 }}>
          <Cylinder args={[1.5, 1.5, 1.8, 32]} rotation={[Math.PI/2, 0, 0]}>
            <meshStandardMaterial color={selected ? "#0f172a" : "#3b82f6"} metalness={selected ? 0.8 : 0} {...(selected ? {} : wireframeProps)} />
          </Cylinder>
          {selected && (
            <Cylinder args={[1.3, 1.3, 1.85, 32]} rotation={[Math.PI/2, 0, 0]}>
               <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.5} toneMapped={false} />
            </Cylinder>
          )}
        </group>
      );
    default:
      return null;
  }
};

export const BuildVisualizer: React.FC<BuildVisualizerProps> = ({ selectedComponents }) => {
  const componentsToRender = ['casing', 'motherboard', 'cpu', 'cpu-cooler', 'ram', 'graphics-card', 'storage', 'power-supply'];

  return (
    <div className="bg-slate-950 rounded-3xl p-4 overflow-hidden relative border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.12)] flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-2 z-20 absolute top-4 left-4 right-4 pointer-events-none">
        <h4 className="text-white font-bold text-sm drop-shadow-md">Realistic 3D Preview</h4>
        <div className="flex items-center gap-2 text-slate-300 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-auto shadow-lg border border-slate-700">
          <RefreshCw size={12} className="animate-spin-slow text-indigo-400" />
          Drag to rotate
        </div>
      </div>

      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative z-0">
        <ErrorBoundary>
          <Canvas camera={{ position: [-15, 12, 25], fov: 40 }}>
            <color attach="background" args={['#020617']} />
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 20, 15]} intensity={2} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#a855f7" />
            
            <Suspense fallback={null}>
              <group position={[0, -2, 0]}>
                {componentsToRender.map(cat => (
                  <ComponentModel 
                    key={cat} 
                    category={cat} 
                    selected={!!selectedComponents[cat]} 
                  />
                ))}
              </group>
            </Suspense>

            <Plane args={[60, 60]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.5, 0]}>
              <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.2} />
            </Plane>
            <gridHelper args={[60, 60, '#1e293b', '#0f172a']} position={[0, -6.49, 0]} />

            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              minPolarAngle={0}
              maxPolarAngle={Math.PI/2 - 0.05}
              autoRotate
              autoRotateSpeed={1.0}
              minDistance={15}
              maxDistance={40}
            />
          </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
};
