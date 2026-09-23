/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Briefcase, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  X,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Markdown from 'react-markdown';
import { analyzeResume, ResumeAnalysis, InterviewEvaluation, DifficultyLevel } from './services/gemini';
import { InterviewSession } from './components/InterviewSession';
import { AnalysisReport } from './components/AnalysisReport';
import { DoubtSolver } from './components/DoubtSolver';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'upload' | 'analysis' | 'interview' | 'report';

export default function App() {
  const [state, setState] = useState<AppState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  const loadingMessages = [
    "Scanning your resume structure...",
    "Extracting key technical skills...",
    "Analyzing project impact and complexity...",
    "Benchmarking against industry standards...",
    "Generating tailored interview questions...",
    "Finalizing your career insights..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  const [interviewResults, setInterviewResults] = useState<{ question: string; answer: string; evaluation: InterviewEvaluation }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isImage = selectedFile.type.startsWith('image/');
      const isPdf = selectedFile.type === 'application/pdf';

      if (!isImage && !isPdf) {
        setError('Please upload a PDF or an Image file.');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setAnalysis(null);

      if (isImage) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      let result: ResumeAnalysis;
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        result = await analyzeResume({ 
          image: { data: base64, mimeType: file.type },
          difficulty
        });
      } else {
        const text = await extractTextFromPdf(file);
        if (!text.trim()) {
          throw new Error('Could not extract text from the PDF. It might be an image-based PDF.');
        }
        result = await analyzeResume({ text, difficulty });
      }
      setAnalysis(result);
      setState('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const isImage = droppedFile.type.startsWith('image/');
      const isPdf = droppedFile.type === 'application/pdf';

      if (isImage || isPdf) {
        setFile(droppedFile);
        setError(null);
        setAnalysis(null);
        if (isImage) {
          const url = URL.createObjectURL(droppedFile);
          setPreviewUrl(url);
        } else {
          setPreviewUrl(null);
        }
      } else {
        setError('Please upload a PDF or an Image file.');
      }
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError(null);
  };

  const startInterview = () => {
    setState('interview');
  };

  const handleInterviewComplete = (results: { question: string; answer: string; evaluation: InterviewEvaluation }[]) => {
    setInterviewResults(results);
    setState('report');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setState('upload')}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight">Resume Intellect</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-500">
            <button onClick={() => setState('upload')} className={cn("hover:text-emerald-600 transition-colors", state === 'upload' && "text-emerald-600")}>Upload</button>
            {analysis && <button onClick={() => setState('analysis')} className={cn("hover:text-emerald-600 transition-colors", state === 'analysis' && "text-emerald-600")}>Analysis</button>}
            {analysis && <button onClick={() => setState('interview')} className={cn("hover:text-emerald-600 transition-colors", state === 'interview' && "text-emerald-600")}>Interview</button>}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4">Analyzing Your Resume</h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMessageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-stone-500 font-medium h-6"
                >
                  {loadingMessages[loadingMessageIndex]}
                </motion.p>
              </AnimatePresence>
              <div className="mt-12 w-64 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-600"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "linear" }}
                />
              </div>
            </motion.div>
          ) : state === 'upload' ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <section className="text-center mb-16">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                  Get hired faster with <br />
                  <span className="text-emerald-600">AI-powered</span> insights.
                </h1>
                <p className="text-stone-500 text-lg max-w-2xl mx-auto mb-10">
                  Upload your resume as a <span className="text-stone-900 font-medium">PDF or Image</span> to receive professional feedback and tailored interview 
                  questions based on your actual projects.
                </p>

                <div className="max-w-xl mx-auto">
                  <div 
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative border-2 border-dashed rounded-3xl p-8 transition-all cursor-pointer group overflow-hidden",
                      file ? "border-emerald-500 bg-emerald-50/50" : "border-stone-200 hover:border-emerald-400 bg-white hover:bg-stone-50"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,image/*"
                      className="hidden"
                    />
                    
                    {previewUrl ? (
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-emerald-200 shadow-inner">
                        <img src={previewUrl} alt="Resume Preview" className="w-full h-full object-contain bg-white" />
                        <button 
                          onClick={clearFile}
                          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-stone-900 rounded-full shadow-lg transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          file ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"
                        )}>
                          {file ? (
                            file.type === 'application/pdf' ? <FileText size={32} /> : <ImageIcon size={32} />
                          ) : <Upload size={32} />}
                        </div>
                        
                        <div>
                          <p className="font-semibold text-lg">
                            {file ? file.name : "Drop your resume here"}
                          </p>
                          <p className="text-stone-400 text-sm mt-1">
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF or Images, up to 10MB"}
                          </p>
                        </div>
                      </div>
                    )}

                    {file && !isAnalyzing && (
                      <div className="mt-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-3">
                          <label className="text-sm font-semibold text-stone-600 uppercase tracking-wider">
                            Interview Difficulty
                          </label>
                          <div className="flex bg-stone-100 p-1 rounded-xl w-full max-w-xs">
                            {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => (
                              <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={cn(
                                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                  difficulty === level 
                                    ? "bg-white text-emerald-600 shadow-sm" 
                                    : "text-stone-500 hover:text-stone-700"
                                )}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpload();
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                        >
                          Analyze Resume <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3 text-sm">
                      <AlertCircle size={18} />
                      {error}
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          ) : (state === 'analysis' && analysis) ? (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-8">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <CheckCircle2 size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Resume Feedback</h2>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Resume Score</span>
                        <div className="text-3xl font-black text-emerald-600">
                          {analysis.overallScore}<span className="text-sm text-stone-300">/100</span>
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-stone max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-stone-600 prose-li:text-stone-600 prose-strong:text-stone-900">
                      <Markdown>{analysis.feedback}</Markdown>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-stone-900 text-white rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-white/10 text-emerald-400 rounded-xl flex items-center justify-center">
                        <MessageSquare size={24} />
                      </div>
                      <h2 className="text-2xl font-bold">Interview Prep</h2>
                    </div>

                    <div className="space-y-8 mb-8">
                      {analysis.interviewQuestions.map((item, idx) => (
                        <div key={idx} className="space-y-4">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                            <Briefcase size={14} />
                            {item.project}
                          </div>
                          <ul className="space-y-4">
                            {item.questions.map((q, qIdx) => (
                              <li key={qIdx} className="flex gap-3 group">
                                <div className="mt-1.5">
                                  <ChevronRight size={16} className="text-stone-600 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <p className="text-stone-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                                  {q}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={startInterview}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <Mic size={20} />
                      Start Voice Interview
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (state === 'interview' && analysis) ? (
            <motion.div 
              key="interview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <InterviewSession 
                questions={analysis.interviewQuestions} 
                difficulty={difficulty}
                onComplete={handleInterviewComplete}
              />
            </motion.div>
          ) : state === 'report' ? (
            <motion.div 
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnalysisReport 
                results={interviewResults} 
                onRestart={() => setState('analysis')} 
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-12 mt-24">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-bold text-stone-900">Resume Intellect</span>
          </div>
          <p className="text-stone-400 text-sm">
            © 2026 Resume Intellect.
          </p>
          <div className="flex gap-6 text-sm font-medium text-stone-500">
            <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Doubt Solver Chatbot */}
      <DoubtSolver context={analysis?.feedback} />
    </div>
  );
}
