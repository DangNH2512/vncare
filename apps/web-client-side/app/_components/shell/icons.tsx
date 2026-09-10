import type { SVGProps } from 'react';

/**
 * Inline navigation icons for the app shell.
 *
 * Hand-drawn 24x24 outlines on `currentColor`, so an icon inherits the text
 * colour of whichever nav state it sits in. Kept deliberately simple — five
 * destinations and a plus do not justify an icon library dependency.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function base(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    width: 24,
    height: 24,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

/** House — the home feed. */
export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

/** Compass — discover. */
export function CompassIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </svg>
  );
}

/** Calendar — my events. */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v3.5m7-3.5v3.5" />
    </svg>
  );
}

/** Bell — notifications. */
export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 16v-5.5a6 6 0 0 1 12 0V16l1.5 2.5h-15Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** Person — profile. */
export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

/** Plus — create. */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Map pin — areas in the right rail. */
export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6.5-5.4-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}
