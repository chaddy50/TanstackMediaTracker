import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { SearchPopup } from "@/components/searchPopup/SearchPopup";

export function AddMediaButton() {
	const { t } = useTranslation();
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "/") {
				const tag = (e.target as HTMLElement).tagName;
				if (tag !== "INPUT" && tag !== "TEXTAREA") {
					e.preventDefault();
					setIsSearchOpen(true);
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" onClick={() => setIsSearchOpen(true)}>
						{t("search.addButton")}
					</Button>
				</TooltipTrigger>
				<TooltipContent>Press / to open</TooltipContent>
			</Tooltip>
			<SearchPopup
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
			/>
		</>
	);
}
