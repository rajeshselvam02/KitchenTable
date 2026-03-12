import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const res = await pool.query(
          'SELECT id, email, password_hash, role FROM users WHERE email = $1',
          [credentials.email]
        );
        const user = res.rows[0];
        if (user && (await compare(credentials.password, user.password_hash))) {
          return { id: user.id, email: user.email, role: user.role };
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = (user as any).id;
        token.role = (user as any).role;
        // Generate backend JWT so frontend can call Express API
        token.backendToken = jwt.sign(
          { userId: (user as any).id, role: (user as any).role },
          process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
          { expiresIn: '7d' }
        );
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id           = token.id;
        (session.user as any).role         = token.role;
        (session as any).backendToken      = token.backendToken;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-only-secret-change-in-production',
  pages: {
    signIn: '/login',
  },
});
