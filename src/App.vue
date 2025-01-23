<template>
  <Space
    style="position: absolute; top: 24px; left: 50%; transform: translate(-50%, 0); z-index: 999"
  >
    <Button @click="drawBottom.reset">重置</Button>
    <Button @click="drawBottom.undo">撤销</Button>
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
</script>
