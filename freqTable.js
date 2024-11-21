class FreqTable extends Float32Array {
    constructor(A4 = 440) {
        super(84);  // 范围是C1-B7
        this.A4 = A4;
    }
    set A4(A4) {
        let Note4 = [
            A4 * 0.5946035575013605, A4 * 0.6299605249474366,
            A4 * 0.6674199270850172, A4 * 0.7071067811865475,
            A4 * 0.7491535384383408,
            A4 * 0.7937005259840998, A4 * 0.8408964152537146,
            A4 * 0.8908987181403393, A4 * 0.9438743126816935,
            A4, A4 * 1.0594630943592953,
            A4 * 1.122462048309373
        ];
        this.set(Note4.map(v => v / 8), 0);
        this.set(Note4.map(v => v / 4), 12);
        this.set(Note4.map(v => v / 2), 24);
        this.set(Note4, 36);
        this.set(Note4.map(v => v * 2), 48);
        this.set(Note4.map(v => v * 4), 60);
        this.set(Note4.map(v => v * 8), 72);
    }
    get A4() {
        return this[45];
    }
}
