import { interestService } from '../services/interest.js';
import { parseRequestBody } from '../utils/request.js';
import { calculateInterestSchema } from '../validation/schemas.js';
import { resultTokensService } from '../services/resultTokens.js';
import { emailService } from '../services/email.js';
import { profilesService } from '../services/profiles.js';

export const interestController = {
  // POST /api/calculate-interest
  async calculate(req, res) {
    try {
      const body = await parseRequestBody(req);
      const validatedData = calculateInterestSchema.parse(body);

      // Calcola gli interessi
      const result = await interestService.calculate(validatedData.profileId);

      if (result === undefined || result === null) {
        // Ensure we always return a valid JSON body
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Empty result from calculation' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify(result));

      // Invia (una tantum) l'email col link per rivedere il risultato in futuro
      try {
        const tokenInfo = await resultTokensService.getOrCreate(validatedData.profileId);
        if (tokenInfo.isNew) {
          const profile = await profilesService.findById(validatedData.profileId);
          if (profile?.email) {
            await emailService.sendResultEmail({
              to: profile.email,
              nome: profile.nome,
              token: tokenInfo.token,
              ttlDays: tokenInfo.ttlDays
            });
          }
        }
      } catch (emailError) {
        console.error('Invio email risultato fallito:', emailError);
      }

    } catch (error) {
      console.error('Interest calculation error:', error);

      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }));
      } else if (error.message === 'Profile not found') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      } else if (error.message === 'Invalid deposit date') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Data deposito non valida' }));
      } else if (error.message === 'Incomplete questionnaire') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Questionnaire not completed' }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to calculate interest' }));
      }
    }
  }
};
