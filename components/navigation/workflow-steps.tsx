'use client';

import React from 'react';
import { UploadCloud, CheckCircle2, AlertOctagon, Sparkles, FileText, Check } from 'lucide-react';

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
      name: 'Upload Employees',
      description: 'Upload CSV employee roster',
      icon: UploadCloud,
      isCompleted: hasFileUploaded,
      isCurrent: currentStep === 1,
      isBlocked: false,
    },
    {
      id: 2 as WorkflowStepId,
      name: 'Validate Data',
      description: 'Audit & resolve discrepancies',
      icon: CheckCircle2,
      isCompleted: hasFileUploaded && !hasErrors,
      isCurrent: currentStep === 2,
      isBlocked: !hasFileUploaded,
      hasErrorBadge: hasFileUploaded && hasErrors,
    },
    {
      id: 3 as WorkflowStepId,
      name: 'Generate Teams',
      description: 'Constrained balanced shuffle',
      icon: Sparkles,
      isCompleted: hasAllocated,
      isCurrent: currentStep === 3,
      isBlocked: !hasFileUploaded || hasErrors,
    },
    {
      id: 4 as WorkflowStepId,
      name: 'Review & Export',
      description: 'Audit metrics & download CSVs',
      icon: FileText,
      isCompleted: hasAllocated,
      isCurrent: currentStep === 4,
      isBlocked: !hasAllocated,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-4">
      <nav aria-label="Workflow Steps">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                className={`relative rounded-lg p-3 transition-all border flex items-start gap-3 select-none ${
                  step.isCurrent
                    ? 'bg-blue-50/70 border-blue-400/80 shadow-2xs'
                    : step.isCompleted
                    ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 cursor-pointer'
                    : step.isBlocked
                    ? 'bg-white border-slate-100 opacity-60 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {/* Step indicator circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    step.hasErrorBadge
                      ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
                      : step.isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : step.isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
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
                      className={`text-xs font-semibold truncate ${
                        step.isCurrent
                          ? 'text-blue-950 font-bold'
                          : step.isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.name}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                  {step.hasErrorBadge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 uppercase inline-block mt-0.5">
                      Action Required
                    </span>
                  )}
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
