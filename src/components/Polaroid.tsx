import Image from "next/image";
import { Caveat } from "next/font/google";

export const handwriting = Caveat({ subsets: ["latin"], weight: ["400", "600"] });

// public/assets/polaroid.webp is a scanned blank instant print (public domain,
// "polaroid blank559" on Flickr). The photo window as % of the 826x1024 scan:
const POLAROID_ASPECT = "826 / 1024";
const POLAROID_WINDOW = { left: "6.42%", top: "4.2%", width: "89.1%", height: "74.8%" };

interface PolaroidProps {
  src?: string; // photo for the window; without one the print stays blank/undeveloped
  alt?: string;
  caption?: string; // handwritten on the white strip
  captionClassName?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Polaroid({
  src,
  alt = "",
  caption,
  captionClassName = "text-3xl",
  sizes = "300px",
  priority = false,
  className = "",
  style,
}: PolaroidProps) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: POLAROID_ASPECT, ...style }}
    >
      <Image
        src="/assets/polaroid.webp"
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className="select-none pointer-events-none"
      />
      {src && (
        <div className="absolute overflow-hidden" style={POLAROID_WINDOW}>
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        </div>
      )}
      {caption && (
        <p
          className={`${handwriting.className} ${captionClassName} absolute inset-x-0 bottom-0 top-[80%] flex items-center justify-center px-4 text-gray-800 leading-none`}
        >
          <span className="truncate">{caption}</span>
        </p>
      )}
    </div>
  );
}
