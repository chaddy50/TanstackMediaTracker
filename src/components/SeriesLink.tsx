import { Link } from "@tanstack/react-router";

interface SeriesLinkProps {
	seriesId: number | null | undefined;
	seriesName: string | null | undefined;
}

export function SeriesLink({ seriesId, seriesName }: SeriesLinkProps) {
	return (
		<Link
			to="/series/$seriesId"
			params={{ seriesId: String(seriesId) }}
			className="text-foreground hover:underline"
		>
			{seriesName}
		</Link>
	);
}
