import { createAuthClient } from "better-auth/react" // make sure to import from better-auth/react
import { adminClient, customSessionClient } from "better-auth/client/plugins"
import type { auth } from "@/lib/auth"; // Import the auth instance as a type

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    customSessionClient<typeof auth>(),
  ],
})

export const { useSession, getSession, signUp, signIn, signOut } = authClient

export type Session = typeof authClient.$Infer.Session