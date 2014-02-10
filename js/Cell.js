Cell = function(coords) {
	this._x = coords[0];
	this._y = coords[1];
	this._id = Cell.createId(coords);
	this._state = 0;
	this._adjacentCells = null;
}
Cell.prototype.getAdjacentCells = function() {
	return this._adjacentCells;
}
Cell.prototype.getId = function() {
	return this._id;
}
Cell.prototype.getState = function() {
	return this._state;
}
Cell.prototype.getX = function() {
	return this._x;
}
Cell.prototype.getY = function() {
	return this._y;
}
Cell.prototype.isOn = function() {
	return (this._state === 1) ? true : false;
}
Cell.prototype.off = function() {
	this._state = 0;
}
Cell.prototype.on = function() {
	this._state = 1;
}
Cell.prototype.setAdjacentCells = function(cells) {
	this._adjacentCells = cells;
}
// This will be used when calling join() on an array of Cell instances
Cell.prototype.toString = function() {
	return this._state;
}

Cell.createId = function(coords) {
	return coords.join("_");
}
Cell.getCoordsFromId = function(id) {
	var coords = id.split("_");
	coords[0] = parseInt(coords[0], 10);
	coords[1] = parseInt(coords[1], 10);
	return coords;
}
