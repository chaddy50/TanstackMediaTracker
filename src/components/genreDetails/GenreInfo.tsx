import type { GenreDetails } from "#/server/genres/genres";

interface GenreInfoProps {
	genreDetails: GenreDetails;
}

export function GenreInfo({ genreDetails }: GenreInfoProps) {
	return (
		<div className="flex flex-col gap-5 mb-10">
			<h1 className="text-3xl font-bold leading-tight">{genreDetails.name}</h1>
		</div>
	);
}
