import SocialCards from "@/components/ui/card-fan-carousel"
import type { PhotoCard } from "@/lib/photos"

interface Props {
  cards: PhotoCard[]
}

export default function CardFanCarouselDemo({ cards }: Props) {
  return (
    <div className="min-h-screen flex items-center">
      <SocialCards
        cards={cards.map((c) => ({ imgUrl: c.url, alt: c.alt }))}
      />
    </div>
  )
}
