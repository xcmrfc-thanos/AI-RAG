import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { GraphicComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  GraphChart,
  GraphicComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };
export const init = echarts.init;
