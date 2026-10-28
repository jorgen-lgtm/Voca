# HumWeave isolated Capacitor experiment

DRAFT / NOT VERIFIED. No mobile compatibility or performance claim. No merge,
production deployment, backend changes, store submission, or paid AI authorized.

## Architecture and provenance

Independent Vite/React/TypeScript package; root Next app and its dependencies are
unchanged. Capacitor packages local `dist` (no remote server.url). App/Filesystem/
Share provide lifecycle and MIDI file sharing. No Supabase or OpenAI imports,
credentials, account UI, or backend requests. Authentication remains a design
experiment: system-browser PKCE with exact allowlisted deep links, secure native
session storage and server Bearer validation would need a separately reviewed PR.
Do not relax the current web OAuth redirect guard.

`vendor/` is an unmodified snapshot of these files from Voca commit
76a04032f54fb3b3aa8283e9d45f03b07bf3f36f:
- src/hooks/useAudioEngine.ts
- src/lib/voice-pitch.ts and src/lib/midi-export.ts
- src/config/instruments.ts and src/types/{audio,database}.ts

Imports resolve to the private vendor directory. This deliberately copies the
reviewed engine rather than editing active PR #18–21/#26 files. Shared production
engine ownership still overlaps conceptually with #24/#26; later extraction or
updates require review. Branch is based on main 713dc970, not an assumption that
any beta PR was merged. All prototype additions are under mobile-poc/.

Two seeded 2-second melodic loops, existing instrument synthesis, YIN tracker and
MIDI encoder are reused. Raw capture uses an independent MediaRecorder with MIME
negotiation, permission errors and track cleanup. Do not run raw and pitched
capture simultaneously. Pitched captures are added to the in-memory loop list.
No persistence is promised. Hiding the document/app unmounts the engine, releases
resources and requires an explicit Resume with a fresh session. Screen lock,
phone calls and headphone changes still need actual testing; visibility events
alone are not a complete interruption solution.

## Mac setup (owner-operated)

Use Node 22+, Xcode with command-line tools and Android Studio/SDK/JDK matching
Capacitor 7 requirements. Select branch feature/mobile-capacitor-poc.

    cd mobile-poc
    npm install
    npm run build
    npm run cap:add:ios
    npm run cap:add:android

`npm install` must generate a lockfile; inspect dependency versions/audit and
commit that reviewed lockfile before reproducible build claims. No lockfile could
be generated in the cloud because its npm proxy was unreachable. Native projects
are locally generated and ignored; permission edits below are local setup until a
future reviewed configuration step makes them reproducible.

In ios/App/App/Info.plist add NSMicrophoneUsageDescription with a clear purpose,
e.g. “Record your voice to create music locally.” Select your development signing
team and unique bundle identifier in Xcode if needed. No App Store account setup
or submission is part of this task. Free-device signing may suffice for local iOS
tests, with Apple's limitations.

In android/app/src/main/AndroidManifest.xml add
`<uses-permission android:name="android.permission.RECORD_AUDIO" />` directly under
manifest. WebView getUserMedia must present Android runtime permission correctly;
verify denial/retry on the actual OS. Stop if a native recorder/plugin is required.
Do not weaken transport security or enable arbitrary navigation.

    npm run sync
    npm run ios
    npm run android

Choose the connected physical device in each IDE and Run. Build again and sync
after source edits. For desktop-only smoke testing: `npm run dev` on localhost.
Do not use a hosted production site as the Capacitor content source.

## Test protocol and evidence

Use TEST-RESULTS.md. Physical iPhone and Android are available to the owner but
were not connected to this cloud environment. All device scenarios currently
NOT VERIFIED. Cloud has no Xcode, Android SDK/ADB, installed dependencies or
working npm proxy; TypeScript/bundling/native builds have NOT run.

Proposed acceptance thresholds (owner review before final Go/No-Go): mic readiness
p95 <=1000ms excluding first permission dialog; note input-to-acoustic-output p95
<=80ms; voiced onset-to-detected-note p95 <=150ms for steady 100–660Hz tones;
relative loop drift <=10ms after 5 minutes; no audible dropout or critical crash
in a 15-minute workflow; recovery within 2 seconds after explicit resume. Record
wired/Bluetooth conditions separately; Bluetooth latency does not characterize
speaker/wired engine latency. Memory should plateau after warm-up across at least
20 cycles; investigate sustained growth >20% (diagnostic threshold, not a universal
memory budget). Record CPU/thermal state; do not invent a generic CPU pass limit.

JS log measures only user-action-to-recorder-start, including permission wait; it
is NOT acoustic latency. For instrument latency capture a timestamped physical
input marker and speaker output on a common external recorder/oscilloscope;
report marker error and subtract no undocumented offsets. For pitch latency feed
a known gated tone through a speaker, record source onset and instrumented
detection timestamps on a correlated clock; microphone capture windows and clock
alignment must be documented. This prototype does not yet emit the required
sample-correlated detection trace: that measurement remains blocked until added.
For loop drift record two distinct-channel click patterns externally for >=5min,
compare first/last relative onset differences, and retain WAV plus analysis.
Tone callback timestamps alone are not acoustic evidence. Use Instruments on iOS
and Android Studio profiler for CPU, allocations, memory and sustained playback.

## Findings, limits and next steps

Implemented source scaffolding only. MIDI file open-in-another-app is NOT VERIFIED.
Share cancellation and permission failures show errors. Cache files persist until
next export or OS eviction; no production user audio is uploaded. Logs contain
local timings/errors, not audio; review before sharing.

The inherited engine catches some initialization errors internally, so a resolved
promise is not proof recording started. Its async initialization/unmount race,
multiple AudioContexts, requestAnimationFrame pitch scheduling, memo timing and
OS interruptions are priority device risks. Native audio work, production auth,
or configuration/security bypasses require stopping and separate direction.

Technical Go: NOT YET — all acceptance criteria need hardware evidence. This is
a draft experiment, not a ready app. Next: owner runs build and permission setup,
then both device test matrices; fix only measured blockers in this branch. Estimate
3–6 developer-days to resolve setup/type/device issues and collect first evidence,
plus 2–5 days if lifecycle/export adaptations are needed. Native engine work is
outside scope and invalidates this estimate. No fixed external-service cost added;
existing 200 SEK OpenAI ceiling is untouched and no AI calls exist here.
