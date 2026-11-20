import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  CircleCheckBig,
  ClipboardCopy,
  Download,
  Ellipsis,
  EyeOff,
  ExternalLink,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from 'cn';
import {
  checkUpdate,
  DEFAULTS,
  isNewer,
  isSettingKey,
  LIMITS,
  resolveLang,
  translate,
  UPDATE_CHECK_MS,
  type Settings,
  type StringKey,
} from '@/utils/shared';

type SwitchKey = 'autoReady' | 'copyServerIp' | 'autoJoinServer' | 'queueDots' | 'matchStats' | 'hideCancelled';

const SECTIONS: { title: StringKey; features: { key: SwitchKey; icon: LucideIcon }[] }[] = [
  {
    title: 'sectionMatch',
    // In the order a match goes: accept, captain pick and map veto, server.
    features: [
      { key: 'autoReady', icon: CircleCheckBig },
      { key: 'matchStats', icon: BarChart3 },
      { key: 'copyServerIp', icon: ClipboardCopy },
      { key: 'autoJoinServer', icon: Rocket },
    ],
  },
  {
    title: 'sectionSite',
    features: [
      { key: 'queueDots', icon: Ellipsis },
      { key: 'hideCancelled', icon: EyeOff },
    ],
  },
];

const [DELAY_MIN, DELAY_MAX] = LIMITS.autoReadyDelaySec;
const VERSION = browser.runtime.getManifest().version;
const GUIDE_URL = 'https://csdeaf.com/tools';

export default function App() {
  const [state, setState] = useState<Settings | null>(null);

  useEffect(() => {
    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local') return;
      setState((prev) => {
        const next = { ...(prev ?? DEFAULTS) } as Record<string, unknown>;
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (isSettingKey(key)) next[key] = newValue ?? DEFAULTS[key];
        }
        return next as Settings;
      });
    };
    browser.storage.onChanged.addListener(onChanged);

    browser.storage.local.get(DEFAULTS).then((stored) => {
      setState(stored as Settings);
      // Browsers that stay open for days never fire onStartup, so the popup catches up.
      if (Date.now() - (stored as Settings).updateCheckedAt > UPDATE_CHECK_MS) checkUpdate();
    });

    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const lang = resolveLang(state?.lang ?? DEFAULTS.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!state) return null;

  const t = (key: StringKey, vars?: Record<string, string | number>) => translate(state.lang, key, vars);
  const set = (values: Partial<Settings>) => {
    // Optimistic: the slider must follow the pointer without waiting for storage.onChanged.
    setState((prev) => (prev ? { ...prev, ...values } : prev));
    browser.storage.local.set(values);
  };
  // Compared with the running version, so the banner disappears by itself once the user updates.
  const updateAvailable = isNewer(state.updateLatest, VERSION);
  const delay = state.autoReadyDelaySec;

  return (
    <>
      <header className="flex items-center gap-2.5 px-3.5 py-2.5">
        <img className="size-8.5 shrink-0 rounded-[9px] shadow-[0_4px_14px_rgb(245_165_36/0.35)]" src="/icon/48.png" alt="" />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
            DeafCS Tools
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground tabular-nums">
              v{VERSION}
            </Badge>
          </h1>
          <p className="truncate text-[11.5px] text-muted-foreground">{t('subtitle')}</p>
        </div>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Language"
          value={[lang]}
          onValueChange={([value]) => value && set({ lang: value })}
        >
          {(['en', 'ru'] as const).map((code) => (
            <ToggleGroupItem
              key={code}
              value={code}
              className="h-7 px-2 text-[11px] font-bold data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              {code.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>

      <Separator />

      {updateAvailable && (
        <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="mx-3.5 mt-2.5 block">
          <Alert className="border-primary/45 bg-primary/10 px-3 py-2 transition-colors hover:bg-primary/20">
            <Download className="text-primary" />
            <AlertDescription className="flex items-center justify-between text-xs text-foreground">
              {t('updateAvailable', { version: state.updateLatest })}
              <b className="text-primary">{t('updateDownload')}</b>
            </AlertDescription>
          </Alert>
        </a>
      )}

      <main className="px-3.5">
        {SECTIONS.map(({ title, features }) => (
          <section key={title} className="mt-2.5">
            <h2 className="mb-1.5 ml-0.5 text-[10.5px] font-bold tracking-widest text-muted-foreground/70 uppercase">
              {t(title)}
            </h2>
            <div className="flex flex-col gap-1.5">
              {features.map(({ key, icon }) => (
                <Feature
                  key={key}
                  id={key}
                  icon={icon}
                  title={t(key)}
                  desc={t(`${key}Desc` as StringKey)}
                  checked={state[key]}
                  onChange={(checked) => set({ [key]: checked })}
                >
                  {key === 'autoReady' && state.autoReady && (
                    <div className="mx-3 border-t border-dashed border-input pt-2 pb-3">
                      <div className="mb-2.5 flex items-baseline justify-between text-xs">
                        <span id="autoReadyDelayLabel" className="text-muted-foreground">
                          {t('delay')}
                        </span>
                        <span className="font-bold text-primary tabular-nums">
                          {delay === 0 ? t('delayNone') : t('delayValue', { n: delay })}
                        </span>
                      </div>
                      <Slider
                        aria-labelledby="autoReadyDelayLabel"
                        min={DELAY_MIN}
                        max={DELAY_MAX}
                        step={1}
                        value={[delay]}
                        onValueChange={(value) => set({ autoReadyDelaySec: Array.isArray(value) ? value[0] : value })}
                      />
                    </div>
                  )}
                </Feature>
              ))}
            </div>
          </section>
        ))}
      </main>

      <Separator className="mt-2.5" />

      <footer className="flex gap-1.5 px-3.5 py-2.5">
        <Button
          nativeButton={false}
          render={<a href="https://deafcs.net" target="_blank" rel="noreferrer" />}
          className="h-8 flex-1 font-semibold"
        >
          <ExternalLink />
          {t('openSite')}
        </Button>
        <Button
          nativeButton={false}
          render={<a href={GUIDE_URL} target="_blank" rel="noreferrer" />}
          variant="outline"
          className="h-8 flex-1 font-semibold"
        >
          <BookOpen />
          {t('guide')}
        </Button>
      </footer>
    </>
  );
}

function Feature(props: {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  const { id, icon: Icon, title, desc, checked, onChange, children } = props;
  return (
    <Card
      className={cn(
        'gap-0 rounded-xl py-0 ring-border transition-colors hover:bg-accent hover:ring-input',
        checked && 'ring-primary/30 hover:ring-primary/40',
      )}
    >
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-3 py-1.75">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-[9px] border bg-background text-muted-foreground/70 transition-colors',
            checked && 'border-primary/30 bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4.5" strokeWidth={2.2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-semibold">{title}</span>
          <span className="text-[11.5px] leading-snug text-muted-foreground">{desc}</span>
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </label>
      {children}
    </Card>
  );
}
