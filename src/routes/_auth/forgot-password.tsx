import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordScreen } from "#/features/screens/auth/ForgotPasswordScreen";

export const Route = createFileRoute("/_auth/forgot-password")({
	component: ForgotPasswordScreen,
});
