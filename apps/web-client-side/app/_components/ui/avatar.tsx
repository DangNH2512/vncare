import { cn } from '../../_lib/cn';

const SIZE = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
} as const;

/**
 * Fallback tints, drawn from the semantic palette so an avatar never introduces
 * a colour of its own. The pick is deterministic per name, which keeps a member
 * recognisable across the feed and their profile.
 */
const TINT = [
  'bg-accent-subtle text-accent-text',
  'bg-success-subtle text-success-text',
  'bg-sun-subtle text-sun-text',
  'bg-warning-subtle text-warning-text',
  'bg-surface-sunken text-fg-muted',
] as const;

export interface AvatarProps {
  name: string;
  /** Remote portrait. When absent or still loading, the initials stand in. */
  src?: string;
  size?: keyof typeof SIZE;
  className?: string;
}

/** First letter of the first and last word, so "Trần Minh Quân" reads as "TQ". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.codePointAt(0)!) % TINT.length;
  return TINT[hash] ?? TINT[0];
}

/**
 * Member portrait with an initials fallback.
 *
 * The box is square and sized before the image loads, so an avatar arriving
 * late never reflows the row it sits in.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'font-semibold ring-1 ring-line select-none',
        SIZE[size],
        src === undefined && tintFor(name),
        className,
      )}
    >
      {src === undefined ? (
        <span aria-hidden>{initials(name)}</span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- avatars are remote and unoptimised until the media pipeline exists */
        <img src={src} alt={name} width={64} height={64} className="size-full object-cover" />
      )}
      {src === undefined && <span className="sr-only">{name}</span>}
    </span>
  );
}
