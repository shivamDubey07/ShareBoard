export function createSocket(slug) {

    const protocol =
        window.location.protocol === "https:"
            ? "wss"
            : "ws";

    return new WebSocket(
        `${protocol}://127.0.0.1:8000/ws/${slug}`
    );

}