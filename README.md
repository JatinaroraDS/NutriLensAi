# NutriLens AI

NutriLens AI is a proactive nutrition assistant that goes beyond simple calorie tracking. It analyzes your context—specifically sleep scores and stress levels—to intervene before you make poor food choices. By predicting cravings and offering healthy "Swap-to-Win" alternatives, NutriLens helps you maintain your health goals in high-risk moments.

## Setup Steps

1.  **Clone & Install**:
    ```bash
    npm install
    ```
2.  **Add Secrets**:
    Configure the following keys in your environment or Secrets panel:
    -   `GEMINI_API_KEY`: For AI nudges and coaching.
    -   `GOOGLE_MAPS_API_KEY`: For healthy restaurant discovery.
    -   `FIREBASE_CONFIG`: The configuration provided in `firebase-applet-config.json`.
3.  **Deploy**:
    ```bash
    firebase login
    firebase deploy
    ```

## Architecture

-   `src/firebase.js`: Initializes Firebase Auth and Firestore.
-   `src/DataInference.js`: Manages local user context (sleep, stress, goals).
-   `src/ContextAnalysis.js`: Defines logic for identifying nutritional risk flags.
-   `src/UserNudge.js`: Integrates with Gemini API to generate personalized "Swap-to-Win" nudges.
-   `src/tests.js`: Contains unit tests for core logic rules.

## API Key Locations
-   **Gemini API**: Get your key at [Google AI Studio](https://aistudio.google.com/app/apikey).
-   **Google Maps**: Get your key at [Google Cloud Console](https://console.cloud.google.com/).
-   **Firebase**: Created automatically via AI Studio's Firebase setup tool.
