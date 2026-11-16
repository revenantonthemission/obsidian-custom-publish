import fs from 'node:fs';
import path from 'node:path';
import type { PostMeta, GraphData } from './types';

const CONTENT_DIR = path.resolve('../content');

// Module-level caches to avoid redundant filesystem reads during SSG builds
let _allPostMeta: PostMeta[] | null = null;
let _graph: GraphData | null = null;
let _previews: Record<string, { title: string; tags: string[]; summary: string }> | null = null;

/**
 * Every post's metadata, newest first. `contentDir` is a test seam (U2 plan
 * Step 3); pages always use the default, which is the only one cached.
 *
 * Fails closed with WR001 (NFR5.19) rather than rendering a silently empty or
 * partial site: the preprocessor's `manifest.json` must exist, and the
 * `meta/*.json` files on disk must be exactly the manifest's `meta/` entries.
 * A genuinely empty site (no meta entries in the manifest) returns [].
 */
export function getAllPostMeta(contentDir: string = CONTENT_DIR): PostMeta[] {
  const isDefault = contentDir === CONTENT_DIR;
  if (isDefault && _allPostMeta) return _allPostMeta;

  const entries = readPostMeta(contentDir);
  if (isDefault) _allPostMeta = entries;
  return entries;
}

function readPostMeta(contentDir: string): PostMeta[] {
  const metaDir = path.join(contentDir, 'meta');
  const metaFiles = checkedMetaFiles(contentDir, metaDir);
  return metaFiles
    .map((f) => {
      const raw = fs.readFileSync(path.join(metaDir, f), 'utf-8');
      return JSON.parse(raw) as PostMeta;
    })
    .sort((a, b) => {
      if (!a.published) return 1;
      if (!b.published) return -1;
      return b.published.localeCompare(a.published);
    });
}

/** The meta file names, after WR001 has checked them against the manifest. */
function checkedMetaFiles(contentDir: string, metaDir: string): string[] {
  const manifestPath = path.join(contentDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`WR001 ${manifestPath}: content manifest missing — run the preprocessor`);
  }
  const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (!Array.isArray(manifest) || !manifest.every((entry) => typeof entry === 'string')) {
    throw new Error(`WR001 ${manifestPath}: content manifest is not a list of paths`);
  }
  const expected = manifest
    .filter((entry: string) => /^meta\/[^/]+\.json$/.test(entry))
    .map((entry: string) => entry.slice('meta/'.length))
    .sort();
  const onDisk = fs.existsSync(metaDir)
    ? fs
        .readdirSync(metaDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
    : [];
  if (expected.length !== onDisk.length || expected.some((name, i) => name !== onDisk[i])) {
    throw new Error(`WR001 ${metaDir}: meta files differ from manifest`);
  }
  return onDisk;
}

export function getPostMeta(slug: string): PostMeta | null {
  const filePath = path.join(CONTENT_DIR, 'meta', `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function getPostContent(slug: string): string {
  const filePath = path.join(CONTENT_DIR, 'posts', `${slug}.md`);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

export function getGraph(): GraphData {
  if (_graph) return _graph;

  const filePath = path.join(CONTENT_DIR, 'graph.json');
  if (!fs.existsSync(filePath)) return { nodes: [], edges: [] };
  _graph = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return _graph ?? { nodes: [], edges: [] };
}

/** Get the 2-hop neighborhood subgraph for a given post slug. */
export function getLocalGraph(slug: string): GraphData {
  const full = getGraph();
  const adj = new Map<string, Set<string>>();
  for (const e of full.edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const nearby = new Set<string>([slug]);
  for (const n of adj.get(slug) || []) nearby.add(n);
  const hop1 = [...nearby];
  for (const n of hop1) {
    for (const m of adj.get(n) || []) nearby.add(m);
  }

  const nodes = full.nodes.filter((n) => nearby.has(n.slug));
  const slugSet = new Set(nodes.map((n) => n.slug));
  const edges = full.edges.filter((e) => slugSet.has(e.source) && slugSet.has(e.target));
  return { nodes, edges };
}

export function getHubs(): PostMeta[] {
  return getAllPostMeta().filter((p) => p.is_hub);
}

/**
 * Every post that is not a hub, in the shared (newest first) order. Frozen,
 * so a caller cannot reorder the list another page reads (U1 FD R-major:
 * ordinary posts and hubs are exposed separately; BR6.5).
 */
export function getOrdinaryPosts(): readonly PostMeta[] {
  return Object.freeze(getAllPostMeta().filter((p) => !p.is_hub));
}

/** Sanitize a tag for use as a URL path segment. */
export function sanitizeTag(tag: string): string {
  return tag.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
}

export function getTagIndex(): Record<string, PostMeta[]> {
  const all = getAllPostMeta();
  const index: Record<string, PostMeta[]> = {};
  for (const post of all) {
    for (const tag of post.tags) {
      const safe = sanitizeTag(tag);
      if (!index[safe]) index[safe] = [];
      index[safe].push(post);
    }
  }
  return index;
}

/** Format an ISO date string (e.g. "2024-03-15") to Korean locale (e.g. "2024년 3월 15일"). */
export function formatDateKo(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

/** Load previews.json (slug → {title, tags, summary}) for post card summaries. */
export function getPreviewSummary(slug: string): string {
  if (!_previews) {
    const filePath = path.resolve('public/previews.json');
    if (!fs.existsSync(filePath)) return '';
    _previews = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return _previews?.[slug]?.summary ?? '';
}
