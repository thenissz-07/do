import React, { useState, useEffect, useRef } from 'react';
import { getLiveClient } from '../services/geminiService';
import { Modality, LiveServerMessage } from '@google/genai';
import { createPcmBlob, decodeAudioData, b64ToUint8Array } from '../services/audioUtils';
import { Mic, MicOff, Volume2, Loader2, X, MessageSquare, Book } from 'lucide-react';
import { LessonContent } from '../types';

interface Props {
  content: LessonContent;
  onComplete: () => void;
}

const SpeakingView: React.FC<Props> = ({ content, onComplete }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription State for UI
  const currentModelTranscriptRef = useRef('');

  useEffect(() => {
    return () => {
      handleDisconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setError(null);
    try {
      // 1. Setup Audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      const inputCtx = inputContextRef.current;
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 2. Connect to Live API
      const liveClient = getLiveClient();
      
      const sessionPromise = liveClient.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a friendly English Tutor roleplaying a scenario with a B1 student.
          SCENARIO: ${content.contentBody}.
          Your goal: Engage the student in this scenario. Correct big mistakes gently but keep the flow. Keep responses short (1-3 sentences).`,
          outputAudioTranscription: { },
        },
        callbacks: {
          onopen: () => {
            console.log("Connected to Live API");
            setIsConnected(true);
            
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
               });
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
             if (msg.serverContent?.outputTranscription) {
                const text = msg.serverContent.outputTranscription.text;
                currentModelTranscriptRef.current += text;
             }
             
             if (msg.serverContent?.turnComplete) {
                if (currentModelTranscriptRef.current.trim()) {
                    setMessages(prev => [...prev, { role: 'model', text: currentModelTranscriptRef.current }]);
                    currentModelTranscriptRef.current = '';
                }
             }

             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current) {
                const ctx = outputContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const buffer = await decodeAudioData(b64ToUint8Array(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
             }
          },
          onclose: () => {
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error.");
            handleDisconnect();
          }
        }
      });

    } catch (err) {
      console.error(err);
      setError("Could not access microphone or connect.");
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    if (streamRef.current) {
       streamRef.current.getTracks().forEach(t => t.stop());
       streamRef.current = null;
    }
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
  };

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* Sidebar Info */}
      <div className="space-y-4">
         <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-md">
            <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><MessageSquare size={20}/> Scenario</h2>
            <p className="text-indigo-100 text-sm leading-relaxed">{content.contentBody}</p>
         </div>
         
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm"><Book size={18}/> Useful Expressions</h3>
             <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{content.learningFocus}</p>
         </div>

         {!isConnected && (
             <button onClick={handleConnect} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                <Mic size={20} /> Start Session
             </button>
         )}
         {isConnected && (
             <button onClick={handleDisconnect} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2">
                <X size={20} /> End Session
             </button>
         )}
         <button onClick={onComplete} className="w-full py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">
            Finish & Mark Complete
         </button>
      </div>

      {/* Main Chat Interface */}
      <div className="md:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
         <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
             <span className="font-semibold text-slate-700">{content.title}</span>
             {isConnected && (
                <div className="flex items-center gap-2 text-green-600 text-xs font-bold uppercase tracking-wider animate-pulse">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div> Live
                </div>
             )}
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                 <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <Volume2 size={32} className="text-indigo-300" />
                 </div>
                 <p>Ready to speak? Click "Start Session".</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                   m.role === 'user' 
                   ? 'bg-indigo-600 text-white rounded-br-sm' 
                   : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                 }`}>
                   {m.text}
                 </div>
              </div>
            ))}
         </div>

         {/* Connection Error Overlay */}
         {error && (
            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-red-600 p-6 text-center">
               <p className="font-bold mb-2">Connection Error</p>
               <p className="text-sm mb-4">{error}</p>
               <button onClick={handleConnect} className="px-4 py-2 bg-red-100 rounded-full text-sm font-medium hover:bg-red-200">Try Again</button>
            </div>
         )}
      </div>
    </div>
  );
};

export default SpeakingView;