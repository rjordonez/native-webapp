import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppNavbar from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';

const ClassStudentsView = () => {
  const { id } = useParams(); // Get the class ID from the URL
  const navigate = useNavigate();
  const { getStudentsByClass, getClassById } = useClass();
  const [students, setStudents] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const classData = await getClassById(id); // Fetch class details to get the class name
        const studentsData = await getStudentsByClass(id); // Fetch students for the class
        setClassName(classData?.name || 'Unknown Class');
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load class or students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [id, getStudentsByClass, getClassById]);

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
          className="px-0 mb-4" 
          onClick={() => navigate('/teacher')} // Navigate back to /teacher
        >
          ← Back to Class
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Students in {className}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1} className="text-center py-8">
                      No students enrolled in this class yet
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                    </TableRow>
                  ))
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