# IronTrack PWA Setup & Installation Guide

IronTrack is a custom, mobile-first strength and running tracker inspired by Strong Pro. Built with vanilla HTML, CSS, JavaScript, and IndexedDB, it works offline as a Progressive Web App (PWA).

## Installing on iPhone (iOS Safari)
1. Deploy or host the files on a secure HTTPS URL (e.g., Netlify or GitHub Pages).
2. Open the URL in **Safari** on your iPhone.
3. Tap the **Share** button in Safari's bottom toolbar.
4. Scroll down and tap **"Add to Home Screen"**.
5. Name it **IronTrack** and tap Add. IronTrack will now launch in standalone fullscreen mode with offline data support!

## Data Backups
IronTrack saves all workouts and settings locally in your browser's IndexedDB. Because browser storage can be cleared or devices replaced, **go to Settings -> Export Backup (JSON)** periodically to save your database file to Apple Files or iCloud Drive.
