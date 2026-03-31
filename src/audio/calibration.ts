export function calibrateNoiseFloor(
  analyser: AnalyserNode,
  durationMs = 3000
): Promise<number> {
  return new Promise((resolve) => {
    const buffer = new Uint8Array(analyser.fftSize);
    const peaks: number[] = [];
    const startTime = Date.now();

    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const val = Math.abs(buffer[i] - 128) / 128;
        if (val > peak) peak = val;
      }
      peaks.push(peak);

      if (Date.now() - startTime >= durationMs) {
        clearInterval(interval);
        // Average peak amplitude as noise floor
        const avg = peaks.reduce((a, b) => a + b, 0) / peaks.length;
        resolve(avg);
      }
    }, 50);
  });
}
