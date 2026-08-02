import { useEffect, useState } from 'react'
import DiagonalMarqueeCarouselPreview from '@/components/ui/great-ui-diagonal-marquee-carousel-demo'
import MarqueeAlongSvgPathDemo from '@/components/ui/demo'

const SWITCH_AFTER_MS = 60_000

function App() {
  const [showSecondMarquee, setShowSecondMarquee] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSecondMarquee(true), SWITCH_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return showSecondMarquee ? (
    <MarqueeAlongSvgPathDemo />
  ) : (
    <DiagonalMarqueeCarouselPreview />
  )
}

export default App
