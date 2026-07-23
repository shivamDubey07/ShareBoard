from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):

        self.connections = defaultdict(list)


    async def connect(
        self,
        board_slug: str,
        websocket: WebSocket
    ):

        await websocket.accept()

        self.connections[board_slug].append(
            websocket
        )


    def disconnect(
        self,
        board_slug: str,
        websocket: WebSocket
    ):

        if websocket in self.connections[board_slug]:

            self.connections[board_slug].remove(
                websocket
            )


    async def broadcast(
        self,
        board_slug: str,
        message: str,
        sender: WebSocket
    ):

        dead = []

        for websocket in self.connections[board_slug]:

            if websocket == sender:
                continue

            try:

                await websocket.send_text(message)

            except:

                dead.append(websocket)

        for websocket in dead:

            self.disconnect(
                board_slug,
                websocket
            )                           


manager = ConnectionManager()