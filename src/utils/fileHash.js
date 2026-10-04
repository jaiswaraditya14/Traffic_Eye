/** Local raw-byte SHA-256. No transformations or base64-text substitutes. */
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
export async function computeFileSha256(uri) {
    if (!uri) return null;
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        if (!base64) return null;
        const bytes = decode(base64);
        const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
        const sha256 = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        return { sha256, fileSize: bytes.byteLength, sourceUri: uri };
    } catch (_) { return null; }
}
