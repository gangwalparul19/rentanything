export function createStore(createState) {
    let state;
    const listeners = new Set();

    const setState = (partial, replace) => {
        const nextState = typeof partial === 'function' ? partial(state) : partial;
        if (!Object.is(nextState, state)) {
            const previousState = state;
            state = (replace ?? false) ? nextState : { ...state, ...nextState };
            listeners.forEach((listener) => listener(state, previousState));
        }
    };

    const getState = () => state;

    const subscribe = (listener) => {
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
