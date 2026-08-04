import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SettingsScreen } from "#/features/screens/settings/SettingsScreen";
import { SETTINGS_TAB_IDS } from "#/features/screens/settings/types";

const searchSchema = z.object({
	tab: z.enum(SETTINGS_TAB_IDS).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/_app/settings")({
	validateSearch: searchSchema,
	component: SettingsScreen,
});
