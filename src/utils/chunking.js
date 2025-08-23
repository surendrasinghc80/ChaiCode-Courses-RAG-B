// Simple sentence aggregation into ~N seconds windows based on timestamps

function timeToSeconds(t) {
  const [hh, mm, ssMs] = t.split(":");
  const [ss, ms] = ssMs.split(".");
  return (
    parseInt(hh) * 3600 +
    parseInt(mm) * 60 +
    parseInt(ss) +
    parseInt(ms || "0") / 1000
  );
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  const ms = "000"; // keep ms zeroed for simplicity
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function chunkSegments(segments, { windowSeconds = 45 } = {}) {
  if (!Array.isArray(segments)) return [];
  const chunks = [];
  let buffer = [];
  let windowStart = null;

  for (const seg of segments) {
    const startSec = timeToSeconds(seg.start);
    const endSec = timeToSeconds(seg.end);
    if (windowStart === null) windowStart = startSec;
    const windowEnd = windowStart + windowSeconds;

    // if current segment exceeds the window, flush buffer
    if (endSec > windowEnd && buffer.length > 0) {
      const chunkStart = buffer[0].start;
      const chunkEnd = buffer[buffer.length - 1].end;
      const text = buffer.map((b) => b.text).join(" ");
      chunks.push({ start: chunkStart, end: chunkEnd, text });
      buffer = [];
      windowStart = startSec; // reset window from this segment
    }

    buffer.push(seg);
  }

  if (buffer.length) {
    const chunkStart = buffer[0].start;
    const chunkEnd = buffer[buffer.length - 1].end;
    const text = buffer.map((b) => b.text).join(" ");
    chunks.push({ start: chunkStart, end: chunkEnd, text });
  }

  return chunks;
}
