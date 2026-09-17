/**
 * Helper to check if local storage mode is enabled.
 * 
 * When USE_LOCAL_STORAGE=true:
 * - Image and PDF uploads are saved locally in the 'uploads/' folder.
 * - Published CMS data is saved locally in 'data/local_db.json'.
 * 
 * When USE_LOCAL_STORAGE is false or not set:
 * - Local storage is NEVER used.
 * - The backend strictly uses AWS S3 and AWS DynamoDB.
 */
export function isLocalStorageActive() {
  return process.env.USE_LOCAL_STORAGE === "true";
}
