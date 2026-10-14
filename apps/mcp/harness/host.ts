// A test host that renders the widget the way assistants do (MCP Apps 2026-01-26), using the official
// host bridge (AppBridge): it calls the tool on the local MCP server, reads the widget resource, loads it
// through the sandbox proxy (another origin) under the resource's CSP, and answers the view's requests.
// Profiles mimic what the research found about each host:
//   claude    no popups, no permissions in the frame (no gamepad, no fullscreen API), inline + fullscreen
//   chatgpt   the same bridge plus window.openai (the widget then shows no logo or brand bar)
//   strict    a host that ignores connectDomains (the widget must read the build through the host)
//   nostorage a host whose frames have no storage (opaque origin)
// URL: /?profile=claude&tool=show_game&args={"game":"tuck-pop"}&theme=light&touch=0&width=720
import { AppBridge,PostMessageTransport,type McpUiDisplayMode,type McpUiHostContext } from '@modelcontextprotocol/ext-apps/app-bridge';

const params = new URLSearchParams(location.search);
const profile = params.get('profile') ?? 'claude', tool = params.get('tool') ?? 'show_game', args = JSON.parse(params.get('args') ?? '{}');
const theme = (params.get('theme') ?? 'light') as 'light' | 'dark', touch = params.get('touch') === '1', width = Number(params.get('width') ?? 720);
const MCP = params.get('mcp') ?? 'http://127.0.0.1:4333/mcp';

type Record_ = { links: string[]; messages: string[]; modes: McpUiDisplayMode[]; reads: string[]; calls: string[]; ready: boolean; error?: string; sizes: number[] };
const record: Record_ = { links: [],messages: [],modes: [],reads: [],calls: [],ready: false,sizes: [] };
(window as unknown as { __harness: Record_ }).__harness = record;
document.body.classList.toggle('dark',theme === 'dark');
(document.getElementById('chat') as HTMLElement).style.maxWidth = `${width}px`;

let next = 1;
/** One JSON-RPC call to the MCP server (2025-era stateless, as most hosts still speak). */
async function rpc<T>(method: string,params: object): Promise<T> {
  const response = await fetch(MCP,{ method: 'POST',headers: { 'content-type': 'application/json',accept: 'application/json, text/event-stream' },body: JSON.stringify({ jsonrpc: '2.0',id: next++,method,params }) });
  const body = await response.text();
  const json = response.headers.get('content-type')?.includes('text/event-stream') ? body.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6))).find(message => 'result' in message || 'error' in message) : JSON.parse(body);
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

const OPENAI_SHIM = `<script>(() => {
  const post = (method, params) => parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
  window.openai = { theme: '${theme}', displayMode: 'inline', maxHeight: 640, locale: 'en-US', safeArea: { insets: { top: 0, right: 0, bottom: 0, left: 0 } },
    openExternal: ({ href }) => post('harness/open-external', { href }),
    notifyIntrinsicHeight: () => {}, sendFollowUpMessage: ({ prompt }) => { post('harness/follow-up', { prompt }); return Promise.resolve(); } };
})();</script>`;

async function main() {
  const { tools } = await rpc<{ tools: { name: string; _meta?: { ui?: { resourceUri?: string } } }[] }>('tools/list',{});
  const uri = tools.find(entry => entry.name === tool)?._meta?.ui?.resourceUri;
  const result = await rpc<{ content: { text: string }[]; structuredContent: unknown }>('tools/call',{ name: tool,arguments: args });
  (document.getElementById('said') as HTMLElement).textContent = result.content.map(block => block.text).join('\n');
  if (!uri) { record.ready = true; return; }
  const resource = await rpc<{ contents: { text: string; _meta?: { ui?: { csp?: Record<string,string[]> } } }[] }>('resources/read',{ uri });
  const html = resource.contents[0].text;
  const declared = resource.contents[0]._meta?.ui?.csp ?? {};
  const csp = profile === 'strict' ? { ...declared,connectDomains: [] } : declared;

  const available: McpUiDisplayMode[] = profile === 'chatgpt' ? ['inline','fullscreen','pip'] : ['inline','fullscreen'];
  const context = (mode: McpUiDisplayMode): McpUiHostContext => ({
    theme,displayMode: mode,availableDisplayModes: available,locale: 'en-US',timeZone: 'UTC',platform: touch ? 'mobile' : 'web',
    deviceCapabilities: { touch,hover: !touch },safeAreaInsets: { top: 0,right: 0,bottom: 0,left: 0 },
    containerDimensions: mode === 'fullscreen' ? { height: innerHeight,width: innerWidth } : { maxHeight: 640,width },
    styles: { variables: (theme === 'dark'
      ? { '--color-background-primary': '#262624','--color-text-primary': '#f5f4ef','--color-text-secondary': '#b7b5a9','--color-border-primary': '#3e3e38' }
      : { '--color-background-primary': '#ffffff','--color-text-primary': '#141413','--color-text-secondary': '#5e5d59','--color-border-primary': '#e5e4df' }) as never }
  });

  const proxy = document.createElement('iframe');
  proxy.id = 'proxy'; proxy.title = 'App';
  proxy.src = 'http://127.0.0.1:4331/sandbox.html';
  proxy.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');
  proxy.setAttribute('allow','');
  document.getElementById('slot')!.append(proxy);

  const bridge = new AppBridge(null,{ name: profile === 'chatgpt' ? 'chatgpt' : profile === 'claude' ? 'claude-ai' : 'test-host',version: '1' },
    { openLinks: {},serverResources: {},serverTools: {},sandbox: { csp } },{ hostContext: context('inline') });
  // ChatGPT puts window.openai into the frame before the app's own scripts run.
  const page = profile === 'chatgpt' ? html.replace(/<head[^>]*>/i,match => match+OPENAI_SHIM) : html;
  bridge.onsandboxready = () => void bridge.sendSandboxResourceReady({
    html: page,csp,sandbox: profile === 'nostorage' ? 'allow-scripts allow-forms' : 'allow-scripts allow-same-origin allow-forms'
  });
  bridge.oninitialized = async () => {
    await bridge.sendToolInput({ arguments: args });
    await bridge.sendToolResult(result as never);
    record.ready = true;
  };
  bridge.onsizechange = ({ height }) => { if (height && !proxy.classList.contains('fullscreen')) { proxy.style.height = `${height}px`; record.sizes.push(height); } };
  bridge.onopenlink = async ({ url }) => { record.links.push(url); return {}; };
  bridge.onmessage = async ({ content }) => { record.messages.push(content.map(block => 'text' in block ? block.text : '').join('')); return {}; };
  bridge.onrequestdisplaymode = async ({ mode }) => {
    const applied = available.includes(mode) ? mode : 'inline';
    record.modes.push(applied);
    proxy.classList.toggle('fullscreen',applied === 'fullscreen');
    proxy.style.height = applied === 'fullscreen' ? '' : `${record.sizes.at(-1) ?? 200}px`;
    bridge.setHostContext(context(applied));
    void bridge.sendHostContextChange({ displayMode: applied,containerDimensions: context(applied).containerDimensions });
    return { mode: applied };
  };
  bridge.onreadresource = async ({ uri: read }) => { record.reads.push(read); return rpc('resources/read',{ uri: read }); };
  bridge.oncalltool = async call => { record.calls.push(call.name); return rpc('tools/call',call); };
  // ChatGPT's own globals (the shim) reach us as plain messages through the proxy.
  addEventListener('message',event => {
    if (event.source !== proxy.contentWindow) return;
    if (event.data?.method === 'harness/open-external') record.links.push(event.data.params.href);
    if (event.data?.method === 'harness/follow-up') record.messages.push(event.data.params.prompt);
  });
  await bridge.connect(new PostMessageTransport(proxy.contentWindow!,proxy.contentWindow!));
}
main().catch(error => { record.error = String(error); console.error(error); });
