import React from 'react';

export default function Hero({ t }) {
  return (
    <section className="pt-8 pb-6 sm:pt-10 sm:pb-8">
      <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-gray-900 leading-[1.12]">
        {t.heroTitle}
      </h1>
      <p className="mt-3.5 text-base sm:text-lg lg:text-[19px] text-gray-500 font-normal leading-relaxed max-w-3xl">
        {t.heroSubtitle}
      </p>
    </section>
  );
}
