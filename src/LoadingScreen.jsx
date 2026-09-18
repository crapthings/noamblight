import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

const sealPoints = Array.from({ length: 5 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * 2 % 5) * Math.PI * 2 / 5
  return `${60 + Math.cos(angle) * 37},${60 + Math.sin(angle) * 37}`
}).join(' ')

export function LoadingScreen ({ ready }) {
  const { progress, errors, active } = useProgress()
  const [hidden, setHidden] = useState(false)
  const finished = ready && !active && errors.length === 0
  const percentage = finished ? 100 : Math.min(99, Math.max(0, Math.round(progress)))

  useEffect(() => {
    if (!finished) return
    const timeout = window.setTimeout(() => setHidden(true), 650)
    return () => window.clearTimeout(timeout)
  }, [finished])

  if (hidden) return null

  return (
    <div className={`scene-loading${finished ? ' scene-loading--finished' : ''}`} aria-busy={!finished}>
      <div className='scene-loading__content'>
        <svg className='scene-loading__seal' viewBox='0 0 120 120' aria-hidden='true'>
          <circle cx='60' cy='60' r='53' />
          <circle cx='60' cy='60' r='46' strokeDasharray='2 5' />
          <circle cx='60' cy='60' r='39' />
          <polygon points={sealPoints} />
        </svg>
        <p className='scene-loading__eyebrow'>THE GATES BELOW</p>
        <h1 className='scene-loading__title'>DEMON</h1>
        <p className='scene-loading__status' role='status' aria-live='polite'>
          {errors.length > 0 ? 'Loading failed. Please try again.' : finished ? 'The seal is broken' : percentage >= 99 ? 'Awakening the scene' : 'Opening the gates of hell'}
        </p>
        {errors.length > 0
          ? <button className='scene-loading__retry' onClick={() => window.location.reload()}>Retry</button>
          : (
            <div className='scene-loading__progress'>
              <div
                className='scene-loading__track'
                role='progressbar'
                aria-label='Scene loading progress'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
              >
                <div className='scene-loading__fill' style={{ width: `${percentage}%` }} />
              </div>
              <span className='scene-loading__percentage'>{percentage}%</span>
            </div>
            )}
      </div>
    </div>
  )
}
