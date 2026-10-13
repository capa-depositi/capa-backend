import { getDatabase } from '../database/connection.js';

export const interestService = {
  // Calcola gli interessi sul deposito cauzionale (affittuario è l'unico ruolo)
  async calculate(profileId) {
    const pool = getDatabase();

    // 1. Verifica che il profilo esista
    const profileRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
    const profile = profileRes.rows[0];
    if (!profile) throw new Error('Profile not found');

    // Converte in oggetto per facile accesso
    const answersRes = await pool.query('SELECT * FROM answers WHERE profile_id = $1', [profileId]);
    const answers = answersRes.rows;

    const answersMap = {};
    answers.forEach(answer => { answersMap[answer.question_id] = answer.answer_value; });

    // 2. answersMap already populated above

    // 3. Verifica che il questionario sia completato
    if (answersMap['Q4_AFF'] === 'No') {
      return {
        deposit: 0,
        interest: 0,
        message: 'Non hai versato deposito cauzionale, quindi non sono previsti interessi.'
      };
    }

    // Verifica risposte obbligatorie
    const requiredQuestions = ['Q1_AFF', 'Q4_AFF', 'Q5_AFF', 'Q6_AFF'];
    for (const q of requiredQuestions) {
      if (!answersMap[q]) {
        throw new Error('Incomplete questionnaire');
      }
    }

    // 4. Calcola il deposito cauzionale
    const monthlyRent = parseFloat(answersMap['Q1_AFF']);
    const months = parseInt(answersMap['Q6_AFF']);
    const deposit = monthlyRent * months;

    // 5. Ottieni la data di versamento
    const depositDate = new Date(answersMap['Q5_AFF']);
    if (Number.isNaN(depositDate.getTime())) {
      throw new Error('Invalid deposit date');
    }

    const today = new Date();
    if (depositDate > today) {
      return {
        deposit,
        interest: 0,
        years: 0,
        monthlyRent,
        months,
        depositDate: depositDate.toISOString().split('T')[0],
        message: 'La data del deposito è nel futuro. Inserisci una data valida in passato.'
      };
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((today.getTime() - depositDate.getTime()) / msPerDay);

    if (totalDays < 1) {
      return {
        deposit,
        interest: 0,
        years: 0,
        monthlyRent,
        months,
        depositDate: depositDate.toISOString().split('T')[0],
        message: 'Il deposito è stato versato recentemente, non sono ancora maturati interessi.'
      };
    }

    const yearsElapsed = Math.floor(totalDays / 365.25);

    let totalInterest = 0;
    let segmentStart = new Date(depositDate);

    while (segmentStart < today) {
      const segmentYear = segmentStart.getFullYear();
      const nextYearStart = new Date(segmentYear + 1, 0, 1);
      const segmentEnd = nextYearStart < today ? nextYearStart : today;
      const segmentDays = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / msPerDay);

      const legalRate = await this.getLegalRateForYear(segmentYear);
      totalInterest += deposit * (legalRate / 100) * (segmentDays / 365.25);

      segmentStart = segmentEnd;
    }

    return {
      deposit,
      interest: Math.round(totalInterest * 100) / 100,
      years: yearsElapsed,
      monthlyRent,
      months,
      depositDate: depositDate.toISOString().split('T')[0]
    };
  },

  // Ottieni il tasso legale per un anno specifico
  async getLegalRateForYear(year) {
    const pool = getDatabase();
    const res = await pool.query('SELECT rate FROM legal_rates WHERE year = $1', [year]);
    if (!res.rows[0]) return 0.5; // default
    return res.rows[0].rate;
  }
};