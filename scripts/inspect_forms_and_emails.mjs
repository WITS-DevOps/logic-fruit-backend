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
  console.log('✅ Logged into WordPress Admin');

  // Let's check Elementor Library (Templates / Popups / Forms)
  console.log('\n--- 1. Fetching Elementor Library Templates (Popups, Forms, Global Widgets) ---');
  const elLibRes = await fetch('https://dev.logic-fruit.tech/wp-admin/edit.php?post_type=elementor_library', {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const elLibHtml = await elLibRes.text();
  fs.writeFileSync('elementor_library.html', elLibHtml);
  
  // Extract template IDs and titles
  const templateMatches = [...elLibHtml.matchAll(/class="row-title"[^>]*href="[^"]*post=([0-9]+)[^"]*"[^>]*>([^<]+)<\/a>/g)];
  console.log(`Found ${templateMatches.length} Elementor Templates:`);
  for (const m of templateMatches) {
    console.log(`  ID: ${m[1]} | Title: ${m[2].trim()}`);
  }

  // Check each template for Form / Email actions
  for (const m of templateMatches) {
    const tId = m[1];
    const tTitle = m[2].trim();
    const postRes = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${tId}&action=elementor`, {
      headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
    });
    const postHtml = await postRes.text();
    
    // Check if it has email configs
    if (postHtml.includes('email_to') || postHtml.includes('form_fields') || postHtml.includes('email2')) {
      console.log(`\n🔥 FORM FOUND in Template [${tId}] "${tTitle}":`);
      // Extract email_to, email_subject, email_to_2, etc.
      const emails = [...postHtml.matchAll(/"(email_to|email_to_2|email_subject|email_subject_2|email_content|email_content_2|redirect_to)":"([^"]*)"/g)];
      emails.forEach(e => console.log(`   ${e[1]}: ${e[2]}`));
    }
  }

  // Check Whitepaper page 5723 in Elementor
  console.log('\n--- 2. Inspecting Whitepaper Page (ID: 5723) Elementor Data ---');
  const wpPageRes = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=5723&action=elementor`, {
    headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
  });
  const wpPageHtml = await wpPageRes.text();
  const wpEmails = [...wpPageHtml.matchAll(/"(email_to|email_to_2|email_subject|email_subject_2|email_content|email_content_2|redirect_to)":"([^"]*)"/g)];
  if (wpEmails.length > 0) {
    console.log(`🔥 FORM in Whitepaper page 5723:`);
    wpEmails.forEach(e => console.log(`   ${e[1]}: ${e[2]}`));
  } else {
    console.log('No direct form in page 5723 (might use a popup or template)');
  }

  // Check Contact Us page
  console.log('\n--- 3. Searching for Contact Us page ---');
  const searchContact = await fetch('https://dev.logic-fruit.tech/wp-json/wp/v2/pages?slug=contact-us', {
    headers: { 'Authorization': 'Basic ' + basicAuth }
  });
  const contactPages = await searchContact.json();
  if (contactPages.length > 0) {
    const cId = contactPages[0].id;
    console.log(`Contact Us Page ID: ${cId}`);
    const cRes = await fetch(`https://dev.logic-fruit.tech/wp-admin/post.php?post=${cId}&action=elementor`, {
      headers: { 'Authorization': 'Basic ' + basicAuth, 'Cookie': cookie }
    });
    const cHtml = await cRes.text();
    const cEmails = [...cHtml.matchAll(/"(email_to|email_to_2|email_subject|email_subject_2|email_content|email_content_2|redirect_to)":"([^"]*)"/g)];
    console.log(`🔥 FORM in Contact Us page ${cId}:`);
    cEmails.forEach(e => console.log(`   ${e[1]}: ${e[2]}`));
  }
}

main().catch(console.error);
