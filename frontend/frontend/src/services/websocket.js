export function createSocket(slug) {

    return new WebSocket(
        `${import.meta.env.VITE_WS_URL}/ws/${slug}`
    );

}