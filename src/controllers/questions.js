import { questionsService } from '../services/questions.js';

export const questionsController = {
  // GET /api/questions/:role (role is ignored, affittuario is the only questionnaire)
  async getByRole(req, res) {
    try {
      // Ottieni le domande dal service
      const questions = await questionsService.getByRole();

      res.writeHead(200);
      res.end(JSON.stringify(questions));

    } catch (error) {
      console.error('Questions fetch error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch questions' }));
    }
  }
};
