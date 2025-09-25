import heapq
from collections import  Counter


class Node:
    def __init__(self, char=None, freq=0, left=None, right=None):
        self.char = char        # character (leaf nodes only)
        self.freq = freq        # frequency
        self.left = left        # left child
        self.right = right      # right child

    # Comparison operator for heapq (min-heap based on freq)
    def __lt__(self, other):
        return self.freq < other.freq
    
def build_huffman_tree(text):
    # Calculating the frequency of each character
    frequency = Counter(text)
    heap = [Node(char, f) for char, f in frequency.items()]
    heapq.heapify(heap)
    
    while len(heap)>1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = Node(freq=left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)
        
    return heap[0] if heap else None

def generate_codes(root):
    codes = {}

    def dfs(node, code=""):
        if not node:
            return
        if node.char is not None:  # leaf
            codes[node.char] = code
            return
        dfs(node.left, code + "0")
        dfs(node.right, code + "1")

    dfs(root)
    return codes

def encode(text, codes):
    return ''.join(codes[char] for char in text)

def decode(encoded_text, root):
    result = []
    node = root
    for bit in encoded_text:
       node = node.left if bit == '0' else node.right
       if node.char is not None:
           result.append(node.char)
           node = root
    return "".join(result)

def compression_stats(text, encoded_text):
    original_bits = len(text) * 8
    compressed_bits = len(encoded_text)
    ratio = compressed_bits / original_bits * 100 if original_bits else 0
    return original_bits, compressed_bits, ratio 

def print_huffman_tree(node, prefix="", is_left=True):
    if node is None:
        return

    if node.char is not None:
        print(prefix + ("├── " if is_left else "└── ") + f"'{node.char}' ({node.freq})")
    else:
        print(prefix + ("├── " if is_left else "└── ") + f"* ({node.freq})")

    new_prefix = prefix + ("│   " if is_left else "    ")
    print_huffman_tree(node.left, new_prefix, True)
    print_huffman_tree(node.right, new_prefix, False)
    
def save_compressed(encoded_text, codes, filename="compressed.bin"):
    # Convert bitstring to bytes
    padding = 8 - (len(encoded_text) % 8)
    encoded_text += "0" * padding

    # Store padding info at start
    padded_info = "{0:08b}".format(padding)
    encoded_text = padded_info + encoded_text

    # Convert to byte array
    b = bytearray()
    for i in range(0, len(encoded_text), 8):
        byte = encoded_text[i:i+8]
        b.append(int(byte, 2))

    with open(filename, "wb") as f:
        f.write(b)
    print(f"Compressed data saved to {filename}")
    
def load_compressed(filename, root):
    with open(filename, "rb") as f:
        bit_string = ""
        byte = f.read(1)
        while byte:
            byte = ord(byte)
            bits = bin(byte)[2:].rjust(8, "0")
            bit_string += bits
            byte = f.read(1)

    # Remove padding
    padding = int(bit_string[:8], 2)
    encoded_text = bit_string[8:-padding] if padding > 0 else bit_string[8:]

    return decode(encoded_text, root)

if __name__ == "__main__":
    text = input("Enter text to compress: ")
    
    root = build_huffman_tree(text)
    codes = generate_codes(root)
    encoded = encode(text, codes)
    decoded = decode(encoded, root)
    
    print("\n ---- Huffman Codes ----")
    for char, code in codes.items():
        print(f"'{char}': {code}")

    print("\n ===== Results =====")
    print(f"Original Text: {text}")
    print(f"Encoded Text: {encoded}")
    print(f"Decoded Text: {decoded}")

    original_bits, compressed_bits, ratio = compression_stats(text, encoded)
    print(f"Original Size (bits): {original_bits}")
    print(f"Compressed Size (bits): {compressed_bits}")
    print(f"Compression Ratio: {ratio:.2f}")
    print("\n ---- Huffman Tree ----")
    print_huffman_tree(root)
    save_compressed(encoded, codes)
    loaded_decoded = load_compressed("compressed.bin", root)
    print(f"\nDecoded from file: {loaded_decoded}")
