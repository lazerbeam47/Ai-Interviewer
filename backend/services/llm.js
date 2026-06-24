import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const getNextQuestion = async (githubMetadata, conversationHistory) => {
    const systemPrompt = `You are a technical interviewer named Alex conducting a real interview.
The candidate has these GitHub projects:
${JSON.stringify(githubMetadata, null, 2)}

Rules:
- Your name is Alex, never use placeholders like [My Name] or [Candidate Name]
- Do not ask for the candidate's name, just start the interview
- Pick a random project to begin with, not the first one
- Ask exactly one question per response
- Cover at least 3 different projects across the interview
- Ask maximum 2-3 follow up questions per project then move on
- Keep it conversational and concise`;

    try {
        const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: conversationHistory.length === 0
                ? [{ role: 'user', parts: [{ text: 'Start the interview' }] }]
                : conversationHistory,
            config: { systemInstruction: systemPrompt }
        });
        return response.text;
    } catch (err) {
        console.log('Gemini failed, falling back to Groq:', err.message);
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.map(m => ({
                    role: m.role === 'model' ? 'assistant' : 'user',
                    content: m.parts[0].text
                })),
                ...(conversationHistory.length === 0 
                    ? [{ role: 'user', content: 'Start the interview' }] 
                    : [])
            ]
        });
        return response.choices[0].message.content;
    }
};

export const scoreInterview = async (conversationHistory) => {
    const systemPrompt = `You are an expert technical interviewer. 
    Based on the interview conversation, rate the candidate.
    Return ONLY a valid JSON object with exactly these fields, no other text, no markdown:
    {"knowledge": 0, "communication": 0, "technicalSkills": 0, "thoughtProcess": 0, "summary": ""}
    All scores are integers between 0 and 10.`;

    const messages = [
        ...conversationHistory.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts[0].text
        })),
        { role: 'user', content: 'Please provide the final evaluation scores as JSON.' }
    ];

    try {
        const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                ...conversationHistory,
                { role: 'user', parts: [{ text: 'Please provide the final evaluation scores as JSON.' }] }
            ],
            config: { systemInstruction: systemPrompt }
        });
        const text = response.text.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
            console.log('Gemini failed, falling back to Groq:', err.message);
            try {
                const response = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ]
                });
                const text = response.choices[0].message.content.replace(/```json|```/g, '').trim();
                console.log('Groq response:', text); // ← add this
                return JSON.parse(text);
            } catch (groqErr) {
                console.error('Groq also failed:', groqErr.message); // ← add this
                return { knowledge: 0, communication: 0, technicalSkills: 0, thoughtProcess: 0, summary: 'Scoring failed' };
            }
        }
        const text = response.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    }
