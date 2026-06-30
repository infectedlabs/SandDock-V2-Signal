import fs from 'fs';
import path from 'path';

/**
 * Custom Markdown to HTML parser
 */
function markdownToHtml(md) {
  let html = md;

  // 1. Code Blocks (```lang ... ```)
  html = html.replace(/```(\w*)\r?\n([\s\S]*?)\r?\n```/g, (match, lang, code) => {
    // Avoid double-rendering schema block in content body
    if (code.includes('"@context"') || code.includes('schema.org')) {
      return '';
    }
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="font-mono bg-zinc-900 text-zinc-100 p-4 rounded-lg my-6 overflow-x-auto text-sm border border-zinc-800"><code class="language-${lang}">${escapedCode}</code></pre>`;
  });

  // 2. Blockquotes (> text)
  // Handle multi-line blockquotes together
  html = html.replace(/(?:^|\n)[ \t]*>[ \t]*(.*)/g, (match, p1) => {
    const text = p1.trim();
    // Styling for CTAs or callouts
    if (text.includes('Start free') || text.includes('Try it free') || text.includes('Get free BTC') || text.includes('View the live')) {
      return `\n<div class="my-6 p-5 border-l-4 border-[#ff5722] bg-[#ff5722]/5 text-black rounded-r-lg font-medium">${text}</div>`;
    }
    return `\n<blockquote class="my-6 pl-4 border-l-4 border-zinc-300 italic text-zinc-600">${text}</blockquote>`;
  });

  // 3. Tables
  // Finds blocks of table rows like: | a | b | \n |---|---| \n | c | d |
  html = html.replace(/(?:^|\n)(\|.*\|)\r?\n(\|[ -:|]*\|)\r?\n((?:\|.*\|\r?\n?)*)/g, (match, header, separator, rows) => {
    const parseRow = (row) => {
      const cols = row.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      return cols;
    };

    const headers = parseRow(header);
    const tableHeaderHtml = `<thead><tr class="border-b border-black bg-zinc-50 font-mono text-xs uppercase tracking-wider text-black text-left">${headers.map(h => `<th class="px-4 py-3 font-bold">${h}</th>`).join('')}</tr></thead>`;

    const tableRows = rows.split(/\r?\n/).filter(r => r.trim()).map(row => {
      const cells = parseRow(row);
      return `<tr class="border-b border-zinc-200 hover:bg-zinc-50">${cells.map(c => `<td class="px-4 py-3 text-sm">${c}</td>`).join('')}</tr>`;
    }).join('');

    return `\n<div class="my-6 overflow-x-auto border border-black rounded-lg"><table class="min-w-full table-auto border-collapse bg-white">${tableHeaderHtml}<tbody>${tableRows}</tbody></table></div>`;
  });

  // 4. Headings
  html = html.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, title) => {
    const level = hashes.length;
    const cleanTitle = title.trim();
    const id = cleanTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    if (level === 1) {
      return `<h1 id="${id}" class="text-3xl md:text-4xl font-extrabold font-sans tracking-tight text-black mb-6 mt-8">${cleanTitle}</h1>`;
    }
    if (level === 2) {
      return `<h2 id="${id}" class="text-2xl md:text-3xl font-bold font-sans tracking-tight text-black mb-4 mt-10 border-b border-zinc-200 pb-2">${cleanTitle}</h2>`;
    }
    if (level === 3) {
      return `<h3 id="${id}" class="text-xl md:text-2xl font-semibold font-sans tracking-tight text-black mb-3 mt-6">${cleanTitle}</h3>`;
    }
    return `<h${level} id="${id}" class="text-lg font-semibold text-black mb-2 mt-4">${cleanTitle}</h${level}>`;
  });

  // 5. Unordered Lists (lines starting with - or *)
  // Match contiguous lines starting with - or *
  html = html.replace(/(?:^|\n)((?:[ \t]*[-*]\s+.*\r?\n?)+)/g, (match, listBlock) => {
    const items = listBlock.split(/\r?\n/).filter(line => line.trim()).map(line => {
      const cleanLine = line.replace(/^\s*[-*]\s+/, '');
      return `<li class="mb-2 pl-1">${cleanLine}</li>`;
    }).join('');
    return `\n<ul class="list-disc list-inside my-6 pl-4 space-y-1 text-zinc-800">${items}</ul>`;
  });

  // 6. Ordered Lists (lines starting with \d+.)
  html = html.replace(/(?:^|\n)((?:[ \t]*\d+\.\s+.*\r?\n?)+)/g, (match, listBlock) => {
    const items = listBlock.split(/\r?\n/).filter(line => line.trim()).map(line => {
      const cleanLine = line.replace(/^\s*\d+\.\s+/, '');
      return `<li class="mb-2 pl-1">${cleanLine}</li>`;
    }).join('');
    return `\n<ol class="list-decimal list-inside my-6 pl-4 space-y-1 text-zinc-800">${items}</ol>`;
  });

  // 7. Bold & Italic
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
  html = html.replace(/_([\s\S]*?)_/g, '<em>$1</em>');

  // 8. Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="font-mono bg-zinc-100 text-zinc-800 px-1 py-0.5 rounded text-sm">$1</code>');

  // 9. Links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#ff5722] hover:text-[#e64a19] hover:underline font-semibold">$1</a>');

  // 10. Horizontal Rule (---)
  html = html.replace(/^(?:---|___|\*\*\*)$/gm, '<hr class="my-8 border-t border-zinc-200" />');

  // 11. Paragraphs (blocks of text separated by double newlines)
  const paragraphs = html.split(/\n\s*\n/).map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    // Skip wrapping if it's already a block element
    if (trimmed.startsWith('<h') || 
        trimmed.startsWith('<div') || 
        trimmed.startsWith('<blockquote') || 
        trimmed.startsWith('<ul') || 
        trimmed.startsWith('<ol') || 
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<table')) {
      return trimmed;
    }
    return `<p class="leading-relaxed text-zinc-800 my-4 text-base md:text-lg">${trimmed}</p>`;
  }).filter(Boolean).join('\n');

  return paragraphs;
}

/**
 * Parses frontmatter, extracts schema, and converts markdown body to HTML.
 */
export function parseMarkdownFile(absolutePath) {
  try {
    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf8');

    // Split frontmatter and body
    const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
      return {
        frontmatter: {},
        content: fileContent,
        html: markdownToHtml(fileContent),
        schema: null
      };
    }

    const frontmatterText = match[1];
    const bodyText = match[2];

    // Parse frontmatter
    const frontmatter = {};
    frontmatterText.split(/\r?\n/).forEach(line => {
      const separatorIdx = line.indexOf(':');
      if (separatorIdx !== -1) {
        const key = line.substring(0, separatorIdx).trim();
        const value = line.substring(separatorIdx + 1).trim();
        // Remove surrounding quotes
        frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
      }
    });

    // Extract JSON-LD schema
    let schema = null;
    const schemaMatch = bodyText.match(/```json\r?\n([\s\S]*?)\r?\n```/);
    if (schemaMatch) {
      const possibleJson = schemaMatch[1].trim();
      if (possibleJson.includes('"@context"') || possibleJson.includes('schema.org')) {
        try {
          schema = JSON.parse(possibleJson);
        } catch (e) {
          console.warn(`[markdown-parser] Failed to parse schema JSON in ${absolutePath}:`, e.message);
        }
      }
    }

    // Clean up content body (remove the schema code block completely)
    let cleanedBody = bodyText;
    if (schemaMatch) {
      cleanedBody = bodyText.replace(/```json\r?\n(?:[\s\S]*?)\r?\n```/, '');
    }

    // Extract H2 headings for Table of Contents
    const headings = [];
    const headingLines = cleanedBody.split(/\r?\n/);
    headingLines.forEach(line => {
      if (line.startsWith('## ')) {
        const text = line.substring(3).trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ text, id });
      }
    });

    return {
      frontmatter,
      content: cleanedBody,
      html: markdownToHtml(cleanedBody),
      schema,
      headings
    };
  } catch (err) {
    console.error(`[markdown-parser] Error parsing ${absolutePath}:`, err);
    return null;
  }
}
