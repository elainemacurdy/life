LifeModel = Backbone.Model.extend({
	INTERVAL: 1000,
	comparators: {
		cellState: function(a, b) {
			return (a.getState() > b.getState()) ? -1 : ((a.getState() < b.getState()) ? 1 : 0);
		}
	},
	defaults: {
		dimensions: null,
		generation: -1,
		startSet: null,
		switchOffCells: null,
		switchOnCells: null,
		targetGeneration: -1
	},
	_cellRegistry: {},
	_generationInterval: null,
	_isInProgress: false,
	_onCells: [],
	initialize: function() {
		var me = this;
		this.listenTo(this, "change:dimensions", this.onChangeDimensions);
		this.listenTo(this, "change:targetGeneration", this.onChangeTargetGeneration);
		this.set("generation", 0);
	},

	/**
	 * Get the master list of all cells.
	 * @return {Object}
	 */
	getCells: function() {
		return this._cellRegistry;
	},
	/**
	 * Game is in progress or not.
	 * @return {Boolean}
	 */
	isInProgress: function() {
		return this._isInProgress;
	},
	/**
	 * Create new cell instances when the board's dimensions change. Only create cells that don't exist yet, don't recreate the whole board every time.
	 * @param {LifeModel} model
	 * @param {Object} dimensions: { m: <width>, n: <height> }
	 */
	onChangeDimensions: function(model, dimensions) {
		this.reset();
		var previous = this.previousAttributes();
		var previousDimensions = (previous && previous.dimensions) ? previous.dimensions : { m: 0, n: 0 };
		if (((dimensions.m < previousDimensions.m) && (dimensions.n === previousDimensions.n)) ||
			((dimensions.n < previousDimensions.n) && (dimensions.m === previousDimensions.m))) {
			return;
		}
		var isWidthChanging = (dimensions.m === previousDimensions.m) ? false : true;
		// if the width is changing, start at the end of the last known x coord; otherwise just start at 0.
		var startX = (isWidthChanging) ? previousDimensions.m : 0;
		// if the height is changing, start at the end of the last known y coord; otherwise 0.
		var startY = (isWidthChanging) ? 0 : previousDimensions.n;
		this._createCells([startX, startY], [dimensions.m, dimensions.n]);
	},
	/**
	 * Calculate all generations until the user-entered target generation.
	 * @param {LifeModel} model
	 * @param {Number} targetGeneration
	 * @fires LifeModel#onPlay
	 * @fires LifeModel#onPause
	 * @fires LifeModel#onStop
	 */
	onChangeTargetGeneration: function(model, targetGeneration) {
		if (!this._isInProgress) {
			this._isInProgress = true;
			this._resetProperties();
		}
		this.trigger("onPlay");
		var deltaCells = this._getCellsInGeneration(targetGeneration);
		var onCells = deltaCells.on;
		this.set({
			switchOffCells: deltaCells.off,
			switchOnCells: onCells
		});
		if (onCells.length) {
			// still have more generations of play, if the user hits play again
			this.trigger("onPause");
		} else {
			// pattern has completed, no more generations
			this.trigger("onStop");
		}
	},
	/**
	 * Pause game play.
	 * @fires LifeModel#onPause
	 */
	pause: function() {
		clearInterval(this._generationInterval);
		this._generationInterval = null;
		this.trigger("onPause");
	},
	/**
	 * Start auto-play (no target generation).
	 * @fires LifeModel#onPlay
	 */
	play: function() {
		// don't do this stuff if we're coming back from a pause
		if (!this._isInProgress) {
			this._isInProgress = true;
			this._resetProperties();
		}
		this._setGenerationInterval();
		this.trigger("onPlay");
	},
	/**
	 * Reset the game.
	 * @fires LifeModel#onReset
	 */
	reset: function() {
		this._isInProgress = false;
		clearInterval(this._generationInterval);
		this._generationInterval = null;
		this.set("generation", 0);
		this.trigger("onReset");
	},
	/**
	 * Stop game play, e.g. when the pattern terminates.
	 * @fires LifeModel#onStop
	 */
	stop: function() {
		this._isInProgress = false;
		clearInterval(this._generationInterval);
		this._generationInterval = null;
		this.trigger("onStop");
	},
	/**
	 * Run validation against the user-input startSet before setting it.
	 * @param {Object} attributes
	 * @param {Object} options
	 * @return {String} Error message
	 */
	validate: function(attributes, options) {
		if (_.has(attributes, "startSet")) {
			var startSet = attributes.startSet;
			// try to parse the passed string to javascript
			var startSetArray;
			// if the input string is empty, it should pass validation but set null
			if (startSet) {
				try {
					startSetArray = JSON.parse(startSet);
				} catch (err) {
					return "Invalid JSON string";
				}
			} else {
				startSetArray = null;
			}
			// if successful, set the array in the attribute instead of the string, and return an error to abort the string set
			this.set("startSet", startSetArray);
			return "success";
		}
	},

	/**
	 * Calculate the next generation of cells.
	 * @param {Object} options
	 */
	_calculateNextGeneration: function(options) {
		if (!options) {
			options = {};
		}
		var onCells = this._onCells;
		var newOnCells = [];
		var newOffCells = [];
		var checkedCellIds = {};
		var adjacentCells;
		// FIXME: optimize the offCells: could return the offCells from pruneOnCells
		// loop through all the on cells:
		//	- grab each on cell's adjacent cells
		//	- switch all cells' states if necessary
		//	- keep track of which cells have been checked, so we're not checking/switching the same cells over and over
		for (var i=0, cell; cell=onCells[i]; i++) {
			// lazy load each cell's adjacent cells
			if (!cell.getAdjacentCells()) {
				cell.setAdjacentCells(this._findAdjacentCells(cell));
			}
			// only change each cell's state once
			if (!checkedCellIds[cell.getId()]) {
				this._setCellState(cell, newOnCells, newOffCells, checkedCellIds);
			}
			adjacentCells = cell.getAdjacentCells();
			for (var j=0, adjacentCell; adjacentCell=adjacentCells[j]; j++) {
				// only do this work once for each adjacent cell
				if (!checkedCellIds[adjacentCell.getId()]) {
					// lazy load each cell's adjacent cells
					if (!adjacentCell.getAdjacentCells()) {
						adjacentCell.setAdjacentCells(this._findAdjacentCells(adjacentCell));
					}
					this._setCellState(adjacentCell, newOnCells, newOffCells, checkedCellIds);
				}
			}
		}
		// change the state of the new off/on cells all at once, after all calculations are complete
		this._changeCellStates(newOffCells, "off");
		this._changeCellStates(newOnCells, "on");
		// remove any cells that are now off from the onCells collection
		this._pruneOnCells();
		// set the new off/on collections in the model, triggering view updates
		if (!options.isSilent) {
			this.set({
				switchOffCells: newOffCells,
				switchOnCells: newOnCells
			});
		}
	},
	/**
	 * Change the state of all cells in the collection.
	 * @param {Array} cellCollection
	 * @param {String} state
	 */
	_changeCellStates: function(cellCollection, state) {
		if (cellCollection) {
			for (var i=0, cell; cell=cellCollection[i]; i++) {
				cell[state]();
				if (cell.isOn()) {
					this._onCells.push(cell);
				}
			}
		}
	},
	/**
	 * Create cells from the start coords to the end coords.
	 * @param {Array} startCoords
	 * @param {Array} endCoords
	 */
	_createCells: function(startCoords, endCoords) {
		var id;
		var startX = startCoords[0], endX = endCoords[0];
		var startY = startCoords[1], endY = endCoords[1];
		for (var x=startX; x<endX; x++) {
			for (var y=startY; y<endY; y++) {
				id = Cell.createId([x,y]);
				if (!this._cellRegistry[id]) {
					this._cellRegistry[id] = new Cell([x,y]);
				}
			}
		}
	},
	/**
	 * Find all the adjacent cells to the given cell.
	 * @param {Cell} cell
	 * @return {Array}
	 */
	_findAdjacentCells: function(cell) {
		var dimensions = this.get("dimensions");
		var cellX = cell.getX();
		var cellY = cell.getY();
		var startX = Math.max(0, cellX-1);
		var endX = Math.min(dimensions.m-1, cellX+1);
		var startY = Math.max(0, cellY-1);
		var endY = Math.min(dimensions.n-1, cellY+1);
		var adjacentCells = [];
		var adjacentCell;
		// can't use high-perf for loop syntax here, as there's no array to reach the end of
		for (var x=startX; x<=endX; x++) {
			for (var y=startY; y<=endY; y++) {
				adjacentCell = this._cellRegistry[Cell.createId([x, y])];
				if (adjacentCell.getId() !== cell.getId()) {
					adjacentCells.push(adjacentCell);
				}
			}
		}
		return adjacentCells;
	},
	/**
	 * Create Cell instances from the given coordinates.
	 * @param {Array} coordCollection
	 * @return {Array}
	 */
	_getCellsFromCoords: function(coordCollection) {
		var cells = null;
		if (coordCollection) {
			cells = [];
			for (var i=0, coords; coords=coordCollection[i]; i++) {
				cells.push(this._cellRegistry[Cell.createId(coords)]);
			}
		}
		return cells;
	},
	/**
	 * Get the cells turning on and off for a given generation.
	 * @param {Object} targetGeneration
	 * @return {Object} Off and on cell arrays
	 */
	_getCellsInGeneration: function(targetGeneration) {
		var oldOnCells = this._onCells.slice();
		this.set("generation", 0);
		while (this.get("generation") < targetGeneration) {
			// do not set switchOffCells/switchOnCells per generation, wait till we're all done instead
			this._iterate({ isSilent: true });
		}
		// optimization so the browser doesn't have to render more DOM effects than necessary
		var currentOnCells = this._onCells;
		// turn off all cells that were on prior to the generation calculation, removing any that are still currently on
		var offCells = _.difference(oldOnCells, currentOnCells);
		// turn on only the cells currently on that were off prior to the generation calculation
		var onCells = _.difference(currentOnCells, oldOnCells);
		return { off: offCells, on: onCells };
	},
	/**
	 * Detect if the pattern is complete and stop the game, or else keep calculating the next generation.
	 * @param {Object} options
	 */
	_iterate: function(options) {
		// break if we've either hit the limit, or if the game has stopped generating new cells
		if ((this.get("switchOnCells") && !this.get("switchOnCells").length) && (this.get("switchOffCells") && !this.get("switchOffCells").length)) {
			this.stop();
		} else {
			this._calculateNextGeneration(options);
			this.set("generation", this.get("generation") + 1);
		}
	},
	/**
	 * Remove any cells that have been turned off from the internal _onCells array.
	 * Note: it might be more intuitive to remove off cells as they're turned off (as it adds on cells as they're turned on), but that would degrade performance.
	 */
	_pruneOnCells: function() {
		var onCells = this._onCells;
		// FIXME: sorts are notoriously slow; try and find a better sort algorithm here
		onCells.sort(this.comparators.cellState);
		// off cells are now at the end of the array; lop them off
		// using String.indexOf because jsPerf sez that's the least evil method
		var onCellStatesStr = onCells.join("");
		this._onCells = onCells.slice(0, onCellStatesStr.indexOf("0"));
	},
	/**
	 * Count the number of on cells surrounding the given cell, and decide whether the cell should turn on, off, or stay the same.
	 * Cells are added to the master list of all cells that are turning on/off for this generation.
	 * @param {Cell} cell
	 * @param {Object} newOnCells
	 * @param {Object} newOffCells
	 * @param {Object} checkedCellIds
	 */
	_setCellState: function(cell, newOnCells, newOffCells, checkedCellIds) {
		var total = cell.getAdjacentCells().reduce(function(runningTotal, currentCell) {
			if (isNaN(runningTotal)) {
				runningTotal = runningTotal.getState();
			}
			return runningTotal + currentCell.getState();
		});
		if ((total === 3)) {
			if (!cell.isOn()) {
				newOnCells.push(cell);
			}
		} else if (total !== 2) {
			if (cell.isOn()) {
				newOffCells.push(cell);
			}
		}
		checkedCellIds[cell.getId()] = true;
	},
	/**
	 * Start the auto-play interval.
	 */
	_setGenerationInterval: function() {
		var me = this;
		this._generationInterval = setInterval(function() {
			me._iterate();
		}, this.INTERVAL);
	},
	/**
	 * Set the board back to its initial state, and set up the user's startSet as the initial generation of onCells.
	 */
	_resetProperties: function() {
		this._changeCellStates(this._onCells, "off");
		this._onCells = [];
		// ssh, don't tell the view
		this.set("switchOffCells", null, { silent: true });
		// grab the user's selected cells, convert to Cell instances and switch on
		this.set("switchOnCells", this._getCellsFromCoords(this.get("startSet")));
		this._changeCellStates(this.get("switchOnCells"), "on");
	}
});