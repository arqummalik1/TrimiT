import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

// imageUploadPrep imports these; stub so the module loads under Jest.
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

import { showSalonImagesSourcePicker } from '../../src/lib/imageUploadPrep';

type AlertButton = { text?: string; onPress?: () => void };

function pressAlertButton(label: string) {
  const spy = Alert.alert as unknown as jest.Mock;
  const buttons = (spy.mock.calls[spy.mock.calls.length - 1][2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === label);
  if (!button?.onPress) throw new Error(`No alert button labelled "${label}"`);
  button.onPress();
}

describe('showSalonImagesSourcePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('requests gallery multi-select with the given limit and returns all URIs', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }, { uri: 'c.jpg' }],
    });
    const onUris = jest.fn();

    showSalonImagesSourcePicker(3, onUris);
    pressAlertButton('Choose from Gallery');
    await new Promise((r) => setImmediate(r));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 3 })
    );
    expect(onUris).toHaveBeenCalledWith(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('never returns more URIs than the limit', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }, { uri: 'c.jpg' }],
    });
    const onUris = jest.fn();

    showSalonImagesSourcePicker(2, onUris);
    pressAlertButton('Choose from Gallery');
    await new Promise((r) => setImmediate(r));

    expect(onUris).toHaveBeenCalledWith(['a.jpg', 'b.jpg']);
  });

  it('disables multi-select when only one slot remains', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'a.jpg' }],
    });
    const onUris = jest.fn();

    showSalonImagesSourcePicker(1, onUris);
    pressAlertButton('Choose from Gallery');
    await new Promise((r) => setImmediate(r));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: false, selectionLimit: 1 })
    );
    expect(onUris).toHaveBeenCalledWith(['a.jpg']);
  });

  it('does not call back when the gallery pick is canceled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });
    const onUris = jest.fn();

    showSalonImagesSourcePicker(3, onUris);
    pressAlertButton('Choose from Gallery');
    await new Promise((r) => setImmediate(r));

    expect(onUris).not.toHaveBeenCalled();
  });
});
