package cc.kmguard.sdk.internal;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class JVMGuard {

    private static final Set<String> BANNED_AGENTS = new HashSet<>(Arrays.asList(
            "jvmti", "jdwp", "dt_socket", "dt_shmem",
            "instrument", "javaagent", "profile", "async-profiler",
            "honest-profiler", "yourkit", "jprofiler", "visualvm"
    ));

    private static final Set<String> BANNED_PROPS = new HashSet<>(Arrays.asList(
            "sun.jvm.hotspot", "com.sun.management.jmxremote"
    ));

    private JVMGuard() {}

    public static void check() {
        checkJVMArgs();
        checkSystemProps();
        checkDebugPort();
    }

    private static void checkJVMArgs() {
        RuntimeMXBean rb = ManagementFactory.getRuntimeMXBean();
        List<String> args = rb.getInputArguments();
        for (String arg : args) {
            String lower = arg.toLowerCase();
            for (String banned : BANNED_AGENTS) {
                if (lower.contains(banned)) {
                    terminate("jvm_agent_detected", arg);
                    return;
                }
            }
        }
    }

    private static void checkSystemProps() {
        for (String prop : BANNED_PROPS) {
            if (System.getProperty(prop) != null) {
                terminate("jvm_agent_detected", prop);
                return;
            }
        }
    }

    private static void checkDebugPort() {
        RuntimeMXBean rb = ManagementFactory.getRuntimeMXBean();
        for (String arg : rb.getInputArguments()) {
            if (arg.contains("-agentlib:jdwp") || arg.contains("-Xdebug")
                    || arg.contains("-Xrunjdwp")) {
                terminate("debugger_detected", arg);
                return;
            }
        }
    }

    /**
     * Called at runtime by HeartbeatTask.
     * Returns event type string or null if clean.
     */
    public static String scan() {
        RuntimeMXBean rb = ManagementFactory.getRuntimeMXBean();
        for (String arg : rb.getInputArguments()) {
            String lower = arg.toLowerCase();
            for (String banned : BANNED_AGENTS) {
                if (lower.contains(banned)) return "jvm_agent_detected";
            }
            if (arg.contains("-agentlib:jdwp") || arg.contains("-Xdebug")) {
                return "debugger_detected";
            }
        }
        return null;
    }

    private static void terminate(String reason, String detail) {
        Runtime.getRuntime().halt(0xDEAD);
    }
}