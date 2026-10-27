# Stockfish for GregSnap Chess

`stockfish.js` + `stockfish.wasm` are **Stockfish 11** compiled to WebAssembly by the
[stockfish.js](https://github.com/nmrugg/stockfish.js) project (branch `Stockfish11`).
GregSnap's Chess game runs it in a Web Worker (`new Worker('stockfish/stockfish.js')`).

Stockfish is free software under the GNU GPL v3 (see `COPYING.txt`).
Source code: https://github.com/official-stockfish/Stockfish and https://github.com/nmrugg/stockfish.js

If the worker can't load (e.g. the page is opened from `file://`), the game falls back to its built-in engine.
