# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Wails bridge classes
-keep class com.wails.app.WailsBridge { *; }
-keep class com.wails.app.WailsJSBridge { *; }

# Keep the whole app package so the Go<->Java JNI bridge (which resolves
# methods by name at runtime) is never renamed by obfuscation. The Java
# surface is tiny, so this costs almost nothing in size.
-keep class com.wails.app.** { *; }

# Extra safety margin: disable renaming app-wide. R8 still shrinks
# (dead-code removal) for the size win; only obfuscation is skipped.
-dontobfuscate
