/* 使用方法：
    const c = FreqCanvas.fromCanvas(freqBar);
    c.input(freq);
*/
class FreqCanvas extends HTMLCanvasElement {
    static noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    init(step = 4, gridHeight = 30, A4 = 442) {
        this.step = step;
        this.gridHeight = gridHeight;
        this.ctx = this.getContext('2d');
        this.freqTable = new FreqTable(A4);
        this.height = this.gridHeight * this.freqTable.length;
        this.freqs = null;  // 在resize函数中赋值
        this.onWidthChange();
        this.stableFreq = this.freqTable.A4;
        this.Ydraggable();
    }
    static fromCanvas(canvas, step = 4, gridHeight = 30) {
        Object.setPrototypeOf(canvas, FreqCanvas.prototype);
        canvas.init(step, gridHeight);
        canvas.viewFollow(canvas.stableFreq);
        return canvas;
    }
    Ydraggable() {
        this.style.left = '0px';
        this.style.top = '0px';
        this.style.position = 'absolute';
        const container = this.parentElement;
        this.isDragging = false;
        let startY;     // 只允许y轴拖拽
        const stopDragging = () => {
            this.isDragging = false;
            this.style.transition = 'top 0.2s';
        }
        const start = (obj) => {
            this.isDragging = true;
            this.style.transition = '';
            startY = obj.clientY - this.offsetTop;
        }
        const setTop = (y) => {
            const minY = container.clientHeight - this.height;
            this.style.top = `${Math.max(Math.min(minY, 0), Math.min(y, 0))}px`;
        }
        this.setTop = setTop;
        // 鼠标事件
        container.addEventListener('mousedown', (e) => { start(e); });
        container.addEventListener('mousemove', (e) => { if (this.isDragging) setTop(e.clientY - startY); });
        container.addEventListener('mouseup', stopDragging);
        container.addEventListener('mouseleave', stopDragging);
        // 触摸事件
        container.addEventListener('touchstart', (e) => { start(e.touches[0]); });
        container.addEventListener('touchmove', (e) => { if (this.isDragging) setTop(e.touches[0].clientY - startY); });
        container.addEventListener('touchend', stopDragging);
        container.addEventListener('touchcancel', stopDragging);
        // 窗口大小变化
        if(!this.onWidthChangeFun) {
            window.addEventListener('resize', this.onWidthChangeFun = this.onWidthChange.bind(this));
        }
    }
    input(freq) {
        this.freqs.push(freq);
        this.update();
        // 平滑移动视野 有两层平滑 第一层是此处的低通滤波，第二次是css的transition
        this.stableFreq = 0.2 * freq + 0.8 * this.stableFreq;
        this.viewFollow(this.stableFreq);
    }
    /**
     * 让视野的中心为f
     * @param {Number} f 
     */
    viewFollow(f) {
        if (this.isDragging) return;
        const h = this.height - this.f2logHeight(f);
        const viewHeight = this.parentElement.clientHeight;
        this.setTop((viewHeight >> 1) - h);
    }
    // width变化时调用
    onWidthChange() {
        const parentWidth = this.parentElement.clientWidth;
        if (this.width != parentWidth) {
            this.width = parentWidth; // 只允许高度可拖拽
            this.refreshCapacity();
        }
        this.update();  // 触发这个基本上是因为resize，高度可能会变（尺寸变化内容清空），所以绘制放到if外面
    }
    // 设置每一格的高度
    setGridHeight(gridHeight) {
        if (gridHeight === this.gridHeight) return;
        this.gridHeight = gridHeight;
        this.height = this.gridHeight * this.freqTable.length;
        this.update();
        // 重新设置top使得视野中心不变
        this.viewFollow(this.stableFreq);
    }
    // 设置每个时刻的宽度
    setStep(step) {
        step = Math.max(0, step);
        if (step === this.step) return;
        this.step = step;
        this.refreshCapacity();
        this.update();
    }
    // 在width和step变化时调用
    refreshCapacity() {
        const len = this.width / this.step;
        if (this.freqs) {
            this.freqs = this.freqs.slice(len);
        } else {
            this.freqs = new LatestArray(len);
        }
    }
    /**
     * 按对数尺度计算输入频率距离最低频率的高度
     * @param {Number} f 频率
     * @returns {Number} 高度 像素
     */
    f2logHeight(f) {
        return this.gridHeight * ( 12 * Math.log2(f / this.freqTable[0]) + 0.5 );
    }
    /**
     * 绘制频率图
     */
    update() {
        const ctx = this.ctx;
        // 清空画布
        ctx.clearRect(0, 0, this.width, this.height);
        // 先画底色
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'purple';
        ctx.font = `${this.gridHeight * 0.6}px sans-serif`;
        const fontWidth = this.gridHeight * 1.5;
        let H = this.height - (this.gridHeight >> 1);
        for(let i = 0; i < this.freqTable.length; i++) {
            ctx.moveTo(0, H);
            ctx.lineTo(this.width, H);
            ctx.fillText(FreqCanvas.noteName[i % 12] + Math.floor(i / 12 + 1), this.width - fontWidth, H - 1);
            H -= this.gridHeight;
        }
        ctx.stroke();
        // 画频率
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        let x = 0;
        ctx.moveTo(x, this.f2logHeight(this.freqs.earliest()));
        for(const f of this.freqs) {
            const h = this.f2logHeight(f);
            x += this.step;
            ctx.lineTo(x, this.height - h);
        }
        ctx.stroke();
    }
}

// 一个只插入的循环数组
class LatestArray extends Float32Array {
    constructor(capacity) {
        super(capacity + 1);    // 留空一个用作判断是否满
        this.head = 0;
        this.tail = 0;
    }
    size() {
        let len = this.head - this.tail;
        if (len < 0) {
            len += this.length;
        } return len;
    }
    push(value) {
        this[this.head] = value;
        const befState = this.head === this.tail;
        this.head = (this.head + 1) % this.length;
        if (this.head === this.tail && !befState) {
            this.tail = (this.tail + 1) % this.length;
        }
        return this;
    }
    latest() {
        return this[(this.length + this.head - 1) % this.length];
    }
    earliest() {
        return this[this.tail];
    }
    empty() {
        return this.head === this.tail;
    }
    slice(len) {
        len = len | 0;
        let result = new LatestArray(len);
        const currentSize = this.size();
        if (len >= currentSize) {
            for (let i = 0; i < currentSize; i++) {
                result[i] = this[(this.tail + i) % this.length];
            }
            result.head = currentSize;
        } else {
            for (let i = 0, j = this.head - len + this.length; i < len; i++) {
                result[i] = this[(j + i) % this.length];
            }
            result.head = len;
        }
        result.tail = 0;
        return result;
    }
    // 循环迭代器 用于for of
    [Symbol.iterator]() {
        let index = this.tail;
        const self = this;
        return {
            next() {
                if (index !== self.head) {
                    const value = self[index];
                    index = (index + 1) % self.length;
                    return { value, done: false };
                } else {
                    return { done: true };
                }
            }
        };
    }
    print() {
        let t = '';
        for (const v of this) {
            t += v + ' ';
        }
        console.log(t);
    }
}