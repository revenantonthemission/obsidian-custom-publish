import fs from "node:fs";
import path from "node:path";
import type { PostMeta, GraphData } from "./types";

const CONTENT_DIR = path.resolve("../content");

// Module-level caches to avoid redundant filesystem reads during SSG builds
let _allPostMeta: PostMeta[] | null = null;
let _graph: GraphData | null = null;

export function getAllPostMeta(): PostMeta[] {
  if (_allPostMeta) return _allPostMeta;

  const metaDir = path.join(CONTENT_DIR, "meta");
  if (!fs.existsSync(metaDir)) return [];

  _allPostMeta = fs
    .readdirSync(metaDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(metaDir, f), "utf-8");
      return JSON.parse(raw) as PostMeta;
    })
    .sort((a, b) => {
      if (!a.published) return 1;
      if (!b.published) return -1;
      return b.published.localeCompare(a.published);
    });
  return _allPostMeta;
}

export function getPostMeta(slug: string): PostMeta | null {
  const filePath = path.join(CONTENT_DIR, "meta", `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getPostContent(slug: string): string {
  const filePath = path.join(CONTENT_DIR, "posts", `${slug}.md`);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

export function getGraph(): GraphData {
  if (_graph) return _graph;

  const filePath = path.join(CONTENT_DIR, "graph.json");
  if (!fs.existsSync(filePath)) return { nodes: [], edges: [] };
  _graph = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return _graph;
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
  const edges = full.edges.filter(
    (e) => slugSet.has(e.source) && slugSet.has(e.target)
  );
  return { nodes, edges };
}

export function getHubs(): PostMeta[] {
  return getAllPostMeta().filter((p) => p.is_hub);
}

/** Sanitize a tag for use as a URL path segment. */
export function sanitizeTag(tag: string): string {
  return tag.replace(/\//g, "-").replace(/\s+/g, "-").toLowerCase();
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
