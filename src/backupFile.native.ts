import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Phone app: the backup is written to a temporary file and handed to the share
// sheet, so the player can keep it in Files, Drive, an email to themselves and
// so on. Restoring opens the phone's file picker.

/** Saves the backup file; true once the share sheet took it. */
export async function saveBackupFile(name: string, text: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Keep your Succedo backup' });
  return true;
}

/** Lets the player pick a backup file and returns its text; undefined when they cancel. */
export async function openBackupFile(): Promise<string | undefined> {
  // Any type: some cloud drives label .json files as plain text or binary. The content is checked anyway.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return undefined;
  return new File(result.assets[0].uri).text();
}
