package lab2;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

public final class RequestParser {
    private static final double[] X_VALUES = {-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2};
    private static final double Y_MIN = -5;
    private static final double Y_MAX = 3;
    private static final double R_MIN = 1;
    private static final double R_MAX = 4;
    private static final Pattern NUMBER = Pattern.compile("[-+]?\\d{1,2}(\\.\\d{1,10})?");

    private RequestParser() {
    }

    public static Point parse(String query) {
        Map<String, String> params = parseQuery(query);

        double x = readNumber(params, "x");
        double y = readNumber(params, "y");
        double r = readNumber(params, "r");

        if (!isAllowedX(x)) {
            throw new IllegalArgumentException("X вне допустимых значений");
        }
        if (!(y > Y_MIN && y < Y_MAX)) {
            throw new IllegalArgumentException("Y должен быть в интервале (" + Y_MIN + ", " + Y_MAX + ")");
        }
        if (!(r > R_MIN && r < R_MAX)) {
            throw new IllegalArgumentException("R должен быть в интервале (" + R_MIN + ", " + R_MAX + ")");
        }
        return new Point(x, y, r);
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isBlank()) {
            return map;
        }
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private static double readNumber(Map<String, String> params, String name) {
        String raw = params.get(name);
        if (raw == null) {
            throw new IllegalArgumentException("Не передан параметр " + name.toUpperCase());
        }
        String s = raw.trim();
        if (!NUMBER.matcher(s).matches()) {
            throw new IllegalArgumentException("Параметр " + name.toUpperCase() + " должен быть числом");
        }
        return Double.parseDouble(s);
    }

    private static boolean isAllowedX(double x) {
        for (double v : X_VALUES) {
            if (v == x) return true;
        }
        return false;
    }
}