import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { getTerrainHeight } from './terrain'

const modelUrl = `${import.meta.env.BASE_URL}models/emberwing.glb`

export function Emberwing () {
  const { scene } = useGLTF(modelUrl)
  const model = useMemo(() => {
    const instance = scene.clone(true)
    instance.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    // Fit the full wingspan within 12 meters and put the feet on the floor.
    const scale = 12 / Math.max(size.x, size.y, size.z)
    instance.scale.multiplyScalar(scale)
    instance.position.multiplyScalar(scale)
    instance.position.add(new Vector3(-center.x * scale, getTerrainHeight(0, 0) - bounds.min.y * scale, -center.z * scale))
    instance.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    return instance
  }, [scene])

  return <primitive object={model} dispose={null} />
}

useGLTF.preload(modelUrl)
