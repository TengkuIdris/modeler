import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  ContactShadows,
  PerspectiveCamera,
  Center
} from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '@stores/appStore'

// Placeholder mesh when no model is loaded
function PlaceholderMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  return (
    <Center>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshStandardMaterial 
          color="#14b8a6" 
          metalness={0.3} 
          roughness={0.4}
          wireframe
        />
      </mesh>
    </Center>
  )
}

// Model mesh - renders the actual 3D model
function ModelMesh({ meshData }: { meshData: ArrayBuffer }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    // Parse mesh data (GLB/GLTF or OBJ)
    // For now, just create a placeholder
    // In production, use GLTFLoader or OBJLoader
    const geo = new THREE.BoxGeometry(2, 2, 2)
    setGeometry(geo)
    
    return () => geo.dispose()
  }, [meshData])

  if (!geometry) return null

  return (
    <Center>
      <mesh geometry={geometry}>
        <meshStandardMaterial 
          color="#14b8a6" 
          metalness={0.2} 
          roughness={0.5}
        />
      </mesh>
    </Center>
  )
}

// Generation progress indicator
function GenerationIndicator() {
  const { isGenerating, generationProgress } = useAppStore()
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isGenerating) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2
    }
  })

  if (!isGenerating) return null

  return (
    <Center>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color="#14b8a6" 
          metalness={0.5} 
          roughness={0.2}
          wireframe
          transparent
          opacity={0.5 + Math.sin(generationProgress * Math.PI) * 0.5}
        />
      </mesh>
    </Center>
  )
}

// Camera controller for smooth transitions
function CameraController() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(5, 3, 5)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return null
}

export function Viewport3D() {
  const { currentModel, isGenerating } = useAppStore()

  return (
    <div className="w-full h-full canvas-container">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault fov={45} near={0.1} far={1000} />
        <CameraController />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        
        {/* Environment */}
        <Environment preset="city" background={false} />
        
        {/* Grid */}
        <Grid 
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#2a2a32"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#3a3a44"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          position={[0, -0.01, 0]}
        />
        
        {/* Shadows */}
        <ContactShadows 
          position={[0, -0.01, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2} 
          far={4}
        />

        {/* Content */}
        {isGenerating ? (
          <GenerationIndicator />
        ) : currentModel?.meshData ? (
          <ModelMesh meshData={currentModel.meshData} />
        ) : (
          <PlaceholderMesh />
        )}

        {/* Controls */}
        <OrbitControls 
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI - 0.1}
        />
      </Canvas>

      {/* Viewport Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="px-3 py-1.5 bg-surface-900/80 backdrop-blur rounded-lg border border-surface-700">
          <span className="text-xs text-surface-400">
            {isGenerating ? 'Generating...' : currentModel ? currentModel.name : 'No model loaded'}
          </span>
        </div>
      </div>
    </div>
  )
}

