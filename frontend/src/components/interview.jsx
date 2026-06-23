import { useParams } from "react-router-dom"; 
import { useEffect, useRef, useState } from "react";
import { AudioCapture } from "../utils/audioCapture.js";
import { EVENTS } from "../constants/event.js";
import { useNavigate } from "react-router-dom"; 



export function Interview() {
    const { interviewId } = useParams();
    const wsRef = useRef(null);
    const audioCaptureRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [finalTranscript, setFinalTranscript] = useState([]);
    const navigate = useNavigate();

    const speakText = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.5; // Adjust speaking rate if needed
        
        utterance.onend = () => {
            // resume audio capture when AI finishes
            audioCaptureRef.current?.start();
        };
        audioCaptureRef.current?.stop(); // pause audio capture while AI is speaking
        window.speechSynthesis.speak(utterance);
    };
    // WEBSOCKET SETUP
    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:3000`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({
                type: EVENTS.START_INTERVIEW,
                payload: { interviewId }
            }));

            // Start audio capture once WS is connected
            const capture = new AudioCapture({
                onAudioChunk: (chunk) => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                    // convert Float32 to Int16 and send as raw binary
                    const int16 = new Int16Array(chunk.length);
                    for (let i = 0; i < chunk.length; i++) {
                        int16[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32768));
                    }
                    wsRef.current.send(int16.buffer);
            },
                onSpeechStart: () => setIsSpeaking(true),
                onSpeechEnd: () => setIsSpeaking(false),
            });

            capture.start();
            audioCaptureRef.current = capture;
        };

        ws.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data);
            switch (type) {
                case EVENTS.INTERVIEW_STARTED:
                    console.log("Interview started");
                    break;
                case EVENTS.TRANSCRIPT_INTERIM:
                    setInterimTranscript(payload.text);
                    break;
                case EVENTS.TRANSCRIPT_FINAL:
                    setFinalTranscript(prev => [...prev, payload.text]);
                    setInterimTranscript("");
                    break;
                case EVENTS.AI_MESSAGE:
                    console.log('AI question:', payload.text);
                    setTimeout(() => speakText(payload.text), 500);
                    break;
                case EVENTS.INTERVIEW_ENDED:
                    wsRef.current?.close();
                    navigate(`/result/${interviewId}`);
                    break;
                default:
                    console.log("Unknown event type:", type);
            }
        };

        ws.onclose = () => setIsConnected(false);
        ws.onerror = (error) => console.error("WebSocket error:", error);

        return () => {
            audioCaptureRef.current?.stop();
            ws.close();
        };
    }, [interviewId]);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-semibold">AI Interview</h2>
            <p>Status: {isConnected ? "✅ Connected" : "Connecting..."}</p>
            <p>Speaking: {isSpeaking ? "🎙️ Speaking" : "🔇 Silent"}</p>
            <div className="border rounded-md p-4 w-1/2 min-h-40">
                <h3 className="font-semibold mb-2">Transcript:</h3>
                {finalTranscript.map((t, i) => (
                    <p key={i} className="text-gray-800">{t}</p>
                ))}
                {interimTranscript && (
                    <p className="text-gray-400 italic">{interimTranscript}</p>
                )}
            </div>
            <button
                onClick={() => {
                    window.speechSynthesis.cancel(); // stop any ongoing speech
                    audioCaptureRef.current?.stop();
                    wsRef.current?.send(JSON.stringify({
                        type: EVENTS.END_INTERVIEW,
                        payload:{ interviewId } //send interviewId to server so it can finalize and score the correct interview session
                    }))
                }}
                className="px-5 py-2 bg-red-500 text-white rounded-md"
            >
                End Interview
            </button>
        </div>
    );
}