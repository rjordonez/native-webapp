import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AppNavbar from '@/components/AppNavbar';
import { sendToAnalysisAPI } from '@/lib/api-services';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GradingService, StudentPerformance, GradeDistribution } from '@/lib/grading-service';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

// Define types
interface AudioSubmission {
  audioUrl: string;
  questionId: number;
}

interface BenchmarkTest {
  id: string;
  name: string;
  submission_uid: string;
  audioSubmissions: AudioSubmission[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  results?: any;
  error?: string;
  metrics?: AnalysisMetrics;
  abortedPolling?: boolean;
}

interface AnalysisMetrics {
  processingTime: number;
  pronunciationScores: number[];
  fluencyScores: number[];
  grammarIssuesCount: number;
  vocabularySuggestionsCount: number;
  overallScore: number;
  letterGrade?: string;
}

interface TestSummary {
  testId: string;
  timeElapsed: number;
  successfulLoads: number;
  failedLoads: number;
  avgScore: number;
  letterGrade: string;
}

// Predefined test data
const benchmarkTestsData = [
  { 
    id: '1', 
    name: 'Benchmark Test 1',
    submission_uid: 'test_uid_1', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/92/0_1744738933523.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/92/1_1744738949030.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/92/2_1744738961990.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/92/3_1744738969667.webm", "questionId": 3}]')
  },
  { 
    id: '2', 
    name: 'Benchmark Test 2',
    submission_uid: 'test_uid_2', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/96/0_1744738663266.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/96/1_1744738673205.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/96/2_1744738681758.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/96/3_1744738689435.webm", "questionId": 3}]')
  },
  { 
    id: '3', 
    name: 'Benchmark Test 3',
    submission_uid: 'test_uid_3', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/93/0_1744738137493.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/93/1_1744738155577.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/93/2_1744738163938.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/93/3_1744738173435.webm", "questionId": 3}]')
  },
  { 
    id: '4', 
    name: 'Benchmark Test 4',
    submission_uid: 'test_uid_4', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/95/0_1744737623363.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/95/1_1744737640465.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/95/2_1744737648906.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/95/3_1744737656375.webm", "questionId": 3}]')
  },
  { 
    id: '5', 
    name: 'Benchmark Test 5',
    submission_uid: 'test_uid_5', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/94/0_1744737232092.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/94/1_1744737274647.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/94/2_1744737308417.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/ef09cf11-6a08-4fc9-8f33-9722b4d9dcdc/94/3_1744737316639.webm", "questionId": 3}]')
  },
  { 
    id: '6', 
    name: 'Benchmark Test 6',
    submission_uid: 'test_uid_6', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/91/0_1744736633232.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/91/1_1744736640587.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/91/2_1744736649410.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/91/3_1744736656872.webm", "questionId": 3}]')
  },
  { 
    id: '7', 
    name: 'Benchmark Test 7',
    submission_uid: 'test_uid_7', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/90/0_1744736394297.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/90/1_1744736414813.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/90/2_1744736425166.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/90/3_1744736443660.webm", "questionId": 3}]')
  },
  { 
    id: '8', 
    name: 'Benchmark Test 8',
    submission_uid: 'test_uid_8', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/89/0_1744736188631.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/89/1_1744736209151.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/89/2_1744736220481.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/b0ac135e-d999-4114-82b5-d4fc933bd5e0/89/3_1744736236153.webm", "questionId": 3}]')
  },
  { 
    id: '9', 
    name: 'Benchmark Test 9',
    submission_uid: 'test_uid_9', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/268a208c-cb9c-4645-980a-6c8a0d87fe19/53/0_1744508869419.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/268a208c-cb9c-4645-980a-6c8a0d87fe19/53/1_1744508906969.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/268a208c-cb9c-4645-980a-6c8a0d87fe19/53/2_1744508954357.webm", "questionId": 2}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/268a208c-cb9c-4645-980a-6c8a0d87fe19/53/3_1744508992447.webm", "questionId": 3}]')
  },
  { 
    id: '10', 
    name: 'Benchmark Test 10',
    submission_uid: 'test_uid_10', 
    audioSubmissions: JSON.parse('[{"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/04bfb377-9acf-4087-a83b-6569566f9b5c/58/0_1744502826547.webm", "questionId": 0}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/04bfb377-9acf-4087-a83b-6569566f9b5c/58/1_1744502882678.webm", "questionId": 1}, {"audioUrl": "https://zyaobehxpcwxlyljzknw.supabase.co/storage/v1/object/public/audio_recordings/04bfb377-9acf-4087-a83b-6569566f9b5c/58/2_1744502939640.webm", "questionId": 2}]')
  }
];

// Helper function to extract metrics from analysis results
const extractMetrics = (analysisResults: any): AnalysisMetrics => {
  try {
    // Default values in case of missing data
    const metrics: AnalysisMetrics = {
      processingTime: 0,
      pronunciationScores: [],
      fluencyScores: [],
      grammarIssuesCount: 0,
      vocabularySuggestionsCount: 0,
      overallScore: 0
    };
    
    // Calculate processing time
    if (analysisResults.timestamp) {
      const endTime = new Date(analysisResults.timestamp).getTime();
      metrics.processingTime = endTime - (analysisResults.start_time || endTime);
    }
    
    // Extract pronunciation scores
    if (analysisResults.pronunciation_analysis && Array.isArray(analysisResults.pronunciation_analysis)) {
      metrics.pronunciationScores = analysisResults.pronunciation_analysis.map(
        (analysis: any) => analysis.overall_pronunciation_score || 0
      );
    }
    
    // Extract fluency scores
    const fluencyCoherenceAnalysis = analysisResults.fluency_coherence_analysis || {};
    Object.keys(fluencyCoherenceAnalysis).forEach(key => {
      const analysis = fluencyCoherenceAnalysis[key];
      if (analysis && analysis.fluency_metrics && analysis.fluency_metrics.overall_fluency_score) {
        metrics.fluencyScores.push(analysis.fluency_metrics.overall_fluency_score);
      }
    });
    
    // Count grammar issues
    const grammarAnalysis = analysisResults.grammar_analysis || {};
Object.values(grammarAnalysis).forEach((file: any) => {
  const gc = file.grammar_corrections || {};
  Object.values(gc).forEach((sent: any) => {
    metrics.grammarIssuesCount += (sent.corrections?.length || 0);
  });
});

// Count vocabulary suggestions ↓
Object.values(grammarAnalysis).forEach((file: any) => {
  const vs = file.vocabulary_suggestions || {};
  Object.values(vs).forEach((sent: any) => {
    metrics.vocabularySuggestionsCount += (sent.suggestions?.length || 0);
  });
});
    
    // Count vocabulary suggestions
    const vocabSuggestions = analysisResults.vocabulary_suggestions || {};
    Object.keys(vocabSuggestions).forEach(key => {
      const suggestions = vocabSuggestions[key];
      if (suggestions && suggestions.suggestions) {
        metrics.vocabularySuggestionsCount += suggestions.suggestions.length;
      }
    });
    
    // Calculate overall score (average of pronunciation and fluency)
    const avgPronunciation = metrics.pronunciationScores.length > 0 
      ? metrics.pronunciationScores.reduce((a, b) => a + b, 0) / metrics.pronunciationScores.length 
      : 0;
    
    const avgFluency = metrics.fluencyScores.length > 0 
      ? metrics.fluencyScores.reduce((a, b) => a + b, 0) / metrics.fluencyScores.length 
      : 0;
    
    metrics.overallScore = (avgPronunciation + avgFluency) / 2;
    
    // Use GradingService to calculate letter grade
    metrics.letterGrade = GradingService.getLetterGrade(metrics.overallScore);
    
    return metrics;
  } catch (error) {
    console.error('Error extracting metrics:', error);
    return {
      processingTime: 0,
      pronunciationScores: [],
      fluencyScores: [],
      grammarIssuesCount: 0,
      vocabularySuggestionsCount: 0,
      overallScore: 0
    };
  }
};

// Mock student performance data for grading service tests
const createMockStudentData = (benchmarkTests: BenchmarkTest[]): StudentPerformance[] => {
  return benchmarkTests
    .filter(test => test.status === 'completed' && test.metrics)
    .map(test => ({
      id: test.id,
      name: `Benchmark ${test.id}`,
      percentage: test.metrics?.overallScore || null,
      completedAssignments: test.audioSubmissions.length,
      totalAssignments: test.audioSubmissions.length
    }));
};

// Main component
const VoiceAnalysisBenchmarkPage: React.FC = () => {
  const navigate = useNavigate();
  const [benchmarkTests, setBenchmarkTests] = useState<BenchmarkTest[]>([]);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);
  const [studentPerformanceData, setStudentPerformanceData] = useState<StudentPerformance[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution | null>(null);
  const [classAverage, setClassAverage] = useState<number>(0);
  const [testSummaries, setTestSummaries] = useState<TestSummary[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Initialize with predefined test data
  useEffect(() => {
    const initializedTests = benchmarkTestsData.map(test => ({
      ...test,
      status: 'pending' as const
    }));
    setBenchmarkTests(initializedTests);
    
    if (initializedTests.length > 0) {
      setActiveTestId(initializedTests[0].id);
    }
  }, []);
  
  // Update performance data when tests change
  useEffect(() => {
    const completedTests = benchmarkTests.filter(test => 
      test.status === 'completed' && test.results && test.metrics
    );
    
    if (completedTests.length > 0) {
      // Create student performance data for GradingService
      const performanceData = createMockStudentData(completedTests);
      setStudentPerformanceData(performanceData);
      
      // Calculate class average using GradingService
      const average = GradingService.calculateClassAverage(performanceData);
      setClassAverage(average);
      
      // Calculate grade distribution using GradingService
      const distribution = GradingService.getGradeDistribution(performanceData);
      setGradeDistribution(distribution);
      
      // Create test summaries
      const summaries = completedTests.map(test => ({
        testId: test.id,
        timeElapsed: (test.endTime || 0) - (test.startTime || 0),
        successfulLoads: test.status === 'completed' ? 1 : 0,
        failedLoads: test.status === 'failed' ? 1 : 0,
        avgScore: test.metrics?.overallScore || 0,
        letterGrade: GradingService.getLetterGrade(test.metrics?.overallScore || 0)
      }));
      setTestSummaries(summaries);
    } else {
      setStudentPerformanceData([]);
      setClassAverage(0);
      setGradeDistribution(null);
      setTestSummaries([]);
    }
  }, [benchmarkTests]);
  
  // Function to run a single benchmark test
  const runBenchmarkTest = async (testId: string) => {
    // Find the test
    const testIndex = benchmarkTests.findIndex(test => test.id === testId);
    if (testIndex === -1) return;
    
    const test = benchmarkTests[testIndex];
    
    // Update status to processing
    setBenchmarkTests(prev => {
      const updated = [...prev];
      updated[testIndex] = {
        ...updated[testIndex],
        status: 'processing',
        startTime: Date.now(),
        results: undefined,
        error: undefined,
        metrics: undefined,
        abortedPolling: true
      };
      return updated;
    });
    
    try {
      // Extract just the audio URLs
      const audioUrls = test.audioSubmissions.map(sub => sub.audioUrl);
      
      // Send to analysis API
      await sendToAnalysisAPI(audioUrls, test.submission_uid);
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5s interval)
      const pollInterval = 5000; // 5 seconds
      
      const pollForResults = async () => {
        const currentTest = benchmarkTests[testIndex];

        if (currentTest?.abortedPolling) {
            console.log(`Polling aborted for Test ${currentTest.id}`);
            return; // 🔥 stop polling silently if manually fetched
        }
        try {
          const { data, error } = await supabase.storage
            .from("analysis-results")
            .download(`${test.submission_uid}.json`);
          
          if (error) {
            // If still processing, continue polling
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pollForResults, pollInterval);
            } else {
              // Max attempts reached, mark as failed
              setBenchmarkTests(prev => {
                const updated = [...prev];
                updated[testIndex] = {
                  ...updated[testIndex],
                  status: 'failed',
                  endTime: Date.now(),
                  error: 'Timed out waiting for results'
                };
                return updated;
              });
            }
            return;
          }
          
          // Process the results
          const fileText = await data.text();
          const jsonData = JSON.parse(fileText);
          
          // Extract metrics and assign a letter grade using GradingService
          const metrics = extractMetrics(jsonData);
          
          // Update the test with results and metrics
          setBenchmarkTests(prev => {
            const updated = [...prev];
            updated[testIndex] = {
              ...updated[testIndex],
              status: 'completed',
              endTime: Date.now(),
              results: jsonData,
              metrics: metrics
            };
            return updated;
          });
          
          toast.success(`Benchmark test ${test.id} completed with grade ${metrics.letterGrade}`);
        } catch (e) {
          console.error("Error polling for results:", e);
          
          // If still within attempts limit, continue polling
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(pollForResults, pollInterval);
          } else {
            // Max attempts reached, mark as failed
            setBenchmarkTests(prev => {
              const updated = [...prev];
              updated[testIndex] = {
                ...updated[testIndex],
                status: 'failed',
                endTime: Date.now(),
                error: e.message || 'Failed to load results'
              };
              return updated;
            });
          }
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollForResults, 5000);
    } catch (error) {
      console.error(`Error running test ${testId}:`, error);
      
      // Update the test with error
      setBenchmarkTests(prev => {
        const updated = [...prev];
        updated[testIndex] = {
          ...updated[testIndex],
          status: 'failed',
          endTime: Date.now(),
          error: error.message || 'Failed to start test'
        };
        return updated;
      });
      
      toast.error(`Failed to run benchmark test ${testId}`);
    }
  };
  
  // Function to run all benchmark tests
  const runAllBenchmarkTests = async () => {
    if (runningBatch) return;
    
    setRunningBatch(true);
    toast.info('Running all benchmark tests. This may take several minutes.');
    
    try {
      // Reset all tests to pending
      setBenchmarkTests(prev => prev.map(test => ({
        ...test,
        status: 'pending',
        startTime: undefined,
        endTime: undefined,
        results: undefined,
        error: undefined,
        metrics: undefined
      })));
      
      // Run tests sequentially
      for (const test of benchmarkTests) {
        await runBenchmarkTest(test.id);
        
        // Add a small delay between tests to avoid overloading the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Error running batch tests:', error);
      toast.error('Failed to complete all benchmark tests');
    } finally {
      setRunningBatch(false);
    }
  };
  
  // Function to reset all tests
  const resetAllTests = () => {
    setBenchmarkTests(prev => prev.map(test => ({
      ...test,
      status: 'pending',
      startTime: undefined,
      endTime: undefined,
      results: undefined,
      error: undefined,
      metrics: undefined
    })));
    
    setStudentPerformanceData([]);
    setClassAverage(0);
    setGradeDistribution(null);
    toast.info('All benchmark tests reset');
  };
  
  // Get the active test
  const activeTest = activeTestId ? benchmarkTests.find(test => test.id === activeTestId) : null;
  
  // Chart data preparation
  const prepareProcessingTimeChartData = () => {
    return benchmarkTests
      .filter(test => test.status === 'completed' && test.startTime && test.endTime)
      .map(test => ({
        name: `Test ${test.id}`,
        processingTime: (test.endTime! - test.startTime!) / 1000 // Convert to seconds
      }));
  };
  
  const prepareScoreChartData = () => {
    return benchmarkTests
      .filter(test => test.status === 'completed' && test.metrics)
      .map(test => {
        const metrics = test.metrics!;
        return {
          name: `Test ${test.id}`,
          pronunciation: metrics.pronunciationScores.length > 0 
            ? metrics.pronunciationScores.reduce((a, b) => a + b, 0) / metrics.pronunciationScores.length 
            : 0,
          fluency: metrics.fluencyScores.length > 0 
            ? metrics.fluencyScores.reduce((a, b) => a + b, 0) / metrics.fluencyScores.length 
            : 0,
          overall: metrics.overallScore,
          grade: metrics.letterGrade || GradingService.getLetterGrade(metrics.overallScore)
        };
      });
  };
  
  const prepareIssuesChartData = () => {
    return benchmarkTests
      .filter(test => test.status === 'completed' && test.metrics)
      .map(test => {
        const metrics = test.metrics!;
        return {
          name: `Test ${test.id}`,
          grammar: metrics.grammarIssuesCount,
          vocabulary: metrics.vocabularySuggestionsCount
        };
      });
  };
  const checkBenchmarkTestStatus = async (testId: string) => {
    const testIndex = benchmarkTests.findIndex(test => test.id === testId);
    if (testIndex === -1) return;
    const test = benchmarkTests[testIndex];
  
    if (!test.submission_uid) return;
  
    try {
      const { data, error } = await supabase.storage
        .from("analysis-results")
        .download(`${test.submission_uid}.json`);
  
      if (error) {
        console.log('Still not ready');
        toast.info(`Test ${test.id} is still processing.`);
        return;
      }
  
      const fileText = await data.text();
      const jsonData = JSON.parse(fileText);
      const metrics = extractMetrics(jsonData);
  
      setBenchmarkTests(prev => {
        const updated = [...prev];
        updated[testIndex] = {
          ...updated[testIndex],
          status: 'completed',
          endTime: Date.now(),
          results: jsonData,
          metrics: metrics
        };
        return updated;
      });
  
      toast.success(`Test ${test.id} completed and results loaded!`);
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error(`Failed to check status for Test ${test.id}`);
    }
  };
  
  const prepareGradeDistributionChartData = () => {
    if (!gradeDistribution) return [];
    
    return [
      { name: 'A', value: gradeDistribution.A, color: '#22c55e' }, // green-500
      { name: 'B', value: gradeDistribution.B, color: '#3b82f6' }, // blue-500
      { name: 'C', value: gradeDistribution.C, color: '#eab308' }, // yellow-500
      { name: 'D', value: gradeDistribution.D, color: '#f97316' }, // orange-500
      { name: 'F', value: gradeDistribution.F, color: '#ef4444' }, // red-500
    ].filter(item => item.value > 0); // Only show grades that have values
  };
  
  // Format time in a human-readable way
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get color for grade
  const getGradeColor = (grade: string): string => {
    return GradingService.getGradeColor(
      grade === 'A' ? 95 : 
      grade === 'B' ? 85 : 
      grade === 'C' ? 75 : 
      grade === 'D' ? 65 : 
      50
    );
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
      <div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold">Voice Analysis Benchmarking</h1>
  <div className="flex gap-2">
    <Button onClick={() => checkBenchmarkTestStatus(activeTestId!)} variant="outline">
      Retry Fetch Status
    </Button>
    <Button onClick={runAllBenchmarkTests} disabled={runningBatch}>
      Run All Tests
    </Button>
    <Button variant="outline" onClick={resetAllTests} disabled={runningBatch}>
      Reset Tests
    </Button>
    
    {/* Add your new button here */}
    <Button onClick={() => navigate('/unfinished-reports')} variant="outline">
      <AlertTriangle className="mr-2 h-4 w-4" />
      Check Unfinished Reports
    </Button>
  </div>
</div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tests">Individual Tests</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="grades">Grade Analysis</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
            
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Success Rate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Test Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {benchmarkTests.filter(t => t.status === 'completed').length} / {benchmarkTests.length}
                  </div>
                  <Progress 
                    value={(benchmarkTests.filter(t => t.status === 'completed').length / benchmarkTests.length) * 100} 
                    className="h-2" 
                  />
                </CardContent>
              </Card>
              
              {/* Average Processing Time */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Avg. Processing Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {testSummaries.length > 0
                      ? formatTime(testSummaries.reduce((acc, t) => acc + t.timeElapsed, 0) / testSummaries.length)
                      : 'N/A'
                    }
                  </div>
                </CardContent>
              </Card>
              
              {/* Average Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Class Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {classAverage > 0 ? Math.round(classAverage) : 'N/A'}
                  </div>
                  <div className="text-lg">
                    {classAverage > 0 ? `Grade: ${GradingService.getLetterGrade(classAverage)}` : ''}
                  </div>
                  <Progress 
                    value={classAverage} 
                    className="h-2" 
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Grade Distribution Chart */}
            {gradeDistribution && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareGradeDistributionChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareGradeDistributionChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: string | number, name: string) => [
                          name === 'grade' ? value : typeof value === 'number' ? Math.round(value) : value, 
                          name === 'grade' ? 'Letter Grade' : name.charAt(0).toUpperCase() + name.slice(1)
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            {/* Tests Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Test Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {benchmarkTests.map(test => (
                    <div 
                      key={test.id}
                      className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setActiveTestId(test.id);
                        setActiveTab('tests');
                      }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Test {test.id}</span>
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeColor(test.status)}
                        >
                          {test.status}
                        </Badge>
                      </div>
                      {test.status === 'completed' && test.startTime && test.endTime && (
                        <div className="text-sm text-muted-foreground">
                          {formatTime(test.endTime - test.startTime)}
                        </div>
                      )}
                      {test.metrics && test.metrics.letterGrade && (
                        <div className="mt-2">
                          <Badge className={GradingService.getGradeColor(test.metrics.overallScore)}>
                            Grade: {test.metrics.letterGrade}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Individual Tests Tab */}
          <TabsContent value="tests">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Test Selector */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {benchmarkTests.map(test => (
                        <div 
                          key={test.id}
                          className={`p-3 rounded-md cursor-pointer ${
                            activeTestId === test.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-secondary'
                          }`}
                          onClick={() => setActiveTestId(test.id)}
                        >
                          <div className="flex justify-between items-center">
                            <span>Test {test.id}</span>
                            <Badge 
                              variant="outline" 
                              className={getStatusBadgeColor(test.status)}
                            >
                              {test.status}
                            </Badge>
                          </div>
                          {test.metrics && test.metrics.letterGrade && (
                            <div className="mt-1">
                              <Badge 
                                className={`${activeTestId === test.id 
                                  ? 'bg-white text-primary' 
                                  : GradingService.getGradeColor(test.metrics.overallScore)}`
                                }
                              >
                                Grade: {test.metrics.letterGrade}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Test Details */}
              <div className="md:col-span-3 space-y-6">
                {activeTest ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Test {activeTest.id} Details</span>
                          <Badge 
                            variant="outline" 
                            className={getStatusBadgeColor(activeTest.status)}
                          >
                            {activeTest.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium mb-2">Test Information</h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-sm">Submission UID:</div>
                              <div className="text-sm font-mono">{activeTest.submission_uid}</div>
                              
                              <div className="text-sm">Status:</div>
                              <div className="text-sm">{activeTest.status}</div>
                              
                              {activeTest.startTime && (
                                <>
                                  <div className="text-sm">Started:</div>
                                  <div className="text-sm">
                                    {new Date(activeTest.startTime).toLocaleString()}
                                  </div>
                                </>
                              )}
                              
                              {activeTest.endTime && (
                                <>
                                  <div className="text-sm">Completed:</div>
                                  <div className="text-sm">
                                    {new Date(activeTest.endTime).toLocaleString()}
                                  </div>
                                </>
                              )}
                              
                              {activeTest.startTime && activeTest.endTime && (
                                <>
                                  <div className="text-sm">Processing Time:</div>
                                  <div className="text-sm">
                                    {formatTime(activeTest.endTime - activeTest.startTime)}
                                  </div>
                                </>
                              )}
                              
                              <div className="text-sm">Recordings:</div>
                              <div className="text-sm">
                                {activeTest.audioSubmissions.length}
                              </div>
                              
                              {activeTest.metrics && (
                                <>
                                  <div className="text-sm">Overall Score:</div>
                                  <div className="text-sm">
                                    {Math.round(activeTest.metrics.overallScore)}
                                  </div>
                                  
                                  <div className="text-sm">Letter Grade:</div>
                                  <div className="text-sm">
                                    <Badge className={GradingService.getGradeColor(activeTest.metrics.overallScore)}>
                                      {activeTest.metrics.letterGrade || GradingService.getLetterGrade(activeTest.metrics.overallScore)}
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {activeTest.error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                              <h3 className="font-medium text-red-800 mb-2">Error</h3>
                              <p className="text-sm text-red-700">{activeTest.error}</p>
                            </div>
                          )}
                          
                          {/* Recording samples */}
                          <div>
                            <h3 className="font-medium mb-2">Audio Recordings</h3>
                            <div className="space-y-3">
                              {activeTest.audioSubmissions.map((submission, index) => (
                                <div key={index} className="border rounded-md p-3">
                                  <p className="text-sm font-medium mb-2">Recording {index + 1}</p>
                                  <audio 
                                    src={submission.audioUrl} 
                                    controls 
                                    className="w-full"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Metrics if available */}
                          {activeTest.status === 'completed' && activeTest.metrics && (
                            <div>
                              <h3 className="font-medium mb-2">Analysis Results</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-md p-4">
                                  <p className="text-sm font-medium mb-1">Pronunciation Score</p>
                                  <p className="text-2xl font-bold">
                                    {activeTest.metrics.pronunciationScores.length > 0 
                                      ? Math.round(activeTest.metrics.pronunciationScores.reduce((a, b) => a + b, 0) / 
                                                 activeTest.metrics.pronunciationScores.length) 
                                      : 'N/A'}
                                  </p>
                                </div>
                                
                                <div className="border rounded-md p-4">
                                  <p className="text-sm font-medium mb-1">Fluency Score</p>
                                  <p className="text-2xl font-bold">
                                    {activeTest.metrics.fluencyScores.length > 0 
                                      ? Math.round(activeTest.metrics.fluencyScores.reduce((a, b) => a + b, 0) / 
                                                 activeTest.metrics.fluencyScores.length) 
                                      : 'N/A'}
                                  </p>
                                </div>
                                
                                <div className="border rounded-md p-4">
                                  <p className="text-sm font-medium mb-1">Grammar Issues</p>
                                  <p className="text-2xl font-bold">
                                    {activeTest.metrics.grammarIssuesCount}
                                  </p>
                                </div>
                                
                                <div className="border rounded-md p-4">
                                  <p className="text-sm font-medium mb-1">Vocabulary Suggestions</p>
                                  <p className="text-2xl font-bold">
                                    {activeTest.metrics.vocabularySuggestionsCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          onClick={() => runBenchmarkTest(activeTest.id)}
                          disabled={activeTest.status === 'processing' || runningBatch}
                        >
                          {activeTest.status === 'completed' ? 'Run Again' : 'Run Test'}
                        </Button>
                      </CardFooter>
                    </Card>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">Select a test to view details</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Metrics Tab */}
          <TabsContent value="metrics">
            <div className="space-y-6">
              {/* Processing Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Processing Time</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareProcessingTimeChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: string | number) => [
                        typeof value === 'number' ? `${value.toFixed(1)}s` : value, 
                        'Processing Time'
                      ]} />
                      <Bar dataKey="processingTime" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Scores Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Scores Comparison</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={prepareScoreChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: string | number, name: string) => [
                        name === 'grade' ? value : typeof value === 'number' ? Math.round(value) : value, 
                        name === 'grade' ? 'Letter Grade' : name.charAt(0).toUpperCase() + name.slice(1)
                      ]} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="pronunciation" 
                        stroke="#3b82f6" 
                        activeDot={{ r: 8 }} 
                        name="Pronunciation"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fluency" 
                        stroke="#10b981" 
                        name="Fluency"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="overall" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Overall"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Issues Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Issues Detected</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareIssuesChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="grammar" fill="#ef4444" name="Grammar Issues" />
                      <Bar dataKey="vocabulary" fill="#8b5cf6" name="Vocabulary Suggestions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Grade Analysis Tab */}
          <TabsContent value="grades">
            <div className="space-y-6">
              {/* Grade Distribution Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {gradeDistribution ? (
                    <div className="grid grid-cols-5 gap-4">
                      <div className={`rounded-md p-4 flex flex-col items-center justify-center ${GradingService.getGradeColor(95)}`}>
                        <h2 className="text-2xl font-bold">A</h2>
                        <p className="text-4xl font-bold mt-2">{gradeDistribution.A}</p>
                        <p className="text-sm mt-1">
                          {studentPerformanceData.length > 0 
                            ? `${Math.round((gradeDistribution.A / studentPerformanceData.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                      <div className={`rounded-md p-4 flex flex-col items-center justify-center ${GradingService.getGradeColor(85)}`}>
                        <h2 className="text-2xl font-bold">B</h2>
                        <p className="text-4xl font-bold mt-2">{gradeDistribution.B}</p>
                        <p className="text-sm mt-1">
                          {studentPerformanceData.length > 0 
                            ? `${Math.round((gradeDistribution.B / studentPerformanceData.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                      <div className={`rounded-md p-4 flex flex-col items-center justify-center ${GradingService.getGradeColor(75)}`}>
                        <h2 className="text-2xl font-bold">C</h2>
                        <p className="text-4xl font-bold mt-2">{gradeDistribution.C}</p>
                        <p className="text-sm mt-1">
                          {studentPerformanceData.length > 0 
                            ? `${Math.round((gradeDistribution.C / studentPerformanceData.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                      <div className={`rounded-md p-4 flex flex-col items-center justify-center ${GradingService.getGradeColor(65)}`}>
                        <h2 className="text-2xl font-bold">D</h2>
                        <p className="text-4xl font-bold mt-2">{gradeDistribution.D}</p>
                        <p className="text-sm mt-1">
                          {studentPerformanceData.length > 0 
                            ? `${Math.round((gradeDistribution.D / studentPerformanceData.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                      <div className={`rounded-md p-4 flex flex-col items-center justify-center ${GradingService.getGradeColor(50)}`}>
                        <h2 className="text-2xl font-bold">F</h2>
                        <p className="text-4xl font-bold mt-2">{gradeDistribution.F}</p>
                        <p className="text-sm mt-1">
                          {studentPerformanceData.length > 0 
                            ? `${Math.round((gradeDistribution.F / studentPerformanceData.length) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No grade data available. Run tests to see grade distribution.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Class Average and Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Class Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Class Average</h3>
                      <div className="flex items-center space-x-4">
                        <div className={`p-6 rounded-full ${GradingService.getGradeColor(classAverage)}`}>
                          <span className="text-3xl font-bold">
                            {classAverage > 0 ? GradingService.getLetterGrade(classAverage) : '-'}
                          </span>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{classAverage > 0 ? Math.round(classAverage) : 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">Average Score</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Pass/Fail Rate</h3>
                      <div className="flex items-center space-x-4">
                        <div className="w-full">
                          {gradeDistribution && (
                            <>
                              <div className="flex mb-2">
                                <div 
                                  className="h-4 bg-green-500 rounded-l" 
                                  style={{ 
                                    width: `${((gradeDistribution.A + gradeDistribution.B + gradeDistribution.C + gradeDistribution.D) / 
                                             studentPerformanceData.length) * 100}%` 
                                  }}
                                ></div>
                                <div 
                                  className="h-4 bg-red-500 rounded-r" 
                                  style={{ 
                                    width: `${(gradeDistribution.F / studentPerformanceData.length) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <div className="text-green-600 font-medium">
                                  Pass: {Math.round(((gradeDistribution.A + gradeDistribution.B + gradeDistribution.C + gradeDistribution.D) / 
                                           studentPerformanceData.length) * 100)}%
                                </div>
                                <div className="text-red-600 font-medium">
                                  Fail: {Math.round((gradeDistribution.F / studentPerformanceData.length) * 100)}%
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Student Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Performance Data</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentPerformanceData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">ID</th>
                            <th className="text-left p-2">Test Name</th>
                            <th className="text-left p-2">Score</th>
                            <th className="text-left p-2">Grade</th>
                            <th className="text-left p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentPerformanceData.map((student) => {
                            const test = benchmarkTests.find(t => t.id === student.id);
                            return (
                              <tr key={student.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => {
                                setActiveTestId(student.id);
                                setActiveTab('tests');
                              }}>
                                <td className="p-2">{student.id}</td>
                                <td className="p-2">{student.name}</td>
                                <td className="p-2">
                                  {student.percentage !== null ? Math.round(student.percentage) : 'N/A'}
                                </td>
                                <td className="p-2">
                                  {student.percentage !== null ? (
                                    <Badge className={GradingService.getGradeColor(student.percentage)}>
                                      {GradingService.getLetterGrade(student.percentage)}
                                    </Badge>
                                  ) : 'N/A'}
                                </td>
                                <td className="p-2">
                                  <Badge variant="outline" className={getStatusBadgeColor(test?.status || 'pending')}>
                                    {test?.status || 'pending'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No performance data available. Run tests to see student performance.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Raw Data Tab */}
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw Analysis Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select a test from the dropdown to view its raw JSON data
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <select
                    className="w-full p-2 border rounded-md"
                    value={activeTestId || ''}
                    onChange={(e) => setActiveTestId(e.target.value)}
                  >
                    <option value="">Select a test</option>
                    {benchmarkTests
                      .filter(test => test.status === 'completed' && test.results)
                      .map(test => (
                        <option key={test.id} value={test.id}>
                          Test {test.id} - {test.metrics?.letterGrade || 'N/A'}
                        </option>
                      ))}
                  </select>
                </div>
                
                {activeTest && activeTest.status === 'completed' && activeTest.results ? (
                  <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] text-xs">
                    {JSON.stringify(activeTest.results, null, 2)}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">
                      {activeTest 
                        ? 'No results available for this test' 
                        : 'Select a completed test to view raw data'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VoiceAnalysisBenchmarkPage;