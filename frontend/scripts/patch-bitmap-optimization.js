const fs = require('fs');
const path = require('path');

function patchFile(filePath, searchStr, replaceStr, desc) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch] File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch] Applied ${desc}`);
  } else {
    console.log(`[patch] Already patched or pattern not found: ${desc}`);
  }
}

// 1. expo-notifications DownloadImage.kt
const notifFile = path.join(
  __dirname,
  '../node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/DownloadImage.kt'
);

const notifTarget = `BitmapFactory.decodeStream(connection.inputStream)`;
const notifReplacement = `val bytes = connection.getInputStream().use { it.readBytes() }
        if (bytes.isEmpty()) return@withContext null

        val boundsOptions = BitmapFactory.Options().apply {
          inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)

        val maxDim = 512
        var sampleSize = 1
        if (boundsOptions.outHeight > maxDim || boundsOptions.outWidth > maxDim) {
          val largestDim = max(boundsOptions.outHeight, boundsOptions.outWidth)
          while ((largestDim / sampleSize) > maxDim) {
            sampleSize *= 2
          }
        }

        val decodeOptions = BitmapFactory.Options().apply {
          inSampleSize = sampleSize
          inPreferredConfig = Bitmap.Config.RGB_565
        }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)`;

// 2. expo-audio AudioControlsService.kt
const audioFile = path.join(
  __dirname,
  '../node_modules/expo-audio/android/src/main/java/expo/modules/audio/service/AudioControlsService.kt'
);

const audioTarget = `val inputStream = url.openConnection().getInputStream()
          val bitmap = BitmapFactory.decodeStream(inputStream)`;
const audioReplacement = `val connection = url.openConnection()
          connection.connectTimeout = 8000
          connection.readTimeout = 8000
          val bytes = connection.getInputStream().use { it.readBytes() }
          if (bytes.isEmpty()) {
            if (isActive) callback(null)
            return@launch
          }

          val boundsOptions = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
          }
          BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)

          val maxDim = 512
          var sampleSize = 1
          if (boundsOptions.outHeight > maxDim || boundsOptions.outWidth > maxDim) {
            val largestDim = kotlin.math.max(boundsOptions.outHeight, boundsOptions.outWidth)
            while ((largestDim / sampleSize) > maxDim) {
              sampleSize *= 2
            }
          }

          val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.RGB_565
          }
          val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)`;

patchFile(notifFile, notifTarget, notifReplacement, 'expo-notifications bitmap downsampling');
patchFile(audioFile, audioTarget, audioReplacement, 'expo-audio bitmap downsampling');
