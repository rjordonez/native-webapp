
import React from 'react';
import { cn } from '@/lib/utils';

export type ErrorType = 'vocab' | 'tense' | 'article' | 'plural' | 'preposition' | 'pronunciation';

export interface TextError {
  start: number;
  end: number;
  type: ErrorType;
  suggestion: string;
  explanation: string;
}

interface TranscriptWithErrorsProps {
  partNumber: number;
  transcript: string;
  errors: (TextError | Partial<TextError>)[];
  onErrorClick?: (error: TextError) => void;
}

const errorStyles: Record<ErrorType, string> = {
  vocab: 'bg-error-vocab text-black border border-yellow-400 rounded',
  tense: 'bg-red-100 text-gray-800 border-b-2 border-error-tense',
  article: 'bg-blue-100 text-gray-800 border-b-2 border-error-article',
  plural: 'bg-green-100 text-gray-800 border-b-2 border-error-plural',
  preposition: 'bg-purple-100 text-gray-800 border-b-2 border-error-preposition',
  pronunciation: 'bg-purple-100 text-gray-800 border-b-2 border-dotted border-purple-500',
};

export const TranscriptWithErrors: React.FC<TranscriptWithErrorsProps> = ({
  partNumber,
  transcript,
  errors,
  onErrorClick
}) => {
  // Normalize any partial errors to ensure required properties have default values
  const normalizedErrors: TextError[] = errors.map(error => ({
    start: error.start ?? 0,
    end: error.end ?? 5,
    type: error.type ?? 'vocab',
    suggestion: error.suggestion ?? '',
    explanation: error.explanation ?? ''
  }));

  // Sort errors by start position to process them in order
  const sortedErrors = [...normalizedErrors].sort((a, b) => a.start - b.start);
  
  // Render the transcript with highlighted errors
  const renderTranscript = () => {
    let result = [];
    let lastIndex = 0;
    
    sortedErrors.forEach((error, index) => {
      // Add text before the error
      if (error.start > lastIndex) {
        result.push(
          <span key={`text-${index}`}>
            {transcript.substring(lastIndex, error.start)}
          </span>
        );
      }
      
      // Add the highlighted error text
      result.push(
        <span 
          key={`error-${index}`}
          className={cn(
            "px-1 py-0.5 cursor-pointer", 
            errorStyles[error.type]
          )}
          title={error.suggestion}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onErrorClick) {
              onErrorClick(error);
            }
            // Prevent any default behavior completely
            return false;
          }}
        >
          {transcript.substring(error.start, error.end)}
        </span>
      );
      
      lastIndex = error.end;
    });
    
    // Add any remaining text after the last error
    if (lastIndex < transcript.length) {
      result.push(
        <span key="text-end">
          {transcript.substring(lastIndex)}
        </span>
      );
    }
    
    return result;
  };

  return (
    <div className="mt-4 mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Transcript Part {partNumber}</h3>
      <div className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
        <p className="leading-relaxed text-balance">{renderTranscript()}</p>
      </div>
    </div>
  );
};

export default TranscriptWithErrors;