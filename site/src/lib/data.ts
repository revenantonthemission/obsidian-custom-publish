import fs from "node:fs";
import path from "node:path";
import type { PostMeta, GraphData } from "./types";

const CONTENT_DIR = path.resolve("../content");

export function getAllPostMeta(): PostMeta[] {
  const metaDir = path.join(CONTENT_DIR, "meta");
  if (!fs.existsSync(metaDir)) return [];

  return fs
    .readdirSync(metaDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(metaDir, f), "utf-8");
      return JSON.parse(raw) as PostMeta;
    })
    .sort((a, b) => {
      // Sort by published date descending, nulls last
      if (!a.published) return 1;
      if (!b.published) return -1;
      return b.published.localeCompare(a.published);
    });
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
  const filePath = path.join(CONTENT_DIR, "graph.json");
  if (!fs.existsSync(filePath)) return { nodes: [], edges: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
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
