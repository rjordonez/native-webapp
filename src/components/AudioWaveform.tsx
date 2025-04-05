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
  type: 'fluency' | 'pronunciation' | 'question_boundary';
  timestamp: number;
  description?: string;
  part?: number;
};

interface AudioWaveformProps {
  errors: ErrorMarker[];
  audioSrc?: string; // Optional prop for audio source
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ errors, audioSrc }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  
  // Use a constant for the visual width that matches the waveform generation
  const WAVEFORM_TOTAL_WIDTH = 1200;
  const [sliderValue, setSliderValue] = useState(0);
  const [waveformBars, setWaveformBars] = useState<React.ReactNode[]>([]);
  const totalDuration = 180; // Total duration in seconds (3 minutes)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playingErrorIndex, setPlayingErrorIndex] = useState<number | null>(null);
  const [positionIndicatorVisible, setPositionIndicatorVisible] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Add this ref to keep track of manual seeking
  const isManualSeekingRef = useRef(false);
  // Add this ref to track viewport element for reliable scrolling
  const viewportRef = useRef<HTMLElement | null>(null);

  // Store the viewport element reference once it's available and measure container
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport instanceof HTMLElement) {
        viewportRef.current = viewport;
        
        // Also measure the viewport width
        setContainerWidth(viewport.clientWidth);
        
        // Add resize observer to update container width when resized
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            setContainerWidth(entry.contentRect.width);
          }
        });
        
        resizeObserver.observe(viewport);
        return () => resizeObserver.disconnect();
      }
    }
  }, []);

  // Check for audio availability
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Reset audio when source changes
    audio.pause();
    setIsPlaying(false);
    setPlaybackProgress(0);
    
    const handleCanPlayThrough = () => {
      setAudioError(null);
    };
    
    const handleError = () => {
      setAudioError("Audio file not found or format not supported.");
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    
    // Initial check
    if (audio.error) {
      handleError();
    }
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
    };
  }, [audioSrc]);

  // Generate an improved waveform pattern
  useEffect(() => {
    const bars = [];
    const totalBars = 600; // More bars for smoother appearance
    
    // Generate seed values for a more realistic audio waveform
    const seedValues: number[] = [];
    for (let i = 0; i < 20; i++) {
      seedValues.push(Math.random());
    }
    
    for (let i = 0; i < totalBars; i++) {
      // Create a smoother, more realistic waveform
      const position = i / totalBars;
      
      // Create a baseline wave using multiple sine functions with different frequencies
      let baseHeight = 0;
      
      // Add a few sine waves with different frequencies for a more complex pattern
      baseHeight += Math.sin(position * Math.PI * 10) * 0.3;
      baseHeight += Math.sin(position * Math.PI * 5) * 0.2;
      baseHeight += Math.sin(position * Math.PI * 20) * 0.15;
      
      // Add some interpolated randomness based on seed values
      const seedIndex = Math.floor(position * (seedValues.length - 1));
      const nextSeedIndex = Math.min(seedIndex + 1, seedValues.length - 1);
      const seedProgress = (position * (seedValues.length - 1)) - seedIndex;
      
      const randomComponent = seedValues[seedIndex] * (1 - seedProgress) + 
                             seedValues[nextSeedIndex] * seedProgress;
      
      // Combine the base wave with randomness
      const normalizedHeight = Math.abs(baseHeight) * 0.7 + randomComponent * 0.3;
      
      // Adjust height based on position to create "louder" and "quieter" sections
      let heightMultiplier = 1;
      // Create a few "louder" segments
      if (position > 0.2 && position < 0.3) heightMultiplier = 1.2;
      if (position > 0.5 && position < 0.7) heightMultiplier = 1.3;
      if (position > 0.8 && position < 0.9) heightMultiplier = 1.1;
      
      const height = 2 + normalizedHeight * 25 * heightMultiplier; // Scale to pixel height
      
      // Create connected waveform bars with smoother appearance
      bars.push(
        <div 
          className="inline-block mx-[0.5px]" 
          key={i}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div 
            className="bg-blue-400/70 w-[1px] rounded-sm"
            style={{ 
              height: `${height}px`,
            }}
          />
        </div>
      );
    }
    
    setWaveformBars(bars);
  }, []);

  // Convert a progress percentage to a pixel position within the waveform
  const progressToPosition = (progress: number): number => {
    return (progress / 100) * WAVEFORM_TOTAL_WIDTH;
  };

  // Convert a pixel position to a progress percentage
  const positionToProgress = (position: number): number => {
    return (position / WAVEFORM_TOTAL_WIDTH) * 100;
  };

  // Convert time in seconds to progress percentage
  const timeToProgress = (time: number): number => {
    return (time / totalDuration) * 100;
  };

  // Convert progress percentage to time in seconds
  const progressToTime = (progress: number): number => {
    return (progress / 100) * totalDuration;
  };

  // Function to scroll to a specific position in the waveform
  const scrollToProgress = (progress: number) => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    const viewportWidth = viewport.clientWidth;
    const position = progressToPosition(progress);
    
    // Check if the position is outside the current view
    const leftBound = viewport.scrollLeft;
    const rightBound = viewport.scrollLeft + viewportWidth - 100;
    
    if (position < leftBound || position > rightBound) {
      // Center the position in the viewport
      viewport.scrollLeft = Math.max(0, position - (viewportWidth / 2));
    }
  };

  // Function to handle slider change for scrolling
  const handleSliderChange = (value: number[]) => {
    // Mark that this is a manual seeking action
    isManualSeekingRef.current = true;
    
    const newValue = value[0];
    setSliderValue(newValue);
    setPlaybackProgress(newValue);
    
    // Update audio position when slider changes
    if (audioRef.current) {
      const newTime = progressToTime(newValue);
      audioRef.current.currentTime = newTime;
      setPositionIndicatorVisible(true);
    }
    
    // Scroll the waveform view to match the slider position
    scrollToProgress(newValue);
    
    // Reset the manual seeking flag after a short delay
    setTimeout(() => {
      isManualSeekingRef.current = false;
    }, 100);
  };

  // Function to update slider position when scrolling manually
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    
    const viewport = event.currentTarget;
    const scrollLeft = viewport.scrollLeft;
    const maxScroll = WAVEFORM_TOTAL_WIDTH - viewport.clientWidth;
    const newProgress = (scrollLeft / maxScroll) * 100;
    
    if (Math.abs(newProgress - sliderValue) > 0.5) {
      setSliderValue(newProgress);
      
      // Optionally update audio position to match scroll position if manual seeking
      if (isManualSeekingRef.current && audioRef.current) {
        const newTime = progressToTime(newProgress);
        audioRef.current.currentTime = newTime;
        setPlaybackProgress(newProgress);
      }
    }
  };

  // Function to convert timestamp to position
  const timestampToPosition = (timestamp: number): number => {
    const progress = timeToProgress(timestamp);
    return progressToPosition(progress);
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
        setIsPlaying(false);
      } else {
        if (playingErrorIndex !== null) {
          // Reset specific error playback
          setPlayingErrorIndex(null);
        }
        
        // Reset any previous errors
        setAudioError(null);
        
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Audio playback failed:", error);
          setAudioError("Could not play audio. The file may be missing or in an unsupported format.");
          setIsPlaying(false);
        });
      }
      setPositionIndicatorVisible(true); // Show position indicator when playing/pausing
    }
  };

  // Update progress on time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      // Only update progress if we're not in the middle of a manual seek
      if (!isManualSeekingRef.current) {
        const newProgress = timeToProgress(audio.currentTime);
        setPlaybackProgress(newProgress);
        setPositionIndicatorVisible(true);
        
        // Update the slider value to match audio position
        setSliderValue(newProgress);
        
        // Update scroll position to follow playback if playing
        if (isPlaying) {
          scrollToProgress(newProgress);
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
  }, [isPlaying]);

  // Function to seek to a specific time
  const seekToTime = (time: number) => {
    if (audioRef.current) {
      // Mark as manual seeking
      isManualSeekingRef.current = true;
      
      audioRef.current.currentTime = time;
      const newProgress = timeToProgress(time);
      setPlaybackProgress(newProgress);
      setSliderValue(newProgress);
      setPositionIndicatorVisible(true);
      
      // Also scroll to the new position
      scrollToProgress(newProgress);
      
      // Reset manual seeking flag after a short delay
      setTimeout(() => {
        isManualSeekingRef.current = false;
      }, 100);
    }
  };

  // Function to seek to a specific question
  const seekToQuestion = (questionIndex: number) => {
    const questionBoundary = errors.find(
      error => error.type === 'question_boundary' && error.part === questionIndex
    );
    
    if (questionBoundary && audioRef.current) {
      seekToTime(questionBoundary.timestamp);
    }
  };

  // Function to play a specific error section
  const playErrorSection = (errorIndex: number) => {
    const error = errors[errorIndex];
    if (audioRef.current && error) {
      const startTime = error.timestamp;
      // Calculate end time as a fraction of the total duration based on error.end - error.start
      const endTime = startTime + ((error.end - error.start) / 6); 
      
      // Reset any previous errors
      setAudioError(null);
      
      audioRef.current.currentTime = startTime;
      
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setPlayingErrorIndex(errorIndex);
        setPositionIndicatorVisible(true);
        
        // Scroll to the error position
        const newProgress = timeToProgress(startTime);
        scrollToProgress(newProgress);
        
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
      }).catch(error => {
        console.error("Error section playback failed:", error);
        setAudioError("Could not play audio section. The file may be missing or in an unsupported format.");
        setIsPlaying(false);
      });
    }
  };

  // Function to render error rectangles and question boundaries
  const renderErrorRectangles = () => {
    return errors.map((error, index) => {
      // Calculate the position and width of the error rectangle based on timestamp
      const startPos = timestampToPosition(error.timestamp);
      
      // Special handling for question boundaries
      if (error.type === 'question_boundary') {
        return (
          <TooltipProvider key={`question-${index}`}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div 
                  className="absolute top-0 bottom-0 border-0 bg-black cursor-pointer z-30"
                  style={{ 
                    left: `${startPos}px`,
                    width: '2px',
                    height: '100%'
                  }}
                  onClick={() => seekToQuestion(error.part || 1)}
                />
              </TooltipTrigger>
              <TooltipContent 
                side="top"
                align="center"
                className="bg-gray-800 text-white text-xs font-medium z-50"
                sideOffset={5}
              >
                {error.description || `Question ${error.part}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      // Regular error markers (fluency/pronunciation)
      const endPos = timestampToPosition(error.timestamp + (error.end - error.start) / 6);
      const width = endPos - startPos;
      
      return (
        <TooltipProvider key={`error-${index}`}>
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

  // Get question boundaries for the navigation section
  const questionBoundaries = errors.filter(error => error.type === 'question_boundary');

  return (
    <div className="w-full space-y-2">
      {/* Audio element (hidden) */}
      <audio 
        ref={audioRef} 
        src={audioSrc || '/demo-audio.mp3'} 
        preload="auto"
        onError={() => setAudioError("Audio file not found or format not supported.")}
      >
        Your browser does not support the audio element.
      </audio>
      
      {/* Display audio error if present */}
      {audioError && (
        <div className="text-sm text-red-500 mb-2 p-2 bg-red-50 border border-red-100 rounded-md">
          <span className="font-semibold">Error:</span> {audioError}
          <div className="mt-1 text-xs">
            The waveform visualization will still work, but audio playback is unavailable.
          </div>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-9 h-9 p-0" 
            onClick={togglePlayback}
            disabled={!!audioError}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="w-52">
            <Progress value={playbackProgress} className="h-2" />
          </div>
          <span className="text-xs text-gray-500 w-10">
            {formatTimestamp(progressToTime(playbackProgress))}
          </span>
        </div>
      </div>
      
      <div className="w-full h-[70px] bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200 overflow-hidden relative rounded-md">
        <ScrollArea 
          className="h-full w-full" 
          scrollHideDelay={0}
          ref={scrollAreaRef}
        >
          <div 
            className="w-full h-full relative flex items-center justify-start px-4"
            style={{ minWidth: `${WAVEFORM_TOTAL_WIDTH}px`, minHeight: '70px' }}
            onScroll={handleScroll}
            ref={scrollContainerRef}
          >
            <div className="flex items-center justify-start gap-0 absolute h-full" ref={waveformContainerRef}>
              <div className="flex items-center justify-start h-[40px] my-auto">
                {waveformBars}
              </div>
            </div>
            {renderErrorRectangles()}
            
            {/* Add current playback position indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 shadow-sm"
              style={{ 
                left: `${progressToPosition(playbackProgress)}px`,
                display: positionIndicatorVisible ? 'block' : 'none'
              }}
            />
            
            {/* Clickable waveform background for seeking */}
            <div 
              className="absolute top-0 bottom-0 left-0 right-0 cursor-pointer z-0"
              onClick={(e) => {
                if (scrollContainerRef.current) {
                  const rect = scrollContainerRef.current.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const scrollLeft = viewportRef.current?.scrollLeft || 0;
                  const totalX = clickX + scrollLeft;
                  const clickProgress = positionToProgress(totalX);
                  const clickTime = progressToTime(clickProgress);
                  seekToTime(clickTime);
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
      
      {/* Quick navigation for question boundaries */}
      {questionBoundaries.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {questionBoundaries.map((boundary, index) => (
            <Button 
              key={index}
              variant="outline" 
              size="sm"
              className="text-xs h-8"
              onClick={() => seekToQuestion(boundary.part || index + 1)}
            >
              Question {boundary.part || index + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioWaveform;