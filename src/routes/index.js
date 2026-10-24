// Sistema di routing manuale per Node.js HTTP server
// Questo approccio ti permette di capire come funzionano i router in Express

import { profilesController } from '../controllers/profiles.js';
import { questionsController } from '../controllers/questions.js';
import { answersController } from '../controllers/answers.js';
import { interestController } from '../controllers/interest.js';
import { resultsController } from '../controllers/results.js';
import { submissionsController } from '../controllers/submissions.js';

// Router object: { METHOD: { PATH: handler } }
export const router = {
  POST: {
    '/api/profiles': profilesController.create,
    '/api/profiles/login': profilesController.login,
    '/api/answers': answersController.save,
    '/api/submissions': submissionsController.create,
    '/api/submissions/:submissionId/complete': submissionsController.complete,
    '/api/calculate-interest': interestController.calculate
  },
  GET: {
    '/api/questions/:role': questionsController.getByRole,
    '/api/answers/:submissionId': answersController.getBySubmissionId,
    '/api/risultato/:token': resultsController.getByToken,
    '/api/health': (req, res) => {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'OK', message: 'CAPA Backend is running' }));
    }
  }
};

// Helper function per estrarre parametri dall'URL (come :role)
export function extractParams(pathname, routePattern) {
  const routeParts = routePattern.split('/');
  const pathParts = pathname.split('/');

  const params = {};

  routeParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1); // rimuovi ':'
      params[paramName] = pathParts[index];
    }
  });

  return params;
}

// Helper function per verificare se un pathname corrisponde a un pattern di route
export function matchRoute(pathname, routePattern) {
  const routeParts = routePattern.split('/');
  const pathParts = pathname.split('/');

  if (routeParts.length !== pathParts.length) {
    return false;
  }

  return routeParts.every((part, index) => {
    return part.startsWith(':') || part === pathParts[index];
  });
}

// Trova il gestore di route per un metodo e pathname, supportando dynamic route patterns
export function findRouteHandler(method, pathname) {
  const methodRoutes = router[method] || {};

  if (methodRoutes[pathname]) {
    return { handler: methodRoutes[pathname], params: {} };
  }

  for (const routePattern of Object.keys(methodRoutes)) {
    if (matchRoute(pathname, routePattern)) {
      return {
        handler: methodRoutes[routePattern],
        params: extractParams(pathname, routePattern)
      };
    }
  }

  return { handler: null, params: {} };
}
