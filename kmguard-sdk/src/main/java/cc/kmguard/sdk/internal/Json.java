package cc.kmguard.sdk.internal;

import java.util.HashMap;
import java.util.Map;

/**
 * Minimal JSON parser/builder — no external dependencies.
 */
public final class Json {
    private Json() {}

    public static String get(String json, String key) {
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx == -1) return null;
        int colon = json.indexOf(':', idx + search.length());
        if (colon == -1) return null;
        int start = colon + 1;
        while (start < json.length() && json.charAt(start) == ' ') start++;
        if (start >= json.length()) return null;

        char first = json.charAt(start);
        if (first == '"') {
            int end = json.indexOf('"', start + 1);
            if (end == -1) return null;
            return json.substring(start + 1, end);
        } else {
            int end = start;
            while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
            return json.substring(start, end).trim();
        }
    }

    public static String build(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : fields.entrySet()) {
            if (!first) sb.append(',');
            sb.append('"').append(e.getKey()).append("\":\"").append(e.getValue()).append('"');
            first = false;
        }
        sb.append('}');
        return sb.toString();
    }

    public static Map<String, String> parse(String json) {
        Map<String, String> result = new HashMap<>();
        int i = 0;
        while (i < json.length()) {
            int ks = json.indexOf('"', i);
            if (ks == -1) break;
            int ke = json.indexOf('"', ks + 1);
            if (ke == -1) break;
            String key = json.substring(ks + 1, ke);
            int colon = json.indexOf(':', ke + 1);
            if (colon == -1) break;
            int vs = colon + 1;
            while (vs < json.length() && json.charAt(vs) == ' ') vs++;
            String value;
            if (vs < json.length() && json.charAt(vs) == '"') {
                int ve = json.indexOf('"', vs + 1);
                if (ve == -1) break;
                value = json.substring(vs + 1, ve);
                i = ve + 1;
            } else {
                int ve = vs;
                while (ve < json.length() && json.charAt(ve) != ',' && json.charAt(ve) != '}') ve++;
                value = json.substring(vs, ve).trim();
                i = ve + 1;
            }
            result.put(key, value);
        }
        return result;
    }
}