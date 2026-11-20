import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "hu.halo.player"
    compileSdk = 35

    defaultConfig {
        applicationId = "hu.halo.player"
        minSdk = 29
        targetSdk = 35
        versionCode = 6
        versionName = "1.5"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Oldalra töltéshez (sideload) a debug kulccsal írjuk alá.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.mediarouter:mediarouter:1.7.0")
    implementation("com.google.android.gms:play-services-cast-framework:22.0.0")
}
