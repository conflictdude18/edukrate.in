
"use client";

import Image from "next/image";

interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({
  className = "",
}: BrandLogoProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Light theme */}
      <Image
        src="/edukratelogowithname.png"
        alt="Edukrate"
        fill
        priority
        sizes="220px"
        className="object-contain dark:hidden"
      />

      {/* Dark theme */}
      <Image
        src="/edukratelogowithnamewhite.png"
        alt="Edukrate"
        fill
        priority
        sizes="220px"
        className="hidden object-contain dark:block"
      />
    </div>
  );
}
