class Debug {
  element: HTMLElement;
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

  log(...args: any[]) {
    this.element.innerHTML += args.join(' ') + '<br/>';
  }

  clear() {
    this.element.innerHTML = '';
  }
}

export { Debug };
