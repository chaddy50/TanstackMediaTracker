import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FictionRating, FictionRatingField } from "#/database/schema";
import { FictionRatingRow } from "./FictionRatingRow";
import { FICTION_RATING_FIELDS } from "./fictionRating";

const DEFAULT_FICTION_RATING: FictionRating = {
	setting: { rating: 0 },
	character: { rating: 0 },
	plot: { rating: 0 },
	enjoyment: { rating: 0 },
	depth: { rating: 0 },
};

type FictionRatingFormProps = {
	initialValue?: FictionRating | null;
	updateRating: (rating: number) => void;
	updateFictionRating: (rating: FictionRating) => void;
};

export function FictionRatingForm({
	initialValue,
	updateRating,
	updateFictionRating,
}: FictionRatingFormProps) {
	const { t } = useTranslation();
	const [fictionRating, setFictionRating] = useState<FictionRating>(
		initialValue ?? DEFAULT_FICTION_RATING,
	);

	function setField(
		field: keyof FictionRating,
		patch: Partial<FictionRatingField>,
	) {
		setFictionRating((prev) => ({
			...prev,
			[field]: { ...prev[field], ...patch },
		}));
	}

	useEffect(() => {
		const fields = Object.values(fictionRating);
		if (fields.every((field) => field.rating > 0)) {
			updateFictionRating(fictionRating);
			const average =
				fields.reduce((sum, field) => sum + field.rating, 0) / fields.length;
			// One decimal is what the rating column holds, so rounding here keeps
			// the value on screen the same before and after a save.
			updateRating(Math.round(average * 10) / 10);
		}
	}, [fictionRating, updateRating, updateFictionRating]);

	return (
		<>
			{FICTION_RATING_FIELDS.map((field) => (
				<FictionRatingRow
					key={field}
					title={t(`fictionRating.${field}`)}
					rating={fictionRating[field].rating}
					comment={fictionRating[field].comment}
					updateRating={(rating) => setField(field, { rating })}
					updateComment={(comment) => setField(field, { comment })}
				/>
			))}
		</>
	);
}
