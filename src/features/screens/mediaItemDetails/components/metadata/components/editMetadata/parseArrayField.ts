export function parseArrayField(value: string): string[] | undefined {
	const parsed = value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return parsed.length > 0 ? parsed : undefined;
}
