import tkinter as tk
from tkinter import scrolledtext

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

        output_box.delete("1.0", tk.END)
        output_box.insert(tk.END, "--- Huffman Codes ---\n")
        for ch, code in codes.items():
            output_box.insert(tk.END, f"'{ch}': {code}\n")

        output_box.insert(tk.END, f"\nEncoded: {encoded}\n")
        output_box.insert(tk.END, f"Decoded: {decoded}\n")
        output_box.insert(tk.END, f"\nOriginal: {orig} bits | Compressed: {comp} bits\n")
        output_box.insert(tk.END, f"Compression saved: {ratio:.2f}%\n")

    root = tk.Tk()
    root.title("Huffman Compression Playground")

    tk.Label(root, text="Enter text:").pack()
    input_box = scrolledtext.ScrolledText(root, height=5, width=60)
    input_box.pack()

    tk.Button(root, text="Compress", command=compress_action).pack()

    output_box = scrolledtext.ScrolledText(root, height=20, width=60)
    output_box.pack()

    root.mainloop()
