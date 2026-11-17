import type { Settings } from '@/shared/lib/settings';
import { Button } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Label } from '@/shared/ui/Label/Label';
import styles from './ServerSection.module.css';

type ServerSectionProps = {
  settings: Settings;
};

export function ServerSection({ settings }: ServerSectionProps) {
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>Reminder server</legend>
      <div className={styles.field}>
        <Label htmlFor="serverUrl">Server URL</Label>
        <Input id="serverUrl" name="serverUrl" type="url" spellCheck={false} defaultValue={settings.serverUrl} placeholder="https://nudge-api.example.com" />
        <p className={styles.help}>
          With a server, reminders arrive as push notifications even when the app is closed. Without one, they ring only
          while Nudge is open. The server stores each reminder's text until it's sent.
        </p>
      </div>
      <Button type="submit" name="intent" value="test-push" variant="secondary" size="sm" className={styles.test} formNoValidate>
        Save and send a test push
      </Button>
    </fieldset>
  );
}
