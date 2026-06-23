export class AudioCapture {
    constructor({ onAudioChunk, onSpeechStart, onSpeechEnd }) {
        this.onAudioChunk = onAudioChunk;
        this.onSpeechStart = onSpeechStart;
        this.onSpeechEnd = onSpeechEnd;
        this.audioContext = null;
        this.stream = null;
        this.processor = null;
        this.isSpeaking = false;
        this.silenceTimeout = null;
        this.ENERGY_THRESHOLD = 0.005;  // adjust if too sensitive
        this.SILENCE_DELAY = 2000;       // ms of silence before marking speech end
    }

    async start() {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            } 
        });

        this.audioContext = new AudioContext({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.stream);

        // ScriptProcessorNode fires every 4096 samples with raw audio data
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0); // Float32Array
            const energy = this.getRMS(inputData);

            if (energy > this.ENERGY_THRESHOLD) {
                // Speech detected
                if (!this.isSpeaking) {
                    this.isSpeaking = true;
                    this.onSpeechStart?.();
                }

                // Clear any pending silence timeout
                if (this.silenceTimeout) {
                    clearTimeout(this.silenceTimeout);
                    this.silenceTimeout = null;
                }

                // Send audio chunk
                this.onAudioChunk(inputData);

            } else {
                // Silence detected
                if (this.isSpeaking && !this.silenceTimeout) {
                    this.silenceTimeout = setTimeout(() => {
                        this.isSpeaking = false;
                        this.onSpeechEnd?.();
                        this.silenceTimeout = null;
                    }, this.SILENCE_DELAY);
                }
            }
        };

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    }

    getRMS(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    stop() {
        this.processor?.disconnect();
        this.stream?.getTracks().forEach(t => t.stop());
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close();
        }
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        this.isSpeaking = false;
    }
}