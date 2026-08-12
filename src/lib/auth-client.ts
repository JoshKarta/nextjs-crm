import { createAuthClient } from "better-auth/react";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/config";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient(), organizationClient()],
});

export const signInWithGithub = async () => {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: DEFAULT_LOGIN_REDIRECT,
  });
};

export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: DEFAULT_LOGIN_REDIRECT,
  });
};
