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

async function run() {
  const cookie = await getAdminCookies();
  const res = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=88123&action=elementor`, {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const html = await res.text();
  console.log('HTML length for 88123:', html.length);
  fs.writeFileSync('post_88123.html', html);

  const idx = html.indexOf('email_subject_2');
  console.log('Index of email_subject_2:', idx);
  if (idx !== -1) {
    console.log('Surrounding text:');
    console.log(html.slice(idx - 100, idx + 500));
  }
}

run().catch(console.error);
