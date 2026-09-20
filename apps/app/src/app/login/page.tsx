// apps/app/src/app/login/page.tsx
"use client";
import { Button } from "@hltape/ui/components/button";
import { Field, FieldDescription, FieldGroup } from "@hltape/ui/components/field";
import { Spinner } from "@hltape/ui/components/spinner";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { Logo } from "@/components/Logo";
import { useAuthStatus } from "@/components/providers/rainbowkit";
import { BRAND_NAME, SOURCE_URL } from "@/lib/brand";

export default function LoginPage() {
  const status = useAuthStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openConnectModal } = useConnectModal();
  const { status: accountStatus } = useAccount();
  const tState = useTranslations("state");
  const tAction = useTranslations("action");
  const tLogin = useTranslations("login");
  const tFooter = useTranslations("footer");

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const isConnecting = accountStatus === "connecting";
  const isWalletConnected = accountStatus === "connected";
  const isAuthenticating = isWalletConnected && status !== "authenticated";
  const isAuthenticated = status === "authenticated";
  const isLoading = isConnecting || isAuthenticating || isAuthenticated;

  const prevAuthStatus = useRef(status);

  useEffect(() => {
    if (prevAuthStatus.current !== status) {
      if (status === "authenticated") {
        router.replace(callbackUrl);
      }
      prevAuthStatus.current = status;
    }
  }, [status, callbackUrl, router]);

  return (
    <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="w-full max-w-sm">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck className="size-8 text-muted-foreground" />
              <h1 className="text-xl font-bold">{tLogin("title")}</h1>
              <FieldDescription className="text-center text-balance">
                {tLogin("description")}
              </FieldDescription>
              <p className="text-center text-xs text-muted-foreground/60">{tLogin("noGas")}</p>
            </div>
            <Field className="pt-2">
              <Button
                size="lg"
                onClick={() => {
                  openConnectModal?.();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner aria-label="Connecting" className="me-3" />
                    {isConnecting
                      ? tState("connectingWallet")
                      : isAuthenticated
                        ? tState("redirecting")
                        : tState("signingIn")}
                  </>
                ) : (
                  tAction("connectWallet")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </div>
      <footer className="py-4 px-6 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>
          {tFooter.rich("source", {
            brand: BRAND_NAME,
            link: (chunks) => (
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </footer>
      <div className="fixed bottom-6 right-6 flex items-center gap-1.5 text-[10px] text-muted-foreground/40 md:bottom-10 md:right-10">
        <span>{accountStatus}</span>
        <span>/</span>
        <span>{status}</span>
      </div>
    </div>
  );
}
