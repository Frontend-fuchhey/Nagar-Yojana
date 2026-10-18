import React from 'react';

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F8FAFC] h-[250px] sm:h-[290px] lg:h-[330px]">
      {/* Background photo: tower & skyline kept on the right side */}
      <img
        src="/biratnagar_panorama.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[78%_40%]"
      />

      {/* Left fade to white / light blue for headline readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 via-35% to-transparent to-75% sm:via-white/70 sm:via-40%" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F8FAFC]/70 to-transparent" />

      {/* Left decoration: soft mint flowing wave */}
      <svg
        className="absolute left-0 top-0 h-full w-[75%] sm:w-[60%] pointer-events-none"
        viewBox="0 0 800 330"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroMint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D7F0E3" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#D7F0E3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 150 C 120 120 220 230 400 250 C 520 262 640 300 800 330 L0 330 Z" fill="url(#heroMint)" />
        <path d="M0 215 C 140 190 260 280 460 292 C 560 298 680 318 800 330 L0 330 Z" fill="url(#heroMint)" opacity="0.7" />
      </svg>

      {/* Right decoration: large rounded concave scoop at bottom-right */}
      <svg
        className="absolute right-0 bottom-0 w-[70%] sm:w-[55%] lg:w-[48%] h-20 sm:h-28 lg:h-32 pointer-events-none"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 100 C 110 100 190 82 270 62 C 350 42 400 34 400 0 L400 100 Z" fill="#F8FAFC" />
      </svg>

      {/* Nepali motto: live handwritten text with green swoosh */}
      <div
        className="hidden sm:block absolute top-6 lg:top-9 right-[6%] lg:right-[9%] z-10 text-center select-none pointer-events-none notranslate"
        style={{ transform: 'rotate(-4deg)' }}
      >
        <p
          className="text-lg lg:text-2xl font-bold leading-tight text-[#1E293B]"
          style={{
            fontFamily: "'Kalam', 'Noto Sans Devanagari', cursive",
            textShadow: '0 1px 2px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7)',
          }}
        >
          <span className="block">समृद्ध विराटनगर</span>
          <span className="block">हाम्रो साझा जिम्मेवारी</span>
        </p>
        <svg viewBox="0 0 200 20" className="mx-auto mt-0.5 w-32 lg:w-44 h-4" aria-hidden="true">
          <path d="M4 14 C 50 2 120 2 196 8" fill="none" stroke="#156947" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Headline block aligned with the card container */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-5 pt-6 sm:pt-9 lg:pt-11">
        <div className="max-w-md sm:max-w-lg lg:max-w-xl">
          {/* Eyebrow Label */}
          <p className="text-[11px] sm:text-xs font-bold tracking-wider text-[#4A6572] uppercase">
            BIRATNAGAR METROPOLITAN CITY
          </p>

          <h1 className="mt-1 text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.08]">
            <span className="text-[#111827] block">
              Hamro Nagar,
            </span>
            <span className="text-[#156947] block mt-0.5">
              Aafno Sarkar
            </span>
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#556987] font-medium leading-relaxed">
            Transparent. Accountable. For a Better Tomorrow.
          </p>
        </div>
      </div>
    </section>
  );
}

