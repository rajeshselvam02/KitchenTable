import { useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

export function useAxiosAuth() {
  const { data: session } = useSession();

  useEffect(() => {
    const token = (session as any)?.backendToken;
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [session]);
}
