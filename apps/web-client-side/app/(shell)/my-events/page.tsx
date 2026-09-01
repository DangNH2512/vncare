import { BlankScreen } from '../../_components/blank-screen';

/**
 * Placeholder for a screen the navigation already advertises.
 *
 * It exists so the link does not 404: a nav item that dead-ends is worse than
 * one that says "not yet". Replaced wholesale when the real screen lands.
 */
export default function MyEventsPage() {
  return (
    <BlankScreen
      glyph="🗓"
      titleKey="blank.myEvents.title"
      descriptionKey="blank.myEvents.body"
    />
  );
}
