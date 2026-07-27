import { getRouteApi } from "@tanstack/react-router";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { GenreInfo } from "./components/GenreInfo";
import { GenreItems } from "./components/GenreItems";

const route = getRouteApi("/_authenticated/_details/genre/$genreId");

export function GenreDetailsScreen() {
	const genreDetails = route.useLoaderData();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar shouldShowBackButton />

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<GenreInfo genreDetails={genreDetails} />
				<GenreItems items={genreDetails.items} />
			</div>
		</div>
	);
}
