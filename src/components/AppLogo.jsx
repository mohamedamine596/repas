import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b033390db1712a51a56d65/4d38fd5d2_generated_image.png";

export default function AppLogo({ size = "md", showText = true, showTagline = false }) {
  const sizes = {
    sm: { img: "w-8 h-8", title: "text-base", tagline: "text-[10px]" },
    md: { img: "w-10 h-10", title: "text-lg", tagline: "text-xs" },
    lg: { img: "w-16 h-16", title: "text-2xl", tagline: "text-sm" },
    xl: { img: "w-24 h-24", title: "text-3xl", tagline: "text-base" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2.5">
      <img
        src={LOGO_URL}
        alt="Repas Solidaire"
        className={`${s.img} rounded-xl object-cover flex-shrink-0`}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold text-[#1B5E3B] ${s.title}`}>Repas Solidaire</span>
          {showTagline && (
            <span className={`text-gray-400 ${s.tagline}`}>By Solidarité Sans Frontières</span>
          )}
        </div>
      )}
    </div>
  );
}