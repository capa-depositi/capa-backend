import test from 'node:test';
import assert from 'node:assert/strict';
import { isSubmissionComplete } from '../src/services/submissionRules.js';

const questions = [
  { id: 'Q1_AFF', required: true },
  { id: 'Q4_AFF', required: true },
  { id: 'Q5_AFF', required: true, depends_on: 'Q4_AFF', depends_value: 'Sì' },
  { id: 'Q6_AFF', required: true, depends_on: 'Q4_AFF', depends_value: 'Sì' },
  { id: 'Q7_AFF', required: true, depends_on: 'Q4_AFF', depends_value: 'Sì' }
];

test('completes only when Q4 is yes and every applicable required answer exists', () => {
  const answers = new Map([
    ['Q1_AFF', '1000'],
    ['Q4_AFF', 'Sì'],
    ['Q5_AFF', '2024-01-01'],
    ['Q6_AFF', '2'],
    ['Q7_AFF', 'No']
  ]);
  assert.equal(isSubmissionComplete(questions, answers), true);
});

test('does not complete when Q4 is no', () => {
  const answers = new Map([
    ['Q1_AFF', '1000'],
    ['Q4_AFF', 'No']
  ]);
  assert.equal(isSubmissionComplete(questions, answers), false);
});

test('does not complete when an applicable answer is missing', () => {
  const answers = new Map([
    ['Q1_AFF', '1000'],
    ['Q4_AFF', 'Sì'],
    ['Q5_AFF', '2024-01-01'],
    ['Q6_AFF', '2']
  ]);
  assert.equal(isSubmissionComplete(questions, answers), false);
});

test('does not require conditional answers when the dependency does not match', () => {
  const conditionalQuestions = [
    { id: 'Q4_AFF', required: true },
    { id: 'Q5_AFF', required: true, depends_on: 'Q4_AFF', depends_value: 'No' }
  ];
  const answers = new Map([['Q4_AFF', 'Sì']]);
  assert.equal(isSubmissionComplete(conditionalQuestions, answers), true);
});
