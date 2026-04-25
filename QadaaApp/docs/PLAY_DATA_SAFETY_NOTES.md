# Play Data Safety Notes

Use this as a starting point when filling the Google Play Data safety form. Review it again before submission.

## Data the app can store locally

- Name
- Email address
- Prayer qadaa targets and progress
- Fasting qadaa targets and progress
- Notes entered by the user
- Reminder settings
- Language preference

## Data handling shape today

- Main app data is stored locally on the device
- Manual export/restore is user-initiated
- Google sign-in is optional
- Facebook sign-in is currently hidden in the UI
- There is no general cloud sync for app progress yet

## Review carefully before submission

- Whether optional Google sign-in counts as collecting personal info for your final build
- Whether exported backup text should be described as user-controlled data sharing
- Whether any analytics, crash reporting, or third-party SDKs are added later
- Whether your final privacy policy wording matches the shipped build exactly

## Official references

- Android Developers: Data safety guidance
- Android Developers: Declare your app's data use
