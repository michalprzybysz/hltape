// apps/app/src/components/Navbar.tsx
"use client";
import { Menu } from "@base-ui/react/menu";
import { Badge } from "@hltape/ui/components/badge";
import { cn } from "@hltape/ui/lib/utils";
import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import UserName from "@/components//UserName";
import { Logo } from "@/components/Logo";
import UserAvatar from "@/components/UserAvatar";
import { authClient } from "@/lib/auth";

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === "true";

export default function LayoutNavbar() {
  const { address } = useAccount();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { disconnectAsync } = useDisconnect();
  const tMenu = useTranslations("menu");
  const tAction = useTranslations("action");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  const handleLogout = useCallback(async () => {
    await Promise.all([authClient.signOut(), disconnectAsync()]);
    window.location.href = "/login";
  }, [disconnectAsync]);

  const navLinks = [
    { href: "/", label: tMenu("dashboard"), active: pathname === "/" },
    {
      href: "/positions",
      label: tMenu("positions"),
      active: pathname.startsWith("/positions"),
    },
    {
      href: "/orders",
      label: tMenu("orders"),
      active: pathname.startsWith("/orders"),
    },
  ];

  return (
    <nav className="border-b border-border bg-background px-4 py-2.5">
      <div className="mx-auto flex flex-wrap items-center justify-start gap-10">
        <Link href="/">
          <Logo />
        </Link>

        <div
          className={cn(
            "w-full md:flex md:w-auto md:items-center md:gap-6",
            mobileMenuOpen ? "block" : "hidden",
          )}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block py-2 text-sm font-medium transition-colors hover:text-foreground md:py-0",
                link.active ? "text-foreground" : "text-muted-foreground",
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {address && (
          <div className="ml-auto flex items-center gap-3 md:order-2">
            {isAdmin && (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                {tMenu("admin")}
              </Badge>
            )}
            {isTestnet && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {tMenu("testnet")}
              </Badge>
            )}

            <Menu.Root>
              <Menu.Trigger className="cursor-pointer outline-none">
                <UserAvatar address={address} size="sm" className="cursor-pointer" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={8} align="end">
                  <Menu.Popup className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1.5">
                      <span className="block text-sm font-semibold">{tMenu("signedAs")}</span>
                      <UserName address={address} className="block truncate text-sm font-medium" />
                    </div>
                    <div className="-mx-1 my-1 h-px bg-border" />
                    <Menu.Item
                      onClick={() => router.push("/profile")}
                      className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                    >
                      {tMenu("settings")}
                    </Menu.Item>
                    <div className="-mx-1 my-1 h-px bg-border" />
                    <Menu.Item
                      onClick={handleLogout}
                      className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                    >
                      {tAction("logOut")}
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>

            <button
              type="button"
              className="inline-flex items-center rounded-lg p-2 text-sm text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={tMenu("toggleNav")}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
