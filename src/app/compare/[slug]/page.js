import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { parseMarkdownFile } from '@/lib/markdown';
import ArticleRenderer from '@/components/ArticleRenderer';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const filePath = path.join(process.cwd(), 'content/compare', `${slug}.md`);
  const article = parseMarkdownFile(filePath);

  if (!article) {
    return {
      title: 'Page Not Found | Sanddock',
    };
  }

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.meta_description,
    alternates: {
      canonical: `/compare/${slug}`,
    },
    openGraph: {
      title: article.frontmatter.title,
      description: article.frontmatter.meta_description,
      type: 'article',
      url: `/compare/${slug}`,
    }
  };
}

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), 'content/compare');
  if (!fs.existsSync(dir)) return [];
  
  const files = fs.readdirSync(dir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      slug: f.replace(/\.md$/, ''),
    }));
}

export default async function CompareArticlePage({ params }) {
  const { slug } = await params;
  const filePath = path.join(process.cwd(), 'content/compare', `${slug}.md`);
  const article = parseMarkdownFile(filePath);

  if (!article) {
    notFound();
  }

  article.slug = slug;

  return (
    <>
      {article.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema) }}
        />
      )}
      <ArticleRenderer article={article} category="compare" />
    </>
  );
}
