
'use strict';

class Mutex {
	constructor() {
		this._locking = Promise.resolve();
		this._locked = false;
	}

	isLocked() {
		return this._locked;
	}

	lock() {
		this._locked = true;

		let unlockNext;
		let willLock = new Promise(resolve => unlockNext = resolve);

		willLock.then(() => this._locked = false);

		let willUnlock = this._locking.then(() => unlockNext);
		this._locking = this._locking.then(() => willLock);

		return willUnlock;
	}
}

export default Mutex;
