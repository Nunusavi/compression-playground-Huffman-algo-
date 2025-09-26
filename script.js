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

function createVisualTree(node) {
    if (!node) return '';

    const charDisplay = node.char === ' ' ? "' '" : (node.char || 'Σ');
    const charClass = node.char !== null ? 'char' : '';
    let nodeHtml = `
                <div class="tree-node">
                    <span class="${charClass}">${charDisplay}</span>
                    <span class="freq">${node.freq}</span>
                </div>
            `;

    if (node.left || node.right) {
        let childrenHtml = '<div class="tree-children">';
        if (node.left) {
            childrenHtml += `<div class="tree-branch">${createVisualTree(node.left)}</div>`;
        }
        if (node.right) {
            childrenHtml += `<div class="tree-branch">${createVisualTree(node.right)}</div>`;
        }
        childrenHtml += '</div>';
        nodeHtml += childrenHtml;
    }

    return `<div class="tree-container">${nodeHtml}</div>`;
}

// --- UI Interaction Logic ---

const inputBox = document.getElementById('input_box');
const compressBtn = document.getElementById('compress_btn');
const resultsContainer = document.getElementById('results-container');
const codesBox = document.getElementById('codes_box');
const encodedBox = document.getElementById('encoded_box');
const decodedBox = document.getElementById('decoded_box');
const treeBox = document.getElementById('tree_box');
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

    // Visualize Huffman Tree
    treeBox.innerHTML = createVisualTree(root);

    // Center the tree visually within the scrollable container.
    // A timeout ensures the browser has rendered the tree before we measure it.
    setTimeout(() => {
        const treeElement = treeBox.firstChild;
        if (treeElement && treeElement.offsetWidth > treeBox.offsetWidth) {
            treeBox.scrollLeft = (treeElement.offsetWidth - treeBox.offsetWidth) / 2;
        }
    }, 0);

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