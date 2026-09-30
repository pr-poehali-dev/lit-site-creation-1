import { Fragment, type ReactNode } from 'react';

const TOKEN_RE = /\[color:([^\]]+)\]([\s\S]*?)\[\/color\]|\*\*([^*]+?)\*\*|\*([^*]+?)\*/g;

let keyCounter = 0;

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={keyCounter++}>{text.slice(lastIndex, match.index)}</Fragment>);
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
    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={keyCounter++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

export function renderFormattedBody(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line === '') return <br key={i} />;
    return (
      <p key={i} className="font-medium mb-0">
        {renderInline(line)}
      </p>
    );
  });
}
