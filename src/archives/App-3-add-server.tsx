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
  Award,
  AlertTriangle
} from 'lucide-react';

// ==========================================
// CẤU HÌNH SERVER BACKEND
// ==========================================
const BACKEND_URL = "https://english-tutor-grammar-server.onrender.com";

/* GRAMMARFLOW - NEW VERSION (Renamed)
  ------------------------------
  Updates:
  - Renamed file to ensure visibility.
  - Full Backend Integration.
  - Vietnamese Localization.
  - Dynamic Theming.
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

interface ThemeConfig {
  id: string;
  primary: string;
  secondary: string;
  text: string;
  textLight: string;
  border: string;
  gradient: string;
  icon: string;
  button: string;
  ring: string;
  shadow: string;
  accent: string;
}

// --- MOCK DATA & CONSTANTS ---
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LESSON_CACHE: Record<string, LessonContent> = {};

const THEMES: Record<string, ThemeConfig> = {
  'Beginner': {
    id: 'Beginner',
    primary: 'bg-emerald-500',
    secondary: 'bg-emerald-50',
    text: 'text-emerald-700',
    textLight: 'text-emerald-600',
    border: 'border-emerald-100',
    gradient: 'from-emerald-400 to-teal-500',
    icon: 'text-emerald-500',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500',
    shadow: 'shadow-emerald-200',
    accent: 'text-emerald-600'
  },
  'Intermediate': {
    id: 'Intermediate',
    primary: 'bg-blue-600',
    secondary: 'bg-blue-50',
    text: 'text-blue-700',
    textLight: 'text-blue-600',
    border: 'border-blue-100',
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'text-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'focus:ring-blue-500',
    shadow: 'shadow-blue-200',
    accent: 'text-blue-600'
  },
  'Advanced': {
    id: 'Advanced',
    primary: 'bg-rose-600',
    secondary: 'bg-rose-50',
    text: 'text-rose-700',
    textLight: 'text-rose-600',
    border: 'border-rose-100',
    gradient: 'from-rose-500 to-orange-600',
    icon: 'text-rose-500',
    button: 'bg-rose-600 hover:bg-rose-700',
    ring: 'focus:ring-rose-500',
    shadow: 'shadow-rose-200',
    accent: 'text-rose-600'
  }
};

const TOPICS: Topic[] = [
  { id: 1, title: 'Present Tenses', icon: '☀️', desc: 'Thói quen hàng ngày & hành động hiện tại' },
  { id: 2, title: 'Past Tenses', icon: '⏳', desc: 'Lịch sử & kỷ niệm quá khứ' },
  { id: 3, title: 'Future Forms', icon: '🚀', desc: 'Kế hoạch & dự đoán tương lai' },
  { id: 4, title: 'Prepositions', icon: '📍', desc: 'Tư duy về thời gian & địa điểm (In, On, At)' },
  { id: 5, title: 'Articles', icon: '🍎', desc: 'Mạo từ xác định & không xác định (A, An, The)' },
  { id: 6, title: 'Passive Voice', icon: '🛡️', desc: 'Câu bị động - Nhấn mạnh vào hành động' },
  { id: 7, title: 'Conditionals', icon: '🔮', desc: 'Câu điều kiện (Loại 0, 1, 2, 3)' },
  { id: 8, title: 'Relative Clauses', icon: '🔗', desc: 'Mệnh đề quan hệ (Who, Which, That)' },
  { id: 9, title: 'Modal Verbs', icon: '🚦', desc: 'Động từ khuyết thiếu (Can, Should, Must)' },
  { id: 10, title: 'Phrasal Verbs', icon: '🔥', desc: 'Các cụm động từ thông dụng' },
];

const FALLBACK_QUIZ: QuizData = {
  question: "I _____ to music every day.",
  options: ["listen", "listening", "listens", "listened"],
  correct: 0,
  explanation: "Present Simple dùng cho thói quen hàng ngày."
};

// --- UTILS ---

// Fix: Added trailing comma <T,> to generic to avoid TSX parsing ambiguity
const safeJsonParse = <T,>(text: string): T | null => {
  if (!text) return null;
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    clean = clean.trim();
    return JSON.parse(clean) as T;
  } catch (error) {
    console.warn("JSON Parse Failed:", text);
    return null;
  }
};

interface MarkdownRendererProps {
  content?: string;
  className?: string;
  theme: ThemeConfig;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "", theme }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className={`space-y-2 ${className}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
           return (
             <div key={i} className="flex gap-2 ml-2">
               <span className={`${theme.icon} mt-1.5`}>•</span>
               <p className="flex-1" dangerouslySetInnerHTML={{
                 __html: line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               }} />
             </div>
           );
        }
        if (line.trim().startsWith('###')) {
            return <h4 key={i} className={`font-bold text-lg ${theme.text} mt-2`}>{line.replace(/###/g, '')}</h4>
        }
        return (
          <p key={i} dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }} />
        );
      })}
    </div>
  );
};

// --- AI SERVICE (PROXY) ---
const callGemini = async (prompt: string, systemInstruction: string = "", jsonMode: boolean = false): Promise<string> => {

  // Render Free Tier spin-up can take up to 50s, so we need patience
  const makeRequest = async (retryCount = 0): Promise<string> => {
    try {
      const controller = new AbortController();
      // Increase timeout for cold starts (60s)
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          jsonMode
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const data = await response.json();
      return data.text || "";

    } catch (error) {
      console.warn(`Attempt ${retryCount + 1} failed:`, error);
      if (retryCount < 2) {
        // Exponential backoff: 2s, 4s to give server time to wake up
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return makeRequest(retryCount + 1);
      }
      return "";
    }
  };

  return makeRequest();
};

const LoadingDots: React.FC<{ theme: ThemeConfig }> = ({ theme }) => (
  <div className="flex space-x-1 items-center p-2">
    <div className={`w-2 h-2 ${theme.primary} rounded-full animate-bounce opacity-60`} style={{ animationDelay: '0s' }}></div>
    <div className={`w-2 h-2 ${theme.primary} rounded-full animate-bounce opacity-60`} style={{ animationDelay: '0.1s' }}></div>
    <div className={`w-2 h-2 ${theme.primary} rounded-full animate-bounce opacity-60`} style={{ animationDelay: '0.2s' }}></div>
  </div>
);

// --- COMPONENTS ---

// 1. LESSON VIEW
interface LessonViewProps {
  topic: Topic;
  level: string;
  theme: ThemeConfig;
  onBack: () => void;
  onComplete: () => void;
}

const LessonView: React.FC<LessonViewProps> = ({ topic, level, theme, onBack, onComplete }) => {
  const [content, setContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<{ selected: number | null; correct: boolean }>({ selected: null, correct: false });

  const generateLesson = useCallback(async (retryCount = 0) => {
    const cacheKey = `${topic.id}-${level}`;
    if (LESSON_CACHE[cacheKey]) {
      setContent(LESSON_CACHE[cacheKey]);
      setLoading(false);
      return;
    }

    if (retryCount === 0) setLoading(true);
    setErrorType(null);

    const prompt = `
      Topic: "${topic.title}". Level: "${level}".
      Role: English Teacher for Vietnamese students.
      Task: Create a concise grammar lesson.

      Required JSON Structure (strict):
      {
        "title": "Title (English/Vietnamese)",
        "intro": "Why it is important (Vietnamese)",
        "theory": "Grammar rules (Vietnamese, markdown supported)",
        "examples": ["Ex 1 (Eng)", "Ex 2 (Eng)", "Ex 3 (Eng)"],
        "quiz": {
          "question": "Question (Eng)",
          "options": ["A", "B", "C"],
          "correct": 0,
          "explanation": "Explanation (Vietnamese)"
        }
      }
    `;

    try {
      const text = await callGemini(prompt, "", true);

      if (!text) {
        throw new Error("Empty response");
      }

      const data = safeJsonParse<LessonContent>(text);

      if (data && data.quiz && data.theory) {
        LESSON_CACHE[cacheKey] = data;
        setContent(data);
        setLoading(false);
      } else {
        throw new Error("Invalid Data Structure");
      }
    } catch (e) {
      if (retryCount < 2) {
        setTimeout(() => generateLesson(retryCount + 1), 1000);
      } else {
        setLoading(false);
        setErrorType("NET");
      }
    }
  }, [topic, level]);

  useEffect(() => {
    generateLesson();
  }, [generateLesson]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 bg-white pt-20">
      <RefreshCw className={`animate-spin w-10 h-10 ${theme.text}`} />
      <p className="text-gray-500 font-medium">Gia sư AI đang soạn bài giảng...</p>
      <p className="text-xs text-gray-400">(Có thể mất tới 1 phút nếu Server đang khởi động)</p>
    </div>
  );

  if (errorType) return (
    <div className="p-6 text-center pt-20 flex flex-col items-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-bold text-gray-800">
        Không thể kết nối Server
      </h3>
      <p className="text-gray-500 mb-6 px-4">
        Server Render miễn phí có thể đang quá tải hoặc đang khởi động. Vui lòng thử lại sau ít phút.
      </p>
      <div className="flex gap-4 mt-2">
        <button onClick={onBack} className="text-gray-600 font-semibold px-4 py-2">Quay lại</button>
        <button
          onClick={() => generateLesson(0)}
          className={`${theme.button} text-white font-bold px-6 py-2 rounded-xl shadow-lg ${theme.shadow}`}
        >
          Thử lại
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen pb-24 animate-fade-in">
      <div className={`${theme.primary} p-6 text-white rounded-b-[2rem] shadow-lg sticky top-0 z-10 transition-colors duration-500`}>
        <button onClick={onBack} className="flex items-center gap-1 opacity-90 hover:opacity-100 mb-4">
          <ChevronLeft className="w-5 h-5" /> Quay lại
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{topic.icon}</span>
          <div>
            <h2 className="text-2xl font-bold leading-tight">{content?.title}</h2>
            <p className="opacity-90 text-sm mt-1">Trình độ: {level}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <p className={`text-gray-600 italic text-lg border-l-4 pl-4 ${theme.border.replace('bg-', 'border-')}`} style={{ borderColor: 'currentColor' }}>
            "{content?.intro}"
          </p>
        </section>

        <section className="space-y-3">
          <h3 className={`font-bold flex items-center gap-2 text-lg ${theme.text}`}>
            <BookOpen className="w-5 h-5" /> Lý thuyết ngữ pháp
          </h3>
          <div className={`${theme.secondary} p-5 rounded-2xl text-gray-700 leading-relaxed shadow-sm border ${theme.border}`}>
             <MarkdownRenderer content={content?.theory} theme={theme} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className={`font-bold flex items-center gap-2 text-lg ${theme.text}`}>
            <Lightbulb className="w-5 h-5" /> Ví dụ minh họa
          </h3>
          <div className="grid gap-3">
            {content?.examples?.map((ex, i) => (
              <div key={i} className={`p-4 rounded-xl font-medium border-l-4 bg-gray-50 text-gray-700 border-gray-300`}>
                {ex}
              </div>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t border-gray-100">
          <h3 className={`font-bold flex items-center gap-2 text-lg mb-4 ${theme.text}`}>
            <Play className="w-5 h-5" /> Bài tập nhanh
          </h3>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="font-medium text-lg mb-4">{content?.quiz?.question}</p>
            <div className="space-y-2">
              {content?.quiz?.options.map((opt, idx) => (
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
                      ? `border-gray-200 hover:${theme.secondary}`
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
                <strong>Giải thích:</strong> {content?.quiz?.explanation}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// 2. DAILY CHALLENGE
interface DailyChallengeProps {
  level: string;
  theme: ThemeConfig;
  onClose: () => void;
  onComplete: () => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ level, theme, onClose, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);

  const generateDailyQuestion = useCallback(async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true);

    const prompt = `Level: ${level}. Create 1 Grammar MCQ.
    JSON Output: { "question": "Eng", "options": ["A","B","C","D"], "correct": 0, "explanation": "Vietnamese" }`;

    try {
      const text = await callGemini(prompt, "", true);
      if (!text) throw new Error("No response");

      const data = safeJsonParse<QuizData>(text);
      if (data && data.options) setQuestion(data);
      else throw new Error("Invalid");
    } catch (e) {
      if (retryCount < 2) {
        setTimeout(() => generateDailyQuestion(retryCount + 1), 1000);
        return;
      }
      setQuestion(FALLBACK_QUIZ);
    } finally {
      if (retryCount >= 2 || (question)) setLoading(false);
    }
    if (retryCount >= 2) setLoading(false);
  }, [level]);

  useEffect(() => {
    generateDailyQuestion();
  }, [generateDailyQuestion]);

  useEffect(() => {
    if (question) setLoading(false);
  }, [question]);

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
        <div className={`bg-gradient-to-br ${theme.gradient} p-8 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4 opacity-20"><Zap className="w-24 h-24" /></div>
          <h2 className="text-2xl font-bold flex items-center gap-2 relative z-10">Khởi động ngày mới</h2>
          <p className="opacity-90 mt-1 relative z-10">Làm nóng não bộ với một câu hỏi nhỏ nhé!</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <RefreshCw className={`animate-spin w-8 h-8 ${theme.text}`} />
              <p className="text-gray-500">Đang soạn câu hỏi...</p>
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
                        ? `border-gray-100 hover:${theme.border} hover:${theme.secondary}`
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
                  <p className="font-bold text-lg mb-1">{result ? 'Tuyệt vời! 🎉' : 'Chưa đúng rồi 😅'}</p>
                  <p className="text-sm opacity-90">{question.explanation}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. LEVEL SELECTOR
interface LevelModalProps {
  currentLevel: string;
  onSelect: (lvl: string) => void;
  onClose: () => void;
}

const LevelModal: React.FC<LevelModalProps> = ({ currentLevel, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in-up">
      <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Chọn trình độ</h3>
      <div className="space-y-4">
        {LEVELS.map(lvl => {
          const lvlTheme = THEMES[lvl];
          const isSelected = currentLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={() => onSelect(lvl)}
              className={`w-full p-4 rounded-2xl font-bold flex justify-between items-center transition-all border-2
                ${isSelected
                  ? `${lvlTheme.primary} text-white border-transparent shadow-lg ${lvlTheme.shadow}`
                  : `bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:bg-gray-50`
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-white' : lvlTheme.primary}`}></div>
                {lvl}
              </div>
              {isSelected && <CheckCircle className="w-5 h-5" />}
            </button>
          )
        })}
      </div>
      <button onClick={onClose} className="w-full mt-6 py-3 text-gray-500 font-semibold hover:text-gray-800">Hủy</button>
    </div>
  </div>
);

// 4. CHAT TUTOR
interface ChatTutorProps {
  level: string;
  theme: ThemeConfig;
}

const ChatTutor: React.FC<ChatTutorProps> = ({ level, theme }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Chào bạn! Mình là Gia sư AI. Mình có thể giải thích ngữ pháp hoặc luyện tập ở trình độ **${level}**. Hôm nay chúng ta học gì nào?` }
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
    const prompt = `History: ${history}\nStudent: ${userMsg}\nRole: Eng Tutor (Vietnamese context). Level: ${level}. Explain in Vietnamese, examples in English.`;

    const reply = await callGemini(prompt, "");

    setMessages(prev => [...prev, { role: 'ai', text: reply || "Lỗi kết nối Server." }]);
    setTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
              ${m.role === 'user'
                ? `${theme.primary} text-white rounded-br-none`
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
              }`}>
              {m.role === 'ai' ? <MarkdownRenderer content={m.text} theme={theme} /> : m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                <LoadingDots theme={theme} />
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
            placeholder="Hỏi bất cứ điều gì..."
            className={`flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
          />
          <button type="submit" className={`${theme.button} text-white p-3 rounded-full transition-colors shadow-lg ${theme.shadow}`}>
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
  theme: ThemeConfig;
}

const WritingLab: React.FC<WritingLabProps> = ({ level, theme }) => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeText = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    const prompt = `Analyze: "${text}". Level: ${level}. JSON Output: { "corrected": "string", "isCorrect": bool, "analysis": "Vietnamese", "betterWay": "string" }`;

    try {
      const response = await callGemini(prompt, "", true);
      if (!response) {
        throw new Error("No response from server");
      }
      const data = safeJsonParse<AnalysisResult>(response);
      if (data) setAnalysis(data);
      else throw new Error("Parse Error");
    } catch (e) {
      setAnalysis({
        isCorrect: false,
        corrected: "Lỗi kết nối",
        analysis: "Vui lòng kiểm tra lại server backend."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className={`bg-gradient-to-r ${theme.gradient} p-6 rounded-2xl mb-4 shadow-lg text-white`}>
        <h3 className="font-bold flex items-center gap-2 text-lg"><Edit3 className="w-5 h-5" /> Phòng Lab Viết</h3>
        <p className="text-sm opacity-90 mt-1">AI sẽ sửa lỗi và giải thích chi tiết cho bạn.</p>
      </div>

      <textarea
        className={`w-full p-4 rounded-2xl border-2 border-gray-200 ${theme.ring} focus:ring-2 focus:outline-none resize-none h-40 text-lg transition-all shadow-sm`}
        placeholder="Ví dụ: I have been lived here for 2 years..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>

      <button
        onClick={analyzeText}
        disabled={isAnalyzing || !text}
        className={`w-full ${theme.button} text-white py-4 rounded-xl font-bold shadow-lg ${theme.shadow} active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none`}
      >
        {isAnalyzing ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        {isAnalyzing ? 'Đang phân tích...' : 'Kiểm tra ngữ pháp'}
      </button>

      {analysis && (
        <div className="animate-fade-in-up bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden mt-6">
          <div className={`p-4 ${analysis.isCorrect ? 'bg-green-500' : 'bg-amber-500'} text-white flex items-center gap-2`}>
             {analysis.isCorrect ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}
            <span className="font-bold text-lg">{analysis.isCorrect ? 'Tuyệt vời!' : 'Cần cải thiện'}</span>
          </div>
          <div className="p-5 space-y-5">
            {!analysis.isCorrect && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Sửa lỗi</p>
                <p className="text-xl text-green-600 font-semibold">{analysis.corrected}</p>
              </div>
            )}

            <div className={`${theme.secondary} p-4 rounded-xl border ${theme.border}`}>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Phân tích chi tiết</p>
              <div className="text-gray-700 leading-relaxed text-sm">
                 <MarkdownRenderer content={analysis.analysis} theme={theme} />
              </div>
            </div>

            {analysis.betterWay && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Cách nói tự nhiên hơn</p>
                <p className={`${theme.text} italic font-medium`}>"{analysis.betterWay}"</p>
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
  const [view, setView] = useState('home');
  const [level, setLevel] = useState('Beginner');
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(3);
  const [showDaily, setShowDaily] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const currentTheme = THEMES[level];

  useEffect(() => {
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
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans md:max-w-md md:mx-auto md:shadow-2xl md:border-x border-gray-200 relative overflow-hidden transition-colors duration-500">

      {view !== 'lesson' && (
        <div className="bg-white pt-10 pb-4 px-6 sticky top-0 z-10 border-b border-gray-100 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${currentTheme.primary} rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md`}>G</div>
            <h1 className="font-bold text-xl text-gray-800 tracking-tight">GrammarFlow</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-full text-xs border border-orange-100">
              <Zap className="w-3 h-3 fill-orange-500" /> {streak}
            </div>
            <div className={`flex items-center gap-1 ${currentTheme.text} font-bold ${currentTheme.secondary} px-2 py-1 rounded-full text-xs border ${currentTheme.border}`}>
              <Trophy className="w-3 h-3" /> {xp}
            </div>
          </div>
        </div>
      )}

      <div className={view === 'lesson' ? '' : 'pb-24'}>

        {view === 'home' && (
          <div className="p-6 space-y-6 animate-fade-in">
            {/* Level Banner - Uses Theme Gradient */}
            <div className={`relative overflow-hidden bg-gradient-to-r ${currentTheme.gradient} text-white p-5 rounded-3xl shadow-xl shadow-gray-200`}>
               <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="w-24 h-24"/></div>
               <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="opacity-90 text-[10px] font-bold uppercase tracking-widest mb-1">Trình độ hiện tại</p>
                    <h2 className="text-2xl font-bold tracking-tight">{level}</h2>
                  </div>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold transition-colors border border-white/30"
                  >
                    Thay đổi
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setView('writing')}
                className={`bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:${currentTheme.border} hover:shadow-md transition-all active:scale-95 group text-left`}
              >
                <div className={`w-10 h-10 ${currentTheme.secondary} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Edit3 className={`${currentTheme.text} w-5 h-5`} />
                </div>
                <h3 className="font-bold text-gray-800">Phòng Lab Viết</h3>
                <p className="text-xs text-gray-400 mt-1">Sửa lỗi tức thì</p>
              </button>

              <button
                 onClick={() => setView('chat')}
                 className={`bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:${currentTheme.border} hover:shadow-md transition-all active:scale-95 group text-left`}
              >
                <div className={`w-10 h-10 ${currentTheme.secondary} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <MessageCircle className={`${currentTheme.text} w-5 h-5`} />
                </div>
                <h3 className="font-bold text-gray-800">Gia sư AI</h3>
                <p className="text-xs text-gray-400 mt-1">Hỏi đáp & Luyện tập</p>
              </button>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <Book className={`w-5 h-5 ${currentTheme.text}`} /> Lộ trình học tập
              </h3>
              <div className="space-y-3">
                {TOPICS.map((topic, index) => (
                  <div
                    key={topic.id}
                    onClick={() => startLesson(topic)}
                    className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group cursor-pointer hover:shadow-lg hover:${currentTheme.border} transition-all transform hover:-translate-y-1`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl ${currentTheme.secondary} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors`}>{topic.icon}</div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">{topic.title}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{topic.desc}</p>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:${currentTheme.primary} group-hover:text-white transition-all`}>
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
                   <ChevronLeft className="w-4 h-4" /> Trang chủ
                </button>
             </div>
             <WritingLab level={level} theme={currentTheme} />
          </div>
        )}

        {view === 'chat' && (
          <div className="animate-fade-in bg-gray-50">
             <div className="p-4 border-b border-gray-100 bg-white shadow-sm sticky top-0 z-20">
                <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-800 text-sm font-bold flex items-center gap-1">
                   <ChevronLeft className="w-4 h-4" /> Trang chủ
                </button>
             </div>
             <ChatTutor level={level} theme={currentTheme} />
          </div>
        )}

        {view === 'lesson' && selectedTopic && (
          <LessonView
            topic={selectedTopic}
            level={level}
            theme={currentTheme}
            onBack={() => setView('home')}
            onComplete={finishLesson}
          />
        )}

        {view === 'profile' && (
          <div className="p-6 text-center animate-fade-in">
            <div className={`w-28 h-28 ${currentTheme.secondary} rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner`}>
              <GraduationCap className={`w-14 h-14 ${currentTheme.text}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Học viên</h2>
            <div className={`inline-block ${currentTheme.secondary} px-3 py-1 rounded-full text-xs font-bold ${currentTheme.text} mt-2 mb-8 uppercase tracking-wide`}>
              {level}
            </div>

            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${currentTheme.border} mb-6`}>
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-gray-400 text-xs uppercase">Tổng XP</span>
                <span className={`font-bold ${currentTheme.text} text-3xl`}>{xp}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className={`bg-gradient-to-r ${currentTheme.gradient} h-3 rounded-full`} style={{ width: `${Math.min(xp/10, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-right mt-2 text-gray-400 font-bold">CẦN 1000 XP ĐỂ THĂNG HẠNG</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <Zap className="w-6 h-6 text-orange-500 mb-2 mx-auto"/>
                  <p className="text-2xl font-bold text-orange-600">{streak}</p>
                  <p className="text-xs text-orange-400 font-bold">CHUỖI NGÀY</p>
               </div>
               <div className={`${currentTheme.secondary} p-4 rounded-2xl border ${currentTheme.border}`}>
                  <CheckCircle className={`w-6 h-6 ${currentTheme.text} mb-2 mx-auto`}/>
                  <p className={`text-2xl font-bold ${currentTheme.textLight}`}>12</p>
                  <p className={`text-xs ${currentTheme.text} opacity-70 font-bold`}>BÀI ĐÃ HỌC</p>
               </div>
            </div>
          </div>
        )}

      </div>

      {view !== 'lesson' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-2 pb-6 md:max-w-md md:mx-auto z-40">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setView('home')}
              className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'home' ? `${currentTheme.text} ${currentTheme.secondary}` : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Học</span>
            </button>

            <button
              onClick={() => setView('writing')}
               className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'writing' ? `${currentTheme.text} ${currentTheme.secondary}` : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Edit3 className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Viết</span>
            </button>

            <button
              onClick={() => setView('chat')}
               className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'chat' ? `${currentTheme.text} ${currentTheme.secondary}` : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Gia sư</span>
            </button>

            <button
              onClick={() => setView('profile')}
              className={`flex flex-col items-center p-2 rounded-2xl transition-all w-16 ${view === 'profile' ? `${currentTheme.text} ${currentTheme.secondary}` : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Tôi</span>
            </button>
          </div>
        </div>
      )}

      {showDaily && <DailyChallenge level={level} theme={currentTheme} onClose={() => setShowDaily(false)} onComplete={handleDailyComplete} />}
      {showLevelModal && <LevelModal currentLevel={level} onSelect={(lvl) => { setLevel(lvl); setShowLevelModal(false); }} onClose={() => setShowLevelModal(false)} />}

    </div>
  );
}