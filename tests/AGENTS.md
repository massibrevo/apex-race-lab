# Verification

Use [CONTRIBUTING.md](../CONTRIBUTING.md) to select checks. Keep default tests deterministic and offline against bundled archives. Do not require a paid API, running dashboard, user-specific directory or production deployment in CI.

Test observable behavior and failure cases: seek boundaries and gaps, unavailable measurements, participant membership, calendar/availability consistency and transactional data contracts. Use temporary directories for generated test state. Keep intentional timing-only archives valid while detecting falsely advertised GPS. Explain why a threshold changes instead of weakening it to hide a failure.
