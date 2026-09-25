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

async function extractFromTemplate(id, label, cookie) {
  const res = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${id}&action=elementor`, {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const html = await res.text();

  console.log(`\n======================================================`);
  console.log(`📌 [ID ${id}] ${label}`);
  console.log(`======================================================`);

  // Extract form settings
  const formMatches = [...html.matchAll(/"widgetType":"form"[\s\S]*?"settings":\{([\s\S]*?)\},"elements"/g)];
  
  // Extract all email settings via regex
  const emailToMatches = [...html.matchAll(/"email_to":"([^"]*)"/g)].map(m => m[1]);
  const emailTo2Matches = [...html.matchAll(/"email_to_2":"([^"]*)"/g)].map(m => m[1]);
  const emailSubMatches = [...html.matchAll(/"email_subject":"([^"]*)"/g)].map(m => m[1]);
  const emailSub2Matches = [...html.matchAll(/"email_subject_2":"([^"]*)"/g)].map(m => m[1]);
  const emailFromNameMatches = [...html.matchAll(/"email_from_name":"([^"]*)"/g)].map(m => m[1]);
  const emailFromMatches = [...html.matchAll(/"email_from":"([^"]*)"/g)].map(m => m[1]);

  console.log(`Admin Notification Email (Email 1):`);
  console.log(`  To: ${emailToMatches.join(', ') || 'N/A'}`);
  console.log(`  Subject: ${emailSubMatches.join(' | ') || 'N/A'}`);
  console.log(`  From: ${emailFromNameMatches.join(' | ')} <${emailFromMatches.join(' | ')}>`);

  console.log(`\nAuto-responder Email (Email 2 sent to user):`);
  console.log(`  To: ${emailTo2Matches.join(', ') || 'N/A'}`);
  console.log(`  Subject: ${emailSub2Matches.join(' | ') || 'N/A'}`);

  // Find all email_content_2 occurrences
  const startKey = '"email_content_2":"';
  let searchIdx = 0;
  let count = 0;

  while ((searchIdx = html.indexOf(startKey, searchIdx)) !== -1) {
    count++;
    const contentStart = searchIdx + startKey.length;
    let i = contentStart;
    while (i < html.length) {
      if (html[i] === '"' && html[i - 1] !== '\\') {
        break;
      }
      i++;
    }
    const rawContent = html.slice(contentStart, i);
    try {
      const parsed = JSON.parse('"' + rawContent + '"');
      const filename = `email_${id}_autoresponder_${count}.html`;
      fs.writeFileSync(filename, parsed);
      
      const pdfs = [...parsed.matchAll(/https?:[^"'\s>]+\.pdf/gi)].map(m => m[0]);
      console.log(`\n  📄 Auto-responder #${count} PDF Links:`);
      if (pdfs.length > 0) {
        [...new Set(pdfs)].forEach(p => console.log(`     ⭐️ ${p}`));
      } else {
        console.log(`     (No direct PDF link found in body)`);
      }
    } catch (e) {
      console.error('JSON parse error for email_content_2:', e.message);
    }
    searchIdx = i + 1;
  }
}

async function run() {
  const cookie = await getAdminCookies();
  await extractFromTemplate(88053, 'PCIe Gen6 Controller IP Datasheet', cookie);
  await extractFromTemplate(87549, 'LIN Master Slave IP Core Datasheet', cookie);
  await extractFromTemplate(87538, 'Footer Newsletter Subscription', cookie);
  await extractFromTemplate(6082, 'Contact Us Page', cookie);
}

run().catch(console.error);
