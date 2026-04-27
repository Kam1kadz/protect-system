package cc.kmguard.sdk;

public final class UserInfo {
    private final String userId;
    private final String username;
    private final String role;
    private final String planName;
    private final String planDisplayName;
    private final long   licenseExpiry;

    public UserInfo(String userId, String username, String role,
                    String planName, String planDisplayName, long licenseExpiry) {
        this.userId          = userId;
        this.username        = username;
        this.role            = role;
        this.planName        = planName;
        this.planDisplayName = planDisplayName;
        this.licenseExpiry   = licenseExpiry;
    }

    public String getUserId()          { return userId; }
    public String getUsername()        { return username; }
    public String getRole()            { return role; }
    public String getPlan()            { return planName; }
    public String getPlanDisplayName() { return planDisplayName; }
    public long   getExpiryEpoch()     { return licenseExpiry; }
    public boolean isExpired()         { return System.currentTimeMillis() / 1000L > licenseExpiry; }
}