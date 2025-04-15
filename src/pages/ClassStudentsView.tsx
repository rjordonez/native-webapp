import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import AppNavbar from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { GradingService, StudentPerformance, GradeDistribution } from '@/lib/grading-service';

const ClassStudentsView = () => {
  const { id } = useParams(); // Get the class ID from the URL
  const navigate = useNavigate();
  const { getClassById } = useClass();
  
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classAverage, setClassAverage] = useState(0);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution>({
    A: 0, B: 0, C: 0, D: 0, F: 0
  });
  
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch class details to get the class name
        const classData = await getClassById(id);
        setClassName(classData?.name || 'Unknown Class');
        
        // Fetch students performance data from the backend
        const studentsData = await GradingService.getStudentPerformanceByClass(id);
        setStudents(studentsData || []);
        
        // Calculate class average and grade distribution
        if (studentsData.length > 0) {
          const average = GradingService.calculateClassAverage(studentsData);
          setClassAverage(average);
          
          const distribution = GradingService.getGradeDistribution(studentsData);
          setGradeDistribution(distribution);
        }
      } catch (error) {
        console.error('Error fetching class data:', error);
        setError('Failed to load class or students. Please try again.');
        toast.error('Failed to load class data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, getClassById]);

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
          onClick={() => navigate(`/class/${id}`)}
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
                  Letter Grade: {GradingService.getLetterGrade(classAverage)}
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
                    <span>A: {gradeDistribution.A}</span>
                    <span>B: {gradeDistribution.B}</span>
                    <span>C: {gradeDistribution.C}</span>
                    <span>D: {gradeDistribution.D}</span>
                    <span>F: {gradeDistribution.F}</span>
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
                    const percentage = student.percentage !== null ? Math.round(student.percentage) : null;
                    const letterGrade = GradingService.getLetterGrade(percentage);
                    const gradeColor = GradingService.getGradeColor(percentage);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          {student.completedAssignments} / {student.totalAssignments}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {percentage !== null ? `${percentage}%` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {letterGrade}
                        </TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={percentage || 0} 
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