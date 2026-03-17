use std::collections::HashMap;
use std::sync::LazyLock;

use lindera::dictionary::DictionaryKind;
use lindera::mode::Mode;
use lindera::segmenter::Segmenter;
use lindera::tokenizer::Tokenizer;
use regex::Regex;
use serde::Serialize;

use crate::types::VaultIndex;

static HTML_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

#[derive(Debug, Serialize)]
pub struct SearchIndex {
    pub documents: Vec<SearchDocument>,
    pub inverted_index: HashMap<String, Vec<SearchHit>>,
}

#[derive(Debug, Serialize)]
pub struct SearchDocument {
    pub slug: String,
    pub title: String,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchHit {
    pub doc_idx: usize,
    pub count: usize,
}

/// Build a full-text search index from all posts in the vault.
///
/// Uses lindera with the Korean MeCab dictionary for morphological tokenization,
/// which correctly segments Korean text that has no spaces between morphemes.
pub fn build_search_index(index: &VaultIndex) -> SearchIndex {
    let tokenizer = build_tokenizer();

    let mut documents = Vec::with_capacity(index.posts.len());
    let mut inverted_index: HashMap<String, Vec<SearchHit>> = HashMap::new();

    for (doc_idx, post) in index.posts.iter().enumerate() {
        let plain_text = strip_markdown(&post.raw_content);
        let snippet = make_snippet(&plain_text, 200);

        documents.push(SearchDocument {
            slug: post.slug.clone(),
            title: post.title.clone(),
            snippet,
        });

        // Tokenize and build inverted index
        let tokens = tokenize_text(&tokenizer, &plain_text);

        // Also tokenize the title with higher implicit weight (by including it)
        let title_tokens = tokenize_text(&tokenizer, &post.title);

        let mut token_counts: HashMap<String, usize> = HashMap::new();

        // Title tokens count double (boosted)
        for token in &title_tokens {
            *token_counts.entry(token.clone()).or_default() += 2;
        }

        for token in &tokens {
            *token_counts.entry(token.clone()).or_default() += 1;
        }

        for (token, count) in token_counts {
            inverted_index
                .entry(token)
                .or_default()
                .push(SearchHit { doc_idx, count });
        }
    }

    SearchIndex {
        documents,
        inverted_index,
    }
}

/// Create a lindera tokenizer with the Korean dictionary.
fn build_tokenizer() -> Tokenizer {
    let dictionary = lindera::dictionary::load_embedded_dictionary(DictionaryKind::KoDic)
        .expect("failed to load Korean dictionary");
    let segmenter = Segmenter::new(Mode::Normal, dictionary, None);
    Tokenizer::new(segmenter)
}

/// Tokenize text into a vec of normalized token strings.
/// Filters out tokens shorter than 2 characters (particles, punctuation).
fn tokenize_text(tokenizer: &Tokenizer, text: &str) -> Vec<String> {
    let tokens = tokenizer.tokenize(text).unwrap_or_default();
    tokens
        .into_iter()
        .map(|t| t.surface.to_lowercase())
        .filter(|t: &String| t.chars().count() >= 2)
        .filter(|t: &String| !t.chars().all(|c| c.is_ascii_punctuation() || c.is_whitespace()))
        .collect()
}

/// Strip markdown syntax to produce plain text for indexing.
fn strip_markdown(content: &str) -> String {
    // 1. Remove YAML frontmatter
    let content = if content.starts_with("---") {
        if let Some(end) = content[3..].find("\n---") {
            &content[3 + end + 4..]
        } else {
            content
        }
    } else {
        content
    };

    let mut result = Vec::new();
    let mut in_code_fence = false;

    for line in content.lines() {
        // 2. Track and skip fenced code blocks entirely
        if line.starts_with("```") {
            in_code_fence = !in_code_fence;
            continue;
        }
        if in_code_fence {
            continue;
        }

        // 3. Skip horizontal rules (---, ***, ___)
        let trimmed = line.trim();
        if (trimmed.starts_with("---") || trimmed.starts_with("***") || trimmed.starts_with("___"))
            && trimmed.chars().all(|c| c == '-' || c == '*' || c == '_' || c == ' ')
            && trimmed.len() >= 3
        {
            continue;
        }

        // 4. Strip heading markers but keep text
        let line = if trimmed.starts_with('#') {
            trimmed.trim_start_matches('#').trim_start()
        } else {
            line
        };

        // 5. Strip HTML tags (callout divs, anchors, etc.)
        let line = HTML_TAG_RE.replace_all(line, "");

        // 6. Strip inline markdown
        let line = line
            .replace("**", "")
            .replace('*', "")
            .replace('`', "")
            .replace("![[", "")
            .replace("[[", "")
            .replace("]]", "");

        result.push(line);
    }

    result.join("\n")
}

/// Take the first `max_chars` characters as a snippet.
fn make_snippet(text: &str, max_chars: usize) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= max_chars {
        trimmed.to_string()
    } else {
        let mut s: String = trimmed.chars().take(max_chars).collect();
        s.push_str("...");
        s
    }
}
