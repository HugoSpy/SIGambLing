import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function useAuthenticatedUser() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    initialData: storedUser ?? undefined,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
      setStatus("authenticated");
    }
  }, [query.data, setStatus, setUser]);

  return query;
}
