import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'

// Mount in the asset Suspense boundary, then allow two rendered frames for
// initial shader compilation and texture uploads before revealing the scene.
export function SceneReady ({ onReady }) {
  const frames = useRef(0)
  const sent = useRef(false)
  useFrame(() => {
    const { active, errors } = useProgress.getState()
    if (sent.current || active || errors.length > 0) return
    frames.current++
    if (frames.current >= 3) {
      sent.current = true
      onReady?.()
    }
  })
  return null
}
