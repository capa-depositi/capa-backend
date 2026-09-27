import { getDatabase } from '../database/connection.js';

// Business logic per calcolo interessi. Questa versione segue la logica originale del progetto "capa".
export const interestService = {
  async calculate(profileId) {
    if (!profileId) throw new Error('Profile not found');

    const pool = getDatabase();

    // Recupera tutte le risposte per il profilo
    const answersRes = await pool.query('SELECT * FROM answers WHERE profile_id = $1', [profileId]);
    const answers = answersRes.rows;

    if (!answers || answers.length === 0) throw new Error('Incomplete questionnaire');

    // Mappa delle risposte per accesso rapido
    const map = new Map();
    for (const a of answers) {
      map.set(a.question_id, a.answer_value);
    }

    // Estrai campi necessari dal questionario
    const importoStr = map.get('importo');
    const depositDate = map.get('data_deposito');

    if (!importoStr || !depositDate) throw new Error('Incomplete questionnaire');

    const importo = Number(importoStr);
    const depositDateObj = new Date(depositDate);
    if (Number.isNaN(importo) || Number.isNaN(depositDateObj.getTime())) throw new Error('Invalid deposit date');

    // Recupera i legal_rates ordinati per data
    const ratesRes = await pool.query('SELECT * FROM legal_rates ORDER BY dal ASC');
    const rates = ratesRes.rows;

    if (!rates || rates.length === 0) throw new Error('No legal rates configured');

    // Calcolo iterativo degli interessi usando i tassi della tabella
    const results = [];

    let currentDate = depositDateObj;
    let remaining = importo;

    for (let i = 0; i < rates.length; i++) {
      const rate = rates[i];
      const nextRateStart = i + 1 < rates.length ? new Date(rates[i + 1].dal) : null;

      const segmentStart = currentDate;
      const segmentEnd = nextRateStart || new Date();

      // Calcolo giorni nel segmento
      const days = Math.max(0, Math.ceil((segmentEnd - segmentStart) / (1000 * 60 * 60 * 24)));

      if (days <= 0) continue;

      const yearlyRate = Number(rate.tasso_percentuale) / 100;

      // Semplice interesse prorata temporis
      const interest = remaining * yearlyRate * (days / 365);

      results.push({
        from: segmentStart.toISOString().slice(0, 10),
        to: (segmentEnd).toISOString().slice(0, 10),
        days,
        rate: yearlyRate,
        interest: Number(interest.toFixed(2))
      });

      // Avanza la data corrente
      currentDate = segmentEnd;
    }

    const totalInterest = results.reduce((s, r) => s + r.interest, 0);

    return {
      profileId,
      importo,
      calculatedAt: new Date().toISOString(),
      totalInterest: Number(totalInterest.toFixed(2)),
      breakdown: results
    };
  }
};
