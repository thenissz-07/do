export enum SkillType {
  READING = 'Reading',
  WRITING = 'Writing',
  LISTENING = 'Listening',
  SPEAKING = 'Speaking'
}

export interface DayPlan {
  day: number;
  topic: string;
  description: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
}

export interface LessonContent {
  title: string;
  contentBody: string; // Text to read, write prompt, script, or speaking scenario
  learningFocus?: string; // Key vocabulary, grammar tips, or useful expressions
  questions?: QuizQuestion[];
  audioData?: string; // Base64 for listening
}

// For Live API
export interface AudioBlob {
  data: string; // Base64
  mimeType: string;
}