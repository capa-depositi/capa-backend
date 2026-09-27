import { answersService } from '../services/answers.js';
import { parseRequestBody } from '../utils/request.js';
import { saveAnswerSchema } from '../validation/schemas.js';
import { extractParams } from '../routes/index.js';

export const answersController = {
  // POST /api/answers
  async save(req, res) {
    try {
      const body = await parseRequestBody(req);

      // Valida i dati
      const validatedData = saveAnswerSchema.parse(body);

      // Salva la risposta
      await answersService.save(validatedData);

      res.writeHead(201);
      res.end(JSON.stringify({ success: true }));

    } catch (error) {
      console.error('Answer save error:', error);

      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save answer' }));
      }
    }
  },

  // GET /api/answers/:profileId
  async getByProfileId(req, res) {
    try {
      const params = extractParams(req.url.split('?')[0], '/api/answers/:profileId');
      const { profileId } = params;

      if (!profileId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Profile ID required' }));
        return;
      }

      const answers = await answersService.getByProfileId(profileId);

      res.writeHead(200);
      res.end(JSON.stringify(answers));

    } catch (error) {
      console.error('Get answers error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch answers' }));
    }
  }
};
