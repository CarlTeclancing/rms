# Expo SDK 58 upgrade

The mobile project was upgraded from SDK 54 to Expo `~58.0.26`, React Native `0.88.1` and React `19.3.0`. Expo's installer selected compatible versions for the native dependencies and Babel preset, and the npm lockfile was updated. The frontend web application is a separate Vite project and is not affected by this SDK upgrade.

## Native changes

Android files were compared against the official `expo-template-bare-minimum@58.0.35` template. Changes include `ExpoReactHostFactory`, the separate `hermes-compiler` package path, Gradle 9.4.1 and its wrapper, Kotlin/AGP compatibility settings, optimized release ProGuard configuration, and updated manifest storage limits/configuration changes. The app identifier, deep link, assets and `CHOPASAP_UPLOAD_*` release signing configuration are retained.

The app uses the current image-picker `mediaTypes: ['images']` option and a root `SafeAreaProvider`. Existing fonts and shared order/design modules remain in use. The removed `splash` configuration was migrated to `expo-splash-screen`, and its Android resources were generated through SDK 58 prebuild. The three previously tracked `.expo` cache files were removed from Git's index and remain on disk.

Android prebuild regenerated the native project; custom release signing was restored afterward and verified in the diff. Future prebuild runs must preserve/reapply this custom signing block. This repository keeps Android native files under source control, so app-config changes are not automatically synchronized by EAS.

There is no checked-in iOS project. Its native project must be generated with SDK 58 on EAS or macOS. Do not reuse an SDK 54 development build with these dependencies: install Expo Go for SDK 58 or rebuild the native app.

## Development

Run `npm ci` in `mobile`, followed by `npx expo start --clear`. React Native 0.88 requires Node `^22.13.0 || ^24.3.0 || >=26.0.0`; this workspace uses Node 22.19.0. Use a compatible Java/Android toolchain for native Android builds. Release builds retain the requirement for the existing upload-signing variables. iOS native compilation requires macOS/Xcode or EAS.

## References

- [Expo SDK 58 upgrade guide](https://expo.dev/blog/how-to-upgrade-to-sdk-58)
- [Expo native project upgrade helper](https://docs.expo.dev/bare/upgrade/)

## Validation

- `expo install --check` passed: dependencies are up to date.
- SDK 58 Android and iOS Hermes exports passed, with all bundled Poppins fonts and shared modules.
- Android prebuild completed; native compilation is not verified. Java is unavailable on this machine's command path, and iOS compilation requires macOS or EAS.
- Final post-splash Android and iOS exports passed. Package manifest/lockfile consistency and `git diff --check` passed.
- Expo Doctor passed 19/20 checks. The remaining warning is the repository's intentional combination of checked-in Android native files and app-config fields: EAS does not automatically synchronize them. SDK 58 prebuild applied the current config, and the native diff was reviewed afterward. This warning was not suppressed.
- Prebuild also noted that Android `userInterfaceStyle` needs `expo-system-ui` for native enforcement; this optional package was not added. Device appearance and native startup still require testing.
- npm reported seven dependency advisories after installation. No forced dependency upgrade was applied outside Expo's compatible versions.
