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
