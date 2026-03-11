import { MediaCard } from "#/components/common/MediaCard";
import type { DashboardItem } from "#/server/dashboard";

interface DashboardSectionProps {
	title: string;
	items: DashboardItem[];
	emptyMessage: string;
	variant?: "grid" | "scroll";
	cardWidth?: string;
}

export function DashboardSection({
	title,
	items,
	emptyMessage,
	variant = "grid",
	cardWidth = "w-28",
}: DashboardSectionProps) {
	return (
		<section className="flex flex-col gap-2 w-full">
			<h2 className="text-xl font-semibold">{title}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{emptyMessage}</p>
			) : variant === "scroll" ? (
				<div className="flex flex-row gap-4 overflow-x-auto">
					{items.map((item) => (
						<div key={item.id} className={`${cardWidth} shrink-0`}>
							<MediaCard mediaItem={item} shouldShowStatus={false} />
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{items.map((item) => (
						<MediaCard key={item.id} mediaItem={item} shouldShowStatus={false} />
					))}
				</div>
			)}
		</section>
	);
}
