import { profilesService } from '../services/profiles.js';
import { parseRequestBody } from '../utils/request.js';
import { createProfileSchema, loginSchema } from '../validation/schemas.js';

export const profilesController = {
  // POST /api/profiles
  async create(req, res) {
    try {
      // Leggi il body della richiesta
      const body = await parseRequestBody(req);

      // Valida i dati con Zod
      const validatedData = createProfileSchema.parse(body);

      // Crea il profilo tramite il service
      const profile = await profilesService.create(validatedData);

      // Rispondi con successo
      res.writeHead(201);
      res.end(JSON.stringify({
        success: true,
        profileId: profile.id,
        role: profile.ruolo
      }));

    } catch (error) {
      console.error('Profile creation error:', error);

      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to create profile' }));
      }
    }
  },

  // POST /api/profiles/login
  async login(req, res) {
    try {
      const body = await parseRequestBody(req);
      const validatedData = loginSchema.parse(body);

      const profile = await profilesService.findByEmail(validatedData.email);
      if (!profile) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profilo non trovato. Usa Registrati se non hai un account.' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        profileId: profile.id,
        role: profile.ruolo
      }));
    } catch (error) {
      console.error('Profile login error:', error);

      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to login' }));
      }
    }
  }
};
