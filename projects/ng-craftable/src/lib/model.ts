import {TemplateRef} from '@angular/core';

export interface LinesGuide {
    x: LineGuide[]
    y: LineGuide[]
}

export interface LineGuide {
    parent: string,
    position: number
}

export interface LegoConfig<T = any> {
    key?: string;
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    data?: T;
    overlay?: TemplateRef<any>
}
