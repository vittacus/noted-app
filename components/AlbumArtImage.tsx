"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  fallbackClassName?: string;
}

export default function AlbumArtImage({ src, alt, fill, sizes, className, fallbackClassName }: Props) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <div className={fallbackClassName ?? "w-full h-full bg-[#212121]"} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  );
}
