import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-amber-100 border border-amber-200 rounded-full text-amber-600 mb-4 shadow-xs">
        <FileQuestion className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">404 — Page Not Found</h2>
      <p className="text-sm text-slate-600 max-w-md mt-2 mb-6">
        The requested module or page could not be located in the RuralCare AI system.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => navigate(-1)} icon={ArrowLeft}>
          Go Back
        </Button>
        <Link to="/">
          <Button variant="outline" icon={Home}>
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
