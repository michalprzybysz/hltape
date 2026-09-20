import { Button } from "@hltape/ui/components/button";
import { Spinner } from "@hltape/ui/components/spinner";

const LoadingButton = ({
  loadingText = "Loading...",
  loading = false,
  children,
  disabled,
  ...rest
}: { loadingText?: string; loading?: boolean } & React.ComponentProps<typeof Button>) => {
  return (
    <Button type="submit" disabled={loading || disabled} {...rest}>
      {loading && <Spinner className="me-3" />}
      {loading ? loadingText : children}
    </Button>
  );
};

export default LoadingButton;
