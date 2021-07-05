import {CraftableComponent} from '../craftable.component';

type ShortcutList = { key: string | string[], action: (...any) => any }[]

export class Shortcutable {
    constructor(private drawComponent: CraftableComponent) {
    }

    private shortcutKeysStatus = new Map();
    private shortcutRegistered = [];

    onKeyDown(event: KeyboardEvent) {
        this.shortcutKeysStatus.set(event.key.toUpperCase(), true);
        this.handlerShortcut(event);
    }

    onKeyUp(event: KeyboardEvent) {
        this.shortcutKeysStatus.set(event.key.toUpperCase(), false);
    }

    handlerShortcut(event: KeyboardEvent) {
        this.shortcutRegistered.forEach(shortcut => {
            if (typeof shortcut.key === 'string' && (shortcut.key === event.key.toUpperCase() || this.checkIsCombinedKey(shortcut.key))) {
                shortcut.action(event.key);
            } else if (Array.isArray(shortcut.key) && (shortcut.key.includes(event.key.toUpperCase()) || shortcut.key.some(key => this.checkIsCombinedKey(key)))) {
                shortcut.action(event.key);
            }
        });
    }

    checkIsCombinedKey(shortcut) {
        if (shortcut.indexOf('+') >= 0) {
            const splitKeys = shortcut.split('+');
            for (let [key, value] of this.shortcutKeysStatus.entries()) {
                if (value && !splitKeys.includes(key)) {
                    return false;
                }
            }
            return splitKeys.every(key => this.shortcutKeysStatus.get(key));
        }
        return false;
    }

    registerShortcut(key: string | string[], action: (...any) => any) {
        if (typeof key === 'string') {
            key = key.toUpperCase();
        } else if (Array.isArray(key)) {
            key = key.map(e => e.toUpperCase());
        }
        this.shortcutRegistered.push({key, action});
    }

    registerShortcuts() {
        const shortcutList: ShortcutList = [
            {
                key: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
                action: (key) => this.drawComponent.moveLego(key)
            },
            {
                key: 'Control+Z',
                action: () => this.drawComponent.undo()
            },
            {
                key: 'Control+Shift+Z',
                action: () => this.drawComponent.redo()
            },
            {
                key: 'Control+C',
                action: () => this.drawComponent.copy()
            },
            {
                key: 'Control+V',
                action: () => this.drawComponent.paste()
            },
            {
                key: 'Control+X',
                action: () => this.drawComponent.cut()
            },
            {
                key: 'Control+A',
                action: () => this.drawComponent.selectAll()
            },
            {
                key: 'Control+Shift+A',
                action: () => this.drawComponent.unSelectAll()
            },
            {
                key: ['Backspace', 'Delete'],
                action: () => this.drawComponent.deleteSelection()
            },
        ];

        shortcutList.forEach(({key, action}) => this.registerShortcut(key, action));
    }
}
