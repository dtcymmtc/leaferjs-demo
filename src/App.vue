<template>
  <Space
    style="position: absolute; top: 24px; left: 50%; transform: translate(-50%, 0); z-index: 999"
  >
    <Button @click="drawBottom.reset">重置</Button>
    <Button @click="drawBottom.undo">撤销</Button>
    <Button @click="drawBottom.exportData">导出数据</Button>
    <Button @click="importData">导入矩形腔体</Button>
    <Button @click="importBigData">导入复杂腔体</Button>
  </Space>
</template>
<script setup lang="ts">
import { Button, Space } from 'ant-design-vue';
import { App } from 'leafer-editor';
import { DotMatrix } from 'leafer-x-dot-matrix';
import { Debug, DrawBottom, Snap } from './core';

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
    min: 0.125,
    max: 4,
  },
});

// 创建点阵实例
const dotMatrix = new DotMatrix(app);
// 启用点阵显示
dotMatrix.enableDotMatrix(true);

const snap = new Snap({ app });
const debug = new Debug();
const drawBottom = new DrawBottom({
  app,
  debug,
  snap,
});

const importData = () => {
  drawBottom.importData([
    {
      x: 353,
      y: 203,
    },
    {
      x: 353,
      y: 594,
    },
    {
      x: 872,
      y: 594,
    },
    {
      x: 872,
      y: 203,
    },
  ]);
};

// 导入复杂数据
const importBigData = () => {
  drawBottom.importData([
    {
      x: 183,
      y: 141,
    },
    {
      x: 183,
      y: 249,
    },
    {
      x: 296,
      y: 249,
    },
    {
      x: 296,
      y: 307,
    },
    {
      x: 183,
      y: 307,
    },
    {
      x: 183,
      y: 355,
    },
    {
      x: 296,
      y: 355,
    },
    {
      x: 296,
      y: 466,
    },
    {
      x: 120,
      y: 466,
    },
    {
      x: 131,
      y: 564,
    },
    {
      x: 91,
      y: 670,
    },
    {
      x: 275,
      y: 658,
    },
    {
      x: 255,
      y: 564,
    },
    {
      x: 412,
      y: 582,
    },
    {
      x: 385,
      y: 670,
    },
    {
      x: 183,
      y: 794,
    },
    {
      x: 548,
      y: 636,
    },
    {
      x: 625,
      y: 744,
    },
    {
      x: 523,
      y: 820,
    },
    {
      x: 755,
      y: 794,
    },
    {
      x: 1006,
      y: 744,
    },
    {
      x: 980,
      y: 658,
    },
    {
      x: 1088,
      y: 582,
    },
    {
      x: 1047,
      y: 434,
    },
    {
      x: 908,
      y: 493,
    },
    {
      x: 939,
      y: 623,
    },
    {
      x: 827,
      y: 623,
    },
    {
      x: 791,
      y: 530,
    },
    {
      x: 755,
      y: 582,
    },
    {
      x: 720,
      y: 670,
    },
    {
      x: 672,
      y: 598,
    },
    {
      x: 701,
      y: 506,
    },
    {
      x: 857,
      y: 447,
    },
    {
      x: 573,
      y: 434,
    },
    {
      x: 605,
      y: 546,
    },
    {
      x: 523,
      y: 564,
    },
    {
      x: 484,
      y: 506,
    },
    {
      x: 523,
      y: 466,
    },
    {
      x: 412,
      y: 434,
    },
    {
      x: 412,
      y: 402,
    },
    {
      x: 672,
      y: 338,
    },
    {
      x: 966,
      y: 205,
    },
    {
      x: 1125,
      y: 230,
    },
    {
      x: 791,
      y: 383,
    },
    {
      x: 1177,
      y: 318,
    },
    {
      x: 1189,
      y: 218,
    },
    {
      x: 1161,
      y: 75,
    },
    {
      x: 875,
      y: 141,
    },
    {
      x: 857,
      y: 100,
    },
    {
      x: 701,
      y: 100,
    },
    {
      x: 701,
      y: 183,
    },
    {
      x: 573,
      y: 249,
    },
    {
      x: 523,
      y: 117,
    },
    {
      x: 347,
      y: 183,
    },
    {
      x: 234,
      y: 171,
    },
    {
      x: 336,
      y: 75,
    },
  ]);
};
</script>
