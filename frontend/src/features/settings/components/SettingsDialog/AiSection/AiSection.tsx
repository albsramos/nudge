import { defaultModels, providerLabels, providers, type Provider, type Settings } from '@/shared/lib/settings';
import { Button } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Label } from '@/shared/ui/Label/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select/Select';
import styles from './AiSection.module.css';

type AiSectionProps = {
  settings: Settings;
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
};

const keyHelp: Record<Provider, string> = {
  anthropic: 'Create one at console.anthropic.com → API keys.',
  openai: 'Create one at platform.openai.com → API keys.',
  gemini: 'Create one at aistudio.google.com → Get API key.',
  'openai-compatible': 'Optional for local servers such as Ollama.',
};

export function AiSection({ settings, provider, onProviderChange }: AiSectionProps) {
  const isCompatible = provider === 'openai-compatible';

  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>AI model</legend>
      <div className={styles.field}>
        <Label htmlFor="provider">Provider</Label>
        <Select name="provider" value={provider} onValueChange={(value) => onProviderChange(value as Provider)}>
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {providerLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={styles.field}>
        <Label htmlFor="apiKey">API key</Label>
        <Input id="apiKey" name="apiKey" type="password" autoComplete="off" spellCheck={false} defaultValue={settings.apiKey} placeholder="sk-…" />
        <p className={styles.help}>{keyHelp[provider]} Requests go straight from this device to the provider.</p>
      </div>
      {isCompatible && (
        <div className={styles.field}>
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input id="baseUrl" name="baseUrl" type="url" required defaultValue={settings.baseUrl} placeholder="https://openrouter.ai/api/v1" />
        </div>
      )}
      <div className={styles.field}>
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          name="model"
          spellCheck={false}
          required={isCompatible}
          defaultValue={settings.model}
          placeholder={defaultModels[provider] || 'e.g. llama-3.3-70b-versatile'}
        />
      </div>
      <Button type="submit" name="intent" value="test-ai" variant="secondary" size="sm" className={styles.test} formNoValidate>
        Test AI connection
      </Button>
    </fieldset>
  );
}
