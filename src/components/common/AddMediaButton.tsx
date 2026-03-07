import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchPopup } from "#/components/searchPopup/SearchPopup";
import { Button } from "#/components/ui/button";

export function AddMediaButton() {
	const { t } = useTranslation();
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	return (
		<>
			<Button variant="outline" onClick={() => setIsSearchOpen(true)}>
				{t("search.addButton")}
			</Button>
			<SearchPopup
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
			/>
		</>
	);
}
