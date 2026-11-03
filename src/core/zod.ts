// Zod configuré une fois pour tout le moteur : messages en français.
import { z } from "zod";

z.config(z.locales.fr());

export { z };

export interface FieldError {
  path: string;
  message: string;
}

/** Chemin d'erreur au format JSON pointé : `items.123.requires.0.0.item`. */
export function toPath(path: readonly PropertyKey[]): string {
  return path.map(String).join(".");
}

export function zodErrors(error: z.ZodError, prefix: readonly PropertyKey[] = []): FieldError[] {
  return error.issues.map((issue) => ({ path: toPath([...prefix, ...issue.path]), message: issue.message }));
}
