import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppNavbar from '@/components/AppNavbar';
import { sendToAnalysisAPI } from '@/lib/api-services';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Define types
type ReportStatus = 'unfinished' | 'processing' | 'retrying' | 'complete';
interface SubmissionData {
    answers: string | any[];
    submitted_at?: string;
  }
  
interface UnfinishedReport {
  statusFile: string;
  submission_uid: string;
  audioUrls: string[];
  status: ReportStatus;
  createdAt?: string;
  error?: string;
}

const UnfinishedReportsPage = () => {
  const navigate = useNavigate();
  const [unfinishedReports, setUnfinishedReports] = useState<UnfinishedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<UnfinishedReport | null>(null);
  const [processingReport, setProcessingReport] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    unfinished: 0,
    processing: 0,
    retrying: 0,
    complete: 0
  });

  // Fetch all status files and check for unfinished reports
  useEffect(() => {
    fetchUnfinishedReports();
  }, []);

  // Update stats when unfinished reports change
  useEffect(() => {
    if (unfinishedReports.length > 0) {
      const newStats = {
        total: unfinishedReports.length,
        unfinished: unfinishedReports.filter(r => r.status === 'unfinished').length,
        processing: unfinishedReports.filter(r => r.status === 'processing').length,
        retrying: unfinishedReports.filter(r => r.status === 'retrying').length,
        complete: unfinishedReports.filter(r => r.status === 'complete').length
      };
      setStats(newStats);
    }
  }, [unfinishedReports]);

  const fetchUnfinishedReports = async () => {
    setIsLoading(true);
    try {
      // Fetch all files in the analysis-results bucket
      const { data: filesData, error: filesError } = await supabase.storage
        .from('analysis-results')
        .list('', { limit: 1000 });

      if (filesError) {
        throw filesError;
      }

      // Filter for status files
      const statusFiles = filesData.filter(file => file.name.endsWith('_status.json'));
      
      // Check each status file for a corresponding results file
      const unfinishedList: UnfinishedReport[] = [];
      
      for (const statusFile of statusFiles) {
        const baseName = statusFile.name.replace('_status.json', '');
        const resultFileName = `${baseName}.json`;
        
        // Check if the results file exists
        const { data: resultExists, error: checkError } = await supabase.storage
          .from('analysis-results')
          .list('', {
            search: resultFileName
          });
        
        if (checkError) {
          console.error('Error checking for result file:', checkError);
          continue;
        }

        // If the result file doesn't exist or is empty, this is an unfinished report
        const isUnfinished = resultExists.length === 0 || 
                             (resultExists.length > 0 && resultExists[0].metadata?.size === 0);
        
        if (isUnfinished) {
          // Get the status file content to extract submission_uid
          const { data: statusData, error: statusError } = await supabase.storage
            .from('analysis-results')
            .download(statusFile.name);
          
          if (statusError) {
            console.error('Error downloading status file:', statusError);
            continue;
          }

          const statusContent = await statusData.text();
          let statusJson;
          try {
            statusJson = JSON.parse(statusContent);
          } catch (e) {
            console.error('Error parsing status JSON:', e);
            continue;
          }

          // Extract submission_uid
          const submission_uid = baseName;
          
          // Find the submission in the database to get the audio URLs
          // @ts-ignore - Known Supabase type inference issue
          const result = await supabase
            .from('submissions')
            .select('answers, submitted_at')
            .eq('submission_uid', submission_uid)
            .limit(1);
            
          const data = result.data?.[0];
          const error = result.error;
          
          if (error) throw error;
          
          // Type cast the result
          const submissionData = data as SubmissionData | null;
          const submissionError = error;
          
          if (submissionError) {
            console.error('Error fetching submission:', submissionError);
            continue;
          }
          
          let audioUrls: string[] = [];
          if (submissionData && submissionData.answers) {
            try {
              // If answers is a string, parse it
              const answersData = typeof submissionData.answers === 'string' 
                ? JSON.parse(submissionData.answers) 
                : submissionData.answers;
              
              // Extract audio URLs
              audioUrls = answersData.map((answer: any) => answer.audioUrl).filter(Boolean);
            } catch (e) {
              console.error('Error parsing answers JSON:', e);
            }
          }

          // Add to unfinished reports list
          unfinishedList.push({
            statusFile: statusFile.name,
            submission_uid,
            audioUrls,
            status: 'unfinished',
            createdAt: submissionData?.submitted_at || statusFile.created_at
          });
        }
      }
      
      // Sort by created date, newest first
      unfinishedList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setUnfinishedReports(unfinishedList);
    } catch (error) {
      console.error('Error fetching unfinished reports:', error);
      toast.error('Failed to load unfinished reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryAnalysis = async (report: UnfinishedReport) => {
    if (!report.audioUrls || report.audioUrls.length === 0) {
      toast.error('No audio files found for this submission');
      return;
    }

    setProcessingReport(report.submission_uid);

    try {
      // Create a copy of the current reports
      const updatedReports = [...unfinishedReports];
      const reportIndex = updatedReports.findIndex(r => r.submission_uid === report.submission_uid);
      
      if (reportIndex !== -1) {
        // Update status directly
        updatedReports[reportIndex] = {
          ...updatedReports[reportIndex],
          status: 'retrying'
        };
        setUnfinishedReports(updatedReports);
      }

      // First, delete any existing result file (if partial)
      const resultFileName = `${report.submission_uid}.json`;
      await supabase.storage
        .from('analysis-results')
        .remove([resultFileName]);

      // Send to analysis API
      await sendToAnalysisAPI(report.audioUrls, report.submission_uid);
      
      toast.success('Analysis restarted successfully');
      
      // Update report status again
      const updatedReportsAfterProcessing = [...unfinishedReports];
      const reportIndexAfterProcessing = updatedReportsAfterProcessing.findIndex(r => r.submission_uid === report.submission_uid);
      
      if (reportIndexAfterProcessing !== -1) {
        updatedReportsAfterProcessing[reportIndexAfterProcessing] = {
          ...updatedReportsAfterProcessing[reportIndexAfterProcessing],
          status: 'processing'
        };
        setUnfinishedReports(updatedReportsAfterProcessing);
      }

      // Poll for results
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5s interval)
      const pollInterval = 5000; // 5 seconds
      
      const pollForResults = async () => {
        try {
          const { data, error } = await supabase.storage
            .from("analysis-results")
            .download(`${report.submission_uid}.json`);
          
          if (error) {
            // If still processing, continue polling
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pollForResults, pollInterval);
            } else {
              // Max attempts reached, mark as failed
              const updatedReports = [...unfinishedReports];
              const reportIndex = updatedReports.findIndex(r => r.submission_uid === report.submission_uid);
              
              if (reportIndex !== -1) {
                updatedReports[reportIndex] = {
                  ...updatedReports[reportIndex],
                  status: 'unfinished',
                  error: 'Timed out waiting for results'
                };
                setUnfinishedReports(updatedReports);
              }
              
              setProcessingReport(null);
              toast.error('Timed out waiting for analysis to complete');
            }
            return;
          }
          
          // Results exist, mark as complete
          const updatedReports = [...unfinishedReports];
          const reportIndex = updatedReports.findIndex(r => r.submission_uid === report.submission_uid);
          
          if (reportIndex !== -1) {
            updatedReports[reportIndex] = {
              ...updatedReports[reportIndex],
              status: 'complete'
            };
            setUnfinishedReports(updatedReports);
          }
          
          setProcessingReport(null);
          toast.success('Analysis completed successfully');
        } catch (e) {
          console.error("Error polling for results:", e);
          
          // If still within attempts limit, continue polling
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(pollForResults, pollInterval);
          } else {
            // Max attempts reached, mark as failed
            const updatedReports = [...unfinishedReports];
            const reportIndex = updatedReports.findIndex(r => r.submission_uid === report.submission_uid);
            
            if (reportIndex !== -1) {
              updatedReports[reportIndex] = {
                ...updatedReports[reportIndex],
                status: 'unfinished',
                error: e.message || 'Failed to load results'
              };
              setUnfinishedReports(updatedReports);
            }
            
            setProcessingReport(null);
            toast.error('Failed to complete analysis');
          }
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollForResults, 5000);
    } catch (error) {
      console.error('Error retrying analysis:', error);
      toast.error('Failed to restart analysis');
      
      // Update report status
      const updatedReports = [...unfinishedReports];
      const reportIndex = updatedReports.findIndex(r => r.submission_uid === report.submission_uid);
      
      if (reportIndex !== -1) {
        updatedReports[reportIndex] = {
          ...updatedReports[reportIndex],
          status: 'unfinished',
          error: error.message || 'Failed to restart analysis'
        };
        setUnfinishedReports(updatedReports);
      }
      
      setProcessingReport(null);
    }
  };

  const handleRetryAll = async () => {
    const unfinished = unfinishedReports.filter(r => r.status === 'unfinished');
    
    if (unfinished.length === 0) {
      toast.info('No unfinished reports to retry');
      return;
    }
    
    toast.info(`Retrying ${unfinished.length} unfinished reports. This may take some time.`);
    
    for (const report of unfinished) {
      await handleRetryAnalysis(report);
      // Add delay between retries to avoid overloading the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unfinished':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Unfinished</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'retrying':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Retrying</Badge>;
      case 'complete':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Complete</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const truncateUid = (uid: string) => {
    if (uid.length <= 8) return uid;
    return `${uid.substring(0, 8)}...`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Unfinished Reports Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={fetchUnfinishedReports} variant="outline" disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleRetryAll} disabled={isLoading || stats.unfinished === 0}>
              Retry All Unfinished
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unfinished</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.unfinished}</div>
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.processing + stats.retrying}</div>
              <div className="p-2 rounded-full bg-blue-100">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-2xl font-bold">{stats.complete}</div>
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}% Complete</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.complete / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.unfinished} Unfinished</span>
                <span>{stats.processing + stats.retrying} Processing</span>
                <span>{stats.complete} Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Unfinished Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : unfinishedReports.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-40">
                <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
                <p className="text-muted-foreground">No unfinished reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Submission UID</th>
                      <th className="text-left p-2">Audio Files</th>
                      <th className="text-left p-2">Created At</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unfinishedReports.map((report) => (
                      <tr key={report.submission_uid} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{truncateUid(report.submission_uid)}</td>
                        <td className="p-2">{report.audioUrls?.length || 0}</td>
                        <td className="p-2">{formatDate(report.createdAt)}</td>
                        <td className="p-2">{getStatusBadge(report.status)}</td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setActiveReport(report)}
                                >
                                  Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Report Details</DialogTitle>
                                  <DialogDescription>
                                    Details for submission {activeReport?.submission_uid}
                                  </DialogDescription>
                                </DialogHeader>
                                {activeReport && (
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="col-span-1 font-medium">Submission UID</div>
                                      <div className="col-span-2 font-mono text-xs overflow-x-auto">
                                        {activeReport.submission_uid}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="col-span-1 font-medium">Status File</div>
                                      <div className="col-span-2 font-mono text-xs overflow-x-auto">
                                        {activeReport.statusFile}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="col-span-1 font-medium">Created At</div>
                                      <div className="col-span-2">
                                        {formatDate(activeReport.createdAt)}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="col-span-1 font-medium">Status</div>
                                      <div className="col-span-2">
                                        {getStatusBadge(activeReport.status)}
                                      </div>
                                    </div>
                                    {activeReport.error && (
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1 font-medium">Error</div>
                                        <div className="col-span-2 text-red-600">
                                          {activeReport.error}
                                        </div>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="col-span-1 font-medium">Audio URLs</div>
                                      <div className="col-span-2">
                                        {activeReport.audioUrls?.length || 0} files
                                      </div>
                                    </div>
                                    {activeReport.audioUrls?.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="font-medium">Audio Recordings</p>
                                        <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                                          {activeReport.audioUrls.map((url, idx) => (
                                            <div key={idx} className="mb-3">
                                              <p className="text-xs mb-1">Recording {idx + 1}</p>
                                              <audio src={url} controls className="w-full" />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <DialogFooter>
                                  {activeReport && activeReport.status === 'unfinished' && (
                                    <Button 
                                      disabled={processingReport === activeReport.submission_uid}
                                      onClick={() => handleRetryAnalysis(activeReport)}
                                    >
                                      {processingReport === activeReport.submission_uid ? (
                                        <>Processing...</>
                                      ) : (
                                        <>Retry Analysis</>
                                      )}
                                    </Button>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              variant="default" 
                              size="sm"
                              disabled={
                                report.status !== 'unfinished' || 
                                processingReport === report.submission_uid
                              }
                              onClick={() => handleRetryAnalysis(report)}
                            >
                              {processingReport === report.submission_uid ? (
                                <>Processing...</>
                              ) : (
                                <>Retry</>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UnfinishedReportsPage;