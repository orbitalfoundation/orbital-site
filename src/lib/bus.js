// bus — the client's whole wire protocol: one socket.io event ('filespace')
// carrying { query } or { command }, plus 'changed' fan-out from the server.
// Commands are always signed; queries are signed only when an identity is
// given (to see private areas you belong to).

import { io } from 'socket.io-client';
import { signAction } from './auth.js';

export const socket = io({ transports: ['websocket'] });

const call = (msg) => new Promise((resolve) => socket.emit('filespace', msg, resolve));

export async function query(op, params = {}, identity = null) {
  const req = identity ? await signAction(identity, op, params) : { op, ...params };
  const res = await call({ query: req });
  if (res && res.ok === false) throw new Error(res.error); // invalid proofs fail loudly
  return res;
}

export async function command(identity, op, params = {}) {
  return call({ command: await signAction(identity, op, params) });
}

export function onChanged(fn) {
  socket.on('changed', fn);
  return () => socket.off('changed', fn);
}

// --- streams: room-based conversation (same envelope discipline) ---

export async function streamsQuery(op, params = {}, identity = null) {
  const req = identity ? await signAction(identity, op, params) : { op, ...params };
  const res = await new Promise((resolve) => socket.emit('streams', { query: req }, resolve));
  if (res && res.ok === false) throw new Error(res.error);
  return res;
}

export async function streamsCommand(identity, op, params = {}) {
  return new Promise(async (resolve) =>
    socket.emit('streams', { command: await signAction(identity, op, params) }, resolve));
}

// hello binds this connection to a proven identity (needed to join rooms you
// can only read as a member); join/leave subscribe to a room's live traffic.
export async function hello(identity, label = null) {
  return new Promise(async (resolve) =>
    socket.emit('hello', await signAction(identity, 'hello', { label }), resolve));
}

export function join(slug) {
  return new Promise((resolve) => socket.emit('join', { slug }, resolve));
}

export function leave(slug) {
  socket.emit('leave', { slug });
}

export function onMessage(fn) {
  socket.on('message', fn);
  return () => socket.off('message', fn);
}

export function onPresence(fn) {
  socket.on('presence', fn);
  return () => socket.off('presence', fn);
}
