using System.Windows;
using KMGuardLoader.Core;

namespace KMGuardLoader;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        AntiDebug.RunAll();

        if (AntiVM.Detected())
        {
            Environment.FailFast(null);
            return;
        }

        base.OnStartup(e);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        base.OnExit(e);
    }
}