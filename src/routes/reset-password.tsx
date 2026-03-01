import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { t } = useTranslation();
	const { token } = Route.useSearch();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const newPasswordInputId = useId();
	const confirmPasswordInputId = useId();

	if (!token) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm text-center">
					<p className="text-sm text-destructive">
						{t("auth.resetPasswordInvalidToken")}
					</p>
					<Link
						to="/forgot-password"
						className="text-sm underline hover:text-foreground transition-colors text-muted-foreground"
					>
						{t("auth.forgotPassword")}
					</Link>
				</div>
			</div>
		);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		if (newPassword !== confirmPassword) {
			setError(t("auth.passwordMismatch"));
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.resetPassword({
				newPassword,
				token: token!,
			});

			if (result.error) {
				setError(t("auth.resetPasswordInvalidToken"));
				return;
			}

			setIsSuccess(true);
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
					{t("auth.resetPasswordTitle")}
				</h1>

				{isSuccess ? (
					<div className="space-y-4">
						<p className="text-sm text-center text-muted-foreground">
							{t("auth.resetPasswordSuccess")}
						</p>
						<p className="text-sm text-center">
							<Link
								to="/login"
								className="underline hover:text-foreground transition-colors text-muted-foreground"
							>
								{t("auth.backToSignIn")}
							</Link>
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor={newPasswordInputId}>
								{t("auth.newPassword")}
							</Label>
							<Input
								id={newPasswordInputId}
								type="password"
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
								required
								autoComplete="new-password"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={confirmPasswordInputId}>
								{t("auth.confirmPassword")}
							</Label>
							<Input
								id={confirmPasswordInputId}
								type="password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								required
								autoComplete="new-password"
							/>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "..." : t("auth.resetPasswordSubmit")}
						</Button>

						<p className="text-sm text-center text-muted-foreground">
							<Link
								to="/login"
								className="underline hover:text-foreground transition-colors"
							>
								{t("auth.backToSignIn")}
							</Link>
						</p>
					</form>
				)}
			</div>
		</div>
	);
}
