import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const videoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(videoRoot, '..');

const allowedInputs = {
  package: 'package.json',
  buildWeek: 'BUILD_WEEK.md',
  changelog: 'CHANGELOG.md',
  profile: 'profiles/sidon-a24-at-least-7194-gpt56-v3.json',
  mission: 'missions/sidon-a24-at-least-7194-gpt56-v3/mission.draft.json',
  primary:
    'evidence/build-week/run_f68e4cfc-e5c7-4c73-86cb-d79807c47ec4.public.json',
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

const [packageJson, buildWeek, changelog, profileText, missionText, primary] =
  await Promise.all([
    readJson(allowedInputs.package),
    readText(allowedInputs.buildWeek),
    readText(allowedInputs.changelog),
    readText(allowedInputs.profile),
    readText(allowedInputs.mission),
    readJson(allowedInputs.primary),
  ]);

const profile = JSON.parse(profileText);
const mission = JSON.parse(missionText);
const profileRoot = sha256(profileText);
const missionRoot = sha256(missionText);

if (profileRoot !== primary.mission.registration_root) {
  throw new Error(`Profile root ${profileRoot} does not match public projection`);
}
if (missionRoot !== profile.draft_sha256) {
  throw new Error(`Mission root ${missionRoot} does not match profile draft root`);
}

const requiredFacts = [
  primary.run_id,
  primary.mission.id,
  primary.mission.model,
  primary.policy.proposal_id,
  primary.receipt_root,
  primary.verifier_root,
  primary.final.commit,
  '25,880,415',
];
for (const publicFact of requiredFacts) {
  if (!buildWeek.includes(String(publicFact))) {
    throw new Error(`BUILD_WEEK.md is missing film fact ${publicFact}`);
  }
}

if (packageJson.version !== '0.6.2' || !changelog.includes('## 0.6.2')) {
  throw new Error(`Expected the released Build Week package 0.6.2`);
}

const generated = {
  schema: 'canopus.build-week-film-evidence.v2',
  generatedFrom: Object.values(allowedInputs),
  primary: {
    profile: profile.name,
    profileRoot,
    missionId: mission.id,
    missionRoot,
    model: mission.worker.model,
    target: primary.mission.target,
    targetPacketRoot: primary.mission.target_packet_root,
    baselineSize: 7193,
    candidateSize: 7194,
    exchange: {
      removedBaselineIndex: 72,
      addedHexPoints: ['970f25', '246891'],
    },
    pairSumsChecked: 25880415,
    claim: primary.claim,
    caveats: primary.caveats,
    nonclaims: primary.nonclaims,
    runId: primary.run_id,
    worker: primary.activity.worker,
    verifier: primary.activity.verifier,
    replay: primary.activity.clean_clone_replay,
    artifactRoot: primary.artifact_roots[1],
    artifactRoots: primary.artifact_roots,
    verifierRoot: primary.verifier_root,
    receiptRoot: primary.receipt_root,
    proposalId: primary.policy.proposal_id,
    route: primary.policy.route,
    acceptedStateDelta: primary.policy.accepted_state_delta,
    sourceCommit: primary.source.commit,
    finalCommit: primary.final.commit,
    reproduction: primary.reproduction.commands,
    usage: primary.usage,
  },
  failClosed: {
    profile: 'formal-erdos-505-test-dim-one-gpt56',
    model: 'gpt-5.6-sol',
    runId: 'run_4c2ba5f5-04ac-44d5-adb6-8937eb2ea165',
    worker: 'success',
    verifier: 'failed',
    verifierExitCode: 1,
    landingObserved: false,
    receiptProduced: false,
    acceptedStateDelta: 0,
    verifierRoot:
      'sha256:04e31b07889f94a1d205231942bf30fa6c3b27864520b6a42de58604da53e544',
  },
  release: {
    canopusVersion: packageJson.version,
    canopusCommit: '43c1aa97165bd9c7e9b2dcbd232155f42ca8410c',
    packageSha256:
      'sha256:7c82af47782c07c332f6b60020c9205da3d60132e970df0a3c7678545596a812',
    npmShasum: 'ee1f69bcaf616982af3d27bfb2a60cb243252f81',
    provenance: 'SLSA provenance v1',
    velaVersion: '0.912.0',
    observatoryVersion: '0.340.7',
    observatoryCommit: '7e71d031355c3476e4eb144bae5ed5e2d29ff23c',
  },
  independentAudit: {
    frontierCommit: '825657d7e87618c0aa6fc9af7e3182e05f324750',
    verifierSourceRoot:
      'sha256:ddbef08b366138005618c937d732f95361488db22104d86819f5d212b89bf254',
    reportRoot:
      'sha256:39c3a08515ecd4ad7312a5a04f3d2ea5c0e0f73d00acff8bdfe47d550fab2937',
    reproduction: [
      'git clone https://github.com/vela-science/sidon-frontier.git',
      'cd sidon-frontier',
      'git checkout 825657d7e87618c0aa6fc9af7e3182e05f324750',
      'vela reproduce artifacts/sidon-a24-gpt56-7194.witness.json',
      'node verification/verify-sidon-a24-7194.mjs artifacts/sidon-a24-gpt56-7194.witness.json',
    ],
  },
};

for (const fact of [
  generated.failClosed.runId,
  generated.failClosed.verifierRoot,
]) {
  if (!buildWeek.includes(fact)) {
    throw new Error(`BUILD_WEEK.md is missing fail-closed film fact ${fact}`);
  }
}

await writeFile(
  resolve(videoRoot, 'src/data/evidence.generated.json'),
  `${JSON.stringify(generated, null, 2)}\n`,
  'utf8',
);

console.log(`Generated ${generated.schema}`);
