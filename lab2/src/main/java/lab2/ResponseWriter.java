package lab2;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class ResponseWriter {
    private ResponseWriter() {
    }

    public static void sendResult(Point p, boolean hit, long time, long execMicros) {
        String body = String.format(Locale.ROOT,
                "{\"x\":%s,\"y\":%s,\"r\":%s,\"hit\":%b,\"time\":%d,\"exec\":%d}",
                p.x(), p.y(), p.r(), hit, time, execMicros);
        send(200, body);
    }

    public static void sendError(int code, String message) {
        String text = message == null ? "Ошибка" : message;
        send(code, "{\"error\":\"" + escape(text) + "\"}");
    }

    private static void send(int code, String body) {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String head = "HTTP/1.1 " + code + " " + reason(code) + "\r\n"
                + "Content-Type: application/json; charset=UTF-8\r\n"
                + "Content-Length: " + bytes.length + "\r\n\r\n";
        byte[] headBytes = head.getBytes(StandardCharsets.UTF_8);
        System.out.write(headBytes, 0, headBytes.length);
        System.out.write(bytes, 0, bytes.length);
        System.out.flush();
    }

    private static String reason(int code) {
        return switch (code) {
            case 200 -> "OK";
            case 400 -> "Bad Request";
            case 500 -> "Internal Server Error";
            default -> "Error";
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}