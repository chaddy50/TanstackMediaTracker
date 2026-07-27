import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "#/features/screens/settings/SettingsScreen";

export const Route = createFileRoute("/_authenticated/_app/settings")({
	component: SettingsScreen,
});
