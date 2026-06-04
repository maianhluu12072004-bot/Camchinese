import React, { useState, useEffect, useRef } from 'react';
const [lang, setLang] = useState('vi');

const t = {
  vi: {
    dashboard: "Tổng quan",
    lesson: "Kho bài học",
    test: "Kiểm tra",
    admin: "Quản trị",
    search: "Tìm kiếm..."
  },
  zh: {
    dashboard: "总览",
    lesson: "课程库",
    test: "测试",
    admin: "管理",
    search: "搜索..."
  }
};
<button
  onClick={() => setLang(lang === 'vi' ? 'zh' : 'vi')}
  className="bg-gray-100 px-3 py-1 rounded-xl text-xs font-bold"
>
  {lang === 'vi' ? 'VI' : '中文'}
</button>
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Plus, 
  Compass, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  User, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Lock, 
  Unlock, 
  Info, 
  Clock, 
  BookMarked,
  Layers,
  X,
  Check
} from 'lucide-react';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'cam-chinese-lms-v1';
let firebaseApp, auth, db;
let isFirebaseConfigured = false;

// Attempt to load the global Firebase configurations if available
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    const firebaseConfig = JSON.parse(__firebase_config);
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    isFirebaseConfigured = true;
  } catch (e) {
    console.error("Firebase config initialization failed, falling back to local memory storage.", e);
  }
}

// Built-in Seed Lessons so the LMS is highly functional on the very first load
const initialSeedLessons = [
  {
    id: 'l1',
    type: 'vocab',
    title: '雨后春笋 (Vũ hậu xuân tẫn)',
    emoji: '🎋',
    tag: 'Măng xuân sau mưa',
    explain: 'Người Trung Quốc liên tưởng măng xuân trồi lên cực nhanh sau mưa bão để biểu trưng cho các hiện tượng, sự vật mới mọc lên rầm rộ, tấp nập.',
    level: 'HSK 3 - 4',
    author: 'Hệ thống'
  },
  {
    id: 'l2',
    type: 'vocab',
    title: '气壮如牛 (Khí tráng như ngưu)',
    emoji: '🐂',
    tag: 'Khí thế như trâu',
    explain: 'Trong văn hóa nông nghiệp lúa nước của người Hán vùng Trung Nguyên, con trâu/bò tượng trưng cho sức dẻo dai và dũng khí tràn trề tuyệt đối.',
    level: 'HSK 4',
    author: 'Hệ thống'
  },
  {
    id: 'l3',
    type: 'grammar',
    title: 'Bổ ngữ xu hướng phức hợp (复合趋向补语)',
    emoji: '🧭',
    tag: 'Đối chiếu vị trí Tân ngữ chỉ nơi chốn',
    explain: 'Khi có tân ngữ chỉ nơi chốn đi kèm, bắt buộc phải đặt tân ngữ kẹp vào giữa cấu trúc bổ ngữ xu hướng. Ví dụ: "走进 [教室] 来" chứ không được dịch thô là "走进来教室".',
    level: 'HSK 3',
    author: 'Hệ thống'
  },
  {
    id: 'l4',
    type: 'culture',
    title: 'Ẩn dụ "Ăn cơm" trong giao tế',
    emoji: '🍚',
    tag: 'Văn hóa lúa nước mộc mạc',
    explain: 'Câu cửa miệng "你吃饭了吗？" (Bạn ăn cơm chưa?) của người Trung Quốc và Việt Nam phản ánh chiều sâu tư duy của cư dân nông nghiệp coi trọng hạt gạo như đầu câu chuyện xã giao.',
    level: 'Văn hóa',
    author: 'Hệ thống'
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Custom interactive level test states
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState({ cognitive: 0, literal: 0 });
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Admin access & CMS creation states
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newLesson, setNewLesson] = useState({
    title: '',
    type: 'vocab',
    emoji: '🍊',
    tag: '',
    explain: '',
    level: 'HSK 3'
  });

  // Modal notification system (Replaces browser alert)
  const [notification, setNotification] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    // Phase 1: Establish Authentication flow (Dynamic token vs Anonymous fallback)
    if (isFirebaseConfigured) {
      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Anonymous authentication error:", error);
          // Auto-fallback to local guest model on network/auth error
          setUser({ uid: 'local_guest_user', isAnonymous: true, displayName: 'Học viên CAM 🍊' });
        }
      };
      initAuth();
      const unsubscribe = onAuthStateChanged(auth, (loggedUser) => {
        if (loggedUser) {
          setUser(loggedUser);
        }
      });
      return () => unsubscribe();
    } else {
      // Offline mode user generation
      setUser({ uid: 'local_guest_user', isAnonymous: true, displayName: 'Học viên Ngoại tuyến 🍊' });
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && user) {
      // Bind to live cloud collection
      const lessonsRef = collection(db, 'artifacts', appId, 'public', 'data', 'lessons');
      const unsubscribeLessons = onSnapshot(lessonsRef, (snapshot) => {
        const fetched = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        
        if (fetched.length === 0) {
          // If Firestore is empty, seed it with default lessons so first-time users have data
          initialSeedLessons.forEach(async (lesson) => {
            const docId = lesson.id;
            const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'lessons', docId);
            await setDoc(itemRef, lesson);
          });
          setLessons(initialSeedLessons);
        } else {
          setLessons(fetched);
        }
      }, (error) => {
        console.error("Firestore loading error:", error);
        triggerNotification("Có lỗi khi kết nối Đám mây. Đã chuyển sang dữ liệu nội bộ.", "error");
        loadLocalLessons();
      });

      return () => unsubscribeLessons();
    } else {
      loadLocalLessons();
    }
  }, [user]);

  // Load from LocalStorage if firebase is offline or fallback is needed
  const loadLocalLessons = () => {
    const saved = localStorage.getItem('cam_chinese_lessons');
    if (saved) {
      setLessons(JSON.parse(saved));
    } else {
      setLessons(initialSeedLessons);
      localStorage.setItem('cam_chinese_lessons', JSON.stringify(initialSeedLessons));
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title || !newLesson.tag || !newLesson.explain) {
      triggerNotification("Vui lòng điền đầy đủ thông tin bài học mới!", "error");
      return;
    }

    const lessonPayload = {
      ...newLesson,
      createdAt: new Date().toISOString(),
      author: 'Giáo viên quản trị'
    };

    if (isFirebaseConfigured && db) {
      try {
        const lessonsRef = collection(db, 'artifacts', appId, 'public', 'data', 'lessons');
        await addDoc(lessonsRef, lessonPayload);
        triggerNotification("Đã đăng tải bài học mới lên Đám mây thành công! 🍊");
      } catch (err) {
        console.error("Cloud insert error:", err);
        saveLessonLocally(lessonPayload);
      }
    } else {
      saveLessonLocally(lessonPayload);
    }

    // Reset CMS Form state
    setNewLesson({
      title: '',
      type: 'vocab',
      emoji: '🍊',
      tag: '',
      explain: '',
      level: 'HSK 3'
    });
  };

  const saveLessonLocally = (payload) => {
    const freshLesson = { id: 'l_' + Date.now(), ...payload };
    const updated = [...lessons, freshLesson];
    setLessons(updated);
    localStorage.setItem('cam_chinese_lessons', JSON.stringify(updated));
    triggerNotification("Đã lưu bài học thành công vào hệ thống dữ liệu cục bộ! 🍊");
  };

  const handleDeleteLesson = async (id) => {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'lessons', id);
        await deleteDoc(docRef);
        triggerNotification("Đã gỡ bỏ bài học khỏi hệ thống Đám mây.");
      } catch (err) {
        console.error("Cloud delete error:", err);
        deleteLessonLocally(id);
      }
    } else {
      deleteLessonLocally(id);
    }
  };

  const deleteLessonLocally = (id) => {
    const filtered = lessons.filter(item => item.id !== id);
    setLessons(filtered);
    localStorage.setItem('cam_chinese_lessons', JSON.stringify(filtered));
    triggerNotification("Đã gỡ bỏ bài học thành công.");
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    // Default system master key is "orange2026"
    if (adminCodeInput === 'orange2026') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      triggerNotification("Xin chào Quản trị viên! Đã mở khóa Admin Studio.", "success");
    } else {
      triggerNotification("Mã truy cập không hợp lệ. Vui lòng thử lại!", "error");
    }
  };

  const quizQuestions = [
    {
      q: "Khi muốn diễn tả một sự việc mới mọc lên tấp nập, phát triển cực nhanh, bạn chọn tư duy nào?",
      a: "Tư duy tri nhận bản xứ: '雨后春笋' (Măng xuân mọc sau mưa - liên kết biểu tượng nông nghiệp vùng Trung Nguyên).",
      b: "Tư duy dịch từ tiếng Việt: 'Cơm bữa / nấm mọc sau mưa' và dịch trực tiếp sang chữ Hán ghép từ tương đương.",
      weightA: 'cognitive',
      weightB: 'literal'
    },
    {
      q: "Cấu trúc bổ ngữ xu hướng phức hợp 'Mang quyển sách vào trong lớp học' sẽ được sắp xếp thế nào?",
      a: "Trình tự tri nhận chuẩn: '把书拿进 [教室] 来' (Tân ngữ vị trí '教室' phải kẹp ở giữa hai động từ xu hướng).",
      b: "Trình tự dịch thô: '把书拿进来教室' (Dịch từng chữ trực tiếp từ ngữ pháp tiếng Việt sang).",
      weightA: 'cognitive',
      weightB: 'literal'
    },
    {
      q: "Trong tư duy ngôn ngữ Hán, vì sao khí dũng dũng mãnh lại được so sánh là '气壮如牛' (Khí thế dũng mãnh như trâu) chứ không phải là hổ hay voi?",
      a: "Do biểu trưng văn hóa của vùng đồng bằng trung tâm sông Hoàng Hà coi con Trâu/Bò kéo cày là cội nguồn của sức lực vô địch.",
      b: "Chỉ là một sự lựa chọn so sánh ngẫu nhiên không mang dấu ấn địa lý hay văn hóa đặc thù nào.",
      weightA: 'cognitive',
      weightB: 'literal'
    }
  ];

  const handleQuizAnswer = (selectedOption) => {
    const currentQ = quizQuestions[quizStep];
    const updatedScores = { ...quizScores };

    if (selectedOption === 'A') {
      updatedScores[currentQ.weightA] += 34;
    } else {
      updatedScores[currentQ.weightB] += 34;
    }

    setQuizScores(updatedScores);

    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      setQuizCompleted(true);
      // If user scores high on cognitive, reward them
      if (updatedScores.cognitive > 60) {
        triggerNotification("Tuyệt vời! Bạn có chỉ số tư duy tri nhận rất nhạy bén! 🏆");
      }
    }
  };

  const restartQuiz = () => {
    setQuizStep(0);
    setQuizScores({ cognitive: 0, literal: 0 });
    setQuizCompleted(false);
  };

  // Toggle card flips for vocab flashcards
  const toggleCardFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lesson.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lesson.explain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || lesson.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-800 font-sans flex flex-col selection:bg-orange-100 selection:text-orange-600">
      
      {/* Custom Global Alert System */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border transition-all duration-300 transform translate-y-0 animate-bounce ${
          notification.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-orange-100 relative overflow-hidden">
              🍊
              <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-bl-full"></div>
            </div>
            <div>
              <span className="font-comfortaa font-bold text-lg tracking-wide text-orange-600 block leading-tight">CAM Chinese</span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Hệ thống Học tập Tri nhận Động</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-orange-50/50 p-1.5 rounded-2xl border border-orange-100/50">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'dashboard' ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50/50'
              }`}
            >
              <Compass className="w-4 h-4" /> Tổng quan
            </button>
            <button 
              onClick={() => setActiveTab('curriculum')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'curriculum' ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50/50'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Kho Bài Học
            </button>
            <button 
              onClick={() => setActiveTab('leveltest')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'leveltest' ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50/50'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Kiểm Tra Tri Nhận
            </button>
          </nav>

          {/* User Status / Admin Gate */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button 
                onClick={() => setActiveTab('admin')} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-100 transition-all"
              >
                <Unlock className="w-3.5 h-3.5" /> Admin Studio
              </button>
            ) : (
              <button 
                onClick={() => setShowAdminLogin(true)} 
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-orange-400" /> Dành cho Giáo viên
              </button>
            )}
          </div>
        </div>
      </header>

      {}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-orange-100 relative animate-fade-in">
            <button 
              onClick={() => setShowAdminLogin(false)} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-slate-50"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-comfortaa font-bold text-xl text-gray-900">Kích hoạt Admin Studio</h3>
              <p className="text-xs text-gray-500 mt-1">Sử dụng tài khoản Quản trị viên để bổ sung hoặc điều chỉnh nội dung học tập thời gian thực.</p>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Mã xác nhận quản trị</label>
                <input 
                  type="password" 
                  value={adminCodeInput}
                  onChange={(e) => setAdminCodeInput(e.target.value)}
                  placeholder="Gợi ý: orange2026" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-100 transition-all"
              >
                Xác thực & Mở Khóa
              </button>
            </form>
          </div>
        </div>
      )}

      {}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8">
        
        {/* ==================================== TAB 1: DASHBOARD ==================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Hero Welcome banner */}
            <section className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl shadow-orange-100">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-radial pointer-events-none"></div>
              <div className="max-w-xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-200" /> Bản phát hành động v1.2
                </div>
                <h1 className="font-comfortaa font-bold text-4xl md:text-5xl leading-tight">
                  Tư duy như người bản xứ.
                </h1>
                <p className="text-sm md:text-base text-white/95 font-medium leading-relaxed">
                  Học tiếng Trung qua lăng kính Ngôn ngữ học Tri nhận. Loại bỏ hoàn toàn lỗi giao thoa dịch thô ngữ pháp bằng phương thức tương quan văn hóa và bài học động cập nhật tức thời.
                </p>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab('curriculum')} 
                    className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                  >
                    Vào kho bài học <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('leveltest')} 
                    className="bg-orange-600/50 hover:bg-orange-600 text-white border border-white/20 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all"
                  >
                    Làm bài Test Tri Nhận
                  </button>
                </div>
              </div>

              {/* Decorative Mascot */}
              <div className="hidden md:flex absolute right-12 bottom-4 w-48 h-48 bg-white/10 rounded-[40%] flex-col items-center justify-center animate-pulse border border-white/20">
                <span className="text-6xl select-none">🍊</span>
                <span className="text-xs font-comfortaa font-bold mt-2">大家好 !</span>
              </div>
            </section>

            {/* Quick Metrics & System Information */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                  <BookMarked className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase">Tổng quan kho học liệu</span>
                  <p className="text-2xl font-bold mt-1 text-gray-900">{lessons.length} bài học động</p>
                  <span className="text-[11px] text-gray-500 block mt-0.5">Tự động kết nối &amp; Cập nhật liên tục</span>
                </div>
              </div>

              <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase">Trạng thái dữ liệu</span>
                  <p className="text-lg font-bold mt-1 text-gray-900">
                    {isFirebaseConfigured ? 'Đang kết nối Đám mây ☁️' : 'Bộ nhớ cục bộ ổn định'}
                  </p>
                  <span className="text-[11px] text-gray-500 block mt-0.5">Bảo toàn dữ liệu học viên 100%</span>
                </div>
              </div>

              <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-700">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase">Định dạng vai trò</span>
                  <p className="text-lg font-bold mt-1 text-gray-950">
                    {isAdmin ? 'Giáo viên (Admin)' : 'Học viên (Hội viên)'}
                  </p>
                  <span className="text-[11px] text-gray-500 block mt-0.5">Truy cập mọi lúc mọi nơi</span>
                </div>
              </div>

            </section>

            {/* Featured Section: Preview of recent topics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Handpicked Lessons Preview */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-comfortaa font-bold text-xl text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-orange-500 rounded-full block"></span>
                    Tiêu điểm bài học Tri Nhận mới
                  </h3>
                  <button 
                    onClick={() => setActiveTab('curriculum')} 
                    className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                  >
                    Xem tất cả ({lessons.length}) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.slice(0, 4).map((lesson) => (
                    <div 
                      key={lesson.id} 
                      onClick={() => {
                        setActiveTab('curriculum');
                        setFilterType(lesson.type);
                      }}
                      className="bg-white border border-orange-100 rounded-2xl p-5 hover:border-orange-300 transition-all cursor-pointer hover:shadow-lg shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform">{lesson.emoji}</span>
                        <div>
                          <span className="text-[9px] bg-orange-100 text-orange-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {lesson.type === 'vocab' ? 'Từ vựng' : lesson.type === 'grammar' ? 'Ngữ pháp' : 'Văn hóa'}
                          </span>
                          <h4 className="font-bold text-gray-900 mt-1 line-clamp-1">{lesson.title}</h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed">{lesson.explain}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Educational Philosophy card */}
              <div className="lg:col-span-4 bg-gradient-to-b from-[#FFF2E6] to-white border border-orange-100 rounded-[32px] p-6 space-y-4 shadow-sm">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="font-comfortaa font-bold text-lg text-gray-900">Tại sao lại là CAM?</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  **Cognitive Metaphor (Ẩn dụ Tri nhận)** là phương thức kết nối các trải nghiệm sống cốt lõi của người bản địa vào hệ thống ngôn từ. 
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bằng cách học theo gốc rễ tư duy, bạn sẽ hiểu rõ tại sao họ dùng từ như vậy, từ đó nhớ lâu hơn và biểu đạt chuẩn xác hơn.
                </p>
                <div className="border-t border-orange-200/50 pt-4">
                  <span className="text-[10px] text-orange-600 font-extrabold uppercase block mb-1">Mã lớp hiện tại</span>
                  <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-bold">{appId}</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================================== TAB 2: CURRICULUM (KHO BÀI HỌC) ==================================== */}
        {activeTab === 'curriculum' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Search and Filters Header bar */}
            <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                <div>
                  <h2 className="font-comfortaa font-bold text-2xl text-gray-900">Kho Học Liệu Thực Tế</h2>
                  <p className="text-xs text-gray-500 mt-1">Sử dụng thanh tìm kiếm và bộ lọc để lựa chọn chủ đề bạn muốn rèn luyện hôm nay.</p>
                </div>
                
                {/* Search input bar */}
                <div className="relative w-full md:w-80">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm thành ngữ, ngữ pháp..." 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Filter Tabs & Quick Selector */}
              <div className="flex flex-wrap items-center gap-2 border-t border-orange-50 pt-4">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === 'all' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70'
                  }`}
                >
                  Tất cả ({lessons.length})
                </button>
                <button 
                  onClick={() => setFilterType('vocab')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === 'vocab' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70'
                  }`}
                >
                  Từ vựng &amp; Thành ngữ
                </button>
                <button 
                  onClick={() => setFilterType('grammar')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === 'grammar' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70'
                  }`}
                >
                  Ngữ pháp đối chiếu
                </button>
                <button 
                  onClick={() => setFilterType('culture')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === 'culture' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70'
                  }`}
                >
                  Văn hóa tri nhận
                </button>
              </div>
            </div>

            {/* Dynamic Results Display */}
            {filteredLessons.length === 0 ? (
              <div className="bg-white border border-dashed border-orange-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
                <div className="text-5xl">🔍</div>
                <h4 className="font-comfortaa font-bold text-gray-800">Không tìm thấy bài học phù hợp</h4>
                <p className="text-xs text-gray-500">Hãy thử nhập từ khóa khác, hoặc Giáo viên có thể tự thêm học liệu mới thông qua Admin Studio!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLessons.map((lesson) => {
                  const isFlipped = flippedCards[lesson.id];
                  return (
                    <div 
                      key={lesson.id} 
                      className="h-80 perspective cursor-pointer"
                      onClick={() => toggleCardFlip(lesson.id)}
                    >
                      {/* 3D Flashcard inner wrap */}
                      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                        isFlipped ? 'rotate-y-180' : ''
                      }`}>
                        
                        {/* Front Side of Card */}
                        <div className="absolute inset-0 bg-white border-2 border-orange-100 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:border-orange-300 backface-hidden">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-4xl p-2 bg-orange-50 rounded-2xl block">{lesson.emoji}</span>
                              <span className="text-[10px] bg-orange-100 text-orange-700 font-extrabold px-2.5 py-1 rounded-full uppercase">
                                {lesson.level}
                              </span>
                            </div>
                            <h3 className="font-comfortaa font-bold text-lg text-gray-900 mt-4">{lesson.title}</h3>
                            <p className="text-xs font-bold text-orange-600 bg-orange-50/50 inline-block px-3 py-1 rounded-lg mt-2">
                              {lesson.tag}
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-orange-50 pt-4">
                            <span>Sản xuất bởi: {lesson.author || 'CAM Chinese'}</span>
                            <span className="font-bold text-orange-400 uppercase tracking-wider group-hover:underline">Bấm để lật xem nghĩa 🔄</span>
                          </div>
                        </div>

                        {/* Back Side of Card */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-6 flex flex-col justify-between rotate-y-180 backface-hidden shadow-lg shadow-orange-100">
                          <div>
                            <span className="text-[10px] bg-white/20 uppercase tracking-widest font-extrabold px-3 py-1 rounded-full inline-block">
                              Góc phân tích Tri Nhận
                            </span>
                            <h4 className="font-comfortaa font-bold text-lg mt-3 text-yellow-200">Bản chất ý niệm:</h4>
                            <p className="text-xs leading-relaxed mt-2 text-white/95 font-medium">
                              {lesson.explain}
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-white/80 border-t border-white/20 pt-4">
                            <span>Mã lực học: {lesson.id}</span>
                            <span className="font-bold uppercase tracking-wider">Xem lại mặt trước 🔄</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ==================================== TAB 3: LEVEL TEST (KIỂM TRA TRI NHẬN) ==================================== */}
        {activeTab === 'leveltest' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            
            <div className="text-center space-y-3">
              <span className="text-xs bg-orange-100 text-orange-700 font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest">
                Đánh giá phong cách học tập
              </span>
              <h2 className="font-comfortaa font-bold text-3xl text-gray-900">Cognitive Alignment Quiz</h2>
              <p className="text-xs text-gray-500 max-w-lg mx-auto">
                Khám phá xem bạn đang học tiếng Trung bằng cách ghép nối chữ trực tiếp (Interlanguage) hay đã liên kết thành công với mạng lưới tư duy người bản xứ.
              </p>
            </div>

            {!quizCompleted ? (
              <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 md:p-8 shadow-sm">
                
                {/* Steps tracker line */}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">
                    Câu hỏi {quizStep + 1} / {quizQuestions.length}
                  </span>
                  <div className="flex gap-1.5">
                    {quizQuestions.map((_, idx) => (
                      <span 
                        key={idx} 
                        className={`w-8 h-1.5 rounded-full transition-all ${
                          idx === quizStep ? 'bg-orange-500' : idx < quizStep ? 'bg-emerald-400' : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-base md:text-lg text-gray-900 leading-relaxed">
                    {quizQuestions[quizStep].q}
                  </h3>

                  {/* Choice Buttons */}
                  <div className="space-y-3 pt-2">
                    <button 
                      onClick={() => handleQuizAnswer('A')}
                      className="w-full text-left p-4 rounded-2xl bg-orange-50/20 border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50/50 transition-all text-xs font-semibold flex items-start gap-3 group"
                    >
                      <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold group-hover:scale-115 transition-transform flex-shrink-0 mt-0.5">A</span>
                      <span className="text-gray-700 leading-relaxed">{quizQuestions[quizStep].a}</span>
                    </button>
                    <button 
                      onClick={() => handleQuizAnswer('B')}
                      className="w-full text-left p-4 rounded-2xl bg-gray-50/30 border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50/20 transition-all text-xs font-semibold flex items-start gap-3 group"
                    >
                      <span className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-[10px] font-bold group-hover:scale-115 transition-transform flex-shrink-0 mt-0.5">B</span>
                      <span className="text-gray-700 leading-relaxed">{quizQuestions[quizStep].b}</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white border-2 border-orange-100 rounded-[32px] p-8 shadow-sm space-y-8 text-center">
                
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-comfortaa font-bold text-2xl text-gray-900">Phân tích Kết quả Đánh giá</h3>
                  <p className="text-xs text-gray-500">Kết quả tổng hợp dựa trên sự lựa chọn tư duy ngôn học của bạn.</p>
                </div>

                {/* SVG Animated Radar-Bar chart to replace raw libraries */}
                <div className="max-w-md mx-auto bg-orange-50/30 border border-orange-100 rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>Tỉ lệ Tư duy Tri nhận Bản xứ (Cognitive):</span>
                      <span className="text-orange-600">{quizScores.cognitive}%</span>
                    </div>
                    <div className="w-full bg-orange-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${quizScores.cognitive}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>Tỉ lệ Dịch thô tiếng mẹ đẻ (Literal Interlanguage):</span>
                      <span className="text-gray-600">{quizScores.literal}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-400 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${quizScores.literal}%` }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed max-w-lg mx-auto">
                  {quizScores.cognitive > quizScores.literal 
                    ? "Chúc mừng! Bạn đang có thiên hướng phát triển ngôn ngữ dựa trên nền tảng hiểu biết biểu trưng văn hóa của người bản xứ rất tốt. Hãy duy trì phương pháp này bằng các bài học trong thẻ lật nhé!" 
                    : "Học tập qua lăng kính tương quan ngôn ngữ đang là thách thức lớn đối với bạn. Thói quen dịch từ ngữ đối sánh (word-by-word) dễ khiến bạn mắc lỗi bổ ngữ. Hãy tích cực làm quen với góc nhìn 'Văn hóa tri nhận' của CAM Chinese nhé!"}
                </p>

                <button 
                  onClick={restartQuiz}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  Thực hiện lại khảo sát
                </button>

              </div>
            )}

          </div>
        )}

        {/* ==================================== TAB 4: ADMIN STUDIO (CMS QUẢN TRỊ) ==================================== */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-comfortaa font-bold text-2xl text-gray-900">Admin Studio &amp; CMS Panel</h2>
                <p className="text-xs text-gray-500 mt-1">Cập nhật và bổ sung bài học mới trực tiếp xuống hệ thống phân tán thời gian thực.</p>
              </div>
              <button 
                onClick={() => {
                  setIsAdmin(false);
                  setActiveTab('dashboard');
                  triggerNotification("Đã thoát chế độ quản trị an toàn.");
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Đăng xuất Admin
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Form: Add dynamic content */}
              <div className="lg:col-span-5 bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="font-comfortaa font-bold text-base text-gray-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-500" /> Thêm Bài Học Mới
                </h3>

                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Loại Học Liệu</label>
                    <select 
                      value={newLesson.type}
                      onChange={(e) => setNewLesson({...newLesson, type: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="vocab">Từ vựng &amp; Thành ngữ</option>
                      <option value="grammar">Ngữ pháp đối chiếu</option>
                      <option value="culture">Văn hóa tri nhận</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Biểu tượng</label>
                      <input 
                        type="text" 
                        value={newLesson.emoji}
                        onChange={(e) => setNewLesson({...newLesson, emoji: e.target.value})}
                        placeholder="🍊" 
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Mức độ HSK</label>
                      <input 
                        type="text" 
                        value={newLesson.level}
                        onChange={(e) => setNewLesson({...newLesson, level: e.target.value})}
                        placeholder="HSK 3 - 4" 
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Thành ngữ / Cấu trúc Hán ngữ</label>
                    <input 
                      type="text" 
                      value={newLesson.title}
                      onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                      placeholder="Ví dụ: 气壮如牛" 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Giải nghĩa ngắn (Tag)</label>
                    <input 
                      type="text" 
                      value={newLesson.tag}
                      onChange={(e) => setNewLesson({...newLesson, tag: e.target.value})}
                      placeholder="Ví dụ: Khí thế dũng mãnh như trâu" 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Phân tích Tri Nhận / Ẩn dụ ý niệm</label>
                    <textarea 
                      value={newLesson.explain}
                      onChange={(e) => setNewLesson({...newLesson, explain: e.target.value})}
                      rows="4"
                      placeholder="Giải mã cặn kẽ vì sao người bản xứ chọn cách diễn đạt này dựa trên đặc thù địa lý, văn hóa hoặc lịch sử..." 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs leading-relaxed"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-2"
                  >
                    Đăng tải bài học <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Right List: Display currently available lessons with delete capability */}
              <div className="lg:col-span-7 bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-comfortaa font-bold text-base text-gray-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-500" /> Danh sách bài học hiện hành ({lessons.length})
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {lessons.map((lesson) => (
                    <div 
                      key={lesson.id} 
                      className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-orange-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lesson.emoji}</span>
                        <div>
                          <span className="text-[8px] bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {lesson.type}
                          </span>
                          <h4 className="font-bold text-gray-900 text-xs mt-0.5">{lesson.title}</h4>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="text-gray-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all"
                        title="Xóa bài học"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-white text-sm select-none">
              🍊
            </div>
            <span className="font-comfortaa font-bold text-white text-base tracking-wide">CAM Chinese</span>
          </div>

          <p className="text-xs text-center md:text-right">
            © 2026 CAM Chinese Project. Được thiết kế chuyên sâu dành cho sự phát triển nhận thức ngôn ngữ tự nhiên.
          </p>
        </div>
      </footer>

    </div>
  );
}
