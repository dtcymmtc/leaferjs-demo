/**
 * Debug 类，用于在页面上显示调试信息
 * @class
 */
class Debug {
  /**
   * @private
   * @type {HTMLElement}
   */
  private element: HTMLElement;

  constructor() {
    if (document.getElementById('debug')) {
      document.getElementById('debug')?.remove();
    }
    this.element = document.createElement('div');
    this.element.id = 'debug';
    document.body.appendChild(this.element);
    this.element.style.display = 'none';
    this.element.style.position = 'absolute';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.width = '30vw';
    this.element.style.height = '100vh';
    this.element.style.overflow = 'auto';
    this.element.style.zIndex = '999';
    this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    this.element.style.color = '#fefefe';
  }

  /**
   * 记录调试信息
   * @param {...any[]} args - 要记录的信息
   */
  log(...args: any[]) {
    this.element.innerHTML += args.join(' ') + '<br/>';
  }

  /**
   * 清除调试信息
   */
  clear() {
    this.element.innerHTML = '';
  }
}

export { Debug };
