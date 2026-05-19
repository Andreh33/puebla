import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { LoginSchema } from "@/lib/validators";

// Tipos extendidos — augmenta los módulos de Auth.js v5.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "EDITOR";
    } & DefaultSession["user"];
  }
  interface User {
    role: "OWNER" | "EDITOR";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "EDITOR";
  }
}

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // `@auth/prisma-adapter` se publica contra `@auth/core`; en v5 beta de
  // next-auth puede haber discordancia de tipos entre @auth/core duplicados.
  // El runtime es idéntico, así que aseguramos el tipo manualmente.
  adapter: PrismaAdapter(db) as unknown as Adapter,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h sliding
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.adminUser.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.isActive) return null;

        // Bloqueo por intentos fallidos
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failed = user.failedLogins + 1;
          await db.adminUser.update({
            where: { id: user.id },
            data: {
              failedLogins: failed,
              lockedUntil:
                failed >= MAX_FAILED
                  ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                  : user.lockedUntil,
            },
          });
          return null;
        }

        await db.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        session.user.role = (token.role as "OWNER" | "EDITOR") ?? "EDITOR";
      }
      return session;
    },
  },
  trustHost: true,
});
