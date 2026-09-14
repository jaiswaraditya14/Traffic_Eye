// Synthetic JPEG APP1/TIFF fixture. No user image or real location is read.
export function createGpsJpegFixture({
    byteOrder = 'little', latitudeRef = 'N', longitudeRef = 'E',
} = {}) {
    const bytes = new Uint8Array(202);
    const view = new DataView(bytes.buffer);
    const littleEndian = byteOrder === 'little';
    bytes.set([0xff, 0xd8, 0xff, 0xe1]);
    view.setUint16(4, 196, false);
    bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);
    const tiff = 12;
    bytes.set(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d], tiff);
    view.setUint16(tiff + 2, 42, littleEndian);
    view.setUint32(tiff + 4, 8, littleEndian);
    view.setUint16(tiff + 8, 1, littleEndian);
    view.setUint16(tiff + 10, 0x8825, littleEndian);
    view.setUint16(tiff + 12, 4, littleEndian);
    view.setUint32(tiff + 14, 1, littleEndian);
    view.setUint32(tiff + 18, 30, littleEndian);
    view.setUint16(tiff + 30, 4, littleEndian);

    function entry(index, tag, type, count, data) {
        const offset = tiff + 32 + index * 12;
        view.setUint16(offset, tag, littleEndian);
        view.setUint16(offset + 2, type, littleEndian);
        view.setUint32(offset + 4, count, littleEndian);
        if (type === 2) bytes[offset + 8] = data.charCodeAt(0);
        else view.setUint32(offset + 8, data, littleEndian);
    }
    entry(0, 1, 2, 2, latitudeRef);
    entry(1, 2, 5, 3, 120);
    entry(2, 3, 2, 2, longitudeRef);
    entry(3, 4, 5, 3, 150);
    for (const [relativeOffset, values] of [[120, [12, 30, 0]], [150, [45, 15, 0]]]) {
        values.forEach((value, index) => {
            view.setUint32(tiff + relativeOffset + index * 8, value, littleEndian);
            view.setUint32(tiff + relativeOffset + index * 8 + 4, 1, littleEndian);
        });
    }
    bytes.set([0xff, 0xd9], 200);
    return bytes;
}
