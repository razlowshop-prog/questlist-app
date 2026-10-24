// Web build: there is no store pop-up in a browser (storeReview.native.ts asks on phones).
export async function askStoreReview(): Promise<boolean> {
  return false;
}
