import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatMoney = (v: number | null | undefined, currency = 'KES') =>
  typeof v === 'number' && Number.isFinite(v)
    ? new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(v)
    : '—';
