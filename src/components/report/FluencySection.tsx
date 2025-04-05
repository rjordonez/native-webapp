
import React, { useState } from 'react';
import AudioWaveform from '@/components/AudioWaveform';
import ErrorList from '@/components/ErrorList';

export type AudioErrorMarker = {
  start: number;
  end: number;
  type: 'fluency' | 'pronunciation';
  timestamp: number;
  description?: string;
  part?: number;
};

export type AudioErrorItem = {
  timestamp: number;
  type: 'fluency' | 'pronunciation';
  description: string;
  part?: number;
};

interface FluencySectionProps {
  audioErrors: AudioErrorMarker[];
  errorList: AudioErrorItem[];
}

const FluencySection: React.FC<FluencySectionProps> = ({ audioErrors, errorList }) => {
  return (
    <section>
      <div className="flex flex-wrap items-center mb-6 gap-4">
        <h2 className="text-xl font-medium">Fluency & Pronunciation</h2>
        <div className="flex items-center space-x-2">
          <span className="inline-block w-3 h-3 rounded-full bg-pink-400"></span>
          <span className="text-sm text-gray-500">Fluency</span>
          <span className="inline-block w-3 h-3 rounded-full bg-purple-400 ml-2"></span>
          <span className="text-sm text-gray-500">Pronunciation</span>
        </div>
        <div className="text-sm text-gray-500 ml-auto">
          <span>Click on markers to play specific sections</span>
        </div>
      </div>
      
      <AudioWaveform errors={audioErrors} />
      <ErrorList errors={errorList} />
    </section>
  );
};

export default FluencySection;