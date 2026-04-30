using System.Diagnostics;
using System.Runtime.InteropServices;

namespace KMGuardLoader.Core;

internal static class AntiDebug
{
    [DllImport("kernel32.dll")]
    private static extern bool IsDebuggerPresent();

    [DllImport("kernel32.dll")]
    private static extern bool CheckRemoteDebuggerPresent(nint hProcess, ref bool isDebuggerPresent);

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(
        nint processHandle, int processInformationClass,
        ref nint processInformation, int processInformationLength,
        ref int returnLength);

    private static readonly string[] BannedProcesses =
    [
        "x64dbg", "x32dbg", "ollydbg", "windbg", "idaq", "idaq64",
        "cheatengine", "cheatengine-x86_64", "dnspy", "ilspy",
        "fiddler", "wireshark", "procmon", "procexp", "processhacker",
        "httpdebugger", "charles", "mitmproxy", "de4dot", "reflexil",
        "dotpeek", "justdecompile", "codecracker"
    ];

    internal static void RunAll()
    {
#if DEBUG
        return;
#endif
        if (IsDebuggerPresent())              Terminate();
        if (CheckRemote())                    Terminate();
        if (QueryDebugPort())                 Terminate();
        if (TimingCheck())                    Terminate();
        if (ScanProcesses())                  Terminate();
    }

    internal static void StartWatchdog(CancellationToken ct)
    {
#if DEBUG
        return;
#endif
        Task.Run(async () =>
        {
            while (!ct.IsCancellationRequested)
            {
                if (IsDebuggerPresent() || CheckRemote() || ScanProcesses())
                    Terminate();
                await Task.Delay(4000, ct).ConfigureAwait(false);
            }
        }, ct);
    }

    private static bool CheckRemote()
    {
        bool present = false;
        CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref present);
        return present;
    }

    private static bool QueryDebugPort()
    {
        nint info = 0;
        int ret   = 0;
        NtQueryInformationProcess(Process.GetCurrentProcess().Handle, 7, ref info, nint.Size, ref ret);
        return info != 0;
    }

    private static bool TimingCheck()
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        Thread.Sleep(100);
        sw.Stop();
        return sw.ElapsedMilliseconds > 500;
    }

    private static bool ScanProcesses()
    {
        foreach (var proc in Process.GetProcesses())
        {
            try
            {
                string name = proc.ProcessName.ToLowerInvariant();
                foreach (var banned in BannedProcesses)
                    if (name.Contains(banned)) return true;
            }
            catch { }
        }
        return false;
    }

    internal static void Terminate()
    {
        Environment.FailFast(null);
    }
}