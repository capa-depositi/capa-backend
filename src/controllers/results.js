import { resultTokensService } from '../services/resultTokens.js';
import { interestService } from '../services/interest.js';
import { extractParams } from '../routes/index.js';
import { submissionsService } from '../services/submissions.js';

export const resultsController = {
  // GET /api/risultato/:token — usato dal link nell'email per rivedere il risultato
  async getByToken(req, res) {
    try {
      const params = extractParams(req.url.split('?')[0], '/api/risultato/:token');
      const { token } = params;

      if (!token) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Token mancante' }));
        return;
      }

      const resolved = await resultTokensService.resolve(token);

      if (resolved.error === 'not_found') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Link non valido' }));
        return;
      }
      if (resolved.error === 'expired') {
        res.writeHead(410);
        res.end(JSON.stringify({ error: 'Link scaduto' }));
        return;
      }

      const result = await interestService.calculate(resolved.submissionId);
      const submission = await submissionsService.getById(resolved.submissionId);

      res.writeHead(200);
      res.end(JSON.stringify({
        submissionId: resolved.submissionId,
        submissionStatus: submission.status,
        emailStatus: submission.email_status,
        ...result
      }));
    } catch (error) {
      console.error('Result token fetch error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch result' }));
    }
  }
};
