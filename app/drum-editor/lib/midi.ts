import {
  type DrumNote,
  type EditorState,
  GM_DRUM_MAP,
  DEFAULT_BPM,
  DEFAULT_MEASURES,
  DEFAULT_TICKS_PER_BEAT,
  DEFAULT_INSTRUMENTS,
} from "./types";

// ── MIDI Parser ──

function readVarLen(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let i = offset;
  let byte: number;
  do {
    byte = data[i++];
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return [value, i];
}

function readUint16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  );
}

interface RawMidiNote {
  note: number;
  velocity: number;
  tickAbsolute: number;
}

interface ParsedMidi {
  format: number;
  ticksPerQuarter: number;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  drumNotes: RawMidiNote[];
}

export function parseMidi(buffer: ArrayBuffer): EditorState {
  const data = new Uint8Array(buffer);
  let pos = 0;

  // Read header
  const headerTag = String.fromCharCode(data[0], data[1], data[2], data[3]);
  if (headerTag !== "MThd") throw new Error("Invalid MIDI file");
  pos = 4;
  const headerLen = readUint32(data, pos);
  pos += 4;
  const format = readUint16(data, pos);
  pos += 2;
  const numTracks = readUint16(data, pos);
  pos += 2;
  const division = readUint16(data, pos);
  pos += 2;

  // Skip any extra header bytes
  pos = 8 + headerLen;

  const ticksPerQuarter = division & 0x7fff;

  const result: ParsedMidi = {
    format,
    ticksPerQuarter,
    bpm: DEFAULT_BPM,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    drumNotes: [],
  };

  // Parse tracks
  for (let t = 0; t < numTracks; t++) {
    if (pos + 8 > data.length) break;
    const trackTag = String.fromCharCode(
      data[pos],
      data[pos + 1],
      data[pos + 2],
      data[pos + 3]
    );
    pos += 4;
    const trackLen = readUint32(data, pos);
    pos += 4;

    if (trackTag !== "MTrk") {
      pos += trackLen;
      continue;
    }

    const trackEnd = pos + trackLen;
    let tickAbsolute = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      const [delta, newPos] = readVarLen(data, pos);
      pos = newPos;
      tickAbsolute += delta;

      if (pos >= trackEnd) break;

      let statusByte = data[pos];

      // Meta event
      if (statusByte === 0xff) {
        pos++;
        const metaType = data[pos++];
        const [metaLen, metaPos] = readVarLen(data, pos);
        pos = metaPos;

        if (metaType === 0x51 && metaLen === 3) {
          // Set tempo
          const microsPerQuarter =
            (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
          result.bpm = Math.round(60000000 / microsPerQuarter);
        } else if (metaType === 0x58 && metaLen >= 2) {
          // Time signature
          result.timeSignatureNumerator = data[pos];
          result.timeSignatureDenominator = Math.pow(2, data[pos + 1]);
        }

        pos += metaLen;
        continue;
      }

      // SysEx
      if (statusByte === 0xf0 || statusByte === 0xf7) {
        pos++;
        const [sysexLen, sysexPos] = readVarLen(data, pos);
        pos = sysexPos + sysexLen;
        continue;
      }

      // Channel message
      if (statusByte & 0x80) {
        runningStatus = statusByte;
        pos++;
      } else {
        statusByte = runningStatus;
      }

      const msgType = statusByte & 0xf0;
      const channel = statusByte & 0x0f;

      if (
        msgType === 0x80 ||
        msgType === 0x90 ||
        msgType === 0xa0 ||
        msgType === 0xb0 ||
        msgType === 0xe0
      ) {
        const byte1 = data[pos++];
        const byte2 = data[pos++];

        // Note On on channel 10 (index 9)
        if (msgType === 0x90 && channel === 9 && byte2 > 0) {
          result.drumNotes.push({
            note: byte1,
            velocity: byte2,
            tickAbsolute: tickAbsolute,
          });
        }
      } else if (msgType === 0xc0 || msgType === 0xd0) {
        pos++; // 1 data byte
      }
    }

    pos = trackEnd;
  }

  // Convert to EditorState
  const ticksPerGridCell = ticksPerQuarter / DEFAULT_TICKS_PER_BEAT;
  const beatsPerMeasure = result.timeSignatureNumerator;
  const gridCellsPerMeasure = beatsPerMeasure * DEFAULT_TICKS_PER_BEAT;

  // Find max tick to determine measures
  let maxTick = 0;
  for (const n of result.drumNotes) {
    if (n.tickAbsolute > maxTick) maxTick = n.tickAbsolute;
  }
  const maxGridTick = Math.ceil(maxTick / ticksPerGridCell);
  const measures = Math.max(
    DEFAULT_MEASURES,
    Math.ceil((maxGridTick + 1) / gridCellsPerMeasure)
  );

  // Convert notes
  const notes: DrumNote[] = result.drumNotes.map((n) => ({
    note: n.note,
    tick: Math.round(n.tickAbsolute / ticksPerGridCell),
    velocity: n.velocity,
  }));

  // Determine instruments
  const usedNotes = new Set(notes.map((n) => n.note));
  let instruments: number[];
  if (usedNotes.size > 0) {
    // Include all used notes, plus defaults that are known
    const allNotes = new Set([...DEFAULT_INSTRUMENTS, ...usedNotes]);
    instruments = Array.from(allNotes).sort((a, b) => {
      // Cymbals on top, kick on bottom
      const order = [49, 51, 46, 44, 42, 39, 37, 40, 38, 50, 48, 47, 45, 35, 36];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  } else {
    instruments = [...DEFAULT_INSTRUMENTS];
  }

  return {
    notes,
    bpm: result.bpm,
    timeSignatureNumerator: result.timeSignatureNumerator,
    timeSignatureDenominator: result.timeSignatureDenominator,
    measures,
    ticksPerBeat: DEFAULT_TICKS_PER_BEAT,
    instruments,
  };
}

// ── MIDI Writer ──

function writeVarLen(value: number): number[] {
  if (value < 0) value = 0;
  const bytes: number[] = [];
  bytes.unshift(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function writeUint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function writeUint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

export function writeMidi(state: EditorState): ArrayBuffer {
  const ticksPerQuarter = 480;
  const ticksPerGridCell = ticksPerQuarter / state.ticksPerBeat;

  // Build track data
  const trackBytes: number[] = [];

  // Tempo meta event (delta=0)
  const microsPerQuarter = Math.round(60000000 / state.bpm);
  trackBytes.push(
    0x00, // delta
    0xff,
    0x51,
    0x03,
    (microsPerQuarter >> 16) & 0xff,
    (microsPerQuarter >> 8) & 0xff,
    microsPerQuarter & 0xff
  );

  // Time signature meta event (delta=0)
  const denomPower = Math.log2(state.timeSignatureDenominator);
  trackBytes.push(
    0x00, // delta
    0xff,
    0x58,
    0x04,
    state.timeSignatureNumerator,
    denomPower,
    24, // MIDI clocks per metronome click
    8 // 32nd notes per quarter
  );

  // Sort notes by tick
  const sortedNotes = [...state.notes].sort((a, b) => a.tick - b.tick);

  // Create note events: note-on then immediate note-off (short duration for drums)
  interface MidiEvent {
    tick: number;
    data: number[];
  }
  const events: MidiEvent[] = [];

  for (const note of sortedNotes) {
    const absTick = Math.round(note.tick * ticksPerGridCell);
    // Note On
    events.push({
      tick: absTick,
      data: [0x99, note.note, note.velocity], // channel 10
    });
    // Note Off (short duration: 1 tick after)
    events.push({
      tick: absTick + Math.round(ticksPerGridCell / 2),
      data: [0x89, note.note, 0],
    });
  }

  // Sort events by tick, note-on before note-off for same tick
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return (a.data[0] & 0xf0) === 0x90 ? -1 : 1;
  });

  // Write events with delta times
  let lastTick = 0;
  for (const evt of events) {
    const delta = evt.tick - lastTick;
    trackBytes.push(...writeVarLen(delta));
    trackBytes.push(...evt.data);
    lastTick = evt.tick;
  }

  // End of track
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // Build complete file
  const fileBytes: number[] = [];

  // Header: MThd
  fileBytes.push(0x4d, 0x54, 0x68, 0x64); // "MThd"
  fileBytes.push(...writeUint32(6)); // header length
  fileBytes.push(...writeUint16(0)); // format 0
  fileBytes.push(...writeUint16(1)); // 1 track
  fileBytes.push(...writeUint16(ticksPerQuarter)); // ticks per quarter

  // Track: MTrk
  fileBytes.push(0x4d, 0x54, 0x72, 0x6b); // "MTrk"
  fileBytes.push(...writeUint32(trackBytes.length));
  fileBytes.push(...trackBytes);

  return new Uint8Array(fileBytes).buffer;
}
