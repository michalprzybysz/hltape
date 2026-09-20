// apps/app/src/components/UserName.tsx
"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { Address } from "viem";
import { useEnsName } from "wagmi";

const useName = ({
  address,
  chainId = 1,
}: Readonly<{
  address: Address;
  chainId?: number;
}>) => {
  const { data: name } = useEnsName({
    address,
    chainId,
  });
  return name;
};

type UserNameProps<C extends React.ElementType> = Omit<
  React.ComponentPropsWithoutRef<C>,
  "children"
> & {
  address: Address;
  as?: C;
};

export default function UserName<C extends React.ElementType = "span">(props: UserNameProps<C>) {
  const { address, as, ...rest } = props;
  const Component = (as ?? "span") as React.ElementType;

  const name = useName({ address });

  return (
    <Component {...rest}>
      {name || (
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <span>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup className="z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background">
                {address}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </Component>
  );
}
