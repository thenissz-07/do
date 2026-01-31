import React, { useState } from 'react';
import { LessonContent } from '../types';
import { CheckCircle, XCircle, BookOpen } from 'lucide-react';

interface Props {
  content: LessonContent;
  onComplete: () => void;
}

const ReadingView: React.FC<Props> = ({ content, onComplete }) => {
  const [answers, setAnswers] = useState<number[]>(new Array(content.questions?.length || 0).fill(-1));
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const isAllCorrect = content.questions?.every((q, i) => q.correctAnswer === answers[i]);
    if (isAllCorrect) {
       setTimeout(onComplete, 2000); // Auto complete if perfect
    } else {
       setTimeout(onComplete, 5000); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">{content.title}</h2>
          <div className="prose prose-slate max-w-none leading-relaxed text-slate-700">
            <p className="whitespace-pre-line">{content.contentBody}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 px-1">Comprehension Check</h3>
          {content.questions?.map((q, qIdx) => (
            <div key={qIdx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800 mb-4">{qIdx + 1}. {q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[qIdx] === optIdx;
                  const isCorrect = q.correctAnswer === optIdx;
                  
                  let btnClass = "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ";
                  
                  if (submitted) {
                    if (isCorrect) btnClass += "bg-green-50 border-green-500 text-green-800 font-medium";
                    else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-500 text-red-800";
                    else btnClass += "bg-white border-slate-200 text-slate-400";
                  } else {
                    if (isSelected) btnClass += "bg-indigo-50 border-indigo-500 text-indigo-700 font-medium shadow-sm";
                    else btnClass += "bg-white border-slate-200 hover:bg-slate-50 text-slate-700";
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={btnClass}
                      disabled={submitted}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        {submitted && isCorrect && <CheckCircle size={18} className="text-green-600" />}
                        {submitted && isSelected && !isCorrect && <XCircle size={18} className="text-red-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Submit Answers
          </button>
        )}
        {submitted && (
          <div className="p-4 bg-green-50 text-green-800 rounded-xl text-center border border-green-200 font-medium">
             Great job! Marking lesson as complete...
          </div>
        )}
      </div>

      {/* Sidebar for Learning Focus */}
      <div className="w-full md:w-80 shrink-0">
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 sticky top-24">
          <div className="flex items-center gap-2 mb-4 text-indigo-800">
             <BookOpen size={20} />
             <h3 className="font-bold">Key Vocabulary</h3>
          </div>
          <p className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed">
            {content.learningFocus}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReadingView;