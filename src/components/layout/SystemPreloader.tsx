import React, { useEffect, useRef } from 'react';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import type { SyncStep } from '@/types/entities';

interface SystemPreloaderProps {
  isOpen: boolean;
  steps: SyncStep[];
  onComplete: () => void;
  onError: (error: string) => void;
}

export function SystemPreloader({ isOpen, steps, onComplete, onError }: SystemPreloaderProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const hasCalledComplete = useRef(false);
  const hasCalledError = useRef(false);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.showModal();
      hasCalledComplete.current = false;
      hasCalledError.current = false;
    } else {
      modalRef.current?.close();
    }
  }, [isOpen]);

  const currentStep = steps.find(s => s.status === 'current');
  const errorStep = steps.find(s => s.status === 'error');
  const hasErrors = steps.some(s => s.status === 'error');

  const completedCount = steps.filter(s => s.status === 'done').length;
  const progressPercent = (completedCount / steps.length) * 100;

  const getStepIcon = (step: SyncStep) => {
    switch (step.status) {
      case 'done':
        return <Check className="w-5 h-5 text-success" />;
      case 'current':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'error':
        return <X className="w-5 h-5 text-error" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-base-300" />;
    }
  };

  const handleContinue = () => {
    const errorMessage = errorStep?.error || 'An error occurred during synchronization';
    onError(errorMessage);
  };

  return (
    <dialog
      ref={modalRef}
      className="modal modal-bottom sm:modal-middle"
      onCancel={(e) => {
        // Prevent Escape key from closing during sync
        if (!hasErrors) {
          e.preventDefault();
        } else {
          handleContinue();
        }
      }}
    >
      <div className={`modal-box border border-base-100 ${hasErrors ? 'border-1 border-error' : ''}`}>
        <div className="flex flex-col items-center">
          <h3 className="font-bold text-lg mb-2">
            {hasErrors ? 'Synchronization Error' : 'Synchronizing System'}
          </h3>
          <p className="text-sm text-base-content/70 mb-6">
            {hasErrors
              ? 'An error occurred during the sync process.'
              : 'Please wait while we check your system integrity...'}
          </p>

          {/* Progress Bar */}
          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{completedCount}/{steps.length} steps</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  hasErrors ? 'bg-error' : 'bg-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="w-full max-w-md mt-6 space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <span className={
                    step.status === 'error'
                      ? 'text-error font-medium'
                      : step.status === 'done'
                      ? 'text-success'
                      : step.status === 'current'
                      ? 'text-primary font-medium'
                      : 'text-base-content/50'
                  }>
                    {step.label}
                  </span>

                  {step.status === 'current' && step.progress && (
                    <div className="text-xs text-base-content/50 mt-0.5">
                      Processing {step.progress.current} of {step.progress.total}...
                    </div>
                  )}

                  {step.status === 'error' && step.error && (
                    <div className="text-xs text-error mt-0.5">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {hasErrors && errorStep && (
            <div className="alert alert-soft alert-error mt-6 max-w-md">
              <AlertCircle className="w-5 h-5" />
              <span>{errorStep.error || 'Verify Check System Checks on your dashboard'}</span>
            </div>
          )}

          {/* Continue Button (Required) */}
          {hasErrors && (
            <button
              className="btn btn-neutral btn-wide mt-6"
              onClick={handleContinue}
            >
              Continue
            </button>
          )}

          {/* Current Step Info */}
          {currentStep && !hasErrors && (
            <p className="text-sm text-base-content/70 mt-4 animate-pulse">
              {currentStep.progress
                ? `Processing ${currentStep.progress.current}/${currentStep.progress.total}...`
                : 'Working...'}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
