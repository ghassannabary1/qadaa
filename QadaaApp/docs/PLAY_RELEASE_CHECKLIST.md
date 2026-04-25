# Google Play Release Checklist

## Code / Build

- [x] Remove unnecessary Android storage permissions
- [x] Replace anonymous package id with `com.ghassannabary.qadaa`
- [x] Make release signing require a real keystore
- [x] Disable default Android backup until data policy is intentional
- [x] Keep release secrets out of git
- [x] Add a sample `android/key.properties.example`
- [ ] Create `android/qadaa-release-key.jks`
- [ ] Create `android/key.properties`
- [ ] Build `./gradlew bundleRelease`
- [ ] Build `./gradlew assembleRelease`
- [ ] Install and test the release APK on a real Android device
- [ ] Confirm target SDK is still Play-compliant before upload

## Product Validation

- [ ] Verify onboarding in English
- [ ] Verify onboarding in Arabic
- [ ] Verify prayer counting and undo
- [ ] Verify fasting and kafarah flow
- [ ] Verify notification permission, scheduling, and actions
- [ ] Verify external links open correctly
- [ ] Verify app icon, splash, and dark/light system behavior
- [ ] Verify Google sign-in in a release-like build
- [ ] Verify Facebook sign-in in a release-like build, or hide it before release

## Store / Compliance

- [ ] Finalize privacy policy URL
- [ ] Prepare Data safety answers for Google Play
- [ ] Confirm what user data is stored locally and whether auth data is optional
- [ ] Add support email
- [ ] Prepare store title, short description, and full description
- [ ] Prepare screenshots
- [ ] Prepare feature graphic
- [ ] Confirm content rating questionnaire answers
- [ ] Complete developer verification requirements in Play Console if prompted

## Release Decision

- [ ] Increase version code/version name if needed before final upload
- [ ] Upload AAB to Play Console internal testing
- [ ] Test from Play internal track
- [ ] Fix any release-only issues
- [ ] Submit production release
