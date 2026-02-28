import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { ViewFilters, ViewSubject } from "#/db/schema";
import type { View } from "#/server/views";
import { updateView } from "#/server/views";
import { EditViewForm } from "./EditViewForm";

interface EditViewDialogProps {
	view: View;
	isOpen: boolean;
	onClose: () => void;
	onUpdated: () => void;
	onDelete: () => void;
	isDeleting?: boolean;
}

export function EditViewDialog({
	view,
	isOpen,
	onClose,
	onUpdated,
	onDelete,
	isDeleting = false,
}: EditViewDialogProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(data: {
		name: string;
		subject: ViewSubject;
		filters: ViewFilters;
	}) {
		setIsSubmitting(true);
		try {
			await updateView({
				data: {
					id: view.id,
					name: data.name,
					filters: data.filters,
				},
			});
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			onClose();
			onUpdated();
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("views.editView")}</DialogTitle>
				</DialogHeader>
				<EditViewForm
					initialName={view.name}
					initialSubject={view.subject as ViewSubject}
					initialFilters={(view.filters ?? {}) as ViewFilters}
					onSubmit={handleSubmit}
					onCancel={onClose}
					isSubmitting={isSubmitting}
					onDelete={onDelete}
					isDeleting={isDeleting}
				/>
			</DialogContent>
		</Dialog>
	);
}
