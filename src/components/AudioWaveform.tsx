
import React, { useRef, useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause } from "lucide-react";

type ErrorMarker = {
  start: number;
  end: number;
  type: 'fluency' | 'pronunciation';
  timestamp: number;
  description?: string;
  part?: number;
};

interface AudioWaveformProps {
  errors: ErrorMarker[];
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ errors }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [totalWidth, setTotalWidth] = useState(1200); // Fixed at 50% of original 2400px
  const [sliderValue, setSliderValue] = useState(0);
  const [waveformBars, setWaveformBars] = useState<React.ReactNode[]>([]);
  const totalDuration = 180; // Total duration in seconds (3 minutes)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playingErrorIndex, setPlayingErrorIndex] = useState<number | null>(null);
  // Track if position indicator should be visible
  const [positionIndicatorVisible, setPositionIndicatorVisible] = useState(false);

  // Generate a connected waveform pattern
  useEffect(() => {
    const bars = [];
    const totalBars = 400; // Number of bars
    
    for (let i = 0; i < totalBars; i++) {
      // Create a more natural wave pattern using sine functions
      const position = i / totalBars;
      const frequency = 2 + Math.sin(position * 8) * 1.5;
      const amplitude = 0.5 + Math.cos(position * 5) * 0.3;
      
      // Calculate height based on position with some randomness
      const baseHeight = Math.sin(position * frequency * Math.PI) * amplitude;
      const randomFactor = Math.random() * 0.3; // Add some randomness
      const normalizedHeight = Math.abs(baseHeight) + randomFactor;
      const height = 5 + normalizedHeight * 25; // Scale to pixel height (5-30px)
      
      bars.push(
        <div className="flex flex-col items-center justify-center" key={i}>
          <div 
            className="audio-wave-bar bg-gray-400 w-[3px] rounded-t-full mb-0"
            style={{ 
              height: `${height}px`,
            }}
          />
          <div 
            className="audio-wave-bar bg-gray-400 w-[3px] rounded-b-full mt-0"
            style={{ 
              height: `${height}px`,
            }}
          />
        </div>
      );
    }
    
    setWaveformBars(bars);
  }, []);

  // Function to handle slider change for scrolling
  const handleSliderChange = (value: number[]) => {
    if (scrollAreaRef.current) {
      const maxScroll = totalWidth - scrollAreaRef.current.clientWidth;
      const newScrollPosition = (value[0] / 100) * maxScroll;
      
      // Set the scrollLeft property directly on the scroll area's firstChild (the viewport)
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport instanceof HTMLElement) {
        viewport.scrollLeft = newScrollPosition;
      }
      
      setSliderValue(value[0]);
    }
  };

  // Function to update slider position when scrolling manually
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (scrollAreaRef.current) {
      const viewport = event.currentTarget;
      const scrollLeft = viewport.scrollLeft;
      const maxScroll = totalWidth - viewport.clientWidth;
      const newSliderValue = (scrollLeft / maxScroll) * 100;
      
      if (Math.abs(newSliderValue - sliderValue) > 0.5) {
        setSliderValue(newSliderValue);
      }
    }
  };

  // Function to convert timestamp to position
  const timestampToPosition = (timestamp: number): number => {
    return (timestamp / totalDuration) * totalWidth;
  };

  // Function to format timestamp as MM:SS
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Play/pause functionality
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (playingErrorIndex !== null) {
          // Reset specific error playback
          setPlayingErrorIndex(null);
        }
        audioRef.current.play().catch(error => {
          console.error("Audio playback failed:", error);
        });
      }
      setIsPlaying(!isPlaying);
      setPositionIndicatorVisible(true); // Show position indicator when playing/pausing
    }
  };

  // Update progress on time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const progress = (audio.currentTime / totalDuration) * 100;
      setPlaybackProgress(progress);
      setPositionIndicatorVisible(true); // Make sure indicator is visible during playback
      
      // Update scroll position to follow playback
      if (scrollAreaRef.current && isPlaying) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport instanceof HTMLElement) {
          const position = (audio.currentTime / totalDuration) * totalWidth;
          const viewportWidth = viewport.clientWidth;
          
          // Only auto-scroll if the current position would be out of view
          if (position < viewport.scrollLeft || position > viewport.scrollLeft + viewportWidth) {
            viewport.scrollLeft = Math.max(0, position - (viewportWidth / 2));
            // Update slider value to match scroll position
            const maxScroll = totalWidth - viewportWidth;
            setSliderValue((viewport.scrollLeft / maxScroll) * 100);
          }
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (playingErrorIndex !== null) {
        setPlayingErrorIndex(null);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isPlaying, totalWidth, playingErrorIndex]);

  // Function to seek to a specific time
  const seekToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      const progress = (time / totalDuration) * 100;
      setPlaybackProgress(progress);
      setPositionIndicatorVisible(true); // Show indicator when seeking
    }
  };

  // Function to play a specific error section
  const playErrorSection = (errorIndex: number) => {
    const error = errors[errorIndex];
    if (audioRef.current && error) {
      const startTime = error.timestamp;
      // Calculate end time as a fraction of the total duration based on error.end - error.start
      const endTime = startTime + ((error.end - error.start) / 6); 
      
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(error => {
        console.error("Error section playback failed:", error);
      });
      setIsPlaying(true);
      setPlayingErrorIndex(errorIndex);
      setPositionIndicatorVisible(true); // Show indicator when playing error section
      
      // Set up a one-time listener to stop when reaching the end of the error section
      const checkTime = () => {
        if (audioRef.current && audioRef.current.currentTime >= endTime) {
          audioRef.current.pause();
          setIsPlaying(false);
          setPlayingErrorIndex(null);
          audioRef.current.removeEventListener('timeupdate', checkTime);
        }
      };
      
      audioRef.current.addEventListener('timeupdate', checkTime);
    }
  };

  // Function to render error rectangles
  const renderErrorRectangles = () => {
    return errors.map((error, index) => {
      // Calculate the position and width of the error rectangle based on timestamp
      const startPos = timestampToPosition(error.timestamp);
      const endPos = timestampToPosition(error.timestamp + (error.end - error.start) / 6);
      const width = endPos - startPos;
      
      return (
        <TooltipProvider key={index}>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "absolute top-0 bottom-0 border-2 cursor-pointer",
                  error.type === 'fluency' 
                    ? "border-pink-400" 
                    : "border-purple-400",
                  "z-10 hover:bg-opacity-20 hover:bg-gray-200 transition-all",
                  playingErrorIndex === index ? "bg-gray-200 bg-opacity-30" : ""
                )}
                style={{ 
                  left: `${startPos}px`,
                  width: `${Math.max(width, 15)}px`, // Ensure minimum width for visibility
                }}
                onClick={() => playErrorSection(index)}
              />
            </TooltipTrigger>
            <TooltipContent 
              side="top"
              align="center"
              className={cn(
                "text-xs font-medium w-auto max-w-[220px] z-50", // z-50 to ensure tooltip shows on top
                error.type === 'fluency' 
                  ? "bg-pink-100 text-pink-800 border border-pink-200" 
                  : "bg-purple-100 text-purple-800 border border-purple-200"
              )}
              sideOffset={5}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold">{error.type === 'fluency' ? 'Fluency Issue' : 'Pronunciation Issue'}</span>
                  <span className="text-xs opacity-80">Part {error.part || 1}</span>
                </div>
                <span>{error.description || 'No description available'}</span>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="mt-1 h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    playErrorSection(index);
                  }}
                >
                  <Play className="h-3 w-3 mr-1" /> Play This Section
                </Button>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    });
  };

  return (
    <div className="w-full space-y-2">
      {/* Audio element (hidden) */}
      <audio ref={audioRef} src="/demo-audio.mp3" preload="auto">
        Your browser does not support the audio element.
      </audio>

      {/* Playback controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-9 h-9 p-0" 
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="w-52">
            <Progress value={playbackProgress} className="h-2" />
          </div>
          <span className="text-xs text-gray-500 w-10">
            {formatTimestamp((playbackProgress / 100) * totalDuration)}
          </span>
        </div>
      </div>
      
      <div className="w-full h-[70px] bg-gray-50 border border-gray-200 overflow-hidden relative">
        <ScrollArea 
          className="h-full w-full" 
          scrollHideDelay={0}
          ref={scrollAreaRef}
        >
          <div 
            className="w-full h-full relative flex items-center justify-start px-4"
            style={{ minWidth: `${totalWidth}px`, minHeight: '70px' }}
            onScroll={handleScroll}
            ref={scrollContainerRef}
          >
            <div className="flex items-center justify-start gap-0 absolute">
              {waveformBars}
            </div>
            {renderErrorRectangles()}
            
            {/* Add current playback position indicator - always visible now */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
              style={{ 
                left: `${(playbackProgress / 100) * totalWidth}px`,
                display: positionIndicatorVisible ? 'block' : 'none'
              }}
            />
            
            {/* Clickable waveform background for seeking */}
            <div 
              className="absolute top-0 bottom-0 left-0 right-0 cursor-pointer z-0"
              onClick={(e) => {
                if (scrollContainerRef.current) {
                  const rect = scrollContainerRef.current.getBoundingClientRect();
                  const offset = e.clientX - rect.left;
                  const clickPosition = offset / totalWidth;
                  const newTime = clickPosition * totalDuration;
                  seekToTime(newTime);
                }
              }}
            />
          </div>
        </ScrollArea>
      </div>
      
      {/* Slider for horizontal navigation */}
      <div className="px-1">
        <Slider
          value={[sliderValue]}
          max={100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="h-2"
        />
      </div>
    </div>
  );
};

export default AudioWaveform;