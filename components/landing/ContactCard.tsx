"use client";

import { ChevronRight } from "lucide-react";

export const ContactCard = () => {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/[0.04] p-3 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <img
        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260728_050334_5b076e26-0ce7-4898-b432-d764190e448f.png&w=1280&q=85"
        alt="Mitha, co-founder of NovaAI"
        className="h-24 w-20 rounded-lg object-cover"
      />
      <div className="flex flex-col gap-1.5 pr-2">
        <p className="text-sm font-medium text-white">Talk with Mitha</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
          Co-founder of NovaAI
        </p>
        <button className="mt-1.5 flex items-center gap-1 rounded-full bg-[#4CC2E8] px-4 py-2 text-xs font-medium text-black transition-shadow hover:shadow-[0_0_24px_rgba(76,194,232,0.35)]">
          Book 15-mins call
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};