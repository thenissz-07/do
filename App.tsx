import React, { useState, useEffect } from 'react';
import { THIRTY_DAY_PLAN } from './constants';
import { DayPlan, SkillType, LessonContent } from './types';
import { generateLessonContent } from './services/geminiService';
import ReadingView from './components/ReadingView';
import WritingView from './components/WritingView';
import ListeningView from './components/ListeningView';
import SpeakingView from './components/SpeakingView';
import { 
  BookOpen, PenTool, Headphones, Mic, 
  CheckCircle2, Lock, ArrowRight, Activity, 
  Loader2, ChevronLeft, AlertCircle, RefreshCw, Trophy
} from 'lucide-react';

// Types for Navigation State
type ViewState = 'DASHBOARD' | 'DAY_MENU' | 'ACTIVITY';

const App = () => {
  // Navigation State
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);

  // Content & Progress State
  const [completedUnits, setCompletedUnits] = useState<string[]>([]);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('ascend_progress_v2');
    if (saved) setCompletedUnits(JSON.parse(saved));
  }, []);

  // -- HANDLERS --

  const handleDayClick = (plan: DayPlan) => {
    // Check if previous day is complete (optional strict mode)
    // For now, we allow access if the day index is reachable
    const prevDay = plan.day - 1;
    const isLocked = prevDay > 0 && !isDayComplete(prevDay);
    
    // For demo purposes, we might want to be lenient, but let's strictly enforce the logic 
    // to give it a "game" feel, OR allow strict linear progression.
    // Let's stick to the "Course Map" visual lock logic in the render.
    if (isLocked) return;

    setSelectedDay(plan);
    setView('DAY_MENU');
  };

  const handleSkillSelect = async (skill: SkillType) => {
    if (!selectedDay) return;
    
    setSelectedSkill(skill);
    setLoading(true);
    setLessonContent(null);
    setError(null);
    setView('ACTIVITY');

    try {
      const content = await generateLessonContent(selectedDay.topic, selectedDay.description, skill);
      setLessonContent(content);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (selectedSkill) {
      handleSkillSelect(selectedSkill);
    }
  };

  const handleBack = () => {
    if (view === 'ACTIVITY') {
      setView('DAY_MENU');
      setLessonContent(null);
      setError(null);
      setSelectedSkill(null);
    } else if (view === 'DAY_MENU') {
      setView('DASHBOARD');
      setSelectedDay(null);
    }
  };

  const markComplete = () => {
    if (selectedDay && selectedSkill) {
      const id = `${selectedDay.day}-${selectedSkill}`;
      if (!completedUnits.includes(id)) {
        const newCompleted = [...completedUnits, id];
        setCompletedUnits(newCompleted);
        localStorage.setItem('ascend_progress_v2', JSON.stringify(newCompleted));
      }
      // Return to menu after short delay or immediately?
      // User might want to review. Component calls this, usually implies "Done".
      // Let's go back to menu to pick next skill.
      setView('DAY_MENU');
    }
  };

  // -- HELPERS --

  const isDayComplete = (day: number) => {
    const skills = [SkillType.READING, SkillType.WRITING, SkillType.LISTENING, SkillType.SPEAKING];
    return skills.every(s => completedUnits.includes(`${day}-${s}`));
  };

  const getDayProgress = (day: number) => {
    const skills = [SkillType.READING, SkillType.WRITING, SkillType.LISTENING, SkillType.SPEAKING];
    const completed = skills.filter(s => completedUnits.includes(`${day}-${s}`)).length;
    return Math.round((completed / 4) * 100);
  };

  const getSkillIcon = (skill: SkillType, size = 20) => {
    switch(skill) {
      case SkillType.READING: return <BookOpen size={size} />;
      case SkillType.WRITING: return <PenTool size={size} />;
      case SkillType.LISTENING: return <Headphones size={size} />;
      case SkillType.SPEAKING: return <Mic size={size} />;
    }
  };

  const totalProgress = Math.round((completedUnits.length / (30 * 4)) * 100);

  // -- RENDER VIEWS --

  // 1. DASHBOARD
  if (view === 'DASHBOARD') {
    return (
      <div className="flex h-screen bg-slate-50 font-sans">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
          <div className="p-6 border-b border-slate-100">
             <div className="flex items-center gap-2 text-indigo-600 mb-1">
               <Activity size={24} />
               <span className="text-xl font-bold tracking-tight">Ascend</span>
             </div>
             <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Intensive B1 Course</p>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between text-sm font-medium mb-2 text-slate-700">
               <span>Total Progress</span>
               <span>{totalProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
               <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${totalProgress}%` }}></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
             <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-2">Course Modules</div>
             {THIRTY_DAY_PLAN.map((plan) => {
               const dayComplete = isDayComplete(plan.day);
               // Lock logic: Day is locked if previous day is not complete. Day 1 always open.
               const isLocked = plan.day > 1 && !isDayComplete(plan.day - 1);
               const progress = getDayProgress(plan.day);
               
               return (
                 <button
                   key={plan.day}
                   onClick={() => handleDayClick(plan)}
                   disabled={isLocked}
                   className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors group ${
                     dayComplete ? 'bg-green-50 text-green-700' :
                     isLocked ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400' :
                     'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 bg-white border border-slate-100'
                   }`}
                 >
                   <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                     dayComplete ? 'bg-green-200 text-green-800' : 
                     isLocked ? 'bg-slate-200 text-slate-500' : 
                     'bg-indigo-100 text-indigo-700'
                   }`}>
                     {dayComplete ? <CheckCircle2 size={16} /> : plan.day}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="truncate text-sm font-medium">{plan.topic}</div>
                     {!isLocked && !dayComplete && (
                       <div className="w-16 bg-slate-200 h-1 rounded-full mt-1.5">
                          <div className="bg-indigo-400 h-1 rounded-full" style={{width: `${progress}%`}}></div>
                       </div>
                     )}
                   </div>
                   {isLocked && <Lock size={14} className="opacity-50"/>}
                 </button>
               )
             })}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 w-full bg-white z-10 p-4 border-b flex justify-between items-center shadow-sm">
            <span className="font-bold text-indigo-600 flex items-center gap-2"><Activity size={18}/> Ascend</span>
            <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded-md">{totalProgress}%</span>
        </div>

        {/* Main Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 pt-20 md:pt-12 bg-slate-50/50">
           <div className="max-w-5xl mx-auto">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back.</h1>
              <p className="text-slate-600 mb-10">Select a day to begin your daily activities.</p>

              {/* Next Up Card */}
              {THIRTY_DAY_PLAN.find(d => !isDayComplete(d.day)) ? (
                (() => {
                  const nextDay = THIRTY_DAY_PLAN.find(d => !isDayComplete(d.day))!;
                  const isLocked = nextDay.day > 1 && !isDayComplete(nextDay.day - 1);
                  return (
                    <div 
                      onClick={() => !isLocked && handleDayClick(nextDay)}
                      className={`group relative overflow-hidden rounded-2xl p-8 text-white shadow-xl transform transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer ${
                         isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600'
                      }`}
                    >
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                       <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">
                              Current Day: {nextDay.day}
                            </span>
                            {!isLocked && <ArrowRight className="opacity-70 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />}
                            {isLocked && <Lock className="opacity-70" />}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{nextDay.topic}</h2>
                        <p className="text-indigo-100 mb-8 max-w-lg text-lg leading-relaxed opacity-90">{nextDay.description}</p>
                        
                        <div className="flex gap-2">
                           <span className="text-xs font-medium bg-black/20 px-3 py-1 rounded-md border border-white/10">Reading</span>
                           <span className="text-xs font-medium bg-black/20 px-3 py-1 rounded-md border border-white/10">Writing</span>
                           <span className="text-xs font-medium bg-black/20 px-3 py-1 rounded-md border border-white/10">Listening</span>
                           <span className="text-xs font-medium bg-black/20 px-3 py-1 rounded-md border border-white/10">Speaking</span>
                        </div>
                       </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-green-600 text-white p-10 rounded-2xl shadow-xl text-center">
                  <Trophy size={48} className="mx-auto mb-4 text-yellow-300" />
                  <h2 className="text-4xl font-bold mb-4">Course Completed! 🎉</h2>
                  <p className="text-lg opacity-90">You have finished all 30 days of the intensive program.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  // 2. DAY MENU
  if (view === 'DAY_MENU' && selectedDay) {
    const skills = [SkillType.READING, SkillType.WRITING, SkillType.LISTENING, SkillType.SPEAKING];
    const progress = getDayProgress(selectedDay.day);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
           <div className="max-w-5xl mx-auto flex items-center gap-4">
             <button onClick={handleBack} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
                <ChevronLeft />
             </button>
             <div className="flex-1">
               <h1 className="text-lg font-bold text-slate-800">Day {selectedDay.day}: {selectedDay.topic}</h1>
               <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full mt-2">
                 <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{width: `${progress}%`}}></div>
               </div>
             </div>
           </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
           <div className="mb-8">
             <p className="text-slate-600 text-lg">{selectedDay.description}</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {skills.map(skill => {
                const isComplete = completedUnits.includes(`${selectedDay.day}-${skill}`);
                return (
                  <button
                    key={skill}
                    onClick={() => handleSkillSelect(skill)}
                    className={`relative p-6 rounded-xl border-2 text-left transition-all hover:-translate-y-1 shadow-sm hover:shadow-md flex items-start gap-4 ${
                      isComplete 
                      ? 'bg-green-50 border-green-200 hover:border-green-300' 
                      : 'bg-white border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className={`p-4 rounded-full ${
                      isComplete ? 'bg-green-200 text-green-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                       {getSkillIcon(skill, 24)}
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg mb-1 ${isComplete ? 'text-green-800' : 'text-slate-800'}`}>
                        {skill}
                      </h3>
                      <p className={`text-sm ${isComplete ? 'text-green-700' : 'text-slate-500'}`}>
                        {isComplete ? 'Completed' : 'Start Activity'}
                      </p>
                    </div>
                    {isComplete && <div className="absolute top-4 right-4 text-green-500"><CheckCircle2 /></div>}
                  </button>
                )
              })}
           </div>
        </main>
      </div>
    );
  }

  // 3. ACTIVITY VIEW
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
       <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-4">
               <button onClick={handleBack} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <ChevronLeft />
               </button>
               <div>
                 <h1 className="text-lg font-bold text-slate-800">{selectedSkill}</h1>
                 <p className="text-xs text-slate-500 font-medium">Day {selectedDay?.day}: {selectedDay?.topic}</p>
               </div>
             </div>
             <div className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                {selectedSkill && getSkillIcon(selectedSkill, 14)} {selectedSkill}
             </div>
          </div>
       </header>

       <main className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-6 animate-in fade-in duration-700">
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
                 <div className="w-20 h-20 border-4 border-indigo-600 rounded-full animate-spin absolute top-0 border-t-transparent"></div>
               </div>
               <div className="text-center">
                 <p className="text-xl font-semibold text-slate-700 mb-2">Generating Lesson...</p>
                 <p className="text-sm text-slate-500 max-w-xs mx-auto">Gemini is creating a custom {selectedSkill} exercise based on "{selectedDay?.topic}".</p>
               </div>
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in zoom-in-95 duration-300">
               <div className="bg-red-50 p-8 rounded-2xl border border-red-100 max-w-md shadow-sm">
                 <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Generation Failed</h3>
                 <p className="text-slate-600 mb-6">{error}</p>
                 <div className="flex gap-3 justify-center">
                   <button onClick={handleBack} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                     Cancel
                   </button>
                   <button onClick={handleRetry} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium flex items-center gap-2 transition-colors shadow-sm">
                     <RefreshCw size={18} /> Retry
                   </button>
                 </div>
               </div>
             </div>
          ) : lessonContent ? (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {selectedSkill === SkillType.READING && <ReadingView content={lessonContent} onComplete={markComplete} />}
               {selectedSkill === SkillType.WRITING && <WritingView content={lessonContent} onComplete={markComplete} />}
               {selectedSkill === SkillType.LISTENING && <ListeningView content={lessonContent} onComplete={markComplete} />}
               {selectedSkill === SkillType.SPEAKING && <SpeakingView content={lessonContent} onComplete={markComplete} />}
             </div>
          ) : null}
       </main>
    </div>
  );
};

export default App;