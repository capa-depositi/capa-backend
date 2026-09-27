import { profilesService } from '../src/services/profiles.js';
import { questionsService } from '../src/services/questions.js';

console.log('🧪 Test delle funzionalità principali...');

// Test creazione profilo
try {
  const profile = await profilesService.create({
    nome: 'Mario',
    cognome: 'Test',
    eta: 30,
    email: 'mario@test.com',
    ruolo: 'affittuario'
  });
  console.log('✅ Creazione profilo:', profile);
} catch (error) {
  console.error('❌ Errore creazione profilo:', error.message);
}

// Test recupero domande
try {
  const questions = await questionsService.getByRole('affittuario');
  console.log('✅ Domande affittuario:', questions.length);
} catch (error) {
  console.error('❌ Errore recupero domande:', error.message);
}

console.log('🎉 Test completati!');
