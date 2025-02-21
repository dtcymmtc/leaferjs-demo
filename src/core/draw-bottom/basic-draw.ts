import { App } from 'leafer-editor';
import { Debug } from '../helper/debug';
import { Snap } from '../snap';

export interface BasicDrawOptions {
  app: App;
  snap: Snap;
  debug: Debug;
}

class BasicDraw {
  app: App;
  snap: Snap;
  debug: Debug;

  constructor(options: BasicDrawOptions) {
    this.app = options.app;
    this.snap = options.snap;
    this.debug = options.debug;
  }
}

export { BasicDraw };
