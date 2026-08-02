"use client"

import DiagonalMarqueeCarousel from "@/components/ui/great-ui-diagonal-marquee-carousel"
import type { PhotoCard } from "@/lib/photos"

interface Props {
  cards: PhotoCard[]
}

export default function DiagonalMarqueeCarouselPreview({ cards }: Props) {
  return (
    <DiagonalMarqueeCarousel
      cards={cards.map((c) => ({ id: c.id, url: c.url, title: c.alt }))}
      className="absolute -inset-5 h-[calc(100%+2.5rem)] max-h-none w-[calc(100%+2.5rem)] max-w-none"
    />
  )
}
