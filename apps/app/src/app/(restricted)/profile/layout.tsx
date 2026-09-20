// apps/app/src/app/(restricted)/profile/layout.tsx
export default function ProfileLayout({
  children,
  wallet,
  wallets,
}: {
  children: React.ReactNode;
  wallet: React.ReactNode;
  wallets: React.ReactNode;
}) {
  return (
    <div className="container grid grid-cols-2 gap-4 mx-auto my-4">
      {children}
      {wallet}
      {wallets}
    </div>
  );
}
