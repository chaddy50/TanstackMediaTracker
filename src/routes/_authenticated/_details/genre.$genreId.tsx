import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "#/components/common/PageHeader";
import { GenreInfo } from "#/components/genreDetails/GenreInfo";
import { GenreItems } from "#/components/genreDetails/GenreItems";
import { getGenreDetails } from "#/server/genres/genres";

export const Route = createFileRoute("/_authenticated/_details/genre/$genreId")({
	loader: ({ params }) =>
		getGenreDetails({ data: { id: parseInt(params.genreId, 10) } }),
	component: GenrePage,
});

function GenrePage() {
	const genreDetails = Route.useLoaderData();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader shouldShowBackButton />

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<GenreInfo genreDetails={genreDetails} />
				<GenreItems items={genreDetails.items} />
			</div>
		</div>
	)
}
