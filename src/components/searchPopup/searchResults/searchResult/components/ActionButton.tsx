import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { addToLibrary, type SearchResultWithStatus } from "@/server/search";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ActionButtionProps {
	result: SearchResultWithStatus;
}

export function ActionButton(props: ActionButtionProps) {
	const { result } = props;
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isAdding, setIsAdding] = useState(false);

	async function addItemToLibrary() {
		setIsAdding(true);
		try {
			const { mediaItemId } = await addToLibrary({
				data: {
					externalId: result.externalId,
					externalSource: result.externalSource,
					type: result.type,
					title: result.title,
					description: result.description,
					coverImageUrl: result.coverImageUrl,
					releaseDate: result.releaseDate,
					metadata: result.metadata,
				},
			});
			await navigate({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: String(mediaItemId) },
			});
		} finally {
			setIsAdding(false);
		}
	}

	function openExistingItem() {
		if (!result.mediaItemId) return;
		navigate({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: String(result.mediaItemId) },
		});
	}

	return (
		<>
			{result.mediaItemId ? (
				<StatusBadge
					status={result.status}
					onClick={openExistingItem}
					disabled={isAdding}
				/>
			) : (
				<Button
					size="sm"
					variant="outline"
					className="shrink-0"
					onClick={addItemToLibrary}
					disabled={isAdding}
				>
					{isAdding ? t("search.adding") : t("search.addToLibrary")}
				</Button>
			)}
		</>
	);
}
