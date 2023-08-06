import matter from "gray-matter"
import ellipsize from 'ellipsize'
import removeMd from 'remove-markdown'
import { fromJSON } from "postcss"

export interface PostMetaData {
  slug?: string,
  description?: string
  toc?: boolean
  lang?: string
  og_image?: string
  cover_image?: string
  title?: string
}

export interface Post {
  slug: string,
  number: number,
  postedAt: Date,
  updatedAt: Date,
  title: string,
  safeTitle: string,
  description: string,
  meta: PostMetaData,
  excerpt: string,
  body: string,
  bodyHTML: string,
}

interface DiscussionData {
  title: string,
  createdAt: string,
  updatedAt: string,
  body: string,
  bodyHTML: string,
  number: number,
  category: {
    id: string
  }
}

export class Discussion {
  constructor(
    public title: string,
    public createdAt: string,
    public updatedAt: string,
    public body: string,
    public bodyHTML: string,
    public number: number,
    public category: {
      id: string
    }) { }

  toPost(): Post {
    const { excerpt, meta, body, plainDescription } = parseDocument(this.body);
    const plainTitle =
      cleanText(meta.title || this.title || '') ||
      ellipsize(cleanText(excerpt || body), 50);
    const postedAt = new Date(this.createdAt);
    const updatedAt = new Date(this.updatedAt);

    let description = plainDescription
    if (description.length < 20) {
      description = plainTitle
        .concat(', posted on ')
        .concat(postedAt.toLocaleDateString('ko-KR', { dateStyle: 'medium' }))
        .concat(' by Azurine')
    }

    const slug = meta.slug || '';
    delete meta.slug;
    return {
      slug: slug,
      number: this.number,
      postedAt,
      updatedAt,
      title: this.title,
      safeTitle: plainTitle,
      description,
      meta,
      excerpt,
      body,
      bodyHTML: this.bodyHTML,
    };
  }

  static from(data:DiscussionData) {
    return Object.setPrototypeOf(data, Discussion.prototype)
  }
}

function parseDocument(document: string) {
  const excerptSeparator = '------';
  const parsed = parseFrontMatter(document, excerptSeparator);

  const meta = mapToPostMetaData(parsed);
  const body = parsed.extractContentBody();

  const excerpt = parsed.getExcerptOrBody();

  const plainDescription =
    meta.description || ellipsize(cleanText(excerpt || body), 160)

  return {
    excerpt,
    meta,
    body,
    plainDescription: plainDescription.trim(),
  }
}

function cleanText(text: string) {
  let cleaned = removeMd(text, { useImgAltText: false })
  cleaned = cleaned.replace(/(?:https?):\/\/[\n\S]+/gi, '') // remove stray links (embeds)
  cleaned = cleaned.replace(/(?:\r\n|\r|\n)/g, ' ') // remove newlines

  return cleaned
}

function mapToPostMetaData(parsed: matter.GrayMatterFile<string>) {
  const meta = {
    lang: 'ko_KR',
    ...(parsed.data as PostMetaData),
  };

  // define default
  meta.toc = meta.toc || true;

  return meta;
}

function parseFrontMatter(document: string, excerptSeparator: string) {
  const parsed = matter(document, {
    excerpt: true,
    excerpt_separator: excerptSeparator,
    delimiters: '~~~',
  })
  return Object.assign(parsed, {
    extractContentBody: () => parsed.content.split(excerptSeparator).at(-1)?.trim() || '',
    extractFirstSentence: function () { return this.extractContentBody().replace(/^#+ (.*$)/gim, '').split('\r\n\r\n').filter(Boolean)[0]; },
    getExcerptOrBody: function () { return (parsed.excerpt || this.extractFirstSentence()).trim(); }
  })
}
