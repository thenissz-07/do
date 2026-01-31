import { GoogleGenAI, Type, Modality } from '@google/genai';
import { LessonContent, SkillType } from '../types';

// NOTE: In a real production app, never expose keys on client.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// Helper to handle API errors gracefully
const handleApiError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  const msg = error.message || '';
  if (msg.includes('429')) return new Error("Service is busy (Quota Exceeded). Please try again in a moment.");
  if (msg.includes('503')) return new Error("Service unavailable. Please check your connection or try again.");
  if (msg.includes('API key')) return new Error("Invalid API Key. Please check your configuration.");
  return new Error("Failed to generate content. Please try again.");
};

// -- GENERATE LESSON CONTENT --
export const generateLessonContent = async (topic: string, description: string, skill: SkillType): Promise<LessonContent> => {
  try {
    const modelId = 'gemini-3-flash-preview';
    
    let systemInstruction = `You are an expert English teacher (ESL). 
    Create a lesson for an A2 student moving to B1.
    Topic: ${topic}. Skill: ${skill}. Context: ${description}`;

    let prompt = "";
    let responseSchema: any = null;

    // Common Schema parts
    const baseProperties = {
      title: { type: Type.STRING },
      contentBody: { type: Type.STRING },
      learningFocus: { type: Type.STRING, description: "Key vocabulary, grammar points, or useful phrases for this lesson." }
    };

    if (skill === SkillType.READING) {
      prompt = `Write a 200-250 word text about "${topic}" suitable for CEFR B1 level.
      Include a 'learningFocus' section listing 3-5 key vocabulary words from the text with definitions.
      Then provide 3 comprehension questions.`;
      
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          ...baseProperties,
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER }
              }
            }
          }
        },
        required: ["title", "contentBody", "learningFocus", "questions"]
      };
    } else if (skill === SkillType.WRITING) {
      prompt = `Create an essay writing prompt about "${topic}". 
      The task is to write a short essay (120-180 words) with a clear Introduction, Body, and Conclusion.
      Provide the specific essay question in 'contentBody'. 
      In 'learningFocus', provide:
      1. A recommended structure (e.g., "Para 1: Intro, Para 2: Example, Para 3: Conclusion")
      2. 3-5 useful linking words (e.g., However, Furthermore, In conclusion).`;
      
      responseSchema = {
        type: Type.OBJECT,
        properties: baseProperties,
        required: ["title", "contentBody", "learningFocus"]
      };
    } else if (skill === SkillType.LISTENING) {
       prompt = `Write a script for a listening exercise about "${topic}" (B1 level).
       In 'learningFocus', list 3 idioms or phrasal verbs used in the script.
       Also provide 3 multiple choice questions based on the script.`;
       
       responseSchema = {
        type: Type.OBJECT,
        properties: {
          ...baseProperties,
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER }
              }
            }
          }
        },
        required: ["title", "contentBody", "learningFocus", "questions"]
      };
    } else if (skill === SkillType.SPEAKING) {
      prompt = `Design a roleplay scenario for practicing speaking about "${topic}".
      'contentBody': Describe the situation to the student (e.g., "You are at a restaurant...").
      'learningFocus': List 3-5 useful expressions or questions the student can use in this conversation.
      'title': A catchy title for the roleplay.`;

      responseSchema = {
        type: Type.OBJECT,
        properties: baseProperties,
        required: ["title", "contentBody", "learningFocus"]
      };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: systemInstruction
      }
    });

    if (!response.text) throw new Error("No content generated from model.");
    return JSON.parse(response.text) as LessonContent;

  } catch (error) {
    throw handleApiError(error, 'generateLessonContent');
  }
};

// -- TEXT TO SPEECH --
export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash-preview-tts';
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate speech bytes.");
    return base64Audio;
  } catch (error) {
     throw handleApiError(error, 'generateSpeech');
  }
};

// -- GRADE WRITING --
export const gradeWriting = async (topic: string, userText: string) => {
  try {
    const modelId = 'gemini-3-flash-preview';
    const prompt = `Topic: ${topic}.
    Student Essay Submission: "${userText}".
    
    Act as an English teacher grading a B1 level essay.
    1. Score out of 100 based on Grammar, Vocabulary, and Structure/Flow.
    2. Provide a corrected version of the essay.
    3. Feedback: Specifically mention how well they followed essay structure (Intro/Body/Conclusion) and used linking words.
    
    Return JSON.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            correctedText: { type: Type.STRING },
            feedback: { type: Type.STRING }
          }
        }
      }
    });
    
    if (!response.text) throw new Error("No grading returned.");
    return JSON.parse(response.text);
  } catch (error) {
    throw handleApiError(error, 'gradeWriting');
  }
};

// -- LIVE API --
export const getLiveClient = () => {
    return ai.live;
}