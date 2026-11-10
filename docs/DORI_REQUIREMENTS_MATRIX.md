# DORI — Requirements Traceability Matrix

**Date:** 2026-09-18  
**Source:** DORI Master Prompt v1.0

| # | Requirement | Source §  | Frontend | Backend | Database | API | Tests | Status |
|---|---|---|---|---|---|---|---|---|
| R01 | React + TypeScript + Vite frontend | §7 | src/ | — | — | — | tsconfig strict | NOT IMPLEMENTED |
| R02 | Frontend architecture (features/pages/hooks/services) | §8 | src/*/ | — | — | — | — | NOT IMPLEMENTED |
| R03 | Decorative components (Border, Motif, Pattern) | §9 | components/ | — | — | — | — | NOT IMPLEMENTED |
| R04 | Public website (16 sections) | §10 | pages/ | — | — | — | — | NOT IMPLEMENTED |
| R05 | RBAC with 7 roles | §11 | auth/ | auth/ | users,roles,perms | /users,/roles | RBAC tests | NOT IMPLEMENTED |
| R06 | Patient interface | §12 | patient/ | patients/ | patients | /patients/* | Patient tests | NOT IMPLEMENTED |
| R07 | ANM/ASHA interface (offline-optimized) | §13 | worker/ | tasks/ | tasks | /tasks/* | Worker tests | NOT IMPLEMENTED |
| R08 | PHC/CHC Medical Officer interface | §14 | clinician/ | encounters/ | encounters | /encounters/* | MO tests | NOT IMPLEMENTED |
| R09 | District Health Officer interface | §15 | district/ | public-health/ | anomalies | /public-health/* | DHO tests | NOT IMPLEMENTED |
| R10 | State/National interface | §16 | state/ | public-health/ | — | /public-health/* | State tests | NOT IMPLEMENTED |
| R11 | Referral Facility interface | §17 | referral/ | referrals/ | referrals | /referrals/* | Referral tests | NOT IMPLEMENTED |
| R12 | Admin interface | §18 | admin/ | admin/ | — | /admin/* | Admin tests | NOT IMPLEMENTED |
| R13 | Authentication (JWT, bcrypt, refresh) | §19 | auth/ | auth/ | users | /auth/* | Auth tests | NOT IMPLEMENTED |
| R14 | PostgreSQL database (30+ tables) | §20 | — | models/ | all tables | — | DB tests | NOT IMPLEMENTED |
| R15 | Care Passport (credential, QR, NFC boundary) | §21 | passport/ | passports/ | care_passports | /care-passports/* | Passport tests | NOT IMPLEMENTED |
| R16 | Cryptographic credential signing | §22 | — | security/ | credentials | /credentials/* | Crypto tests | NOT IMPLEMENTED |
| R17 | Consent system (purpose, scope, expiry, revoke) | §23 | consent/ | consents/ | consents | /consents/* | Consent tests | NOT IMPLEMENTED |
| R18 | Emergency break-glass | §24 | emergency/ | emergency/ | emergency_access | /emergency/* | Emergency tests | NOT IMPLEMENTED |
| R19 | Referral lifecycle (7 states) | §25 | referral/ | referrals/ | referrals | /referrals/* | Referral tests | NOT IMPLEMENTED |
| R20 | Care timeline | §26 | timeline/ | timeline/ | care_timelines | /timeline/* | Timeline tests | NOT IMPLEMENTED |
| R21 | Predictive care-gap engine | §27 | care-gaps/ | ml/ | care_gaps | /care-gaps/* | CG tests | NOT IMPLEMENTED |
| R22 | ML model adapter architecture | §28 | — | ml/ | model_versions | /predictions/* | ML tests | NOT IMPLEMENTED |
| R23 | Federated learning architecture | §29 | federated/ | federated/ | federated_* | /federated/* | FL tests | NOT IMPLEMENTED |
| R24 | MedFed AI separation | §30 | — | ml/medfed/ | — | — | — | NOT IMPLEMENTED |
| R25 | Public health intelligence | §31 | district/ | public-health/ | anomalies | /public-health/* | PH tests | NOT IMPLEMENTED |
| R26 | Offline-first (IndexedDB, SW, sync queue) | §32 | offline/ | sync/ | sync_records | /sync/* | Offline tests | NOT IMPLEMENTED |
| R27 | Conflict resolution (versioning, timestamps) | §33 | offline/ | sync/ | — | /sync/* | Sync tests | NOT IMPLEMENTED |
| R28 | FastAPI backend with layered architecture | §34 | — | app/*/ | — | all | API tests | NOT IMPLEMENTED |
| R29 | All API domains implemented | §35 | — | api/ | — | all endpoints | Endpoint tests | NOT IMPLEMENTED |
| R30 | API documentation (OpenAPI + API_CONTRACT.md) | §36 | — | FastAPI | — | /docs | — | NOT IMPLEMENTED |
| R31 | Typed frontend API services | §37 | api/ | — | — | — | — | NOT IMPLEMENTED |
| R32 | State management (server/offline/UI separated) | §38 | stores/ | — | — | — | — | NOT IMPLEMENTED |
| R33 | Security hardening | §39 | — | security/ | — | all | Security tests | NOT IMPLEMENTED |
| R34 | Audit logging | §40 | — | audit/ | audit_logs | /audit-logs | Audit tests | NOT IMPLEMENTED |
| R35 | Backend RBAC enforcement | §41 | — | auth/ | roles,perms | all | RBAC tests | NOT IMPLEMENTED |
| R36 | ABDM/eSanjeevani adapter interfaces | §42 | — | integrations/ | — | — | — | NOT IMPLEMENTED |
| R37 | Voice interface boundary | §43 | voice/ | — | — | — | — | NOT IMPLEMENTED |
| R38 | Notification infrastructure | §44 | notifications/ | notifications/ | notifications | /notifications | — | NOT IMPLEMENTED |
| R39 | File/document handling | §45 | — | storage/ | — | /upload | — | NOT IMPLEMENTED |
| R40 | Synthetic demo data (no fake stats) | §46,§61 | — | seed/ | — | — | — | NOT IMPLEMENTED |
| R41 | Demo mode with demo users | §47 | — | seed/ | users | — | E2E tests | NOT IMPLEMENTED |
| R42 | ANC continuity flagship workflow | §48 | worker/ | all | all | all | E2E tests | NOT IMPLEMENTED |
| R43 | Secondary workflows (emergency, chronic, TB) | §49 | all | all | all | all | E2E tests | NOT IMPLEMENTED |
| R44 | Design system tokens from spec | §50 | tokens.css | — | — | — | — | NOT IMPLEMENTED |
| R45 | Custom SVG preservation | §51 | assets/ | — | — | — | — | NOT IMPLEMENTED |
| R46 | Accessibility (semantic HTML, ARIA, keyboard) | §52 | all | — | — | — | A11y tests | NOT IMPLEMENTED |
| R47 | Responsive design (320px–1920px) | §53 | all | — | — | — | — | NOT IMPLEMENTED |
| R48 | Animation (after visual parity, reduced-motion) | §54 | all | — | — | — | — | NOT IMPLEMENTED |
| R49 | Performance (lazy load, code split, compress) | §55 | all | — | — | all | — | NOT IMPLEMENTED |
| R50 | Error/loading/empty/offline states | §56 | all | — | — | — | — | NOT IMPLEMENTED |
| R51 | Offline UX indicators | §57 | offline/ | — | — | — | — | NOT IMPLEMENTED |
| R52 | Testing suite (unit, integration, E2E, security) | §58,§59 | tests/ | tests/ | tests/ | tests/ | all | NOT IMPLEMENTED |
| R53 | Database quality (FK, indexes, constraints) | §60 | — | models/ | all | — | DB tests | NOT IMPLEMENTED |
| R54 | Environment configuration (.env.example) | §62 | .env | .env | — | — | — | NOT IMPLEMENTED |
| R55 | Docker (frontend, backend, postgres) | §63 | Dockerfile | Dockerfile | docker-compose | — | — | NOT IMPLEMENTED |
| R56 | Deployment config (prod Dockerfile, nginx) | §64 | nginx/ | Dockerfile | — | — | — | NOT IMPLEMENTED |
| R57 | Documentation suite (15 documents) | §65 | — | — | — | — | — | NOT IMPLEMENTED |
| R58 | No fake implementation | §67 | all | all | all | all | all | VERIFIED |
| R59 | Clinical safety (AI = decision support only) | §71 | all | ml/ | — | — | — | NOT IMPLEMENTED |
| R60 | Data minimization | §72 | all | all | all | all | — | NOT IMPLEMENTED |
| R61 | Public health privacy | §73 | district/ | public-health/ | — | — | — | NOT IMPLEMENTED |
| R62 | Full demo workflow (19 steps) | §76 | all | all | all | all | E2E | NOT IMPLEMENTED |
