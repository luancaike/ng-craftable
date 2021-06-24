import {Injectable} from '@angular/core';

@Injectable()
export class TimelineService {
    timelinePoints = []
    indexStateNow = 0
    addPoint(dataPoint) {
        this.timelinePoints = this.timelinePoints.splice(this.indexStateNow, this.timelinePoints.length)
        this.indexStateNow = 0
        this.timelinePoints = [JSON.stringify(dataPoint), ...this.timelinePoints ]
    }
    undoPoint() {
        if(this.indexStateNow >= this.timelinePoints.length - 1) {
            --this.indexStateNow
        }
        return JSON.parse(this.timelinePoints[++this.indexStateNow])
    }
    redoPoint() {
        if(this.indexStateNow <= 0) {
            this.indexStateNow = 0
        } else {
            --this.indexStateNow
        }
        return JSON.parse(this.timelinePoints[this.indexStateNow])
    }
}
