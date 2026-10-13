import { z } from 'zod';

// Schema per la creazione del profilo
export const createProfileSchema = z.object({
  nome: z.string().min(2, 'Nome deve essere almeno 2 caratteri').max(50),
  cognome: z.string().min(2, 'Cognome deve essere almeno 2 caratteri').max(50),
  eta: z.coerce.number().int().min(18, 'Età minima 18 anni').max(120, 'Età massima 120 anni').optional(),
  email: z.string().email('Email non valida'),
  ruolo: z.enum(['affittuario'], {
    errorMap: () => ({ message: 'Ruolo deve essere "affittuario"' })
  })
});

export const loginSchema = z.object({
  email: z.string().email('Email non valida')
});

// Schema per salvare una risposta
export const saveAnswerSchema = z.object({
  profileId: z.string().uuid('Profile ID non valido'),
  questionId: z.string().min(1, 'Question ID obbligatorio'),
  value: z.string().min(1, 'Risposta obbligatoria')
});

// Schema per il calcolo degli interessi
export const calculateInterestSchema = z.object({
  profileId: z.string().uuid('Profile ID non valido')
});