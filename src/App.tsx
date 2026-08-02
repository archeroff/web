import { useEffect, useState } from 'react'
import DiagonalMarqueeCarouselPreview from '@/components/ui/great-ui-diagonal-marquee-carousel-demo'
import MarqueeAlongSvgPathDemo from '@/components/ui/demo'
import CardFanCarouselDemo from '@/components/ui/card-fan-carousel-demo'

const SWITCH_AFTER_MS = 60_000

const MARQUEES = [DiagonalMarqueeCarouselPreview, MarqueeAlongSvgPathDemo, CardFanCarouselDemo]

function App() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % MARQUEES.length),
      SWITCH_AFTER_MS,
    )
    return () => clearInterval(interval)
  }, [])

  const Marquee = MARQUEES[index]
  return <Marquee />
}

export default App
