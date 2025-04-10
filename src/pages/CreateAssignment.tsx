import { useState, useEffect } from "react";
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
import { useAuth } from "@/context/AuthContext";

// Existing topic options
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
  "Custom" 
];

// Predefined question templates for each topic
const TOPIC_QUESTIONS = {
  "Hometown": [
    "Describe the place where you grew up. What was special about it?",
    "How has your hometown changed over the years?",
    "What are some popular attractions or activities in your hometown?",
    "If you could change one thing about your hometown, what would it be and why?"
  ],
  "Family": [
    "Tell me about your family members and their personalities.",
    "What family traditions or celebrations are important to you?",
    "How would you describe your role in your family?",
    "Share a memorable experience you've had with your family."
  ],
  "Work": [
    "Describe your current job or a job you've had in the past.",
    "What do you find most challenging about your work?",
    "How do you maintain work-life balance?",
    "Where do you see yourself professionally in five years?"
  ],
  "Education": [
    "What was your school experience like growing up?",
    "Describe a teacher who had a significant impact on you.",
    "What subject did you enjoy studying the most and why?",
    "How has education shaped who you are today?"
  ],
  "Hobbies": [
    "What activities do you enjoy doing in your free time?",
    "How did you first become interested in your favorite hobby?",
    "Have you learned any important life lessons from your hobbies?",
    "Is there a hobby you'd like to try but haven't had the chance yet?"
  ],
  "Travel": [
    "What has been your most memorable travel experience?",
    "Describe a place you've visited that you would recommend to others.",
    "How do you prepare for a trip to a new destination?",
    "If you could travel anywhere in the world, where would you go and why?"
  ],
  "Food": [
    "What are some of your favorite dishes or cuisines?",
    "Do you enjoy cooking? If so, what do you like to prepare?",
    "Describe a memorable meal you've had.",
    "How important is food in your culture or family traditions?"
  ],
  "Technology": [
    "How has technology changed your daily life?",
    "What technological advancement are you most excited about?",
    "Do you think technology has more positive or negative effects on society?",
    "Describe your relationship with social media."
  ],
  "Environment": [
    "What environmental issues concern you the most?",
    "What steps do you take to reduce your environmental impact?",
    "How has the environment in your area changed over time?",
    "What do you think individuals can do to address climate change?"
  ],
  "Health": [
    "How do you maintain your physical and mental health?",
    "What healthy habits have you developed over time?",
    "How has your approach to health changed as you've gotten older?",
    "What advice would you give someone trying to improve their health?"
  ],
  "Custom": [""] // Empty for custom topics
};

const CreateAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes, createAssignment } = useClass();
  const { user } = useAuth();
  const teacherClasses = classes.filter(c => c.teacherId === user?.id);
  
  // Use the classId from state if available
  const initialClassId = location.state?.classId || (teacherClasses.length > 0 ? teacherClasses[0].id : "");
  
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(initialClassId);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopicName, setCustomTopicName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [useTemplate, setUseTemplate] = useState(true);

  // Update questions when topic changes (if using template)
  useEffect(() => {
    if (useTemplate && topic !== "Custom") {
      setQuestions([...TOPIC_QUESTIONS[topic]]);
    } else if (topic === "Custom") {
      setUseTemplate(false);
      // Start with one empty question for custom topics
      setQuestions([""]);
    }
  }, [topic, useTemplate]);

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (newTopic === "Custom") {
      setUseTemplate(false);
    } else {
      setUseTemplate(true);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, ""]);
    // If adding questions manually, turn off template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
    
    // If modifying template questions, turn off automatic template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
      
      // If removing template questions, turn off automatic template
      if (useTemplate) {
        setUseTemplate(false);
      }
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
    
    // Validate custom topic name if custom is selected
    if (topic === "Custom" && !customTopicName.trim()) {
      toast("Please enter a name for your custom topic");
      return;
    }
    
    // Validate that no questions are empty
    if (questions.some(q => !q.trim())) {
      toast("Please fill in all questions");
      return;
    }
    
    // Create the assignment with the appropriate topic name
    const finalTopicName = topic === "Custom" ? customTopicName : topic;
    createAssignment(classId, title, dueDate, finalTopicName, questions);
    
    // Navigate back to class details
    navigate(`/class/${classId}`);
  };

  // Reset to template questions
  const handleResetToTemplate = () => {
    if (topic !== "Custom") {
      setQuestions([...TOPIC_QUESTIONS[topic]]);
      setUseTemplate(true);
    }
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
                    <Select value={topic} onValueChange={handleTopicChange}>
                      <SelectTrigger id="topic">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {topic === "Custom" && (
                      <div className="mt-2">
                        <Input
                          placeholder="Enter custom topic name"
                          value={customTopicName}
                          onChange={(e) => setCustomTopicName(e.target.value)}
                          required={topic === "Custom"}
                        />
                      </div>
                    )}
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
                    <div className="flex gap-2">
                      {!useTemplate && topic !== "Custom" && (
                        <Button type="button" variant="outline" size="sm" onClick={handleResetToTemplate}>
                          Reset to Template
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                        <Plus size={16} className="mr-2" />
                        Add Question
                      </Button>
                    </div>
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