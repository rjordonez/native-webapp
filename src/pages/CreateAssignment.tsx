
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

// Topic options for the dropdown
const TOPICS = [
  "Hometown",
  "Family",
  "Work",
  "Education",
  "Hobbies",
  "Travel",
  "Food",
  "Technology",
  "Environment",
  "Health",
  "Other"
];

const CreateAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes, createAssignment } = useClass();
  const teacherClasses = classes.filter(c => c.teacherId === localStorage.getItem("userId"));
  
  // Use the classId from state if available
  const initialClassId = location.state?.classId || (teacherClasses.length > 0 ? teacherClasses[0].id : "");
  
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(initialClassId);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);

  const handleAddQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      toast("Please enter a title");
      return;
    }
    
    if (!classId) {
      toast("Please select a class");
      return;
    }
    
    if (!dueDate) {
      toast("Please select a due date");
      return;
    }
    
    // Validate that no questions are empty
    if (questions.some(q => !q.trim())) {
      toast("Please fill in all questions");
      return;
    }
    
    // Create the assignment
    createAssignment(classId, title, dueDate, topic, questions);
    
    // Navigate back to class details
    navigate(`/class/${classId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
            Back
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Create Assignment</CardTitle>
              <CardDescription>
                Create a new speaking assignment for your students
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Assignment Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="class">Assign to Class</Label>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger id="class">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger id="topic">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((topic) => (
                          <SelectItem key={topic} value={topic}>
                            {topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Questions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                      <Plus size={16} className="mr-2" />
                      Add Question
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-grow">
                          <Textarea
                            value={question}
                            onChange={(e) => handleQuestionChange(index, e.target.value)}
                            placeholder={`Question ${index + 1}`}
                            className="resize-none"
                            rows={2}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveQuestion(index)}
                          disabled={questions.length === 1}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save & Assign
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateAssignment;
