import { useCallback, useState } from 'react'
import { Scene } from '@/Scene'
import { LoadingScreen } from '@/LoadingScreen'

export function App () {
  const [ready, setReady] = useState(false)
  const revealScene = useCallback(() => setReady(true), [])
  return (
    <main className='fixed inset-0 bg-black'>
      <Scene onReady={revealScene} />
      <LoadingScreen ready={ready} />
    </main>
  )
}
