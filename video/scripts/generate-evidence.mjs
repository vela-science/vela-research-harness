import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const videoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(videoRoot, '..');

const allowedInputs = {
  package: 'package.json',
  buildWeek: 'BUILD_WEEK.md',
  releases: 'docs/RELEASES.md',
  profile: 'profiles/formal-erdos-505-test-dim-one-gpt56.json',
  mission: 'missions/formal-erdos-505-test-dim-one-gpt56/mission.draft.json',
  retained:
    'evidence/build-week/run_eb6bcd46-cffd-4ae8-b630-2681bd84da71.public.json',
  assessment:
    'advisories/erdos1056-claim-fidelity/results/assessment.json',
  verification:
    'advisories/erdos1056-claim-fidelity/results/verification.json',
};

const forbiddenInputFragments = [
  '.canopus',
  '/Users/',
  'isolated-home',
  'auth',
  'credentials',
];

for (const input of Object.values(allowedInputs)) {
  if (forbiddenInputFragments.some((fragment) => input.includes(fragment))) {
    throw new Error(`Refusing non-public evidence input: ${input}`);
  }
}

const readText = async (relativePath) =>
  readFile(resolve(repositoryRoot, relativePath), 'utf8');
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));
const sha256 = (value) =>
  `sha256:${createHash('sha256').update(value).digest('hex')}`;

const [
  packageJson,
  buildWeek,
  releases,
  profileText,
  missionText,
  retained,
  assessment,
  verification,
] = await Promise.all([
  readJson(allowedInputs.package),
  readText(allowedInputs.buildWeek),
  readText(allowedInputs.releases),
  readText(allowedInputs.profile),
  readText(allowedInputs.mission),
  readJson(allowedInputs.retained),
  readJson(allowedInputs.assessment),
  readJson(allowedInputs.verification),
]);

const profile = JSON.parse(profileText);
const mission = JSON.parse(missionText);
const formalRunId = 'run_4c2ba5f5-04ac-44d5-adb6-8937eb2ea165';
const formalCandidateRoot =
  'sha256:ef81cbf548d8a08e3811f0aa070b6ce0d58b52792f0bb56b5584dd806da4cb30';
const formalVerifierRoot =
  'sha256:04e31b07889f94a1d205231942bf30fa6c3b27864520b6a42de58604da53e544';

for (const publicFact of [formalRunId, formalCandidateRoot, formalVerifierRoot]) {
  if (!buildWeek.includes(publicFact)) {
    throw new Error(`BUILD_WEEK.md is missing film fact ${publicFact}`);
  }
}

const profileRoot = sha256(profileText);
const missionRoot = sha256(missionText);
if (profileRoot !== 'sha256:e2330e477bdab48aede90512b4cf3f86cccda5fa014b4e64edfed23797f8e254') {
  throw new Error(`Unexpected formal profile root: ${profileRoot}`);
}
if (missionRoot !== profile.draft_sha256) {
  throw new Error(`Mission root ${missionRoot} does not match ${profile.draft_sha256}`);
}

const release = {
  version: packageJson.version,
  commit: 'eccb3975505706b12c48c372e471c34303dffbd2',
  npmShasum: 'fd55cc35d22e82b1976adab2265dff09cc84a948',
  packageSha256:
    'sha256:b0b8f0357337b79e3dca0ef4a1c1b90a14885f3f01759666cd31f082675474c5',
  provenance: 'trusted publishing',
  assets: 'byte-identical',
};

for (const publicFact of [
  release.version,
  release.commit,
  release.npmShasum,
  release.packageSha256.slice('sha256:'.length),
]) {
  if (!releases.includes(publicFact)) {
    throw new Error(`docs/RELEASES.md is missing film fact ${publicFact}`);
  }
}

const generated = {
  schema: 'canopus.build-week-film-evidence.v1',
  generatedFrom: Object.values(allowedInputs),
  formal: {
    profile: profile.name,
    profileRoot,
    missionId: mission.id,
    missionRoot,
    model: mission.worker.model,
    target: profile.target,
    verifier: 'Lean 4.27.0',
    artifact: 'one proof term',
    forbidden: ['sorry', 'admit', 'new axioms', 'unsafe'],
    expectedRoute: profile.landing.expected_routes[0],
    acceptedStateDelta: profile.landing.max_accepted_delta,
    runId: formalRunId,
    worker: 'success',
    candidateRoot: formalCandidateRoot,
    workerEventsRoot:
      'sha256:767379f1720f9a1ecad7286f80f364cab582335b2753e95f483ccc28fbacfc2b',
    verifierResultRoot: formalVerifierRoot,
    verifierStatus: 'failed',
    verifierExitCode: 1,
    landingObserved: false,
  },
  retained: {
    runId: retained.run_id,
    model: retained.mission.model,
    claim: retained.claim,
    caveats: retained.caveats,
    nonclaims: retained.nonclaims,
    worker: retained.activity.worker,
    verifier: retained.activity.verifier,
    replay: retained.activity.clean_clone_replay,
    artifactRoots: retained.artifact_roots,
    verifierRoot: retained.verifier_root,
    receiptRoot: retained.receipt_root,
    route: retained.policy.route,
    acceptedStateDelta: retained.policy.accepted_state_delta,
    sourceCommit: retained.source.commit,
    finalCommit: retained.final.commit,
    reproduction: retained.reproduction.commands,
  },
  audit: {
    model: verification.model,
    status: verification.status,
    authority: verification.authority,
    assessmentRoot: verification.assessment_root,
    checks: verification.checks,
    scientificStateLanded: verification.scientific_state_landed,
    classification: assessment.language.classification,
    solvedLanguageDetected: assessment.language.solved_language_detected,
    universalClaimDetected: assessment.language.universal_claim_detected,
    numericCorrespondence: assessment.numeric_correspondence,
    route: assessment.standing.policy_route,
    acceptedStateDelta: assessment.standing.accepted_state_delta,
  },
  release,
};

await writeFile(
  resolve(videoRoot, 'src/data/evidence.generated.json'),
  `${JSON.stringify(generated, null, 2)}\n`,
  'utf8',
);

console.log(`Generated ${generated.schema}`);
