package app.local.deepseekchat;

import android.os.Build;
import android.text.InputType;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.GeneralSecurityException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "DeepSeekApi")
public class DeepSeekApiPlugin extends Plugin {
    private static final String ORIGIN = "https://api.deepseek.com";
    private static final long MAX_BODY = 105L * 1024 * 1024;
    private final ConcurrentHashMap<String, Exchange> exchanges = new ConcurrentHashMap<>();
    private final ExecutorService network = Executors.newFixedThreadPool(8);
    private final ExecutorService cleanup = Executors.newCachedThreadPool();
    private DeepSeekCredentials credentials;
    private File bodyDirectory;
    private AlertDialog credentialDialog;

    @Override
    public void load() {
        credentials = new DeepSeekCredentials(getContext());
        bodyDirectory = new File(getContext().getCacheDir(), "api-bodies");
        File[] abandoned = bodyDirectory.listFiles();
        if (abandoned != null) {
            for (File file : abandoned) file.delete();
        }
    }

    @PluginMethod
    public void hasKey(PluginCall call) {
        try {
            call.resolve(new JSObject().put("configured", credentials.read() != null));
        } catch (IOException | GeneralSecurityException | IllegalArgumentException error) {
            call.reject("Could not read the saved API Key");
        }
    }

    @PluginMethod
    public void clearKey(PluginCall call) {
        try {
            credentials.save(null);
            call.resolve();
        } catch (IOException | GeneralSecurityException error) {
            call.reject("Could not clear the API Key");
        }
    }

    @PluginMethod
    public void configureKey(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            if (credentialDialog != null) {
                call.resolve(new JSObject().put("saved", false));
                return;
            }
            EditText input = new EditText(getActivity());
            input.setSingleLine(true);
            input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            input.setImeOptions(android.view.inputmethod.EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING);
            input.setHint(call.getString("hint"));
            input.setFilterTouchesWhenObscured(true);
            if (Build.VERSION.SDK_INT >= 26) input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
            if (Build.VERSION.SDK_INT >= 34) input.setAccessibilityDataSensitive(View.ACCESSIBILITY_DATA_SENSITIVE_YES);
            FrameLayout container = new FrameLayout(getActivity());
            int padding = (int) (24 * getContext().getResources().getDisplayMetrics().density);
            container.setPadding(padding, 0, padding, 0);
            container.addView(input, new FrameLayout.LayoutParams(-1, -2));
            AlertDialog dialog = new AlertDialog.Builder(getActivity())
                .setTitle(call.getString("title"))
                .setView(container)
                .setNegativeButton(call.getString("cancel"), null)
                .setPositiveButton(call.getString("confirm"), null)
                .create();
            credentialDialog = dialog;
            boolean[] saved = { false };
            dialog.setOnDismissListener(ignored -> {
                input.getText().clear();
                credentialDialog = null;
                call.resolve(new JSObject().put("saved", saved[0]));
            });
            if (dialog.getWindow() != null) {
                dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                if (Build.VERSION.SDK_INT >= 31) dialog.getWindow().setHideOverlayWindows(true);
            }
            dialog.show();
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setFilterTouchesWhenObscured(true);
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(ignored -> {
                String value = input.getText().toString().trim();
                if (!value.matches("[!-~]{1,512}")) {
                    input.setError(call.getString("invalid"));
                    return;
                }
                input.setEnabled(false);
                dialog.setCancelable(false);
                dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(false);
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
                network.execute(() -> {
                    String error = checkAndSave(value, call);
                    getBridge().executeOnMainThread(() -> {
                        if (!dialog.isShowing()) return;
                        if (error == null) {
                            saved[0] = true;
                            dialog.dismiss();
                        } else {
                            input.setEnabled(true);
                            dialog.setCancelable(true);
                            dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(true);
                            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                            input.setError(error);
                        }
                    });
                });
            });
        });
    }

    private String checkAndSave(String key, PluginCall call) {
        HttpURLConnection connection = null;
        try {
            connection = connect("/models", "GET", key);
            connection.setReadTimeout(15000);
            int status = connection.getResponseCode();
            if (status == 401 || status == 403) return call.getString("invalid");
            if (status != 200) return call.getString("unavailable");
            credentials.save(key);
            return null;
        } catch (IOException | GeneralSecurityException error) {
            return call.getString("unavailable");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    @PluginMethod
    public void begin(PluginCall call) {
        String id = call.getString("id", "");
        if (!id.matches("[a-f0-9-]{36}") || exchanges.size() >= 32 || exchanges.putIfAbsent(id, new Exchange()) != null) {
            call.reject("Invalid request or too many requests");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void append(PluginCall call) {
        Exchange exchange = exchanges.get(call.getString("id", ""));
        String data = call.getString("data", "");
        if (exchange == null || exchange.started || data.length() > 90_000) {
            call.reject("Invalid request body");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            if (exchange.body == null) {
                if (!bodyDirectory.isDirectory() && !bodyDirectory.mkdirs()) throw new IOException();
                exchange.body = File.createTempFile("request-", ".bin", bodyDirectory);
            }
            if (exchange.body.length() + bytes.length > MAX_BODY) throw new IOException();
            try (FileOutputStream output = new FileOutputStream(exchange.body, true)) {
                output.write(bytes);
            }
            call.resolve();
        } catch (IOException | IllegalArgumentException error) {
            call.reject("Could not prepare the request body");
        }
    }

    @PluginMethod
    public void open(PluginCall call) {
        String id = call.getString("id", "");
        Exchange exchange = exchanges.get(id);
        String method = call.getString("method", "");
        String path = call.getString("path", "");
        if (exchange == null || exchange.started || !isAllowed(path, method)) {
            call.reject("Unsupported DeepSeek request");
            return;
        }
        exchange.started = true;
        network.execute(() -> {
            try {
                String key = credentials.read();
                if (key == null) {
                    closeExchange(id);
                    call.resolve(new JSObject().put("status", 401));
                    return;
                }
                HttpURLConnection connection = connect(path, method, key);
                exchange.connection = connection;
                if (exchange.closed) {
                    connection.disconnect();
                    call.reject("Request cancelled");
                    return;
                }
                if (path.equals("/anthropic/v1/messages")) {
                    connection.setRequestProperty("Accept", "text/event-stream");
                    if (Boolean.TRUE.equals(call.getBoolean("filesBeta"))) {
                        connection.setRequestProperty("anthropic-beta", "files-api-2025-04-14");
                    }
                }
                if (method.equals("POST")) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", call.getString("contentType", "application/json"));
                    connection.setFixedLengthStreamingMode(exchange.body == null ? 0 : exchange.body.length());
                    try (OutputStream output = connection.getOutputStream()) {
                        if (exchange.body != null) {
                            try (FileInputStream input = new FileInputStream(exchange.body)) {
                                copy(input, output);
                            }
                        }
                    } finally {
                        if (exchange.body != null) exchange.body.delete();
                    }
                }
                int status = connection.getResponseCode();
                InputStream response = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                exchange.response = response;
                if (exchange.closed) {
                    connection.disconnect();
                    if (response != null) response.close();
                    call.reject("Request cancelled");
                    return;
                }
                call.resolve(new JSObject().put("status", status).put("contentType", connection.getContentType()));
            } catch (IOException | GeneralSecurityException | IllegalArgumentException error) {
                closeExchange(id);
                call.reject("DeepSeek request failed");
            }
        });
    }

    @PluginMethod
    public void read(PluginCall call) {
        String id = call.getString("id", "");
        Exchange exchange = exchanges.get(id);
        if (exchange == null) {
            call.resolve(new JSObject().put("done", true));
            return;
        }
        network.execute(() -> {
            try {
                byte[] data = new byte[16 * 1024];
                int size = exchange.response == null ? -1 : exchange.response.read(data);
                if (size < 0) {
                    closeExchange(id);
                    call.resolve(new JSObject().put("done", true));
                } else {
                    call.resolve(new JSObject().put("data", Base64.encodeToString(data, 0, size, Base64.NO_WRAP)));
                }
            } catch (IOException error) {
                closeExchange(id);
                call.reject("DeepSeek response was interrupted");
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        closeExchange(call.getString("id", ""));
        call.resolve();
    }

    private static boolean isAllowed(String path, String method) {
        return switch (method) {
            case "GET" -> path.equals("/models") || path.matches("/files\\?limit=50&order=desc(&after=file-api-[A-Za-z0-9_-]+)?");
            case "POST" -> path.equals("/anthropic/v1/messages") || path.equals("/files")
                || path.equals("/v1/tools/asr") || path.equals("/v1/tools/tts");
            case "DELETE" -> path.matches("/files/file-api-[A-Za-z0-9_-]+");
            default -> false;
        };
    }

    private static HttpURLConnection connect(String path, String method, String key) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(ORIGIN + path).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(180000);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Authorization", "Bearer " + key);
        return connection;
    }

    private static void copy(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        int size;
        while ((size = input.read(buffer)) != -1) output.write(buffer, 0, size);
    }

    private synchronized void closeExchange(String id) {
        Exchange exchange = exchanges.remove(id);
        if (exchange == null) return;
        exchange.closed = true;
        if (exchange.body != null) exchange.body.delete();
        cleanup.execute(() -> {
            if (exchange.connection != null) exchange.connection.disconnect();
            if (exchange.response != null) {
                try { exchange.response.close(); } catch (IOException ignored) {}
            }
        });
    }

    @Override
    protected synchronized void handleOnDestroy() {
        exchanges.keySet().forEach(this::closeExchange);
        network.shutdownNow();
        cleanup.shutdown();
        if (credentialDialog != null) credentialDialog.dismiss();
    }

    private static final class Exchange {
        boolean started;
        volatile File body;
        volatile HttpURLConnection connection;
        volatile InputStream response;
        volatile boolean closed;
    }
}
