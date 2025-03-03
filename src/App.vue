<template>
  <Space
    style="position: absolute; top: 24px; left: 50%; transform: translate(-50%, 0); z-index: 999"
  >
    <Button @click="drawBottom.reset">重置</Button>
    <Button @click="drawBottom.undo">撤销</Button>
    <Button @click="drawBottom.exportData">导出数据</Button>
    <Button v-for="(item, index) in dataList" :key="index" @click="importData(item)">
      导入数据{{ index + 1 }}
    </Button>
  </Space>
</template>
<script setup lang="ts">
import { Button, Space } from 'ant-design-vue';
import { App } from 'leafer-editor';
import { DotMatrix } from 'leafer-x-dot-matrix';
import { Constants, Debug, DrawBottom, Snap } from './core';
import { convertSize } from './core/helper';

const app = new App({
  view: window,
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
const drawBottom = new DrawBottom({
  app,
  debug,
  snap,
});

type DataItem = Array<{
  x: number;
  y: number;
}>;

const dataList: DataItem[] = [
  [
    {
      x: 0,
      y: 0,
    },
    {
      x: 5000,
      y: 0,
    },
    {
      x: 5000,
      y: -5000,
    },
    {
      x: 0,
      y: -5000,
    },
  ],
  [
    {
      x: 2600,
      y: 1656,
    },
    {
      x: 2600,
      y: 4656,
    },
    {
      x: 8600,
      y: 4656,
    },
    {
      x: 8600,
      y: 1656,
    },
    {
      x: 6600,
      y: 1656,
    },
    {
      x: 6600,
      y: 3156,
    },
    {
      x: 4600,
      y: 3156,
    },
    {
      x: 4600,
      y: 1656,
    },
  ],
  [
    {
      x: 1696,
      y: 1088,
    },
    {
      x: 1696,
      y: 2520,
    },
    {
      x: 624,
      y: 3400,
    },
    {
      x: 1600,
      y: 3912,
    },
    {
      x: 624,
      y: 4760,
    },
    {
      x: 2032,
      y: 5144,
    },
    {
      x: 2032,
      y: 4384,
    },
    {
      x: 3088,
      y: 5288,
    },
    {
      x: 2256,
      y: 5744,
    },
    {
      x: 1152,
      y: 5744,
    },
    {
      x: 1152,
      y: 6512,
    },
    {
      x: 5176,
      y: 6728,
    },
    {
      x: 4152,
      y: 6088,
    },
    {
      x: 5952,
      y: 6176,
    },
    {
      x: 5952,
      y: 6728,
    },
    {
      x: 8208,
      y: 6512,
    },
    {
      x: 7264,
      y: 5744,
    },
    {
      x: 8472,
      y: 5440,
    },
    {
      x: 4152,
      y: 5288,
    },
    {
      x: 4000,
      y: 4384,
    },
    {
      x: 8208,
      y: 4384,
    },
    {
      x: 8208,
      y: 3624,
    },
    {
      x: 6336,
      y: 3624,
    },
    {
      x: 6336,
      y: 2520,
    },
    {
      x: 8048,
      y: 2520,
    },
    {
      x: 8208,
      y: 1504,
    },
    {
      x: 5952,
      y: 1272,
    },
    {
      x: 5400,
      y: 3624,
    },
    {
      x: 3184,
      y: 3912,
    },
    {
      x: 3280,
      y: 2720,
    },
    {
      x: 4752,
      y: 2360,
    },
    {
      x: 3088,
      y: 1504,
    },
    {
      x: 2560,
      y: 1704,
    },
  ],
  [
    {
      x: 5424,
      y: 4168,
    },
    {
      x: 3088,
      y: 4168,
    },
    {
      x: 3088,
      y: 2120,
    },
    {
      x: 5424,
      y: 2120,
    },
  ],
  [
    {
      x: 3432,
      y: 2632,
    },
    {
      x: 3432,
      y: 4920,
    },
    {
      x: 5552,
      y: 4920,
    },
    {
      x: 5552,
      y: 2632,
    },
  ],
];

const importData = (dataItem: DataItem) => {
  drawBottom.importData(dataItem);
};
</script>
