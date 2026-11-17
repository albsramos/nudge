import { Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { providers, updateSettings, useSettings, type Provider, type Settings } from '@/shared/lib/settings';
import { Button } from '@/shared/ui/Button/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/Dialog/Dialog';
import { toast } from '@/shared/ui/Toaster/toast';
import { testAi, testPush } from '../../api/testApi';
import { AiSection } from './AiSection/AiSection';
import styles from './SettingsDialog.module.css';
import { ServerSection } from './ServerSection/ServerSection';

function readForm(formData: FormData, current: Settings): Settings {
  const text = (name: string) => String(formData.get(name) ?? '').trim();
  const provider = text('provider') as Provider;
  return {
    provider: providers.includes(provider) ? provider : current.provider,
    apiKey: text('apiKey'),
    model: text('model'),
    baseUrl: text('baseUrl'),
    serverUrl: text('serverUrl'),
  };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function SettingsDialog() {
  const settings = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>(settings.provider);

  function handleOpenChange(open: boolean) {
    if (open) setProvider(settings.provider);
    setIsOpen(open);
  }

  // One form, three buttons: each submit button names its intent.
  async function handleAction(formData: FormData) {
    const next = readForm(formData, settings);
    const intent = formData.get('intent');
    if (intent === 'test-ai') {
      try {
        await testAi(next);
        toast.success('AI connection works');
      } catch (error) {
        toast.error('AI check failed', { description: message(error) });
      }
      return;
    }
    updateSettings(next);
    if (intent === 'test-push') {
      try {
        await testPush();
        toast.success('Test push scheduled', { description: 'It should arrive in about 5–20 seconds.' });
      } catch (error) {
        toast.error('Push check failed', { description: message(error) });
      }
      return;
    }
    toast.success('Settings saved');
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Stored only on this device.</DialogDescription>
        </DialogHeader>
        <form action={handleAction} className={styles.form}>
          <AiSection settings={settings} provider={provider} onProviderChange={setProvider} />
          <ServerSection settings={settings} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" name="intent" value="save">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
