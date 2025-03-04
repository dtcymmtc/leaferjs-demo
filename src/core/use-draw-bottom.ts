import { App } from 'leafer-editor';
import { DotMatrix } from 'leafer-x-dot-matrix';
import { ref, watch, type Ref } from 'vue';
import * as Constants from './constants';
import { DrawBottom } from './draw-bottom';
import { convertSize } from './helper';
import { Debug } from './helper/debug';
import { Snap } from './snap';

export const useDrawBottom = (eleRef: Ref<HTMLElement | undefined>) => {
  const drawBottom = ref<DrawBottom>();

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

  return {
    importData,
    exportData,
    reset,
    undo,
  };
};
