package lab2;

import java.util.logging.FileHandler;
import java.util.logging.Logger;
import java.util.logging.SimpleFormatter;

final class AppLog {
    private static final Logger ROOT = Logger.getLogger("lab2");

    private AppLog() {}

    static void init() {
        try {
            FileHandler fh = new FileHandler("server.log", true);
            fh.setFormatter(new SimpleFormatter());
            ROOT.addHandler(fh);
            ROOT.setUseParentHandlers(false);
        } catch (Exception ignored) {
        }
    }
}