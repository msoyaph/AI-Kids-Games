// One view of whichever assistant hosts the widget: MCP Apps hosts (Claude, ChatGPT, VS Code, …) through
// the bridge, plus ChatGPT's window.openai extras when they exist. Everything the views need goes through
// here: the tool result, theme and fonts, display modes, links, messages and reading server resources.
import type { McpUiDisplayMode,McpUiHostCapabilities,McpUiHostContext,McpUiInitializeResult } from '@modelcontextprotocol/ext-apps';
import { Bridge } from './bridge';

type OpenAI = {
  toolOutput?: unknown; theme?: 'light' | 'dark'; displayMode?: McpUiDisplayMode; maxHeight?: number;
  safeArea?: { insets?: { top: number; bottom: number; left: number; right: number } };
  openExternal?: (options: { href: string }) => unknown;
  requestDisplayMode?: (options: { mode: McpUiDisplayMode }) => Promise<{ mode: McpUiDisplayMode }>;
  sendFollowUpMessage?: (options: { prompt: string }) => Promise<void>;
  notifyIntrinsicHeight?: (height: number) => void;
};
declare global { interface Window { openai?: OpenAI } }

export type HostKind = 'chatgpt' | 'claude' | 'other' | 'none';
export interface HostState {
  kind: HostKind;
  theme?: 'light' | 'dark';
  displayMode: McpUiDisplayMode;
  available: McpUiDisplayMode[];
  touch: boolean;
  maxHeight?: number;
  insets: { top: number; right: number; bottom: number; left: number };
}

export class Host {
  readonly bridge = new Bridge();
  private connected = false;
  private capabilities: McpUiHostCapabilities = {};
  private resultListeners: ((result: unknown) => void)[] = [];
  private changeListeners: (() => void)[] = [];
  private teardownListeners: (() => void)[] = [];
  private lastResult: unknown;
  state: HostState = { kind: 'none',displayMode: 'inline',available: [],touch: matchMedia('(pointer: coarse)').matches,insets: { top: 0,right: 0,bottom: 0,left: 0 } };

  async connect() {
    this.bridge.on('ui/notifications/tool-result',(params: { structuredContent?: unknown }) => this.result(params?.structuredContent));
    this.bridge.on('ui/notifications/host-context-changed',(context: McpUiHostContext) => this.context(context));
    this.bridge.on('ui/resource-teardown',() => { this.teardownListeners.forEach(listener => listener()); return {}; });
    this.bridge.on('ping',() => ({}));
    const openai = window.openai;
    if (openai) {
      this.state.kind = 'chatgpt';
      this.fromOpenAI();
      addEventListener('openai:set_globals',() => { this.fromOpenAI(); if (window.openai?.toolOutput) this.result(window.openai.toolOutput); });
    }
    if (window.parent !== window) {
      try {
        const init = await this.bridge.request<McpUiInitializeResult>('ui/initialize',{
          appInfo: { name: 'ai-kids-games-widget',version: '1' },
          appCapabilities: { availableDisplayModes: ['inline','fullscreen'] },
          protocolVersion: '2026-01-26'
        },openai ? 2_000 : 5_000);
        this.connected = true; this.capabilities = init.hostCapabilities ?? {};
        if (!openai) this.state.kind = /claude|anthropic/i.test(init.hostInfo?.name ?? '') ? 'claude' : 'other';
        this.context(init.hostContext ?? {});
        this.bridge.notify('ui/notifications/initialized');
      } catch { /* Not an MCP Apps host (or ChatGPT's own globals only). */ }
    }
    if (openai?.toolOutput) this.result(openai.toolOutput);
    this.reportSize();
  }

  private fromOpenAI() {
    const o = window.openai!;
    Object.assign(this.state,{ theme: o.theme ?? this.state.theme,displayMode: o.displayMode ?? this.state.displayMode,maxHeight: o.maxHeight ?? this.state.maxHeight });
    if (!this.state.available.length) this.state.available = ['inline','fullscreen','pip'];
    const insets = o.safeArea?.insets; if (insets) this.state.insets = insets;
    this.changed();
  }
  private context(context: McpUiHostContext) {
    const s = this.state;
    if (context.theme) s.theme = context.theme;
    if (context.displayMode) s.displayMode = context.displayMode;
    if (context.availableDisplayModes) s.available = context.availableDisplayModes;
    if (context.deviceCapabilities?.touch !== undefined) s.touch = context.deviceCapabilities.touch;
    if (context.platform === 'mobile') s.touch = true;
    if (context.safeAreaInsets) s.insets = context.safeAreaInsets;
    const box = context.containerDimensions as { maxHeight?: number; height?: number } | undefined;
    if (box) s.maxHeight = box.maxHeight ?? box.height ?? s.maxHeight;
    // The host's design tokens and fonts (MCP Apps styles), so the card looks at home there.
    const root = document.documentElement;
    for (const [name,value] of Object.entries(context.styles?.variables ?? {})) if (value) root.style.setProperty(name,value);
    const fonts = context.styles?.css?.fonts;
    if (fonts && !document.getElementById('host-fonts')) { const style = document.createElement('style'); style.id = 'host-fonts'; style.textContent = fonts; document.head.append(style); }
    this.changed();
  }
  private changed() {
    const root = document.documentElement;
    if (this.state.theme) root.dataset.theme = this.state.theme;
    root.dataset.host = this.state.kind; root.dataset.mode = this.state.displayMode;
    root.style.setProperty('--inset-top',`${this.state.insets.top}px`); root.style.setProperty('--inset-bottom',`${this.state.insets.bottom}px`);
    root.style.setProperty('--inset-left',`${this.state.insets.left}px`); root.style.setProperty('--inset-right',`${this.state.insets.right}px`);
    this.changeListeners.forEach(listener => listener());
  }
  private result(structured: unknown) {
    if (!structured || structured === this.lastResult) return;
    this.lastResult = structured;
    this.resultListeners.forEach(listener => listener(structured));
  }

  onResult(listener: (result: unknown) => void) { this.resultListeners.push(listener); if (this.lastResult) listener(this.lastResult); }
  onChange(listener: () => void) { this.changeListeners.push(listener); }
  onTeardown(listener: () => void) { this.teardownListeners.push(listener); }
  get canReadResources() { return this.connected && !!this.capabilities.serverResources; }
  get canFullscreen() { return this.state.available.includes('fullscreen') || (!this.state.available.length && this.connected); }

  /** Only our own site and the repo (links.ts checks), the way the host wants links opened. */
  async openLink(url: string) {
    if (window.openai?.openExternal) { window.openai.openExternal({ href: url }); return true; }
    if (this.connected) { try { const result = await this.bridge.request<{ isError?: boolean }>('ui/open-link',{ url }); return !result?.isError; } catch { return false; } }
    return false;
  }
  async requestDisplayMode(mode: McpUiDisplayMode): Promise<McpUiDisplayMode> {
    try {
      const result = window.openai?.requestDisplayMode && !this.connected
        ? await window.openai.requestDisplayMode({ mode })
        : await this.bridge.request<{ mode: McpUiDisplayMode }>('ui/request-display-mode',{ mode });
      this.state.displayMode = result?.mode ?? this.state.displayMode;
    } catch { /* The host said no; stay as we are. */ }
    this.changed();
    return this.state.displayMode;
  }
  async sendMessage(text: string) {
    if (this.connected) { await this.bridge.request('ui/message',{ role: 'user',content: [{ type: 'text',text }] }); return; }
    await window.openai?.sendFollowUpMessage?.({ prompt: text });
  }
  async readResource(uri: string) {
    const result = await this.bridge.request<{ contents?: { text?: string; blob?: string }[] }>('resources/read',{ uri },60_000);
    const content = result?.contents?.[0];
    if (content?.text !== undefined) return new TextEncoder().encode(content.text);
    if (content?.blob !== undefined) return Uint8Array.from(atob(content.blob),char => char.charCodeAt(0));
    throw new Error('The host returned no game.');
  }
  /** Tell the host how tall the widget is (inline). */
  reportSize() {
    let last = 0;
    const send = () => {
      const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
      if (!height || height === last) return; last = height;
      if (this.connected) this.bridge.notify('ui/notifications/size-changed',{ height });
      window.openai?.notifyIntrinsicHeight?.(height);
    };
    new ResizeObserver(send).observe(document.documentElement); send();
  }
}
