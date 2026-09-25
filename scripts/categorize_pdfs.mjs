import fs from 'fs';

const pdfs = JSON.parse(fs.readFileSync('all_wp_pdfs.json', 'utf8'));

console.log(`Total PDFs: ${pdfs.length}`);

const whitepapers = [];
const datasheets = [];
const productPdfs = [];
const others = [];

for (const p of pdfs) {
  const urlLower = p.url.toLowerCase();
  const titleLower = (p.title || '').toLowerCase();

  if (urlLower.includes('whitepaper') || urlLower.includes('white-paper') || urlLower.includes('white_paper') || titleLower.includes('whitepaper') || titleLower.includes('white paper')) {
    whitepapers.push(p);
  } else if (urlLower.includes('datasheet') || titleLower.includes('datasheet')) {
    datasheets.push(p);
  } else if (urlLower.includes('product') || titleLower.includes('product')) {
    productPdfs.push(p);
  } else {
    others.push(p);
  }
}

console.log(`\n=== 📄 WHITEPAPERS (${whitepapers.length}) ===`);
whitepapers.forEach(w => console.log(`- ${w.title} -> ${w.url}`));

console.log(`\n=== 📑 DATASHEETS (${datasheets.length}) ===`);
datasheets.slice(0, 15).forEach(d => console.log(`- ${d.title} -> ${d.url}`));

console.log(`\n=== 📦 PRODUCTS (${productPdfs.length}) ===`);
productPdfs.forEach(p => console.log(`- ${p.title} -> ${p.url}`));

// Also check for PCIe-Gen-6 specifically
const pcie = pdfs.filter(p => p.url.toLowerCase().includes('pcie') || (p.title || '').toLowerCase().includes('pcie'));
console.log(`\n=== ⚡ PCIE RELATED PDFS (${pcie.length}) ===`);
pcie.forEach(p => console.log(`- ${p.title} -> ${p.url}`));
