import { Link } from "@tanstack/react-router";

interface BackButtonProps {
	caption: string;
	destination: string;
}

export function BackButton(props: BackButtonProps) {
	const { caption, destination } = props;
	return (
		<div className="px-6 py-4 border-b border-gray-800">
			<Link
				to={destination}
				className="text-gray-400 hover:text-white text-sm transition-colors"
			>
				← {caption}
			</Link>
		</div>
	);
}
