import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names the shadcn way. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
