import {Img, staticFile} from 'remotion';
import {colors, type} from '../design/tokens';

export const BrowserFrame = ({
  src,
  address,
}: {
  src: string;
  address: string;
}) => (
  <div
    style={{
      padding: 7,
      borderRadius: 30,
      backgroundColor: 'rgba(8, 18, 36, 0.12)',
      border: '1px solid rgba(8, 18, 36, 0.12)',
      boxShadow: '0 32px 90px rgba(8, 18, 36, 0.2)',
    }}
  >
    <div
      style={{
        overflow: 'hidden',
        borderRadius: 23,
        backgroundColor: colors.light,
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}
    >
      <div
        style={{
          height: 54,
          display: 'grid',
          gridTemplateColumns: '120px 1fr 120px',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid rgba(8, 18, 36, 0.1)',
          backgroundColor: '#FBFAF7',
        }}
      >
        <div style={{display: 'flex', gap: 9}}>
          {['#9C3F4A', '#B7832F', '#4F8F8B'].map((color) => (
            <div
              key={color}
              style={{width: 11, height: 11, borderRadius: 999, backgroundColor: color}}
            />
          ))}
        </div>
        <div
          style={{
            justifySelf: 'center',
            color: colors.slate,
            fontFamily: type.mono,
            fontSize: 17,
          }}
        >
          {address}
        </div>
        <div
          style={{
            justifySelf: 'end',
            padding: '5px 10px',
            borderRadius: 999,
            color: '#2F6F6B',
            backgroundColor: 'rgba(79, 143, 139, 0.1)',
            fontFamily: type.mono,
            fontSize: 14,
            textTransform: 'uppercase',
          }}
        >
          live
        </div>
      </div>
      <Img
        src={staticFile(src)}
        style={{display: 'block', width: '100%', height: 650, objectFit: 'cover', objectPosition: 'top'}}
      />
    </div>
  </div>
);
