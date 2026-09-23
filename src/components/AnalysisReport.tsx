import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Star, TrendingUp, AlertCircle, ArrowLeft, Award } from 'lucide-react';
import Markdown from 'react-markdown';
import { InterviewEvaluation } from '../services/gemini';

interface InterviewResult {
  question: string;
  answer: string;
  evaluation: InterviewEvaluation;
}

interface AnalysisReportProps {
  results: InterviewResult[];
  onRestart: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ results, onRestart }) => {
  const averageScore = results.reduce((acc, curr) => acc + curr.evaluation.score, 0) / results.length;
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-12">
        <button 
          onClick={onRestart}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Analysis
        </button>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm">
          <Award size={18} />
          Interview Complete
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center"
        >
          <p className="text-stone-400 text-sm font-semibold uppercase tracking-wider mb-2">Overall Score</p>
          <div className="text-6xl font-black text-emerald-600">{averageScore.toFixed(1)}<span className="text-2xl text-stone-300">/10</span></div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center"
        >
          <p className="text-stone-400 text-sm font-semibold uppercase tracking-wider mb-2">Questions</p>
          <div className="text-6xl font-black text-stone-900">{results.length}</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center"
        >
          <p className="text-stone-400 text-sm font-semibold uppercase tracking-wider mb-2">Performance</p>
          <div className="text-2xl font-bold text-stone-900 mt-4">
            {averageScore >= 8 ? 'Exceptional' : averageScore >= 6 ? 'Strong' : 'Needs Work'}
          </div>
        </motion.div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-8">
        <h3 className="text-2xl font-bold text-stone-900">Detailed Breakdown</h3>
        {results.map((res, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="max-w-2xl">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2 block">Question {idx + 1}</span>
                  <h4 className="text-xl font-bold text-stone-900 leading-tight">{res.question}</h4>
                </div>
                <div className="bg-stone-900 text-white px-4 py-2 rounded-xl font-mono font-bold">
                  {res.evaluation.score}/10
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-stone-400 font-semibold text-xs uppercase tracking-wider">
                    <TrendingUp size={14} />
                    Your Answer
                  </div>
                  <p className="text-stone-600 text-sm italic leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100">
                    "{res.answer}"
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                    <Star size={14} />
                    AI Feedback
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">
                    {res.evaluation.feedback}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-stone-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-1">Perfect Answer Key</span>
                    <p className="text-stone-600 text-sm leading-relaxed">
                      {res.evaluation.correctAnswerSummary}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
