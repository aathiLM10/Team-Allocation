import { AppHeader } from '@/components/navigation/app-header';
import { BadmintonPageView } from '@/components/badminton/badminton-page-view';

export const metadata = {
  title: 'Solidpro | Badminton Tournament Fixtures Studio',
  description:
    'Common badminton tournament manager for Guindy & Vandaloor offices. Configurable Singles and Doubles fixtures with court scheduling and conflict detection.',
};

export default function BadmintonHomePage() {
  return (
    <div className="min-h-screen bg-slate-50/70 bg-grid-blueprint text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-radial-ambient pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Global Application Header */}
      <AppHeader />

      {/* Main Badminton Tournament Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BadmintonPageView />
      </main>
    </div>
  );
}
