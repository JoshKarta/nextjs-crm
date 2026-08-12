import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    nextCookies(),
    organization(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user;
}

export async function getCurrentTenant() {
  const session = await getServerSession();
  // tenantId may not exist on the typed session object; cast to any to access dynamic tenant info
  return (session as any)?.session?.tenantId;
}
