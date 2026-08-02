import { TypeBadge } from "#/components/TypeBadge";
import type { MediaItemType } from "#/lib/enums";

interface DetailsProps {
	title: string;
	creator: string | undefined;
	year: string | undefined;
	series: string | undefined;
	type: MediaItemType;
}

export function Details(props: DetailsProps) {
	const { title, creator, year, series, type } = props;
	return (
		<div className="flex-1 min-w-0">
			<div className="flex items-center gap-1.5">
				<TypeBadge type={type} className="shrink-0" />
				<p className="min-w-0 text-sm font-medium text-foreground leading-snug line-clamp-1">
					{title}
				</p>
			</div>
			{creator && (
				<p className="text-xs text-muted-foreground leading-snug line-clamp-1 mt-0.5">
					{creator}
				</p>
			)}
			{(year || series) && (
				<p className="text-xs text-muted-foreground leading-snug line-clamp-1 mt-0.5">
					{year}
					{year && series && " · "}
					{series}
				</p>
			)}
		</div>
	);
}
