# External beta blockers: audio and project header

These three reports block external beta. This patch does not activate paid AI,
change production settings, alter remote data or authorize a release.

## 1. Piano too quiet while recording — fix candidate

Verified in source: piano output was -12 dB, and recording reduced the entire
mix another 14 dB. Playback also applied two fixed attenuation factors and
ignored note velocity. Piano now starts at -6 dB. Recording uses 0 dB master
gain for keyboard-only input and -6 dB when the microphone is active. Stopping
recording or starting playback restores the master to 0 dB. A -1 dB limiter
follows the summed instrument mix; MIDI velocity and per-track volume still
control each note independently. Other instrument base levels are unchanged.

Required acceptance: listen and measure piano during recording and playback at
fixed device volume, with microphone both off and on. Check 50% volume and mute,
quiet/loud MIDI notes, and six-note chords mixed with drums. Verify audible output
and no clipping; tests of graph configuration do not prove hardware loudness.

## 2. Silent playback immediately after saving — recovery fix candidate

Confirmed regression independent of save timing: the previous initializer treated
any master-volume reference as a healthy engine, even when an instrument had
been disposed. Scheduling continued but no note sounded. The old code fails
this recovery probe and the patched hook passes it. This does not establish
what caused the reported graph loss after a real save on the user's device.

Initialization now verifies the context, master chain, drum bus, instrument effects
and all melodic instruments. An invalid graph is disposed and rebuilt together.
Cleanup clears resource references. Concurrent initialization shares one setup;
canceling playback or unmounting during setup prevents late playback/resource
creation. Failed context resume leaves the editor intact, stops the playing
indicator and shows a retry message. Saving itself does not initialize, dispose,
mute or replace audio resources. Browser permission remains tied to Play/Record.

Actual-hook tests cover first save, resave and failed save with a deferred mocked
database RPC, plus suspended-context resume, disposed-node recovery, effect replay,
overlapping initialization, cancellation and teardown. They verify that MIDI data
and track volume survive and that playback triggers the expected instrument.

Required acceptance: on a physical iPhone/Safari and desktop, record -> play ->
stop -> first save -> play -> edit -> resave -> play, without refreshing/reopening.
Repeat on an opened project and after background/foreground. Measure nonzero audio,
not just the playing indicator. Exercise failed saves and verify preserved edits.

## 3. Long project names block mobile AI button — layout fix candidate

Verified in source: the project page used an absolute, higher-layer header on top
of the looper's own controls. The header is now a normal-flow grid above the
looper, with a minmax(0,1fr) title cell, truncated display text and a constrained
editable input. The full name remains available as the title attribute. Name
actions and the AI control have at least a 44 x 44 CSS-pixel target. Rename success
also updates the current-project title; failed renames keep the editor open.

Required acceptance: long names with spaces and a 200-character unbroken name;
320/375/390 CSS-pixel portrait and landscape widths, plus physical iPhone/Safari.
Check no horizontal overflow and use actual hit-testing/taps on AI, before and
after editing/saving the title. Verify that the title header never covers AI.

## Test scope and release decision

Run `node scripts/check-audio-regressions.cjs` (55 checks at implementation time),
existing beta regressions, lint and Next/TypeScript build. Browser checks that mock
Supabase establish UI/lifecycle behavior, not real signup or database persistence.
Keep the reports as external-beta blockers until the required live-account and
physical-device acceptance tests pass. No physical iPhone result is claimed here.
