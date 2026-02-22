import { Link } from "@tanstack/react-router";

interface BackButtonProps {
	caption: string;
	destination: string;
}

export function BackButton(props: BackButtonProps) {
	const { caption, destination } = props;
	return (
		<div className="px-6 py-4 border-b border-border">
			<Link
				to={destination}
				className="text-muted-foreground hover:text-foreground text-sm transition-colors"
			>
				← {caption}
			</Link>
		</div>
	);
}
