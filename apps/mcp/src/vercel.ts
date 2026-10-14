// The Vercel Function (Build Output API: .vercel/output/functions/mcp.func, bundled by scripts/build.ts).
import widgetHtml from '../dist/widget.html';
import { buildReader } from './builds';
import { siteFrom } from './config';
import { createHttpHandler } from './http';
import { nodeHandler } from './node';

const site = siteFrom();
export default nodeHandler(createHttpHandler({ site,widgetHtml,readBuild: buildReader(site) }),{ behindProxy: true });
