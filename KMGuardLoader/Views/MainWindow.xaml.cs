using System.Windows;
using System.Windows.Input;
using KMGuardLoader.ViewModels;

namespace KMGuardLoader.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainViewModel();
    }

    private void Titlebar_Drag(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed) DragMove();
    }

    private void Minimize_Click(object sender, RoutedEventArgs e) =>
        WindowState = WindowState.Minimized;

    private void Close_Click(object sender, RoutedEventArgs e) =>
        Application.Current.Shutdown();
}