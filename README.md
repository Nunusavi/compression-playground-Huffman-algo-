# Huffman Compression Playground

A comprehensive educational tool for understanding and visualizing Huffman compression algorithm. This project provides both a command-line interface and an interactive web-based visualization to demonstrate how Huffman coding works for data compression.

## 🌟 Features

- **Dual Interface**: Both command-line and web-based interfaces
- **Real-time Compression**: Compress and decompress text using Huffman algorithm
- **Visual Tree Representation**: See the Huffman tree structure generated for your input
- **Compression Statistics**: Compare original vs compressed data sizes
- **File Operations**: Save compressed data to files and load them back
- **Interactive GUI**: Desktop application with tkinter interface
- **Modern Web UI**: Responsive web interface with TailwindCSS styling

## 📸 Screenshot

![Web Interface Demo](https://github.com/user-attachments/assets/89e657fc-d2d9-47c3-95ec-8c33442865a5)

*The web interface showing compression of "hello world compression test" with Huffman codes, compression statistics, and visual tree representation.*

## 🚀 Quick Start

### Prerequisites

- Python 3.6 or higher
- tkinter (usually comes with Python installation)
- Modern web browser (for web interface)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Nunusavi/compression-playground-Huffman-algo-.git
cd compression-playground-Huffman-algo-
```

2. For Ubuntu/Debian users, ensure tkinter is installed:
```bash
sudo apt-get install python3-tk
```

## 💻 Usage

### Command Line Interface

Run the main Python script and choose the command-line option:

```bash
python3 main.py
```

When prompted, enter `c` for command-line mode and then input your text:

```
Run GUI (g) or Command Line (c)? c
Enter text to compress: hello world

 ---- Huffman Codes ----
'e': 000
'd': 001
'r': 010
'w': 011
'l': 10
'o': 110
'h': 1110
' ': 1111

 ===== Results =====
Original Text: hello world
Encoded Text: 11100001010110111101111001010001
Decoded Text: hello world
Original Size (bits): 88
Compressed Size (bits): 32
Compression Ratio: 36.36%

 ---- Huffman Tree ----
├── * (11)
│   ├── * (4)
│   │   ├── * (2)
│   │   │   ├── 'e' (1)
│   │   │   └── 'd' (1)
│   │   └── * (2)
│   │       ├── 'r' (1)
│   │       └── 'w' (1)
│   └── * (7)
│       ├── 'l' (3)
│       └── * (4)
│           ├── 'o' (2)
│           └── * (2)
│               ├── 'h' (1)
│               └── ' ' (1)
```

### Desktop GUI Application

Launch the tkinter-based desktop application:

```bash
python3 main.py
```

When prompted, enter `g` for GUI mode. This will open a desktop application with:
- Text input area
- Huffman codes display
- Encoded/decoded text panels
- Tree visualization
- Compression statistics

### Web Interface

Open `Visualizing.html` in your web browser for an interactive web experience featuring:

- Modern, responsive design
- Real-time compression visualization
- Interactive Huffman tree display
- Compression statistics dashboard
- Clean, user-friendly interface

## 🛠️ Technical Details

### How Huffman Compression Works

1. **Frequency Analysis**: Count the frequency of each character in the input text
2. **Tree Construction**: Build a binary tree where frequent characters have shorter paths
3. **Code Generation**: Assign binary codes based on tree paths (left=0, right=1)
4. **Encoding**: Replace each character with its corresponding binary code
5. **Compression**: The result is typically shorter than the original (for texts with uneven character distribution)

### Project Structure

```
compression-playground-Huffman-algo-/
├── main.py              # Python implementation with CLI and GUI
├── Visualizing.html     # Web interface
├── script.js            # JavaScript implementation for web
├── style.css            # Styling for web interface
├── .gitignore          # Git ignore file
└── README.md           # This file
```

### Core Components

#### `main.py`
- **Node Class**: Represents tree nodes with character, frequency, and child references
- **build_huffman_tree()**: Constructs the Huffman tree using a priority queue
- **generate_codes()**: Creates binary codes for each character
- **encode()/decode()**: Converts text to/from binary representation
- **File I/O**: Save/load compressed data to/from binary files
- **GUI**: Tkinter interface for desktop usage

#### `script.js`
- JavaScript implementation mirroring the Python functionality
- Modern ES6+ syntax with classes and arrow functions
- DOM manipulation for web interface updates
- Tree visualization generation

#### Web Interface Features
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Instant compression as you type
- **Visual Feedback**: Color-coded Huffman codes and statistics
- **Keyboard Shortcuts**: Enter to compress, Shift+Enter for new lines

## 📊 Understanding the Output

### Huffman Codes
Each character gets a unique binary code:
- More frequent characters get shorter codes
- Less frequent characters get longer codes
- No code is a prefix of another (prefix-free property)

### Compression Statistics
- **Original Size**: Input text size in bits (assuming 8 bits per character)
- **Compressed Size**: Total bits in the encoded representation
- **Compression Ratio**: Percentage reduction in size

### Tree Visualization
- **Leaf Nodes**: Contain actual characters
- **Internal Nodes**: Show combined frequencies
- **Path to Character**: Binary code (left=0, right=1)

## 🎓 Educational Value

This project is perfect for:
- **Computer Science Students**: Understanding data compression algorithms
- **Educators**: Teaching binary trees and greedy algorithms
- **Self-learners**: Hands-on experience with compression techniques
- **Developers**: Seeing algorithm implementation in multiple languages

## 🤝 Contributing

Feel free to contribute by:
- Adding new features
- Improving the user interface
- Optimizing algorithms
- Adding more visualization options
- Writing tests
- Improving documentation

## 📝 License

This project is open source. Please check the repository for license details.

## 🔗 Additional Resources

- [Huffman Coding - Wikipedia](https://en.wikipedia.org/wiki/Huffman_coding)
- [Binary Trees and Tree Traversal](https://en.wikipedia.org/wiki/Binary_tree)
- [Data Compression Techniques](https://en.wikipedia.org/wiki/Data_compression)

---

**Note**: Compression effectiveness depends on character frequency distribution. Texts with more varied character frequencies will compress better than uniform texts.