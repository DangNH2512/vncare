import { Button, Card, EmptyState } from '../ui';

/**
 * Shown instead of a table when the API rejects the query as invalid (400
 * `queryInvalid`). A bad filter is the operator's to fix, not a connection
 * problem, so the only way out offered is clearing the filters.
 */
export function InvalidFilters({
  title,
  resetLabel,
  onReset,
}: {
  title: string;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <Card role="alert">
      <EmptyState
        title={title}
        action={
          <Button variant="secondary" onClick={onReset}>
            {resetLabel}
          </Button>
        }
      />
    </Card>
  );
}
