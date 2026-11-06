import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPostMeta, getPreviewSummary } from '../lib/data';
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/site';

export function GET(context: APIContext) {
  const posts = getAllPostMeta().filter(
    (p): p is typeof p & { published: string } => !!p.published
  );

  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    customData: '<language>ko-KR</language>',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.published),
      link: `/posts/${post.slug}/`,
      description: getPreviewSummary(post.slug) || `${post.title} — ${post.tags.join(', ')}`,
      categories: post.tags,
    })),
  });
}
