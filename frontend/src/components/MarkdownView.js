import React from 'react';

const renderInline = (text, keyPrefix) => {
  const parts = [];
  let remaining = text;
  let key = 0;
  const pattern = /(\*\*([^*]+)\*\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match) {
      parts.push(<React.Fragment key={`${keyPrefix}-t-${key++}`}>{remaining}</React.Fragment>);
      break;
    }
    if (match.index > 0) {
      parts.push(
        <React.Fragment key={`${keyPrefix}-t-${key++}`}>
          {remaining.slice(0, match.index)}
        </React.Fragment>
      );
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-b-${key++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${keyPrefix}-i-${key++}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(
        <a
          key={`${keyPrefix}-a-${key++}`}
          href={match[5]}
          className="text-orange-800 hover:text-orange-900 underline"
        >
          {match[4]}
        </a>
      );
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return parts;
};

const MarkdownView = ({ content }) => {
  const lines = content.split('\n');
  const blocks = [];
  let currentList = null;
  let currentPara = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const text = currentPara.join(' ');
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-stone-600 leading-relaxed mb-4">
          {renderInline(text, `p${blocks.length}`)}
        </p>
      );
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-6 mb-4 space-y-2 text-stone-600">
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{renderInline(item, `li${blocks.length}-${idx}`)}</li>
          ))}
        </ul>
      );
      currentList = null;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (line.startsWith('# ')) {
      flushPara();
      flushList();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="font-heading text-4xl font-bold text-stone-900 tracking-tight mb-6">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="font-heading text-2xl font-bold text-stone-900 tracking-tight mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="font-heading text-xl font-semibold text-stone-900 mt-6 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('- ')) {
      flushPara();
      if (!currentList) currentList = [];
      currentList.push(line.slice(2));
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else if (line.startsWith('_') && line.endsWith('_') && line.length > 2) {
      flushPara();
      flushList();
      blocks.push(
        <p key={`em-${blocks.length}`} className="text-stone-500 italic mb-6">
          {line.slice(1, -1)}
        </p>
      );
    } else {
      flushList();
      currentPara.push(line);
    }
  });

  flushPara();
  flushList();

  return <div className="prose-trimit">{blocks}</div>;
};

export default MarkdownView;
