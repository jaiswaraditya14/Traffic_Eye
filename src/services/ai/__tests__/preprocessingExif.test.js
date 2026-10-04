/* eslint-env jest */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { prepareVisionImage, prepareOcrImage } from '../preprocessing';
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), deleteAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
beforeEach(() => {
    ImageManipulator.manipulateAsync.mockResolvedValue({ uri: 'file:///transformed.jpg', base64: 'synthetic' });
    FileSystem.deleteAsync.mockResolvedValue();
    FileSystem.readAsStringAsync.mockResolvedValue('synthetic');
});
test.each([prepareVisionImage, prepareOcrImage])('transforms a separate copy with intact access-bearing input URI', async prepare => {
    const uri = 'content://provider/photo?access=required';
    expect(await prepare(uri)).toBe('synthetic');
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(uri, expect.any(Array), expect.objectContaining({ format: 'jpeg' }));
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(uri, expect.anything());
});
