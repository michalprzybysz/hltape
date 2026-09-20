// apps/app/src/app/(restricted)/profile/@wallet/GenerateAgentButton.tsx
"use client";

import { Button } from "@hltape/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hltape/ui/components/dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HiOutlineSparkles } from "react-icons/hi2";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";
import { type Hex, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, useSignTypedData, useSwitchChain } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { api } from "@/lib/api";
import { useAgentWalletsCreateMutation } from "@/lib/useAgentWalletsQuery";

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === "true";
const TARGET_CHAIN = isTestnet ? arbitrumSepolia : arbitrum;
const SIGNATURE_CHAIN_ID = TARGET_CHAIN.id;

const EIP712_DOMAIN = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: SIGNATURE_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000",
} as const;

const APPROVE_AGENT_TYPES = {
  "HyperliquidTransaction:ApproveAgent": [
    { name: "hyperliquidChain", type: "string" },
    { name: "agentAddress", type: "address" },
    { name: "agentName", type: "string" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

type Step = "idle" | "generating" | "signing" | "submitting" | "saving" | "success" | "error";

export function GenerateAgentButton() {
  const t = useTranslations("generateAgent");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [_agentPrivateKey, setAgentPrivateKey] = useState<Hex | null>(null);

  const { address: masterAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const createMutation = useAgentWalletsCreateMutation();

  const handleGenerate = async () => {
    if (!masterAddress) {
      setError(t("walletNotConnected"));
      setStep("error");
      return;
    }

    try {
      setStep("generating");
      const newAgentPrivateKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(newAgentPrivateKey);
      setAgentAddress(agentAccount.address);
      setAgentPrivateKey(newAgentPrivateKey);

      if (chainId !== SIGNATURE_CHAIN_ID) {
        setStep("signing");
        await switchChainAsync({ chainId: SIGNATURE_CHAIN_ID });
      }

      setStep("signing");
      const nonce = Date.now();
      const agentName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: " ",
        style: "capital",
      });

      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: APPROVE_AGENT_TYPES,
        primaryType: "HyperliquidTransaction:ApproveAgent",
        message: {
          hyperliquidChain: isTestnet ? "Testnet" : "Mainnet",
          agentAddress: agentAccount.address,
          agentName,
          nonce: BigInt(nonce),
        },
      });

      const signatureHex = signature.slice(2); // remove 0x prefix
      const r = `0x${signatureHex.slice(0, 64)}` as Hex;
      const s = `0x${signatureHex.slice(64, 128)}` as Hex;
      const v = Number.parseInt(signatureHex.slice(128, 130), 16);

      setStep("submitting");
      await api.hyperliquid.approveAgent({
        action: {
          type: "approveAgent",
          hyperliquidChain: isTestnet ? "Testnet" : "Mainnet",
          signatureChainId: toHex(SIGNATURE_CHAIN_ID),
          agentAddress: agentAccount.address,
          agentName,
          nonce,
        },
        nonce,
        signature: { r, s, v },
      });

      setStep("saving");
      await createMutation.mutateAsync({
        label: "Auto-generated Agent",
        agentAddress: agentAccount.address,
        privateKey: newAgentPrivateKey,
      });

      setStep("success");
    } catch (err) {
      console.error("Failed to generate agent:", err);
      let errorMessage = "Unknown error";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        const walletErr = err as {
          message?: string;
          reason?: string;
          code?: number;
        };
        errorMessage = walletErr.message || walletErr.reason || JSON.stringify(err);
      }
      setError(errorMessage);
      setStep("error");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("idle");
      setError(null);
      setAgentAddress(null);
      setAgentPrivateKey(null);
    }, 300);
  };

  const getStepMessage = () => {
    switch (step) {
      case "generating":
        return t("stepGenerating");
      case "signing":
        return t("stepSigning");
      case "submitting":
        return t("stepSubmitting");
      case "saving":
        return t("stepSaving");
      case "success":
        return t("stepSuccess");
      case "error":
        return error || "An error occurred";
      default:
        return "";
    }
  };

  const isPending = ["generating", "signing", "submitting", "saving"].includes(step);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HiOutlineSparkles className="mr-2 h-4 w-4" />
        {t("generate")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !isPending) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {step !== "idle" && (
            <div className="space-y-3 text-center">
              {agentAddress && (
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {t("agentLabel", { address: agentAddress })}
                </p>
              )}
              <p
                className={`text-sm ${
                  step === "error"
                    ? "text-destructive"
                    : step === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }`}
              >
                {getStepMessage()}
              </p>
              {isPending && (
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col items-stretch sm:flex-col">
            {step === "idle" && (
              <Button onClick={handleGenerate} disabled={!masterAddress}>
                {t("generateAuthorize")}
              </Button>
            )}
            {step === "success" && <Button onClick={handleClose}>{tCommon("done")}</Button>}
            {step === "error" && (
              <Button onClick={() => setStep("idle")} variant="destructive">
                {tCommon("tryAgain")}
              </Button>
            )}
            {isPending && <Button disabled>{tCommon("processing")}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
