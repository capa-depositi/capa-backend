export function isSubmissionComplete(questions, answers) {
  if (answers.get('Q4_AFF') !== 'Sì') return false;

  return questions.every(question => {
    if (!question.required) return true;
    if (question.depends_on && answers.get(question.depends_on) !== question.depends_value) return true;
    return Boolean(answers.get(question.id));
  });
}
