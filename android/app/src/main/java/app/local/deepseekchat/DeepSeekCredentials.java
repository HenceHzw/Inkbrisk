package app.local.deepseekchat;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class DeepSeekCredentials {
    // Keep the alias and preference format so existing installations can still read their Key.
    private static final String ALIAS = "mobile-chat-api-key";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private final SharedPreferences preferences;

    DeepSeekCredentials(Context context) {
        preferences = context.getSharedPreferences("mobile-chat-credentials", Context.MODE_PRIVATE);
    }

    String read() throws GeneralSecurityException, IOException {
        String encrypted = preferences.getString("key", null);
        if (encrypted == null) return null;
        String[] parts = encrypted.split(":", 2);
        if (parts.length != 2) throw new GeneralSecurityException("Invalid saved credential");
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(false), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    synchronized void save(String value) throws GeneralSecurityException, IOException {
        SharedPreferences.Editor editor = preferences.edit();
        if (value == null) {
            editor.remove("key");
        } else {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey(true));
            String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
            String encrypted = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            editor.putString("key", iv + ":" + encrypted);
        }
        if (!editor.commit()) throw new IOException("Could not update credentials");
    }

    private SecretKey encryptionKey(boolean create) throws GeneralSecurityException, IOException {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.getKey(ALIAS, null) instanceof SecretKey existing) return existing;
        if (!create) throw new GeneralSecurityException("Credential encryption key is unavailable");
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }
}
