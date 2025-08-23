// Minimal VTT parser for blocks like:
// index\n00:00:00.240 --> 00:00:01.520\nText\n
export function parseVTT(content) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  let i = 0;

  // skip header lines until a blank or numeric index
  while (i < lines.length && lines[i].trim().toUpperCase() === "WEBVTT") i++;

  while (i < lines.length) {
    // optional numeric index
    if (/^\d+$/.test(lines[i].trim())) i++;

    // timestamp line
    const ts = lines[i] || "";
    const m = ts.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );
    if (!m) {
      i++;
      continue;
    }
    const start = m[1];
    const end = m[2];
    i++;

    // accumulate until blank line
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i].trim());
      i++;
    }
    const text = textLines.join(" ");
    if (text) segments.push({ start, end, text });

    // skip blank separator
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  return segments;
}
