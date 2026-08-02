import { useEffect, useRef } from "react"

interface ParticleSphereAnimationProps {
  particleCount?: number
  radius?: number
  rotationSpeed?: number
  className?: string
}

const ParticleSphereAnimation = ({
  particleCount = 500,
  radius = 1.4,
  rotationSpeed = 0.3,
  className,
}: ParticleSphereAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    // Evenly distributed points on a sphere using the golden ratio
    const goldenRatio = (1 + Math.sqrt(5)) / 2
    const points = Array.from({ length: particleCount }, (_, i) => {
      const theta = Math.acos(1 - (2 * (i + 0.5)) / particleCount)
      const phi = (2 * Math.PI * i) / goldenRatio
      return {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
        size: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
      }
    })

    let rafId = 0
    let rotationY = 0
    let width = 0
    let height = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.max(1, width * dpr)
      canvas.height = Math.max(1, height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const render = (time: number) => {
      const t = time * 0.001
      if (!reduceMotion) {
        rotationY = t * rotationSpeed
      }

      ctx.clearRect(0, 0, width, height)

      const scale = Math.min(width, height) * 0.34
      const centerX = width / 2
      const centerY = height / 2
      const perspective = 3

      const cosY = Math.cos(rotationY)
      const sinY = Math.sin(rotationY)
      const tiltX = 0.12
      const cosX = Math.cos(tiltX)
      const sinX = Math.sin(tiltX)

      const color =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--foreground")
          .trim() || "oklch(0.145 0 0)"

      const breath = reduceMotion ? 0 : Math.sin(t * 0.6) * 0.02

      for (const p of points) {
        const drift = reduceMotion
          ? 0
          : Math.sin(t * 0.5 + p.phase) * 0.015

        let x = p.x * cosY + p.z * sinY
        let z = -p.x * sinY + p.z * cosY
        let y = p.y

        const y2 = y * cosX - z * sinX
        const z2 = y * sinX + z * cosX
        y = y2
        z = z2

        const r = radius + breath + drift
        const rz = z * r
        const scaleFactor = perspective / (perspective - rz)
        const sx = centerX + x * r * scale * scaleFactor
        const sy = centerY + y * r * scale * scaleFactor

        const depth = (rz / r + 1) / 2
        const alpha = 0.12 + depth * 0.88

        ctx.beginPath()
        ctx.arc(sx, sy, p.size * scaleFactor, 0, Math.PI * 2)
        ctx.fillStyle = `color-mix(in oklab, ${color} ${Math.round(
          alpha * 100
        )}%, transparent)`
        ctx.fill()
      }

      if (!reduceMotion) {
        rafId = requestAnimationFrame(render)
      }
    }

    resize()
    if (reduceMotion) {
      render(0)
    } else {
      rafId = requestAnimationFrame(render)
    }
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
    }
  }, [particleCount, radius, rotationSpeed])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    />
  )
}

export default ParticleSphereAnimation
