import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, type} from '../design/tokens';

type Shot = {
  address: string;
  end: number;
  endY?: number;
  label: string;
  src: string;
  start: number;
  startY?: number;
};

const ShotLayer = ({shot, frame}: {shot: Shot; frame: number}) => {
  const fade = interpolate(
    frame,
    [shot.start, shot.start + 12, shot.end - 12, shot.end],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const scrollY = interpolate(
    frame,
    [shot.start, shot.end],
    [shot.startY ?? 0, shot.endY ?? shot.startY ?? 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const zoom = interpolate(frame, [shot.start, shot.end], [1.005, 1.025], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Img
        src={staticFile(shot.src)}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          transform: `translateY(${-scrollY}px) scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 26,
          padding: '9px 14px',
          borderRadius: 999,
          backgroundColor: 'rgba(5, 12, 24, 0.88)',
          border: '1px solid rgba(247, 246, 242, 0.18)',
          color: colors.light,
          fontFamily: type.mono,
          fontSize: 15,
          letterSpacing: '0.04em',
          boxShadow: '0 12px 35px rgba(5, 12, 24, 0.28)',
        }}
      >
        {shot.label}
      </div>
    </div>
  );
};

const ProductDemoScene = ({
  chapter,
  eyebrow,
  shots,
}: {
  chapter: string;
  eyebrow: string;
  shots: Shot[];
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: colors.midnight,
        color: colors.light,
        fontFamily: type.sans,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 24,
          borderRadius: 28,
          border: `1px solid ${colors.darkBorder}`,
        }}
      />
      <header
        style={{
          position: 'absolute',
          top: 36,
          left: 72,
          right: 72,
          display: 'flex',
          justifyContent: 'space-between',
          color: colors.mist,
          fontFamily: type.mono,
          fontSize: 17,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>{eyebrow}</span>
        <span>{chapter}</span>
      </header>

      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 52,
          right: 52,
          height: 802,
          padding: 7,
          borderRadius: 27,
          border: `1px solid ${colors.darkBorder}`,
          backgroundColor: 'rgba(247, 246, 242, 0.035)',
          boxShadow: '0 36px 110px rgba(1, 7, 17, 0.42)',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            height: '100%',
            borderRadius: 19,
            border: `1px solid ${colors.darkBorder}`,
            backgroundColor: colors.light,
          }}
        >
          <div
            style={{
              height: 48,
              display: 'grid',
              gridTemplateColumns: '110px 1fr 110px',
              alignItems: 'center',
              padding: '0 18px',
              backgroundColor: '#FBFAF7',
              borderBottom: '1px solid rgba(8, 18, 36, 0.1)',
            }}
          >
            <div style={{display: 'flex', gap: 8}}>
              {['#9C3F4A', '#B7832F', '#4F8F8B'].map((color) => (
                <span key={color} style={{width: 10, height: 10, borderRadius: 99, backgroundColor: color}} />
              ))}
            </div>
            <div
              style={{
                justifySelf: 'center',
                color: colors.slate,
                fontFamily: type.mono,
                fontSize: 16,
              }}
            >
              {shots.find((shot) => frame >= shot.start && frame < shot.end)?.address ?? shots[0].address}
            </div>
            <div
              style={{
                justifySelf: 'end',
                color: colors.evidence,
                fontFamily: type.mono,
                fontSize: 14,
                textTransform: 'uppercase',
              }}
            >
              live
            </div>
          </div>
          <div style={{position: 'relative', height: 740, overflow: 'hidden'}}>
            {shots.map((shot) => (
              <ShotLayer key={`${shot.src}-${shot.start}`} shot={shot} frame={frame} />
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 74,
          right: 74,
          bottom: 170,
          height: 2,
          backgroundColor: colors.stardust,
          opacity: 0.72,
        }}
      />
    </div>
  );
};

export const VelaProductSurface = () => (
  <ProductDemoScene
    eyebrow="The governed substrate"
    chapter="02 / vela"
    shots={[
      {
        address: 'vela.space',
        end: 474,
        label: 'PUBLIC PROTOCOL · LIVE',
        src: 'captures/product-demo/vela-space.jpg',
        start: 0,
        startY: 0,
        endY: 48,
      },
    ]}
  />
);

export const MissionProductSurface = () => (
  <ProductDemoScene
    eyebrow="Exact mission registration"
    chapter="03 / mission"
    shots={[
      {
        address: 'github.com/vela-science/vela-research-harness',
        end: 240,
        label: 'PUBLIC CANOPUS REPOSITORY',
        src: 'captures/product-demo/github-canopus.jpg',
        start: 0,
        startY: 0,
        endY: 58,
      },
      {
        address: 'github.com/vela-science/vela-research-harness / profiles',
        end: 786,
        label: 'GPT-5.6 · SIDON a(24) · ZERO AUTHORITY',
        src: 'captures/product-demo/github-mission.jpg',
        start: 228,
        startY: 0,
        endY: 105,
      },
    ]}
  />
);

export const ArtifactProductSurface = () => (
  <ProductDemoScene
    eyebrow="Worker output · immutable artifact"
    chapter="04 / artifact"
    shots={[
      {
        address: 'github.com/vela-science/sidon-frontier / artifact',
        end: 456,
        label: '7,194-POINT WITNESS · AUDIT COMMIT 825657d7',
        src: 'captures/product-demo/github-sidon-artifact.jpg',
        start: 0,
        startY: 0,
        endY: 82,
      },
    ]}
  />
);

export const VerifierProductSurface = () => (
  <ProductDemoScene
    eyebrow="Independently authored verifier"
    chapter="05 / verifier"
    shots={[
      {
        address: 'github.com/vela-science/sidon-frontier / verification',
        end: 570,
        label: 'READ-ONLY · NETWORK-DENIED · EXACT REPLAY',
        src: 'captures/product-demo/github-independent-verifier.jpg',
        start: 0,
        startY: 0,
        endY: 96,
      },
    ]}
  />
);

export const ObservatoryProductSurface = () => (
  <ProductDemoScene
    eyebrow="Vela Observatory · public evidence"
    chapter="06 / route"
    shots={[
      {
        address: 'app.vela.space / sidon-sets / run f68e4cfc',
        end: 300,
        label: 'WORKER SUCCESS · VERIFIER PASS · DEFER · Δ 0',
        src: 'captures/product-demo/observatory-run.jpg',
        start: 0,
        startY: 0,
        endY: 44,
      },
      {
        address: 'app.vela.space / sidon-sets / evidence chain',
        end: 530,
        label: 'MISSION → ARTIFACT → VERIFIER → PROPOSAL → DECISION',
        src: 'captures/product-demo/observatory-run-detail.jpg',
        start: 288,
        startY: 0,
        endY: 34,
      },
      {
        address: 'app.vela.space / sidon-sets / bound roots',
        end: 741,
        label: 'ROOT-BOUND RECEIPT · PENDING HUMAN REVIEW',
        src: 'captures/product-demo/observatory-run-roots.jpg',
        start: 518,
        startY: 0,
        endY: 34,
      },
    ]}
  />
);

export const ReleaseProductSurface = () => (
  <ProductDemoScene
    eyebrow="Published package · trusted release"
    chapter="08 / release"
    shots={[
      {
        address: 'npmjs.com/package/@vela-science/canopus',
        end: 300,
        label: 'CANOPUS 0.6.2 · PUBLIC ON NPM',
        src: 'captures/product-demo/npm-canopus.jpg',
        start: 0,
        startY: 0,
        endY: 76,
      },
    ]}
  />
);

export const ReproductionProductSurface = () => (
  <ProductDemoScene
    eyebrow="Public ledger · no rebuild required"
    chapter="09 / reproduce"
    shots={[
      {
        address: 'github.com/vela-science/vela-research-harness / BUILD_WEEK.md',
        end: 213,
        label: 'DATED DELTA · RUN ID · ROOTS · REPRODUCTION',
        src: 'captures/product-demo/github-build-week.jpg',
        start: 0,
        startY: 0,
        endY: 58,
      },
    ]}
  />
);
