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
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [aiMessages, setAiMessages] = useState([]);
    const [userTranscripts, setUserTranscripts] = useState([]);
    const navigate = useNavigate();
    const aiEndRef = useRef(null);
    const userEndRef = useRef(null);

    const speakText = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.5;
        utterance.onstart = () => setIsAISpeaking(true);
        utterance.onend = () => {
            setIsAISpeaking(false);
            audioCaptureRef.current?.start();
        };
        audioCaptureRef.current?.stop();
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages]);

    useEffect(() => {
        userEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [userTranscripts, interimTranscript]);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:3000`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({
                type: EVENTS.START_INTERVIEW,
                payload: { interviewId }
            }));

            const capture = new AudioCapture({
                onAudioChunk: (chunk) => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
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
                    setUserTranscripts(prev => [...prev, payload.text]);
                    setInterimTranscript("");
                    break;
                case EVENTS.AI_MESSAGE:
                    setAiMessages(prev => [...prev, payload.text]);
                    setTimeout(() => speakText(payload.text), 500);
                    break;
                case EVENTS.INTERVIEW_ENDED:
                    wsRef.current?.close();
                    navigate(`/result/${interviewId}`, { replace: true });
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
    }, [interviewId, navigate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px', gap: '16px', fontFamily: 'sans-serif' }}>
            
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isConnected ? '#22c55e' : '#ef4444',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {isConnected ? 'Interview in progress' : 'Connecting...'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888', border: '0.5px solid #e5e5e5', borderRadius: '20px', padding: '4px 12px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }} />
                        {isConnected ? 'connected' : 'disconnected'}
                    </div>
                    <button
                        onClick={() => {
                            window.speechSynthesis.cancel();
                            audioCaptureRef.current?.stop();
                            wsRef.current?.send(JSON.stringify({
                                type: EVENTS.END_INTERVIEW,
                                payload: { interviewId }
                            }));
                        }}
                        style={{ fontSize: '12px', fontWeight: '500', background: 'transparent', border: '0.5px solid #333', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.02em' }}
                    >
                        End interview
                    </button>
                </div>
            </div>

            {/* panels */}
            <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
                
                {/* AI panel */}
                <div style={{ flex: 1, border: '0.5px solid #e5e5e5', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>
                            Alex — Interviewer
                        </span>
                        {isAISpeaking && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                                    {[0, 0.1, 0.2].map((delay, i) => (
                                        <div key={i} style={{
                                            width: '3px', borderRadius: '2px', background: '#333',
                                            animation: `wave 1s ${delay}s ease-in-out infinite`
                                        }} />
                                    ))}
                                </div>
                                speaking
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {aiMessages.map((msg, i) => (
                            <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', background: '#f5f5f5', border: '0.5px solid #e5e5e5' }}>
                                {msg}
                            </div>
                        ))}
                        <div ref={aiEndRef} />
                    </div>
                </div>

                {/* User panel */}
                <div style={{ flex: 1, border: '0.5px solid #e5e5e5', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>
                            You — Candidate
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSpeaking ? '#22c55e' : '#ccc' }} />
                            {isSpeaking ? 'speaking' : 'listening'}
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {userTranscripts.map((t, i) => (
                            <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', background: '#111', color: '#fff' }}>
                                {t}
                            </div>
                        ))}
                        {interimTranscript && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', border: '0.5px dashed #ccc', color: '#999', fontStyle: 'italic' }}>
                                {interimTranscript}
                            </div>
                        )}
                        <div ref={userEndRef} />
                    </div>
                </div>
            </div>

            {/* footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    🎙️
                </div>
                <span style={{ fontSize: '12px', color: '#bbb' }}>Speak naturally — pauses are detected automatically</span>
            </div>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes wave { 0%,100%{height:4px} 50%{height:12px} }
            `}</style>
        </div>
    );
}