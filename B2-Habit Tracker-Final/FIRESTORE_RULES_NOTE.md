# Firestore rules — privacy upgrade

## What changed in the app
The leaderboard used to download **every user's full profile** (email, tasks, habits, steps…) to every signed-in device.
It now reads a small public summary from a new `leaderboard` collection (name, avatar, XP, streak, and today's habit/task/step counts — no email).

## Rollout (2 steps — the app keeps working the whole time)
1. **Deploy this version.** Each user's summary is published the next time they open the app, so a user appears on the board after their first visit on the new version.
   Until you do step 2, the app still falls back to the old full-profile list, so nothing breaks.
2. **Publish these rules** (Firebase Console → Firestore Database → Rules → Publish):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'balakumareshg07@gmail.com';
    }

    // Private profile: only the owner (and the admin dashboard) can read it.
    match /users/{userId} {
      allow read:   if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      // Mutual friends: anyone signed in may change ONLY the "friends" list of another user.
      allow update: if request.auth != null && request.auth.uid != userId
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['friends']);
    }

    // Public leaderboard summary: everyone signed in can read; you can only write your own.
    match /leaderboard/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

After step 2 the browser console shows one harmless "Missing or insufficient permissions" message for the old list — that is the old full-profile read being correctly refused.

## Notes
- Admin dashboard and "View Profile" keep working (the rules above allow the admin email to read all profiles).
- Adding/removing friends works without reading the other person's profile (it uses arrayUnion / arrayRemove).
