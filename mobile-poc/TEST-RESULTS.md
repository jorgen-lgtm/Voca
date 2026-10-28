# Physical-device test record

Status: NOT VERIFIED for all entries. No measured values collected.
Owner reports Mac/Xcode, iPhone and Android available; no remote access implied.

Record for each platform: device model, OS/build, app commit, native/package
versions, output route, battery/thermal state, tester/date, permission state,
PASS/FAIL/NOT VERIFIED, observations and evidence artifact location.

| Scenario | iPhone | Android |
|---|---|---|
| First launch, microphone grant | NOT VERIFIED | NOT VERIFIED |
| Permission deny and retry from OS settings | NOT VERIFIED | NOT VERIFIED |
| Record short melody; stop; raw playback | NOT VERIFIED | NOT VERIFIED |
| Pitched recording creates notes | NOT VERIFIED | NOT VERIFIED |
| Multiple instruments incl piano vs guitar | NOT VERIFIED | NOT VERIFIED |
| Two loops synchronized for 5 minutes | NOT VERIFIED | NOT VERIFIED |
| MIDI share and open in another application | NOT VERIFIED | NOT VERIFIED |
| Background and explicit resume | NOT VERIFIED | NOT VERIFIED |
| Lock and unlock | NOT VERIFIED | NOT VERIFIED |
| Phone/audio interruption and recovery | NOT VERIFIED | NOT VERIFIED |
| Headphones connect/disconnect | NOT VERIFIED | NOT VERIFIED |
| 15-minute workflow and 20 repeated capture/play cycles | NOT VERIFIED | NOT VERIFIED |
| Microphone released after reset/background | NOT VERIFIED | NOT VERIFIED |

| Measurement | iPhone | Android | Evidence required |
|---|---|---|---|
| Microphone readiness, 20 samples, median/p95 | NOT VERIFIED | NOT VERIFIED | Export JS log; distinguish prompt wait |
| Input-to-sound, median/p95 | NOT VERIFIED | NOT VERIFIED | Common-clock external capture |
| Pitch onset-to-detection, median/p95 | NOT VERIFIED | NOT VERIFIED | Correlated input and detection trace |
| Relative loop drift after >=5 minutes | NOT VERIFIED | NOT VERIFIED | Recorded outputs and onset analysis |
| Glitches/dropouts/crashes | NOT VERIFIED | NOT VERIFIED | Recording and system crash/audio logs |
| CPU/memory warm-up and sustained | NOT VERIFIED | NOT VERIFIED | Instruments / Android profiler captures |
| Recovery time and behavior | NOT VERIFIED | NOT VERIFIED | Timestamped event log and recording |

Native builds/signing, JS typecheck and bundle build: NOT VERIFIED.
No final Go until both physical device matrices and agreed thresholds are met.
