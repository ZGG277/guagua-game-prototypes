# Durian ranking-prominent.2 source archive

Recovered and archived on 2026-11-09. Internal version: `1.0.4-ranking-prominent.2`. This is the latest available reconstructed continuation candidate. It is **not the recovered original live 1.0.3** and this archive does not publish, submit, deploy or approve it. The existing repository root, website, and durian-assassin-reconstructed directory are unchanged.

`source/`, `scripts/`, `assets/`, `baseline/` and package.json are copied unchanged from the retained source package. Baseline runtime files are retained because the diagnostic scripts use them as comparison inputs. No dependencies, generated current dist, duplicate ZIP, private publishing records or generated screenshots are committed. `SOURCE_NOTES.md` and `REVISION.md` preserve the original candidate context and phone-review limitations, not a current approval.

## Reproduce

Use Python 3 and Node.js. In this directory run `npm install`, `npm run build`, `npm test`, `npm run test:leaderboard`, `npm run test:share-rank`, and `npm run audit`. These recreate dist and `durian-assassin-ranking-prominent-candidate.zip`. All declared dependencies are pinned to exact versions. No publication command runs.

The retained scripts include historical diagnostic helpers; the supported archival verification commands above are the package.json suites. In particular, scripts/equivalence.cjs and scripts/test.cjs still refer to an old durian-minitool-publish workspace and are retained for source completeness, not claimed to work as standalone archive tests.

## Verification

The rebuilt runtime ZIP is byte-for-byte equal to the independently retained candidate. The core checks, leaderboard checks and share-ranking checks are rerun; details are in `ARCHIVE_MANIFEST.json`. Automated checks are offline/mocked and do not establish live platform permission, ranking, phone sharing or review acceptance. Historical browser reports are not claimed as newly executed. No browser or phone validation was newly performed during archival.

Audio and generated-art provenance are retained alongside the assets. Historical source notes explain the reconstruction boundary and unavailable original 1.0.3 details.
