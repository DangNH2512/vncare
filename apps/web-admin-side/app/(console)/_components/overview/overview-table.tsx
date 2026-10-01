import type { ReactNode } from 'react';

import { Card, EmptyState } from '../../../_components/ui';

export interface OverviewColumn {
  key: string;
  header: string;
}

/**
 * Shared shell for the two "newest" lists. The table scrolls inside its own
 * frame so a narrow viewport never scrolls the whole page sideways.
 */
export function OverviewTable({
  heading,
  columns,
  rows,
  emptyTitle,
}: {
  heading: string;
  columns: readonly OverviewColumn[];
  rows: ReadonlyArray<{ id: string; cells: ReactNode[] }>;
  emptyTitle: string;
}) {
  return (
    <Card padding="none" as="section" className="overflow-hidden">
      <h2 className="border-b border-line px-4 py-3 text-md font-semibold text-fg">{heading}</h2>
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} className="rounded-none border-0" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="bg-surface-sunken text-xs text-fg-muted">
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="px-4 py-2 text-left font-medium whitespace-nowrap">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-sunken">
                  {row.cells.map((cell, index) => (
                    <td key={columns[index]?.key ?? index} className="px-4 py-2.5 align-top text-fg">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
