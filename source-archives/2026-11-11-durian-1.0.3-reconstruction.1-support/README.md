# Historical Durian reconstruction build/test supplement

Archived 2026-11-11. Internal historical version 1.0.3-reconstruction.1. This is not recovered original live 1.0.3, not a newer version than ranking-prominent.2, and not a deployment or review candidate.

Only seven previously missing files are retained unchanged in overrides/: the old package.json and six build/test scripts. The old runtime modules/assets and all other required scripts already exist byte-for-byte in this repository. RESTORE_MAP.json pins their exact paths and SHA256 hashes, based on commit fcc901da79614dd9748c507eabfca5f3a38b848b. This avoids publishing duplicate historical source/assets or generated outputs.

Run `python3 restore.py /absolute/new-empty/output-directory`. The script verifies every input hash, then restores the 39 required build/test inputs. It does not access the network or publish anything. From the restored directory, install the exact package.json dependencies, then run `npm run build`, `npm test`, and `npm run audit`.

The reconstructed directory is deliberately a build/test recovery package rather than every historical artifact. No old dist, ZIPs, private evidence, session data, QR codes, image-generation prompts or unused PNG originals are added. Existing original source whitespace is retained.

The 39-input restoration, build, all 60 original checks, and static audit pass. Six of seven runtime payloads match the retained historical ZIP byte-for-byte. app.js differs only in comment-only source path lines; all other lines are identical. The old ZIP builder preserves file mtimes, so identical rebuilt ZIP bytes are not promised. Automated checks do not establish live phone/platform acceptance. Historical browser helper scripts remain archived by reference but are not claimed as newly executed. No new license grant is introduced.
