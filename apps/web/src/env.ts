/**
 * APTLY — Typed Environment Variables
 *
 * Validates required environment variables at startup.
 * Fails loudly in development; silently uses defaults in production.
 *
 * Usage: import { env } from "@/env"
 */

import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://localhost:8000"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("APTLY"),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    // In development, throw to surface the error clearly
    if (process.env.NODE_ENV === "development") {
      throw new Error("Invalid environment variables");
    }
  }

  return parsed.success ? parsed.data : envSchema.parse({});
}

export const env = validateEnv();
