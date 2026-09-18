import { Suspense, useMemo } from 'react'
import { Object3D } from 'three'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { EffectComposer } from '@react-three/postprocessing'
import { Ground } from './Ground'
import { MagicCircle } from './MagicCircle'
import { SceneReady } from './SceneReady'
import { VolumetricFog } from './VolumetricFog'
import { Emberwing } from './Emberwing'
import { Sparks } from './Sparks'
import { DemonTitle } from './DemonTitle'
import { TitleInferno } from './TitleInferno'
import { WallMuralMaterial } from './WallMuralMaterial'

const keyLightPosition = [-7, 1.2, 6]
const fillLightPosition = [4, 5, -7]
const cornerLightPosition = [-28, 12, -28]
// Approximate 3500 K blackbody color in sRGB.
const cornerLightColor = '#ffc18d'

const roomPanels = [
  { position: [0, 16, -32.25], size: [65, 32, 0.5] },
  { position: [0, 16, 32.25], size: [65, 32, 0.5] },
  { position: [-32.25, 16, 0], size: [0.5, 32, 64] },
  { position: [32.25, 16, 0], size: [0.5, 32, 64] },
  { position: [0, 32.25, 0], size: [65, 0.5, 65] },
  { position: [0, -0.26, 0], size: [65, 0.5, 65] }
]

function Room () {
  return (
    <group>
      {roomPanels.map(({ position, size }, index) => (
        <mesh key={index} position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          {index === 0
            ? <WallMuralMaterial />
            : <meshStandardMaterial color='#211b1d' roughness={0.88} metalness={0.08} />}
        </mesh>
      ))}
    </group>
  )
}

export function Scene ({ onReady }) {
  const lightTarget = useMemo(() => {
    const target = new Object3D()
    target.position.set(0, 3, 0)
    return target
  }, [])

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [16, 10, 20], fov: 55, near: 0.1, far: 120 }} shadows='percentage'>
      <Suspense fallback={null}>
        <color attach='background' args={['#080203']} />
        <primitive object={lightTarget} />
        <spotLight
          castShadow
          intensity={4}
          color='#ff641c'
          target={lightTarget}
          decay={0}
          angle={0.65}
          penumbra={0.65}
          position={keyLightPosition}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={100}
          shadow-normalBias={0.05}
        />
        <spotLight
          castShadow
          intensity={3.2}
          target={lightTarget}
          decay={0}
          angle={0.75}
          penumbra={0.65}
          position={fillLightPosition}
          color='#ffe080'
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-normalBias={0.04}
        />
        <pointLight position={[12, 3, -16]} color='#b50818' intensity={35} distance={38} decay={2} />
        <spotLight
          castShadow
          position={cornerLightPosition}
          target={lightTarget}
          color={cornerLightColor}
          intensity={0.18}
          decay={0}
          angle={0.65}
          penumbra={0.8}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={100}
          shadow-normalBias={0.05}
        />
        <Room />
        <Emberwing />
        <Ground />
        <MagicCircle />
        <Sparks />
        <DemonTitle />
        <Grid
          visible={false}
          args={[64, 64]}
          position={[0, 0.01, 0]}
          cellColor='#94a3b8'
          cellSize={1}
          cellThickness={0.6}
          fadeDistance={200}
          fadeStrength={1}
          infiniteGrid={false}
          sectionColor='#64748b'
          sectionSize={8}
          sectionThickness={1}
        />
        <OrbitControls
          makeDefault
          target={[0, 2, 0]}
          enablePan={false}
          minDistance={5}
          maxDistance={28}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
        <EffectComposer multisampling={0}>
          <TitleInferno />
          <VolumetricFog keyPosition={keyLightPosition} fillPosition={fillLightPosition} cornerPosition={cornerLightPosition} />
        </EffectComposer>
        <SceneReady onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
