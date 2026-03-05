interface ThumbnailProps {
	url: string | undefined;
	title: string;
}

export function Thumbnail(props: ThumbnailProps) {
	const { url, title } = props;

	return (
		<div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
			{url ? (
				<img
					src={url}
					alt={title}
					className="w-full h-full object-cover"
					onError={(e) => {
						e.currentTarget.style.display = "none";
					}}
				/>
			) : (
				<span className="text-muted-foreground text-xs">?</span>
			)}
		</div>
	);
}
