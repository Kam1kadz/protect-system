namespace KMGuardLoader.Models;

internal sealed record UserInfo(
    string Username,
    string Email,
    string Role,
    string PlanName,
    string PlanDisplayName,
    DateTimeOffset LicenseExpiry
);