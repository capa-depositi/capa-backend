import { z } from 'zod';

export const createProfileSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  ruolo: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email()
});

export const saveAnswerSchema = z.object({
  profileId: z.string(),
  questionId: z.string(),
  value: z.string().or(z.number())
});

export const calculateInterestSchema = z.object({
  profileId: z.string()
});
