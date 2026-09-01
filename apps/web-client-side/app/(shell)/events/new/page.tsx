import { BlankScreen } from '../../../_components/blank-screen';

/**
 * Placeholder for event creation — the shell's primary call to action.
 *
 * It exists so the most prominent button in the app does not dead-end while the
 * real form is being built.
 */
export default function CreateEventPage() {
  return (
    <BlankScreen
      glyph="✏️"
      titleKey="blank.createEvent.title"
      descriptionKey="blank.createEvent.body"
    />
  );
}
