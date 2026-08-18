/**
 * APTLY Gemini Live AudioWorklet Processor
 *
 * Captures Web Audio API PCM frames from browser microphone:
 * - Downmixes input channels to mono
 * - Resamples audio to 16,000 Hz signed 16-bit little-endian PCM
 * - Posts 20-40 ms PCM ArrayBuffers to the main thread for streaming
 */

class AptlyAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(480); // 30ms buffer at 16kHz (16000 * 0.03 = 480)
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    // Single channel or downmix left/right
    const channelData = input[0];
    if (!channelData) return true;

    // Downsample input to 16kHz Int16
    // AudioWorklet sampleRate is context sampleRate (typically 44100 or 48000)
    const ratio = Math.max(1, Math.round(sampleRate / 16000));

    for (let i = 0; i < channelData.length; i += ratio) {
      // Clamp float32 [-1.0, 1.0] to int16 [-32768, 32767]
      const s = Math.max(-1, Math.min(1, channelData[i]));
      const int16Sample = s < 0 ? s * 0x8000 : s * 0x7fff;

      this.buffer[this.bufferIndex++] = int16Sample;

      // When 30ms buffer is full, post ArrayBuffer to main thread
      if (this.bufferIndex >= this.buffer.length) {
        this.port.postMessage(this.buffer.buffer.slice(0));
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("aptly-audio-processor", AptlyAudioProcessor);
