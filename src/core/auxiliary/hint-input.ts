import { Line } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { EdgeAnnotations } from '../draw-bottom/edge-annotations';
import { getLinePoints } from '../helper';

interface HintInputOptions extends BasicDrawOptions {
  autoFocus?: boolean;
  suffix?: string;
  onChange?: (value: string) => void;
  type?: 'line' | 'arc';
}

/** 提示输入框类，用于显示和管理输入框 */
class HintInput extends BasicDraw {
  input: HTMLInputElement = document.createElement('input');
  timer: number | undefined = undefined;
  autoFocus = false;
  suffix: string | undefined;
  edgeAnnotations: EdgeAnnotations | undefined;
  type: Required<HintInputOptions>['type'];

  constructor(options: HintInputOptions) {
    super(options);

    document.body.appendChild(this.input);

    this.type = options.type ?? 'line';
    this.autoFocus = options?.autoFocus ?? false;
    this.suffix = options?.suffix;

    this.input.tabIndex = 1;
    this.input.className = 'ant-input';
    this.input.style.position = 'absolute';
    this.input.style.display = 'none';
    this.input.style.borderRadius = '2px';
    this.input.style.textAlign = 'center';
    this.input.style.height = '22px';
    this.input.style.width = '50px';
    this.input.style.padding = '0';
    this.input.style.transform = 'translate(-50%, 0)';

    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.hide();
        options?.onChange?.(this.input.value);
      }
    });
  }

  /** 隐藏输入框 */
  hide() {
    this.edgeAnnotations?.clear();
    this.input.style.display = 'none';

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.input.blur();
  }

  /**
   * 显示输入框
   * @param line - 参考线条
   * @param num - 显示的数值
   * @param disabled - 是否禁用输入框
   */
  show(line: Line, num?: number | string, disabled = false) {
    if (!num) {
      this.hide();
      return;
    }

    this.edgeAnnotations?.clear();
    this.edgeAnnotations = new EdgeAnnotations({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      points: getLinePoints(line),
      type: this.type,
      showLabel: false,
      showLine: this.type === 'line',
    });

    const label = this.edgeAnnotations.annotations.labels[0];
    const position = this.app.getWorldPointByPage(label.position);

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.input.blur();

    this.input.style.display = 'block';
    this.input.style.left = `${position.x}px`;
    this.input.style.top = `${position.y}px`;
    this.input.style.transformOrigin = 'center';
    this.input.style.transition = 'none';
    this.input.disabled = disabled;

    if (typeof num === 'string') {
      this.input.value = `${num}${this.suffix ?? ''}`;
    } else {
      this.input.value = `${Math.ceil(num ?? 0)}${this.suffix ?? ''}`;
    }

    if (this.autoFocus) {
      this.timer = setTimeout(() => {
        if (this.input.disabled) return;

        this.input.focus();
        this.input.select();
      }, 400);
    }
  }

  /**
   * 设置输入框的偏移值
   * @param x - 水平偏移值
   * @param y - 垂直偏移值
   */
  setOffset(x: number, y: number) {
    this.input.style.marginTop = `${y}px`;
    this.input.style.marginLeft = `${x}px`;
  }
}

export { HintInput };
