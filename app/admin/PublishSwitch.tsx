'use client';

/* Draft · soon · open, as three buttons rather than a select: the current state
   is visible without opening anything, and each choice says what it means. */

import { PUBLISH_STATUSES, type PublishStatus } from '@/lib/db';

const MEANING: Record<PublishStatus, string> = {
  draft: 'Only admins see it',
  soon: 'Members see it as coming soon and cannot start it',
  open: 'Members can watch',
};

export default function PublishSwitch({
  value,
  disabled,
  onChange,
  options = PUBLISH_STATUSES,
}: {
  value: PublishStatus;
  disabled?: boolean;
  onChange: (next: PublishStatus) => void;
  /** Routines and exercises are draft or open; only a menu can be "soon". */
  options?: PublishStatus[];
}) {
  return (
    <div className="pubseg" role="group" aria-label="Publish status">
      {options.map(s => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          disabled={disabled}
          title={MEANING[s]}
          onClick={() => s !== value && onChange(s)}
        >
          <i className={`dot ${s}`} aria-hidden="true" />
          {s}
        </button>
      ))}
    </div>
  );
}

export const publishMeaning = (s: PublishStatus) => MEANING[s];
