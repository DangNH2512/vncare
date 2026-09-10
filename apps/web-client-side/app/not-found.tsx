import { BlankScreen } from './_components/blank-screen';

/**
 * The 404 for any URL that matches no route.
 *
 * Next renders this inside the root layout only, without the app shell — which
 * is why the screen carries its own way back rather than relying on a
 * navigation rail that is not there.
 */
export default function NotFound() {
  return (
    <main className="min-h-dvh bg-bg">
      <BlankScreen
        glyph="🧭"
        titleKey="blank.notFound.title"
        descriptionKey="blank.notFound.body"
      />
    </main>
  );
}
