import { App } from 'leafer-editor';
import { DotMatrix } from 'leafer-x-dot-matrix';
import { ref, shallowRef, watch, type Ref } from 'vue';
import * as Constants from './constants';
import { DrawBottom } from './draw-bottom';
import { convertSize } from './helper';
import { Debug } from './helper/debug';
import { Snap } from './snap';

/**
 * 使用底部绘制功能的钩子函数
 * @param {Ref<HTMLElement | undefined>} eleRef - 元素引用
 * @returns {Object} 包含导入、导出、重置、撤销、恢复等功能的对象
 */
export const useDrawBottom = (eleRef: Ref<HTMLElement | undefined>) => {
  let drawBottom = shallowRef<DrawBottom>();
  const canUndo = ref(false);
  const canRedo = ref(false);
  const orthogonal = ref(false);
  const showAngle = ref(true);

  const init = () => {
    const app = new App({
      view: eleRef.value,
      editor: {}, // 会自动创建 editor实例、tree层、sky层
      wheel: {
        zoomMode: true,
      },
      move: {
        drag: 'auto',
      },
      zoom: {
        min: Constants.DEFAULT_ZOOM_SCALE / 4,
        max: Constants.DEFAULT_ZOOM_SCALE * 4,
      },
      cursor: false,
    });

    // 创建点阵实例
    const dotMatrix = new DotMatrix(app, {
      dotMatrixGapMap: [convertSize(50)],
    });
    // 启用点阵显示
    dotMatrix.enableDotMatrix(true);

    const snap = new Snap({ app });
    const debug = new Debug();
    drawBottom.value = new DrawBottom({
      app,
      debug,
      snap,
      onHistoryChange: (undoStatus, redoStatus) => {
        canRedo.value = redoStatus;
        canUndo.value = undoStatus;
      },
      onOrthogonalChange: (value) => {
        orthogonal.value = value;
      },
      onShowAngleChange: (value) => {
        showAngle.value = value;
      },
    });
  };

  watch(
    () => eleRef.value,
    (newValue, oldValue) => {
      if (!oldValue && newValue) {
        init();
      }
    },
    {
      immediate: true,
    },
  );

  const importData: DrawBottom['importData'] = (data) => {
    drawBottom.value?.importData(data);
  };

  const exportData: DrawBottom['exportData'] = () => {
    return drawBottom.value?.exportData() ?? [];
  };

  const reset: DrawBottom['reset'] = () => {
    return drawBottom.value?.reset();
  };

  const undo: DrawBottom['undo'] = () => {
    return drawBottom.value?.undo();
  };

  const redo: DrawBottom['redo'] = () => {
    return drawBottom.value?.redo();
  };

  const toggleOrthogonal: DrawBottom['toggleOrthogonal'] = () => {
    return drawBottom.value?.toggleOrthogonal();
  };

  const toggleShowAngle: DrawBottom['toggleShowAngle'] = () => {
    return drawBottom.value?.toggleShowAngle();
  };

  return {
    /** 导入数据 */
    importData,
    /** 导出数据 */
    exportData,
    /** 重置绘制状态 */
    reset,
    /** 撤销上一步操作 */
    undo,
    /** 恢复上一步撤销的操作 */
    redo,
    /** 切换正交绘制状态　*/
    toggleOrthogonal,
    /** 切换显示夹角状态*/
    toggleShowAngle,
    /** 是否可以撤回 */
    canUndo,
    /** 是否可以恢复 */
    canRedo,
    /** 是否正交 */
    orthogonal,
    /** 是否显示夹角 */
    showAngle,
  };
};
