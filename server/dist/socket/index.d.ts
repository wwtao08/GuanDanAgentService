import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
export declare function setupSocket(io: HTTPServer): SocketServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
