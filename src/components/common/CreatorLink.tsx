import { Link } from "@tanstack/react-router";

interface CreatorLinkProps {
	creatorId: number | null | undefined;
	creatorName: string | null | undefined;
}

export function CreatorLink({ creatorId, creatorName }: CreatorLinkProps) {
	return (
		<Link
			to="/creator/$creatorId"
			params={{ creatorId: String(creatorId) }}
			className="text-foreground hover:underline"
		>
			{creatorName}
		</Link>
	);
}
