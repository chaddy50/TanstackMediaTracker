import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ResetPasswordScreen } from "#/features/screens/auth/ResetPasswordScreen";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordScreen,
});
