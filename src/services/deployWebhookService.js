/**
 * Deploy Webhook Service
 * 
 * Automatically triggers background static site builds on Vercel (staging)
 * or AWS Amplify (production) when content is published, updated, or deleted in the CMS.
 * 
 * Uses DEPLOY_WEBHOOK_URL from environment variables (.env).
 * Batches changes with a 10-second debounce so rapid saves only trigger one clean build.
 */

let debounceTimer = null;
let pendingReasons = [];

export function triggerDeployWebhook(reason = "Content published") {
  const webhookUrl = process.env.DEPLOY_WEBHOOK_URL;
  if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
    return;
  }

  pendingReasons.push(reason);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const summary = pendingReasons.join("; ");
    pendingReasons = [];
    debounceTimer = null;

    try {
      console.log(`[Deploy Webhook] Triggering background build (${summary})...`);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        console.log(`[Deploy Webhook] Background deployment triggered successfully (${res.status} ${res.statusText})`);
      } else {
        const text = await res.text();
        console.warn(`[Deploy Webhook] Webhook returned status ${res.status}:`, text);
      }
    } catch (err) {
      console.error(`[Deploy Webhook] Network error triggering deploy webhook:`, err.message);
    }
  }, 10000);
}
