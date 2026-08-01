import { useEffect, useState } from 'react'
import Lightfall from './Lightfall'

const codeBits = ['const idea = build();', 'npm run ship', '<Mindset />', 'git commit -m "learn"', 'function solve(problem) { }', '=> createImpact()', 'import { curiosity }', 'while (learning) { grow(); }', 'return <Future />', 'npm install confidence']
const lightfallColors = ['#B8FF3D', '#FF5C96', '#B9A7FF']

export default function Hero3D() {
  const [shade, setShade] = useState(0)

  useEffect(() => {
    const updateShade = () => {
      const viewport = Math.max(window.innerHeight, 1)
      const progress = Math.min(window.scrollY / (viewport * 1.05), 1)
      setShade(progress)
    }
    updateShade()
    window.addEventListener('scroll', updateShade, { passive: true })
    window.addEventListener('resize', updateShade)
    return () => {
      window.removeEventListener('scroll', updateShade)
      window.removeEventListener('resize', updateShade)
    }
  }, [])

  return <div className="hero-3d-background" aria-hidden="true">
    <Lightfall colors={lightfallColors} backgroundColor="transparent" speed={0.5} streakCount={2} streakWidth={1} streakLength={1} glow={1} density={0.6} twinkle={1} zoom={3} backgroundGlow={0.5} opacity={1} mouseInteraction mouseStrength={0.5} mouseRadius={1}/>
    <div className="neon-blob neon-blob-one"/>
    <div className="neon-blob neon-blob-two"/>
    <div className="neon-grid"/>
    <div className="code-stream">{codeBits.map((bit, index) => <span key={bit} className="code-bit" style={{ '--i': index }}>{bit}</span>)}</div>
    <div className="background-shade" style={{ opacity: shade * 0.78 }}/>
  </div>
}
