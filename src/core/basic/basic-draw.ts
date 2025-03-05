import { App } from 'leafer-editor';
import { Debug } from '../helper/debug';
import { Snap } from '../snap';

/**
 * 基础绘图选项接口
 * @typedef {Object} BasicDrawOptions
 * @property {App} app - 应用实例
 * @property {Snap} snap - 吸附实例
 * @property {Debug} debug - 调试实例
 */
export interface BasicDrawOptions {
  app: App;
  snap: Snap;
  debug: Debug;
}

/**
 * 基础绘图类
 * @class
 */
class BasicDraw {
  /**
   * 应用实例
   * @type {App}
   */
  app: App;

  /**
   * 吸附实例
   * @type {Snap}
   */
  snap: Snap;

  /**
   * 调试实例
   * @type {Debug}
   */
  debug: Debug;

  /**
   * 创建一个基础绘图实例
   * @param {BasicDrawOptions} options - 配置选项
   */
  constructor(options: BasicDrawOptions) {
    this.app = options.app;
    this.snap = options.snap;
    this.debug = options.debug;
  }
}

export { BasicDraw };
