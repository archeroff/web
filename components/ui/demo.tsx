import MarqueeAlongSvgPath from "@/components/ui/marquee-along-svg-path"

const path =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5"

interface Props {
  images: string[]
}

export default function MarqueeAlongSvgPathDemo({ images }: Props) {
  return (
    <div className="w-dvw h-dvh bg-zinc-50 flex items-center justify-center">
      <MarqueeAlongSvgPath
        path={path}
        viewBox="0 0 996 330"
        baseVelocity={8}
        slowdownOnHover={true}
        draggable={true}
        repeat={2}
        dragSensitivity={0.1}
        className="w-full h-full scale-105"
        responsive
        grabCursor
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="w-14 h-full hover:scale-150 duration-300 ease-in-out"
          >
            <img
              src={src}
              alt={`Al Riyadi dish ${i + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  )
}
