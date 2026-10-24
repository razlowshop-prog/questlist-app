import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Profile photos are stored this big: sharp on a large avatar, a few dozen KB. */
const SIZE = 256;

export type PhotoResult = { photo: string } | { error: string } | undefined;

/**
 * Lets the player pick a photo from the gallery or take one, crops it to the
 * middle square and shrinks it, and returns it as a JPEG data URI. Undefined
 * when they cancel.
 */
export async function pickPhoto(from: 'library' | 'camera'): Promise<PhotoResult> {
  try {
    if (from === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { error: 'Succedo needs the camera to take a photo. You can allow it in your phone settings.' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.length) return undefined;
    const { uri, width, height } = result.assets[0];
    const context = ImageManipulator.manipulate(uri);
    // The phone's editor already cropped to a square; the web picker can't, so crop here.
    if (width && height && width !== height) {
      const side = Math.min(width, height);
      context.crop({ originX: Math.round((width - side) / 2), originY: Math.round((height - side) / 2), width: side, height: side });
    }
    context.resize({ width: SIZE, height: SIZE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    if (!saved.base64) return { error: 'That photo didn’t work. Try another one.' };
    return { photo: `data:image/jpeg;base64,${saved.base64}` };
  } catch (e) {
    console.warn('Photo failed', e);
    return { error: 'That photo didn’t work. Try another one.' };
  }
}
