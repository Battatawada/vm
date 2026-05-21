import { Sourcerer } from '@/providers/base';

import { vidrockScraper } from './sources/vidrock';
import { vidlinkScraper } from './sources/vidlink';
import { vidsrcScraper } from './sources/vidsrc';

export function gatherAllSources(): Array<Sourcerer> {
  return [
    vidsrcScraper,
    vidrockScraper,
    vidlinkScraper,
  ];
}

export function gatherAllEmbeds(): any[] {
  return [];
}
