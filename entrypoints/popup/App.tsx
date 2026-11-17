import { useEffect, useRef, useState } from 'react';
import {
  checkUpdate,
  clamp,
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

const SWITCHES = ['copyServerIp', 'autoJoinServer', 'queueDots', 'hideCancelled', 'matchStats'] as const;

const [DELAY_MIN, DELAY_MAX] = LIMITS.autoReadyDelaySec;

export default function App() {
  const [state, setState] = useState<Settings | null>(null);
  // What the delay field shows while it has focus; null shows the stored value. Typing saves on
  // every keystroke (closing the popup while the field has focus doesn't fire "change"), but the
  // field itself is rewritten with the clamped value only on "change", not while typing.
  const [delayDraft, setDelayDraft] = useState<string | null>(null);
  const delayRef = useRef<HTMLInputElement>(null);

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

  // React's onChange is the native "input" event; the native "change" (blur or Enter) is separate.
  useEffect(() => {
    const input = delayRef.current;
    if (!input) return;
    const onChange = () => {
      const sec = clamp('autoReadyDelaySec', input.value);
      setDelayDraft(String(sec));
      browser.storage.local.set({ autoReadyDelaySec: sec });
    };
    input.addEventListener('change', onChange);
    return () => input.removeEventListener('change', onChange);
  }, [state !== null]);

  const lang = resolveLang(state?.lang ?? DEFAULTS.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!state) return null;

  const t = (key: StringKey, vars?: Record<string, string | number>) => translate(state.lang, key, vars);
  const set = (values: Partial<Settings>) => browser.storage.local.set(values);
  // Compared with the running version, so the banner disappears by itself once the user updates.
  const updateAvailable = isNewer(state.updateLatest, browser.runtime.getManifest().version);

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div className="brand">
            <img src="/icon/48.png" alt="" />
            <div>
              <h1>DeafCS Tools</h1>
              <p>{t('subtitle')}</p>
            </div>
          </div>
          <div className="lang" role="group" aria-label="Language">
            {(['en', 'ru'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={code === lang}
                onClick={() => set({ lang: code })}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="update" hidden={!updateAvailable}>
          <span>{t('updateAvailable', { version: state.updateLatest })}</span>
          <a href="https://csdeaf.com/tools" target="_blank" rel="noreferrer">
            {t('updateDownload')}
          </a>
        </div>
      </div>

      <div className="separator"></div>

      <div className="field">
        <label className="label" htmlFor="autoReady">
          {t('autoReady')}
        </label>
        <input
          className="switch"
          type="checkbox"
          role="switch"
          id="autoReady"
          checked={state.autoReady}
          onChange={(e) => set({ autoReady: e.target.checked })}
        />
      </div>
      <div className="field sub">
        <label className="label muted" htmlFor="autoReadyDelay">
          {t('delay')}
        </label>
        <input
          ref={delayRef}
          className="input"
          type="number"
          id="autoReadyDelay"
          step="1"
          min={DELAY_MIN}
          max={DELAY_MAX}
          disabled={!state.autoReady}
          value={delayDraft ?? String(state.autoReadyDelaySec)}
          onFocus={(e) => setDelayDraft(e.target.value)}
          onBlur={() => setDelayDraft(null)}
          onChange={(e) => {
            setDelayDraft(e.target.value);
            set({ autoReadyDelaySec: clamp('autoReadyDelaySec', e.target.value) });
          }}
        />
      </div>
      {SWITCHES.map((key) => (
        <div className="field" key={key}>
          <label className="label" htmlFor={key}>
            {t(key)}
          </label>
          <input
            className="switch"
            type="checkbox"
            role="switch"
            id={key}
            checked={state[key]}
            onChange={(e) => set({ [key]: e.target.checked })}
          />
        </div>
      ))}
    </>
  );
}
