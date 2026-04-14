// Types matching the Rust preprocessor's JSON output

export interface PostMeta {
  slug: string;
  title: string;
  tags: string[];
  published: string | null;
  updated: string | null;
  backlinks: string[];
  forward_links: string[];
  is_hub: boolean;
  hub_parent: string | null;
  description: string | null;
  reading_time_min: number;
  word_count: number;
  related_posts?: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  slug: string;
  title: string;
  tags: string[];
  is_hub: boolean;
  backlink_count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface SearchIndex {
  documents: SearchDocument[];
  inverted_index: Record<string, SearchHit[]>;
}

export interface SearchDocument {
  slug: string;
  title: string;
  snippet: string;
}

export interface SearchHit {
  doc_idx: number;
  count: number;
}

export interface NavTreeNode {
  slug: string;
  title: string;
  is_hub: boolean;
  children: NavTreeNode[];
}

export interface NavTreeData {
  roots: NavTreeNode[];
  orphans: NavTreeNode[];
}
