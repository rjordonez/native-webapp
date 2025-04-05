
import React, { useRef, useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TranscriptWithErrors, { TextError } from '@/components/TranscriptWithErrors';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Book, BookText, Type, Languages } from "lucide-react";

interface TranscriptWithErrorsData {
  partNumber: number;
  transcript: string;
  errors: TextError[];
}

interface GrammarSectionProps {
  transcripts: TranscriptWithErrorsData[];
}

const typeToLabel: Record<string, string> = {
  vocab: 'Vocabulary',
  tense: 'Incorrect Tenses',
  article: 'Articles',
  plural: 'Plural/Singular',
  preposition: 'Wrong Preposition',
  // Removed pronunciation
};

const typeToColor: Record<string, string> = {
  vocab: 'bg-error-vocab',
  tense: 'bg-error-tense',
  article: 'bg-error-article',
  plural: 'bg-error-plural',
  preposition: 'bg-error-preposition',
  // Removed pronunciation
};

const typeToTextColor: Record<string, string> = {
  vocab: 'text-yellow-800',
  tense: 'text-error-tense',
  article: 'text-error-article',
  plural: 'text-green-700',
  preposition: 'text-purple-700',
};

interface ExtendedTextError extends TextError {
  partNumber: number;
  text: string;
  uniqueId: string;
  sentenceIndex: number; // Added for sorting by sentence
  wordIndex: number;     // Added for sorting by word position
}

const ErrorItem = ({ 
  error, 
  text, 
  isActive, 
  onClick
}: { 
  error: ExtendedTextError, 
  text: string,
  isActive: boolean,
  onClick: () => void
}) => {
  const errorText = text.substring(error.start, error.end);
  const itemRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isActive && itemRef.current) {
      // Only scroll within the ScrollArea component, without affecting page scroll
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive]);
  
  // Skip rendering pronunciation errors
  if (error.type === 'pronunciation') {
    return null;
  }
  
  return (
    <AccordionItem 
      value={`error-${error.uniqueId}`}
      className="border-b border-gray-200"
      ref={itemRef}
    >
      <AccordionTrigger 
        className="py-3 hover:no-underline"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        <div className="flex items-center gap-3 text-left">
          <div className={`w-3 h-3 rounded-full ${typeToColor[error.type]} border border-white`}></div>
          <div>
            <div className={`text-sm ${typeToTextColor[error.type]}`}>{typeToLabel[error.type]}</div>
            <div className="font-medium text-gray-800">{errorText}</div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pl-6 pr-2 pb-3">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm mb-2 font-medium">Suggestion: {error.suggestion}</div>
          <div className="text-xs text-gray-600">{error.explanation}</div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Helper function to get sentence index based on character position
const getSentenceIndex = (text: string, position: number): number => {
  const textBeforePosition = text.substring(0, position);
  const sentences = textBeforePosition.split(/[.!?]+/);
  return Math.max(0, sentences.length - 1);
};

const GrammarSection: React.FC<GrammarSectionProps> = ({ transcripts }) => {
  const [activeError, setActiveError] = useState<string | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [transcriptHeight, setTranscriptHeight] = useState<number>(0);
  
  // Track which error types are active (initially all are active)
  const [activeErrorTypes, setActiveErrorTypes] = useState<Record<string, boolean>>({
    vocab: true,
    tense: true, 
    article: true,
    plural: true,
    preposition: true
  });
  
  // Calculate if any filter is currently active
  const isFilterActive = Object.values(activeErrorTypes).some(value => !value);

  // Filter out pronunciation errors from all transcripts
  const filteredTranscripts = transcripts.map(transcript => ({
    ...transcript,
    errors: transcript.errors.filter(error => {
      // First filter out pronunciation errors
      if (error.type === 'pronunciation') return false;
      
      // If no filter is active (all are true), show all errors
      if (!isFilterActive) return true;
      
      // Otherwise, only show errors of selected types
      return activeErrorTypes[error.type];
    })
  }));
  
  // Flatten all errors from all transcripts, add unique IDs and sentence/word indices
  const allErrors = filteredTranscripts.flatMap((transcript) => 
    transcript.errors.map(error => {
      const sentenceIndex = getSentenceIndex(transcript.transcript, error.start);
      return {
        ...error,
        partNumber: transcript.partNumber,
        text: transcript.transcript,
        uniqueId: `${transcript.partNumber}-${error.start}-${error.end}`,
        sentenceIndex,
        wordIndex: error.start
      };
    })
  ).filter(error => {
    // Apply filtering again to the error list
    if (!isFilterActive) return true;
    return activeErrorTypes[error.type];
  });

  // Sort errors by part number, then by sentence index, then by word position
  const sortedErrors = [...allErrors].sort((a, b) => {
    if (a.partNumber !== b.partNumber) return a.partNumber - b.partNumber;
    if (a.sentenceIndex !== b.sentenceIndex) return a.sentenceIndex - b.sentenceIndex;
    return a.wordIndex - b.wordIndex;
  });

  // Update transcript container height when component mounts
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const height = transcriptContainerRef.current.getBoundingClientRect().height;
      setTranscriptHeight(height);
    }
  }, [filteredTranscripts]);

  // Handle error selection from transcript
  const handleErrorClick = (error: TextError, partNumber: number) => {
    const uniqueId = `${partNumber}-${error.start}-${error.end}`;
    
    // Toggle active state if clicking the same error again
    if (activeError === `error-${uniqueId}`) {
      setActiveError(null);
    } else {
      setActiveError(`error-${uniqueId}`);
    }
  };

  // Toggle a specific error type filter
  const toggleErrorType = (type: string) => {
    // If this is the only active filter and user tries to turn it off,
    // turn all filters back on (reset to "show all")
    if (isFilterActive && activeErrorTypes[type] && 
        Object.entries(activeErrorTypes).filter(([_, active]) => active).length === 1) {
      // Reset to all filters active
      setActiveErrorTypes({
        vocab: true,
        tense: true,
        article: true,
        plural: true,
        preposition: true
      });
      return;
    }
    
    // If all filters are on and user clicks one, turn off all others
    if (!isFilterActive) {
      const newState = {
        vocab: false,
        tense: false,
        article: false,
        plural: false,
        preposition: false
      };
      newState[type] = true;
      setActiveErrorTypes(newState);
      return;
    }
    
    // Otherwise toggle just this one filter
    setActiveErrorTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <section>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium mb-2">Grammar & Vocabulary</h2>
          <p className="text-gray-500 text-sm">Review and correct your language errors</p>
        </div>
        
        {/* Filter toggles positioned at the top right */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Toggle 
            pressed={!isFilterActive || activeErrorTypes.vocab} 
            onPressedChange={() => toggleErrorType('vocab')}
            className={`${!isFilterActive || activeErrorTypes.vocab ? 'bg-amber-100 text-amber-800' : 'text-gray-400'} border`}
            size="sm"
          >
            <BookText className="h-3.5 w-3.5 mr-1" />
            Vocabulary
          </Toggle>
          <Toggle 
            pressed={!isFilterActive || activeErrorTypes.tense} 
            onPressedChange={() => toggleErrorType('tense')}
            className={`${!isFilterActive || activeErrorTypes.tense ? 'bg-red-100 text-red-800' : 'text-gray-400'} border`}
            size="sm"
          >
            <Languages className="h-3.5 w-3.5 mr-1" />
            Tenses
          </Toggle>
          <Toggle 
            pressed={!isFilterActive || activeErrorTypes.article} 
            onPressedChange={() => toggleErrorType('article')}
            className={`${!isFilterActive || activeErrorTypes.article ? 'bg-blue-100 text-blue-800' : 'text-gray-400'} border`}
            size="sm"
          >
            <Type className="h-3.5 w-3.5 mr-1" />
            Articles
          </Toggle>
          <Toggle 
            pressed={!isFilterActive || activeErrorTypes.plural} 
            onPressedChange={() => toggleErrorType('plural')}
            className={`${!isFilterActive || activeErrorTypes.plural ? 'bg-green-100 text-green-800' : 'text-gray-400'} border`}
            size="sm"
          >
            <Book className="h-3.5 w-3.5 mr-1" />
            Plural
          </Toggle>
          <Toggle 
            pressed={!isFilterActive || activeErrorTypes.preposition} 
            onPressedChange={() => toggleErrorType('preposition')}
            className={`${!isFilterActive || activeErrorTypes.preposition ? 'bg-purple-100 text-purple-800' : 'text-gray-400'} border`}
            size="sm"
          >
            <Languages className="h-3.5 w-3.5 mr-1" />
            Preposition
          </Toggle>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Transcript sections */}
        <div ref={transcriptContainerRef}>
          {filteredTranscripts.map((transcript) => (
            <TranscriptWithErrors
              key={transcript.partNumber}
              partNumber={transcript.partNumber}
              transcript={transcript.transcript}
              errors={transcript.errors}
              onErrorClick={(error) => handleErrorClick(error, transcript.partNumber)}
            />
          ))}
        </div>
        
        {/* Right Column: Error list with scrollable container */}
        <div className="relative">
          <div 
            className="sticky top-4"
            style={{ maxHeight: transcriptHeight > 0 ? `${transcriptHeight}px` : 'auto' }}
          >
            <div className="relative">
              <ScrollArea 
                className="pr-2" 
                style={{ height: transcriptHeight > 0 ? `${transcriptHeight - 10}px` : '400px' }}
              >
                <Accordion 
                  type="single" 
                  collapsible 
                  className="w-full"
                  value={activeError || undefined}
                >
                  {sortedErrors.map((error, index) => (
                    <ErrorItem 
                      key={index} 
                      error={error} 
                      text={transcripts.find(t => t.partNumber === error.partNumber)?.transcript || ""} 
                      isActive={activeError === `error-${error.uniqueId}`}
                      onClick={() => {
                        if (activeError === `error-${error.uniqueId}`) {
                          setActiveError(null);
                        } else {
                          setActiveError(`error-${error.uniqueId}`);
                        }
                      }}
                    />
                  ))}
                </Accordion>
                
                {sortedErrors.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No grammar or vocabulary errors found with current filters.
                  </div>
                )}
              </ScrollArea>
              {/* Top fade effect for scrollable content */}
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
              {/* Bottom fade effect for scrollable content */}
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GrammarSection;