// src/lib/grading-service.ts

export interface StudentPerformance {
    id: string;
    name: string;
    percentage: number | null;
    completedAssignments: number;
    totalAssignments: number;
  }
  
  export interface GradeDistribution {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  }
  
  export interface GradeUpdateResponse {
    status: string;
    message: string;
    data?: any;
  }
  
  // Base URL for the API
  const API_BASE_URL = "https://classconnect-107872842385.us-west2.run.app";
  // For local development: 
  //const API_BASE_URL = "http://0.0.0.0:8081";
  //const API_BASE_URL = "http://127.0.0.1:8000";
  //const API_BASE_URL = "http://127.0.0.1:8000";
  
  export const GradingService = {
    /**
     * Fetches student performance data for a class
     * @param classId - The class ID
     * @returns Array of student performance data
     */
    async getStudentPerformanceByClass(classId: string): Promise<StudentPerformance[]> {
      try {
        const response = await fetch(`${API_BASE_URL}/student-performance/${classId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching student performance: ${response.statusText}`);
        }
        
        const data: StudentPerformance[] = await response.json();
        return data;
      } catch (error) {
        console.error("Error in getStudentPerformanceByClass:", error);
        throw error;
      }
    },
  
    /**
     * Updates a student's grade in a class
     * @param classId - The class ID
     * @param studentId - The student ID
     * @param grade - The grade to set
     * @returns The result of the operation
     */
    async updateStudentGrade(
      classId: string, 
      studentId: string, 
      grade: number
    ): Promise<GradeUpdateResponse> {
      try {
        const response = await fetch(`${API_BASE_URL}/test-update-grade/${classId}/${studentId}/${grade}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update grade");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error in updateStudentGrade:", error);
        throw error;
      }
    },
  
    /**
     * Calculates class average from student data
     * @param studentsData - Array of student performance data
     * @returns The class average
     */
    calculateClassAverage(studentsData: StudentPerformance[]): number {
      if (!studentsData || studentsData.length === 0) return 0;
      
      // Filter out students without grades
      const studentsWithGrades = studentsData.filter(student => 
        student.percentage !== null && student.percentage !== undefined
      );
      
      if (studentsWithGrades.length === 0) return 0;
      
      // Calculate average
      const sum = studentsWithGrades.reduce(
        (total, student) => total + (student.percentage || 0), 
        0
      );
      
      return sum / studentsWithGrades.length;
    },
  
    /**
     * Counts the number of students in each grade category
     * @param studentsData - Array of student performance data
     * @returns Object with counts for each grade letter
     */
    getGradeDistribution(studentsData: StudentPerformance[]): GradeDistribution {
      const distribution: GradeDistribution = {
        A: 0, B: 0, C: 0, D: 0, F: 0
      };
  
      studentsData.forEach(student => {
        if (student.percentage === null || student.percentage === undefined) return;
        
        if (student.percentage >= 90) distribution.A++;
        else if (student.percentage >= 80) distribution.B++;
        else if (student.percentage >= 70) distribution.C++;
        else if (student.percentage >= 60) distribution.D++;
        else distribution.F++;
      });
  
      return distribution;
    },
    
    /**
     * Converts a percentage to a letter grade
     * @param percentage - The numeric grade percentage
     * @returns The corresponding letter grade
     */
    getLetterGrade(percentage: number | null): string {
      if (percentage === null || percentage === undefined) return 'N/A';
      
      if (percentage >= 90) return 'A';
      if (percentage >= 80) return 'B';
      if (percentage >= 70) return 'C';
      if (percentage >= 60) return 'D';
      return 'F';
    },
    
    /**
     * Gets the appropriate color class for a grade based on its value
     * @param percentage - The numeric grade percentage
     * @returns The Tailwind CSS color class
     */
    getGradeColor(percentage: number | null): string {
      if (percentage === null || percentage === undefined) return "bg-gray-300";
      
      if (percentage >= 90) return "bg-green-500";
      if (percentage >= 80) return "bg-blue-500";
      if (percentage >= 70) return "bg-yellow-500";
      if (percentage >= 60) return "bg-orange-500";
      return "bg-red-500";
    }
  };