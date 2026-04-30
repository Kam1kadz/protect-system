package cc.kmguard.sdk;

public final class KMGuardException extends RuntimeException {
    public KMGuardException(String msg) {
        super(msg);
    }
    public KMGuardException(String msg, Throwable cause) {
        super(msg, cause);
    }
}