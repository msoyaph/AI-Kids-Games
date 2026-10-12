import { t } from '../../i18n';
import { h } from '../../ui/dom';
import { showModal } from '../../ui/modals';
import type { App } from '../App';

/** Inside an iframe (the games site), downloads may be blocked: offer copy only. */
function embedded(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** Playtest data: what is recorded, export (download / copy), delete, stop. */
export function showPlaytestPanel(app: App, onChange: () => void): void {
  const store = app.playtest;
  const json = store.exportJson();
  const count = store.data.runs.length;
  const box = h('textarea.share-code', { readonly: true, rows: 6, 'aria-label': t('playtest.title') }) as HTMLTextAreaElement;
  box.value = json;
  box.addEventListener('focus', () => box.select());
  const status = h('p.note', { role: 'status' });
  const copy = async (): Promise<void> => {
    box.select();
    try {
      await navigator.clipboard.writeText(json);
      status.textContent = t('workshop.copied');
    } catch {
      status.textContent = t('workshop.copyFail');
    }
  };
  const download = (): void => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = h('a', { href: url, download: `vanex-defense-playtest-${store.data.runs.at(-1)?.day ?? 'runs'}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const m = showModal(
    app.ui,
    [
      h('h2', null, t('playtest.title')),
      h('p', null, t('playtest.body')),
      h('p.note', null, count ? t('playtest.count', { count }) : t('playtest.empty')),
      count ? h('p', null, t('playtest.copyHelp')) : null,
      count ? box : null,
      count
        ? h(
            'div.row',
            null,
            embedded() ? null : h('button.btn.green', { onClick: download }, t('playtest.download')),
            h('button.btn.gold', { onClick: () => void copy() }, t('workshop.copy')),
          )
        : null,
      status,
      h(
        'div.row',
        null,
        count
          ? h(
              'button.btn.red',
              {
                onClick: () => {
                  store.clear();
                  m.close();
                  onChange();
                },
              },
              t('playtest.clear'),
            )
          : null,
        store.enabled
          ? h(
              'button.btn',
              {
                onClick: () => {
                  store.setEnabled(false);
                  m.close();
                  onChange();
                },
              },
              t('playtest.stop'),
            )
          : null,
        h('button.btn.ghost', { onClick: () => m.close() }, t('common.close')),
      ),
    ].filter(Boolean) as HTMLElement[],
    { onBackdrop: () => m.close(), cls: 'wide' },
  );
}
