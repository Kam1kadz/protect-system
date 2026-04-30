using Microsoft.Win32;

namespace KMGuardLoader.Core;

internal static class AntiVM
{
    private static readonly string[] VmRegistryKeys =
    [
        @"SOFTWARE\VMware, Inc.\VMware Tools",
        @"SOFTWARE\Oracle\VirtualBox Guest Additions",
        @"SYSTEM\ControlSet001\Services\VBoxGuest",
        @"SYSTEM\ControlSet001\Services\VBoxSF",
        @"SYSTEM\ControlSet001\Services\vmhgfs",
        @"SYSTEM\ControlSet001\Services\vmmouse",
        @"HARDWARE\ACPI\DSDT\VBOX__",
        @"HARDWARE\ACPI\FADT\VBOX__",
    ];

    private static readonly string[] VmProcesses =
    [
        "vmtoolsd", "vmwaretray", "vmwareuser",
        "vboxservice", "vboxtray",
        "xenservice", "qemu-ga"
    ];

    internal static bool Detected()
    {
#if DEBUG
        return false;
#endif
        return CheckRegistry() || CheckProcesses() || CheckCpuid();
    }

    private static bool CheckRegistry()
    {
        foreach (var key in VmRegistryKeys)
        {
            try
            {
                using var rk = Registry.LocalMachine.OpenSubKey(key);
                if (rk != null) return true;
            }
            catch { }
        }
        return false;
    }

    private static bool CheckProcesses()
    {
        foreach (var proc in System.Diagnostics.Process.GetProcesses())
        {
            try
            {
                string name = proc.ProcessName.ToLowerInvariant();
                foreach (var vm in VmProcesses)
                    if (name.Contains(vm)) return true;
            }
            catch { }
        }
        return false;
    }

    private static unsafe bool CheckCpuid()
    {
        try
        {
            // Hypervisor bit in CPUID leaf 1 ECX bit 31
            int[] regs = new int[4];
            fixed (int* p = regs)
            {
                // Use managed CPUID via ManagementObject instead of intrinsics
                // to avoid unsafe compilation issues on all targets
            }
            var searcher = new System.Management.ManagementObjectSearcher(
                "SELECT * FROM Win32_ComputerSystem");
            foreach (var obj in searcher.Get())
            {
                var model = obj["Model"]?.ToString() ?? "";
                if (model.Contains("VMware") || model.Contains("VirtualBox")
                    || model.Contains("Virtual Machine") || model.Contains("QEMU"))
                    return true;
            }
        }
        catch { }
        return false;
    }
}