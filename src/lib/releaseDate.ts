import type { TFunction } from "i18next";

// Postgres stores pre-0 CE dates in era notation ("1200-01-01 BC"). A negative
// year such as "-1200-01-01" is read as a timezone displacement and rejected.
const RELEASE_DATE_PATTERN = /^(\d+)-\d{2}-\d{2}( BC)?$/;

/**
 * Converts a signed release year into a date string Postgres can store.
 * Negative years are pre-0 CE. There is no year 0, so it means "unknown".
 */
export function releaseYearToDate(
	year: number | null | undefined,
): string | undefined {
	if (year === null || year === undefined || Number.isNaN(year) || year === 0) {
		return undefined;
	}

	// Postgres needs four digits to read "0800" as a year rather than a time
	const paddedYear = String(Math.abs(year)).padStart(4, "0");
	if (year < 0) {
		return `${paddedYear}-01-01 BC`;
	}
	return `${paddedYear}-01-01`;
}

/** Reads the year back out of a stored release date, negative for pre-0 CE. */
export function getReleaseYear(
	releaseDate: string | null | undefined,
): number | null {
	if (!releaseDate) {
		return null;
	}

	const match = RELEASE_DATE_PATTERN.exec(releaseDate);
	if (!match?.[1]) {
		return null;
	}

	const year = Number(match[1]);
	return match[2] ? -year : year;
}

/** Formats a stored release date for display, e.g. "2020" or "1200 BCE". */
export function formatReleaseYear(
	releaseDate: string | null | undefined,
	t: TFunction,
): string | null {
	const year = getReleaseYear(releaseDate);
	if (year === null) {
		return null;
	}

	if (year < 0) {
		return t("time.yearBCE", { year: Math.abs(year) });
	}
	return String(year);
}
