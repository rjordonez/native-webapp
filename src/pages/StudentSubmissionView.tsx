import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageSquare, Check, Play, HelpCircle } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

// Voice Tutor Report Component
// Voice Tutor Report Component


interface GrammarCorrection {
  original_phrase: string;
  suggested_correction: string;
  explanation: string;
}

interface SentenceCorrection {
  original: string;
  corrections: GrammarCorrection[];
}

interface VocabSuggestion {
  original_word: string;
  context: string;
  advanced_alternatives: string[];
  level: string;
}

interface SentenceVocab {
  original: string;
  suggestions: VocabSuggestion[];
}

interface WordDetail {
  word: string;
  offset: number;
  duration: number;
  accuracy_score: number;
  error_type: string;
}

interface PronunciationAnalysis {
  status: string;
  audio_duration: number;
  transcript: string;
  overall_pronunciation_score: number;
  accuracy_score: number;
  fluency_score: number;
  prosody_score: number;
  completeness_score: number;
  critical_errors: Array<{
    word: string;
    score: number;
    timestamp: number;
    duration: number;
  }>;
  filler_words: Array<{
    word: string;
    timestamp: number;
    duration: number;
  }>;
  word_details: WordDetail[];
  improvement_suggestion: string;
  url: string;
}
interface LexicalResource {
  original_phrase: string;
  suggested_phrase: string;
  explanation: string;
  resource_type: string;
}

interface SentenceLexical {
  original: string;
  suggestions: LexicalResource[];
}
// fluency and coherence
interface FluencyMetrics {
  speech_rate: number;
  hesitation_ratio: number;
  pause_pattern_score: number;
  overall_fluency_score: number;
}

interface CoherenceMetrics {
  topic_consistency: number;
  logical_flow: number;
  idea_development: number;
  overall_coherence_score: number;
}

interface FluencyCoherenceAnalysis {
  fluency_metrics: FluencyMetrics;
  coherence_metrics: CoherenceMetrics;
  key_findings: string[];
  improvement_suggestions: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      metric: string;
      value: number;
      category: string;
    };
  }>;
  label?: string;
}

// Interface for question parsing
interface QuestionWithExample {
  question: string;
  example: string;
}

interface AnalysisReport {
  submission_id: string;
  timestamp: string;
  status: string;
  file_count: number;
  pronunciation_analysis: PronunciationAnalysis[];
  grammar_analysis: Record<string, SentenceCorrection>;
  vocabulary_suggestions: Record<string, SentenceVocab>;
  lexical_resources?: Record<string, SentenceLexical>;  // Add this line (with optional ? since old reports might not have it)
  fluency_coherence_analysis?: Record<string, FluencyCoherenceAnalysis>;
}


// Custom tooltip for RadarChart
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 shadow-md rounded border border-gray-200">
        <p className="font-semibold">{data.metric}</p>
        <p>Score: <span className="font-medium">{data.value}</span>/100</p>
        <p className="text-xs text-gray-500">{data.category}</p>
      </div>
    );
  }
  return null;
};


const VoiceTutorReport = ({ data }: { data: AnalysisReport }) => {
  const [activeAnalysisIndex, setActiveAnalysisIndex] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState("pronunciation"); // Added tab state
  

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper function to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get score label
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'Critical';
  };

  const report = data;
  
  // Check if we have any analysis data
  if (!report.pronunciation_analysis || report.pronunciation_analysis.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Voice Analysis Report</h1>
        <p className="mt-4 text-gray-600">No pronunciation analysis data available.</p>
      </div>
    );
  }
  
  // Get the currently active analysis
  const analysis = report.pronunciation_analysis[activeAnalysisIndex];
  
  // Calculate actual scores
  const calculateOverallScore = () => {
    if (!analysis.word_details || analysis.word_details.length === 0) return 0;
    const sum = analysis.word_details.reduce((acc, word) => acc + word.accuracy_score, 0);
    return Math.round(sum / analysis.word_details.length);
  };
  
  const overallScore = analysis.overall_pronunciation_score || calculateOverallScore();

  // Function to play word at timestamp and stop after duration
  const playWordAtTimestamp = (offset: number, duration: number) => {
    if (audioRef) {
      audioRef.currentTime = offset;
      audioRef.play();
      
      // Set timeout to pause after the word duration
      setTimeout(() => {
        audioRef.pause();
      }, duration * 1000); // Convert duration to milliseconds
    }
  };

  // Filter to only show problematic words (accuracy < 80)
  const problemWords = analysis.word_details ? 
    analysis.word_details.filter(word => word.accuracy_score < 80) : 
    [];

  // Get grammar corrections
  const grammarCorrections = report.grammar_analysis || {};
  
  // Get vocabulary suggestions
  const vocabSuggestions = report.vocabulary_suggestions || {};

  //Get Fluency
  const fluencyCoherenceAnalysis = report.fluency_coherence_analysis || {};
  const fluencyRecordingKey = `recording_${activeAnalysisIndex + 1}`;
  const fluencyData = fluencyCoherenceAnalysis[fluencyRecordingKey];

  // Helper function to parse question JSON if needed
  const parseQuestionData = (questionText: string) => {
    try {
      // Check if the question is in JSON format containing an example
      if (questionText.startsWith('{') && questionText.includes('"question"') && questionText.includes('"example"')) {
        const parsed = JSON.parse(questionText);
        return {
          question: parsed.question || "",
          example: parsed.example || ""
        };
      }
    } catch (e) {
      console.error("Error parsing question JSON:", e);
    }
    
    // If not JSON or parsing failed, return the original text as the question
    return { 
      question: questionText,
      example: ""
    };
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Voice Analysis Report</h1>
        <div className="flex justify-between mt-2">
          <p className="text-gray-500">Submission ID: {report.submission_id}</p>
          <p className="text-gray-500">Date: {formatDate(report.timestamp)}</p>
        </div>
        <div className="mt-2 flex items-center">
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            {report.status}
          </span>
          <span className="ml-4 text-gray-500">Audio Duration: {analysis.audio_duration}s</span>
        </div>
      </div>

      {/* Question Selector */}
      {report.pronunciation_analysis.length > 1 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Select Question</h2>
          <div className="flex gap-2">
            {report.pronunciation_analysis.map((_, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded ${
                  activeAnalysisIndex === index
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
                onClick={() => setActiveAnalysisIndex(index)}
              >
                Question {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Player */}
      {analysis.url && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Recording for Question {activeAnalysisIndex + 1}</h2>
          <div className="flex items-center">
            <audio 
              controls 
              src={analysis.url} 
              className="w-full"
              ref={ref => setAudioRef(ref)}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Transcript</h2>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-gray-800">{analysis.transcript}</p>
        </div>
      </div>

      {/* Analysis Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("pronunciation")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pronunciation"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pronunciation
            </button>
            <button
              onClick={() => setActiveTab("grammar")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "grammar"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Grammar
            </button>
            <button
              onClick={() => setActiveTab("vocabulary")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "vocabulary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Lexical Resource
            </button>

            <button
              onClick={() => setActiveTab("fluency")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "fluency"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Fluency & Coherence
            </button>

          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "pronunciation" && (
        <div>
          {/* Overall Score */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Overall Score</h2>
            <div className="flex items-center">
              <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="ml-4">
                <div className="w-48 bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full ${overallScore >= 80 ? 'bg-green-600' : overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${overallScore}%` }}
                  ></div>
                </div>
                <p className={`text-sm mt-1 ${getScoreColor(overallScore)}`}>
                  {getScoreLabel(overallScore)}
                </p>
              </div>
            </div>
          </div>

          {/* Problem Words (Only Yellow and Red) */}
          {problemWords.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Problem Words</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Play</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {problemWords.map((word, index) => (
                      <tr key={index} className={word.accuracy_score < 60 ? "bg-red-50" : "bg-yellow-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{word.word}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{word.offset.toFixed(2)}s</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${getScoreColor(word.accuracy_score)}`}>
                              {word.accuracy_score}
                            </span>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${word.accuracy_score >= 80 ? 'bg-gray-500' : word.accuracy_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${word.accuracy_score}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {word.error_type !== "None" ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              {word.error_type}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Needs Improvement
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            className="p-1 rounded-full hover:bg-gray-100"
                            onClick={() => playWordAtTimestamp(word.offset, word.duration)}
                          >
                            <Play size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          {analysis.improvement_suggestion && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Improvement Suggestions</h2>
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <p className="text-blue-800">{analysis.improvement_suggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grammar Analysis Tab */}
      {activeTab === "grammar" && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Grammar Analysis</h2>
          {Object.keys(grammarCorrections).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(grammarCorrections).map(([key, sentenceCorrection], index) => {
                // Type assertion to tell TypeScript this is a SentenceCorrection
                const correction = sentenceCorrection as SentenceCorrection;
                return (
                  <div key={index} className="bg-white p-4 border rounded-lg shadow-sm">
                    <h3 className="font-medium text-gray-800 mb-2">
                      Sentence {key.split('_')[1]}
                    </h3>
                    <div className="mb-2">
                      <p className="text-sm text-gray-500">Original:</p>
                      <p className="bg-gray-50 p-2 rounded">{correction.original}</p>
                    </div>
                    <div className="space-y-3">
                      {correction.corrections.map((corr, idx) => (
                        <div key={idx} className="border-l-4 border-yellow-400 pl-3">
                          <div className="flex items-start">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                              Correction {idx + 1}
                            </span>
                          </div>
                          <div className="mt-2 space-y-2">
                            <div>
                              <p className="text-sm text-gray-500">Issue:</p>
                              <p className="bg-red-50 p-2 rounded text-sm">"{corr.original_phrase}"</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Suggestion:</p>
                              <p className="bg-green-50 p-2 rounded text-sm">"{corr.suggested_correction}"</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Explanation:</p>
                              <p className="text-sm">{corr.explanation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-gray-600">No grammar corrections available.</p>
            </div>
          )}
        </div>
      )}

      {/* Vocabulary Analysis Tab */}
      {activeTab === "vocabulary" && (
  <div>
    <h2 className="text-lg font-semibold mb-2">Vocabulary Enhancement</h2>
    
    {/* Vocabulary Suggestions Section */}
    {Object.keys(vocabSuggestions).length > 0 ? (
      <div className="space-y-6 mb-8">
        <h3 className="text-md font-medium text-gray-700 border-b pb-2">Word Choices</h3>
        {Object.entries(vocabSuggestions).map(([key, sentenceVocab], index) => {
          // Type assertion to tell TypeScript this is a SentenceVocab
          const suggestion = sentenceVocab as SentenceVocab;
          return (
            <div key={index} className="bg-white p-4 border rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-800 mb-2">
                Sentence {key.split('_')[1]}
              </h3>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Original:</p>
                <p className="bg-gray-50 p-2 rounded">{suggestion.original}</p>
              </div>
              <div className="space-y-3">
                {suggestion.suggestions.map((vocab, idx) => (
                  <div key={idx} className="border-l-4 border-blue-400 pl-3">
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {vocab.level} Level
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Basic Word:</p>
                        <p className="font-medium">"{vocab.original_word}"</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Context:</p>
                        <p className="italic text-sm">"{vocab.context}"</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Advanced Alternatives:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {vocab.advanced_alternatives.map((alt, altIdx) => (
                            <span key={altIdx} className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="bg-gray-50 p-4 rounded border mb-6">
        <p className="text-gray-600">No vocabulary suggestions available.</p>
      </div>
    )}
    
    {/* Lexical Resources Section */}
    {report.lexical_resources && Object.keys(report.lexical_resources).length > 0 ? (
      <div className="space-y-6">
        <h3 className="text-md font-medium text-gray-700 border-b pb-2">Collocations & Idioms</h3>
        {Object.entries(report.lexical_resources).map(([key, sentenceLexical], index) => {
          // Type assertion to tell TypeScript this is a SentenceLexical
          const lexical = sentenceLexical as SentenceLexical;
          return (
            <div key={index} className="bg-white p-4 border rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-800 mb-2">
                Sentence {key.split('_')[1]}
              </h3>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Original:</p>
                <p className="bg-gray-50 p-2 rounded">{lexical.original}</p>
              </div>
              <div className="space-y-3">
                {lexical.suggestions.map((resource, idx) => {
                  // Choose color based on resource type
                  let borderColor = "border-purple-400";
                  let bgColor = "bg-purple-100";
                  let textColor = "text-purple-800";
                  
                  if (resource.resource_type === "collocation") {
                    borderColor = "border-indigo-400";
                    bgColor = "bg-indigo-100";
                    textColor = "text-indigo-800";
                  } else if (resource.resource_type === "idiom") {
                    borderColor = "border-amber-400";
                    bgColor = "bg-amber-100";
                    textColor = "text-amber-800";
                  } else if (resource.resource_type === "word usage") {
                    borderColor = "border-emerald-400";
                    bgColor = "bg-emerald-100";
                    textColor = "text-emerald-800";
                  }
                  
                  return (
                    <div key={idx} className={`border-l-4 ${borderColor} pl-3`}>
                      <div className="flex items-start">
                        <span className={`${bgColor} ${textColor} px-2 py-1 rounded text-xs font-medium capitalize`}>
                          {resource.resource_type}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-sm text-gray-500">Original Phrase:</p>
                          <p className="bg-red-50 p-2 rounded text-sm">"{resource.original_phrase}"</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Suggested Phrase:</p>
                          <p className="bg-green-50 p-2 rounded text-sm">"{resource.suggested_phrase}"</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Explanation:</p>
                          <p className="text-sm">{resource.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="bg-gray-50 p-4 rounded border">
        <p className="text-gray-600">No lexical resource analysis available.</p>
      </div>
    )}
  </div>
)}

      {/* Fluency & Coherence Tab */}
      {activeTab === "fluency" && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Fluency & Coherence Analysis</h2>
          {fluencyData ? (
            <div>
              {/* Overall scores */}
              <div className="grid grid-cols-3 gap-4 mb-6 mt-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className={`text-3xl font-bold ${getScoreColor((fluencyData.fluency_metrics.overall_fluency_score + fluencyData.coherence_metrics.overall_coherence_score) / 2)}`}>
                    {Math.round((fluencyData.fluency_metrics.overall_fluency_score + fluencyData.coherence_metrics.overall_coherence_score) / 2)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Overall</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className={`text-3xl font-bold ${getScoreColor(fluencyData.fluency_metrics.overall_fluency_score)}`}>
                    {fluencyData.fluency_metrics.overall_fluency_score}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Fluency</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className={`text-3xl font-bold ${getScoreColor(fluencyData.coherence_metrics.overall_coherence_score)}`}>
                    {fluencyData.coherence_metrics.overall_coherence_score}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Coherence</div>
                </div>
              </div>
              
              {/* Radar Chart */}
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart 
                    data={[
                      { 
                        metric: 'Speech Rate', 
                        value: fluencyData.fluency_metrics.speech_rate,
                        category: 'Fluency'
                      },
                      { 
                        metric: 'Hesitation', 
                        value: fluencyData.fluency_metrics.hesitation_ratio,
                        category: 'Fluency'
                      },
                      { 
                        metric: 'Pause Patterns', 
                        value: fluencyData.fluency_metrics.pause_pattern_score,
                        category: 'Fluency'
                      },
                      { 
                        metric: 'Topic Consistency', 
                        value: fluencyData.coherence_metrics.topic_consistency,
                        category: 'Coherence'
                      },
                      { 
                        metric: 'Logical Flow', 
                        value: fluencyData.coherence_metrics.logical_flow,
                        category: 'Coherence'
                      },
                      { 
                        metric: 'Idea Development', 
                        value: fluencyData.coherence_metrics.idea_development,
                        category: 'Coherence'
                      }
                    ]} 
                    margin={{ top:10, right: 10, bottom: 10, left: 10 }}
                  >
                    <PolarGrid />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fill: '#718096', fontSize: 12 }}
                      tickLine={false}
                      axisLineType="circle"
                   />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]} 
                      tick={{ fill: '#A0AEC0' }}
                      tickCount={5}
                      axisLine={false} 
                    />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#93C5FD"
                      fillOpacity={0.6}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Key findings */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Key Findings</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {fluencyData.key_findings && fluencyData.key_findings.map((finding, index) => (
                    <li key={index} className="text-gray-700">{finding}</li>
                  ))}
                </ul>
              </div>
              
              {/* Improvement suggestions */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Improvement Suggestions</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {fluencyData.improvement_suggestions && fluencyData.improvement_suggestions.map((suggestion, index) => (
                    <li key={index} className="text-gray-700">{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-gray-600">No fluency and coherence data available for this recording.</p>
            </div>
          )}
        </div>
      )}




    </div>
  );
};


const StudentSubmissionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assignments, submissions } = useClass();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Find the submission row by React Router param
  const submission = submissions.find((s) => s.id === id);
  const assignment = submission
    ? assignments.find((a) => a.id === submission.assignmentId)
    : undefined;

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Submission not found</h2>
            <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }

  const hasFeedback = submission.feedback?.reviewed;

  // Simulate initial loading (for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // When user clicks "Report," fetch the .json file using the submission_uid
  useEffect(() => {
    let timeoutId = null;
    
    const fetchAnalysisResult = async (retryCount = 0, maxRetries = 12) => {
      try {
        setLoading(true);
        
        console.log(`Attempt ${retryCount + 1}: Fetching analysis for submission_uid: ${submission.submission_uid}`);

        const { data, error: downloadError } = await supabase.storage
          .from("analysis-results")
          .download(`${submission.submission_uid}.json`);

        if (downloadError) {
          // If we haven't reached max retries yet, schedule another attempt
          if (retryCount < maxRetries) {
            console.log(`Retry scheduled in 10 seconds...`);
            timeoutId = setTimeout(() => fetchAnalysisResult(retryCount + 1, maxRetries), 10000); // 10 seconds between attempts
            return;
          }
          throw new Error(downloadError.message);
        }
        
        const fileText = await data.text();
        const jsonData = JSON.parse(fileText);
        
        console.log("Analysis data loaded successfully");
        setAnalysisResult(jsonData);
        setLoading(false);
      } catch (e) {
        console.error("Error loading analysis:", e);
        
        // If we haven't reached max retries yet, schedule another attempt
        if (retryCount < maxRetries) {
          console.log(`Retry scheduled in 10 seconds...`);
          timeoutId = setTimeout(() => fetchAnalysisResult(retryCount + 1, maxRetries), 10000); // 10 seconds between attempts
          return;
        }
        
        setError(e.message || "Could not load the analysis report.");
        setLoading(false);
      }
    };

    if (showReport) {
      fetchAnalysisResult();
    } else {
      setLoading(false);
    }
    
    // Cleanup function to cancel any pending timeouts
    return () => {
      if (timeoutId) {
        console.log("Cleaning up - clearing scheduled fetch timeout");
        clearTimeout(timeoutId);
      }
    };
  }, [showReport, submission.submission_uid]);
  
  // Render the standard audio responses
  // Render the standard audio responses
  const renderSubmissionView = () => (
    <div className="space-y-6">
      {assignment.questions.map((questionText, index) => {
        // Parse question data
        const questionData = parseQuestionData(questionText);
        
        return (
          <Card key={index}>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>Question {index + 1}</span>
                {questionData.example && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-500 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle showing example in this card
                      const exampleDiv = document.getElementById(`example-${index}`);
                      if (exampleDiv) {
                        const isHidden = exampleDiv.classList.contains('hidden');
                        if (isHidden) {
                          exampleDiv.classList.remove('hidden');
                          e.currentTarget.textContent = "Hide Example";
                        } else {
                          exampleDiv.classList.add('hidden');
                          e.currentTarget.textContent = "View Example";
                        }
                      }
                    }}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" /> View Example
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="font-medium">{questionData.question}</p>
              
              {questionData.example && (
                <div id={`example-${index}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 hidden">
                  <div className="flex items-start mb-2">
                    <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded uppercase tracking-wide">
                      Example Answer
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{questionData.example}</p>
                </div>
              )}
              
              <div className="bg-muted/20 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Your Response
                </h4>
                {submission.answers[index]?.audioUrl ? (
                  <audio
                    src={submission.answers[index].audioUrl}
                    controls
                    className="w-full"
                  />
                ) : (
                  <p className="text-muted-foreground">No recording found</p>
                )}
              </div>

              {hasFeedback && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium mb-2 flex items-center text-blue-800">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Teacher Feedback
                  </h4>
                  <p>{submission.feedback?.comment || "Great job!"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Render the Voice Tutor Report
  const renderReportView = () => {
    if (loading) {
      return (
        <div className="space-y-4 p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold mb-4">Loading Pronunciation Report</h2>
          <p className="text-gray-600 mb-6">
            Please wait while we generate your pronunciation analysis. 
            This may take up to 2 minutes to complete.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">Error Loading Report</h2>
          <p className="mt-4 text-gray-600">
            We couldn't load your pronunciation report after multiple attempts.
            Please try again later or contact support if this issue persists.
          </p>
          <Button 
            className="mt-4" 
            onClick={() => {
              setLoading(true);
              setError(null);
              setShowReport(false);
              setTimeout(() => setShowReport(true), 100);
            }}
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (!analysisResult) {
      return (
        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">No Analysis Available</h2>
          <p className="text-gray-600">
            The pronunciation analysis for this submission is not available yet.
          </p>
        </div>
      );
    }

    // Pass the data to our VoiceTutorReport component
    return <VoiceTutorReport data={analysisResult} />;
  };

  // Loading placeholder for the initial load
  if (loading && !showReport) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <Button variant="outline" onClick={() => navigate("/student")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Badge variant="outline">{assignment.topic}</Badge>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Submitted on:{" "}
                {submission.submittedAt
                  ? format(new Date(submission.submittedAt), "MMMM d, yyyy")
                  : "Unknown"}
              </div>
            </div>
          </div>

          {/* Loading skeletons */}
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full mt-6" />
        </main>
      </div>
    );
  }


  // Helper function to parse question JSON if needed
  const parseQuestionData = (questionText: string) => {
    try {
      // Check if the question is in JSON format containing an example
      if (questionText.startsWith('{') && questionText.includes('"question"') && questionText.includes('"example"')) {
        const parsed = JSON.parse(questionText);
        return {
          question: parsed.question || "",
          example: parsed.example || ""
        };
      }
    } catch (e) {
      console.error("Error parsing question JSON:", e);
    }
    
    // If not JSON or parsing failed, return the original text as the question
    return { 
      question: questionText,
      example: ""
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <Button variant="outline" onClick={() => navigate("/student")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Badge variant="outline">{assignment.topic}</Badge>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Submitted on:{" "}
              {submission.submittedAt
                ? format(new Date(submission.submittedAt), "MMMM d, yyyy")
                : "Unknown"}
            </div>
            {hasFeedback && <Badge className="bg-blue-500">Feedback Available</Badge>}
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <Button variant={!showReport ? "default" : "outline"} onClick={() => setShowReport(false)}>
            View Submission
          </Button>
          <Button variant={showReport ? "default" : "outline"} onClick={() => setShowReport(true)}>
            Pronunciation Report
          </Button>
        </div>

        {showReport ? renderReportView() : renderSubmissionView()}
      </main>
    </div>
  );
};

export default StudentSubmissionView;