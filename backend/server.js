import app from './app.js';
import dotenv from 'dotenv';
import { createServer, get } from 'http';
import { WebSocketServer } from 'ws';
import {EVENTS} from './constants/events.js';
import prisma from './db.js';
dotenv.config();
import { createDeepgramConnection } from './services/deepgram.js';
import { getNextQuestion, scoreInterview } from './services/llm.js';



const PORT = process.env.PORT || 3000;
const server=createServer(app);
const wss=new WebSocketServer({server});
// add this temporarily in server.js after your imports
console.log('API KEY:', process.env.DEEPGRAM_API_KEY);
wss.on('connection',(socket)=>{
    console.log('client connected');
    let deepgramConnection=null;
    let githubMetadata=null;
    let conversationHistory=[];
    socket.on('message',async (message,isBinary)=>{
        if (isBinary) {
            try {
                if (deepgramConnection && deepgramConnection.readyState === 1) {
                    deepgramConnection.sendMedia(Buffer.from(message));
                }
            } catch(e) {
                console.error('Deepgram send error:', e.message);
            }
            return;
        }
        try{
            const data=JSON.parse(message.toString());
            switch(data.type){
                case EVENTS.START_INTERVIEW:
                    // Here you can add logic to start the interview process, e.g., create a new interview session, fetch questions, etc.
                    console.log('Starting interview for:', data.payload);
                    const interview=await prisma.interview.findUnique({
                        where:{id:data.payload.interviewId}
                    });
                    console.log('githubMetadata:', interview.githubMetadata);
                    githubMetadata=interview.githubMetadata;
                    githubMetadata = [...githubMetadata].sort(() => Math.random() - 0.5);
                    deepgramConnection = await createDeepgramConnection(socket,async(transcript)=>{
                        console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(deepgramConnection)));
                        // When a final transcript is received, add it to the conversation history and get the next question
                        conversationHistory.push({ role: 'user', parts: [{ text: transcript }] });
                        const nextQuestion = await getNextQuestion(githubMetadata, conversationHistory);
                        conversationHistory.push({ role: 'model', parts: [{ text: nextQuestion }] });
                        socket.send(JSON.stringify({ type: EVENTS.AI_MESSAGE, payload: { text: nextQuestion } }));
                    });

                    const firstQuestion = await getNextQuestion(githubMetadata, []);
                    conversationHistory.push({ role: 'model', parts: [{ text: firstQuestion }] });
                    socket.send(JSON.stringify({ type: EVENTS.INTERVIEW_STARTED }));
                    socket.send(JSON.stringify({ type: EVENTS.AI_MESSAGE, payload: { text: firstQuestion } }));
                    break;
                case EVENTS.AUDIO_CHUNK:
                    if(deepgramConnection){
                        const float32 = new Float32Array(data.payload.audio);
                        console.log('Audio sample values:', float32[0], float32[100], float32[500]);
                        const int16 = new Int16Array(float32.length);
                        for (let i = 0; i < float32.length; i++) {
                            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
                        }
                        deepgramConnection.sendMedia(Buffer.from(int16.buffer));
                    }
                    console.log('Received audio chunk of size:', data.payload.audio.length);
                    // For demonstration, we will just send an interim transcript back to the client
                    socket.send(JSON.stringify({ type: EVENTS.TRANSCRIPT_INTERIM, payload: { text: 'Interim transcript...' } }));
                    break;
                case EVENTS.END_INTERVIEW:
                    console.log('conversation history length:', conversationHistory.length);
                    console.log('conversation history:', JSON.stringify(conversationHistory, null, 2));

                    if (deepgramConnection) {
                        deepgramConnection.close();
                        deepgramConnection = null;
                    }

                    let scores = { knowledge: 0, communication: 0, technicalSkills: 0, thoughtProcess: 0, summary: 'Interview ended early.' };
                    
                    if (conversationHistory.length >= 2) {
                        try {
                            scores = await scoreInterview(conversationHistory);
                        } catch (err) {
                            console.error('Scoring failed:', err);
                        }
                    }

                    await prisma.interview.update({
                        where: { id: data.payload.interviewId },
                        data: {
                            status: 'COMPLETED',
                            score: scores.knowledge + scores.communication + 
                                scores.technicalSkills + scores.thoughtProcess,
                            knowledge: scores.knowledge,
                            communication: scores.communication,
                            technicalSkills: scores.technicalSkills,
                            thoughtProcess: scores.thoughtProcess,
                            summary: scores.summary,
                        }
                    });

                    socket.send(JSON.stringify({ 
                        type: EVENTS.INTERVIEW_ENDED,
                        payload: { scores } 
                    }));
                    break;
                default:
                    console.log('Unknown event type:', data.type);
            }
        }catch(error){
            console.error('Error parsing message:', error);
        }
    });
    socket.on('close',()=>{
        console.log('client disconnected');
        if(deepgramConnection){
            deepgramConnection.close();
            deepgramConnection=null;
        }
    });
});

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});