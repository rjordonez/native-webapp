import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import AppNavbar from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ClassStudentsView = () => {
  const { id } = useParams(); // Get the class ID from the URL
  const navigate = useNavigate();
  const { 
    getStudentsByClass, 
    getClassById
  } = useClass();
  
  const [students, setStudents] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Mock student grades data
  const mockStudentGrades = {
    // These will be populated with mock data for each student
  };
  
  // Mock class average
  const [classAverage, setClassAverage] = useState(78.5);
  
  useEffect(() => {
    const loadStudents = async () => {
      try {
        // Fetch class details to get the class name
        const classData = await getClassById(id);
        setClassName(classData?.name || 'Unknown Class');
        
        // Fetch students for the class
        const studentsData = await getStudentsByClass(id);
        setStudents(studentsData || []);
        
        // Generate mock grades for each student
        const mockGrades = {};
        let totalPercentage = 0;
        
        studentsData.forEach(student => {
          // Generate random grade data for each student
          const percentage = Math.floor(Math.random() * 41) + 60; // Random grade between 60-100
          const totalAssignments = 10; // Fixed number for simplicity
          const completedAssignments = Math.floor(Math.random() * (totalAssignments + 1)); // Random completed between 0-10
          
          mockGrades[student.id] = {
            percentage,
            completedAssignments,
            totalAssignments
          };
          
          totalPercentage += percentage;
        });
        
        // Calculate and set class average based on mock data
        if (studentsData.length > 0) {
          setClassAverage(totalPercentage / studentsData.length);
        }
        
        // Set student grades using the mock data
        Object.assign(mockStudentGrades, mockGrades);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load class or students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [id, getStudentsByClass, getClassById]);

  // Format grade as a letter grade
  const getLetterGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };
  
  // Get color for progress bar based on grade
  const getGradeColor = (percentage) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 80) return "bg-blue-500";
    if (percentage >= 70) return "bg-yellow-500";
    if (percentage >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => navigate('/teacher')}>Back to Dashboard</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <Button 
          variant="link" 
          className="px-0 mb-4 flex items-center" 
          onClick={() => navigate(`/teacher/class/${id}`)}
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Class
        </Button>
        
        {/* Class Performance Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Class Performance Overview</CardTitle>
            <CardDescription>Students in {className}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Class Average</h3>
                <p className="text-2xl font-semibold">{classAverage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  Letter Grade: {getLetterGrade(classAverage)}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Total Students</h3>
                <p className="text-2xl font-semibold">{students.length}</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Grading Distribution</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>A: {students.filter(s => getLetterGrade(mockStudentGrades[s.id]?.percentage || 0) === 'A').length}</span>
                    <span>B: {students.filter(s => getLetterGrade(mockStudentGrades[s.id]?.percentage || 0) === 'B').length}</span>
                    <span>C: {students.filter(s => getLetterGrade(mockStudentGrades[s.id]?.percentage || 0) === 'C').length}</span>
                    <span>D: {students.filter(s => getLetterGrade(mockStudentGrades[s.id]?.percentage || 0) === 'D').length}</span>
                    <span>F: {students.filter(s => getLetterGrade(mockStudentGrades[s.id]?.percentage || 0) === 'F').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Students Table Card */}
        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Overall Grade</TableHead>
                  <TableHead>Letter Grade</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No students enrolled in this class yet
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    // Use mock data or default values if student ID not in mockStudentGrades
                    const grade = mockStudentGrades[student.id] || { 
                      percentage: Math.floor(Math.random() * 41) + 60, 
                      completedAssignments: Math.floor(Math.random() * 11), 
                      totalAssignments: 10 
                    };
                    const percentage = Math.round(grade.percentage);
                    const letterGrade = getLetterGrade(percentage);
                    const gradeColor = getGradeColor(percentage);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          {grade.completedAssignments} / {grade.totalAssignments}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {percentage}%
                        </TableCell>
                        <TableCell>
                          {letterGrade}
                        </TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={percentage} 
                              max={100}
                              className={`h-2 ${gradeColor}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClassStudentsView;