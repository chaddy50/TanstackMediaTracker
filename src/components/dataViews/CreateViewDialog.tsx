import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { ViewFilters, ViewSubject } from "#/db/schema";
import { createView } from "#/server/views";
import { EditViewForm } from "./components/editViewForm/EditViewForm";

interface CreateViewDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CreateViewDialog({ isOpen, onClose }: CreateViewDialogProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(data: {
		name: string;
		subject: ViewSubject;
		filters: ViewFilters;
	}) {
		setIsSubmitting(true);
		try {
			const created = await createView({ data });
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			onClose();
			await navigate({
				to: "/views/$viewId",
				params: { viewId: String(created.id) },
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("views.newView")}</DialogTitle>
				</DialogHeader>
				<EditViewForm
					onSubmit={handleSubmit}
					onCancel={onClose}
					isSubmitting={isSubmitting}
				/>
			</DialogContent>
		</Dialog>
	);
}
