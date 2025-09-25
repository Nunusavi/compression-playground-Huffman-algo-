import heapq
import tkinter as tk
from tkinter import scrolledtext
from collections import Counter


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

def get_huffman_tree_lines(node, prefix="", is_left=True):
    """Generates a list of strings representing the Huffman tree for display in Tkinter."""
    lines = []
    if node is None:
        return lines

    if node.char is not None:
        lines.append(prefix + ("├── " if is_left else "└── ") + f"'{node.char}' ({node.freq})")
    else:
        lines.append(prefix + ("├── " if is_left else "└── ") + f"* ({node.freq})")

    new_prefix = prefix + ("│   " if is_left else "    ")
    lines += get_huffman_tree_lines(node.left, new_prefix, True)
    lines += get_huffman_tree_lines(node.right, new_prefix, False)
    return lines

def print_huffman_tree(node, prefix="", is_left=True):
    """Prints the Huffman tree to the console (unchanged)."""
    lines = get_huffman_tree_lines(node, prefix, is_left)
    for line in lines:
        print(line)

def huffman_tree_to_string(node):
    """Returns the Huffman tree as a string for Tkinter display."""
    return "\n".join(get_huffman_tree_lines(node))
    
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
def launch_gui():
    def compress_action():
        text = input_box.get("1.0", tk.END).strip()
        if not text:
            return

        root = build_huffman_tree(text)
        codes = generate_codes(root)
        encoded = encode(text, codes)
        decoded = decode(encoded, root)
        orig, comp, ratio = compression_stats(text, encoded)

        # Huffman Codes
        codes_box.config(state=tk.NORMAL)
        codes_box.delete("1.0", tk.END)
        codes_box.insert(tk.END, "--- Huffman Codes ---\n")
        for ch, code in codes.items():
            codes_box.insert(tk.END, f"'{ch}': {code}\n")
        codes_box.config(state=tk.DISABLED)

        # Encoded Text
        encoded_box.config(state=tk.NORMAL)
        encoded_box.delete("1.0", tk.END)
        encoded_box.insert(tk.END, "--- Encoded Text ---\n")
        encoded_box.insert(tk.END, encoded)
        encoded_box.config(state=tk.DISABLED)

        # Decoded Text
        decoded_box.config(state=tk.NORMAL)
        decoded_box.delete("1.0", tk.END)
        decoded_box.insert(tk.END, "--- Decoded Text ---\n")
        decoded_box.insert(tk.END, decoded)
        decoded_box.config(state=tk.DISABLED)

        # Huffman Tree
        tree_box.config(state=tk.NORMAL)
        tree_box.delete("1.0", tk.END)
        tree_box.insert(tk.END, "--- Huffman Tree ---\n")
        tree_box.insert(tk.END, huffman_tree_to_string(root))
        tree_box.config(state=tk.DISABLED)

        # Stats
        stats_box.config(state=tk.NORMAL)
        stats_box.delete("1.0", tk.END)
        stats_box.insert(tk.END, f"Original: {orig} bits\nCompressed: {comp} bits\nCompression saved: {ratio:.2f}%\n")
        stats_box.config(state=tk.DISABLED)

    root = tk.Tk()
    root.title("Huffman Compression Playground")

    tk.Label(root, text="Enter text:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
    input_box = scrolledtext.ScrolledText(root, height=5, width=60)
    input_box.grid(row=1, column=0, columnspan=2, sticky="nsew", padx=5)

    compress_btn = tk.Button(root, text="Compress", command=compress_action)
    compress_btn.grid(row=2, column=0, columnspan=2, pady=5)

    # Huffman Codes
    tk.Label(root, text="Huffman Codes:").grid(row=3, column=0, sticky="w", padx=5)
    codes_box = scrolledtext.ScrolledText(root, height=6, width=30, state=tk.DISABLED)
    codes_box.grid(row=4, column=0, sticky="nsew", padx=5)

    # Encoded Text
    tk.Label(root, text="Encoded Text:").grid(row=3, column=1, sticky="w", padx=5)
    encoded_box = scrolledtext.ScrolledText(root, height=6, width=30, state=tk.DISABLED)
    encoded_box.grid(row=4, column=1, sticky="nsew", padx=5)

    # Decoded Text
    tk.Label(root, text="Decoded Text:").grid(row=5, column=0, sticky="w", padx=5)
    decoded_box = scrolledtext.ScrolledText(root, height=4, width=30, state=tk.DISABLED)
    decoded_box.grid(row=6, column=0, sticky="nsew", padx=5)

    # Huffman Tree
    tk.Label(root, text="Huffman Tree:").grid(row=5, column=1, sticky="w", padx=5)
    tree_box = scrolledtext.ScrolledText(root, height=8, width=30, state=tk.DISABLED)
    tree_box.grid(row=6, column=1, sticky="nsew", padx=5)

    # Compression Stats
    tk.Label(root, text="Compression Stats:").grid(row=7, column=0, sticky="w", padx=5)
    stats_box = scrolledtext.ScrolledText(root, height=2, width=60, state=tk.DISABLED)
    stats_box.grid(row=8, column=0, columnspan=2, sticky="nsew", padx=5, pady=(0,5))

    # Make the grid expand properly
    for i in range(9):
        root.grid_rowconfigure(i, weight=1)
    for j in range(2):
        root.grid_columnconfigure(j, weight=1)

    root.mainloop()

if __name__ == "__main__":
    choice = input("Run GUI (g) or Command Line (c)? ").strip().lower()
    if choice == 'g':
        launch_gui()
    else:
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
