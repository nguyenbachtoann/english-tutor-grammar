import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  MessageCircle,
  Trophy,
  Settings,
  Send,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Edit3,
  Book,
  Sparkles,
  GraduationCap,
  ChevronLeft,
  Play,
  Lightbulb,
  Award
} from 'lucide-react';

/* GRAMMARFLOW - AI ENGLISH TUTOR (TYPESCRIPT STRICT MODE)
  ------------------------------
  Optimized for TypeScript strict mode:
  - Added useCallback for stable function references
  - Fixed unused variables in catch blocks
  - Cleaned up imports
*/

// --- TYPES & INTERFACES ---

interface Topic {
  id: number;
  title: string;
  icon: string;
  desc: string;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface QuizData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface LessonContent {
  title: string;
  intro: string;
  theory: string;
  examples: string[];
  quiz: QuizData;
  error?: boolean;
}

interface AnalysisResult {
  corrected: string;
  isCorrect: boolean;
  analysis: string;
  betterWay?: string;
}

// --- MOCK DATA & CONSTANTS ---
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const TOPICS: Topic[] = [
  { id: 1, title: 'Present Tenses (Hiện tại đơn/tiếp diễn)', icon: '☀️', desc: 'Daily habits & current actions' },
  { id: 2, title: 'Past Tenses (Quá khứ đơn/tiếp diễn)', icon: '⏳', desc: 'History & memories' },
  { id: 3, title: 'Future Forms (Tương lai)', icon: '🚀', desc: 'Plans & predictions' },
  { id: 4, title: 'Prepositions (In, On, At...)', icon: '📍', desc: 'Time & Place logic' },
  { id: 5, title: 'Articles (A, An, The)', icon: '🍎', desc: 'Definite vs Indefinite' },
  { id: 6, title: 'Passive Voice (Câu bị động)', icon: '🛡️', desc: 'Focus on the action' },
  { id: 7, title: 'Conditionals (If sentences)', icon: '🔮', desc: 'Zero, 1st, 2nd, 3rd types' },
  { id: 8, title: 'Relative Clauses (Mệnh đề quan hệ)', icon: '🔗', desc: 'Who, Which, That' },
  { id: 9, title: 'Modal Verbs (Can, Should, Must)', icon: '🚦', desc: 'Obligation & Ability' },
  { id: 10, title: 'Phrasal Verbs', icon: '🔥', desc: 'Common verb phrases' },
];

// --- UTILS: MARKDOWN RENDERER ---
interface MarkdownRendererProps {
  content?: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={`space-y-2 ${className}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Handle Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
           return (
             <div key={i} className="flex gap-2 ml-2">
               <span className="text-indigo-500 mt-1.5">•</span>
               <p className="flex-1" dangerouslySetInnerHTML={{
                 __html: line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               }} />
             </div>
           );
        }

        // Handle Headers
        if (line.trim().startsWith('###')) {
            return <h4 key={i} className="font-bold text-lg text-indigo-700 mt-2">{line.replace(/###/g, '')}</h4>
        }

        // Standard Paragraph
        return (
          <p key={i} dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }} />
        );
      })}
    </div>
  );
};

// --- AI SERVICE (GEMINI) ---
const callGemini = async (prompt: string, systemInstruction: string = ""): Promise<string> => {
  const apiKey = "AIzaSyA4TTNCO7YXiyICR2U-VxY3Vl3pvDYdxH8"; // System will inject the key

  const makeRequest = async (retryCount = 0): Promise<string> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          }),
        }
      );

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, AI đang bận.";
    } catch (error) {
      if (retryCount < 2) {
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return makeRequest(retryCount + 1);
      }
      return "Không thể kết nối với AI. Vui lòng thử lại sau.";
    }
  };

  return makeRequest();
};

const LoadingDots: React.FC = () => (
  <div className="flex space-x-1 items-center p-2">
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

// --- SUB-COMPONENTS ---

// 1. LESSON VIEW
interface LessonViewProps {
  topic: Topic;
  level: string;
  onBack: () => void;
  onComplete: () => void;
}

const LessonView: React.FC<LessonViewProps> = ({ topic, level, onBack, onComplete }) => {
  const [content, setContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState<{ selected: number | null; correct: boolean }>({ selected: null, correct: false });

  // Use useCallback to memoize the function and avoid exhaustive-deps warning
  const generateLesson = useCallback(async () => {
    setLoading(true);
    const prompt = `
      Act as an expert English teacher. Create a concise but complete lesson about "${topic.title}" for a "${level}" student.
      Return strictly valid JSON (no markdown formatting) with this structure:
      {
        "title": "Fun/Catchy Title",
        "intro": "Brief introduction why this is important",
        "theory": "Main grammar rules formatted with bullet points and bold text (markdown style)",
        "examples": ["Example sentence 1", "Example sentence 2", "Example sentence 3"],
        "quiz": {
          "question": "A practice question related to the theory",
          "options": ["Option A", "Option B", "Option C"],
          "correct": 0,
          "explanation": "Why it is correct"
        }
      }
    `;

    try {
      const text = await callGemini(prompt, "You are a JSON API.");
      const cleanText = text.replace(/```json|```/g, '').trim();
      setContent(JSON.parse(cleanText));
    } catch (e) {
      console.error("Error generating lesson:", e);
      setContent({
        title: "Error", intro: "", theory: "", examples: [],
        quiz: { question: "", options: [], correct: 0, explanation: "" },
        error: true
      });
    }
    setLoading(false);
  }, [topic, level]); // Dependencies for useCallback

  useEffect(() => {
    generateLesson();
  }, [generateLesson]); // Correct dependency array

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 bg-white pt-20">
      <RefreshCw className="animate-spin text-indigo-600 w-10 h-10" />
      <p className="text-gray-500 font-medium">AI Teacher is preparing your lesson...</p>
    </div>
  );

  if (content?.error) return (
    <div className="p-6 text-center pt-20">
      <p>Có lỗi xảy ra. Vui lòng thử lại.</p>
      <button onClick={onBack} className="mt-4 text-indigo-600 font-bold">Quay lại</button>
    </div>
  );

  return (
    <div className="bg-white min-h-screen pb-24 animate-fade-in">
      {/* Lesson Header */}
      <div className="bg-indigo-600 p-6 text-white rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-indigo-100 hover:text-white mb-4">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{topic.icon}</span>
          <div>
            <h2 className="text-2xl font-bold leading-tight">{content?.title}</h2>
            <p className="text-indigo-200 text-sm mt-1">{level} Level</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Intro */}
        <section>
          <p className="text-gray-600 italic text-lg border-l-4 border-indigo-200 pl-4">
            "{content?.intro}"
          </p>
        </section>

        {/* Theory */}
        <section className="space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-indigo-500" /> Grammar Rules
          </h3>
          <div className="bg-gray-50 p-5 rounded-2xl text-gray-700 leading-relaxed shadow-sm border border-gray-100">
             <MarkdownRenderer content={content?.theory} />
          </div>
        </section>

        {/* Examples */}
        <section className="space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Examples
          </h3>
          <div className="grid gap-3">
            {content?.examples.map((ex, i) => (
              <div key={i} className="bg-indigo-50 p-4 rounded-xl text-indigo-900 font-medium border-l-4 border-indigo-400">
                {ex}
              </div>
            ))}
          </div>
        </section>

        {/* Mini Quiz */}
        <section className="pt-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg mb-4">
            <Play className="w-5 h-5 text-green-500" /> Quick Practice
          </h3>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="font-medium text-lg mb-4">{content?.quiz.question}</p>
            <div className="space-y-2">
              {content?.quiz.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={quizState.selected !== null}
                  onClick={() => {
                    const isCorrect = idx === content?.quiz.correct;
                    setQuizState({ selected: idx, correct: isCorrect });
                    if (isCorrect) setTimeout(onComplete, 2000);
                  }}
                  className={`w-full p-4 text-left rounded-xl border transition-all
                    ${quizState.selected === null
                      ? 'border-gray-200 hover:bg-gray-50'
                      : idx === content?.quiz.correct
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : quizState.selected === idx
                          ? 'bg-red-50 border-red-500 text-red-800'
                          : 'opacity-50'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    {opt}
                    {quizState.selected === idx && idx === content?.quiz.correct && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {quizState.selected === idx && idx !== content?.quiz.correct && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                </button>
              ))}
            </div>
            {quizState.selected !== null && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm animate-fade-in">
                <strong>Explanation:</strong> {content?.quiz.explanation}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// 2. DAILY CHALLENGE MODAL
interface DailyChallengeProps {
  level: string;
  onClose: () => void;
  onComplete: () => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ level, onClose, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);

  // useCallback prevents re-creation of this function on every render
  const generateDailyQuestion = useCallback(async () => {
    setLoading(true);
    const prompt = `Tạo một câu hỏi trắc nghiệm ngữ pháp tiếng Anh duy nhất dành cho trình độ ${level}.
    Trả về định dạng JSON thuần túy không có markdown block:
    {
      "question": "Câu hỏi tiếng Anh...",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correct": 0 (index của đáp án đúng),
      "explanation": "Giải thích ngắn gọn tại sao đúng bằng tiếng Việt"
    }`;

    try {
      const text = await callGemini(prompt, "Bạn là một API JSON.");
      const cleanText = text.replace(/```json|```/g, '').trim();
      setQuestion(JSON.parse(cleanText));
    } catch (e) {
      console.error("Error generating daily question:", e);
      setQuestion({
        question: "She _____ to the market yesterday.",
        options: ["go", "went", "gone", "going"],
        correct: 1,
        explanation: "Yesterday là dấu hiệu của thì quá khứ đơn."
      });
    }
    setLoading(false);
  }, [level]);

  useEffect(() => {
    generateDailyQuestion();
  }, [generateDailyQuestion]);

  const handleCheck = (index: number) => {
    if (!question) return;
    setSelected(index);
    const isCorrect = index === question.correct;
    setResult(isCorrect);
    if (isCorrect) setTimeout(() => onComplete(), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Zap className="w-24 h-24" />
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2 relative z-10">
            Daily Warm-up
          </h2>
          <p className="text-indigo-100 mt-1 relative z-10">Khởi động ngày mới nào!</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
              <p className="text-gray-500">AI đang soạn bài tập...</p>
            </div>
          ) : question && (
            <>
              <p className="text-xl font-medium text-gray-800 mb-6 leading-relaxed">{question.question}</p>
              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => selected === null && handleCheck(idx)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200
                      ${selected === null
                        ? 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50'
                        : idx === question.correct
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : selected === idx
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-100 opacity-50'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{opt}</span>
                      {selected !== null && idx === question.correct && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                  </button>
                ))}
              </div>

              {result !== null && (
                <div className={`mt-6 p-4 rounded-xl ${result ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'} animate-fade-in`}>
                  <p className="font-bold text-lg mb-1">
                    {result ? 'Tuyệt vời! 🎉' : 'Chưa đúng rồi 😅'}
                  </p>
                  <p className="text-sm opacity-90">{question.explanation}</p>
                  {!result && (
                    <button
                      onClick={generateDailyQuestion}
                      className="mt-3 text-indigo-600 font-bold text-sm hover:underline"
                    >
                      Thử câu khác
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. LEVEL SELECTOR MODAL
interface LevelModalProps {
  currentLevel: string;
  onSelect: (lvl: string) => void;
  onClose: () => void;
}

const LevelModal: React.FC<LevelModalProps> = ({ currentLevel, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in-up">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Select Your Level</h3>
      <div className="space-y-3">
        {LEVELS.map(lvl => (
          <button
            key={lvl}
            onClick={() => onSelect(lvl)}
            className={`w-full p-4 rounded-xl font-bold flex justify-between items-center transition-all ${
              currentLevel === lvl
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {lvl}
            {currentLevel === lvl && <CheckCircle className="w-5 h-5" />}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-6 py-3 text-gray-500 font-semibold">Cancel</button>
    </div>
  </div>
);

// 4. CHAT TUTOR
interface ChatTutorProps {
  level: string;
}

const ChatTutor: React.FC<ChatTutorProps> = ({ level }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Hi! I'm your AI Tutor. I can explain any grammar rule or practice with you at **${level}** level. What shall we learn today?` }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTyping(true);

    const history = messages.map(m => `${m.role === 'user' ? 'Student' : 'Teacher'}: ${m.text}`).join('\n');
    const prompt = `
      History:
      ${history}
      Student: ${userMsg}

      You are an encouraging English teacher.
      - Level: ${level}
      - Format your response using basic Markdown: use **bold** for key terms, lists with "- ", and separate paragraphs clearly.
      - If explaining grammar, give an example.
      - If user mistakes, correct gently.
      - Answer in Vietnamese if asked in Vietnamese.
    `;

    try {
      const reply = await callGemini(prompt, "You are a helpful English tutor.");
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      console.error("Chat Error:", e);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I lost connection. Try again?" }]);
    }
    setTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
              ${m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
              }`}>
              {m.role === 'ai' ? <MarkdownRenderer content={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                <LoadingDots />
             </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button type="submit" className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

// 5. WRITING LAB
interface WritingLabProps {
  level: string;
}

const WritingLab: React.FC<WritingLabProps> = ({ level }) => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeText = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    const prompt = `Phân tích câu tiếng Anh này: "${text}".
    Trình độ: ${level}.
    Trả về JSON:
    {
      "corrected": "Câu đã sửa",
      "isCorrect": boolean,
      "analysis": "Phân tích ngữ pháp (Markdown support)",
      "betterWay": "Cách nói tự nhiên hơn"
    }`;

    try {
      const response = await callGemini(prompt, "Bạn là chuyên gia ngữ pháp trả về JSON.");
      const cleanJson = response.replace(/```json|```/g, '').trim();
      setAnalysis(JSON.parse(cleanJson));
    } catch (e) {
      console.error("Analysis Error:", e);
      setAnalysis({ isCorrect: false, corrected: "Error", analysis: "Lỗi kết nối." });
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl mb-4 border border-indigo-100">
        <h3 className="text-indigo-800 font-bold flex items-center gap-2 text-lg">
          <Edit3 className="w-5 h-5" /> AI Writing Lab
        </h3>
        <p className="text-sm text-indigo-600 mt-1 opacity-80">Paste your text, get instant feedback.</p>
      </div>

      <textarea
        className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 resize-none h-40 text-lg transition-all shadow-sm"
        placeholder="e.g. I have been lived here for 2 years..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>

      <button
        onClick={analyzeText}
        disabled={isAnalyzing || !text}
        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
      >
        {isAnalyzing ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        {isAnalyzing ? 'Analyzing...' : 'Check Grammar'}
      </button>

      {analysis && (
        <div className="animate-fade-in-up bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden mt-6">
          <div className={`p-4 ${analysis.isCorrect ? 'bg-green-500' : 'bg-amber-500'} text-white flex items-center gap-2`}>
             {analysis.isCorrect ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}
            <span className="font-bold text-lg">
              {analysis.isCorrect ? 'Perfect!' : 'Needs Improvement'}
            </span>
          </div>
          <div className="p-5 space-y-5">
            {!analysis.isCorrect && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Correction</p>
                <p className="text-xl text-green-600 font-semibold">{analysis.corrected}</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Analysis</p>
              <div className="text-gray-700 leading-relaxed text-sm">
                 <MarkdownRenderer content={analysis.analysis} />
              </div>
            </div>

            {analysis.betterWay && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Native Speaker Way</p>
                <p className="text-indigo-600 italic font-medium">"{analysis.betterWay}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [view, setView] = useState('home'); // home, learn, chat, profile, lesson
  const [level, setLevel] = useState('Beginner');
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(3);
  const [showDaily, setShowDaily] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  useEffect(() => {
    // Initial load simulation
    const timer = setTimeout(() => setShowDaily(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDailyComplete = () => {
    setXp(prev => prev + 50);
    setShowDaily(false);
  };

  const handleLevelSelect = (lvl: string) => {
    setLevel(lvl);
    setShowLevelModal(false);
  };

  const startLesson = (topic: Topic) => {
    setSelectedTopic(topic);
    setView('lesson');
  };

  const finishLesson = () => {
    setXp(prev => prev + 100);
    setView('home');
    setSelectedTopic(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans md:max-w-md md:mx-auto md:shadow-2xl md:border-x border-gray-200 relative overflow-hidden">

      {/* Global Header (Hidden in Lesson View for immersion) */}
      {view !== 'lesson' && (
        <div className="bg-white pt-10 pb-4 px-6 sticky top-0 z-10 border-b border-gray-100 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-indigo-200 shadow-md">G</div>
            <h1 className="font-bold text-xl text-gray-800 tracking-tight">GrammarFlow</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-full text-xs border border-orange-100">
              <Zap className="w-3 h-3 fill-orange-500" /> {streak}
            </div>
            <div className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-full text-xs border border-indigo-100">
              <Trophy className="w-3 h-3" /> {xp}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={view === 'lesson' ? '' : 'pb-24'}>

        {view === 'home' && (
          <div className="p-6 space-y-6 animate-fade-in">
            {/* Level Banner */}
            <div className="relative overflow-hidden bg-gray-900 text-white p-5 rounded-3xl shadow-xl shadow-gray-200">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="w-24 h-24"/></div>
               <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Current Level</p>
                    <h2 className="text-2xl font-bold tracking-tight">{level}</h2>
                  </div>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full text-xs font-bold transition-colors border border-gray-600"
                  >
                    Change
                  </button>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setView('writing')}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-95 group text-left"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Edit3 className="text-blue-600 w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800">Writing Lab</h3>
                <p className="text-xs text-gray-400 mt-1">Instant corrections</p>
              </button>

              <button
                 onClick={() => setView('chat')}
                 className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all active:scale-95 group text-left"
              >
                <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <MessageCircle className="text-purple-600 w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800">AI Tutor</h3>
                <p className="text-xs text-gray-400 mt-1">Chat & Practice</p>
              </button>
            </div>

            {/* Curriculum */}
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <Book className="w-5 h-5 text-indigo-600" /> Learning Path
              </h3>
              <div className="space-y-3">
                {TOPICS.map((topic, index) => (
                  <div
                    key={topic.id}
                    onClick={() => startLesson(topic)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group cursor-pointer hover:shadow-lg hover:border-indigo-100 transition-all transform hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl bg-gray-50 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">{topic.icon}</div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">{topic.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{topic.desc}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                       <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'writing' && (
          <div className="animate-fade-in">
             <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
                <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-800 text-sm font-bold flex items-center gap-1">
                   <ChevronLeft className="w-4 h-4" /> Home
                </button>
             </div>
             <WritingLab level={level} />
          </div>
        )}

        {view === 'chat' && (
          <div className="animate-fade-in bg-gray-50">
             <div className="p-4 border-b border-gray-100 bg-white shadow-sm sticky top-0 z-20">
                <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-800 text-sm font-bold flex items-center gap-1">
                   <ChevronLeft className="w-4 h-4" /> Home
                </button>
             </div>
             <ChatTutor level={level} />
          </div>
        )}

        {view === 'lesson' && selectedTopic && (
          <LessonView
            topic={selectedTopic}
            level={level}
            onBack={() => setView('home')}
            onComplete={finishLesson}
          />
        )}

        {view === 'profile' && (
          <div className="p-6 text-center animate-fade-in">
            <div className="w-28 h-28 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner">
              <GraduationCap className="w-14 h-14 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Student</h2>
            <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 mt-2 mb-8 uppercase tracking-wide">
              {level}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-gray-400 text-xs uppercase">Total XP</span>
                <span className="font-bold text-indigo-600 text-3xl">{xp}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full" style={{ width: `${Math.min(xp/10, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-right mt-2 text-gray-400 font-bold">1000 XP TO NEXT RANK</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <Zap className="w-6 h-6 text-orange-500 mb-2 mx-auto"/>
                  <p className="text-2xl font-bold text-orange-600">{streak}</p>
                  <p className="text-xs text-orange-400 font-bold">DAY STREAK</p>
               </div>
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <CheckCircle className="w-6 h-6 text-blue-500 mb-2 mx-auto"/>
                  <p className="text-2xl font-bold text-blue-600">12</p>
                  <p className="text-xs text-blue-400 font-bold">LESSONS DONE</p>
               </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation (Hidden in Lesson) */}
      {view !== 'lesson' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-2 pb-6 md:max-w-md md:mx-auto z-40">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setView('home')}
              className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Learn</span>
            </button>

            <button
              onClick={() => setView('writing')}
               className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'writing' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Edit3 className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Write</span>
            </button>

            <button
              onClick={() => setView('chat')}
               className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'chat' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Tutor</span>
            </button>

            <button
              onClick={() => setView('profile')}
              className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'profile' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Me</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDaily && <DailyChallenge level={level} onClose={() => setShowDaily(false)} onComplete={handleDailyComplete} />}
      {showLevelModal && <LevelModal currentLevel={level} onSelect={handleLevelSelect} onClose={() => setShowLevelModal(false)} />}

    </div>
  );
}