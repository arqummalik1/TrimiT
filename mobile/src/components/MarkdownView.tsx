import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { colors, typography } from '../lib/utils';


interface MarkdownViewProps {
  content: string;
}

type Segment = { type: 'text' | 'bold' | 'italic' | 'link'; text: string; href?: string };

const parseInline = (text: string): Segment[] => {
  const segments: Segment[] = [];
  let remaining = text;
  const pattern = /(\*\*([^*]+)\*\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      segments.push({ type: 'text', text: remaining });
      break;
    }
    if (match.index > 0) {
      segments.push({ type: 'text', text: remaining.slice(0, match.index) });
    }
    if (match[2] !== undefined) {
      segments.push({ type: 'bold', text: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'italic', text: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'link', text: match[4], href: match[5] });
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return segments;
};

const renderSegments = (segments: Segment[], keyPrefix: string) =>
  segments.map((seg, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (seg.type === 'bold') {
      return (
        <Text key={key} style={styles.bold}>
          {seg.text}
        </Text>
      );
    }
    if (seg.type === 'italic') {
      return (
        <Text key={key} style={styles.italic}>
          {seg.text}
        </Text>
      );
    }
    if (seg.type === 'link' && seg.href) {
      const href = seg.href;
      return (
        <Text key={key} style={styles.link} onPress={() => Linking.openURL(href)}>
          {seg.text}
        </Text>
      );
    }
    return <Text key={key}>{seg.text}</Text>;
  });

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: string[] | null = null;
  let currentPara: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const text = currentPara.join(' ');
      blocks.push(
        <Text key={`p-${blocks.length}`} style={styles.paragraph}>
          {renderSegments(parseInline(text), `p${blocks.length}`)}
        </Text>
      );
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const items = currentList;
      blocks.push(
        <View key={`ul-${blocks.length}`} style={styles.list}>
          {items.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listItemText}>
                {renderSegments(parseInline(item), `li${blocks.length}-${idx}`)}
              </Text>
            </View>
          ))}
        </View>
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
        <Text key={`h1-${blocks.length}`} style={styles.h1}>
          {line.slice(2)}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      flushPara();
      flushList();
      blocks.push(
        <Text key={`h2-${blocks.length}`} style={styles.h2}>
          {line.slice(3)}
        </Text>
      );
    } else if (line.startsWith('### ')) {
      flushPara();
      flushList();
      blocks.push(
        <Text key={`h3-${blocks.length}`} style={styles.h3}>
          {line.slice(4)}
        </Text>
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
        <Text key={`em-${blocks.length}`} style={styles.lastUpdated}>
          {line.slice(1, -1)}
        </Text>
      );
    } else {
      flushList();
      currentPara.push(line);
    }
  });

  flushPara();
  flushList();

  return <View>{blocks}</View>;
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: typography.h1.fontFamily,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 10,
    fontFamily: typography.h2.fontFamily,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  list: {
    marginBottom: 12,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    color: colors.textSecondary,
    width: 18,
    lineHeight: 22,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default MarkdownView;
