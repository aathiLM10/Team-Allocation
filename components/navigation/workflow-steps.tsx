'use client';

import React from 'react';
import { UploadCloud, CheckCircle2, AlertOctagon, Sparkles, FileText, Check, ArrowRight } from 'lucide-react';

export type WorkflowStepId = 1 | 2 | 3 | 4;

interface WorkflowStepsProps {
  currentStep: WorkflowStepId;
  hasFileUploaded: boolean;
  hasErrors: boolean;
  hasAllocated: boolean;
  onStepClick?: (step: WorkflowStepId) => void;
}

export function WorkflowSteps({
  currentStep,
  hasFileUploaded,
  hasErrors,
  hasAllocated,
  onStepClick,
}: WorkflowStepsProps) {
  const steps = [
    {
      id: 1 as WorkflowStepId,
      name: 'Upload Roster',
      subtitle: 'Excel / CSV multi-sheet',
      icon: UploadCloud,
      isCompleted: hasFileUploaded,
      isCurrent: currentStep === 1,
      isBlocked: false,
    },
    {
      id: 2 as WorkflowStepId,
      name: 'Audit & Validate',
      subtitle: 'Office & gender parity check',
      icon: CheckCircle2,
      isCompleted: hasFileUploaded && !hasErrors,
      isCurrent: currentStep === 2,
      isBlocked: !hasFileUploaded,
      hasErrorBadge: hasFileUploaded && hasErrors,
    },
    {
      id: 3 as WorkflowStepId,
      name: 'Balanced Shuffle',
      subtitle: 'Generate 4 equal teams',
      icon: Sparkles,
      isCompleted: hasAllocated,
      isCurrent: currentStep === 3,
      isBlocked: !hasFileUploaded || hasErrors,
    },
    {
      id: 4 as WorkflowStepId,
      name: 'Review & Export',
      subtitle: 'Styled Excel & CSVs',
      icon: FileText,
      isCompleted: hasAllocated,
      isCurrent: currentStep === 4,
      isBlocked: !hasAllocated,
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.03)] p-3 sm:p-4 transition-all">
      <nav aria-label="Workflow Steps">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const canNavigate =
              !step.isBlocked && onStepClick && (step.isCompleted || step.isCurrent);

            return (
              <li
                key={step.id}
                onClick={() => {
                  if (canNavigate) onStepClick(step.id);
                }}
                className={`group relative rounded-xl p-3 transition-all duration-200 border flex items-start gap-3 select-none ${
                  step.isCurrent
                    ? 'bg-gradient-to-b from-blue-50/90 to-white border-blue-400/90 shadow-xs ring-1 ring-blue-300/40'
                    : step.isCompleted
                    ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 cursor-pointer hover:border-slate-300'
                    : step.isBlocked
                    ? 'bg-white/50 border-slate-100 opacity-50 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {/* Step indicator circle with glow */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 shadow-2xs ${
                    step.hasErrorBadge
                      ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
                      : step.isCurrent
                      ? 'bg-blue-600 text-white shadow-blue-500/25 shadow-md scale-105'
                      : step.isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {step.hasErrorBadge ? (
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                  ) : step.isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span
                      className={`text-xs font-semibold tracking-tight truncate ${
                        step.isCurrent
                          ? 'text-blue-950 font-bold'
                          : step.isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.name}
                    </span>
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        step.isCurrent
                          ? 'text-blue-600'
                          : step.isCompleted
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                    />
                  </div>
                  {step.hasErrorBadge ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 uppercase inline-block mt-0.5">
                      Review Needed
                    </span>
                  ) : (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
