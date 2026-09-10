'use client';

import { useId, useState } from 'react';
import type { MyProfileResponseT, ProfileUpdateRequestT } from '@dnc/contracts';

import { Button, Card, Input, Select } from '../../_components/ui';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { AREAS, areaName } from '../../_lib/areas';
import { ApiError, updateMyProfile } from '../../_lib/api';
import { cn } from '../../_lib/cn';

export interface ProfileEditorProps {
  profile: MyProfileResponseT;
  onCancel: () => void;
  onSaved: (profile: MyProfileResponseT) => void;
}

const VISIBILITIES = ['public', 'members_only', 'private'] as const;

/**
 * Edit form for your own profile.
 *
 * Sends only what changed. A PATCH that echoes every field back would overwrite
 * a value another device changed a second ago, and would make it impossible to
 * tell "left blank" from "cleared on purpose" — which the API treats
 * differently.
 */
/** Turns a save failure into the most specific message we can honestly give. */
function useSaveFailureMessage() {
  const t = useTranslate();
  return (cause: unknown): string => {
    if (cause instanceof ApiError) {
      if (cause.isOffline) return t('auth.error.offline');
      if (cause.status === 409) return t('errors.profile.phoneTaken');
      if (cause.messageKey === 'errors.profile.phoneInvalid') {
        return t('errors.profile.phoneInvalid');
      }
    }
    return t('profile.error.save');
  };
}

export function ProfileEditor({ profile, onCancel, onSaved }: ProfileEditorProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const describeSaveFailure = useSaveFailureMessage();
  const bioId = useId();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [headline, setHeadline] = useState(profile.headline ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [homeAreaId, setHomeAreaId] = useState(profile.homeAreaId ?? '');
  const [visibility, setVisibility] = useState(profile.visibility);
  const [showArea, setShowArea] = useState(profile.showAreaPublicly);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);

    // An empty text field means "clear it", which the API expects as null.
    const patch: ProfileUpdateRequestT = {};
    if (displayName.trim() !== profile.displayName) patch.displayName = displayName.trim();
    if ((headline.trim() || null) !== profile.headline) {
      patch.headline = headline.trim() || null;
    }
    if ((bio.trim() || null) !== profile.bio) patch.bio = bio.trim() || null;
    if ((phone.trim() || null) !== profile.phone) patch.phone = phone.trim() || null;
    if ((homeAreaId || null) !== profile.homeAreaId) patch.homeAreaId = homeAreaId || null;
    if (visibility !== profile.visibility) patch.visibility = visibility;
    if (showArea !== profile.showAreaPublicly) patch.showAreaPublicly = showArea;

    try {
      onSaved(await updateMyProfile(patch));
    } catch (cause) {
      setError(describeSaveFailure(cause));
      setSaving(false);
    }
  };

  return (
    <Card padding="lg">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h1 className="text-xl font-semibold text-fg">{t('profile.action.edit')}</h1>

        <Input
          label={t('profile.field.displayName')}
          value={displayName}
          maxLength={60}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        <Input
          label={t('profile.field.headline')}
          value={headline}
          maxLength={120}
          hint={t('profile.hint.headline')}
          onChange={(event) => setHeadline(event.target.value)}
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={bioId} className="text-sm font-medium text-fg">
            {t('profile.field.bio')}
          </label>
          <textarea
            id={bioId}
            value={bio}
            maxLength={1000}
            rows={5}
            onChange={(event) => setBio(event.target.value)}
            className={cn(
              'min-h-28 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-md',
              'transition-[border-color] duration-150 focus:border-accent focus:outline-none',
            )}
          />
          <p className="text-right text-xs text-fg-muted">{bio.length}/1000</p>
        </div>

        <Input
          label={t('profile.field.phone')}
          type="tel"
          value={phone}
          maxLength={32}
          autoComplete="tel"
          hint={t('profile.hint.phone')}
          onChange={(event) => setPhone(event.target.value)}
        />

        <Select
          label={t('profile.field.homeArea')}
          value={homeAreaId}
          onChange={(event) => setHomeAreaId(event.target.value)}
        >
          <option value="">{t('profile.field.noArea')}</option>
          {AREAS.map((area) => (
            <option key={area.id} value={area.id}>
              {areaName(area, locale)}
            </option>
          ))}
        </Select>

        <Select
          label={t('profile.field.visibility')}
          value={visibility}
          hint={t(`profile.visibilityHint.${visibility}` as never)}
          onChange={(event) =>
            setVisibility(event.target.value as MyProfileResponseT['visibility'])
          }
        >
          {VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {t(`profile.visibility.${value}` as never)}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={showArea}
            onChange={(event) => setShowArea(event.target.checked)}
            className="size-4 accent-accent"
          />
          {t('profile.field.showArea')}
        </label>

        {error !== null && (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            {t('profile.action.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('profile.action.saving') : t('profile.action.save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
