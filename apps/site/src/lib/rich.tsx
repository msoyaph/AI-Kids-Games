// Rich text on the page: the FAQ and the guides (the data and markup are in rich-text.ts).
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { INLINE,type Block } from './rich-text';

/** One line of text with its links and bold. Site paths become router links; others leave the site (ExitGuard asks a grown-up). */
export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = []; let last = 0;
  for (const match of text.matchAll(INLINE)) {
    parts.push(text.slice(last,match.index));
    const [, label,href,bold] = match;
    parts.push(bold !== undefined ? <strong key={match.index}>{bold}</strong> : href!.startsWith('/') ? <Link key={match.index} to={href!}>{label}</Link> : <a key={match.index} href={href}>{label}</a>);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((part,index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

export function Blocks({ blocks,headingId }: { blocks: Block[]; headingId?: (text: string) => string }) {
  return <>{blocks.map((block,index) => 'p' in block ? <p key={index}><Inline text={block.p} /></p>
    : 'h' in block ? <h2 key={index} id={headingId?.(block.h)} className="heading"><Inline text={block.h} /></h2>
    : 'ul' in block ? <ul key={index}>{block.ul.map(item => <li key={item}><Inline text={item} /></li>)}</ul>
    : <ol key={index}>{block.ol.map(item => <li key={item}><Inline text={item} /></li>)}</ol>)}</>;
}
