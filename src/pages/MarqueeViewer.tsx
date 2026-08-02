import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DiagonalMarqueeCarouselPreview from '@/components/ui/great-ui-diagonal-marquee-carousel-demo'
import MarqueeAlongSvgPathDemo from '@/components/ui/demo'
import CardFanCarouselDemo from '@/components/ui/card-fan-carousel-demo'
import { FALLBACK_PHOTOS, listApproved, type PhotoCard } from '@/lib/photos'

const SWIPE_THRESHOLD = 50
const MARQUEE_COUNT = 3

const navButtonClasses =
  'absolute top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/70 shadow-lg backdrop-blur-sm hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-white/70 dark:hover:bg-black/70'

export default function MarqueeViewer() {
  const [index, setIndex] = useState(0)
  const [photos, setPhotos] = useState<PhotoCard[]>(FALLBACK_PHOTOS)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    listApproved().then((approved) => {
      if (cancelled) return
      if (approved.length > 0) setPhotos(approved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const next = useCallback(
    () => setIndex((i) => (i + 1) % MARQUEE_COUNT),
    [],
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + MARQUEE_COUNT) % MARQUEE_COUNT),
    [],
  )

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX < -SWIPE_THRESHOLD) next()
    else if (deltaX > SWIPE_THRESHOLD) prev()
  }

  const cardProps = useMemo(() => ({ cards: photos }), [photos])
  const imageProps = useMemo(
    () => ({ images: photos.map((p) => p.url) }),
    [photos],
  )

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {index === 0 && <DiagonalMarqueeCarouselPreview {...cardProps} />}
      {index === 1 && <MarqueeAlongSvgPathDemo {...imageProps} />}
      {index === 2 && <CardFanCarouselDemo {...cardProps} />}

      <button
        onClick={prev}
        aria-label="Previous marquee"
        className={`${navButtonClasses} left-4`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next marquee"
        className={`${navButtonClasses} right-4`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
