// Rich text for the FAQ and the guides, kept as plain data so the same words become the page
// (components in rich.tsx), the structured data and llms-full.txt.
// Inline markup: [text](/path or https://…) and **bold**.
export type Block = { p: string } | { h: string } | { ul: string[] } | { ol: string[] };

export const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** The words without markup (structured data). Links keep their text. */
export const plain = (text: string) => text.replace(INLINE,(_match,label: string | undefined,_href,bold: string | undefined) => bold ?? label ?? '');

/** Markdown (llms-full.txt): site links become absolute. */
export const markdown = (text: string,origin: string) => text.replace(/\]\((\/[^)\s]*)\)/g,(_match,path: string) => `](${origin}${path})`);

export function blocksToText(blocks: Block[],line: (text: string) => string = plain): string {
  return blocks.map(block => 'p' in block ? line(block.p) : 'h' in block ? line(block.h) : 'ul' in block ? block.ul.map(item => `- ${line(item)}`).join('\n') : block.ol.map((item,index) => `${index+1}. ${line(item)}`).join('\n')).join('\n\n');
}
