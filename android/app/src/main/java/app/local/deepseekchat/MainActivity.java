package app.local.deepseekchat;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(MobileChatPlugin.class);
        registerPlugin(DeepSeekApiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
