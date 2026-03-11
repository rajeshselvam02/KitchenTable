import { withAuth } from 'next-auth/middleware';

export default withAuth({
  // Protect all routes except the auth routes and public pages
  pages: {
    signIn: '/api/auth/signin',
  },
});

export const config = {
  matcher: ['/((?!api/auth).*)', '/'], // protect everything except next‑auth API endpoints
};
