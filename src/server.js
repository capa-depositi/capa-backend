import http from 'http';
import { parse } from 'url';
import { router, findRouteHandler } from './routes/index.js';
import { profilesController } from './controllers/profiles.js';

// Configurazione server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
// Origini consentite (separate da virgola), es. https://capa-frontend.vercel.app
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Crea il server HTTP
const server = http.createServer(async (req, res) => {
  // Headers CORS per permettere richieste dal frontend
  const origin = req.headers.origin;
  res.setHeader(
    'Access-Control-Allow-Origin',
    ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  );
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Gestisci richieste OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Parsing dell'URL per ottenere pathname e query
    const { pathname } = parse(req.url, true);
    console.log(`Request: ${req.method} ${pathname}`);

    // Routing manuale: trova il route handler corrispondente
    const { handler: routeHandler } = findRouteHandler(req.method, pathname);

    if (routeHandler) {
      // Chiama il handler del route
      await routeHandler(req, res);
    } else if (req.method === 'POST' && (pathname === '/api/profiles/login' || pathname === '/api/profiles/login/')) {
      // Fallback esplicito per login nel caso la route non venisse trovata
      await profilesController.login(req, res);
    } else {
      // Route non trovata
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Avvia il server
server.listen(PORT, HOST, () => {
  console.log(`🚀 CAPA Backend server listening on ${HOST}:${PORT}`);
  console.log(`📊 Database: PostgreSQL (pg)`);
  console.log(`🔐 Auth: JWT tokens`);
  console.log(`✅ Validation: Zod schemas`);
});
