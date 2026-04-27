using System.Windows.Controls;
using KMGuardLoader.ViewModels;

namespace KMGuardLoader.Views;

public partial class LoginView : UserControl
{
    public LoginView()
    {
        InitializeComponent();
    }

    private void PassBox_Changed(object sender, System.Windows.RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel vm)
            vm.Password = PassBox.Password;
    }
}