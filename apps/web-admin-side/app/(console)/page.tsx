'use client';

import { useTranslate } from '../_components/locale-provider';

/** Console landing screen. Every staff role that can sign in lands here. */
export default function OverviewPage() {
  const t = useTranslate();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold text-fg">{t('admin.overview.title')}</h1>
      <p className="text-sm text-fg-muted">{t('admin.overview.body')}</p>
    </div>
  );
}
