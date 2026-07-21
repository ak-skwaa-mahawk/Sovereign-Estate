import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/glyph-stream' });

app.use(express.static(path.join(__dirname, 'dist')));

// Serve raw Solidity contract source for Remix sync
app.get('/api/contract/SovereignGTC.sol', (req, res) => {
  const contractPath = path.join(__dirname, 'contracts', 'SovereignGTC.sol');
  if (fs.existsSync(contractPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(contractPath);
  } else {
    res.status(404).json({ error: "SovereignGTC.sol contract file not found" });
  }
});

wss.on('connection', (ws) => {
  console.log('⚡ [WEBSOCKET]: Client connected to /glyph-stream');

  const interval = setInterval(() => {
    const mockData = {
      timestamp: Date.now(),
      vessel: 'FPT-Ω #99733-Q',
      fireseed: '79.79 Hz',
      vitality: 0.8543 + (Math.sin(Date.now() / 1000) * 0.1),
      quorum_pass: true,
      matrix_stream: {
        phase_shift_x: 1.292748,
        phase_shift_y: 0.155354,
        lyapunov_drift: -7.683965
      },
      recombination_fragments: ["GTC_OK", "NOISE_PURGED"]
    };
    ws.send(JSON.stringify(mockData));
  }, 1000);

  ws.on('close', () => clearInterval(interval));
});

const PORT = 3000;
// Bind specifically to 0.0.0.0 for seamless local loopback connections
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [SOVEREIGN ESTATE BACKEND]: Routing HTTP + WebSockets on Port ${PORT}...`);
});
