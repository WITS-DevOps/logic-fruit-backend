/**
 * Deploy Webhook Service
 * 
 * Automatically triggers background static site builds on Vercel (staging)
 * or AWS Amplify (production) when content is published, updated, or deleted in the CMS.
 * 
 * Uses DEPLOY_WEBHOOK_URL from environment variables (.env).
 * Immediately dispatches on every save/publish without throttling or debounce delay.
 */

export async function triggerDeployWebhook(reason = "Content published") {
  const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
  if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
    console.log(`[Deploy Webhook] No DEPLOY_WEBHOOK_URL configured, skipping deploy trigger: ${reason}`);
    return false;
  }

  try {
    console.log(`[Deploy Webhook] Immediately triggering build deployment for: ${reason}`);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        timestamp: new Date().toISOString(),
        source: "CMS Admin Portal",
      }),
    });

    if (res.ok) {
      console.log(`[Deploy Webhook] Deployment triggered successfully (${res.status} ${res.statusText}) for: ${reason}`);
      return true;
    } else {
      const text = await res.text();
      console.warn(`[Deploy Webhook] Webhook responded with status ${res.status}:`, text);
      return false;
    }
  } catch (err) {
    console.error(`[Deploy Webhook] Network error triggering deploy webhook:`, err.message);
    return false;
  }
}
