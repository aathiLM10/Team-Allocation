import { AppHeader } from '@/components/navigation/app-header';
import { BadmintonDoublesView } from '@/components/badminton/badminton-doubles-view';

export const metadata = {
  title: 'Solidpro | Badminton Doubles Pairing',
  description:
    'Random doubles partner pairing within Red, Blue, Grey, and White teams with Excel export.',
};

export default function BadmintonHomePage() {
  return (
    <div className="min-h-screen bg-slate-50/70 bg-grid-blueprint text-slate-900 pb-20 selection:bg-purple-100 selection:text-purple-900 relative">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-radial-ambient pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Global Application Header */}
      <AppHeader />

      {/* Main Badminton Doubles Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BadmintonDoublesView />
      </main>
    </div>
  );
}
