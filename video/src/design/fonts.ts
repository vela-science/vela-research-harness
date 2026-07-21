import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {type} from './tokens';

void loadFont({
  family: type.mono,
  url: staticFile('fonts/ibm-plex-mono-400-latin.woff2'),
  weight: '400',
  style: 'normal',
});

void loadFont({
  family: type.mono,
  url: staticFile('fonts/ibm-plex-mono-500-latin.woff2'),
  weight: '500',
  style: 'normal',
});

void loadFont({
  family: type.display,
  url: staticFile('fonts/newsreader-display-500-latin.woff2'),
  weight: '500',
  style: 'normal',
});

export {type as fontFamily};
