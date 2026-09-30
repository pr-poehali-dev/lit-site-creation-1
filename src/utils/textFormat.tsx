import { Fragment, type ReactNode } from 'react';

function createTokenRe() {
  return /\[color:([^\]]+)\]([\s\S]*?)\[\/color\]|\*\*([^*]+?)\*\*|\*([^*]+?)\*/g;
}

let keyCounter = 0;

function textWithBreaks(str: string): ReactNode[] {
  const parts = str.split('\n');
  const out: ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (idx > 0) out.push(<br key={keyCounter++} />);
    if (part) out.push(<Fragment key={keyCounter++}>{part}</Fragment>);
  });
  return out;
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const tokenRe = createTokenRe();
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...textWithBreaks(text.slice(lastIndex, match.index)));
    }
    const [, colorValue, colorContent, boldContent, italicContent] = match;
    if (colorValue !== undefined) {
      nodes.push(
        <span key={keyCounter++} style={{ color: colorValue }}>
          {renderInline(colorContent)}
        </span>
      );
    } else if (boldContent !== undefined) {
      nodes.push(<strong key={keyCounter++}>{renderInline(boldContent)}</strong>);
    } else if (italicContent !== undefined) {
      nodes.push(<em key={keyCounter++}>{renderInline(italicContent)}</em>);
    }
    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(...textWithBreaks(text.slice(lastIndex)));
  }

  return nodes;
}

export function renderFormattedBody(text: string): ReactNode[] {
  return renderInline(text);
}