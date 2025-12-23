"""
RoboViz Embedded Server

Internal HTTP + WebSocket server that serves the viewer and handles SDK commands.
Users don't need to interact with this directly.
"""

import asyncio
import json
import threading
import os
from pathlib import Path
from typing import Optional, Callable, Dict, Any, Set
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False


class ViewerHTTPHandler(SimpleHTTPRequestHandler):
    """HTTP handler that serves the viewer static files."""

    def __init__(self, *args, viewer_dir: str, **kwargs):
        self.viewer_dir = viewer_dir
        super().__init__(*args, directory=viewer_dir, **kwargs)

    def do_GET(self):
        # Serve index.html for root path
        if self.path == '/' or self.path.startswith('/?'):
            # Preserve query string
            query = self.path[1:] if self.path.startswith('/?') else ''
            self.path = '/index.html' + query
        return super().do_GET()

    def log_message(self, format, *args):
        # Suppress HTTP logs
        pass


class EmbeddedServer:
    """
    Embedded HTTP + WebSocket server for RoboViz.

    Serves the viewer static files and handles WebSocket connections.
    """

    def __init__(
        self,
        host: str = "localhost",
        http_port: int = 8765,
        ws_port: int = 8766,
        viewer_dir: Optional[str] = None,
    ):
        if not HAS_WEBSOCKETS:
            raise ImportError(
                "websockets is required for the embedded server. "
                "Install with: pip install websockets"
            )

        self.host = host
        self.http_port = http_port
        self.ws_port = ws_port

        # Find viewer directory
        if viewer_dir:
            self.viewer_dir = viewer_dir
        else:
            # Look for bundled viewer
            pkg_dir = Path(__file__).parent
            bundled = pkg_dir / "_viewer"
            if bundled.exists():
                self.viewer_dir = str(bundled)
            else:
                # Development fallback - viewer not bundled
                self.viewer_dir = None

        self._http_server: Optional[HTTPServer] = None
        self._ws_server: Optional[Any] = None
        self._http_thread: Optional[threading.Thread] = None
        self._ws_thread: Optional[threading.Thread] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

        self._clients: Set[WebSocketServerProtocol] = set()
        self._message_handler: Optional[Callable[[Dict[str, Any]], Any]] = None
        self._running = False

    def set_message_handler(self, handler: Callable[[Dict[str, Any]], Any]):
        """Set handler for incoming WebSocket messages."""
        self._message_handler = handler

    async def _handle_client(self, websocket: WebSocketServerProtocol):
        """Handle a WebSocket client connection."""
        self._clients.add(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if self._message_handler:
                        response = self._message_handler(data)
                        if response and "id" in data:
                            await websocket.send(json.dumps(response))
                except json.JSONDecodeError:
                    pass
        finally:
            self._clients.discard(websocket)

    async def _start_ws_server(self):
        """Start the WebSocket server."""
        self._ws_server = await websockets.serve(
            self._handle_client,
            self.host,
            self.ws_port,
        )
        await self._ws_server.wait_closed()

    def _run_ws_server(self):
        """Run WebSocket server in a thread."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._start_ws_server())

    def _run_http_server(self):
        """Run HTTP server in a thread."""
        if not self.viewer_dir:
            return

        handler = lambda *args, **kwargs: ViewerHTTPHandler(
            *args, viewer_dir=self.viewer_dir, **kwargs
        )
        self._http_server = HTTPServer((self.host, self.http_port), handler)
        self._http_server.serve_forever()

    def start(self):
        """Start both HTTP and WebSocket servers."""
        if self._running:
            return

        self._running = True

        # Start WebSocket server
        self._ws_thread = threading.Thread(target=self._run_ws_server, daemon=True)
        self._ws_thread.start()

        # Start HTTP server (if viewer is available)
        if self.viewer_dir:
            self._http_thread = threading.Thread(target=self._run_http_server, daemon=True)
            self._http_thread.start()

    def stop(self):
        """Stop all servers."""
        self._running = False

        if self._ws_server:
            self._ws_server.close()

        if self._http_server:
            self._http_server.shutdown()

        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)

    def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        if not self._clients or not self._loop:
            return

        data = json.dumps(message)

        async def _broadcast():
            tasks = [client.send(data) for client in self._clients]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

        asyncio.run_coroutine_threadsafe(_broadcast(), self._loop)

    def send(self, message: Dict[str, Any]):
        """Send a message (alias for broadcast)."""
        self.broadcast(message)

    @property
    def client_count(self) -> int:
        """Number of connected clients."""
        return len(self._clients)

    @property
    def viewer_url(self) -> str:
        """URL to access the viewer."""
        if self.viewer_dir:
            return f"http://{self.host}:{self.http_port}?ws=ws://{self.host}:{self.ws_port}"
        else:
            # No bundled viewer - user needs to run viewer separately
            return f"ws://{self.host}:{self.ws_port}"

    def wait_for_connection(self, timeout: float = 30.0) -> bool:
        """Wait for at least one client to connect."""
        import time
        start = time.time()
        while time.time() - start < timeout:
            if self._clients:
                return True
            time.sleep(0.1)
        return False
