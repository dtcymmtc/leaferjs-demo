import { Point } from 'leafer-editor';

/**
 * @typedef {Object} DrawHistoryOptions
 * @property {Function} [onHistoryChange] - 历史记录变化回调
 */
interface DrawHistoryOptions {
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

class DrawHistory {
  /** 历史记录栈 */
  private historyStack: Point[][][] = [];
  /** 撤销栈 */
  private redoStack: Point[][][] = [];
  /** 历史记录变化回调 */
  onHistoryChangeCallback: DrawHistoryOptions['onHistoryChange'];

  constructor(options: DrawHistoryOptions) {
    this.onHistoryChangeCallback = options.onHistoryChange;
  }

  updateHistory() {
    this.onHistoryChangeCallback?.(this.historyStack.length > 0, this.redoStack.length > 0);
  }

  /**
   * 保存当前状态到历史记录栈
   * @param {Point[][]} currentState - 当前状态
   */
  saveHistory(currentState: Point[][]) {
    this.historyStack.push([...currentState]);
    // 清空撤销栈
    this.redoStack = [];

    this.updateHistory();
  }

  /**
   * 撤销上一步操作
   * @param {Point[][]} currentState - 当前状态
   * @returns {Point[][] | undefined} - 撤销后的状态
   */
  undo(currentState: Point[][]): Point[][] | undefined {
    if (this.historyStack.length === 0) return;

    // 保存当前状态到撤销栈
    this.redoStack.push([...currentState]);

    // 从历史记录栈中恢复上一个状态
    const result = this.historyStack.pop();

    this.updateHistory();

    return result;
  }

  /**
   * 恢复上一步撤销的操作
   * @param {Point[][]} currentState - 当前状态
   * @returns {Point[][] | undefined} - 恢复后的状态
   */
  redo(currentState: Point[][]): Point[][] | undefined {
    if (this.redoStack.length === 0) return;

    // 保存当前状态到历史记录栈
    this.historyStack.push([...currentState]);

    // 从撤销栈中恢复上一个状态
    const result = this.redoStack.pop();

    this.updateHistory();

    return result;
  }

  /** 清空历史记录 */
  clear() {
    this.historyStack = [];
    this.redoStack = [];

    this.updateHistory();
  }
}

export { DrawHistory };
