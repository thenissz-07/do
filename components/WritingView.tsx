import React, { useState } from 'react';
import { LessonContent } from '../types';
import { gradeWriting } from '../services/geminiService';
import { Loader2, Send, Lightbulb, FileText, Check, Book } from 'lucide-react';

interface Props {
  content: LessonContent;
  onComplete: () => void;
}

const WritingView: React.FC<Props> = ({ content, onComplete }) => {
  const [text, setText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<{ score: number; correctedText: string; feedback: string } | null>(null);

  // Simple word count logic
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const targetWords = 150;
  const progress = Math.min((wordCount / targetWords) * 100, 100);
  
  const handleGrade = async () => {
    if (wordCount < 20) return;
    setIsGrading(true);
    try {
      const grading = await gradeWriting(content.title, text);
      setResult(grading);
      onComplete();
    } catch (e) {
      console.error(e);
      alert("Failed to grade. Please try again.");
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 h-full">
      
      {/* Main Writing Area */}
      <div className="md:col-span-2 space-y-6 flex flex-col">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex-1 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
               <FileText size={24} />
            </div>
            <div>
               <h2 className="text-xl font-bold text-slate-800">{content.title}</h2>
               <p className="text-slate-600 text-sm mt-1">{content.contentBody}</p>
            </div>
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="relative flex-1">
                 <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-full min-h-[300px] p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-serif text-lg text-slate-700 leading-relaxed shadow-inner bg-slate-50/30"
                    placeholder="Start your essay here... Remember to include an introduction, body, and conclusion."
                  />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                   <span>Word Count: {wordCount}</span>
                   <span>Target: {targetWords}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                      className={`h-full transition-all duration-500 ${wordCount >= targetWords ? 'bg-green-500' : 'bg-indigo-500'}`} 
                      style={{width: `${progress}%`}}
                   ></div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGrade}
                  disabled={isGrading || wordCount < 50}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isGrading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                  {isGrading ? 'Grading Essay...' : 'Submit Essay'}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
               <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className={`text-5xl font-black ${result.score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                    {result.score}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Essay Score</h4>
                    <p className="text-slate-500 text-sm">B1 Proficiency Assessment</p>
                  </div>
               </div>

               <div className="space-y-2">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2"><Check size={18}/> Corrected Version</h4>
                  <div className="p-6 bg-green-50 rounded-xl text-green-900 border border-green-200 leading-relaxed whitespace-pre-wrap font-serif">
                    {result.correctedText}
                  </div>
               </div>
               
               <div className="space-y-2">
                  <h4 className="font-semibold text-indigo-900 flex items-center gap-2"><Lightbulb size={18}/> Teacher's Feedback</h4>
                  <p className="p-6 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 leading-relaxed">
                    {result.feedback}
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Helper Sidebar */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-800 border-b border-slate-100 pb-2">
            <Lightbulb size={20} className="text-amber-500" />
            <h3 className="font-bold">Essay Structure</h3>
          </div>
          <div className="space-y-4 text-sm text-slate-600">
             <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">1</div>
                <div>
                   <span className="font-semibold text-slate-800 block">Introduction</span>
                   <span className="text-xs">Hook the reader and state your main idea.</span>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
                <div>
                   <span className="font-semibold text-slate-800 block">Body Paragraphs</span>
                   <span className="text-xs">Give examples and details to support your idea.</span>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
                <div>
                   <span className="font-semibold text-slate-800 block">Conclusion</span>
                   <span className="text-xs">Summarize your points and give a final thought.</span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-amber-900">
            <Book size={20} />
            <h3 className="font-bold">Key Vocabulary & Links</h3>
          </div>
          <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">
            {content.learningFocus}
          </p>
        </div>
      </div>

    </div>
  );
};

export default WritingView;