import { Button } from "@hltape/ui/components/button";
import { useFormStatus } from "react-dom";

const SubmitButton = ({
  pendingText = "Submitting...",
  children,
  disabled,
  ...rest
}: { pendingText?: string } & React.ComponentProps<typeof Button>) => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...rest}>
      {pending ? pendingText : children}
    </Button>
  );
};

export default SubmitButton;
