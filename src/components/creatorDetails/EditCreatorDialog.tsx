import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { type CreatorDetails, updateCreatorMetadata } from "#/server/creators";
import { FormField } from "../mediaItemDetails/metadata/components/editMetadata/FormField";

interface EditCreatorDialogProps {
	creatorDetails: CreatorDetails;
}

export function EditCreatorDialog({ creatorDetails }: EditCreatorDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState(creatorDetails.name);
	const [biography, setBiography] = useState(creatorDetails.biography ?? "");

	async function handleSave() {
		setIsSaving(true);
		setError(null);
		try {
			await updateCreatorMetadata({
				data: {
					creatorId: creatorDetails.id,
					name,
					biography: biography || undefined,
				},
			});
			router.invalidate();
			setIsOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save changes.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-foreground"
				onClick={() => setIsOpen(true)}
				aria-label={t("creatorDetails.edit")}
			>
				<Pencil className="size-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("creatorDetails.edit")}</DialogTitle>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</FormField>

						<FormField label={t("creatorDetails.biography")}>
							<Textarea
								value={biography}
								onChange={(e) => setBiography(e.target.value)}
								rows={5}
							/>
						</FormField>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<div className="flex gap-2 pt-2">
						<Button size="sm" onClick={handleSave} disabled={isSaving || name.trim() === ""}>
							{t("mediaItemDetails.save")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsOpen(false)}
							disabled={isSaving}
						>
							{t("mediaItemDetails.cancel")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
