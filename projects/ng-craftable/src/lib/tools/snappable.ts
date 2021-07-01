import {CraftableComponent} from '../craftable.component';
import {LegoConfig, LinesGuide} from '../model';

type CheckLegoInSnapDto = {
    lineGuides: LinesGuide,
    directionHandler: 'start' | 'end' | 'none'
    snapSize: number,
    axis: 'x' | 'y',
    lego: LegoConfig,
    callBackOnThrust: (...args: any[]) => any,
    isResize?: boolean,
    ignoreAxisKey?: any[]
}

export class Snappable {

    constructor(private drawComponent: CraftableComponent) {
    }

    checkLegoInSnap({lineGuides, snapSize, axis, lego, isResize, callBackOnThrust, ignoreAxisKey, directionHandler}: CheckLegoInSnapDto) {
        const side = axis === 'x' ? 'width' : 'height';
        const size = lego[side];
        const distance = lego[axis];
        const halfSideLength = Math.abs(size / 2);
        const endDistance = distance + size;
        const center = distance + halfSideLength;

        for (const item of lineGuides[axis]) {
            if (Array.isArray(ignoreAxisKey) && ignoreAxisKey.includes(item.parent)) {
                break;
            }
            const position = item.position;
            let showGuide = false;

            if (Math.abs(position - distance) <= snapSize && (directionHandler === 'start' || directionHandler === 'none')) {
                if (isResize) {
                    lego[side] -= (position - distance);
                    lego[axis] = position;
                } else {
                    lego[axis] = position;
                }
                showGuide = true;
            } else if (Math.abs(center - position) <= snapSize) {
                if (!isResize) {
                    lego[axis] = position - halfSideLength;
                }
                showGuide = true;
            } else if (Math.abs(endDistance - position) <= snapSize && (directionHandler === 'end' || directionHandler === 'none')) {
                if (isResize) {
                    lego[side] = Math.abs(position - distance);
                } else {
                    lego[axis] = position - size;
                }
                showGuide = true;
            }
            if (showGuide) {
                callBackOnThrust(axis, position);
            }
        }
    }

}
