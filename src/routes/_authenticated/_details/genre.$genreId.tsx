import { createFileRoute } from "@tanstack/react-router";
import { GenreDetailsScreen } from "#/features/screens/genreDetails/GenreDetailsScreen";
import { getGenreDetails } from "#/lib/genres/genres";

export const Route = createFileRoute("/_authenticated/_details/genre/$genreId")(
	{
		loader: ({ params }) =>
			getGenreDetails({ data: { id: parseInt(params.genreId, 10) } }),
		component: GenreDetailsScreen,
	},
);
