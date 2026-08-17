const fs = require('fs');
const path = require('path');
const { parseJpegBinaryExif } = require('../src/utils/exifParserCoreCommonJS');

const uploadPath = 'C:\\Users\\jaisw\\.gemini\\antigravity-ide\\brain\\b26af290-cca8-48c4-a9e4-6fad3e10dd61\\.user_uploaded\\media_1786936747711.png';

console.log('Inspecting:', uploadPath);
if (fs.existsSync(uploadPath)) {
    const buf = fs.readFileSync(uploadPath);
    console.log('File size:', buf.length, 'bytes');
    console.log('Header hex:', buf.slice(0, 16).toString('hex'));
    console.log('Header ASCII:', buf.slice(0, 64).toString('latin1'));

    // Check if it has EXIF marker or PNG eXIf chunk or JPEG APP1
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    console.log('Format detected:', isJpeg ? 'JPEG' : isPng ? 'PNG' : 'Other');

    if (isJpeg) {
        const gps = parseJpegBinaryExif(new Uint8Array(buf));
        console.log('JPEG Binary EXIF GPS result:', gps);
    } else if (isPng) {
        console.log('PNG image detected. Searching for eXIf or tEXt / iTXt chunks...');
        let offset = 8;
        while (offset < buf.length - 8) {
            const chunkLen = buf.readUInt32BE(offset);
            const chunkType = buf.slice(offset + 4, offset + 8).toString('latin1');
            console.log(`Found PNG chunk: ${chunkType}, length: ${chunkLen}`);
            if (chunkType === 'eXIf') {
                const exifBytes = new Uint8Array(buf.slice(offset + 8, offset + 8 + chunkLen));
                console.log('eXIf chunk found! Parsing EXIF...');
                // parse TIFF
                // In PNG eXIf chunk, the data is raw TIFF header
            }
            offset += 12 + chunkLen;
            if (chunkType === 'IEND') break;
        }
    }

    // Let's also scan whole buffer for 'Exif' or TIFF markers or GPS strings
    const str = buf.toString('latin1');
    const exifIdx = str.indexOf('Exif');
    console.log('Exif marker index in file:', exifIdx);
    if (exifIdx !== -1) {
        console.log('Exif surrounding text:', str.slice(Math.max(0, exifIdx - 10), exifIdx + 100).replace(/[^\x20-\x7E]/g, '.'));
    }
    const gpsIdx = str.indexOf('GPS');
    console.log('GPS marker index in file:', gpsIdx);
    if (gpsIdx !== -1) {
        console.log('GPS surrounding text:', str.slice(Math.max(0, gpsIdx - 10), gpsIdx + 100).replace(/[^\x20-\x7E]/g, '.'));
    }
} else {
    console.log('File does not exist at path');
}
