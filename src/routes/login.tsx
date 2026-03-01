import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [isSignUp, setIsSignUp] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const nameInputId = useId();
	const emailInputId = useId();
	const passwordInputId = useId();

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			if (isSignUp) {
				const result = await authClient.signUp.email({
					name,
					email,
					password,
				});
				if (result.error) {
					setError(result.error.message ?? t("auth.error"));
					return;
				}
			} else {
				const result = await authClient.signIn.email({
					email,
					password,
				});
				if (result.error) {
					setError(t("auth.invalidCredentials"));
					return;
				}
			}
			await router.navigate({ to: "/" });
		} catch {
			setError(t("auth.error"));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm">
				<h1 className="text-2xl font-bold text-center">
					{isSignUp ? t("auth.signUp") : t("auth.signIn")}
				</h1>

				<form onSubmit={handleSubmit} className="space-y-4">
					{isSignUp && (
						<div className="space-y-1.5">
							<Label htmlFor={nameInputId}>{t("auth.name")}</Label>
							<Input
								id={nameInputId}
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required={isSignUp}
								autoComplete="name"
							/>
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor={emailInputId}>{t("auth.email")}</Label>
						<Input
							id={emailInputId}
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
							autoComplete="email"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={passwordInputId}>{t("auth.password")}</Label>
						<Input
							id={passwordInputId}
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
							autoComplete={isSignUp ? "new-password" : "current-password"}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting
							? "..."
							: isSignUp
								? t("auth.signUp")
								: t("auth.signIn")}
					</Button>
				</form>

				<p className="text-sm text-center text-muted-foreground">
					<button
						type="button"
						onClick={() => {
							setIsSignUp(!isSignUp);
							setError(null);
						}}
						className="underline hover:text-foreground transition-colors"
					>
						{isSignUp ? t("auth.haveAccount") : t("auth.noAccount")}
					</button>
				</p>

				{!isSignUp && (
					<p className="text-sm text-center text-muted-foreground">
						<Link
							to="/forgot-password"
							className="underline hover:text-foreground transition-colors"
						>
							{t("auth.forgotPassword")}
						</Link>
					</p>
				)}
			</div>
		</div>
	);
}
