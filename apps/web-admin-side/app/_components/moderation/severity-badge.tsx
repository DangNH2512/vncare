'use client';

import type { ModerationSeverityT } from '@dnc/contracts';

import { useTranslate } from '../locale-provider';
import { Badge, type BadgeTone } from '../ui';
import { SEVERITY_LABEL_KEY } from './labels';

const SEVERITY_TONE: Readonly<Record<ModerationSeverityT, BadgeTone>> = {
  critical: 'danger',
  high: 'warning',
  normal: 'accent',
  low: 'neutral',
};

/**
 * P0–P3 marker. The text ("P0 · Critical") carries the meaning; the colour
 * only repeats it, so the badge reads the same without colour vision.
 */
export function SeverityBadge({ severity }: { severity: ModerationSeverityT }) {
  const t = useTranslate();
  return <Badge tone={SEVERITY_TONE[severity]}>{t(SEVERITY_LABEL_KEY[severity])}</Badge>;
}
