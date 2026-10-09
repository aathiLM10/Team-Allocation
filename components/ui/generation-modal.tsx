'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Layers, ShieldCheck } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  onComplete: () => void;
  totalEmployees: number;
}

export function GenerationModal({
  isOpen,
  onComplete,
  totalEmployees,
}: GenerationModalProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  const phases = [
    { title: 'Auditing Office Quotas', desc: 'Partitioning Guindy & Vandaloor for strict parity (Δ ≤ 1)' },
    { title: 'Optimizing Gender Distribution', desc: 'Joint multi-criteria balancing across all strata' },
    { title: 'Finalizing 4 Team Rosters', desc: 'Allocating White, Red, Blue, and Grey rosters' },
  ];

  useEffect(() => {
    if (!isOpen) {
      setPhaseIndex(0);
      return;
    }

    // Step through phases quickly
    const t1 = setTimeout(() => setPhaseIndex(1), 260);
    const t2 = setTimeout(() => setPhaseIndex(2), 540);
    const t3 = setTimeout(() => {
      onComplete();
    }, 820);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white/95 rounded-2xl border border-slate-200/80 shadow-2xl p-7 max-w-sm w-full text-center space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Orbiting Multi-Colored Team Rings */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          {/* Outer Ring with 4 Team Colors */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300 animate-orbit" />
          <div className="absolute inset-2 rounded-full border-2 border-blue-500/40 border-t-blue-600 border-r-rose-600 border-b-slate-700 border-l-slate-400 animate-orbit-reverse" />

          {/* Central Gem */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-lg transform rotate-45 animate-pulse">
            <Sparkles className="w-5 h-5 text-white transform -rotate-45" />
          </div>
        </div>

        {/* Dynamic Phase Text */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest block">
            Synthesizing Teams ({totalEmployees} Employees)
          </span>
          <h3 className="text-base font-bold text-slate-900">
            {phases[phaseIndex]?.title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {phases[phaseIndex]?.desc}
          </p>
        </div>

        {/* Segmented Progress Track */}
        <div className="flex gap-1.5 pt-2">
          {phases.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= phaseIndex
                  ? 'bg-blue-600 shadow-xs'
                  : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
