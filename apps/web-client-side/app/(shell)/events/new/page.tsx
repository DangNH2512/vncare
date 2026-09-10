'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card, Input, Select } from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { AREAS, areaName, DA_NANG_CENTER } from '../../../_lib/areas';
import { ApiError, createEvent, publishEvent } from '../../../_lib/api';
import { cn } from '../../../_lib/cn';
import { LocationPicker, type PickedLocation } from '../../_components/location-picker';

/** Rounds up to the next full hour, three days out — a sensible default start. */
function defaultStart(): string {
  const date = new Date(Date.now() + 3 * 86_400_000);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  // datetime-local wants local wall-clock time without a zone suffix.
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Creating an event: what, when, where, and how many seats.
 *
 * Publishing is a separate explicit step after creation — an event starts as a
 * draft the organizer can look over, which is also where pre-publish review
 * hooks in for low-trust organizers later.
 */
export default function CreateEventPage() {
  const t = useTranslate();
  const router = useRouter();
  const { locale } = useLocale();
  const { user, loading, requireAuth } = useAuth();
  const startId = useId();
  const descriptionId = useId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState(AREAS[0]?.id ?? '');
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [startsAt, setStartsAt] = useState(defaultStart());
  const [capacity, setCapacity] = useState('12');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The screen needs an account before anything else makes sense.
  useEffect(() => {
    if (!loading && user === null) requireAuth();
  }, [loading, user, requireAuth]);

  const capacityNumber = Number(capacity);
  const canSubmit =
    title.trim().length >= 3 &&
    areaId !== '' &&
    startsAt !== '' &&
    Number.isInteger(capacityNumber) &&
    capacityNumber >= 1 &&
    capacityNumber <= 1000 &&
    new Date(startsAt).getTime() > Date.now() &&
    !submitting;

  const submit = async (publish: boolean) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const point = location ?? {
        // No pin means "somewhere in the chosen area": the area centre keeps the
        // event on the map without inventing a street address.
        lat: AREAS.find((a) => a.id === areaId)?.center.lat ?? DA_NANG_CENTER.lat,
        lng: AREAS.find((a) => a.id === areaId)?.center.lng ?? DA_NANG_CENTER.lng,
      };
      const created = await createEvent({
        title: title.trim(),
        ...(description.trim() === '' ? {} : { description: description.trim() }),
        areaId,
        lat: point.lat,
        lng: point.lng,
        startsAt: new Date(startsAt).toISOString(),
        capacity: capacityNumber,
        requiredTrustLevel: 0,
      });
      if (publish) await publishEvent(created.id);
      router.push(`/events/${created.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.isOffline
          ? t('auth.error.offline')
          : t('event.create.error'),
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-0 md:py-8">
      <Card padding="lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(true);
          }}
        >
          <h1 className="font-display text-2xl font-bold text-fg">
            {t('event.create.title')}
          </h1>

          <Input
            label={t('event.create.field.title')}
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={descriptionId} className="text-sm font-medium text-fg">
              {t('event.create.field.description')}
            </label>
            <textarea
              id={descriptionId}
              value={description}
              maxLength={5000}
              rows={5}
              placeholder={t('event.create.hint.description')}
              onChange={(event) => setDescription(event.target.value)}
              className={cn(
                'min-h-28 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-md',
                'transition-[border-color] duration-150 focus:border-accent focus:outline-none',
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={startId} className="text-sm font-medium text-fg">
                {t('event.create.field.startsAt')}
              </label>
              <input
                id={startId}
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className={cn(
                  'min-h-11 w-full rounded-md border border-line bg-surface px-3 text-md',
                  'transition-[border-color] duration-150 focus:border-accent focus:outline-none',
                )}
              />
            </div>
            <Input
              label={t('event.create.field.capacity')}
              type="number"
              min={1}
              max={1000}
              value={capacity}
              hint={t('event.create.hint.capacity')}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </div>

          <Select
            label={t('event.create.field.area')}
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
          >
            {AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {areaName(area, locale)}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">
              {t('event.create.field.location')}
            </span>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {error !== null && (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={!canSubmit}
              onClick={() => void submit(false)}
            >
              {t('event.create.saveDraft')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? t('event.create.working') : t('event.create.publish')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
