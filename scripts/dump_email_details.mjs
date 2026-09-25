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

async function dumpEmail(id, name, cookie) {
  const res = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${id}&action=elementor`, {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const html = await res.text();

  // Find all email_content_2 occurrences
  const regex = /"email_content_2":"([\s\S]*?)","email_content_type"/g;
  let match;
  let count = 0;
  while ((match = regex.exec(html)) !== null) {
    count++;
    let content = match[1]
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .replace(/\\\\/g, '');
    
    fs.writeFileSync(`email_${name}_${count}.html`, content);
    console.log(`\n=================================================`);
    console.log(`Saved email_${name}_${count}.html (Length: ${content.length})`);
    
    // Find all links
    const allLinks = content.match(/https?:[^"'\s><]+/gi) || [];
    console.log(`Links found in email:`);
    allLinks.forEach(l => console.log('  ->', l));

    // Find PDF specifically
    const pdfs = content.match(/https?:[^"'\s><]+\.pdf/gi) || [];
    if (pdfs.length > 0) {
      console.log(`🔥 PDF Download Links:`);
      pdfs.forEach(p => console.log('  ⭐️', p));
    }
  }
}

async function run() {
  const cookie = await getAdminCookies();
  await dumpEmail(88123, 'whitepaper_88123', cookie);
  await dumpEmail(88053, 'pcie_88053', cookie);
  await dumpEmail(87549, 'lin_87549', cookie);
  await dumpEmail(6082, 'contact_6082', cookie);
}

run().catch(console.error);
