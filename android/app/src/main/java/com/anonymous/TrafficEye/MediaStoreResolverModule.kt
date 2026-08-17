package com.anonymous.TrafficEye

import android.content.ContentUris
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.security.MessageDigest
import com.trafficviolationapp.BuildConfig

/**
 * MediaStoreResolverModule
 *
 * Resolves an Android Photo Picker / Gallery selection to the genuine underlying
 * MediaStore URI using MediaStore.setRequireOriginal() with ACCESS_MEDIA_LOCATION.
 *
 * Reads the actual original unredacted file bytes directly from the ContentResolver
 * stream, computes the authoritative SHA-256 of the original file, and extracts
 * authentic GPS coordinates.
 *
 * Identity rules (fail-closed):
 *   1. If `contentUri` is provided and is a MediaStore `content://media/...` URI,
 *      extract the MediaStore ID directly from it — no name/size query.
 *   2. If `fileName` is provided, query MediaStore with exact filename match AND
 *      disambiguate with fileSize and/or dimensions. Only one unambiguous match
 *      is accepted.
 *   3. If neither provides a conclusive match, return MEDIASTORE_ASSET_NOT_FOUND.
 *
 * REMOVED: the unsafe "recent 100 items" fallback that could associate metadata
 * from a completely different photo when identity cannot be proven.
 *
 * NOTE: Android Photo Picker URIs can use authorities other than `content://media/`.
 * For non-MediaStore authorities, JS should read the file via the picker copy path
 * and label the result as EXIF_PICKER_COPY.
 */
class MediaStoreResolverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "MediaStoreResolver"
    }

    @ReactMethod
    fun resolveOriginalMedia(
        contentUri: String?,   // Preferred: picker URI — direct ID extraction if content://media/
        fileName: String?,     // Fallback: display name for query-based matching
        fileSize: Double?,     // Disambiguation hint
        width: Double?,        // Disambiguation hint
        height: Double?,       // Disambiguation hint
        promise: Promise
    ) {
        try {
            val resolver = reactApplicationContext.contentResolver
            val collectionUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI

            // ── Strategy 1: Direct ID extraction from a content://media/... URI ──
            var matchedId: Long? = null
            var matchedDisplayName: String? = null
            var matchedSize: Long = 0L

            if (!contentUri.isNullOrEmpty()) {
                try {
                    val parsedUri = Uri.parse(contentUri)
                    val authority = parsedUri.authority ?: ""

                    if (authority == "media" || authority.startsWith("com.android.providers.media")) {
                        // MediaStore URI — extract ID from last path segment
                        val idFromUri = ContentUris.parseId(parsedUri)
                        if (idFromUri > 0) {
                            // Verify the ID exists in MediaStore
                            val verifyProjection = arrayOf(
                                MediaStore.Images.Media._ID,
                                MediaStore.Images.Media.DISPLAY_NAME,
                                MediaStore.Images.Media.SIZE,
                            )
                            val verifyCursor = resolver.query(
                                ContentUris.withAppendedId(collectionUri, idFromUri),
                                verifyProjection, null, null, null
                            )
                            verifyCursor?.use { c ->
                                if (c.moveToFirst()) {
                                    matchedId = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
                                    matchedDisplayName = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME))
                                    matchedSize = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE))
                                }
                            }
                        }
                    }
                    // else: non-MediaStore authority (e.g. com.google.android.apps.photos.contentprovider)
                    // We cannot safely extract a MediaStore ID — fall through to fileName strategy.
                } catch (uriEx: Exception) {
                    // Malformed URI or unsupported authority — fall through to fileName strategy
                    if (BuildConfig.DEBUG) android.util.Log.w("MediaStoreResolver", "URI parse/query failed: ${uriEx.message}")
                }
            }

            // ── Strategy 2: Exact filename match + disambiguation ──
            if (matchedId == null && !fileName.isNullOrEmpty()) {
                val projection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.SIZE,
                    MediaStore.Images.Media.WIDTH,
                    MediaStore.Images.Media.HEIGHT,
                    MediaStore.Images.Media.DATE_TAKEN
                )

                val selection = "${MediaStore.Images.Media.DISPLAY_NAME} = ?"
                val selectionArgs = arrayOf(fileName)
                val sortOrder = "${MediaStore.Images.Media.DATE_TAKEN} DESC, ${MediaStore.Images.Media._ID} DESC"

                val cursor = resolver.query(collectionUri, projection, selection, selectionArgs, sortOrder)
                var candidates = 0

                cursor?.use { c ->
                    val idCol    = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    val nameCol  = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                    val sizeCol  = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                    val widthCol = c.getColumnIndex(MediaStore.Images.Media.WIDTH)
                    val heightCol = c.getColumnIndex(MediaStore.Images.Media.HEIGHT)

                    while (c.moveToNext()) {
                        val id   = c.getLong(idCol)
                        val name = c.getString(nameCol)
                        val size = c.getLong(sizeCol)
                        val w    = if (widthCol != -1) c.getInt(widthCol) else 0
                        val h    = if (heightCol != -1) c.getInt(heightCol) else 0

                        var matches = true

                        // Disambiguate by size (tolerance 50 KB)
                        if (fileSize != null && fileSize > 0 && size > 0) {
                            if (Math.abs(size - fileSize.toLong()) > 51200) {
                                matches = false
                            }
                        }

                        // Disambiguate by dimensions
                        if (matches && width != null && width > 0 && height != null && height > 0 && w > 0 && h > 0) {
                            val ew = width.toInt()
                            val eh = height.toInt()
                            if (!(w == ew && h == eh || w == eh && h == ew)) {
                                matches = false
                            }
                        }

                        if (matches) {
                            candidates++
                            if (candidates == 1) {
                                matchedId = id
                                matchedDisplayName = name
                                matchedSize = size
                            } else {
                                // Ambiguous: multiple rows match the same filename + hints.
                                // Fail closed — we cannot safely identify which is the correct asset.
                                matchedId = null
                                matchedDisplayName = null
                                matchedSize = 0
                                break
                            }
                        }
                    }

                    if (candidates > 1) {
                        // Already nulled out above; confirm here
                        matchedId = null
                    }
                }
            }

            // ── REMOVED: unsafe "recent 100 items" fallback ──
            // The old code queried all recent images when filename matched nothing.
            // This could associate EXIF from a completely different photo.
            // If identity cannot be proven, we fail closed here.

            if (matchedId == null) {
                val result = Arguments.createMap()
                result.putBoolean("isOriginal", false)
                result.putString("reason", "MEDIASTORE_ASSET_NOT_FOUND")
                promise.resolve(result)
                return
            }

            // ── Read original stream with ACCESS_MEDIA_LOCATION ──
            val baseContentUri = ContentUris.withAppendedId(collectionUri, matchedId!!)
            val originalUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.setRequireOriginal(baseContentUri)
            } else {
                baseContentUri
            }

            val inputStream: InputStream? = resolver.openInputStream(originalUri)
            if (inputStream == null) {
                val result = Arguments.createMap()
                result.putBoolean("isOriginal", false)
                result.putString("reason", "CANNOT_OPEN_ORIGINAL_STREAM")
                promise.resolve(result)
                return
            }

            val digest = MessageDigest.getInstance("SHA-256")
            val buffer = ByteArray(8192)
            val headerBuffer = ByteArrayOutputStream(131072)
            var totalBytesRead: Long = 0L
            var read: Int

            inputStream.use { stream ->
                while (stream.read(buffer).also { read = it } != -1) {
                    digest.update(buffer, 0, read)
                    if (headerBuffer.size() < 131072) {
                        val toWrite = Math.min(read, 131072 - headerBuffer.size())
                        headerBuffer.write(buffer, 0, toWrite)
                    }
                    totalBytesRead += read
                }
            }

            val sha256Bytes = digest.digest()
            val sha256Hex = sha256Bytes.joinToString("") { "%02x".format(it) }
            val headerBase64 = Base64.encodeToString(headerBuffer.toByteArray(), Base64.NO_WRAP)

            // ── Extract native EXIF GPS from a fresh stream of the unredacted original URI ──
            var nativeLat: Double? = null
            var nativeLng: Double? = null
            var hasGps = false

            try {
                val exifStream = resolver.openInputStream(originalUri)
                exifStream?.use { es ->
                    val exifInterface = ExifInterface(es)
                    val latLong = FloatArray(2)
                    if (exifInterface.getLatLong(latLong)) {
                        val lat = latLong[0].toDouble()
                        val lng = latLong[1].toDouble()
                        if (lat != 0.0 && lng != 0.0 && !lat.isNaN() && !lng.isNaN() &&
                            Math.abs(lat) <= 90.0 && Math.abs(lng) <= 180.0) {
                            nativeLat = lat
                            nativeLng = lng
                            hasGps = true
                        }
                    }
                }
            } catch (exifErr: Exception) {
                // Non-fatal — JS binary parser can also parse headerBase64 (JPEG only)
            }

            val result: WritableMap = Arguments.createMap()
            result.putString("uri", originalUri.toString())
            result.putString("originalContentUri", originalUri.toString())
            result.putString("mediaStoreId", matchedId.toString())
            result.putString("displayName", matchedDisplayName ?: fileName ?: "")
            result.putDouble("fileSize", (if (matchedSize > 0) matchedSize else totalBytesRead).toDouble())
            result.putBoolean("isOriginal", true)
            result.putDouble("bytesRead", totalBytesRead.toDouble())
            result.putString("bytesBase64", headerBase64)
            result.putString("sha256", sha256Hex)
            result.putBoolean("gpsFound", hasGps)
            if (hasGps && nativeLat != null && nativeLng != null) {
                result.putDouble("latitude", nativeLat!!)
                result.putDouble("longitude", nativeLng!!)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            val result = Arguments.createMap()
            result.putBoolean("isOriginal", false)
            result.putString("reason", "MEDIASTORE_RESOLVER_EXCEPTION")
            result.putString("error", e.message ?: "Unknown error")
            promise.resolve(result)
        }
    }
}
