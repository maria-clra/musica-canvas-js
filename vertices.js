const canvas = document.getElementById('c'); // DOM (linkado com o que tem no hmtl)
const ctx = canvas.getContext('2d'); // canvas é um canva kkkk dá pra fazer arte
let W = canvas.width, H = canvas.height;

const AudioCtx = window.AudioContext || window.webkitAudioContext; //gerencia tudo
let audioCtx = null;

const defaultScales = {
    'major': [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98], // C5, E5, G5, C6...
};

function freqFromNoteName(name) {
    if (!isNaN(parseFloat(name))) return parseFloat(name);
    const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const m = name.match(/^([A-G][b#]?)(\d)$/i);
    if (!m) return 440;
    const pitch = m[1];
    const octave = parseInt(m[2]);
    const noteIndex = notes[pitch];
    const a4 = 440;
    const noteNumber = (octave + 1) * 12 + noteIndex;
    return a4 * Math.pow(2, (noteNumber - 69) / 12);
} // matemática da música <3


const shapeSel = document.getElementById('shape');
const bpmEl = document.getElementById('bpm');
const bpmVal = document.getElementById('bpmVal');
const notesInputs = document.getElementById('notesInputs');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const currentNoteEl = document.getElementById('currentNote');

let sides = parseInt(shapeSel.value);
let bpm = parseInt(bpmEl.value);

function buildNoteInputs(n) {
    notesInputs.innerHTML = '';
    for (let i = 0; i < n; i++) {
        const div = document.createElement('div');
        div.style.marginTop = '6px';
        const inp = document.createElement('input');
        inp.value = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'][i] || (440 + i * 30);
        inp.dataset.idx = i;
        inp.style.width = '100%';
        div.appendChild(inp);
        notesInputs.appendChild(div);
    }
}
buildNoteInputs(sides);

function polygonVertices(cx, cy, r, n, rotation = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = rotation + i * 2 * Math.PI / n;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
}

let vertices = polygonVertices(W / 2, H / 2, Math.min(W, H) / 3, sides);

let playing = false;
let startTs = null;
let elapsed = 0;
let tPerEdge = null;
let edgeIndex = 0;
let position = 0;

function updateTiming() {
    bpm = parseInt(bpmEl.value);
    bpmVal.textContent = bpm;
    tPerEdge = 60000 / bpm;
}
updateTiming(); // Converte BPM para ms por batida

function playNote(freq) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(); // gera som
    const g = audioCtx.createGain(); // volume
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.4);
}

function step(ts) {
    if (!startTs) startTs = ts - elapsed;
    elapsed = ts - startTs;
    if (playing) {
        const totalMs = elapsed;
        const edge = Math.floor(totalMs / tPerEdge) % vertices.length;
        edgeIndex = edge;
        const msInto = totalMs % tPerEdge;
        position = msInto / tPerEdge;
    }
    draw();
    requestAnimationFrame(step);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4caf50';
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        if (i === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.stroke();

    for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        ctx.fillStyle = (i === edgeIndex) ? '#ffcc00' : '#ffffff';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    const a = vertices[edgeIndex];
    const b = vertices[(edgeIndex + 1) % vertices.length];
    const px = a.x + (b.x - a.x) * position;
    const py = a.y + (b.y - a.y) * position;

    ctx.fillStyle = '#ff4081';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
}

let lastEdge = -1;
function audioWatcher() {
    if (playing) {
        const triggeredEdge = edgeIndex;
        if (triggeredEdge !== lastEdge) {
            const noteInput = notesInputs.children[triggeredEdge].firstChild;
            const noteText = noteInput.value.trim();
            const freq = freqFromNoteName(noteText);
            playNote(freq);
            currentNoteEl.textContent = noteText;
            lastEdge = triggeredEdge;
        }
    } else {
        lastEdge = -1;
    }
    requestAnimationFrame(audioWatcher);
}

shapeSel.addEventListener('change', () => {
    sides = parseInt(shapeSel.value);
    buildNoteInputs(sides);
    vertices = polygonVertices(W / 2, H / 2, Math.min(W, H) / 3, sides);
    reset();
});

bpmEl.addEventListener('input', () => { updateTiming(); });

playBtn.addEventListener('click', () => {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (!playing) {
        playing = true;
        startTs = null;
        elapsed = 0;
    }
});

pauseBtn.addEventListener('click', () => {
    playing = false;
});

resetBtn.addEventListener('click', reset);

function reset() {
    playing = false;
    startTs = null;
    elapsed = 0;
    edgeIndex = 0;
    position = 0;
    currentNoteEl.textContent = '—';
} // voltar do zero!

window.addEventListener('resize', () => { W = canvas.width = canvas.clientWidth; H = canvas.height = canvas.clientHeight; vertices = polygonVertices(W / 2, H / 2, Math.min(W, H) / 3, sides); });

requestAnimationFrame(step);
requestAnimationFrame(audioWatcher);