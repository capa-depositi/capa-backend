import { parseRequestBody } from '../utils/request.js';
import { extractParams } from '../routes/index.js';
import { createSubmissionSchema } from '../validation/schemas.js';
import { submissionsService } from '../services/submissions.js';
import { resultTokensService } from '../services/resultTokens.js';
import { emailService } from '../services/email.js';

async function sendCompletionEmail(submissionId) {
  const attemptId = await submissionsService.claimEmailAttempt(submissionId);
  if (!attemptId) return;

  try {
    const submission = await submissionsService.getById(submissionId);
    if (!submission?.email) throw new Error('Submission profile has no email');

    const tokenInfo = await resultTokensService.create(submissionId);
    const result = await emailService.sendResultEmail({
      to: submission.email,
      nome: submission.nome,
      token: tokenInfo.token,
      ttlDays: tokenInfo.ttlDays
    });
    await submissionsService.recordEmailResult(submissionId, attemptId, result);
  } catch (error) {
    console.error('Submission result email failed:', error);
    await submissionsService.recordEmailResult(submissionId, attemptId, { sent: false, error });
  }
}

export const submissionsController = {
  async create(req, res) {
    try {
      const body = await parseRequestBody(req);
      const { profileId } = createSubmissionSchema.parse(body);
      const submission = await submissionsService.create(profileId);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, submissionId: submission.id, status: submission.status }));
    } catch (error) {
      console.error('Submission creation error:', error);
      if (error.name === 'ZodError') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Validation error', details: error.errors }));
      } else if (error.message === 'Profile not found') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to create submission' }));
      }
    }
  },

  async complete(req, res) {
    try {
      const { submissionId } = extractParams(req.url.split('?')[0], '/api/submissions/:submissionId/complete');
      const result = await submissionsService.complete(submissionId);
      if (!result.completed) {
        res.writeHead(200);
        res.end(JSON.stringify({
          completed: false,
          status: result.status,
          emailStatus: result.emailStatus
        }));
        return;
      }

      await sendCompletionEmail(submissionId);
      const submission = await submissionsService.getById(submissionId);
      res.writeHead(200);
      res.end(JSON.stringify({
        completed: true,
        status: submission.status,
        emailStatus: submission.email_status
      }));
    } catch (error) {
      console.error('Submission completion error:', error);
      if (error.message === 'Submission not found') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Submission not found' }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to complete submission' }));
      }
    }
  }
};
