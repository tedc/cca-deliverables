import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Crypto-based random id (works in node + edge + browser). */
export function generateId(): string {
  return crypto.randomUUID();
}
