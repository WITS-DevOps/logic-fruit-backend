import fs from 'fs';

const basicAuth = Buffer.from('logicfruit:logicfruite2026').toString('base64');

async function getAdminCookies() {
  const loginUrl = 'https://dev.logic-fruit.tech/wp-login.php';
  const getRes = await fetch(loginUrl, { headers: { 'Authorization': 'Basic ' + basicAuth } });
  const rawSetCookie = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [getRes.headers.get('set-cookie')];
  const cookies = rawSetCookie.map(c => c.split(';')[0]).filter(Boolean);

  const params = new URLSearchParams();
  params.append('log', 'jaswant.singh@logic-fruit.com');
  params.append('pwd', 'jaswant@123@123');
  params.append('wp-submit', 'Log In');
  params.append('redirect_to', 'https://dev.logic-fruit.tech/wp-admin/');
  params.append('testcookie', '1');

  const postRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies.join('; ')
    },
    body: params.toString(),
    redirect: 'manual'
  });

  const postCookies = (postRes.headers.getSetCookie ? postRes.headers.getSetCookie() : [postRes.headers.get('set-cookie')])
    .map(c => c ? c.split(';')[0] : '').filter(Boolean);
  return [...cookies, ...postCookies].join('; ');
}

async function main() {
  const cookie = await getAdminCookies();
  console.log('✅ Logged in successfully.');

  // 1. Check plugins
  const pluginsRes = await fetch('https://dev.logic-fruit.tech/wp-admin/plugins.php', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const pluginsHtml = await pluginsRes.text();
  const pluginMatches = [...pluginsHtml.matchAll(/data-slug="([^"]+)"/g)].map(m => m[1]);
  console.log('Installed/Active Plugins:', [...new Set(pluginMatches)]);

  // 2. Check if CF7 (Contact Form 7) or WPForms or Fluent Forms or Formidable exists
  const cf7Res = await fetch('https://dev.logic-fruit.tech/wp-admin/admin.php?page=wpcf7', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie },
    redirect: 'manual'
  });
  console.log('Contact Form 7 page status:', cf7Res.status);
  if (cf7Res.status === 200) {
    const cf7Html = await cf7Res.text();
    fs.writeFileSync('wp_cf7.html', cf7Html);
    console.log('Saved wp_cf7.html');
  }

  // 3. Check WPForms
  const wpformsRes = await fetch('https://dev.logic-fruit.tech/wp-admin/admin.php?page=wpforms-overview', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie },
    redirect: 'manual'
  });
  console.log('WPForms page status:', wpformsRes.status);

  // 4. Check Elementor Submissions / Forms
  const elRes = await fetch('https://dev.logic-fruit.tech/wp-admin/admin.php?page=e-form-submissions', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie },
    redirect: 'manual'
  });
  console.log('Elementor Submissions status:', elRes.status);

  // 5. Fetch all PDF files in media library
  console.log('\n--- Fetching all PDF files from Media Library ---');
  let page = 1;
  const allPdfs = [];
  while (true) {
    const mediaRes = await fetch(`https://dev.logic-fruit.tech/wp-json/wp/v2/media?per_page=100&page=${page}`, {
      headers: { 'Authorization': 'Basic ' + basicAuth }
    });
    if (!mediaRes.ok) break;
    const items = await mediaRes.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const item of items) {
      if (item.mime_type === 'application/pdf' || (item.source_url && item.source_url.toLowerCase().endsWith('.pdf'))) {
        allPdfs.push({
          id: item.id,
          title: item.title?.rendered,
          url: item.source_url,
          date: item.date
        });
      }
    }
    const totalPages = parseInt(mediaRes.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages || page >= 50) break; // Check first 50 pages (5000 items)
    page++;
  }
  console.log(`Found ${allPdfs.length} total PDFs in media library.`);
  fs.writeFileSync('all_wp_pdfs.json', JSON.stringify(allPdfs, null, 2));
}

main().catch(console.error);
