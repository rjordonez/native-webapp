// src/lib/api-services.ts

/**
 * Sends recording URLs to the analysis API
 * @param audioUrls Array of audio URLs to analyze
 * @param submissionId ID of the submission being analyzed
 * @returns Promise with the API response
 */
export const sendToAnalysisAPI = async (audioUrls: string[], submissionId: string) => {
    try {
      const response = await fetch("https://classconnect-107872842385.us-west2.run.app/analyze", {
      //const response = await fetch("http://0.0.0.0:8081/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: audioUrls,
          submission_id: submissionId
        }),
      });
  
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Analysis API response:", data);
      return data;
    } catch (error) {
      console.error("Error sending recordings to analysis API:", error);
      throw error;
    }
  };