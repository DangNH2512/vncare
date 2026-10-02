import type { SVGProps } from 'react';

/**
 * Small outline icons for the comment surface. 20px on `currentColor`, so each
 * inherits the tone of the button that hosts it. Decorative: every host button
 * carries its own accessible name.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function base(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 8 4.5 12.5 10 17M5 12.5h8a6 6 0 0 1 6 6" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16Zm9-13 4 4" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6m4-6v6" />
    </svg>
  );
}

export function PinIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d="m14.5 4 5.5 5.5-2.2.8-3.3 3.3.4 3.4-1.4 1.4-3.4-3.4L4.5 19.5l5.5-5.5L6.6 10.6 8 9.2l3.4.4 3.3-3.3Z" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12 20 4l-5 16-3.5-6.5Zm7.5 1.5L20 4" />
    </svg>
  );
}
