import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email public_repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    // fires after the user row is committed — safe to update
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && user.id) {
        const token = (account as { access_token?: string }).access_token;
        if (token) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              githubLogin: (profile as { login?: string })?.login ?? undefined,
              accessToken: await encryptToken(token),
            },
          });
          // Remove the plaintext copy the PrismaAdapter wrote to Account.access_token
          await prisma.account.updateMany({
            where: { userId: user.id, provider: "github" },
            data: { access_token: null },
          });
        }
      }
    },
  },
  pages: {
    signIn: "/",
  },
});
