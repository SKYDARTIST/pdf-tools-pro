# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================
# ANTI-GRAVITY PROGUARD RULES
# Security hardening for code obfuscation
# ============================================

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================
# CAPACITOR CORE - DO NOT OBFUSCATE
# ============================================
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.* <methods>;
}

# WebView JavaScript Interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# CAPACITOR PLUGINS
# ============================================
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.getcapacitor.community.** { *; }

# Filesystem Plugin
-keep class com.capacitorjs.plugins.filesystem.** { *; }

# Share Plugin
-keep class com.capacitorjs.plugins.share.** { *; }

# Text-to-Speech Plugin
-keep class com.getcapacitor.community.tts.** { *; }

# ============================================
# SUPABASE / NETWORK LIBRARIES
# ============================================
-keep class io.supabase.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ============================================
# GOOGLE LIBRARIES
# ============================================
-keep class com.google.** { *; }
-dontwarn com.google.**

# ============================================
# KOTLIN
# ============================================
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ============================================
# JSON / SERIALIZATION
# ============================================
-keep class org.json.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ============================================
# MAIN ACTIVITY
# ============================================
-keep class com.cryptobulla.antigravity.MainActivity { *; }
