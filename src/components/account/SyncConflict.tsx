'use client';

import { useSync } from '@/lib/sync';
import { Alert, Button } from '../ui';

/** Shown once after logging in when this browser has guest answers and the account already has some. */
export function SyncConflict() {
  const s = useSync();
  if (s.mode !== 'conflict') return null;
  return (
    <Alert
      kind="warn"
      live
      title="Your account already has saved answers"
      action={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void s.resolveConflict('use_account')}>
            Use my account’s answers
          </Button>
          <Button variant="secondary" onClick={() => void s.resolveConflict('keep_browser')}>
            Keep this browser’s answers
          </Button>
        </div>
      }
    >
      This browser also has answers from before you logged in. Choose which to keep; the other copy
      is replaced.
    </Alert>
  );
}
