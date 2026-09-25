import fs from 'fs';

const html = fs.readFileSync('post_88123.html', 'utf8');

// Find where email_content_2 starts
const startKey = '"email_content_2":"';
const startIdx = html.indexOf(startKey);
if (startIdx !== -1) {
  const contentStart = startIdx + startKey.length;
  // Look for end of json string: unescaped quote followed by comma or brace
  let i = contentStart;
  while (i < html.length) {
    if (html[i] === '"' && html[i - 1] !== '\\') {
      break;
    }
    i++;
  }
  const rawContent = html.slice(contentStart, i);
  // Unescape JSON string
  const parsedContent = JSON.parse('"' + rawContent + '"');
  fs.writeFileSync('email_whitepaper_88123.html', parsedContent);
  console.log('✅ Extracted email_whitepaper_88123.html successfully!');
  console.log('Length:', parsedContent.length);

  // Search for links
  const links = [...parsedContent.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('\n🔗 All links found in Whitepaper email:');
  links.forEach(l => console.log('  ->', l));

  // Search for pdfs
  const pdfs = [...parsedContent.matchAll(/https?:[^"'\s>]+\.pdf/gi)].map(m => m[0]);
  console.log('\n📄 All PDF URLs found in Whitepaper email:');
  pdfs.forEach(p => console.log('  ⭐️', p));
}
