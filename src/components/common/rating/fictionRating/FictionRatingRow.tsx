import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(comment ?? "");

	function handleOpenChange(open: boolean) {
		if (open) setDraft(comment ?? "");
		setOpen(open);
	}

	function handleSave() {
		updateComment(draft);
		setOpen(false);
	}

	return (
		<div className="flex flex-row items-center gap-2">
			<span className="text-sm text-muted-foreground w-32">{title}</span>
			<RatingStars
				rating={rating}
				updateRating={updateRating}
				shouldShowIfNoRating={true}
			/>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				{comment ? (
					<div className="flex-1 min-w-0 ml-3">
						<div className="group/comment flex items-center min-w-0 overflow-hidden w-fit max-w-full">
							<span className="min-w-0 truncate text-sm text-muted-foreground">
								{comment}
							</span>
							<DialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className="shrink-0 overflow-hidden w-0 opacity-0 text-muted-foreground bg-card hover:bg-accent group-hover/comment:w-8 group-hover/comment:opacity-100 transition-all duration-200"
								>
									<Pencil />
								</Button>
							</DialogTrigger>
						</div>
					</div>
				) : (
					<DialogTrigger asChild>
						<Button variant="ghost" size="sm" className="text-muted-foreground">
							{t("fictionRating.addComment")}
						</Button>
					</DialogTrigger>
				)}
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<Textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={3}
						autoFocus
					/>
					<DialogFooter>
						<Button onClick={handleSave}>{t("mediaItemDetails.save")}</Button>
						<Button variant="outline" onClick={() => setOpen(false)}>
							{t("mediaItemDetails.cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
