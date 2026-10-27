import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Something went wrong', message = 'An unexpected error occurred. Please try again.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 border border-red-200 rounded-xl">
      <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
      <h4 className="text-base font-bold text-red-900">{title}</h4>
      <p className="text-sm text-red-700 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
