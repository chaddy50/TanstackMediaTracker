import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InfiniteScrollLoaderProps {
	isLoading: boolean;
}

export function InfiniteScrollLoader({ isLoading }: InfiniteScrollLoaderProps) {
	const { t } = useTranslation();

	if (!isLoading) {
		return null;
	}

	return (
		<div className="sticky bottom-6 flex justify-center pointer-events-none">
			<div className="flex items-center gap-2 bg-background border border-border rounded-full px-4 py-2 shadow-lg text-sm text-muted-foreground pointer-events-auto">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t("common.loading")}
			</div>
		</div>
	);
}
