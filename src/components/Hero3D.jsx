import { useEffect, useState } from 'react'

const codeBits = ['const idea = build();', 'npm run ship', '<Mindset />', 'git commit -m "learn"', 'function solve(problem) { }', '=> createImpact()', 'import { curiosity }', 'while (learning) { grow(); }', 'return <Future />', 'npm install confidence']

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
    <div className="neon-blob neon-blob-one"/>
    <div className="neon-blob neon-blob-two"/>
    <div className="neon-grid"/>
    <div className="code-stream">{codeBits.map((bit, index) => <span key={bit} className="code-bit" style={{ '--i': index }}>{bit}</span>)}</div>
    <div className="background-shade" style={{ opacity: shade * 0.78 }}/>
  </div>
}
