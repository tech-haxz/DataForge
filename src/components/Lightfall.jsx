import { useEffect, useRef } from 'react'

export default function Lightfall({
  colors = ['#1689EA', '#65D6FF', '#B9A7FF'],
  backgroundColor = 'transparent',
  speed = 0.5,
  streakCount = 2,
  streakWidth = 1,
  streakLength = 1,
  glow = 1,
  density = 0.6,
  twinkle = 1,
  zoom = 3,
  backgroundGlow = 0.5,
  opacity = 1,
  mouseInteraction = true,
  mouseStrength = 0.5,
  mouseRadius = 1,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    let frameId
    let width = 0
    let height = 0
    let dpr = 1
    let time = 0
    let lastFrameTime = performance.now()
    const pointer = { x: 0.5, y: 0.5, active: false }
    const streaks = Array.from({ length: Math.max(2, streakCount * 4) }, (_, index) => ({
      x: (index / Math.max(1, streakCount * 4)) * 1.2 - 0.1,
      offset: Math.random() * Math.PI * 2,
      length: (0.28 + Math.random() * 0.42) * streakLength,
      width: (0.7 + Math.random() * 1.5) * streakWidth,
      speed: 0.35 + Math.random() * 0.85,
      color: colors[index % colors.length],
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onPointerMove = (event) => {
      if (!mouseInteraction) return
      const rect = canvas.getBoundingClientRect()
      pointer.x = (event.clientX - rect.left) / rect.width
      pointer.y = (event.clientY - rect.top) / rect.height
      pointer.active = true
    }
    const onPointerLeave = () => { pointer.active = false }

    const draw = (frameTime = performance.now()) => {
      const frameDelta = Math.min(frameTime - lastFrameTime, 32)
      lastFrameTime = frameTime
      time += (frameDelta / 1000) * speed * 0.95
      context.globalAlpha = opacity
      if (backgroundColor === 'transparent') {
        context.clearRect(0, 0, width, height)
      } else {
        context.fillStyle = backgroundColor
        context.fillRect(0, 0, width, height)
      }

      const gradient = context.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.35, Math.max(width, height) * 0.75)
      gradient.addColorStop(0, `${colors[1]}${Math.round(35 * backgroundGlow).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(0.52, `${colors[0]}18`)
      gradient.addColorStop(1, backgroundColor === 'transparent' ? 'transparent' : `${backgroundColor}00`)
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      const mouseX = pointer.active ? (pointer.x - 0.5) * mouseStrength * mouseRadius : 0
      const mouseY = pointer.active ? (pointer.y - 0.5) * mouseStrength * mouseRadius : 0
      streaks.forEach((streak, index) => {
        const progress = (time * streak.speed + streak.offset) % 1
        const x = (streak.x + mouseX + Math.sin(time + streak.offset) * 0.025) * width
        const startY = (progress * (1.35 + density) - 0.2 + mouseY) * height
        const endY = startY - streak.length * height
        const fade = Math.sin(progress * Math.PI)
        const line = context.createLinearGradient(x, startY, x, endY)
        line.addColorStop(0, `${streak.color}00`)
        line.addColorStop(0.45, streak.color)
        line.addColorStop(1, `${streak.color}00`)
        context.save()
        context.globalAlpha = Math.max(0.08, fade * (0.32 + twinkle * 0.18))
        context.strokeStyle = line
        context.lineWidth = streak.width * zoom
        context.shadowColor = streak.color
        context.shadowBlur = glow * 16
        context.beginPath()
        context.moveTo(x, startY)
        context.lineTo(x + Math.sin(time * 1.5 + index) * width * 0.04, endY)
        context.stroke()
        context.restore()
      })
      frameId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [backgroundColor, backgroundGlow, colors, density, glow, mouseInteraction, mouseRadius, mouseStrength, opacity, speed, streakCount, streakLength, streakWidth, twinkle, zoom])

  return <canvas ref={canvasRef} className="lightfall-canvas" aria-hidden="true" />
}
