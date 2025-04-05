
import React from 'react';
import { cn } from '@/lib/utils';

type ErrorType = 'fluency' | 'pronunciation';

interface ErrorItem {
  timestamp: number;
  type: ErrorType;
  description: string;
  part?: number;
}

interface ErrorListProps {
  errors: (ErrorItem | Partial<ErrorItem>)[];
}

export const ErrorList: React.FC<ErrorListProps> = ({ errors }) => {
  // Convert any partial items to full ErrorItems with defaults
  const normalizedErrors: ErrorItem[] = errors.map(error => ({
    timestamp: error.timestamp || 0,
    type: error.type || 'fluency',
    description: error.description || '',
    part: error.part
  }));
  
  // Group errors by type
  const fluencyErrors = normalizedErrors.filter(error => error.type === 'fluency');
  const pronunciationErrors = normalizedErrors.filter(error => error.type === 'pronunciation');
  
  return (
    <div className="mt-6 space-y-4 animate-fade-in">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Errors Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fluency errors box */}
        <div className="p-4 rounded-lg border border-gray-100 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-pink-400" />
            <h4 className="text-sm font-medium text-pink-800">
              Fluency <span className="text-gray-500 text-xs">({fluencyErrors.length} corrections)</span>
            </h4>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            {fluencyErrors.map((error, index) => (
              <div key={index} className="pl-5 flex">
                <span className="mr-1">•</span>
                <div>
                  <span className="text-xs font-medium">Part {error.part || 1}:</span> {error.description}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pronunciation errors box */}
        <div className="p-4 rounded-lg border border-gray-100 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-purple-400" />
            <h4 className="text-sm font-medium text-purple-700">
              Pronunciation <span className="text-gray-500 text-xs">({pronunciationErrors.length} corrections)</span>
            </h4>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            {pronunciationErrors.map((error, index) => (
              <div key={index} className="pl-5 flex">
                <span className="mr-1">•</span>
                <div>
                  <span className="text-xs font-medium">Part {error.part || 1}:</span> {error.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorList;