/**
 * APTLY — UI Components
 *
 * Utility for combining class names (clsx + tailwind-merge pattern)
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
