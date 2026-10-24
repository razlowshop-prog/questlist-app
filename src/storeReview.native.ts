import * as StoreReview from 'expo-store-review';

/** Shows the App Store / Play Store review pop-up. True if it could be asked (the store may still not show it). */
export async function askStoreReview(): Promise<boolean> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
