import type { FictionRating, FictionRatingField } from "#/db/schema";
import { FictionRatingRow } from "./FictionRatingRow";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const DEFAULT_FICTION_RATING: FictionRating = {
	setting: { rating: 0 },
	character: { rating: 0 },
	plot: { rating: 0 },
	enjoyment: { rating: 0 },
	emotionalImpact: { rating: 0 },
};

const FICTION_RATING_FIELDS = Object.keys(
	DEFAULT_FICTION_RATING,
) as (keyof FictionRating)[];

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

	function setField(field: keyof FictionRating, patch: Partial<FictionRatingField>) {
		setFictionRating((prev) => ({
			...prev,
			[field]: { ...prev[field], ...patch },
		}));
	}

	useEffect(() => {
		const fields = Object.values(fictionRating);
		if (fields.every((f) => f.rating > 0)) {
			updateFictionRating(fictionRating);
			updateRating(
				fields.reduce((sum, f) => sum + f.rating, 0) / fields.length,
			);
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
