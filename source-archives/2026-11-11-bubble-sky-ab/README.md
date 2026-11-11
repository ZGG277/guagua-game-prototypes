# Historical Bubble Sky A/B and test supplement

Cloud snapshot archived 2026-11-11. These are independent historical web prototypes, not Bubble minitool 1.0.9 or a new game release. No main, Pages, review or deployment configuration is changed.

The cloud A snapshot contains a later/different core, game, HTML and CSS than the existing repository bubble-sky-a directory. All five runtime files are retained unchanged here with its checksum file and tests. The background asset is an already published asset; no third-party vendor code or new license grant is added.

The cloud B runtime already matches the five files at repository root bubble-sky-b exactly. Those files are not duplicated. This archive adds its missing checksum file and two QA scripts. The B restore/test runner uses those existing repository files only after verifying their SHA256 checksums.

Run `python3 verify_and_test.py` from any directory in this checkout. It verifies A and B runtime inputs, copies each into a temporary directory, and runs the original Node core tests. All 8 tests per prototype pass. The optional qa/render.mjs scripts use @napi-rs/canvas; their original mock DOM render coverage is not equivalent to browser/device acceptance. No new browser or device test was performed for this archival step.

Original qa screenshots and generated assets not referenced by the runtime are omitted. No credentials, publish records, QR codes or image-generation prompts are included. The archive preserves source byte-for-byte rather than updating historical gameplay or formatting. See ARCHIVE_MANIFEST.json.
