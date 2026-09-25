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

async function scanAllPagesAndPopups() {
  const cookie = await getAdminCookies();
  console.log('✅ Scanning WordPress database for all Forms & Email actions...');

  // 1. Fetch all posts with Elementor data (pages, posts, elementor_library)
  const postTypes = ['page', 'elementor_library'];
  const allFormsFound = [];

  for (const pt of postTypes) {
    let pageNum = 1;
    while (true) {
      const url = `https://dev.logic-fruit.tech/wp-json/wp/v2/${pt === 'page' ? 'pages' : 'elementor_library'}?per_page=50&page=${pageNum}`;
      const res = await fetch(url, {
        headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
      });
      if (!res.ok) break;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;

      for (const item of items) {
        // Fetch raw edit page to inspect form settings
        const postRes = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${item.id}&action=elementor`, {
          headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
        });
        const html = await postRes.text();

        if (html.includes('"widgetType":"form"') || html.includes('email_to')) {
          // Extract form settings
          const emailTo = [...html.matchAll(/"email_to":"([^"]*)"/g)].map(m => m[1]);
          const emailTo2 = [...html.matchAll(/"email_to_2":"([^"]*)"/g)].map(m => m[1]);
          const emailSubject = [...html.matchAll(/"email_subject":"([^"]*)"/g)].map(m => m[1]);
          const emailSubject2 = [...html.matchAll(/"email_subject_2":"([^"]*)"/g)].map(m => m[1]);
          const emailFromName = [...html.matchAll(/"email_from_name":"([^"]*)"/g)].map(m => m[1]);
          const emailFrom = [...html.matchAll(/"email_from":"([^"]*)"/g)].map(m => m[1]);

          // Find PDF links in email 2
          const pdfs = [...html.matchAll(/https?:[^"'\s>]+\.pdf/gi)].map(m => m[0]);

          allFormsFound.push({
            id: item.id,
            type: pt,
            title: item.title?.rendered,
            slug: item.slug,
            link: item.link,
            emailTo: [...new Set(emailTo)],
            emailSubject: [...new Set(emailSubject)],
            emailTo2: [...new Set(emailTo2)],
            emailSubject2: [...new Set(emailSubject2)],
            emailFromName: [...new Set(emailFromName)],
            emailFrom: [...new Set(emailFrom)],
            pdfs: [...new Set(pdfs)]
          });
          console.log(`🎯 Found Form in [${pt}] ID: ${item.id} - "${item.title?.rendered}"`);
        }
      }

      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      if (pageNum >= totalPages) break;
      pageNum++;
    }
  }

  console.log(`\nScan complete! Total forms found: ${allFormsFound.length}`);
  fs.writeFileSync('all_wp_forms_audit.json', JSON.stringify(allFormsFound, null, 2));
}

scanAllPagesAndPopups().catch(console.error);
