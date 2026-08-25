#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
// ponytail: width is glyph-count * CELL, so a face wider than 0.6em clips; fix is a real text shaper.
const CELL = 8.4;
const LINE = 22;
const PAD = 26;
const BAR = 38;

const COLOR = {
  bg: '#0d1117',
  panel: '#161b22',
  edge: '#30363d',
  head: '#e6edf3',
  dim: '#7d8590',
  text: '#c9d1d9',
  good: '#3fb950',
  warn: '#d29922',
  cool: '#58a6ff',
};

function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// SVG collapses runs of spaces, so alignment is held by non-breaking spaces of the same width.
function cells(text) {
  return escape(text).replace(/ /g, '\u00a0');
}

// A quote in a label would close the attribute early and break the whole file.
function attr(text) {
  return escape(text).replace(/"/g, '&quot;');
}

const ENV = { ...process.env, TZ: 'UTC' };

const DEMO_FILE = 'scripts/demo-correlation.ts';

// The correlation demo is real output from the actual formatter, not a hand-typed log line.
function correlationDump() {
  const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/.bin/ts-node'), DEMO_FILE], {
    cwd: ROOT,
    encoding: 'utf8',
    env: ENV,
  });
  return out.replace(/\n+$/, '').split('\n');
}

// Filtered to the two summary lines: version, start time and duration change between runs.
function testSummary() {
  const out = execFileSync(process.execPath, [join(ROOT, 'node_modules/.bin/vitest'), 'run'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: ENV,
  });
  return out
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => /^\s*(Test Files|Tests)\s/.test(line));
}

// A blank or changed capture must fail the build, not quietly redraw the picture.
function must(lines, expected) {
  for (const want of expected) {
    if (!lines.some((line) => want.test(line))) {
      throw new Error(`${want} is missing from the captured output:\n${lines.join('\n')}`);
    }
  }
  return lines;
}

function colorOf(line) {
  if (line.startsWith('$ ')) return COLOR.good;
  if (/passed/.test(line)) return COLOR.good;
  if (/"trace_id"|"span_id"|"trace_flags"/.test(line)) return COLOR.cool;
  return COLOR.text;
}

function spans(line) {
  if (line.startsWith('$ ')) {
    return `<tspan fill="${COLOR.good}">$&#160;</tspan><tspan fill="${COLOR.head}">${cells(line.slice(2))}</tspan>`;
  }
  return `<tspan fill="${colorOf(line)}">${cells(line)}</tspan>`;
}

function frame(width, height, title) {
  const dots = ['#ff5f57', '#febc2e', '#28c840']
    .map((fill, i) => `<circle cx="${20 + i * 18}" cy="19" r="6" fill="${fill}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${attr(title)}">
  <rect width="${width}" height="${height}" rx="10" fill="${COLOR.bg}" stroke="${COLOR.edge}"/>
  <path d="M0 10a10 10 0 0 1 10-10h${width - 20}a10 10 0 0 1 10 10v28H0z" fill="${COLOR.panel}"/>
  ${dots}
  <text x="${PAD + 48}" y="23" font-family="${MONO}" font-size="12" fill="${COLOR.dim}">${escape(title)}</text>`;
}

function demo(lines, title) {
  const width = Math.round(Math.max(...lines.map((l) => l.length), title.length + 24) * CELL + PAD * 2);
  const height = BAR + lines.length * LINE + PAD;
  const rows = lines
    .map((line, i) => `<text x="${PAD}" y="${BAR + 16 + i * LINE}" font-family="${MONO}" font-size="14" font-weight="500">${spans(line)}</text>`)
    .join('\n  ');
  return `${frame(width, height, title)}
  ${rows}
</svg>
`;
}

function tileText(passing) {
  return [
    ['CORRELATION', 'trace_id', 'in every log line'],
    ['BOOT ORDER', 'first import', 'before instrumentation'],
    ['SHUTDOWN', '10s cap', 'drains spans first'],
    ['TESTS', `${passing} pass`, 'offline, no collector'],
  ];
}

function glance(passing) {
  const TILES = tileText(passing);
  // 195px tile holds 24 glyphs at font-size 12, 14 at font-size 16.
  for (const [, big, small] of TILES) {
    if (small.length > 24 || big.length > 14) throw new Error(`tile text too long: ${big} / ${small}`);
  }
  const width = 880;
  const height = 150;
  const tiles = TILES.map(([role, big, small], i) => {
    const x = 20 + i * 215;
    return `<rect x="${x}" y="30" width="195" height="96" rx="8" fill="${COLOR.panel}" stroke="${COLOR.edge}"/>
    <text x="${x + 16}" y="56" fill="${COLOR.dim}" font-size="11" letter-spacing="1" font-family="${MONO}">${escape(role)}</text>
    <text x="${x + 16}" y="82" fill="${COLOR.head}" font-size="16" font-weight="600" font-family="${MONO}">${cells(big)}</text>
    <text x="${x + 16}" y="106" fill="${COLOR.dim}" font-size="12" font-family="${MONO}">${cells(small)}</text>`;
  }).join('\n    ');
  const label = `otel-sdk-node at a glance: trace_id injected into every log line, first import wins the auto-instrumentation race, shutdown caps the drain at 10 seconds, ${passing} tests pass with no collector running`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${attr(label)}">
  <rect width="${width}" height="${height}" rx="10" fill="${COLOR.bg}" stroke="${COLOR.edge}"/>
  <g>
  ${tiles}
  </g>
</svg>
`;
}

const dump = must(correlationDump(), [/"trace_id"/, /"span_id"/, /"trace_flags"/]);
const summary = must(testSummary(), [/Test Files\s+\d+ passed/, /Tests\s+\d+ passed/]);
const passing = summary.join('\n').match(/Tests\s+(\d+) passed/)[1];
const demoLines = [`$ ts-node ${DEMO_FILE}`, ...dump, '', '$ npm test', ...summary];

mkdirSync(join(ROOT, 'assets'), { recursive: true });
for (const [name, markup] of [
  ['glance.svg', glance(passing)],
  ['demo.svg', demo(demoLines, 'proof it runs, offline')],
]) {
  writeFileSync(join(ROOT, 'assets', name), markup);
  process.stdout.write(`wrote assets/${name}\n`);
}
