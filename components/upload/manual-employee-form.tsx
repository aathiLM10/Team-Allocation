'use client';

import React, { useState } from 'react';
import { Employee, Gender, OfficeLocation } from '@/types/employee';
import {
  UserPlus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Save,
} from 'lucide-react';

interface ManualEmployeeFormProps {
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onSaveEmployee?: (employee: Employee) => void;
  editingEmployee?: Employee | null;
  onCancelEdit?: () => void;
  isOpenDefault?: boolean;
}

export function ManualEmployeeForm(props: ManualEmployeeFormProps) {
  // Keyed inner form automatically resets initial values on editingEmployee switch
  const formKey = props.editingEmployee ? `edit-${props.editingEmployee.id}` : 'create-new';
  return <ManualEmployeeFormInner key={formKey} {...props} />;
}

function ManualEmployeeFormInner({
  onAddEmployee,
  onSaveEmployee,
  editingEmployee,
  onCancelEdit,
  isOpenDefault = false,
}: ManualEmployeeFormProps) {
  const [isOpen, setIsOpen] = useState(editingEmployee ? true : isOpenDefault);
  const [name, setName] = useState(editingEmployee ? editingEmployee.name : '');
  const [gender, setGender] = useState<Gender>(editingEmployee ? editingEmployee.gender : 'Men');
  const [office, setOffice] = useState<OfficeLocation>(editingEmployee ? editingEmployee.office : 'Guindy');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setFeedback({
        type: 'error',
        message: 'Employee Name cannot be empty. Please enter a valid name.',
      });
      return;
    }

    if (editingEmployee && onSaveEmployee) {
      // Save existing employee
      onSaveEmployee({
        ...editingEmployee,
        name: trimmed,
        gender,
        office,
      });
      setFeedback({
        type: 'success',
        message: `Employee "${trimmed}" updated successfully.`,
      });
      if (onCancelEdit) onCancelEdit();
    } else {
      // Add new employee
      onAddEmployee({
        name: trimmed,
        gender,
        office,
        sourceFile: 'Manual Entry',
      });
      setFeedback({
        type: 'success',
        message: `Employee "${trimmed}" (${gender}, ${office}) added to roster.`,
      });
      setName('');
      setGender('Men');
      setOffice('Guindy');
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleCancel = () => {
    setName('');
    setGender('Men');
    setOffice('Guindy');
    setFeedback(null);
    if (editingEmployee && onCancelEdit) {
      onCancelEdit();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              editingEmployee
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {editingEmployee ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {editingEmployee
                ? `Edit Employee Details: ${editingEmployee.name}`
                : 'Manual Employee Entry'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {editingEmployee
                ? 'Update name, gender, or office location for this employee record.'
                : 'Add individual employees to the roster before generating teams.'}
            </p>
          </div>
        </div>

        {!editingEmployee && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            {isOpen ? (
              <>
                <X className="w-3.5 h-3.5 text-slate-500" />
                Hide Form
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                + Add Employee
              </>
            )}
          </button>
        )}
      </div>

      {/* Form Content */}
      {(isOpen || editingEmployee) && (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{feedback.message}</div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Employee Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Employee Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Vignesh Srinivasan"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Use full name to differentiate employees who share names.
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Unspecified">Unspecified</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Used to optimize gender parity across all 4 teams.
              </p>
            </div>

            {/* Office Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Office Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={office}
                onChange={(e) => setOffice(e.target.value as OfficeLocation)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
              >
                <option value="Guindy">Guindy</option>
                <option value="Vandaloor">Vandaloor</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Guindy and Vandaloor branches are balanced evenly.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
            >
              {editingEmployee ? 'Cancel Edit' : 'Cancel'}
            </button>

            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-2xs transition-colors cursor-pointer tracking-wider uppercase ${
                editingEmployee
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editingEmployee ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add Employee
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
