import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, SkipForward, CheckCircle2, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { evaluateAnswer, InterviewEvaluation } from '../services/gemini';

interface InterviewSessionProps {
  questions: { project: string; questions: string[] }[];
  difficulty: string;
  onComplete: (results: { question: string; answer: string; evaluation: InterviewEvaluation }[]) => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ questions, difficulty, onComplete }) => {
  const allQuestions = questions.flatMap(q => q.questions.map(text => ({ text, project: q.project })));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [results, setResults] = useState<{ question: string; answer: string; evaluation: InterviewEvaluation }[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone access denied. Please enable it in your browser settings and refresh.');
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors as they are common
        } else {
          setPermissionError(`Speech recognition error: ${event.error}`);
        }
      };
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for better clarity
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    setPermissionError(null);
    setTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    recognitionRef.current?.stop();
  };

  const handleNext = async () => {
    if (!transcript.trim()) return;
    
    setIsEvaluating(true);
    try {
      const evaluation = await evaluateAnswer(allQuestions[currentIndex].text, transcript);
      const newResult = {
        question: allQuestions[currentIndex].text,
        answer: transcript,
        evaluation
      };
      
      const updatedResults = [...results, newResult];
      setResults(updatedResults);
      setTranscript('');

      if (currentIndex < allQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(updatedResults);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentQuestion = allQuestions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-stone-200">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl">AI Interviewer</h2>
              <div className="flex items-center gap-2">
                <p className="text-stone-400 text-xs uppercase tracking-widest font-semibold">
                  Question {currentIndex + 1} of {allQuestions.length}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-bold uppercase tracking-tighter">
                  {difficulty}
                </span>
              </div>
            </div>
          </div>
          <div className="text-stone-400 font-mono text-sm">
            Project: <span className="text-stone-900 font-semibold">{currentQuestion.project}</span>
          </div>
        </div>

        {!isSupported && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            Speech recognition is not supported in your browser. Please use Chrome or Edge for the full voice experience.
          </div>
        )}

        {permissionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            {permissionError}
          </div>
        )}

        <div className="mb-12">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-medium text-stone-800 leading-tight mb-6"
          >
            {currentQuestion.text}
          </motion.div>
          
          <button 
            onClick={() => speak(currentQuestion.text)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            {isSpeaking ? <Volume2 className="animate-pulse" size={20} /> : <Play size={20} />}
            Listen to Question
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your answer will appear here..."
              className="w-full h-48 p-6 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-stone-700"
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className={`absolute bottom-4 right-4 p-4 rounded-xl shadow-lg transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-stone-400 text-sm">
              {isListening ? "Listening... Speak clearly into your microphone." : "Click the mic to start speaking your answer."}
            </p>
            
            <button
              onClick={handleNext}
              disabled={!transcript.trim() || isEvaluating}
              className="bg-stone-900 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-all"
            >
              {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              {currentIndex === allQuestions.length - 1 ? "Finish Interview" : "Next Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
