import { DeepgramClient } from '@deepgram/sdk';
import { EVENTS } from '../constants/events.js';

export const createDeepgramConnection = async (socket,onFinalTranscript) => { // Accept a callback function for final transcript
    let accumulatedTranscript = '';
    let silenceTimer=null;
    const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
    const connection = await deepgram.listen.v1.connect({
        model: 'nova-3',
        language: 'en-US',
        smart_format: 'true',
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
    });

    connection.on('open', () => {
        console.log('Deepgram connection opened');
        const keepAlive = setInterval(() => {
            try {
                if (connection.readyState === 1) {
                    connection.sendKeepAlive({ type: 'KeepAlive' });
                } else {
                    clearInterval(keepAlive);
                }
            } catch(e) {
                clearInterval(keepAlive);
            }
        }, 3000);

        connection.keepAliveInterval = keepAlive;
    });

    connection.on('message', (data) => {
        if (typeof data === 'string') data = JSON.parse(data);
        
        if (data.type === 'Results' && data.is_final) {
            const transcript = data.channel.alternatives[0].transcript;
            if (!transcript) return;
            accumulatedTranscript += ' ' + transcript;
            socket.send(JSON.stringify({
                type: EVENTS.TRANSCRIPT_INTERIM,
                payload: { text: accumulatedTranscript.trim() }
            }));
        }

        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            if (!accumulatedTranscript.trim()) return;
            socket.send(JSON.stringify({
                type: EVENTS.TRANSCRIPT_FINAL,
                payload: { text: accumulatedTranscript.trim() }
            }));
            onFinalTranscript(accumulatedTranscript.trim());
            accumulatedTranscript = '';
        }, 10000); // 3 seconds of silence = done speaking
    });

    connection.on('error', (err) => {
        console.error('Deepgram error:', err);
        socket.send(JSON.stringify({
            type: EVENTS.ERROR,
            payload: { message: 'Deepgram error' }
        }));
    });

    connection.on('close', () => {
        console.log('Deepgram connection closed');
        clearInterval(connection.keepAliveInterval);
    });

    connection.connect();
    await connection.waitForOpen();

    return connection;
};