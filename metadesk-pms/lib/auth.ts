import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser, findUserByEmail } from "@/lib/store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: false,
      },
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await authenticateUser(
          credentials.email as string,
          credentials.password as string
        );
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any).role,
          team: (user as any).team,
          designation: (user as any).designation,
          avatar: (user as any).avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.team = (user as any).team;
        token.designation = (user as any).designation;
        token.avatar = cleanAvatar((user as any).avatar);
      } else if (token.email) {
        const currentUser = await findUserByEmail(token.email as string);
        if (currentUser) {
          token.id = currentUser.id;
          token.name = currentUser.name;
          token.email = currentUser.email;
          token.role = currentUser.role;
          token.team = currentUser.team;
          token.designation = currentUser.designation;
          token.avatar = cleanAvatar(currentUser.avatar);
        } else if (token.role === "owner") {
          token.role = "manager";
          token.name = "Demo Manager";
          token.email = "manager@metadeskglobal.com";
          token.designation = "Workspace Manager";
        }
      }
      if (token.role === "owner") {
        token.role = "manager";
        token.email = "manager@metadeskglobal.com";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
        (session.user as any).role = token.role;
        (session.user as any).team = token.team;
        (session.user as any).designation = token.designation;
        (session.user as any).avatar = cleanAvatar(token.avatar);
      }
      return session;
    },
  },
});

function cleanAvatar(value: unknown) {
  if (typeof value !== "string") return "";
  if (value.startsWith("data:")) return "";
  return value;
}
