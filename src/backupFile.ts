import * as DocumentPicker from 'expo-document-picker';

// Web build: the backup downloads as a file, and restoring opens the
// browser's file picker. The phone app uses backupFile.native.ts.

/** Saves the backup file; true once it is handed over. */
export async function saveBackupFile(name: string, text: string): Promise<boolean> {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Lets the player pick a backup file and returns its text; undefined when they cancel. */
export async function openBackupFile(): Promise<string | undefined> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '.json'] });
  if (result.canceled || !result.assets?.length) return undefined;
  const file = result.assets[0].file;
  return file ? file.text() : (await fetch(result.assets[0].uri)).text();
}
