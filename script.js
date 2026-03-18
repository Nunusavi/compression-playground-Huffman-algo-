// ============================================================
// CONSTANTS
// ============================================================
// Shared layout config for both the stepper tree and final tree.
// Must be identical for both so that node._pos values are consistent.
const TREE_LAYOUT_CFG = { levelGap: 80, siblingGap: 22, nodeRadius: 18, fontSize: 12 };

// ============================================================
// NODE & PRIORITY QUEUE
// ============================================================
class Node {
    constructor(char, freq, left = null, right = null) {
        this.char = char;
        this.freq = freq;
        this.left = left;
        this.right = right;
        // _createdAtStep: 0 for leaves, N for the Nth merge (set by buildHuffmanTreeWithSteps)
        // _mergingAtStep: N if this node is consumed in the Nth merge
        // _pos, _subWidth: mutated by buildSvgTree on every call
    }
}

class PriorityQueue {
    constructor() { this.elements = []; }
    enqueue(node) {
        this.elements.push(node);
        this.elements.sort((a, b) => a.freq - b.freq);
    }
    dequeue() { return this.elements.shift(); }
    size() { return this.elements.length; }
}

// ============================================================
// HUFFMAN ALGORITHM
// ============================================================
function buildHuffmanTree(text) {
    if (!text) return null;
    const freqMap = new Map();
    for (const char of text) freqMap.set(char, (freqMap.get(char) || 0) + 1);
    const pq = new PriorityQueue();
    for (const [char, freq] of freqMap.entries()) pq.enqueue(new Node(char, freq));
    if (pq.size() === 1) { const n = pq.dequeue(); return new Node(null, n.freq, n); }
    while (pq.size() > 1) {
        const left = pq.dequeue(), right = pq.dequeue();
        pq.enqueue(new Node(null, left.freq + right.freq, left, right));
    }
    return pq.dequeue();
}

function buildHuffmanTreeWithSteps(text) {
    if (!text) return { root: null, freqMap: new Map(), steps: [] };
    const freqMap = new Map();
    for (const char of text) freqMap.set(char, (freqMap.get(char) || 0) + 1);

    const pq = new PriorityQueue();
    for (const [char, freq] of freqMap.entries()) {
        const n = new Node(char, freq);
        n._createdAtStep = 0;  // all leaf nodes exist before any merge
        pq.enqueue(n);
    }

    const steps = [];
    // Step 0: initial state, no merges yet
    steps.push({
        stepNum: 0,
        description: `Initialize: ${pq.size()} unique character${pq.size() !== 1 ? 's' : ''} inserted into a min-heap priority queue, ordered by frequency (lowest = highest priority). The algorithm will repeatedly extract the two minimum nodes and merge them.`,
        queueItems: pq.elements.map(n => ({ char: n.char, freq: n.freq, isNew: false, ref: n })),
        mergeLeft: null, mergeRight: null, merged: null,
    });

    if (pq.size() === 1) {
        const only = pq.dequeue();
        const root = new Node(null, only.freq, only);
        root._createdAtStep = 1;
        steps.push({
            stepNum: 1,
            description: 'Single unique character — wrapped in a root node. Tree complete.',
            queueItems: [{ char: null, freq: root.freq, isNew: true, ref: root }],
            mergeLeft: only, mergeRight: null, merged: root,
        });
        return { root, freqMap, steps };
    }

    let mergeNum = 0;
    while (pq.size() > 1) {
        mergeNum++;
        const left = pq.dequeue();
        const right = pq.dequeue();
        const parent = new Node(null, left.freq + right.freq, left, right);
        parent._createdAtStep = mergeNum;
        left._mergingAtStep = mergeNum;
        right._mergingAtStep = mergeNum;
        pq.enqueue(parent);

        const lbl = n => n.char !== null
            ? `'${n.char === ' ' ? 'SPACE' : n.char}' (freq: ${n.freq})`
            : `internal node (freq: ${n.freq})`;
        const isFinal = pq.size() === 1;

        steps.push({
            stepNum: mergeNum,
            description: isFinal
                ? `Final merge: Combine ${lbl(left)} and ${lbl(right)} into the root (freq: ${parent.freq}). Tree complete! Higher-frequency characters ended up closer to the root and have shorter codes.`
                : `Merge ${mergeNum}: Dequeue ${lbl(left)} and ${lbl(right)} — the two lowest-frequency items. Combine into a new internal node with frequency ${parent.freq} and re-insert into the queue.`,
            queueItems: pq.elements.map(n => ({ char: n.char, freq: n.freq, isNew: n === parent, ref: n })),
            mergeLeft: left, mergeRight: right, merged: parent,
        });
    }

    const root = pq.dequeue();
    return { root, freqMap, steps };
}

function generateCodes(node, prefix = '', codes = {}) {
    if (!node) return codes;
    if (node.char !== null) { codes[node.char] = prefix || '0'; }
    else { generateCodes(node.left, prefix + '0', codes); generateCodes(node.right, prefix + '1', codes); }
    return codes;
}

function encode(text, codes) { return [...text].map(c => codes[c]).join(''); }

function decode(encodedText, root) {
    if (!root) return '';
    let result = '', node = root;
    for (const bit of encodedText) {
        node = bit === '0' ? node.left : node.right;
        if (node && node.char !== null) { result += node.char; node = root; }
    }
    return result;
}

function compressionStats(text, encodedText) {
    const original = text.length * 8;
    const compressed = encodedText.length;
    return { original, compressed, ratio: ((original - compressed) / original) * 100 };
}

// ============================================================
// RLE ALGORITHM
// ============================================================
function buildRLE(text) {
    if (!text) return { runs: [], encoded: '' };
    const runs = [];
    let i = 0;
    while (i < text.length) {
        let j = i + 1;
        while (j < text.length && text[j] === text[i]) j++;
        const count = j - i;
        runs.push({ char: text[i], count, token: count > 1 ? `${count}${text[i]}` : text[i] });
        i = j;
    }
    return { runs, encoded: runs.map(r => r.token).join('') };
}

// ============================================================
// SVG TREE VISUALIZATION
// ============================================================
function buildSvgTree(root, options = {}) {
    const cfg = Object.assign({ ...TREE_LAYOUT_CFG, showEdgeLabels: true, showInternal: true, stepHighlight: null }, options);
    if (!root) return { svg: null };

    // Pass 1: measure subtree widths (mutates _subWidth on each node)
    function measure(node) {
        if (!node) return 0;
        if (!node.left && !node.right) { node._subWidth = cfg.nodeRadius * 2 + cfg.siblingGap; return node._subWidth; }
        const lw = measure(node.left), rw = measure(node.right);
        node._subWidth = Math.max(lw + rw + cfg.siblingGap, cfg.nodeRadius * 2 + cfg.siblingGap);
        return node._subWidth;
    }
    measure(root);

    // Pass 2: assign positions (mutates _pos on each node)
    const nodes = [], edges = [], depths = [];
    function assign(node, xStart, depth) {
        if (!node) return;
        depths.push(depth);
        node._pos = { x: xStart + node._subWidth / 2, y: depth * cfg.levelGap + cfg.nodeRadius + 10 };
        nodes.push(node);
        if (node.left) {
            assign(node.left, xStart, depth + 1);
            edges.push({ from: node, to: node.left, bit: 0 });
            xStart += node.left._subWidth + cfg.siblingGap;
        }
        if (node.right) {
            assign(node.right, xStart, depth + 1);
            edges.push({ from: node, to: node.right, bit: 1 });
        }
    }
    assign(root, 0, 0);

    const maxDepth = Math.max(...depths, 0);
    const svgWidth = root._subWidth + cfg.nodeRadius * 2;
    const svgHeight = (maxDepth + 1) * cfg.levelGap + cfg.nodeRadius * 2 + 40;

    const svgns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Huffman tree visualization');

    const gEdges = document.createElementNS(svgns, 'g');
    const gNodes = document.createElementNS(svgns, 'g');
    const sh = cfg.stepHighlight;

    edges.forEach(e => {
        const isFuture = sh !== null && e.to._createdAtStep > sh.currentStep;
        const line = document.createElementNS(svgns, 'line');
        line.setAttribute('x1', e.from._pos.x); line.setAttribute('y1', e.from._pos.y);
        line.setAttribute('x2', e.to._pos.x); line.setAttribute('y2', e.to._pos.y);
        line.setAttribute('class', 'tree-edge' + (isFuture ? ' tree-edge-future' : ''));
        gEdges.appendChild(line);
        if (cfg.showEdgeLabels && !isFuture) {
            const lbl = document.createElementNS(svgns, 'text');
            lbl.setAttribute('x', (e.from._pos.x + e.to._pos.x) / 2);
            lbl.setAttribute('y', (e.from._pos.y + e.to._pos.y) / 2 - 6);
            lbl.setAttribute('text-anchor', 'middle');
            lbl.setAttribute('class', 'tree-edge-label');
            lbl.textContent = e.bit;
            gEdges.appendChild(lbl);
        }
    });

    nodes.forEach(n => {
        // Node visual state for step highlighting
        let stateClass = '';
        if (sh !== null) {
            const cs = sh.currentStep;
            if (n._createdAtStep > cs) {
                stateClass = ' tree-node-future';
            } else if (n._mergingAtStep === cs) {
                stateClass = ' tree-node-merging';  // being consumed this step
            } else if (n._createdAtStep === cs && cs > 0) {
                stateClass = ' tree-node-new';       // just created this step
            }
            // else: settled (default appearance)
        }

        const isLeaf = !n.left && !n.right;
        const isFuture = stateClass === ' tree-node-future';
        const group = document.createElementNS(svgns, 'g');
        group.setAttribute('transform', `translate(${n._pos.x},${n._pos.y})`);

        const circle = document.createElementNS(svgns, 'circle');
        circle.setAttribute('r', cfg.nodeRadius);
        circle.setAttribute('class', 'tree-node-circle' + (isLeaf ? ' tree-node-leaf' : '') + stateClass);
        group.appendChild(circle);

        if (!isFuture) {
            if (n.char !== null) {
                const t = document.createElementNS(svgns, 'text');
                t.setAttribute('class', 'tree-node-text'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '4');
                t.textContent = n.char === ' ' ? '␠' : n.char;
                group.appendChild(t);
            } else if (cfg.showInternal) {
                const t = document.createElementNS(svgns, 'text');
                t.setAttribute('class', 'tree-node-text'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '4');
                t.textContent = 'Σ';
                group.appendChild(t);
            }
            const f = document.createElementNS(svgns, 'text');
            f.setAttribute('class', 'tree-node-freq'); f.setAttribute('text-anchor', 'middle'); f.setAttribute('dy', cfg.nodeRadius + 12);
            f.textContent = n.freq;
            group.appendChild(f);
        }
        gNodes.appendChild(group);
    });

    svg.appendChild(gEdges);
    svg.appendChild(gNodes);
    return { svg };
}

// ============================================================
// PAN/ZOOM (single set of global listeners to prevent accumulation)
// ============================================================
let _activePanMove = null;
let _activePanUp = null;

function attachPanZoom(wrapper, outerG) {
    if (_activePanMove) window.removeEventListener('mousemove', _activePanMove);
    if (_activePanUp) window.removeEventListener('mouseup', _activePanUp);

    let scale = 1, translate = { x: 0, y: 0 };
    let isPanning = false, panStart = {}, transStart = {};

    function apply() {
        outerG.setAttribute('transform', `translate(${translate.x},${translate.y}) scale(${scale})`);
    }
    function fit() {
        const bbox = outerG.getBBox();
        const w = wrapper.clientWidth, h = wrapper.clientHeight;
        if (!bbox.width || !bbox.height) return;
        scale = Math.min((w - 40) / bbox.width, (h - 40) / bbox.height, 2.5);
        translate.x = (w - bbox.width * scale) / 2 - bbox.x * scale;
        translate.y = 20 - bbox.y * scale;
        apply();
    }
    fit();

    wrapper.onmousedown = e => {
        if (e.button !== 0) return;
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        transStart = { ...translate };
    };
    _activePanUp = () => { isPanning = false; };
    _activePanMove = e => {
        if (!isPanning) return;
        translate.x = transStart.x + (e.clientX - panStart.x);
        translate.y = transStart.y + (e.clientY - panStart.y);
        apply();
    };
    window.addEventListener('mouseup', _activePanUp);
    window.addEventListener('mousemove', _activePanMove);

    wrapper.onwheel = e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const rect = wrapper.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const bx = (cx - translate.x) / scale, by = (cy - translate.y) / scale;
        scale = Math.min(5, Math.max(0.2, scale * factor));
        translate.x = cx - bx * scale; translate.y = cy - by * scale;
        apply();
    };

    return {
        fit,
        zoomBy: f => { scale = Math.min(5, Math.max(0.2, scale * f)); apply(); },
        reset: () => { scale = 1; translate = { x: 0, y: 0 }; apply(); }
    };
}

// ============================================================
// FINAL TREE (with pan/zoom)
// ============================================================
const finalTreeState = {
    root: null,
    opts: { showEdgeLabels: true, showInternal: true },
    handle: null
};

function doRenderFinalTree() {
    const wrapper = document.getElementById('tree_svg_wrapper');
    const controls = document.getElementById('tree_controls');
    const hint = document.getElementById('tree_hint');
    wrapper.innerHTML = '';
    if (!finalTreeState.root) return;

    const { svg } = buildSvgTree(finalTreeState.root, { ...finalTreeState.opts });
    if (!svg) return;

    const outerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    while (svg.firstChild) outerG.appendChild(svg.firstChild);
    svg.appendChild(outerG);
    wrapper.appendChild(svg);
    controls.classList.remove('hidden');
    hint.classList.remove('hidden');
    finalTreeState.handle = attachPanZoom(wrapper, outerG);
}

document.getElementById('tree_controls').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const h = finalTreeState.handle;
    const action = btn.dataset.action;
    if (action === 'zoom-in') h?.zoomBy(1.2);
    else if (action === 'zoom-out') h?.zoomBy(1 / 1.2);
    else if (action === 'fit') h?.fit();
    else if (action === 'reset') h?.reset();
    else if (action === 'toggle-edge-labels') { finalTreeState.opts.showEdgeLabels = !finalTreeState.opts.showEdgeLabels; doRenderFinalTree(); }
    else if (action === 'toggle-internals') { finalTreeState.opts.showInternal = !finalTreeState.opts.showInternal; doRenderFinalTree(); }
});

// ============================================================
// FREQUENCY BAR CHART
// ============================================================
function renderFreqChart(freqMap) {
    const container = document.getElementById('freq_chart');
    container.innerHTML = '';
    if (!freqMap || !freqMap.size) return;
    const sorted = [...freqMap.entries()].sort((a, b) => b[1] - a[1]);
    const maxFreq = sorted[0][1];
    sorted.forEach(([char, freq]) => {
        const pct = (freq / maxFreq) * 100;
        const display = char === ' ' ? '␠' : char === '\n' ? '↵' : char;
        const row = document.createElement('div');
        row.className = 'freq-row';
        row.innerHTML = `
            <span class="freq-label">${display}</span>
            <div class="freq-bar-track"><div class="freq-bar-fill" style="width:${pct}%"></div></div>
            <span class="freq-value">${freq}</span>
        `;
        container.appendChild(row);
    });
}

// ============================================================
// STEPPER
// ============================================================
const stepperState = { steps: [], currentIndex: 0, root: null, autoTimer: null };

function renderStepperView(idx) {
    const { steps, root } = stepperState;
    if (!steps.length || !root) return;
    idx = Math.max(0, Math.min(steps.length - 1, idx));
    stepperState.currentIndex = idx;
    const step = steps[idx];

    document.getElementById('step_counter').textContent = `Step ${idx} / ${steps.length - 1}`;
    document.getElementById('step_description').textContent = step.description;
    document.getElementById('step_prev_btn').disabled = idx === 0;
    document.getElementById('step_next_btn').disabled = idx === steps.length - 1;

    // Queue visualization
    const queueEl = document.getElementById('step_queue');
    queueEl.innerHTML = '';

    if (step.mergeLeft && step.merged) {
        // Show the merge action prominently
        const action = document.createElement('div');
        action.className = 'stepper-merge-action';
        const rightPart = step.mergeRight
            ? `<span class="stepper-op">+</span>${makeQueueCard(step.mergeRight, 'merging')}`
            : '';
        action.innerHTML = `
            ${makeQueueCard(step.mergeLeft, 'merging')}
            ${rightPart}
            <span class="stepper-op">→</span>
            ${makeQueueCard(step.merged, 'new')}
        `;
        queueEl.appendChild(action);

        const label = document.createElement('p');
        label.className = 'stepper-queue-label';
        label.textContent = `Queue after merge (${step.queueItems.length} item${step.queueItems.length !== 1 ? 's' : ''}):`;
        queueEl.appendChild(label);
    } else {
        const label = document.createElement('p');
        label.className = 'stepper-queue-label';
        label.textContent = `Initial queue (${step.queueItems.length} items):`;
        queueEl.appendChild(label);
    }

    const itemsRow = document.createElement('div');
    itemsRow.className = 'stepper-queue-items';
    step.queueItems.forEach(item => {
        itemsRow.innerHTML += makeQueueCard(item.ref, item.isNew ? 'new' : 'normal');
    });
    queueEl.appendChild(itemsRow);

    // Partial tree (static, SVG auto-scales via viewBox)
    const wrapper = document.getElementById('step_tree_wrapper');
    wrapper.innerHTML = '';
    const { svg } = buildSvgTree(root, {
        showEdgeLabels: true,
        showInternal: true,
        stepHighlight: { currentStep: step.stepNum }
    });
    if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        wrapper.appendChild(svg);
    }
}

function makeQueueCard(node, style) {
    if (!node) return '';
    const char = node.char !== null
        ? (node.char === ' ' ? '␠' : node.char === '\n' ? '↵' : node.char)
        : 'Σ';
    const isLeaf = node.char !== null;
    const cls = `queue-card${style === 'merging' ? ' queue-card-merging' : style === 'new' ? ' queue-card-new' : ''}`;
    return `<div class="${cls}">
        <span class="qc-char${isLeaf ? ' qc-char-leaf' : ''}">${char}</span>
        <span class="qc-freq">${node.freq}</span>
    </div>`;
}

function stopAutoPlay() {
    if (stepperState.autoTimer) { clearInterval(stepperState.autoTimer); stepperState.autoTimer = null; }
    document.getElementById('step_play_btn').textContent = '▶ Auto-Play';
}

document.getElementById('step_reset_btn').addEventListener('click', () => { stopAutoPlay(); renderStepperView(0); });
document.getElementById('step_prev_btn').addEventListener('click', () => { stopAutoPlay(); renderStepperView(stepperState.currentIndex - 1); });
document.getElementById('step_next_btn').addEventListener('click', () => { stopAutoPlay(); renderStepperView(stepperState.currentIndex + 1); });
document.getElementById('step_play_btn').addEventListener('click', e => {
    if (stepperState.autoTimer) { stopAutoPlay(); return; }
    if (stepperState.currentIndex >= stepperState.steps.length - 1) renderStepperView(0);
    e.target.textContent = '⏸ Pause';
    stepperState.autoTimer = setInterval(() => {
        if (stepperState.currentIndex >= stepperState.steps.length - 1) { stopAutoPlay(); return; }
        renderStepperView(stepperState.currentIndex + 1);
    }, 1100);
});

// ============================================================
// RLE SECTION
// ============================================================
const RLE_COLORS = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#ea580c', '#84cc16', '#8b5cf6'];

function renderRLESection(text) {
    const { runs, encoded } = buildRLE(text);
    const originalBits = text.length * 8;
    const rleBits = encoded.length * 8;
    const ratio = ((originalBits - rleBits) / originalBits) * 100;

    document.getElementById('rle_stats_box').innerHTML = `
        ${statEl('Original', originalBits, 'bits')}
        ${statEl('RLE Size', rleBits, 'bits')}
        ${statEl(ratio >= 0 ? 'Saved' : 'Expansion', Math.abs(ratio).toFixed(2), '%')}
        ${statEl('Runs', runs.length, '')}
    `;

    const runsBox = document.getElementById('rle_runs_box');
    if (!runs.length) {
        runsBox.innerHTML = '<p class="text-gray-500 text-sm">No runs found.</p>';
    } else {
        runsBox.innerHTML = runs.map((run, i) => {
            const color = RLE_COLORS[i % RLE_COLORS.length];
            const display = run.char === ' ' ? '␠' : run.char;
            return `<div class="rle-run-block" style="border-color:${color}88" title="'${display}' × ${run.count} → '${run.token}'">
                <span class="rle-run-char" style="color:${color}">${display}</span>
                <span class="rle-run-count">×${run.count}</span>
                <span class="rle-run-token" style="color:${color}">${run.token}</span>
            </div>`;
        }).join('');
    }
    document.getElementById('rle_encoded_box').textContent = encoded || '(empty)';
}

// ============================================================
// COMPARISON TABLE
// ============================================================
function renderComparison(text, root, codes) {
    const originalBits = text.length * 8;

    const huffEncoded = encode(text, codes);
    const huffBits = huffEncoded.length;
    const huffRatio = ((originalBits - huffBits) / originalBits) * 100;
    const huffAvg = (huffBits / text.length).toFixed(2);

    const { encoded: rleEncoded } = buildRLE(text);
    const rleBits = rleEncoded.length * 8;
    const rleRatio = ((originalBits - rleBits) / originalBits) * 100;
    const rleAvg = (rleBits / text.length).toFixed(2);

    const rows = [
        { name: 'Uncompressed (ASCII)', bits: originalBits, ratio: null, avg: '8.00', note: 'No compression — 8 bits per character regardless of frequency' },
        { name: 'Huffman Coding', bits: huffBits, ratio: huffRatio, avg: huffAvg, note: 'Optimal prefix codes; used in ZIP, JPEG, MP3' },
        { name: 'Run-Length Encoding', bits: rleBits, ratio: rleRatio, avg: rleAvg, note: 'Best with long runs of repeated characters (e.g., fax, BMP images)' },
    ];

    const bestBits = Math.min(...rows.filter(r => r.ratio !== null).map(r => r.bits));

    document.getElementById('compare_tbody').innerHTML = rows.map(r => {
        const isWinner = r.ratio !== null && r.bits === bestBits;
        const ratioCell = r.ratio === null
            ? '<span class="text-gray-500">baseline</span>'
            : `<span class="${r.ratio >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">${r.ratio >= 0 ? '−' : '+'}${Math.abs(r.ratio).toFixed(1)}%</span>`;
        return `<tr class="comp-row${isWinner ? ' compare-row-winner' : ''}">
            <td class="comp-td font-medium">${r.name}${isWinner ? ' <span class="compare-badge">Best</span>' : ''}</td>
            <td class="comp-td text-center font-fira">${r.bits}</td>
            <td class="comp-td text-center">${ratioCell}</td>
            <td class="comp-td text-center text-gray-400 text-sm font-fira">${r.avg}</td>
            <td class="comp-td text-gray-400 text-sm">${r.note}</td>
        </tr>`;
    }).join('');
}

// ============================================================
// SHARED UTILITIES
// ============================================================
function statEl(label, value, unit) {
    return `<div class="flex flex-col items-center p-3">
        <span class="text-sm text-gray-400">${label}</span>
        <span class="text-2xl font-bold text-white">${value}<span class="text-base font-medium text-gray-300 ml-1">${unit}</span></span>
    </div>`;
}

// ============================================================
// TAB SYSTEM
// ============================================================
function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn-active'));
    document.getElementById(`tab-${name}`).classList.remove('hidden');
    document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('tab-btn-active');
    // Re-render final tree when returning to huffman tab, because buildSvgTree (called
    // by the stepper) mutates node._pos values. The DOM SVG is unaffected but
    // re-rendering ensures the final tree stays correct.
    if (name === 'huffman' && finalTreeState.root) doRenderFinalTree();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================
// MAIN COMPRESS ACTION
// ============================================================
function compressAction() {
    const text = document.getElementById('input_box').value;
    const resultsEl = document.getElementById('results-container');
    if (!text) { resultsEl.classList.add('hidden'); return; }

    const { root, freqMap, steps } = buildHuffmanTreeWithSteps(text);
    const codes = generateCodes(root);
    const encoded = encode(text, codes);
    const decoded = decode(encoded, root);
    const stats = compressionStats(text, encoded);

    resultsEl.classList.remove('hidden');
    switchTab('huffman');

    // Frequency chart
    renderFreqChart(freqMap);

    // Stats
    const avg = (stats.compressed / text.length).toFixed(2);
    document.getElementById('stats_box').innerHTML = `
        ${statEl('Original', stats.original, 'bits')}
        ${statEl('Compressed', stats.compressed, 'bits')}
        ${statEl('Saved', stats.ratio.toFixed(2), '%')}
        ${statEl('Avg bits/char', avg, '')}
    `;

    // Codes
    document.getElementById('codes_box').innerHTML = Object.entries(codes)
        .sort(([, a], [, b]) => a.length - b.length || a.localeCompare(b))
        .map(([char, code]) => {
            const display = char === ' ' ? '␠' : char === '\n' ? '↵' : char;
            return `<div class="flex gap-4 py-0.5">
                <span class="text-blue-400">'${display}'</span>
                <span class="text-green-400 font-fira flex-1">${code}</span>
                <span class="text-gray-500 text-xs self-center">${code.length} bit${code.length !== 1 ? 's' : ''}</span>
            </div>`;
        }).join('');

    document.getElementById('encoded_box').textContent = encoded;
    document.getElementById('decoded_box').textContent = decoded;

    // Stepper
    stepperState.steps = steps;
    stepperState.root = root;
    stepperState.currentIndex = 0;
    stopAutoPlay();
    renderStepperView(0);

    // Final tree
    finalTreeState.root = root;
    doRenderFinalTree();

    // RLE
    renderRLESection(text);

    // Comparison
    renderComparison(text, root, codes);

    // Animate huffman tab cards with stagger; pre-mark other tabs as visible
    document.querySelectorAll('#tab-huffman .result-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 70}ms`;
        card.classList.add('visible');
    });
    document.querySelectorAll('#tab-rle .result-card, #tab-compare .result-card').forEach(card => {
        card.classList.add('visible');
    });
}

// ============================================================
// PRESET BUTTONS & INPUT
// ============================================================
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('input_box').value = btn.dataset.text;
        compressAction();
    });
});

document.getElementById('compress_btn').addEventListener('click', compressAction);
document.getElementById('input_box').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); compressAction(); }
});

// ============================================================
// FILE COMPRESSION
// ============================================================
const FILE_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB hard limit
const SAMPLE_BYTES   = 512 * 1024;         // max bytes to process
const IMAGE_MAX_DIM  = 400;                // max image dimension for pixel extraction

const fileState = {
    fileName: null, fileSize: 0, fileCategory: null, mimeType: null,
    wasSampled: false, wasScaled: false, sampledBytes: 0,
    byteString: null,
    huffCodes: null, huffEncoded: null, huffBits: 0, huffPacked: null,
    rleRuns: null, rleEncoded: null, rleBits: 0,
    originalBits: 0,
};

function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
}

function getFileCategory(name, mime) {
    if (/^image\//i.test(mime) || /\.(png|jpg|jpeg|gif|webp|bmp|svg|ico)$/i.test(name)) return 'image';
    if (/^text\//i.test(mime) || /\.(txt|csv|json|xml|html|htm|css|js|ts|py|md|yaml|yml|log|ini|cfg|sh|bat|c|cpp|h|java|rb|rs|go|swift|kt)$/i.test(name)) return 'text';
    return 'binary';
}

// Convert Uint8Array to string in chunks to avoid call-stack overflow on large arrays
function byteArrayToString(uint8Array) {
    let result = '';
    const CHUNK = 8192;
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
        result += String.fromCharCode(...uint8Array.subarray(i, i + CHUNK));
    }
    return result;
}

function packBitsToBase64(bitString) {
    const extraBits = (8 - bitString.length % 8) % 8;
    const padded = bitString + '0'.repeat(extraBits);
    const bytes = new Uint8Array(padded.length / 8);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(padded.slice(i * 8, i * 8 + 8), 2);
    }
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return { base64: btoa(binary), paddingBits: extraBits, originalBitLength: bitString.length };
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsArrayBuffer(file);
    });
}

function handleFileDrop(file) {
    if (!file) return;
    if (file.size > FILE_MAX_BYTES) {
        showFileError(`File is too large (${formatBytes(file.size)}). Please select a file under 5 MB.`);
        return;
    }
    resetFileState();
    fileState.fileName = file.name;
    fileState.fileSize = file.size;
    fileState.mimeType = file.type;
    fileState.fileCategory = getFileCategory(file.name, file.type);

    showFileSpinner(true);

    if (fileState.fileCategory === 'image') {
        readFileAsDataURL(file).then(dataUrl => processImageFile(file, dataUrl)).catch(() => showFileError('Failed to read image file.'));
    } else {
        readFileAsArrayBuffer(file).then(buf => processRawFile(file, new Uint8Array(buf))).catch(() => showFileError('Failed to read file.'));
    }
}

function processImageFile(file, dataUrl) {
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight, 1));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        fileState.wasScaled = scale < 1;

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let rgba = new Uint8Array(canvas.getContext('2d').getImageData(0, 0, w, h).data.buffer);

        fileState.wasSampled = rgba.length > SAMPLE_BYTES;
        if (fileState.wasSampled) rgba = rgba.slice(0, SAMPLE_BYTES);
        fileState.sampledBytes = rgba.length;
        fileState.originalBits = rgba.length * 8; // compare against raw pixel size

        const byteString = byteArrayToString(rgba);
        fileState.byteString = byteString;

        renderFileInfoCard(file);
        renderFilePreviewCard('image', byteString, dataUrl, img.naturalWidth, img.naturalHeight, w, h);
        setTimeout(() => runCompressionAndRender(), 20);
    };
    img.onerror = () => showFileError('Failed to decode image.');
    img.src = dataUrl;
}

function processRawFile(file, uint8Array) {
    fileState.wasSampled = uint8Array.length > SAMPLE_BYTES;
    const bytes = fileState.wasSampled ? uint8Array.slice(0, SAMPLE_BYTES) : uint8Array;
    fileState.sampledBytes = bytes.length;
    fileState.originalBits = file.size * 8; // compare against full file size

    const byteString = byteArrayToString(bytes);
    fileState.byteString = byteString;

    renderFileInfoCard(file);
    if (fileState.fileCategory === 'text') {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        renderFilePreviewCard('text', text, null, 0, 0, 0, 0);
    } else {
        renderFilePreviewCard('binary', byteString, null, 0, 0, 0, 0);
    }
    setTimeout(() => runCompressionAndRender(), 20);
}

function renderFileInfoCard(file) {
    const analyzed = fileState.sampledBytes;
    document.getElementById('file-meta').innerHTML = `
        ${statEl('File', escapeHtml(file.name.length > 22 ? '…' + file.name.slice(-20) : file.name), '')}
        ${statEl('Type', file.type || 'binary', '')}
        ${statEl('Size', formatBytes(file.size), '')}
        ${statEl('Analyzed', formatBytes(analyzed), '')}
    `;
    const notice = document.getElementById('file-sample-notice');
    const parts = [];
    if (fileState.wasSampled) parts.push(`Only the first ${formatBytes(SAMPLE_BYTES)} of ${formatBytes(file.size)} were analyzed.`);
    if (fileState.wasScaled) parts.push(`Image scaled to fit ${IMAGE_MAX_DIM}×${IMAGE_MAX_DIM} px before pixel extraction.`);
    if (parts.length) { notice.textContent = parts.join(' '); notice.classList.remove('hidden'); }
    document.getElementById('file-info-card').classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('file-info-card').classList.add('visible'));
}

function renderFilePreviewCard(category, content, dataUrl, origW, origH, scaledW, scaledH) {
    const container = document.getElementById('file-preview-content');
    if (category === 'image') {
        container.innerHTML = `
            <div class="flex flex-col items-center gap-3">
                <img src="${dataUrl}" alt="File preview" class="file-preview-image">
                <p class="text-xs text-gray-500">${origW}×${origH} px original · Compression applied to ${scaledW}×${scaledH} RGBA pixel data.</p>
            </div>`;
    } else if (category === 'text') {
        const snippet = escapeHtml(content.slice(0, 600));
        container.innerHTML = `<pre class="file-preview-text">${snippet}${content.length > 600 ? '\n…' : ''}</pre>`;
    } else {
        container.innerHTML = `
            <p class="text-xs text-gray-500 mb-2">Hex dump (first 128 bytes):</p>
            <pre class="file-preview-hex">${renderHexDump(content, 128)}</pre>`;
    }
    document.getElementById('file-preview-card').classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('file-preview-card').classList.add('visible'));
}

function renderHexDump(byteString, maxBytes) {
    const len = Math.min(byteString.length, maxBytes);
    const lines = [];
    for (let i = 0; i < len; i += 16) {
        const chunk = byteString.slice(i, i + 16);
        const hex = [...chunk].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        const ascii = [...chunk].map(c => { const code = c.charCodeAt(0); return code >= 32 && code < 127 ? escapeHtml(c) : '.'; }).join('');
        lines.push(`<span class="text-gray-500">${i.toString(16).padStart(4, '0')}</span>  <span class="text-green-400">${hex.padEnd(47)}</span>  <span class="text-gray-400">${ascii}</span>`);
    }
    return lines.join('\n');
}

function runCompressionAndRender() {
    const { byteString, originalBits } = fileState;

    // Huffman
    const hRoot = buildHuffmanTree(byteString);
    const hCodes = generateCodes(hRoot);
    const hEncoded = encode(byteString, hCodes);
    fileState.huffCodes = hCodes;
    fileState.huffEncoded = hEncoded;
    fileState.huffBits = hEncoded.length;
    fileState.huffPacked = packBitsToBase64(hEncoded);

    // RLE
    const { runs, encoded: rleEncoded } = buildRLE(byteString);
    fileState.rleRuns = runs;
    fileState.rleEncoded = rleEncoded;
    fileState.rleBits = rleEncoded.length * 8;

    showFileSpinner(false);
    renderFileResultsCard();
    renderFileEduCard(fileState.fileCategory);

    document.getElementById('file-dl-huffman').disabled = false;
    document.getElementById('file-dl-rle').disabled = false;
}

function renderFileResultsCard() {
    const { originalBits, huffBits, rleBits, huffCodes, rleRuns, byteString } = fileState;
    const origBytes = originalBits / 8;
    const hBytes = Math.ceil(huffBits / 8);
    const rBytes = Math.ceil(rleBits / 8);
    const hRatio = ((originalBits - huffBits) / originalBits) * 100;
    const rRatio = ((originalBits - rleBits) / originalBits) * 100;
    const hAvg = (huffBits / byteString.length).toFixed(2);

    document.getElementById('file-stats-row').innerHTML = `
        ${statEl('Original', formatBytes(origBytes), '')}
        ${statEl('Huffman', formatBytes(hBytes), '')}
        ${statEl('RLE', formatBytes(rBytes), '')}
        ${statEl('Huffman saved', (hRatio >= 0 ? '−' : '+') + Math.abs(hRatio).toFixed(1), '%')}
        ${statEl('Unique bytes', Object.keys(huffCodes).length, '')}
        ${statEl('Avg bits/byte', hAvg, '')}
    `;

    const maxBytes = Math.max(origBytes, hBytes, rBytes);
    document.getElementById('file-size-bars').innerHTML = `
        ${fileSizeBar('Original', origBytes, maxBytes, 0, 'file-bar-orig')}
        ${fileSizeBar('Huffman', hBytes, maxBytes, hRatio, 'file-bar-huff')}
        ${fileSizeBar('RLE', rBytes, maxBytes, rRatio, 'file-bar-rle')}
    `;

    const card = document.getElementById('file-results-card');
    card.classList.remove('hidden');
    requestAnimationFrame(() => card.classList.add('visible'));
}

function fileSizeBar(label, bytes, maxBytes, ratio, colorClass) {
    const pct = Math.min(100, (bytes / maxBytes) * 100);
    const ratioStr = ratio === 0 ? '' : ` <span class="${ratio >= 0 ? 'text-green-400' : 'text-red-400'}">(${ratio >= 0 ? '−' : '+'}${Math.abs(ratio).toFixed(1)}%)</span>`;
    return `<div class="file-size-bar-row">
        <span class="file-size-bar-label">${label}</span>
        <div class="file-size-bar-track"><div class="file-size-bar-fill ${colorClass}" style="width:${pct}%"></div></div>
        <span class="file-size-bar-value">${formatBytes(bytes)}${ratioStr}</span>
    </div>`;
}

function renderFileEduCard(category) {
    const notes = {
        text: [
            { title: 'Why text compresses well', body: 'Natural language has highly skewed character frequencies. In English, \'e\', \'t\', \'a\' appear far more often than \'z\', \'q\', \'x\'. Huffman assigns shorter codes to frequent characters, achieving significant compression. Expect 40–60% reduction on typical prose.' },
            { title: 'When RLE helps', body: 'RLE is most effective when the same character repeats consecutively — e.g., whitespace, CSV padding, or source code indentation. For varied text like prose, RLE can actually expand the file.' },
            { title: 'Real-world context', body: 'Real text compressors like gzip and zstd combine Huffman-like coding with back-reference encoding (LZ77/LZ78) to achieve even better ratios. The algorithms here are the foundations of those systems.' },
        ],
        image: [
            { title: 'JPEG/PNG are already compressed', body: 'If your image is a JPEG, the file bytes are already Huffman-coded internally. Re-applying Huffman to the file bytes typically achieves near-zero or negative compression. Compression is applied here to the raw RGBA pixel data to show how it would work on an uncompressed raster.' },
            { title: 'Why raw pixel data has high entropy', body: 'Natural photographs have pixel values that vary widely and unpredictably. This high entropy means no single symbol dominates frequency — Huffman codes approach 8 bits per byte, offering little gain. Synthetic images with large flat regions compress far better.' },
            { title: 'RLE and images', body: 'RLE was historically used in BMP and fax formats where runs of identical pixels are common. For photos, RLE often expands the data because adjacent pixels rarely share the exact same color.' },
        ],
        binary: [
            { title: 'Why binaries compress poorly', body: 'Compiled executables and most binary formats have been designed to pack data tightly, producing a near-uniform distribution of byte values. High entropy means Huffman codes average close to 8 bits/byte — the theoretical maximum.' },
            { title: 'Already-compressed files', body: 'ZIP, GZ, JPEG, MP4, and similar formats are already compressed. Trying to compress them again will typically expand the file slightly due to overhead (Huffman code tables, etc.).' },
            { title: 'Real-world implication', body: 'This is why archive tools (zip, 7z) skip re-compressing files that are already in a compressed format — they detect high entropy and store those files as-is.' },
        ],
    };

    const items = notes[category] || notes.binary;
    document.getElementById('file-edu-content').innerHTML = items.map(n => `
        <div class="file-edu-note">
            <p class="font-semibold text-gray-200 mb-1">${n.title}</p>
            <p class="text-gray-400">${n.body}</p>
        </div>
    `).join('');

    const card = document.getElementById('file-edu-card');
    card.classList.remove('hidden');
    requestAnimationFrame(() => card.classList.add('visible'));
}

function buildDownloadPayload(algorithm) {
    const { fileName, fileSize, sampledBytes, huffCodes, huffPacked, rleRuns, rleEncoded, huffBits, rleBits, originalBits } = fileState;
    if (algorithm === 'huffman') {
        // Store codebook with char codes as keys (safe for binary data)
        const codebook = {};
        for (const [char, bits] of Object.entries(huffCodes)) codebook[char.charCodeAt(0)] = bits;
        return JSON.stringify({
            format: 'huffman-educational-v1',
            originalFile: fileName,
            originalFileBytes: fileSize,
            analyzedBytes: sampledBytes,
            compressedBytes: Math.ceil(huffBits / 8),
            ratio: (((originalBits - huffBits) / originalBits) * 100).toFixed(2) + '%',
            uniqueSymbols: Object.keys(huffCodes).length,
            paddingBits: huffPacked.paddingBits,
            originalBitLength: huffPacked.originalBitLength,
            codebook,
            packedData: huffPacked.base64,
        }, null, 2);
    } else {
        // RLE: store as array of [count, charCode] pairs for binary safety
        const runs = rleRuns.map(r => ({ count: r.count, charCode: r.char.charCodeAt(0) }));
        return JSON.stringify({
            format: 'rle-educational-v1',
            originalFile: fileName,
            originalFileBytes: fileSize,
            analyzedBytes: sampledBytes,
            compressedBytes: Math.ceil(rleBits / 8),
            ratio: (((originalBits - rleBits) / originalBits) * 100).toFixed(2) + '%',
            runs: runs.length,
            data: runs,
        }, null, 2);
    }
}

function triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showFileError(msg) {
    const el = document.getElementById('file-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    showFileSpinner(false);
    setTimeout(() => el.classList.add('hidden'), 6000);
}

function showFileSpinner(visible) {
    document.getElementById('file-spinner').classList.toggle('hidden', !visible);
}

function resetFileState() {
    Object.assign(fileState, {
        fileName: null, fileSize: 0, fileCategory: null, mimeType: null,
        wasSampled: false, wasScaled: false, sampledBytes: 0, byteString: null,
        huffCodes: null, huffEncoded: null, huffBits: 0, huffPacked: null,
        rleRuns: null, rleEncoded: null, rleBits: 0, originalBits: 0,
    });
    ['file-info-card', 'file-preview-card', 'file-results-card', 'file-edu-card'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden'); el.classList.remove('visible');
    });
    document.getElementById('file-sample-notice').classList.add('hidden');
    document.getElementById('file-error').classList.add('hidden');
    document.getElementById('file-dl-huffman').disabled = true;
    document.getElementById('file-dl-rle').disabled = true;
}

// ============================================================
// FILE SECTION — EVENT WIRING
// ============================================================
(function initFileSection() {
    const zone = document.getElementById('file-drop-zone');
    const input = document.getElementById('file-input');
    let _clickLock = false;

    zone.addEventListener('click', e => {
        if (e.target === input) return;  // input's own click bubbling up
        if (_clickLock) return;
        _clickLock = true;
        setTimeout(() => { _clickLock = false; }, 400);
        input.value = '';
        input.click();
    });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    zone.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('file-drop-active'); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('file-drop-active'); });
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('file-drop-active');
        resetFileState();
        const file = e.dataTransfer.files[0];
        if (file) handleFileDrop(file);
    });
    input.addEventListener('change', e => {
        if (e.target.files[0]) { resetFileState(); handleFileDrop(e.target.files[0]); }
    });
    document.getElementById('file-dl-huffman').addEventListener('click', () => {
        triggerDownload(fileState.fileName + '.huffman.json', buildDownloadPayload('huffman'));
    });
    document.getElementById('file-dl-rle').addEventListener('click', () => {
        triggerDownload(fileState.fileName + '.rle.json', buildDownloadPayload('rle'));
    });
})();
