import React from 'react';
import { Text } from 'react-native';

export default function HighlightedText({ text = '', query = '', style, highlightStyle }) {
  if (!query) return <Text style={style}>{text}</Text>;
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return <Text style={style}>{text}</Text>;

  const lower = (text || '').toLowerCase();
  const parts = [];
  let i = 0;
  while (i < (text || '').length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      parts.push({ t: (text || '').slice(i), h: false });
      break;
    }
    if (idx > i) parts.push({ t: (text || '').slice(i, idx), h: false });
    parts.push({ t: (text || '').slice(idx, idx + needle.length), h: true });
    i = idx + needle.length;
  }

  return (
    <Text style={style}>
      {parts.map((p, k) => (p.h ? (
        <Text key={k} style={highlightStyle}>{p.t}</Text>
      ) : (
        <Text key={k}>{p.t}</Text>
      )))}
    </Text>
  );
}

