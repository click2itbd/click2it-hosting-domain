import React, { useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { firebaseValidationResult, db } from '../firebase';
import { testFirestoreConnection } from '../utils/firebaseValidation';

export const FirebaseValidationBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { errors, warnings, isDummyApiKey, currentOrigin } = firebaseValidationResult;

  // Show banner if there are errors or warnings
  const hasIssues = errors.length > 0 || warnings.length > 0 || isDummyApiKey;

  if (!hasIssues || dismissed) {
    return null;
  }

  const handleTestClick = async () => {
    setTesting(true);
    setStatusMessage('Testing Firestore connection...');
    try {
      const connected = await testFirestoreConnection(db);
      if (connected) {
        setStatusMessage('✅ Connection test successful! Database is online.');
      } else {
        setStatusMessage('⚠️ Firestore unreachable or returned permission error.');
      }
    } catch (e: any) {
      setStatusMessage(`❌ Test failed: ${e.message || 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-amber-900/90 text-amber-100 border-b border-amber-700/60 px-4 py-2.5 text-xs font-sans backdrop-blur-sm shadow-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-200">
              Firebase Configuration Alert ({currentOrigin})
            </div>
            <div className="text-amber-200/90 mt-0.5 space-y-1">
              {errors.map((err, i) => (
                <p key={`err-${i}`} className="text-red-300 font-medium">• {err}</p>
              ))}
              {warnings.map((warn, i) => (
                <p key={`warn-${i}`} className="text-amber-200">• {warn}</p>
              ))}
            </div>
            {statusMessage && (
              <p className="mt-1 font-mono text-[11px] text-amber-300 border-t border-amber-800/80 pt-1">
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 mt-1 sm:mt-0">
          <button
            onClick={handleTestClick}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-medium border border-amber-600/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-800/60 rounded text-amber-300 hover:text-amber-100 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
