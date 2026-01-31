import React, { useState, useEffect, useRef } from 'react';
import { LessonContent } from '../types';
import { generateSpeech } from '../services/geminiService';
import { Play, Pause, Loader2, Ear } from 'lucide-react';
import { b64ToUint8Array } from '../services/audioUtils';

interface Props {
  content: LessonContent;
  onComplete: () => void;
}

const ListeningView: React.FC<Props> = ({ content, onComplete }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<number[]>(new Array(content.questions?.length || 0).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAudio = async () => {
      try {
        const b64 = await generateSpeech(content.contentBody);
        if (!active) return;
        
        const byteArray = b64ToUint8Array(b64);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (e) {
        console.error(e);
      } finally {
        if(active) setIsLoading(false);
      }
    };
    fetchAudio();
    return () => { active = false; if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [content.contentBody]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(onComplete, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
      
      {/* Main Content */}
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{content.title}</h2>

          {/* Audio Player */}
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-xl mb-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-60"></div>
            <div className="relative z-10 flex flex-col items-center gap-4">
              {isLoading ? (
                <div className="flex items-center gap-2"><Loader2 className="animate-spin"/> Generating Audio...</div>
              ) : (
                <>
                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 flex items-center justify-center bg-white rounded-full text-indigo-600 hover:scale-110 transition-transform shadow-xl"
                  >
                    {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1"/>}
                  </button>
                  <span className="text-sm font-medium tracking-wide opacity-90">
                    {isPlaying ? 'Listening...' : 'Tap to Play'}
                  </span>
                  <audio 
                    ref={audioRef} 
                    src={audioUrl || undefined} 
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Quiz */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Quiz</h3>
            {content.questions?.map((q, qIdx) => (
              <div key={qIdx} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-800 mb-3">{qIdx + 1}. {q.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[qIdx] === optIdx;
                    const isCorrect = q.correctAnswer === optIdx;
                    let btnClass = "px-4 py-3 rounded-lg text-sm font-medium text-left border transition-all ";
                    
                    if (submitted) {
                        if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-900";
                        else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-900";
                        else btnClass += "opacity-60 border-slate-200 bg-white";
                    } else {
                        if (isSelected) btnClass += "bg-indigo-600 border-indigo-600 text-white shadow-md";
                        else btnClass += "bg-white border-slate-200 text-slate-600 hover:bg-white hover:border-indigo-300";
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        disabled={submitted}
                        className={btnClass}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={answers.includes(-1) || isLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 shadow-md"
            >
              Submit Answers
            </button>
          )}
        </div>
      </div>

      {/* Helper Sidebar */}
      <div>
         <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 sticky top-24">
            <div className="flex items-center gap-2 mb-3 text-indigo-800">
              <Ear size={20} />
              <h3 className="font-bold">Key Phrases</h3>
            </div>
            <p className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed">
              {content.learningFocus}
            </p>
            <div className="mt-4 pt-4 border-t border-indigo-100">
               <p className="text-xs text-indigo-700 italic">
                 Tip: Read these phrases before listening to catch them in the audio!
               </p>
            </div>
         </div>
      </div>

    </div>
  );
};

export default ListeningView;