import { Suspense } from 'react';

import { DiscoverScreen } from './_components/discover-screen';
import { DiscoverSkeleton } from './_components/discover-states';

/**
 * Discover route. The screen reads the URL through `useSearchParams`, which
 * opts a client component out of static rendering, so the boundary keeps the
 * rest of the page from bailing out to client-side rendering with it.
 */
export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverScreen />
    </Suspense>
  );
}
