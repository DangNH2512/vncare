import { FeedStream } from './_components/feed-stream';

/**
 * Home feed route. The page stays a thin server wrapper; the stream itself is a
 * client component because filtering and RSVP state live in the browser until
 * the API lands.
 */
export default function FeedPage() {
  return (
    <div className="px-4 py-6 md:px-0 md:py-8">
      <FeedStream />
    </div>
  );
}
