# RACER साथी AI setup

The chat, transcription, and speech endpoints are implemented, but they stay disabled until an AI provider key is configured. No provider key was present in local or Vercel production settings when this feature was inspected. The app does not return pretend AI answers.

## Required server environment

Add `OPENAI_API_KEY` as a **server-only secret** to local `.env.local` and to the Vercel project's Production, Preview, and Development environments. Never use a `NEXT_PUBLIC_` name for it.

The implementation defaults to these current OpenAI API models and options; each can be changed server-side:

```dotenv
OPENAI_API_KEY=your-server-side-secret
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=shimmer
```

The app also needs the existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` values. `RACER_STUDENT_SESSION_SECRET` is optional; if omitted, the server-only Supabase service-role key signs the short-lived student session cookie.

For Vercel, add the API key without putting it in source control:

```powershell
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development
```

Enter the secret at the CLI prompt, then redeploy production. For local development, add the key to the ignored `.env.local` file and restart `npm run dev`.

## Voice and privacy notes

- The voice flow is microphone recording → server transcription → streamed AI text → optional generated speech. It is not full-duplex realtime conversation.
- The microphone is requested only after a student taps the mic. The recording is sent for transcription and is not written to this app's database or storage.
- Default speech uses the `shimmer` voice and asks the provider for a gentle, feminine-sounding Indian English delivery. The provider documents its built-in voices as optimized for English, so Hindi pronunciation and the requested accent are not guaranteed.
- Chat context is stored in the browser session for up to 30 minutes and has a New Chat control. Saved answers stay in that browser's local storage and can be cleared in Voice Settings.
- Student school records are looked up server-side only for the authenticated student's own question. Only a small topic-specific summary is sent with that question; no student name, password, or service-role key is sent to the model.
- Chat responses request `store: false`; provider keys remain on the server.

After the provider key is set, sign out and sign back in once so the app can establish its HttpOnly student session cookie, then verify text chat, microphone transcription, and speech playback on the actual Android WebView device.
