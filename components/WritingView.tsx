import React, { useState } from 'react';
import { LessonContent } from '../types';
import { gradeWriting } from '../services/geminiService';
import { Loader2, Send, Lightbulb } from 'lucide-react';

interface Props {
  content: LessonContent;
  onComplete: () => void;
}

const WritingView: React.FC<Props> = ({ content, onComplete }) => {
  const [text, setText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<{ score: number; correctedText: string; feedback: string } | null>(null);

  const handleGrade = async () => {
    if (text.length < 20) return;
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
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
      
      {/* Main Writing Area */}
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{content.title}</h2>
          <p className="text-slate-600 mb-6">{content.contentBody}</p>

          {!result ? (
            <div className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-80 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-sans text-slate-700 leading-relaxed"
                placeholder="Write your response here..."
              />
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>{text.split(/\s+/).filter(Boolean).length} words</span>
                <button
                  onClick={handleGrade}
                  disabled={isGrading || text.length < 10}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isGrading ? <Loader2 className="animate-spin" size={20}/> : <Send size={18} />}
                  {isGrading ? 'Grading...' : 'Submit'}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
               <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className={`text-4xl font-bold ${result.score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                    {result.score}/100
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Feedback Score</h4>
                    <p className="text-slate-500 text-sm">Automated B1 Assessment</p>
                  </div>
               </div>

               <div className="space-y-2">
                  <h4 className="font-semibold text-green-800">Corrected Version</h4>
                  <div className="p-4 bg-green-50 rounded-lg text-green-800 text-sm border border-green-200 leading-relaxed whitespace-pre-wrap">
                    {result.correctedText}
                  </div>
               </div>
               
               <div className="space-y-2">
                  <h4 className="font-semibold text-indigo-900">Teacher's Feedback</h4>
                  <p className="p-4 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-100 text-sm leading-relaxed">
                    {result.feedback}
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Helper Sidebar */}
      <div className="space-y-4">
        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
          <div className="flex items-center gap-2 mb-3 text-amber-800">
            <Lightbulb size={20} />
            <h3 className="font-bold">Suggested Vocabulary</h3>
          </div>
          <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">
            {content.learningFocus}
          </p>
        </div>
        {!result && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-2 text-sm">Writing Tips (B1)</h4>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              <li>Use linking words (however, therefore).</li>
              <li>Try to use past and future tenses.</li>
              <li>Keep sentences clear and structured.</li>
            </ul>
          </div>
        )}
      </div>

    </div>
  );
};

export default WritingView;