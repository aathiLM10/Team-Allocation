'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Trophy, Shuffle, RotateCcw, Info } from 'lucide-react';

interface AppHeaderProps {
  onReset?: () => void;
  onOpenSpecs?: () => void;
  hasData?: boolean;
}

export function AppHeader({ onReset, onOpenSpecs, hasData = false }: AppHeaderProps) {
  const pathname = usePathname();
  const isBadmintonActive = pathname === '/' || pathname === '/badminton';
  const isTeamShuffleActive = pathname === '/team-shuffle' || pathname === '/teams';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center font-bold shadow-xs border border-slate-800">
            <Layers className="w-5 h-5 text-blue-300" />
            {/* 4 Team Color Pips */}
            <div className="absolute -top-1 -right-1 flex gap-0.5 p-0.5 rounded-full bg-white/90 shadow-2xs border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" title="White" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Red" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Blue" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" title="Grey" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-tight flex items-center gap-1.5">
                <span>Solidpro</span>
                <span className="text-xs font-semibold text-slate-400">/</span>
                <span className="text-xs font-bold text-slate-700">Team Studio</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                Tournament Edition
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Common Badminton Tournament &amp; Balanced Multi-Office Team Rosters
            </p>
          </div>
        </div>

        {/* Global Navigation Links */}
        <div className="flex items-center gap-3">
          <nav className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {/* Badminton Doubles (Default Landing Page) */}
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isBadmintonActive
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="text-sm">🏸</span>
              <span>Badminton Doubles</span>
            </Link>

            {/* Team Shuffle */}
            <Link
              href="/team-shuffle"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isTeamShuffleActive
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-600" />
              <span>Team Shuffle</span>
            </Link>
          </nav>

          {/* Optional Action Shortcuts */}
          {hasData && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="Reset data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Start Over</span>
            </button>
          )}

          {onOpenSpecs && (
            <button
              type="button"
              onClick={onOpenSpecs}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200/80"
            >
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Specs</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
