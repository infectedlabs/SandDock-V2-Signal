import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export const metadata = {
  title: 'Articles - Sanddock',
  description: 'Learn about crypto trading signals, strategies, and tools.',
};

async function getArticles() {
  const articles = {
    learn: [],
    compare: [],
    alternatives: [],
  };

  const categories = ['learn', 'compare', 'alternatives'];

  categories.forEach((category) => {
    const dir = path.join(process.cwd(), 'content', category);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        if (file.endsWith('.md')) {
          const slug = file.replace(/\.md$/, '');
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          // Extract title from markdown (first H1)
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');

          // Extract first paragraph as summary, skip frontmatter and headings
          let summary = '';
          const lines = content.split('\n');
          let inFrontmatter = false;
          for (const line of lines) {
            if (line.trim() === '---') {
              inFrontmatter = !inFrontmatter;
              continue;
            }
            if (inFrontmatter) continue;
            if (line.trim().startsWith('#')) continue;
            if (line.trim().length > 0 && !line.trim().startsWith('>') && !line.trim().startsWith('-') && !line.trim().startsWith('*')) {
              summary = line.trim().slice(0, 150);
              if (summary.length === 150) summary += '...';
              break;
            }
          }

          articles[category].push({ slug, title, summary });
        }
      });
    }
  });

  return articles;
}

const categoryLabels = {
  learn: { label: 'Learn', color: 'bg-blue-50', labelBg: 'bg-blue-100 text-blue-700' },
  compare: { label: 'Compare', color: 'bg-purple-50', labelBg: 'bg-purple-100 text-purple-700' },
  alternatives: { label: 'Alternatives', color: 'bg-orange-50', labelBg: 'bg-orange-100 text-orange-700' },
};

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen bg-white text-black font-satoshi">
      {/* Header */}
      <div className="border-b border-black bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter text-black font-satoshi mb-3">
            Articles & Guides
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Master crypto trading with our comprehensive guides on signals, strategies, and tools.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="space-y-20">
          {Object.entries(articles).map(([category, items]) => {
            if (items.length === 0) return null;
            const { label, color, labelBg } = categoryLabels[category];

            return (
              <section key={category} className="border-b border-black pb-16 last:border-b-0">
                <div className="mb-8">
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-none ${labelBg} uppercase tracking-widest mb-4`}>
                    {label}
                  </span>
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-black font-satoshi">
                    {label === 'Learn' && 'Learning Resources'}
                    {label === 'Compare' && 'Comparison Guides'}
                    {label === 'Alternatives' && 'Tool Reviews'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/articles/${article.slug}`}
                      className="group border border-black rounded-none p-6 hover:bg-black hover:text-white transition-colors"
                    >
                      <div className="space-y-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase tracking-widest group-hover:border-white ${
                          category === 'learn' ? 'border-blue-400 text-blue-600 group-hover:border-white group-hover:text-white' :
                          category === 'compare' ? 'border-purple-400 text-purple-600 group-hover:border-white group-hover:text-white' :
                          'border-orange-400 text-orange-600 group-hover:border-white group-hover:text-white'
                        }`}>
                          {label}
                        </span>
                        <h3 className="text-lg font-bold uppercase tracking-tight text-black group-hover:text-white transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-text-secondary group-hover:text-white/70 transition-colors leading-relaxed">
                          {article.summary}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-black group-hover:border-white transition-colors">
                        <span className="text-xs font-bold uppercase tracking-widest text-black group-hover:text-white transition-colors">
                          Read More &rarr;
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
