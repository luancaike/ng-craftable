export class LocalHistory {
    private timelinePoints = [];
    private transferArea = [];
    private indexStateNow = 0;

    setTransferArea(data: any[]) {
        this.transferArea = [...data].map(el => ({...el}));
    }

    getTransferArea(): any[] {
        return [...this.transferArea];
    }

    addPoint(dataPoint) {
        this.timelinePoints = this.timelinePoints.splice(this.indexStateNow, this.timelinePoints.length);
        this.indexStateNow = 0;
        this.timelinePoints = [JSON.stringify(dataPoint), ...this.timelinePoints];
    }

    undoPoint() {
        if (this.indexStateNow >= this.timelinePoints.length - 1) {
            --this.indexStateNow;
        }
        return JSON.parse(this.timelinePoints[++this.indexStateNow]);
    }

    redoPoint() {
        if (this.indexStateNow <= 0) {
            this.indexStateNow = 0;
        } else {
            --this.indexStateNow;
        }
        return JSON.parse(this.timelinePoints[this.indexStateNow]);
    }
}
