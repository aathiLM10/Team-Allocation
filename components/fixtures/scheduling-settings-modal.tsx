'use client';

import React, { useState } from 'react';
import { SchedulingSettings } from '@/types/fixture';
import { Settings, X, Check, ShieldAlert } from 'lucide-react';

interface SchedulingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchedulingSettings;
  onSaveSettings: (settings: SchedulingSettings) => void;
}

export function SchedulingSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SchedulingSettingsModalProps) {
  const [formData, setFormData] = useState<SchedulingSettings>({ ...settings });

  if (!isOpen) return null;

  const handleCourtCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    const courts: string[] = [];
    for (let i = 1; i <= validCount; i++) {
      courts.push(`Court ${i}`);
    }
    setFormData((prev) => ({
      ...prev,
      totalCourts: validCount,
      courtNames: courts,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tournament Scheduling Controls</h3>
              <p className="text-xs text-slate-500">Configure courts, rematch policies &amp; conflict rules</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700">
          {/* Number of Courts */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-900 block">
              Number of Badminton Courts Available:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={10}
                value={formData.totalCourts}
                onChange={(e) => handleCourtCountChange(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-hidden focus:border-blue-500 text-sm"
              />
              <span className="text-slate-500">
                ({formData.courtNames.join(', ')})
              </span>
            </div>
          </div>

          {/* Default Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-900 block">Default Match Date:</label>
              <input
                type="date"
                value={formData.defaultDate}
                onChange={(e) => setFormData({ ...formData, defaultDate: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-900 block">Default Start Time:</label>
              <input
                type="time"
                value={formData.defaultTime}
                onChange={(e) => setFormData({ ...formData, defaultTime: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Default Round */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-900 block">Default Round Name:</label>
            <input
              type="text"
              value={formData.defaultRound}
              onChange={(e) => setFormData({ ...formData, defaultRound: e.target.value })}
              placeholder="e.g. Round 1, Quarterfinals, Finals"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <hr className="border-slate-200" />

          {/* Validation Toggles */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Tournament Match Rules
            </h4>

            {/* Allow Rematches */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowRematches}
                onChange={(e) => setFormData({ ...formData, allowRematches: e.target.checked })}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Permit Duplicate Matchups / Rematches</span>
                <span className="text-[11px] text-slate-500">
                  When disabled, the system flags an error if the exact same opponents or pairs have already faced each other.
                </span>
              </div>
            </label>

            {/* Multiple matches in same round */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowPlayerMultipleInRound}
                onChange={(e) => setFormData({ ...formData, allowPlayerMultipleInRound: e.target.checked })}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Allow Players to Play Multiple Times in Same Round</span>
                <span className="text-[11px] text-slate-500">
                  When disabled, warns if a player is scheduled for two different matches in Round 1.
                </span>
              </div>
            </label>

            {/* Simultaneous Matches */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowSimultaneousMatches}
                onChange={(e) => setFormData({ ...formData, allowSimultaneousMatches: e.target.checked })}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Allow Simultaneous Player Matches</span>
                <span className="text-[11px] text-slate-500">
                  Strictly disallowing this will block scheduling the same player in two matches at the exact same date and time.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
