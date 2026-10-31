package lab2;

public class AreaChecker {
    public static boolean isHit(Point point) {
        double x = point.x();
        double y = point.y();
        double r = point.r();
        if (x <= 0 && y >= 0) return x * x + y * y <= r * r;
        if (x <= 0 && y <= 0) return x >= -r / 2 && y >= -r;
        if (x >= 0 && y <= 0) return x - y <= r / 2;
        return false;
    }
}
