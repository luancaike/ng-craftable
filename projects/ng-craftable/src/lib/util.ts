import { Injector, NgZone } from '@angular/core';

let injector: Injector | null = null;

export function getNgZone(): never | NgZone {
    if (injector) {
        return injector!.get<NgZone>(NgZone);
    }
}

export function setInjector(parentInjector: Injector): void {
    injector = parentInjector;
}

export const runOutside = <T>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    let originalValue: Function = null!;

    function wrapped(...args) {
        return getNgZone().runOutsideAngular(() => originalValue.apply(this, args));
    }

    originalValue = descriptor.value!;
    descriptor.value = wrapped;
};
export function debounce(delay: number = 300): MethodDecorator {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let timeout = null

        const original = descriptor.value;

        descriptor.value = function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => original.apply(this, args), delay);
        };

        return descriptor;
    };
}
