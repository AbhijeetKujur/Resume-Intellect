import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const geminiApiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.GEMINI_API_KEY ||
  "";

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

function getAIClient(): GoogleGenAI {
  if (!ai) {
    throw new Error(
      "Gemini API key is missing. Create a .env.local file with GEMINI_API_KEY or VITE_GEMINI_API_KEY, then restart the dev server."
    );
  }
  return ai;
}

function parseJsonResponse<T>(rawText?: string): T {
  const text = rawText?.trim() || "{}";

  try {
    return JSON.parse(text) as T;
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1]) as T;
    }
    throw new Error("Invalid JSON returned by Gemini model.");
  }
}

export interface ResumeAnalysis {
  feedback: string;
  overallScore: number;
  interviewQuestions: {
    project: string;
    questions: string[];
  }[];
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export async function analyzeResume(input: { 
  text?: string; 
  image?: { data: string; mimeType: string };
  difficulty?: DifficultyLevel;
}): Promise<ResumeAnalysis> {
  const difficulty = input.difficulty || 'Medium';
  const prompt = `
    You are an expert technical recruiter and career coach with 20+ years of experience in top-tier tech companies. 
    Analyze the provided resume (either as text or an image) and provide a comprehensive, high-impact evaluation.
    
    The feedback should be structured as follows in Markdown:
    1. **Executive Summary**: A high-level overview of the candidate's profile.
    2. **Key Strengths**: Identify specific technical and soft skills that stand out, referencing specific projects or experiences.
    3. **Critical Areas for Improvement**: Provide actionable, specific advice on what's missing or what could be better (e.g., missing metrics, vague descriptions, skill gaps).
    4. **ATS Compatibility & Readability**: Evaluate how well the resume would perform in automated systems and its visual clarity.
    5. **Impact & Quantifiability**: Check if the candidate has used the "Action Verb + Task + Result" formula. Suggest where they can add numbers/metrics.
    6. **Project-Specific Deep Dive**: Briefly comment on the technical complexity of the mentioned projects.
    7. **Overall Career Rating**: A final verdict on their market readiness.
    8. **Resume Score**: A numerical score from 0 to 100 based on industry standards.

    Additionally, provide a list of specific interview questions based on the projects mentioned. Group questions by project.
    The difficulty level for these questions should be: **${difficulty}**.
    - Easy: Focus on basic concepts, definitions, and direct implementation details.
    - Medium: Focus on practical application, trade-offs, and common challenges.
    - Hard: Focus on deep architectural decisions, edge cases, optimization, and complex problem-solving.

    Return the response in JSON format with the following structure:
    {
      "feedback": "Comprehensive Markdown formatted feedback string",
      "overallScore": number,
      "interviewQuestions": [
        {
          "project": "Project Name",
          "questions": ["Question 1", "Question 2"]
        }
      ]
    }
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (input.image) {
    parts.push({
      inlineData: {
        data: input.image.data,
        mimeType: input.image.mimeType,
      },
    });
  } else if (input.text) {
    parts.push({ text: `Resume Text:\n${input.text}` });
  }

  try {
    const response: GenerateContentResponse = await getAIClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = parseJsonResponse<ResumeAnalysis>(response.text);
    return result as ResumeAnalysis;
  } catch (error) {
    console.error("Error analyzing resume:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to analyze resume. Please try again.");
  }
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  correctAnswerSummary: string;
}

export async function evaluateAnswer(question: string, answer: string): Promise<InterviewEvaluation> {
  const prompt = `
    You are an expert interviewer. Evaluate the following candidate's answer to the interview question.
    
    Question: ${question}
    Candidate's Answer: ${answer}

    Provide:
    1. A score from 0 to 10.
    2. Constructive feedback on the answer.
    3. A brief summary of what a perfect answer would have included.

    Return the response in JSON format:
    {
      "score": number,
      "feedback": "string",
      "correctAnswerSummary": "string"
    }
  `;

  try {
    const response: GenerateContentResponse = await getAIClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = parseJsonResponse<InterviewEvaluation>(response.text);
    return result as InterviewEvaluation;
  } catch (error) {
    console.error("Error evaluating answer:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to evaluate answer.");
  }
}

export async function getChatResponse(message: string, context?: string): Promise<string> {
  const prompt = `
    You are an expert career coach and technical mentor. 
    A user is asking a question to clear their doubts about their resume, interview preparation, or career in general.
    
    ${context ? `Context about the user's resume/interview:\n${context}` : ''}
    
    User's Question: ${message}
    
    Provide a helpful, encouraging, and professional response. Use markdown for formatting if needed.
  `;

  try {
    const response: GenerateContentResponse = await getAIClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Error getting chat response:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to get a response from the AI.");
  }
}
