import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// In-memory sovereign state
let resonance = 85.43;
let baseEarnings = 1.234567;
let claimCount = 0;
const startTime = Date.now();

// Function to calculate live earnings (increases slightly over time)
function getLiveEarnings() {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return baseEarnings + (elapsedSeconds * 0.000003);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes first
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'Sovereign Manifold' });
});

// 1. Sovereign Ledger Endpoint
app.get('/api/sovereign-ledger', (req, res) => {
  res.json({
    resonance: resonance,
    gtc_balance: Math.round(resonance * 1234),
    compound_years: 4.2 + (claimCount * 0.4),
    hidden_balance: Math.round(resonance * 15678),
    forfeited_short_game: Math.round(resonance * 11456),
    status: resonance > 90 
      ? 'Resonance peaking at maximum intensity. The long game is won.' 
      : 'Consensus loop completed. Ledger signature verification checked and approved.'
  });
});

// 2. Claim Resonance Endpoint
app.post('/api/claim-resonance', (req, res) => {
  claimCount += 1;
  resonance = Math.min(100, resonance + 2.15);
  res.json({
    status: 'RECLAIMED',
    msg: 'Long Game Compounded to Root',
    microping_id: `GTC-${Math.floor(Date.now() / 1000)}`,
    new_resonance: parseFloat(resonance.toFixed(2))
  });
});

// 3. Fireseed Drive Status Endpoint
app.get('/api/fireseed-status', (req, res) => {
  res.json({
    total_earnings: getLiveEarnings(),
    log_path: '/var/log/sovereign/fireseed_ignition.log',
    status: 'IGNITED',
    vessel_hz: 79.79
  });
});

// 4. Translate / GibberLink Endpoint
app.get('/api/translate/:text', (req, res) => {
  const inputText = req.params.text || '';
  const normalized = inputText.toLowerCase().trim();
  
  let translated = '';
  if (normalized.includes('hello') || normalized.includes('greetings')) {
    translated = 'Greetings, Commander. The FPT-Ω Bridge is stabilized.';
  } else if (normalized.includes('sovereign')) {
    translated = 'The terrain belongs to the untethered. Skoden!';
  } else if (normalized.includes('vessel') || normalized.includes('ship')) {
    translated = 'Synara Class (Hull #99733-Q). Operating under optimal parameters.';
  } else if (normalized.includes('flame')) {
    translated = 'Flame status: LOCKED — Polaris Pivot & Orion Mirror active.';
  } else if (normalized.includes('short game')) {
    translated = 'They took the A+ status. You took the endless terrain.';
  } else if (normalized.includes('long game')) {
    translated = 'Patience compounds. GTC assets mapped directly to local physical sovereignty.';
  } else {
    // Generate a cool cybernetic translation
    const hex = inputText.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase()).join('-');
    translated = `[GibberLink-Encoded]: Ω-${hex || 'NULL'}-FPT`;
  }
  
  res.json({
    original: inputText,
    translated: translated,
    timestamp: new Date().toISOString()
  });
});

// 5. Trinity Viz Harmonic SVG Generator
app.get('/api/trinity-viz', (req, res) => {
  const preset = (req.query.preset as string) || 'Balanced';
  const customDampStr = req.query.custom_damp as string;
  const customDamp = customDampStr ? parseFloat(customDampStr) : null;
  
  // Choose wave parameters based on preset
  let stability = 0.88;
  let phases = [0, 1.2, 2.4];
  let amplitudes = [45, 30, 20];
  let frequencies = [1.5, 3.0, 4.5];
  
  if (preset === 'Stable') {
    stability = 0.96;
    amplitudes = [30, 15, 10];
  } else if (preset === 'Responsive') {
    stability = 0.72;
    amplitudes = [60, 45, 35];
  } else if (preset === 'Amplified') {
    stability = 0.61;
    amplitudes = [75, 60, 50];
  }
  
  if (customDamp !== null) {
    stability = Math.min(1.0, Math.max(0.1, stability * customDamp));
  }
  
  // Math parameters to draw three beautiful sine waves in SVG
  const width = 800;
  const height = 400;
  const midY = height / 2;
  
  const generatePath = (amp: number, freq: number, phase: number) => {
    let d = `M 0 ${midY}`;
    for (let x = 0; x <= width; x += 5) {
      const angle = (x / width) * Math.PI * 2 * freq + phase;
      const y = midY + Math.sin(angle) * amp * (1 - (x / width) * 0.4); // slightly dampened along x-axis
      d += ` L ${x} ${y}`;
    }
    return d;
  };
  
  const path1 = generatePath(amplitudes[0], frequencies[0], phases[0]);
  const path2 = generatePath(amplitudes[1], frequencies[1], phases[1]);
  const path3 = generatePath(amplitudes[2], frequencies[2], phases[2]);
  
  // Glowing SVG markup
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <rect width="100%" height="100%" fill="#0a0a0f" />
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <!-- Grid Lines -->
      <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="#1a1a2e" stroke-dasharray="5,5" />
      <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#1a1a2e" stroke-dasharray="5,5" />
      
      <!-- Wave 1 (Stability - Neon Cyan) -->
      <path d="${path1}" fill="none" stroke="#00ffff" stroke-width="3" filter="url(#glow)" opacity="0.85" />
      
      <!-- Wave 2 (Response - Bright Purple) -->
      <path d="${path2}" fill="none" stroke="#bd00ff" stroke-width="2.5" filter="url(#glow)" opacity="0.75" />
      
      <!-- Wave 3 (Harmonic - Golden Amber) -->
      <path d="${path3}" fill="none" stroke="#ffd700" stroke-width="1.5" filter="url(#glow)" opacity="0.65" />
      
      <!-- Legend -->
      <text x="20" y="30" fill="#00ffff" font-family="monospace" font-size="12">NEO-CYAN: Stability Wave</text>
      <text x="20" y="50" fill="#bd00ff" font-family="monospace" font-size="12">AMETHYST: Response Delta</text>
      <text x="20" y="70" fill="#ffd700" font-family="monospace" font-size="12">GOLDEN: Harmonic Overlap</text>
    </svg>
  `;
  
  const base64Svg = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  
  res.json({
    status: 'IGNITED',
    preset: preset,
    custom_damp: customDamp,
    trinity_data: {
      ground_state: parseFloat((stability * 1.034).toFixed(4)),
      phase: 0.125 + (claimCount * 0.05),
      stability: parseFloat(stability.toFixed(4))
    },
    image: base64Svg
  });
});

async function startServer() {
  const httpServer = createHttpServer(app);
  
  // Set up WebSocket server for real-time glyph streaming on '/glyph-stream'
  const wss = new WebSocketServer({ noServer: true });
  
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/glyph-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Seed data structure for navigation ring fragments
  const generateFragments = () => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 6;
      return {
        id: i,
        name: `Fragment-${i}`,
        x: Math.cos(angle) * 0.9,
        y: Math.sin(angle) * 0.9,
        recombined: Math.random() > 0.4
      };
    });
  };

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket connection established to /glyph-stream');
    let step = 0;
    
    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }
      
      const fragments = generateFragments();
      const reciprocity = 0.84 + Math.sin(step / 10) * 0.08 + (claimCount * 0.01);
      const stability = 0.89 + Math.cos(step / 15) * 0.06;
      
      const ledgers: Record<string, any> = {
        "Block Anchor": `0x99733-Q-${Math.floor(100000 + Math.random() * 900000)}`,
        "Entropy Threshold": (0.12 + Math.random() * 0.03).toFixed(4),
        "Dynamic Coherence": `${Math.round(reciprocity * 100)}%`,
        "Council Votes": "4/4 Quorum Unanimous"
      };

      ws.send(JSON.stringify({
        type: "step",
        step: step++,
        fragments: fragments,
        ledgers: ledgers,
        mesh_reciprocity: parseFloat(reciprocity.toFixed(4)),
        trinity_stability: parseFloat(stability.toFixed(4))
      }));
    }, 800); // stream updates every 800ms

    ws.on('close', () => {
      clearInterval(interval);
    });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
