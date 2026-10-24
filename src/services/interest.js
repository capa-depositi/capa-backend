import { getDatabase } from '../database/connection.js';
import { isSubmissionComplete } from './submissionRules.js';

export const interestService = {
  // Calcola gli interessi per una singola submission.
  async calculate(submissionId) {
    const pool = getDatabase();

    const submissionRes = await pool.query(
      `SELECT s.status
       FROM questionnaire_submissions s
       WHERE s.id = $1`,
      [submissionId]
    );
    const submission = submissionRes.rows[0];
    if (!submission) throw new Error('Submission not found');

    const [answersRes, questionsRes] = await Promise.all([
      pool.query('SELECT * FROM answers WHERE submission_id = $1', [submissionId]),
      pool.query('SELECT id, required, depends_on, depends_value FROM questions ORDER BY id')
    ]);
    const answers = answersRes.rows;
    const answersByQuestion = new Map(answers.map(answer => [answer.question_id, answer.answer_value]));

    const answersMap = {};
    answers.forEach(answer => { answersMap[answer.question_id] = answer.answer_value; });

    if (submission.status !== 'completed' || !isSubmissionComplete(questionsRes.rows, answersByQuestion)) {
      throw new Error('Incomplete questionnaire');
    }

    // Calcola il deposito cauzionale
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
    const yearlyBreakdown = [];
    let segmentStart = new Date(depositDate);

    while (segmentStart < today) {
      const segmentYear = segmentStart.getFullYear();
      const nextYearStart = new Date(segmentYear + 1, 0, 1);
      const segmentEnd = nextYearStart < today ? nextYearStart : today;
      const segmentDays = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / msPerDay);

      const legalRate = await this.getLegalRateForYear(segmentYear);
      const segmentInterest = deposit * (legalRate / 100) * (segmentDays / 365.25);
      totalInterest += segmentInterest;
      yearlyBreakdown.push({
        year: segmentYear,
        rate: legalRate,
        days: segmentDays,
        interest: Math.round(segmentInterest * 100) / 100
      });

      segmentStart = segmentEnd;
    }

    return {
      deposit,
      interest: Math.round(totalInterest * 100) / 100,
      years: yearsElapsed,
      monthlyRent,
      months,
      depositDate: depositDate.toISOString().split('T')[0],
      yearlyBreakdown
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