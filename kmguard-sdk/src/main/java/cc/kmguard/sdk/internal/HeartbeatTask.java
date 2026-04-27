package cc.kmguard.sdk.internal;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public final class HeartbeatTask {

    private final Transport            transport;
    private final int                  intervalSec;
    private final Runnable             onFail;
    private final ScheduledExecutorService scheduler;
    private final AtomicBoolean        running = new AtomicBoolean(false);

    public HeartbeatTask(Transport transport, int intervalSec, Runnable onFail) {
        this.transport   = transport;
        this.intervalSec = intervalSec;
        this.onFail      = onFail;
        this.scheduler   = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "kmg-hb");
            t.setDaemon(true);
            return t;
        });
    }

    public void start() {
        if (!running.compareAndSet(false, true)) return;
        scheduler.scheduleAtFixedRate(this::tick, intervalSec, intervalSec, TimeUnit.SECONDS);
    }

    public void stop() {
        running.set(false);
        scheduler.shutdownNow();
        transport.terminate();
    }

    private void tick() {
        try {
            String jvmEvent = JVMGuard.scan();
            if (jvmEvent != null) {
                transport.reportEvent(jvmEvent, null);
                onFail.run();
                stop();
                return;
            }

            boolean alive = transport.heartbeat();
            if (!alive) {
                onFail.run();
                stop();
            }
        } catch (Exception e) {
            onFail.run();
            stop();
        }
    }
}