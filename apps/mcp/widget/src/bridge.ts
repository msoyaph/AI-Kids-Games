// The view's side of MCP Apps (spec 2026-01-26): JSON-RPC 2.0 over postMessage with the host.
// The official App class brings the MCP client and zod (~400 KB) for a dozen messages, so this is a
// small typed version; the harness (tests/e2e) runs it against the official host bridge, AppBridge.
type Message = { jsonrpc: '2.0'; id?: number | string; method?: string; params?: unknown; result?: unknown; error?: { code: number; message: string } };
type Handler = (params: any) => unknown;

export class Bridge {
  private next = 1;
  private waiting = new Map<number | string,{ resolve: (value: any) => void; reject: (error: Error) => void }>();
  private handlers = new Map<string,Handler[]>();
  constructor(private host: Window = window.parent) { addEventListener('message',this.receive); }

  on(method: string,handler: Handler) { this.handlers.set(method,[...(this.handlers.get(method) ?? []),handler]); }
  notify(method: string,params: object = {}) { this.host.postMessage({ jsonrpc: '2.0',method,params },'*'); }
  request<T>(method: string,params: object = {},timeoutMs = 10_000): Promise<T> {
    const id = this.next++;
    return new Promise<T>((resolve,reject) => {
      const timer = setTimeout(() => { this.waiting.delete(id); reject(new Error(`${method} timed out`)); },timeoutMs);
      this.waiting.set(id,{ resolve: value => { clearTimeout(timer); resolve(value); },reject: error => { clearTimeout(timer); reject(error); } });
      this.host.postMessage({ jsonrpc: '2.0',id,method,params },'*');
    });
  }

  private receive = (event: MessageEvent) => {
    if (event.source !== this.host) return;
    const message = event.data as Message;
    if (!message || message.jsonrpc !== '2.0') return;
    if (!message.method) {
      const waiting = message.id === undefined ? undefined : this.waiting.get(message.id);
      if (!waiting) return;
      this.waiting.delete(message.id!);
      if (message.error) waiting.reject(new Error(message.error.message)); else waiting.resolve(message.result);
      return;
    }
    const handlers = this.handlers.get(message.method);
    if (message.id === undefined) { handlers?.forEach(handler => handler(message.params)); return; }
    // A request from the host (ui/resource-teardown, ping): answer it.
    if (!handlers?.length) { this.host.postMessage({ jsonrpc: '2.0',id: message.id,error: { code: -32601,message: `Method not found: ${message.method}` } },'*'); return; }
    let result: unknown = {};
    for (const handler of handlers) result = handler(message.params) ?? result;
    this.host.postMessage({ jsonrpc: '2.0',id: message.id,result },'*');
  };
}
