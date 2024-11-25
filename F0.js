// 自相关算基频
function autoCorrelate(buf, sampleRate, sensitivity = 0.01) {
    // 计算能量 能量太小就不处理
    let rms = 0;
    for (const val of buf) rms += val * val;
    rms = Math.sqrt(rms / buf.length);
    if (rms < sensitivity) return -1;

    // 前后静音剪裁
    let begin = 0;
    let end = buf.length - 1;
    // const threshold = 0.05;
    // while (Math.abs(buf[begin]) < threshold) begin++;
    // while (Math.abs(buf[end]) < threshold) end--;
    const length = end - begin + 1;
    // if (length <= 0) return -1;

    // 计算自相关
    const correlation = new Array(length).fill(0);
    for (let i = 0; i < length; i++) {
        for (let j = 0; j < length - i; j++) {
            correlation[i] += buf[begin + j] * buf[begin + j + i];
        }
    }

    // R(0)最大，先过滤掉
    begin = 0;
    while (correlation[begin] > correlation[begin + 1]) begin++;
    // 找到最大值 通常是基频最大，后面谐振峰变小
    let maxIndex = begin;
    let max = correlation[begin];
    for (let i = begin + 1; i < length; i++) {
        if (correlation[i] > max) {
            max = correlation[i];
            maxIndex = i;
        }
    }

    // 二次插值 三点确定一个抛物线
    const y1 = correlation[maxIndex - 1];
    const y2 = correlation[maxIndex];
    const y3 = correlation[maxIndex + 1];
    const a = (y1 + y3 - 2 * y2) / 2;
    const b = (y3 - y1) / 2;
    const T0 = maxIndex - b / (2 * a);

    return sampleRate / T0;
}