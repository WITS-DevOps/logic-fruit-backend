# Live Deployment Checklist & Schema Migration Guide

This document tracks all schema updates, backend routes, and frontend features added during the Staging development cycle, to ensure a seamless push to Production (Live) when approved.

---

## 1. Schema Additions

### A. Product CMS
* **New Attribute**: `buttonText` (String)
* **Default Value**: `"Download Datasheet"` (or `"Contact Us"` if no datasheet is uploaded)
* **Frontend Behavior**:
  * Action button on product detail pages displays `product.buttonText`.
  * If a PDF is attached, clicking opens the PDF; otherwise, it scrolls to the contact inquiry form.
* **Database (DynamoDB `logicfruit_cms`)**:
  * Schemaless NoSQL: Existing items safely fall back to `"DOWNLOAD DATASHEET"` in the UI without requiring an immediate database lock or migration.
  * Saving any product in Admin CMS Studio automatically writes `buttonText`.

---

### B. Whitepaper CMS
* **New Attributes**:
  * `cardTitle` (String) — Custom heading for the download callout card (falls back to `"Download Official PDF"` or `"Official Whitepaper Document"`).
  * `cardDescription` (String) — Custom description text (falls back to standard high-resolution PDF message).
  * `buttonText` (String) — Label for the primary download button (falls back to `"DOWNLOAD WHITEPAPER"` or `"GET WHITEPAPER PDF"`).
  * `secondaryButtonText` (String) — Label for the secondary contact button (falls back to `"TALK TO AN ARCHITECT"`).
* **Frontend Behavior**:
  * Full backward compatibility: If any of these fields are blank or omitted on existing items, the standard defaults and behavior are used.
* **Database (DynamoDB `logicfruit_cms`)**:
  * Schemaless: Existing whitepapers work seamlessly without schema alterations.
  * Saving any whitepaper in CMS Studio will persist the custom fields.

---

## 2. Optional Backfill Script (for Live DynamoDB)

If you wish to explicitly populate these attributes on all existing items in the live DynamoDB table before or after live deployment:
```bash
node scripts/backfill-live-defaults.mjs
```

---

## 3. Step-by-Step Live Deployment Instructions (When Ready)

> [!WARNING]
> Do NOT perform these steps until the team gives the explicit go-ahead for Live deployment.

### Step 1: Deploy Backend to Live EC2
1. Ensure your git author is Anurag:
   ```bash
   git config user.name "Anurag"
   git config user.email "anurag@logicfruit.com"
   ```
2. Commit and push backend to `origin/main`:
   ```bash
   cd backend
   git push origin staging:main
   ```
3. Deploy to Live EC2 (`65.0.5.248`):
   ```bash
   node deploy/deploy-live.mjs
   ```

### Step 2: Deploy Frontend to Live AWS Amplify
1. In `logic-fruit-ui`:
   ```bash
   cd logic-fruit-ui
   git push origin staging:main
   ```
2. AWS Amplify (`d1kuq18eyfnhr8`) will automatically detect the push to `main` and trigger the production build.
