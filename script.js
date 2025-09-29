class Node {
    constructor(char, freq, left = null, right = null) {
        this.char = char;
        this.freq = freq;
        this.left = left;
        this.right = right;
    }
}

class PriorityQueue {
    constructor() {
        this.elements = [];
    }
    enqueue(node) {
        this.elements.push(node);
        this.elements.sort((a, b) => a.freq - b.freq);
    }
    dequeue() {
        return this.elements.shift();
    }
    size() {
        return this.elements.length;
    }
}

function buildHuffmanTree(text) {
    if (!text) return null;

    const freqMap = new Map();
    for (const char of text) {
        freqMap.set(char, (freqMap.get(char) || 0) + 1);
    }

    const pq = new PriorityQueue();
    for (const [char, freq] of freqMap.entries()) {
        pq.enqueue(new Node(char, freq));
    }

    if (pq.size() === 1) {
        const singleNode = pq.dequeue();
        const root = new Node(null, singleNode.freq, singleNode);
        return root;
    }

    while (pq.size() > 1) {
        const left = pq.dequeue();
        const right = pq.dequeue();
        const parent = new Node(null, left.freq + right.freq, left, right);
        pq.enqueue(parent);
    }
    return pq.dequeue();
}

function generateCodes(node, prefix = '', codes = {}) {
    if (!node) return codes;
    if (node.char !== null) {
        codes[node.char] = prefix || '0'; // Handle single character case
    } else {
        generateCodes(node.left, prefix + '0', codes);
        generateCodes(node.right, prefix + '1', codes);
    }
    return codes;
}

function encode(text, codes) {
    let encodedText = '';
    for (const char of text) {
        encodedText += codes[char];
    }
    return encodedText;
}

function decode(encodedText, root) {
    if (!root) return '';
    let decodedText = '';
    let currentNode = root;
    for (const bit of encodedText) {
        if (bit === '0') {
            currentNode = currentNode.left;
        } else {
            currentNode = currentNode.right;
        }

        if (currentNode && currentNode.char !== null) {
            decodedText += currentNode.char;
            currentNode = root;
        }
    }
    return decodedText;
}

function compressionStats(text, encodedText) {
    const originalSize = text.length * 8; // Assuming 8 bits per character (ASCII)
    const compressedSize = encodedText.length;
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return {
        original: originalSize,
        compressed: compressedSize,
        ratio: ratio
    };
}

// --- New SVG Tree Visualization ---
// Layout algorithm: 1st pass to compute subtree widths, 2nd pass assign x positions; y by depth.
function buildSvgTree(root, options = {}) {
    const cfg = Object.assign({
        levelGap: 80,
        siblingGap: 22,
        nodeRadius: 18,
        fontSize: 12,
        showEdgeLabels: true,
        showInternal: true
    }, options);
    if (!root) return { svg: null, view: { width: 0, height: 0 } };

    // First compute subtree widths recursively.
    function measure(node) {
        if (!node) return 0;
        if (!node.left && !node.right) {
            node._subWidth = cfg.nodeRadius * 2 + cfg.siblingGap;
            return node._subWidth;
        }
        const lw = measure(node.left);
        const rw = measure(node.right);
        const combined = lw + rw + cfg.siblingGap;
        node._subWidth = Math.max(combined, cfg.nodeRadius * 2 + cfg.siblingGap);
        return node._subWidth;
    }
    measure(root);

    const nodes = [];
    const edges = [];
    const depths = [];

    function assign(node, xStart, depth) {
        if (!node) return;
        depths.push(depth);
        const width = node._subWidth;
        let x;
        if (!node.left && !node.right) {
            x = xStart + width / 2;
        } else {
            x = xStart + width / 2;
        }
        const y = depth * cfg.levelGap + cfg.nodeRadius + 10;
        node._pos = { x, y, depth };
        nodes.push(node);
        if (node.left) {
            const lw = node.left._subWidth;
            assign(node.left, xStart, depth + 1);
            edges.push({ from: node, to: node.left, bit: 0 });
            xStart += lw + cfg.siblingGap;
        }
        if (node.right) {
            assign(node.right, xStart, depth + 1);
            edges.push({ from: node, to: node.right, bit: 1 });
        }
    }
    assign(root, 0, 0);

    const maxDepth = Math.max(...depths, 0);
    const width = root._subWidth + cfg.nodeRadius * 2;
    const height = (maxDepth + 1) * cfg.levelGap + cfg.nodeRadius * 2 + 40;

    // Build SVG elements
    const svgns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Huffman tree visualization');

    const gEdges = document.createElementNS(svgns, 'g');
    const gNodes = document.createElementNS(svgns, 'g');

    edges.forEach(e => {
        const line = document.createElementNS(svgns, 'line');
        line.setAttribute('x1', e.from._pos.x);
        line.setAttribute('y1', e.from._pos.y);
        line.setAttribute('x2', e.to._pos.x);
        line.setAttribute('y2', e.to._pos.y);
        line.setAttribute('class', 'tree-edge');
        gEdges.appendChild(line);
        if (cfg.showEdgeLabels) {
            const mx = (e.from._pos.x + e.to._pos.x) / 2;
            const my = (e.from._pos.y + e.to._pos.y) / 2 - 6;
            const lbl = document.createElementNS(svgns, 'text');
            lbl.setAttribute('x', mx);
            lbl.setAttribute('y', my);
            lbl.setAttribute('text-anchor', 'middle');
            lbl.setAttribute('class', 'tree-edge-label');
            lbl.textContent = e.bit;
            gEdges.appendChild(lbl);
        }
    });

    nodes.forEach(n => {
        const group = document.createElementNS(svgns, 'g');
        group.setAttribute('transform', `translate(${n._pos.x},${n._pos.y})`);
        const circle = document.createElementNS(svgns, 'circle');
        circle.setAttribute('r', cfg.nodeRadius);
        circle.setAttribute('class', 'tree-node-circle' + (!n.left && !n.right ? ' tree-node-leaf' : ''));
        group.appendChild(circle);
        const ch = (n.char === ' ' ? '␠' : n.char);
        if (n.char !== null) {
            const t = document.createElementNS(svgns, 'text');
            t.setAttribute('class', 'tree-node-text');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dy', '4');
            t.textContent = ch;
            group.appendChild(t);
        } else if (cfg.showInternal) {
            const t = document.createElementNS(svgns, 'text');
            t.setAttribute('class', 'tree-node-text');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dy', '4');
            t.textContent = 'Σ';
            group.appendChild(t);
        }
        const f = document.createElementNS(svgns, 'text');
        f.setAttribute('class', 'tree-node-freq');
        f.setAttribute('text-anchor', 'middle');
        f.setAttribute('dy', cfg.nodeRadius + 12);
        f.textContent = n.freq;
        group.appendChild(f);
        gNodes.appendChild(group);
    });

    svg.appendChild(gEdges);
    svg.appendChild(gNodes);
    return { svg, view: { width, height } };
}

// --- UI Interaction Logic ---

const inputBox = document.getElementById('input_box');
const compressBtn = document.getElementById('compress_btn');
const resultsContainer = document.getElementById('results-container');
const codesBox = document.getElementById('codes_box');
const encodedBox = document.getElementById('encoded_box');
const decodedBox = document.getElementById('decoded_box');
const treeBox = document.getElementById('tree_box');
const treeControls = document.getElementById('tree_controls');
const treeWrapper = document.getElementById('tree_svg_wrapper');
let lastTreeState = { root: null, options: { showEdgeLabels: true, showInternal: true } };

function renderTree(root) {
    lastTreeState.root = root;
    treeWrapper.innerHTML = '';
    if (!root) return;
    const { svg } = buildSvgTree(root, lastTreeState.options);
    if (!svg) return;

    const outerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Move actual content into outerG for transform manipulations
    while (svg.firstChild) outerG.appendChild(svg.firstChild);
    svg.appendChild(outerG);
    outerG.setAttribute('data-pan-root', '');

    treeWrapper.appendChild(svg);
    treeControls.classList.remove('hidden');
    document.getElementById('tree_hint').classList.remove('hidden');

    // Pan & zoom state
    let scale = 1;
    let translate = { x: 0, y: 0 };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let translateStart = { x: 0, y: 0 };

    function applyTransform() {
        outerG.setAttribute('transform', `translate(${translate.x},${translate.y}) scale(${scale})`);
    }

    function fitToView() {
        const bbox = outerG.getBBox();
        const w = treeWrapper.clientWidth;
        const h = treeWrapper.clientHeight;
        if (bbox.width === 0 || bbox.height === 0) return;
        const s = Math.min((w - 40) / bbox.width, (h - 40) / bbox.height);
        scale = Math.min(s, 2.5);
        translate.x = (w - bbox.width * scale) / 2 - bbox.x * scale;
        translate.y = 20 - bbox.y * scale;
        applyTransform();
    }

    // Initial fit
    fitToView();

    // Pan handling
    treeWrapper.onmousedown = (e) => {
        if (e.target.closest('button')) return; // ignore control clicks
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        translateStart = { ...translate };
    };
    window.addEventListener('mouseup', () => { isPanning = false; });
    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        translate.x = translateStart.x + dx;
        translate.y = translateStart.y + dy;
        applyTransform();
    });

    // Wheel zoom
    treeWrapper.onwheel = (e) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.1 : 0.9;
        const rect = treeWrapper.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const beforeX = (cx - translate.x) / scale;
        const beforeY = (cy - translate.y) / scale;
        scale = Math.min(5, Math.max(0.2, scale * factor));
        translate.x = cx - beforeX * scale;
        translate.y = cy - beforeY * scale;
        applyTransform();
    };

    // Control buttons
    treeControls.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            const action = btn.getAttribute('data-action');
            if (action === 'zoom-in') { scale = Math.min(5, scale * 1.2); }
            else if (action === 'zoom-out') { scale = Math.max(0.2, scale / 1.2); }
            else if (action === 'fit') { fitToView(); return; }
            else if (action === 'reset') { scale = 1; translate = { x: 0, y: 0 }; }
            else if (action === 'toggle-edge-labels') { lastTreeState.options.showEdgeLabels = !lastTreeState.options.showEdgeLabels; renderTree(root); return; }
            else if (action === 'toggle-internals') { lastTreeState.options.showInternal = !lastTreeState.options.showInternal; renderTree(root); return; }
            applyTransform();
        };
    });
}
const statsBox = document.getElementById('stats_box');

function createStatElement(label, value, unit) {
    return `
                <div class="flex flex-col items-center p-2">
                    <span class="text-sm text-gray-400">${label}</span>
                    <span class="text-2xl font-bold text-white">${value}<span class="text-base font-medium text-gray-300 ml-1">${unit}</span></span>
                </div>
            `;
}

function compressAction() {
    const text = inputBox.value;
    if (!text) {
        resultsContainer.classList.add('hidden');
        return;
    }

    const root = buildHuffmanTree(text);
    const codes = generateCodes(root);
    const encoded = encode(text, codes);
    const decoded = decode(encoded, root);
    const stats = compressionStats(text, encoded);

    // Populate Huffman Codes
    codesBox.innerHTML = Object.entries(codes)
        .map(([char, code]) => `<div><span class="text-blue-400">'${char === ' ' ? ' ' : char}'</span>: <span class="text-green-400">${code}</span></div>`)
        .join('');

    // Populate Encoded Text
    encodedBox.textContent = encoded;

    // Populate Decoded Text
    decodedBox.textContent = decoded;

    // Populate Stats
    statsBox.innerHTML = `
                ${createStatElement('Original Size', stats.original, 'bits')}
                ${createStatElement('Compressed Size', stats.compressed, 'bits')}
                ${createStatElement('Space Saved', stats.ratio.toFixed(2), '%')}
            `;

    // Visualize Huffman Tree (SVG)
    renderTree(root);

    // Show and animate results
    resultsContainer.classList.remove('hidden');
    const cards = document.querySelectorAll('.result-card');
    cards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 100}ms`;
        card.classList.add('visible');
    });
}

compressBtn.addEventListener('click', compressAction);

// Allow pressing Enter to compress (with Shift+Enter for newline)
inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        compressBtn.click();
    }
});