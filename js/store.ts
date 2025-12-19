export type StoreListener<T> = (state: T, prevState: T) => void;

export interface StoreApi<T> {
    setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
    getState: () => T;
    subscribe: (listener: StoreListener<T>) => () => void;
    destroy: () => void;
}

export type CreateState<T> = (
    set: StoreApi<T>['setState'],
    get: StoreApi<T>['getState'],
    api: StoreApi<T>
) => T;

export function createStore<T>(createState: CreateState<T>): StoreApi<T> {
    let state: T;
    const listeners = new Set<StoreListener<T>>();

    const setState: StoreApi<T>['setState'] = (partial, replace) => {
        const nextState = typeof partial === 'function' ? (partial as Function)(state) : partial;
        if (!Object.is(nextState, state)) {
            const previousState = state;
            state = (replace ?? false) ? (nextState as T) : { ...state, ...nextState };
            listeners.forEach((listener) => listener(state, previousState));
        }
    };

    const getState = () => state;

    const subscribe = (listener: StoreListener<T>) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const destroy = () => {
        listeners.clear();
    };

    const api = { setState, getState, subscribe, destroy };
    state = createState(setState, getState, api);
    return api;
}
