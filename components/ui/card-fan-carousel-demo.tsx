import SocialCards from "@/components/ui/card-fan-carousel"

const imgPath = (n: number) => {
  const ext =
    n === 1
      ? "png"
      : n === 3 || n === 13
        ? "webp"
        : n === 15
          ? "jpg"
          : "jpeg"
  return `/img/${n}.${ext}`
}

const DEMO_CARDS = Array.from({ length: 15 }, (_, i) => ({
  imgUrl: imgPath(i + 1),
  alt: `Al Riyadi dish ${i + 1}`,
}))

export default function CardFanCarouselDemo() {
  return (
    <div className="min-h-screen flex items-center">
      <SocialCards cards={DEMO_CARDS} />
    </div>
  )
}
