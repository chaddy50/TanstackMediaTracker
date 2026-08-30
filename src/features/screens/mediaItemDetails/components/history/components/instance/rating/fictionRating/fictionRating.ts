import type { FictionRating } from "#/database/schema";

// Listed explicitly rather than derived from an object's keys: a fiction rating read back
// from its jsonb column does not preserve key insertion order, so the display order has to
// be stated somewhere that both the form and the read-only view can share.
export const FICTION_RATING_FIELDS = [
	"setting",
	"character",
	"plot",
	"enjoyment",
	"depth",
] as const satisfies readonly (keyof FictionRating)[];
