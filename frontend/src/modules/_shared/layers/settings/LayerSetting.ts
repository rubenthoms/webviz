export enum SettingType {
    DYNAMIC = "dynamic",
    STATIC = "static",
}

export class LayerSetting<TValue> {
    private _id: string;
    private _type: SettingType;
    private _label: string;
    private _value: TValue;
    private _availableOptions: { label: string; value: TValue }[] = [];
    private _dependencies: string[] = [];

    constructor(
        id: string,
        type: SettingType,
        label: string,
        initialValue: TValue,
        dependencies: string[] = [],
        availableOptions: { label: string; value: TValue }[] | undefined = undefined
    ) {
        this._id = id;
        this._type = type;
        this._label = label;
        this._value = initialValue;
        this._dependencies = dependencies;

        if (type === SettingType.STATIC && availableOptions === undefined) {
            throw new Error("Static settings must have available options");
        }

        this._availableOptions = availableOptions ?? [];
    }

    getId(): string {
        return this._id;
    }

    getLabel(): string {
        return this._label;
    }

    getValue(): TValue {
        return this._value;
    }

    setValue(value: TValue): void {
        this._value = value;
    }

    getAvailableOptions(): { label: string; value: TValue }[] {
        return this._availableOptions;
    }

    maybeFetchOptions(): void {
        if (this._type === SettingType.STATIC) {
            return;
        }
    }

    fetchOptions(): void {
        throw new Error("Not implemented");
    }
}
