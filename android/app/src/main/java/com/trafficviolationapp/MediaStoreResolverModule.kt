package com.trafficviolationapp

import android.content.ContentUris
import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * Reads only an exactly identified selected asset. Filename, size, dimensions,
 * and Photo Picker opaque IDs cannot establish MediaStore identity.
 */
class MediaStoreResolverModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val executor = Executors.newSingleThreadExecutor()
    private var pickerPromise: Promise? = null
    private val pickerRequest = 48291
    private val activityListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != pickerRequest) return
            val promise = pickerPromise ?: return
            pickerPromise = null
            val uri = data?.data
            if (resultCode != Activity.RESULT_OK || uri == null) { promise.resolve(null); return }
            // Retain ONLY the user's selected document, not a broad storage grant.
            try { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            catch (_: Exception) { /* transient activity grant remains valid */ }
            executor.execute {
                var copy: File? = null
                try {
                    val resolver = context.contentResolver
                    val mime = resolver.getType(uri) ?: "image/jpeg"
                    if (!mime.startsWith("image/")) throw IllegalArgumentException("image required")
                    var name: String? = null
                    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                        if (it.moveToFirst()) name = it.getString(0)
                    }
                    copy = File.createTempFile("evidence-", if (mime == "image/png") ".png" else ".jpg", context.cacheDir)
                    val file = copy!!
                    resolver.openInputStream(uri)?.use { input ->
                        file.outputStream().use { output ->
                            val buffer = ByteArray(16384)
                            var total = 0L
                            while (true) {
                                val count = input.read(buffer)
                                if (count < 0) break
                                total += count
                                if (total > 25L * 1024 * 1024) throw IllegalArgumentException("image too large")
                                output.write(buffer, 0, count)
                            }
                        }
                    } ?: throw IllegalStateException("unreadable document")
                    val dimensions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(file.absolutePath, dimensions)
                    promise.resolve(Arguments.createMap().apply {
                        putString("uri", Uri.fromFile(file).toString())
                        putString("sourceUri", uri.toString())
                        putString("assetId", exactMediaUri(uri.toString())?.lastPathSegment)
                        putString("mimeType", mime)
                        putString("fileName", name)
                        putDouble("fileSize", file.length().toDouble())
                        putInt("width", dimensions.outWidth)
                        putInt("height", dimensions.outHeight)
                    })
                } catch (_: Exception) {
                    copy?.delete() // Only our newly created temporary copy.
                    promise.reject("IMAGE_DOCUMENT_READ_FAILED", "The selected image could not be read.")
                }
            }
        }
    }
    init { context.addActivityEventListener(activityListener) }
    override fun getName() = "MediaStoreResolver"
    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(activityListener)
        pickerPromise?.reject("PICKER_CLOSED", "The image picker was closed.")
        pickerPromise = null
        executor.shutdown(); super.invalidate()
    }

    @ReactMethod
    fun pickOriginalImage(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val activity = reactApplicationContext.currentActivity
            if (activity == null || pickerPromise != null) {
                promise.reject("PICKER_UNAVAILABLE", "The image picker is unavailable.")
            } else {
                pickerPromise = promise
                try {
                    // ACTION_GET_CONTENT can be rerouted through Photo Picker on
                    // newer Android versions. OPEN_DOCUMENT retains source identity.
                    activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                        putExtra(Intent.EXTRA_LOCAL_ONLY, true)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                    }, pickerRequest)
                } catch (_: Exception) {
                    pickerPromise = null
                    promise.reject("PICKER_UNAVAILABLE", "The image picker is unavailable.")
                }
            }
        }
    }

    @ReactMethod
    fun resolveOriginalMedia(contentUri: String?, fileName: String?, fileSize: Double?, width: Double?, height: Double?, promise: Promise) {
        executor.execute {
            try { promise.resolve(readOriginal(contentUri)) }
            catch (_: SecurityException) { promise.resolve(failure("ORIGINAL_PERMISSION_DENIED")) }
            catch (_: UnsupportedOperationException) { promise.resolve(failure("ORIGINAL_METADATA_INACCESSIBLE")) }
            catch (_: Exception) { promise.resolve(failure("ORIGINAL_READ_FAILED")) }
        }
    }

    private fun failure(reason: String) = Arguments.createMap().apply {
        putBoolean("isOriginal", false)
        putString("reason", reason)
    }

    internal fun exactMediaUri(value: String?): Uri? {
        val uri = value?.let { Uri.parse(it) } ?: return null
        if (uri.scheme != "content") return null
        // Preserve the volume and query. A picker URI ending in digits is NOT
        // necessarily a local MediaStore row.
        if (uri.authority == "media" && Regex("^/[^/]+/images/media/[0-9]+$").matches(uri.path ?: "")) return uri
        if (uri.authority == "com.android.providers.media.documents") {
            val id = DocumentsContract.getDocumentId(uri)
            if (!Regex("^image:[0-9]+$").matches(id)) return null
            return ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.substringAfter(":").toLong())
        }
        return null
    }

    internal fun readOriginal(value: String?) : com.facebook.react.bridge.WritableMap {
        val selectedUri = exactMediaUri(value) ?: return failure("ORIGINAL_IDENTITY_UNAVAILABLE")
        val resolver = reactApplicationContext.contentResolver
        val originalUri = if (Build.VERSION.SDK_INT >= 29) MediaStore.setRequireOriginal(selectedUri) else selectedUri
        val header = ByteArrayOutputStream()
        val digest = MessageDigest.getInstance("SHA-256")
        var size = 0L
        resolver.openInputStream(originalUri)?.use { stream ->
            val buffer = ByteArray(16384)
            while (true) {
                val count = stream.read(buffer)
                if (count < 0) break
                size += count
                if (size > 25L * 1024 * 1024) return failure("FILE_TOO_LARGE")
                digest.update(buffer, 0, count)
                if (header.size() < 1024 * 1024) header.write(buffer, 0, minOf(count, 1024 * 1024 - header.size()))
            }
        } ?: return failure("ORIGINAL_READ_FAILED")
        // Native format support (including HEIC/PNG). Send raw GPS rationals to
        // the shared strict JS converter, avoiding platform float precision loss.
        val exif = Arguments.createMap()
        try {
            resolver.openInputStream(originalUri)?.use { stream ->
                val reader = ExifInterface(stream)
                for (tag in arrayOf("GPSLatitude", "GPSLongitude", "GPSLatitudeRef", "GPSLongitudeRef", "Make", "DateTime")) {
                    reader.getAttribute(tag)?.let { exif.putString(tag, it) }
                }
            }
        } catch (_: Exception) { /* JPEG byte parser still reports corrupt metadata. */ }
        return Arguments.createMap().apply {
            putBoolean("isOriginal", true)
            putString("uri", originalUri.toString())
            putString("originalContentUri", originalUri.toString())
            putString("mediaStoreId", selectedUri.lastPathSegment)
            putDouble("fileSize", size.toDouble())
            putDouble("bytesRead", size.toDouble())
            putString("bytesBase64", Base64.encodeToString(header.toByteArray(), Base64.NO_WRAP))
            putString("sha256", digest.digest().joinToString("") { "%02x".format(it) })
            putMap("exif", exif)
        }
    }
}
