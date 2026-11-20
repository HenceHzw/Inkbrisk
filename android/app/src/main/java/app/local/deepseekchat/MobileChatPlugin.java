package app.local.deepseekchat;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MobileChat")
public class MobileChatPlugin extends Plugin {
    private File pendingFile;

    @PluginMethod
    public void openExternal(PluginCall call) {
        Uri uri = Uri.parse(call.getString("url", "")).normalizeScheme();
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null) {
            call.reject("Invalid web address");
            return;
        }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
            call.resolve();
        } catch (android.content.ActivityNotFoundException error) {
            call.reject("No browser is available");
        }
    }

    @PluginMethod
    public void setWindowColor(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark"));
        getBridge().executeOnMainThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(dark ? 0xff151517 : 0xfffaf8f4);
            call.resolve();
        });
    }

    @PluginMethod
    public void choosePhoto(PluginCall call) {
        if ("camera".equals(call.getString("source"))) {
            openCamera(call);
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                try {
                    startActivityForResult(call, new Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*"), "onPhotoResult");
                    return;
                } catch (ActivityNotFoundException ignored) {
                    // Use the system document picker on devices without the photo picker.
                }
            }
            Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("image/*");
            startActivityForResult(call, picker, "onPhotoResult");
        } catch (ActivityNotFoundException error) {
            call.reject("No photo picker is installed");
        }
    }

    private void openCamera(PluginCall call) {
        File capture = null;
        try {
            capture = newCapture(".jpg");
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", capture);
            call.getData().put("captureName", capture.getName());
            Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            camera.setClipData(ClipData.newRawUri("Camera output", uri));
            startActivityForResult(call, camera, "onPhotoResult");
        } catch (ActivityNotFoundException | IOException | SecurityException error) {
            if (capture != null) capture.delete();
            call.reject("Could not open the camera");
        }
    }

    @ActivityCallback
    private void onPhotoResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String captureName = call.getString("captureName");
        File capture = captureName == null ? null : photoFile(captureName);
        if (result.getResultCode() != Activity.RESULT_OK) {
            if (capture != null) capture.delete();
            call.resolve(new JSObject());
            return;
        }
        if (capture != null) {
            resolvePhoto(call, capture, "image/jpeg");
        } else if (result.getData() != null && result.getData().getData() != null) {
            Uri uri = result.getData().getData();
            getBridge().execute(() -> copyGalleryPhoto(call, uri));
        } else {
            call.reject("No photo was returned");
        }
    }

    private void copyGalleryPhoto(PluginCall call, Uri uri) {
        File copy = null;
        try {
            String mime = getContext().getContentResolver().getType(uri);
            String extension = switch (mime == null ? "" : mime) {
                case "image/jpeg" -> ".jpg";
                case "image/png" -> ".png";
                case "image/gif" -> ".gif";
                case "image/webp" -> ".webp";
                default -> null;
            };
            if (extension == null) {
                call.reject("Unsupported photo format", "PHOTO_FORMAT");
                return;
            }
            copy = newCapture(extension);
            try (InputStream input = getContext().getContentResolver().openInputStream(uri);
                 OutputStream output = new FileOutputStream(copy)) {
                if (input == null) throw new IOException("No image input stream");
                byte[] buffer = new byte[64 * 1024];
                int count;
                long total = 0;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > 64L * 1024 * 1024) {
                        copy.delete();
                        call.reject("Photo is larger than 64 MB", "PHOTO_SIZE");
                        return;
                    }
                    output.write(buffer, 0, count);
                }
            }
            resolvePhoto(call, copy, mime);
        } catch (IOException | SecurityException error) {
            if (copy != null) copy.delete();
            call.reject("Could not read the photo");
        }
    }

    private File newCapture(String extension) throws IOException {
        File folder = new File(getContext().getCacheDir(), "photos");
        if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("No photo cache");
        return File.createTempFile("photo-", extension, folder);
    }

    private File photoFile(String name) {
        if (!name.matches("photo-[0-9]+\\.(jpg|png|gif|webp)")) return null;
        return new File(new File(getContext().getCacheDir(), "photos"), name);
    }

    private void resolvePhoto(PluginCall call, File file, String mime) {
        if (file.length() > 64L * 1024 * 1024) {
            file.delete();
            call.reject("Photo is larger than 64 MB", "PHOTO_SIZE");
        } else if (file.length() == 0) {
            file.delete();
            call.reject("The photo is empty");
        } else {
            call.resolve(new JSObject().put("name", file.getName()).put("path", file.getAbsolutePath()).put("mime", mime));
        }
    }

    @PluginMethod
    public void discardPhoto(PluginCall call) {
        File file = photoFile(call.getString("name", ""));
        if (file != null) file.delete();
        call.resolve();
    }

    @PluginMethod
    public void beginFile(PluginCall call) {
        if (pendingFile != null) {
            call.reject("A file is already being saved");
            return;
        }
        File file = new File(getContext().getCacheDir(), "pending-export");
        try (FileOutputStream ignored = new FileOutputStream(file)) {
            pendingFile = file;
            call.resolve();
        } catch (IOException error) {
            call.reject("Could not prepare the file");
        }
    }

    @PluginMethod
    public void appendFile(PluginCall call) {
        if (pendingFile == null) {
            call.reject("No file is being saved");
            return;
        }
        try (FileOutputStream output = new FileOutputStream(pendingFile, true)) {
            output.write(decode(call.getString("data", "")));
        } catch (IOException | IllegalArgumentException error) {
            call.reject("Could not prepare the file");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        if (pendingFile == null) {
            call.reject("No file is being saved");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(call.getString("mime", "application/octet-stream"))
            .putExtra(Intent.EXTRA_TITLE, call.getString("name", "download"));
        try {
            startActivityForResult(call, intent, "saveResult");
        } catch (android.content.ActivityNotFoundException error) {
            call.reject("No system file picker is available");
        }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri destination = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || destination == null) {
            call.resolve();
            return;
        }
        File file = pendingFile;
        if (file == null) {
            call.reject("The file is no longer available");
            return;
        }
        getBridge().execute(() -> {
            try (FileInputStream input = new FileInputStream(file);
                 OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
                if (output == null) throw new IOException("No output stream");
                byte[] buffer = new byte[64 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            } catch (IOException | SecurityException error) {
                try {
                    android.provider.DocumentsContract.deleteDocument(getContext().getContentResolver(), destination);
                } catch (Exception ignored) {
                    // The provider may not support deletion.
                }
                call.reject("Could not write the file");
                return;
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void discardFile(PluginCall call) {
        if (pendingFile != null) {
            pendingFile.delete();
            pendingFile = null;
        }
        call.resolve();
    }

    private static byte[] decode(String data) {
        return Base64.decode(data, Base64.NO_WRAP);
    }

    private static String encode(byte[] data) {
        return Base64.encodeToString(data, Base64.NO_WRAP);
    }
}
