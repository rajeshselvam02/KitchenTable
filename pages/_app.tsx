import { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Layout from "../components/Layout";
import { DarkModeProvider } from "../context/DarkMode";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/globals.css";

axios.defaults.baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
// Interceptor — attach token from localStorage on every request
axios.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('backendToken') : null;
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
function AuthWrapper({ children, isPublic }: { children: React.ReactNode; isPublic: boolean }) {
  const { data: session, status } = useSession();
// Set axios token immediately when session is available
  if (session) {
    const token = (session as any).backendToken;
    if (token) {
      localStorage.setItem('backendToken', token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session && !isPublic) router.push("/login");
    if (session) {
      axios.defaults.headers.common["Authorization"] =
        `Bearer ${(session as any).backendToken}`;
    }
  }, [session, status, isPublic]);

  if (status === "loading") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div className="spinner-border" role="status" />
    </div>
  );

  if (!session && !isPublic) return null;

  return <>{children}</>;
}

function MyApp({ Component, pageProps: { session, ...pageProps }, router }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  const isPublic = router.pathname === "/login";

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <DarkModeProvider>
          <AuthWrapper isPublic={isPublic}>
            {isPublic ? (
              <Component {...pageProps} />
            ) : (
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </AuthWrapper>
        </DarkModeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default MyApp;
