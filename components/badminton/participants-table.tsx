'use client';

import React, { useState, useMemo } from 'react';
import { Participant } from '@/types/badminton';
import { TeamName } from '@/types/employee';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  User,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface ParticipantsTableProps {
  participants: Participant[];
  filterCategory?: 'Singles' | 'Doubles' | 'All';
  onUpdateParticipant: (updated: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onAddParticipant: (newP: Participant) => void;
}

export function ParticipantsTable({
  participants,
  filterCategory = 'All',
  onUpdateParticipant,
  onDeleteParticipant,
  onAddParticipant,
}: ParticipantsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Participant>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newParticipant, setNewParticipant] = useState<Partial<Participant>>({
    id: `EMP${String(participants.length + 1).padStart(3, '0')}`,
    name: '',
    team: 'Red Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
  });

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Category filter
      if (filterCategory === 'Singles' && !p.singlesRegistered) return false;
      if (filterCategory === 'Doubles' && !p.doublesRegistered) return false;

      // Team filter
      if (teamFilter !== 'All' && p.team !== teamFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          p.id.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          p.team.toLowerCase().includes(query) ||
          (p.office && p.office.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [participants, filterCategory, teamFilter, searchTerm]);

  const handleStartEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditFormData({ ...p });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editFormData.name) return;
    onUpdateParticipant(editFormData as Participant);
    setEditingId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.id || !newParticipant.name || !newParticipant.team) {
      alert('Please fill in Player ID, Name, and Team.');
      return;
    }
    // Check ID collision
    if (participants.some((p) => p.id.toLowerCase() === newParticipant.id!.toLowerCase())) {
      alert(`Player ID "${newParticipant.id}" already exists. Each player must have a unique ID.`);
      return;
    }

    onAddParticipant(newParticipant as Participant);
    setIsAddingNew(false);
    setNewParticipant({
      id: `EMP${String(participants.length + 2).padStart(3, '0')}`,
      name: '',
      team: 'White Team',
      office: 'Guindy',
      gender: 'Men',
      singlesRegistered: true,
      doublesRegistered: true,
    });
  };

  const teamColors: Record<TeamName, { bg: string; text: string }> = {
    'White Team': { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
    'Red Team': { bg: 'bg-rose-50 border-rose-300', text: 'text-rose-700' },
    'Blue Team': { bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700' },
    'Grey Team': { bg: 'bg-slate-200 border-slate-400', text: 'text-slate-700' },
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, or office..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="All">All Teams</option>
            <option value="White Team">White Team</option>
            <option value="Red Team">Red Team</option>
            <option value="Blue Team">Blue Team</option>
            <option value="Grey Team">Grey Team</option>
          </select>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="font-semibold text-slate-500 text-xs">
            Showing {filteredParticipants.length} of {participants.length} participants
          </span>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Participant
          </button>
        </div>
      </div>

      {/* Manual Add Participant Modal/Form */}
      {isAddingNew && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs space-y-3 animate-in fade-in duration-100 text-xs"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Participant to Tournament Roster
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Player ID *</label>
              <input
                type="text"
                required
                value={newParticipant.id}
                onChange={(e) => setNewParticipant({ ...newParticipant, id: e.target.value })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Player Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vignesh S"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Team *</label>
              <select
                value={newParticipant.team}
                onChange={(e) => setNewParticipant({ ...newParticipant, team: e.target.value as TeamName })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
              >
                <option value="White Team">White Team</option>
                <option value="Red Team">Red Team</option>
                <option value="Blue Team">Blue Team</option>
                <option value="Grey Team">Grey Team</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Office (Info)</label>
              <select
                value={newParticipant.office}
                onChange={(e) => setNewParticipant({ ...newParticipant, office: e.target.value })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
              >
                <option value="Guindy">Guindy</option>
                <option value="Vandaloor">Vandaloor</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Gender</label>
              <select
                value={newParticipant.gender}
                onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Unspecified">Unspecified</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={newParticipant.singlesRegistered}
                  onChange={(e) => setNewParticipant({ ...newParticipant, singlesRegistered: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Singles Registered
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={newParticipant.doublesRegistered}
                  onChange={(e) => setNewParticipant({ ...newParticipant, doublesRegistered: e.target.checked })}
                  className="rounded text-purple-600"
                />
                Doubles Registered
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-2xs"
              >
                Save Participant
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Participants Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Player ID</th>
                <th className="py-3 px-4">Player Name</th>
                <th className="py-3 px-3">Assigned Team</th>
                <th className="py-3 px-3">
                  Office Location <span className="text-[9px] font-normal lowercase">(informational)</span>
                </th>
                <th className="py-3 px-3">Gender</th>
                <th className="py-3 px-3 text-center">Singles</th>
                <th className="py-3 px-3 text-center">Doubles</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map((p) => {
                const isEditing = editingId === p.id;
                const colors = teamColors[p.team] || teamColors['White Team'];

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {p.id}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      ) : (
                        <span>{p.name}</span>
                      )}
                    </td>

                    {/* Team */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <select
                          value={editFormData.team}
                          onChange={(e) => setEditFormData({ ...editFormData, team: e.target.value as TeamName })}
                          className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-xs font-bold"
                        >
                          <option value="White Team">White Team</option>
                          <option value="Red Team">Red Team</option>
                          <option value="Blue Team">Blue Team</option>
                          <option value="Grey Team">Grey Team</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${colors.bg} ${colors.text}`}>
                          {p.team}
                        </span>
                      )}
                    </td>

                    {/* Office (Informational) */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.office || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, office: e.target.value })}
                          className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {p.office || 'N/A'}
                        </span>
                      )}
                    </td>

                    {/* Gender */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {p.gender || 'N/A'}
                    </td>

                    {/* Singles Registration Toggle */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateParticipant({
                            ...p,
                            singlesRegistered: !p.singlesRegistered,
                          })
                        }
                        title={`Click to toggle Singles registration for ${p.name}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          p.singlesRegistered
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {p.singlesRegistered ? <CheckCircle2 className="w-3 h-3 text-blue-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                        {p.singlesRegistered ? 'Yes' : 'No'}
                      </button>
                    </td>

                    {/* Doubles Registration Toggle */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateParticipant({
                            ...p,
                            doublesRegistered: !p.doublesRegistered,
                          })
                        }
                        title={`Click to toggle Doubles registration for ${p.name}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          p.doublesRegistered
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {p.doublesRegistered ? <CheckCircle2 className="w-3 h-3 text-purple-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                        {p.doublesRegistered ? 'Yes' : 'No'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(p)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit participant"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove ${p.name} (${p.id}) from tournament?`)) {
                                onDeleteParticipant(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
