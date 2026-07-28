import Image from "next/image";
import { COLORS } from "@/lib/theme";

export function BreadBox({
  label = "",
  className = "",
  src,
  dim = false,
}: {
  label?: string;
  className?: string;
  src?: string;
  dim?: boolean;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={src}
          alt={label}
          fill
          className={`object-cover ${dim ? "brightness-50 grayscale" : ""}`}
        />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at 38% 35%, #2A2118 0%, #161210 55%, #0D0B08 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 40% 40%, rgba(245,165,36,0.07) 0%, transparent 65%)",
        }}
      />
      {label && (
        <span
          className="text-[11px] font-medium tracking-wide text-center px-2 z-10"
          style={{ color: COLORS.muted }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
