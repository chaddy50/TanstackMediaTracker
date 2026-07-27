import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "#/features/screens/auth/LoginScreen";

export const Route = createFileRoute("/_auth/login")({
	component: LoginScreen,
});
