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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

// Question with example and time limit type
interface QuestionWithExample {
  question: string;
  example: string;
  timeLimit: string; // Added timeLimit field
}

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

// Predefined time options (in seconds)
const TIME_LIMITS = ["30", "60", "120", "300"];

// Predefined question templates with examples and default time limits for each topic
const TOPIC_QUESTIONS: Record<string, QuestionWithExample[]> = {
  "Hometown": [
    {
      question: "Describe the place where you grew up. What was special about it?",
      example: "I grew up in a small village near the mountains. It was very quiet and beautiful. There was a river where we could swim in summer. The best thing about my hometown was the clean air and friendly people.",
      timeLimit: "60"
    },
    {
      question: "How has your hometown changed over the years?",
      example: "My hometown has changed a lot. Now we have more houses and shops. Before, we only had one small market, but now we have a big supermarket. Many young people moved to the city for work, so there are fewer children now.",
      timeLimit: "60"
    },
    {
      question: "What are some popular attractions or activities in your hometown?",
      example: "In my hometown, visitors like to see the old church that is 200 years old. People enjoy walking in the forest and having picnics by the lake. In winter, many people go skiing on the small hill near the town.",
      timeLimit: "60"
    },
    {
      question: "If you could change one thing about your hometown, what would it be and why?",
      example: "If I could change one thing about my hometown, I would add a library. We don't have a place where people can read books or study. A library would help students and also give older people a place to meet and talk.",
      timeLimit: "60"
    }
  ],
  "Family": [
    {
      question: "Tell me about your family members and their personalities.",
      example: "I have a small family. My mother is very kind and always helps others. My father is funny and likes to tell jokes. My sister is smart and studies hard at school. We also have a dog named Max who is very playful.",
      timeLimit: "60"
    },
    {
      question: "What family traditions or celebrations are important to you?",
      example: "In my family, we always eat dinner together on Sundays. For New Year, we make special food and visit our grandparents. On birthdays, we sing songs and give small gifts to each other. These traditions make us feel close.",
      timeLimit: "60"
    },
    {
      question: "How would you describe your role in your family?",
      example: "In my family, I help my parents with technology. I show them how to use computers and smartphones. I also take care of our garden and plants. Sometimes I cook dinner when my parents are busy with work.",
      timeLimit: "60"
    },
    {
      question: "Share a memorable experience you've had with your family.",
      example: "Last year, we went camping by a lake. We set up our tent and made a fire to cook food. At night, we saw many stars in the sky. We told stories and sang songs. It was simple, but I will always remember that happy time.",
      timeLimit: "60"
    }
  ],
  "Work": [
    {
      question: "Describe your current job or a job you've had in the past.",
      example: "I work in a small shop that sells clothes. I help customers find what they need and use the cash register. I also organize the items on shelves and keep the shop clean. I work five days each week from 9 AM to 5 PM.",
      timeLimit: "60"
    },
    {
      question: "What do you find most challenging about your work?",
      example: "The most challenging part of my job is when many customers come at the same time. It's hard to help everyone quickly. Also, sometimes customers are unhappy and complain. I need to stay calm and solve their problems.",
      timeLimit: "60"
    },
    {
      question: "How do you maintain work-life balance?",
      example: "To balance work and life, I don't check work emails at home. I spend time with friends on weekends. I also have a hobby - I like to draw. Every evening, I draw for 30 minutes to relax after work.",
      timeLimit: "60"
    },
    {
      question: "Where do you see yourself professionally in five years?",
      example: "In five years, I hope to become a manager at my shop. I am learning about business management now. Maybe I will also improve my English to help international customers. If possible, I would like to earn more money to support my family.",
      timeLimit: "60"
    }
  ],
  "Education": [
    {
      question: "What was your school experience like growing up?",
      example: "When I was in school, I had classes from 8 AM to 3 PM. My favorite subject was science. I had many friends, and we played sports during breaks. Our teachers were strict but helpful. We had to wear uniforms - blue pants and white shirts.",
      timeLimit: "60"
    },
    {
      question: "Describe a teacher who had a significant impact on you.",
      example: "My math teacher, Mr. Lee, changed how I think about learning. He was patient and explained things clearly. When I made mistakes, he never made me feel bad. He showed me that it's okay to ask questions. Because of him, I started to like math.",
      timeLimit: "60"
    },
    {
      question: "What subject did you enjoy studying the most and why?",
      example: "I enjoyed studying history the most because I learned about how people lived long ago. I liked reading stories about kings, wars, and different countries. History helped me understand why the world is the way it is today.",
      timeLimit: "60"
    },
    {
      question: "How has education shaped who you are today?",
      example: "Education taught me how to solve problems and think logically. I learned to read and write, which helps me every day. School also taught me to work with other people. Most importantly, education gave me confidence to try new things.",
      timeLimit: "60"
    }
  ],
  "Hobbies": [
    {
      question: "What activities do you enjoy doing in your free time?",
      example: "In my free time, I enjoy cooking new recipes. I also like to go for walks in the park near my house. On weekends, I watch movies with my friends. Sometimes I play chess with my neighbor. These activities help me relax.",
      timeLimit: "60"
    },
    {
      question: "How did you first become interested in your favorite hobby?",
      example: "I became interested in photography when my uncle gave me an old camera for my birthday. At first, I just took pictures of my family. Then I started taking photos of nature and buildings. Now I practice taking better pictures every week.",
      timeLimit: "60"
    },
    {
      question: "Have you learned any important life lessons from your hobbies?",
      example: "From playing soccer, I learned that teamwork is important. I also learned that practice makes you better. When I make mistakes, I don't give up. These lessons help me in school and work too.",
      timeLimit: "60"
    },
    {
      question: "Is there a hobby you'd like to try but haven't had the chance yet?",
      example: "I would like to try playing the guitar. I love music and want to learn how to play songs. I haven't started yet because guitars are expensive, and I need to find a teacher. Maybe next year I can begin this new hobby.",
      timeLimit: "60"
    }
  ],
  "Travel": [
    {
      question: "What has been your most memorable travel experience?",
      example: "My most memorable trip was visiting my grandparents' village. We took a long bus ride through the mountains. The village had no tall buildings, only small houses. I saw how people grow their own food and live simply. It was very different from my city.",
      timeLimit: "60"
    },
    {
      question: "Describe a place you've visited that you would recommend to others.",
      example: "I would recommend visiting the lake near my town. The water is very clean, and you can swim in summer. There are small restaurants where you can eat fresh fish. You can rent a boat or just sit and enjoy the view of mountains around the lake.",
      timeLimit: "60"
    },
    {
      question: "How do you prepare for a trip to a new destination?",
      example: "Before a trip, I check the weather to know what clothes to bring. I make a list of important items like my ID card, money, and phone charger. I also learn a few basic words if people speak a different language there.",
      timeLimit: "60"
    },
    {
      question: "If you could travel anywhere in the world, where would you go and why?",
      example: "If I could go anywhere, I would visit Japan. I want to see the cherry blossoms in spring and try Japanese food. I'm interested in their traditional houses and gardens. I also want to ride the fast trains between cities.",
      timeLimit: "60"
    }
  ],
  "Food": [
    {
      question: "What are some of your favorite dishes or cuisines?",
      example: "My favorite food is pasta with tomato sauce. I also like chicken soup when it's cold outside. For breakfast, I enjoy bread with honey. From other countries, I like Chinese fried rice and Mexican tacos.",
      timeLimit: "60"
    },
    {
      question: "Do you enjoy cooking? If so, what do you like to prepare?",
      example: "Yes, I enjoy cooking simple meals. I often make vegetable soup because it's healthy and easy. On weekends, I bake cookies with my children. I can also make a good omelet with cheese and tomatoes for breakfast.",
      timeLimit: "60"
    },
    {
      question: "Describe a memorable meal you've had.",
      example: "For my 30th birthday, my family cooked a special dinner. We had grilled fish, rice, and many vegetable dishes. My mother made my favorite cake with chocolate. We ate outside in our garden. The food was delicious, and I felt very happy.",
      timeLimit: "60"
    },
    {
      question: "How important is food in your culture or family traditions?",
      example: "Food is very important in my culture. During holidays, families spend many hours cooking traditional dishes. We have special foods for weddings, birthdays, and religious celebrations. Sharing meals brings people together and shows love.",
      timeLimit: "60"
    }
  ],
  "Technology": [
    {
      question: "How has technology changed your daily life?",
      example: "Technology has changed how I do many things. I use my phone to talk with family who live far away. I can check the weather before going outside. At work, computers help me do tasks faster. I also watch videos to learn new skills.",
      timeLimit: "60"
    },
    {
      question: "What technological advancement are you most excited about?",
      example: "I am excited about electric cars. They don't pollute the air and are quieter. As batteries improve, these cars can go farther. I hope they will become cheaper so more people can buy them. This will help our environment.",
      timeLimit: "60"
    },
    {
      question: "Do you think technology has more positive or negative effects on society?",
      example: "I think technology has more positive effects. It helps doctors treat sick people. Students can learn from home using computers. However, there are some problems too. Some people use phones too much and don't talk face-to-face anymore.",
      timeLimit: "60"
    },
    {
      question: "Describe your relationship with social media.",
      example: "I use social media to see photos from my friends and family. I check Facebook about once a day. I don't post many things myself. I try not to spend too much time scrolling. I prefer talking on the phone or meeting in person.",
      timeLimit: "60"
    }
  ],
  "Environment": [
    {
      question: "What environmental issues concern you the most?",
      example: "I worry about plastic pollution. When I go to the beach, I see plastic bottles and bags in the water and sand. This is bad for fish and birds. I also worry about cutting down too many trees, which causes animals to lose their homes.",
      timeLimit: "60"
    },
    {
      question: "What steps do you take to reduce your environmental impact?",
      example: "To help the environment, I bring my own bags when shopping. I try to use less water by taking shorter showers. I walk or use the bus instead of driving when possible. At home, I turn off lights when I leave a room to save energy.",
      timeLimit: "60"
    },
    {
      question: "How has the environment in your area changed over time?",
      example: "In my area, there are more buildings now and fewer trees. The river that was clean when I was a child now has pollution. Summers feel hotter than before. But there is some good news - our city started a recycling program last year.",
      timeLimit: "60"
    },
    {
      question: "What do you think individuals can do to address climate change?",
      example: "People can do small things that help. We can use less electricity and water. We can eat less meat and more vegetables. We can fix things instead of buying new ones. If many people make these small changes, it will make a big difference.",
      timeLimit: "60"
    }
  ],
  "Health": [
    {
      question: "How do you maintain your physical and mental health?",
      example: "For my physical health, I walk for 30 minutes every day and eat fruits and vegetables. For mental health, I talk with friends when I feel worried. I also try to sleep 8 hours each night. On weekends, I spend time in nature to feel calm.",
      timeLimit: "60"
    },
    {
      question: "What healthy habits have you developed over time?",
      example: "Over the years, I learned to drink more water instead of sweet drinks. I started to read before bed instead of looking at my phone. I also try to eat slowly and enjoy my food. These small habits make me feel better.",
      timeLimit: "60"
    },
    {
      question: "How has your approach to health changed as you've gotten older?",
      example: "When I was young, I didn't think about health much. Now I'm more careful about what I eat. I check with a doctor once a year. I try to exercise regularly, not just sometimes. I understand now that good health makes life better.",
      timeLimit: "60"
    },
    {
      question: "What advice would you give someone trying to improve their health?",
      example: "Start with small changes. Try to walk more each day. Add one vegetable to your meals. Go to sleep at the same time every night. Don't try to change everything at once. Be patient and kind to yourself when making healthy changes.",
      timeLimit: "60"
    }
  ],
  "Custom": [
    {
      question: "",
      example: "",
      timeLimit: "60"
    }
  ] // Empty for custom topics
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
  const [questionsWithExamples, setQuestionsWithExamples] = useState<QuestionWithExample[]>([{ question: "", example: "", timeLimit: "60" }]);
  const [useTemplate, setUseTemplate] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);

  // Update questions when topic changes (if using template)
  useEffect(() => {
    if (useTemplate && topic !== "Custom") {
      setQuestionsWithExamples([...TOPIC_QUESTIONS[topic]]);
    } else if (topic === "Custom") {
      setUseTemplate(false);
      // Start with one empty question for custom topics
      setQuestionsWithExamples([{ question: "", example: "", timeLimit: "60" }]);
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
    setQuestionsWithExamples([...questionsWithExamples, { question: "", example: "", timeLimit: "60" }]);
    // If adding questions manually, turn off template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestionsWithExamples = [...questionsWithExamples];
    newQuestionsWithExamples[index].question = value;
    setQuestionsWithExamples(newQuestionsWithExamples);
    
    // If modifying template questions, turn off automatic template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  const handleExampleChange = (index: number, value: string) => {
    const newQuestionsWithExamples = [...questionsWithExamples];
    newQuestionsWithExamples[index].example = value;
    setQuestionsWithExamples(newQuestionsWithExamples);
    
    // If modifying template examples, turn off automatic template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  // New handler for time limit change
  const handleTimeLimitChange = (index: number, value: string) => {
    const newQuestionsWithExamples = [...questionsWithExamples];
    newQuestionsWithExamples[index].timeLimit = value;
    setQuestionsWithExamples(newQuestionsWithExamples);
    
    // If modifying template time limits, turn off automatic template
    if (useTemplate) {
      setUseTemplate(false);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questionsWithExamples.length > 1) {
      const newQuestionsWithExamples = [...questionsWithExamples];
      newQuestionsWithExamples.splice(index, 1);
      setQuestionsWithExamples(newQuestionsWithExamples);
      
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
    if (questionsWithExamples.some(q => !q.question.trim())) {
      toast("Please fill in all questions");
      return;
    }
    
    // Create the assignment with the appropriate topic name
    const finalTopicName = topic === "Custom" ? customTopicName : topic;
    
    // Convert to string for storage in localStorage (for future enhancement)
    const metadataStr = JSON.stringify({
      questionsWithTimeLimits: questionsWithExamples.map(q => ({
        question: q.question,
        timeLimit: q.timeLimit,
        ...(includeExamples ? { example: q.example } : {})
      }))
    });
    
    // Store in localStorage for potential future retrieval
    localStorage.setItem(`assignment_data_${Date.now()}`, metadataStr);
    
    // Call the standard createAssignment function with the 5 parameters it expects
    // This maintains backward compatibility while still preserving the time limit data
    createAssignment(
      classId,
      title,
      dueDate,
      finalTopicName,
      questionsWithExamples.map(q => q.question),
      metadataStr 
    );
      
    // Navigate back to class details
    navigate(`/class/${classId}`);
  };

  // Reset to template questions
  const handleResetToTemplate = () => {
    if (topic !== "Custom") {
      setQuestionsWithExamples([...TOPIC_QUESTIONS[topic]]);
      setUseTemplate(true);
    }
  };

  // Helper function to format time display
  const formatTimeDisplay = (seconds: string) => {
    const sec = parseInt(seconds, 10);
    if (sec < 60) {
      return `${sec} seconds`;
    } else if (sec === 60) {
      return "1 minute";
    } else if (sec === 120) {
      return "2 minutes";
    } else {
      return `${sec / 60} minutes`;
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
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="includeExamples" 
                        checked={includeExamples} 
                        onCheckedChange={setIncludeExamples} 
                      />
                      <Label htmlFor="includeExamples">
                        Include example answers for students
                      </Label>
                    </div>
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
                  
                  <div className="space-y-4">
                    {questionsWithExamples.map((item, index) => (
                      <Accordion 
                        key={index} 
                        type="single" 
                        collapsible 
                        className="border rounded-md"
                      >
                        <AccordionItem value={`question-${index}`} className="border-none">
                          <div className="flex gap-2 p-2">
                            <div className="flex-grow">
                              <div className="flex gap-2 mb-2">
                                <div className="flex-grow">
                                  <Textarea
                                    value={item.question}
                                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                                    placeholder={`Question ${index + 1}`}
                                    className="resize-none"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex-shrink-0 w-40">
                                  <Label htmlFor={`timeLimit-${index}`} className="text-sm mb-1 block">
                                    Time Limit
                                  </Label>
                                  <Select
                                    value={item.timeLimit}
                                    onValueChange={(value) => handleTimeLimitChange(index, value)}
                                  >
                                    <SelectTrigger id={`timeLimit-${index}`} className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_LIMITS.map((time) => (
                                        <SelectItem key={time} value={time}>
                                          {formatTimeDisplay(time)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <AccordionTrigger className="py-1">
                                {includeExamples ? "Example Answer (Optional)" : "Example Answer (Hidden from Students)"}
                              </AccordionTrigger>
                              
                              <AccordionContent>
                                <Textarea
                                  value={item.example}
                                  onChange={(e) => handleExampleChange(index, e.target.value)}
                                  placeholder="Provide a simple example answer that students can reference if needed"
                                  className="resize-none mt-2"
                                  rows={3}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                  {includeExamples ? 
                                    "Students will have the option to view this example if they're stuck." :
                                    "This example is for your reference only and won't be shown to students."}
                                </p>
                              </AccordionContent>
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveQuestion(index)}
                              disabled={questionsWithExamples.length === 1}
                              className="h-10 self-start"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </AccordionItem>
                      </Accordion>
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