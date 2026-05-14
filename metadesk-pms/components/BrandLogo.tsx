"use client";

import { useEffect, useState } from "react";

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/api/brand-logo");
  const logoBox = compact ? "h-10 w-10" : "h-16 w-48";

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(image, 0, 0);

      try {
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = frame.data;

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];

          if (red > 245 && green > 245 && blue > 245) {
            pixels[index + 3] = 0;
          }
        }

        context.putImageData(frame, 0, 0);
        setLogoSrc(canvas.toDataURL("image/png"));
      } catch {
        setLogoSrc("/api/brand-logo");
      }
    };
    image.onerror = () => setFailed(true);
    image.src = "/api/brand-logo";

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${logoBox} flex items-center justify-center overflow-hidden`}>
        {failed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-white/95 text-brand-primary flex items-center justify-center text-sm font-bold">
              M
            </div>
            {!compact && (
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Metadesk Global</p>
                <p className="text-brand-muted text-xs">Innovation & Technology</p>
              </div>
            )}
          </div>
        ) : (
          <img
            src={logoSrc}
            alt="Metadesk Global"
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}
