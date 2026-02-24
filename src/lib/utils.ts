import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string | null {
	if (!dateStr) return null;
	return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	});
}

export function formatDateRange(
	startedAt: string | null | undefined,
	completedAt: string | null | undefined,
): string | null {
	const start = formatDate(startedAt);
	const end = formatDate(completedAt);

	if (startedAt === completedAt) {
		// If the item was started and completed on the same date, just show that date
		return start;
	}

	if (start && end) {
		return `${start} – ${end}`;
	} else if (start) {
		return `${start} – Present`;
	} else if (end) {
		return `Completed ${end}`;
	} else {
		return null;
	}
}
