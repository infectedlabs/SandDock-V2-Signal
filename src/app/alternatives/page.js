import fs from 'fs';
import path from 'path';
import { parseMarkdownFile } from '@/lib/markdown';

export const metadata = {
  title: 'Top Competitor Alternatives & Reviews | Sanddock Crypto',
  description: 'Detailed, honest reviews of alternative crypto bots and signal platforms. Contrast pricing plans, usage caps, and cancellation rules.',
};

function getArticles() {
  const dir = path.join(process.cwd(), 'content/alternatives');
  if (!fs.existsSync(dir)) return [];
  
  const files = fs.readdirSync(dir);
  const articles = files
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const slug = f.replace(/\.md$/, '');
      const parsed = parseMarkdownFile(path.join(dir, f));
      return {
        slug,
        frontmatter: parsed?.frontmatter || {},
      };
    })
    .sort((a, b) => new Date(b.frontmatter.last_updated) - new Date(a.frontmatter.last_updated));
    
  return articles;
}

export default function AlternativesIndexPage() {
  const articles = getArticles();

  return (
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">
                Sanddock
              </span>
            </a>
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-black">
            <a href="/#how-it-works" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Pricing</a>
            <a href="/learn" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Learn</a>
            <a href="/compare" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Compare</a>
          </nav>

          <div className="flex items-center h-16 border-l border-black relative">
            <a 
              href="/signup"
              className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
            >
              Start Free &rarr;
            </a>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-black bg-zinc-50 py-16 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-[#ff5722] mb-3">Honest Competitor Reviews</div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-sans tracking-tight text-black leading-tight max-w-4xl">
            Evaluate Alternative Solutions
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-600 max-w-2xl font-medium leading-relaxed">
            Unpack hidden fees, complex API configurations, and billing issues from popular bot tools to see where a simplified signal-first platform fits.
          </p>
        </div>
      </section>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <a 
              key={article.slug}
              href={`/alternatives/${article.slug}`}
              className="flex flex-col border border-black rounded-lg bg-white overflow-hidden p-6 group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
            >
              <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider mb-3">
                Alternative Review
              </div>
              <h3 className="text-xl font-bold tracking-tight text-black group-hover:text-[#ff5722] transition-colors mb-3 leading-snug">
                {article.frontmatter.title}
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6 flex-grow">
                {article.frontmatter.meta_description}
              </p>
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-mono text-zinc-500">
                <span>By {article.frontmatter.author || 'Sanddock Team'}</span>
                <span className="font-bold text-black group-hover:translate-x-1 transition-transform duration-200">Read &rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black bg-zinc-50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold tracking-tighter uppercase font-sans text-black">
              Sanddock &copy; 2026
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
            <a href="/" className="hover:text-black">Home</a>
            <a href="/pricing" className="hover:text-black">Pricing</a>
            <a href="/learn" className="hover:text-black">Learn</a>
            <a href="/compare" className="hover:text-black">Compare</a>
            <a href="/#faq" className="hover:text-black">FAQ</a>
            <a href="/contact" className="hover:text-black">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
