import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AppNavbar from '@/components/AppNavbar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Define types
interface Teacher {
  id: string;
  name: string;
  email: string;
  classes_count: number;
  students_count: number;
  avg_class_size: number;
}

interface ClassInfo {
  id: string;
  class_code: string;
  name: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  students_count: number;
  created_at: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  overall_grade: number;
  submission_count: number;
}

interface ClassGradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
}

// Define RPC response types
interface TeacherStatsResponse {
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  classes_count: number;
  total_students: number;
}

interface ClassDetailsResponse {
  class_id: string;
  class_code: string;
  class_name: string;
  description: string | null;
  teacher_id: string;
  teacher_name: string;
  student_count: number;
  created_at: string;
}

interface StudentClassResponse {
  student_id: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
}

const TeacherClassesPage = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassInfo[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teachers');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [gradeDistribution, setGradeDistribution] = useState<ClassGradeDistribution | null>(null);

  // Fetch data on initial load
  useEffect(() => {
    fetchTeachers();
  }, []);

  // Filtered classes based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = classes.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.class_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredClasses(filtered);
    } else {
      setFilteredClasses(classes);
    }
  }, [searchQuery, classes]);

  // Fetch all teachers and their stats
  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_teacher_stats') as { data: TeacherStatsResponse[] | null; error: any };

      if (error) throw error;

      if (data) {
        // Format data to match our Teacher interface
        const formattedTeachers: Teacher[] = data.map((item) => ({
          id: item.teacher_id,
          name: item.teacher_name,
          email: item.teacher_email,
          classes_count: item.classes_count,
          students_count: item.total_students,
          avg_class_size: item.classes_count > 0
            ? Math.round(item.total_students / item.classes_count)
            : 0
        }));

        setTeachers(formattedTeachers);

        // Also fetch all classes for the classes tab
        await fetchAllClasses();
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teacher data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all classes
  const fetchAllClasses = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_class_details') as { data: ClassDetailsResponse[] | null; error: any };

      if (error) throw error;

      if (data) {
        // Format data to match our ClassInfo interface
        const formattedClasses: ClassInfo[] = data.map((item) => ({
          id: item.class_id,
          class_code: item.class_code,
          name: item.class_name,
          description: item.description || 'No description available',
          teacher_id: item.teacher_id,
          teacher_name: item.teacher_name,
          students_count: item.student_count,
          created_at: new Date(item.created_at).toLocaleDateString()
        }));

        setClasses(formattedClasses);
        setFilteredClasses(formattedClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load class data');
    }
  };

  // Fetch classes for a specific teacher
  const fetchTeacherClasses = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          class_code,
          name,
          description,
          created_at,
          teacher_id
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      if (data) {
        // Now get student counts for each class
        const classesWithStudentCounts = await Promise.all(data.map(async (classItem) => {
          const { count, error: countError } = await supabase
            .from('students_classes')
            .select('student_id', { count: 'exact', head: true })
            .eq('class_id', classItem.id);

          if (countError) throw countError;

          return {
            ...classItem,
            students_count: count || 0,
            teacher_name: selectedTeacher?.name || 'Unknown Teacher'
          };
        }));

        const formattedClasses: ClassInfo[] = classesWithStudentCounts.map(item => ({
          id: item.id,
          class_code: item.class_code,
          name: item.name,
          description: item.description || 'No description available',
          teacher_id: item.teacher_id,
          teacher_name: item.teacher_name,
          students_count: item.students_count,
          created_at: new Date(item.created_at).toLocaleDateString()
        }));

        setClasses(formattedClasses);
        setFilteredClasses(formattedClasses);
      }
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error('Failed to load class data for this teacher');
    }
  };

  // Fetch students for a specific class
  const fetchClassStudents = async (classId: string) => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students_classes')
        .select('student_id')
        .eq('class_id', classId);

      if (studentsError) throw studentsError;

      if (studentsData) {
        // Get user details for each student
        const studentsWithDetails = await Promise.all(studentsData.map(async (student) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', student.student_id)
            .single();

          if (userError) throw userError;

          const { count, error: countError } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', student.student_id);

          if (countError) throw countError;

          return {
            id: student.student_id,
            name: userData.name,
            email: userData.email,
            overall_grade: 0,
            submission_count: count || 0
          };
        }));

        setStudents(studentsWithDetails);

        // Calculate grade distribution
        const distribution = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          F: 0
        };

        studentsWithDetails.forEach(student => {
          const grade = student.overall_grade;
          if (grade >= 90) distribution.A++;
          else if (grade >= 80) distribution.B++;
          else if (grade >= 70) distribution.C++;
          else if (grade >= 60) distribution.D++;
          else distribution.F++;
        });

        setGradeDistribution(distribution);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      toast.error('Failed to load student data for this class');
    }
  };

  // Handle teacher selection
  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    fetchTeacherClasses(teacher.id);
    setActiveTab('classes');
  };

  // Handle class selection
  const handleClassSelect = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    fetchClassStudents(classInfo.id);
    setActiveTab('students');
  };

  // Sort handlers
  const handleSort = (column: string) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);

    const sorted = [...filteredClasses].sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return isAsc
          ? valueB.localeCompare(valueA)
          : valueA.localeCompare(valueB);
      }

      return isAsc
        ? valueB - valueA
        : valueA - valueB;
    });

    setFilteredClasses(sorted);
  };

  // Format for grade distribution chart
  const formatGradeDistributionForChart = () => {
    if (!gradeDistribution) return [];

    return [
      { name: 'A', value: gradeDistribution.A, color: '#22c55e' },
      { name: 'B', value: gradeDistribution.B, color: '#3b82f6' },
      { name: 'C', value: gradeDistribution.C, color: '#eab308' },
      { name: 'D', value: gradeDistribution.D, color: '#f97316' },
      { name: 'F', value: gradeDistribution.F, color: '#ef4444' },
    ].filter(item => item.value > 0);
  };

  // Get letter grade from numeric grade
  const getLetterGrade = (grade: number): string => {
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  // Get color for grade
  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (grade >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Teacher & Class Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/voice-analysis-benchmark')} variant="outline">
              Back to Benchmark
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <div className="space-y-6">
              {/* Teacher Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Teachers</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Users className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="text-3xl font-bold">{teachers.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Classes</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100">
                      <BookOpen className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold">
                      {teachers.reduce((sum, teacher) => sum + teacher.classes_count, 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Students</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-green-100">
                      <GraduationCap className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold">
                      {teachers.reduce((sum, teacher) => sum + teacher.students_count, 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Teachers Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">Loading teacher data...</p>
                    </div>
                  ) : teachers.length === 0 ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">No teachers found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Classes</th>
                            <th className="text-left p-2">Students</th>
                            <th className="text-left p-2">Avg. Class Size</th>
                            <th className="text-right p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((teacher) => (
                            <tr key={teacher.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{teacher.name}</td>
                              <td className="p-2">{teacher.email}</td>
                              <td className="p-2">{teacher.classes_count}</td>
                              <td className="p-2">{teacher.students_count}</td>
                              <td className="p-2">{teacher.avg_class_size}</td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTeacherSelect(teacher)}
                                >
                                  View Classes
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search classes by name, code or teacher..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {selectedTeacher && (
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing classes for: <span className="font-medium text-foreground">{selectedTeacher.name}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTeacher(null);
                        fetchAllClasses();
                      }}
                    >
                      (Clear)
                    </Button>
                  </div>
                )}
              </div>

              {/* Classes Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTeacher
                      ? `Classes for ${selectedTeacher.name}`
                      : 'All Classes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">Loading class data...</p>
                    </div>
                  ) : filteredClasses.length === 0 ? (
                    <div className="flex justify-center items-center h-40">
                      <p className="text-muted-foreground">No classes found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 cursor-pointer group" onClick={() => handleSort('class_code')}>
                              <div className="flex items-center">
                                Class Code
                                <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              </div>
                            </th>
                            <th className="text-left p-2 cursor-pointer group" onClick={() => handleSort('name')}>
                              <div className="flex items-center">
                                Name
                                <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              </div>
                            </th>
                            <th className="text-left p-2 cursor-pointer group" onClick={() => handleSort('teacher_name')}>
                              <div className="flex items-center">
                                Teacher
                                <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              </div>
                            </th>
                            <th className="text-left p-2 cursor-pointer group" onClick={() => handleSort('students_count')}>
                              <div className="flex items-center">
                                Students
                                <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              </div>
                            </th>
                            <th className="text-left p-2 cursor-pointer group" onClick={() => handleSort('created_at')}>
                              <div className="flex items-center">
                                Created
                                <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              </div>
                            </th>
                            <th className="text-right p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClasses.map((classInfo) => (
                            <tr key={classInfo.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono">{classInfo.class_code}</td>
                              <td className="p-2 font-medium">{classInfo.name}</td>
                              <td className="p-2">{classInfo.teacher_name}</td>
                              <td className="p-2">{classInfo.students_count}</td>
                              <td className="p-2">{classInfo.created_at}</td>
                              <td className="p-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                      >
                                        Details
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>{classInfo.name}</DialogTitle>
                                        <DialogDescription>
                                          Class details and information
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="grid grid-cols-3 gap-4">
                                          <div className="col-span-1 font-medium">Class Code</div>
                                          <div className="col-span-2 font-mono">
                                            {classInfo.class_code}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                          <div className="col-span-1 font-medium">Teacher</div>
                                          <div className="col-span-2">
                                            {classInfo.teacher_name}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                          <div className="col-span-1 font-medium">Created</div>
                                          <div className="col-span-2">
                                            {classInfo.created_at}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                          <div className="col-span-1 font-medium">Students</div>
                                          <div className="col-span-2">
                                            {classInfo.students_count}
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="font-medium">Description</p>
                                          <div className="border rounded-md p-3">
                                            <p className="text-sm">
                                              {classInfo.description || 'No description available.'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button onClick={() => handleClassSelect(classInfo)}>
                                          View Students
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>

                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleClassSelect(classInfo)}
                                  >
                                    View Students
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
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <div className="space-y-6">
              {selectedClass ? (
                <>
                  {/* Class Info */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>
                          {selectedClass.name}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            (Code: {selectedClass.class_code})
                          </span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('classes')}
                        >
                          Back to Classes
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Teacher: {selectedClass.teacher_name} |
                        Students: {selectedClass.students_count} |
                        Created: {selectedClass.created_at}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Grade Distribution Chart */}
                          {gradeDistribution && (
                            <div className="border rounded-md p-4">
                              <h3 className="text-lg font-medium mb-4">Grade Distribution</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={formatGradeDistributionForChart()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                      `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                  >
                                    {formatGradeDistributionForChart().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value) => [`${value} students`, 'Count']}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Class Statistics */}
                          <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">Class Statistics</h3>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Average Grade</p>
                                <div className="flex items-center">
                                  <div className="text-2xl font-bold mr-2">
                                    {students.length > 0
                                      ? Math.round(students.reduce((sum, student) =>
                                        sum + student.overall_grade, 0
                                      ) / students.length)
                                      : 'N/A'
                                    }
                                  </div>
                                  {students.length > 0 && (
                                    <Badge
                                      variant="outline"
                                      className={getGradeColor(
                                        students.reduce((sum, student) =>
                                          sum + student.overall_grade, 0
                                        ) / students.length
                                      )}
                                    >
                                      {getLetterGrade(
                                        students.reduce((sum, student) =>
                                          sum + student.overall_grade, 0
                                        ) / students.length
                                      )}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  Total Submissions
                                </p>
                                <p className="text-2xl font-bold">
                                  {students.reduce((sum, student) =>
                                    sum + student.submission_count, 0
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  Avg. Submissions per Student
                                </p>
                                <p className="text-2xl font-bold">
                                  {students.length > 0
                                    ? Math.round(
                                      students.reduce((sum, student) =>
                                        sum + student.submission_count, 0
                                      ) / students.length * 10
                                    ) / 10
                                    : 'N/A'
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  Class Completion Rate
                                </p>
                                <div className="space-y-1">
                                  <Progress
                                    value={students.length > 0 ? 85 : 0}
                                    className="h-2"
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>0%</span>
                                    <span>{students.length > 0 ? '85%' : '0%'}</span>
                                    <span>100%</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  Top Performers
                                </p>
                                <div className="space-y-2">
                                  {students
                                    .sort((a, b) => b.overall_grade - a.overall_grade)
                                    .slice(0, 3)
                                    .map((student, index) => (
                                      <div key={student.id} className="flex justify-between items-center text-sm">
                                        <span>{index + 1}. {student.name}</span>
                                        <Badge
                                          variant="outline"
                                          className={getGradeColor(student.overall_grade)}
                                        >
                                          {Math.round(student.overall_grade)}%
                                        </Badge>
                                      </div>
                                    ))}
                                </div>
                              </div>
                              
                              {/* Class Performance Analysis */}
                              <div className="mt-8 p-4 border rounded-md bg-muted/40">
                                <h4 className="font-medium mb-2">Class Performance Analysis</h4>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <span className="font-medium">Overall:</span> Class is performing at a {
                                      students.length > 0
                                        ? (() => {
                                          const avg = students.reduce((sum, student) => sum + student.overall_grade, 0) / students.length;
                                          if (avg >= 85) return 'strong';
                                          if (avg >= 75) return 'good';
                                          if (avg >= 65) return 'satisfactory';
                                          return 'below average';
                                        })()
                                        : 'N/A'
                                    } level with a class average of {
                                      students.length > 0
                                        ? Math.round(students.reduce((sum, student) => sum + student.overall_grade, 0) / students.length)
                                        : 'N/A'
                                    }%.
                                  </p>

                                  <p>
                                    <span className="font-medium">Strengths:</span> {
                                      students.length > 0
                                        ? students.filter(s => s.overall_grade >= 80).length + ' students (' +
                                        Math.round(students.filter(s => s.overall_grade >= 80).length / students.length * 100) +
                                        '%) are performing at B level or above.'
                                        : 'N/A'
                                    }
                                  </p>

                                  <p>
                                    <span className="font-medium">Areas for improvement:</span> {
                                      students.length > 0
                                        ? students.filter(s => s.overall_grade < 70).length + ' students (' +
                                        Math.round(students.filter(s => s.overall_grade < 70).length / students.length * 100) +
                                        '%) are performing below C level and may need additional support.'
                                        : 'N/A'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-60">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No class selected</p>
                  <p className="text-sm text-muted-foreground mb-4">Select a class from the Classes tab to view student details</p>
                  <Button onClick={() => setActiveTab('classes')}>
                    Go to Classes
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherClassesPage;