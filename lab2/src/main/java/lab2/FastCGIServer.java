package lab2;

import com.fastcgi.FCGIInterface;

import java.util.logging.Level;
import java.util.logging.Logger;

public class FastCGIServer {
    private static final Logger LOG = Logger.getLogger(FastCGIServer.class.getName());

    public static void main(String[] args) {
        AppLog.init();
        FCGIInterface fcgi = new FCGIInterface();
        while (fcgi.FCGIaccept() >= 0) {
            long start = System.nanoTime();
            try {
                String query = FCGIInterface.request.params.getProperty("QUERY_STRING");
                LOG.info("запрос: " + query);
                Point p = RequestParser.parse(query);
                boolean hit = AreaChecker.isHit(p);
                long execMicros = (System.nanoTime() - start) / 1000;
                ResponseWriter.sendResult(p, hit, System.currentTimeMillis(), execMicros);
                LOG.info("ответ: hit=" + hit + ", " + execMicros + " мкс");
            } catch (IllegalArgumentException e) {
                LOG.warning("отклонён: " + e.getMessage());
                ResponseWriter.sendError(400, e.getMessage());
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "сбой", e);
                ResponseWriter.sendError(500, "Внутренняя ошибка сервера");
            }
        }
    }
}