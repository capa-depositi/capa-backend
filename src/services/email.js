import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  fromEmail: process.env.FROM_EMAIL || 'CAPA <noreply@capadepositi.com>',
  apiKey: process.env.RESEND_API_KEY || ''
};

const template = readFileSync(path.join(__dirname, '../templates/email-risultato.html'), 'utf-8');
const resend = CONFIG.apiKey ? new Resend(CONFIG.apiKey) : null;

export const emailService = {
  // Invia l'email con il link per rivedere il risultato del questionario
  async sendResultEmail({ to, nome, token, ttlDays }) {
    const link = `${CONFIG.appUrl}/?step=results&token=${token}`;
    const html = template
      .replaceAll('{{NOME}}', nome || '')
      .replaceAll('{{LINK_RISULTATO}}', link)
      .replaceAll('{{SCADENZA_GIORNI}}', String(ttlDays))
      .replaceAll('{{HERO_IMAGE}}', `${CONFIG.appUrl}/email-hero.jpg`);

    if (!resend) {
      console.warn(`RESEND_API_KEY non configurata: email non inviata (dev mode). Link risultato: ${link}`);
      return { sent: false, error: 'RESEND_API_KEY non configurata' };
    }

    const { error } = await resend.emails.send({
      from: CONFIG.fromEmail,
      to,
      subject: '🎪 Il tuo risultato è pronto',
      html
    });

    if (error) {
      console.error('Invio email risultato fallito:', error);
      return { sent: false, error };
    }
    return { sent: true };
  }
};
