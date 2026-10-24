import { interestService } from '../services/interest.js';
import { parseRequestBody } from '../utils/request.js';
import { calculateInterestSchema } from '../validation/schemas.js';
import { submissionsService } from '../services/submissions.js';

export const interestController = {
  // POST /api/calculate-interest
  async calculate(req, res) {
    try {
      const body = await parseRequestBody(req);
      const validatedData = calculateInterestSchema.parse(body);

      // Calcola gli interessi
      const result = await interestService.calculate(validatedData.submissionId);
      const submission = await submissionsService.getById(validatedData.submissionId);

      if (result === undefined || result === null) {
        // Ensure we always return a valid JSON body
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Empty result from calculation' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        submissionId: validatedData.submissionId,
        submissionStatus: submission.status,
        emailStatus: submission.email_status,
        ...result
      }));

    } catch (error) {
      console.error('Interest calculation error:', error);

      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }));
      } else if (error.message === 'Submission not found') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Submission not found' }));
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
