import type { FictionRating } from "#/db/schema";
import { useTranslation } from "react-i18next";

export function FictionRatingComments({
	fictionRating,
}: {
	fictionRating: FictionRating;
}) {
	const { t } = useTranslation();

	const fieldsWithComments = (
		Object.entries(fictionRating) as [
			keyof FictionRating,
			{ rating: number; comment?: string },
		][]
	).filter(([, field]) => field.comment);

	if (fieldsWithComments.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1 mt-0.5">
			{fieldsWithComments.map(([key, field]) => (
				<p key={key} className="text-sm">
					<span className="text-muted-foreground">
						{t(`fictionRating.${key}`)}:{" "}
					</span>
					<span className="text-foreground/80">{field.comment}</span>
				</p>
			))}
		</div>
	);
}
