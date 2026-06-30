const fs = require('fs');
const path = require('path');

// Reference the local parser
const parserPath = 'c:\\Users\\GHURU PRASAATH\\Desktop\\sanddock\\src\\lib\\markdown.js';
const { parseMarkdownFile } = require(parserPath);

const contentDirs = ['learn', 'compare', 'alternatives'];
const workspaceRoot = 'c:\\Users\\GHURU PRASAATH\\Desktop\\sanddock';

let totalFiles = 0;
let failedFiles = 0;
const parsedArticles = [];

contentDirs.forEach(sub => {
  const dirPath = path.join(workspaceRoot, 'content', sub);
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
  console.log(`Checking content/${sub}/ folder: found ${files.length} markdown files.`);

  files.forEach(f => {
    totalFiles++;
    const fullPath = path.join(dirPath, f);
    
    try {
      const article = parseMarkdownFile(fullPath);
      if (!article) {
        console.error(`❌ ${sub}/${f}: Failed to parse markdown file.`);
        failedFiles++;
        return;
      }

      const { frontmatter, html, schema, headings } = article;
      const errors = [];

      // Validate frontmatter fields
      const requiredFields = ['title', 'meta_description', 'slug', 'target_keyword', 'last_updated', 'author'];
      requiredFields.forEach(field => {
        if (!frontmatter[field]) {
          errors.push(`Missing frontmatter field: "${field}"`);
        }
      });

      // Validate slug category matching
      if (frontmatter.slug) {
        if (!frontmatter.slug.startsWith(`/${sub}`)) {
          errors.push(`Slug mismatch: expected starting with "/${sub}", got "${frontmatter.slug}"`);
        }
      }

      // Validate H2 headings
      if (headings.length === 0) {
        errors.push(`No ## headings found in article body.`);
      }

      // Validate Schema
      if (!schema) {
        errors.push(`Missing or unparseable JSON-LD schema block.`);
      } else {
        const graph = schema['@graph'] || [schema];
        const hasArticle = graph.some(item => item['@type'] === 'Article');
        const hasFAQ = graph.some(item => item['@type'] === 'FAQPage');
        if (!hasArticle) errors.push(`Schema does not contain @type: "Article".`);
        if (!hasFAQ) errors.push(`Schema does not contain @type: "FAQPage".`);
      }

      // Validate Placeholders (ignoring the dynamic track record article placeholders)
      if (!f.includes('public-track-record-transparency')) {
        const placeholderRegex = /\[(?:insert|placeholder|todo|todo:|write|tbd).*?\]/gi;
        const matches = html.match(placeholderRegex);
        if (matches) {
          errors.push(`Contains potential text placeholders: ${matches.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        console.error(`❌ ${sub}/${f} has errors:`);
        errors.forEach(err => console.error(`   - ${err}`));
        failedFiles++;
      } else {
        console.log(`✅ ${sub}/${f} is valid.`);
        parsedArticles.push({
          filename: f,
          category: sub,
          title: frontmatter.title,
          slug: frontmatter.slug,
          headingsCount: headings.length
        });
      }

    } catch (e) {
      console.error(`❌ ${sub}/${f}: Exception during validation:`, e);
      failedFiles++;
    }
  });
});

console.log('\n--- Verification Summary ---');
console.log(`Total files found and verified: ${totalFiles} (Target: 50)`);
console.log(`Successfully verified files: ${totalFiles - failedFiles}`);
console.log(`Failed files: ${failedFiles}`);

if (totalFiles !== 50) {
  console.warn(`⚠️ Warning: Expected exactly 50 files in content folders, but found ${totalFiles}.`);
}

if (failedFiles > 0) {
  console.error(`❌ Verification failed with ${failedFiles} errors.`);
  process.exit(1);
} else {
  console.log('🎉 Verification succeeded! All content files are formatted correctly with valid schemas and metadata.');
  process.exit(0);
}
