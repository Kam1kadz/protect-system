-keep public class cc.kmguard.sdk.KMGuard {
    public static *;
}
-keep public class cc.kmguard.sdk.UserInfo {
    public *;
}
-keep public class cc.kmguard.sdk.KMGuardException {
    public *;
}

-keepattributes Exceptions,Signature

-dontwarn **
-dontoptimize

-obfuscationdictionary      dict.txt
-classobfuscationdictionary dict.txt
-packageobfuscationdictionary dict.txt

-repackageclasses 'cc.kmguard.r'

-renamesourcefileattribute ''
-keepattributes !SourceFile,!LineNumberTable