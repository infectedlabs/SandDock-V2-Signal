import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export async function generateStaticParams() {
  // We can generate static params for any files in learn, compare, and alternatives
  const params = [];
  const searchDirs = ['learn', 'compare', 'alternatives'];
  
  searchDirs.forEach(sub => {
    const dir = path.join(process.cwd(), 'content', sub);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        if (f.endsWith('.md')) {
          params.push({ slug: f.replace(/\.md$/, '') });
        }
      });
    }
  });

  return params;
}

export default async function ArticlesRedirectPage({ params }) {
  const { slug } = await params;
  
  const learnPath = path.join(process.cwd(), 'content/learn', `${slug}.md`);
  if (fs.existsSync(learnPath)) {
    redirect(`/learn/${slug}`);
  }
  
  const comparePath = path.join(process.cwd(), 'content/compare', `${slug}.md`);
  if (fs.existsSync(comparePath)) {
    redirect(`/compare/${slug}`);
  }
  
  const alternativesPath = path.join(process.cwd(), 'content/alternatives', `${slug}.md`);
  if (fs.existsSync(alternativesPath)) {
    redirect(`/alternatives/${slug}`);
  }
  
  // Default fallback if not found
  redirect('/learn');
}
