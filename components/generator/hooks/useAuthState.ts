import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export function useAuthState() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);
  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function check() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (active) {
        setIsLoggedIn(Boolean(user));
        setChecking(false);
      }
    }

    check();

    const {
      data: { subscription },
    } =
      supabaseAuthClient.auth.onAuthStateChange(
        (_event, session) => {
          setIsLoggedIn(
            Boolean(session?.user)
          );
        }
      );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isLoggedIn, checking };
}
