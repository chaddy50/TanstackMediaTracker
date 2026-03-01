import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import nodemailer from "nodemailer";
import { db } from "#/db";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_APP_PASSWORD,
	},
});

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			void transporter.sendMail({
				from: process.env.SMTP_USER,
				to: user.email,
				subject: "Reset your password",
				html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
			});
		},
	},
	plugins: [tanstackStartCookies()],
});
