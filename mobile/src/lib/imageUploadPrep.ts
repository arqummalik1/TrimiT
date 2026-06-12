import { Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

/** Must match backend `MAX_UPLOAD_BYTES` in uploads.py */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = 10;

export const IMAGE_TOO_LARGE_MESSAGE = `Image is too large to upload. Maximum size is ${MAX_UPLOAD_MB} MB.`;

export class ImageTooLargeError extends Error {
  readonly code = 'IMAGE_TOO_LARGE';

  constructor() {
    super(IMAGE_TOO_LARGE_MESSAGE);
    this.name = 'ImageTooLargeError';
  }
}

export async function getLocalFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resize and compress to JPEG so iPhone HEIC/RAW picks upload reliably.
 */
export async function prepareImageForUpload(
  localUri: string,
  options?: { maxWidth?: number; compress?: number }
): Promise<{ uri: string; byteSize: number | null }> {
  const maxWidth = options?.maxWidth ?? 1600;
  const compress = options?.compress ?? 0.82;

  let prepared = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: maxWidth } }],
    { compress, format: ImageManipulator.SaveFormat.JPEG }
  );

  let byteSize = await getLocalFileSizeBytes(prepared.uri);

  if (byteSize != null && byteSize > MAX_UPLOAD_BYTES) {
    prepared = await ImageManipulator.manipulateAsync(
      prepared.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.68, format: ImageManipulator.SaveFormat.JPEG }
    );
    byteSize = await getLocalFileSizeBytes(prepared.uri);
  }

  if (byteSize != null && byteSize > MAX_UPLOAD_BYTES) {
    prepared = await ImageManipulator.manipulateAsync(
      prepared.uri,
      [{ resize: { width: 960 } }],
      { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG }
    );
    byteSize = await getLocalFileSizeBytes(prepared.uri);
  }

  if (byteSize != null && byteSize > MAX_UPLOAD_BYTES) {
    throw new ImageTooLargeError();
  }

  return { uri: prepared.uri, byteSize };
}

async function pickFromLibrary(): Promise<string | null> {
  // Android Photo Picker / iOS picker — no media-library permission required.
  // (Declaring READ_MEDIA_IMAGES for this one-time use violates Play policy.)
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

async function pickFromCamera(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert('Permission required', 'Please allow camera access to take a photo.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

/** Gallery + camera picker for salon / service images. */
export function showSalonImageSourcePicker(onUri: (uri: string) => void): void {
  Alert.alert('Add salon photo', 'Choose how to add your image', [
    { text: 'Take Photo', onPress: () => void pickFromCamera().then((uri) => uri && onUri(uri)) },
    { text: 'Choose from Gallery', onPress: () => void pickFromLibrary().then((uri) => uri && onUri(uri)) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
