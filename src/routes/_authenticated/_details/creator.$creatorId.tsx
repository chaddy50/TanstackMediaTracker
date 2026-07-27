import { createFileRoute } from "@tanstack/react-router";

import { CreatorDetailsScreen } from "#/features/screens/creatorDetails/CreatorDetailsScreen";
import { getCreatorDetails } from "#/features/screens/creatorDetails/creatorDetails";

export const Route = createFileRoute(
	"/_authenticated/_details/creator/$creatorId",
)({
	loader: ({ params }) =>
		getCreatorDetails({ data: { id: parseInt(params.creatorId, 10) } }),
	component: CreatorDetailsScreen,
});
