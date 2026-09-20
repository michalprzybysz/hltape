// apps/app/src/components/providers/rainbowkit.tsx
"use client";
import {
  type AuthenticationStatus,
  darkTheme,
  lightTheme,
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { createContext, use } from "react";
import useRainbowAuthenticationAdapter from "./hooks/useRainbowAuthenticationAdapter";
import useRainbowAuthStatus from "./hooks/useRainbowAuthStatus";

const AuthStatusContext = createContext<AuthenticationStatus>("loading");

export function useAuthStatus(): AuthenticationStatus {
  return use(AuthStatusContext);
}

export default function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adapter = useRainbowAuthenticationAdapter();
  const status = useRainbowAuthStatus();
  return (
    <AuthStatusContext value={status}>
      <RainbowKitAuthenticationProvider adapter={adapter} status={status} enabled>
        <RainbowKitProvider
          modalSize="compact"
          theme={{
            lightMode: lightTheme(),
            darkMode: darkTheme(),
          }}
        >
          {children}
        </RainbowKitProvider>
      </RainbowKitAuthenticationProvider>
    </AuthStatusContext>
  );
}
