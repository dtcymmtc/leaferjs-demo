import { Bounds, Line } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { getBoundsCenter } from '../helper';

interface HintInputOptions extends BasicDrawOptions {
  autoFocus?: boolean;
  suffix?: string;
  onChange?: (value: string) => void;
}

/** 提示输入框类，用于显示和管理输入框 */
class HintInput extends BasicDraw {
  input: HTMLInputElement = document.createElement('input');
  timer: number | undefined = undefined;
  autoFocus = false;
  suffix: string | undefined;

  constructor(options: HintInputOptions) {
    super(options);

    document.body.appendChild(this.input);

    this.autoFocus = options?.autoFocus ?? false;
    this.suffix = options?.suffix;
    this.input.tabIndex = 1;
    this.input.style.width = '50px';
    this.input.style.display = 'none';
    this.input.style.position = 'absolute';
    this.input.style.transform = 'translate(-50%, -50%)';
    this.input.style.border = '1px solid #000';
    this.input.style.textAlign = 'center';
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.hide();
        options?.onChange?.(this.input.value);
      }
    });
  }

  /** 隐藏输入框 */
  hide() {
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

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.input.blur();

    // 获取输入框的坐标
    const center = getBoundsCenter(new Bounds(line.getBounds()));

    this.input.style.display = 'block';
    this.input.style.left = `${center.x}px`;
    this.input.style.top = `${center.y}px`;
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
