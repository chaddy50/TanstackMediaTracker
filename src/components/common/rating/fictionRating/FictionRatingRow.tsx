import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { RatingStars } from "../RatingStars";

type FictionRatingRowProps = {
	title: string;
	rating: number;
	comment?: string;
	updateRating: (value: number) => void;
	updateComment: (value: string) => void;
};

export function FictionRatingRow({
	title,
	rating,
	comment,
	updateRating,
	updateComment,
}: FictionRatingRowProps) {
	const [showComment, setShowComment] = useState(!!comment);

	return (
		<div className="flex flex-row items-center gap-2">
			<span className="text-sm text-muted-foreground w-32">{title}</span>
			<RatingStars
				rating={rating}
				updateRating={updateRating}
				shouldShowIfNoRating={true}
			/>
			{showComment ? (
				<Textarea
					value={comment ?? ""}
					onChange={(e) => updateComment(e.target.value)}
					rows={1}
					className="resize-none py-1.5 min-h-0 flex-1 min-w-0"
					autoFocus
					onBlur={() => { if (!comment) setShowComment(false); }}
				/>
			) : (
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground"
					onClick={() => setShowComment(true)}
				>
					+ Comment
				</Button>
			)}
		</div>
	);
}
