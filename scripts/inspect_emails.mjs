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
  console.log('✅ Logged in to WordPress.');

  // 1. Fetch WP Mail SMTP settings page
  console.log('--- Checking WP Mail SMTP Settings ---');
  const smtpRes = await fetch('https://dev.logic-fruit.tech/wp-admin/admin.php?page=wp-mail-smtp', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  console.log('WP Mail SMTP status:', smtpRes.status);
  if (smtpRes.ok) {
    const smtpHtml = await smtpRes.text();
    // Extract from email, from name, mailer
    const fromEmailMatch = smtpHtml.match(/name="wp-mail-smtp\[mail\]\[from_email\]"[^>]*value="([^"]*)"/);
    const fromNameMatch = smtpHtml.match(/name="wp-mail-smtp\[mail\]\[from_name\]"[^>]*value="([^"]*)"/);
    const mailerMatch = smtpHtml.match(/name="wp-mail-smtp\[mail\]\[mailer\]"[^>]*value="([^"]*)"/);
    console.log('SMTP From Email:', fromEmailMatch ? fromEmailMatch[1] : 'not found');
    console.log('SMTP From Name:', fromNameMatch ? fromNameMatch[1] : 'not found');
    console.log('SMTP Mailer:', mailerMatch ? mailerMatch[1] : 'not found');
    fs.writeFileSync('smtp_page.html', smtpHtml);
  }

  // 2. Fetch pages and templates to find Elementor forms and their email actions
  console.log('\n--- Searching Pages for Forms and Email Actions ---');
  let page = 1;
  const formsFound = [];

  while (true) {
    const res = await fetch(`https://dev.logic-fruit.tech/wp-json/wp/v2/pages?per_page=50&page=${page}`, {
      headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
    });
    if (!res.ok) break;
    const pages = await res.json();
    if (!Array.isArray(pages) || pages.length === 0) break;

    for (const p of pages) {
      // Fetch single page edit/raw or check content
      const content = p.content?.rendered || '';
      // Also fetch page html from frontend or admin
      const editRes = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${p.id}&action=edit`, {
        headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
      });
      const editHtml = await editRes.text();
      
      // Look for elementor data or forms in editHtml
      if (editHtml.includes('form_fields') || editHtml.includes('email_to') || editHtml.includes('email_to_2')) {
        console.log(`Found possible form in page: [${p.id}] ${p.title?.rendered} (${p.link})`);
        formsFound.push({ id: p.id, title: p.title?.rendered, link: p.link });
      }
    }
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  console.log(`\nPages checked. Found ${formsFound.length} pages with forms.`);
}

main().catch(console.error);
