import { Line } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { getLinePoints } from '../helper';
import { EdgeAnnotations, type EdgeAnnotationsUpdateOptions } from './edge-annotations';

interface HintInputOptions extends BasicDrawOptions {
  autoFocus?: boolean;
  suffix?: string;
  onChange?: (value: string) => void;
  type?: 'line' | 'arc';
  target: Line;
}

/**
 * 提示输入框类，用于显示和管理输入框
 */
class HintInput extends BasicDraw {
  input: HTMLInputElement = document.createElement('input');
  timer: number | undefined = undefined;
  autoFocus = false;
  suffix: string | undefined;
  edgeAnnotations: EdgeAnnotations;
  type: Required<HintInputOptions>['type'];
  target: HintInputOptions['target'];

  /**
   * 创建一个提示输入框实例
   * @param {HintInputOptions} options - 配置选项
   */
  constructor(options: HintInputOptions) {
    super(options);

    if (this.app.view instanceof HTMLElement) {
      this.app.view.appendChild(this.input);
    }

    this.type = options.type ?? 'line';
    this.autoFocus = options?.autoFocus ?? false;
    this.suffix = options?.suffix;
    this.target = options.target;
    this.edgeAnnotations = new EdgeAnnotations({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      points: [],
      type: this.type,
      showLabel: false,
      showLine: this.type === 'line',
    });

    this.input.style.display = 'none';
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.hideInput();
        options?.onChange?.(this.input.value);
      }
    });
  }

  /**
   * 设置输入框的偏移值
   * @param {number} x - 水平偏移值
   * @param {number} y - 垂直偏移值
   */
  setOffset(x: number, y: number) {
    this.input.style.marginTop = `${y}px`;
    this.input.style.marginLeft = `${x}px`;
  }

  /**
   * 显示输入框
   * @param {Line} line - 参考线条
   * @param {number|string} [num] - 显示的数值
   * @param {boolean} [disabled=false] - 是否禁用输入框
   */
  showInput(num?: number | string, disabled = false) {
    if (!num) {
      this.hideInput();
      return;
    }

    this.showAnnotation(this.target, {
      showLabel: false,
    });

    const label = this.edgeAnnotations.annotations.labels[0];
    const position = this.app.getWorldPointByPage(label.position);

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.input.blur();

    this.input.tabIndex = 1;
    this.input.className = 'ant-input';
    this.input.style.position = 'absolute';
    this.input.style.borderRadius = '2px';
    this.input.style.textAlign = 'center';
    this.input.style.height = '20px';
    this.input.style.width = '50px';
    this.input.style.padding = '0';
    this.input.style.transform = 'translate(-50%, -50%)';
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

  /** 隐藏输入框 */
  hideInput() {
    this.input.style.display = 'none';

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.input.blur();
  }

  /** 显示标注  */
  showAnnotation(line: Line, options?: EdgeAnnotationsUpdateOptions) {
    this.edgeAnnotations.update({
      points: getLinePoints(line),
      ...options,
    });
  }

  /** 隐藏标注  */
  hideAnnotation() {
    this.edgeAnnotations.clear();
  }
}

export { HintInput };
