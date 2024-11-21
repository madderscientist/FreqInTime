class NoPeak {
    /**
     * 消除尖峰 如果突变能维持trustLen个采样点则承认突变
     * @param {Function} dataOutfn 数据如何输出 接收一个数据参数
     * @param {Number} trustLen 累计多少长度后信任突变
     * @param {Number} threadRate 判断尖刺的阈值 是倍数，因为音符频率按对数分布 默认1.26是因为4个半音，上下就是8个半音
     * @param {Number} captureRate 认为稳定的阈值 是倍数 默认1.26是因为1.65个半音，上下就是3.3个半音
     */
    constructor(dataOutfn, trustLen = 3, threadRate = 1.26, captureRate = 1.1) {
        this.threadRate = threadRate;
        this.captureRate = captureRate;
        this.dataOutfn = dataOutfn;
        this.buffer = new Float16Array(trustLen);
        this.pointer = 0;
        this.stable = 0;
    }
    input(data) {
        if (data < this.stable * this.threadRate && data > this.stable / this.threadRate) {
            this.stable = 0.3 * this.stable + 0.7 * data;   // 稍微平滑一下
            this.dataOutfn(data);
            // 清除记录
            this.pointer = 0;
            return;
        }
        if (this.pointer > 0) { // 已经有记录了
            // 求当前记录的均值
            let avg = 0;
            for (let i = 0; i < this.pointer; i++) {
                avg += this.buffer[i];
            }
            avg = avg / this.pointer;
            // 判断是否在捕获带内
            if (data < avg * this.captureRate && data > avg / this.captureRate) {
                // 在捕获带内则记录
                this.buffer[this.pointer] = data;
                this.pointer++;
                // 如果满了就认为不是尖峰，可以全部输出
                if (this.pointer === this.buffer.length) {
                    this.pointer = 0;
                    this.stable = avg;
                    for (let i = 0; i < this.pointer; i++) {
                        // 积累的数据也要一并输出
                        this.dataOutfn(this.buffer[i]);
                    }
                }
            } else {    // 不在捕获带内则重新记录
                this.buffer[0] = data;
                this.pointer = 1;
            }
        } else {
            // 没有记录则直接记录
            this.buffer[0] = data;
            this.pointer = 1;
        }
    }
}