/* Some pretty slapdash unit tests. Not really testing state (playing vs. paused etc), and testing of actual cell generation calculation is minimal (and time consuming!).
 *
 */

module("Module tests", {
	setup: function() {
		this.model = new LifeModel();
		this.model.set("dimensions", { m: 10, n: 10 });
		this.startSets = {
			allEdgeStates: {
				gen1: [[0,0], [5,0], [9,0], [0,5], [5,5], [9,5], [0,9], [5,9], [9,9]]
			},
			fiveGenerations: {
				gen1: [[0,9], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9], [7,9], [8,9], [9,9]],
				gen2: [[1,8], [2,8], [3,8], [4,8], [5,8], [6,8], [7,8], [8,8], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9], [7,9], [8,9]],
				gen3: [[1,8], [1,9], [2,7], [3,7], [4,7], [5,7], [6,7], [7,7], [8,8], [8,9]],
				gen4: [[1,8], [2,7], [3,6], [3,7], [3,8], [4,6], [4,7], [4,8], [5,6], [5,7], [5,8], [6,6], [6,7], [6,8], [7,7], [8,8]],
				gen5: [[2,6], [4,5], [4,9], [5,5], [5,9], [7,6]],
				gen6: []
			}
		};
		this.cells = {};
		for (var id in this.startSets) {
			this.cells[id] = {};
			for (var genKey in this.startSets[id]) {
				this.cells[id][genKey] = [];
				for (var i=0, coords; coords=this.startSets[id][genKey][i]; i++) {
					this.cells[id][genKey].push(new Cell(coords));
				}
			}
		}
	},
	teardown: function() {
		this.model = null;
		this.startSets = null;
		this.cells = null;
	}
});

test("change:dimensions", function() {
	verifyResetState.call(this);

	// initial state
	var dimensions = { m: 10, n: 10 };
	var modelDimensions = this.model.get("dimensions");
	notStrictEqual(modelDimensions, dimensions, "Verify dimensions initial state");
	equal(Object.keys(this.model._cellRegistry).length, modelDimensions.m * modelDimensions.n, "Verify correct number of cells in registry");

	// add to existing
	dimensions = { m: 100, n: 150 };
	var firstExistingCell = this.model._cellRegistry["0_0"];
	var lastExistingCell = this.model._cellRegistry["9_9"];
	// (simulate user changing one property at a time)
	this.model.set("dimensions", { m: dimensions.m, n: this.model.get("dimensions").n });
	this.model.set("dimensions", { m: this.model.get("dimensions").m, n: dimensions.n });

	verifyResetState.call(this);
	var modelDimensions = this.model.get("dimensions");
	notStrictEqual(modelDimensions, dimensions, "Verify dimensions after add");
	equal(Object.keys(this.model._cellRegistry).length, modelDimensions.m * modelDimensions.n, "Verify correct number of cells in registry after add");
	strictEqual(this.model._cellRegistry["0_0"], firstExistingCell, "Verify existing cells were not touched: start of range");
	strictEqual(this.model._cellRegistry["9_9"], lastExistingCell, "Verify existing cells were not touched: end of range");

	// remove from existing
	var oldTotalCells = dimensions.m * dimensions.n;
	dimensions = { m: 5, n: 15 };
	var beingAxedCell = this.model._cellRegistry["5_15"];
	// (simulate user changing one property at a time)
	this.model.set("dimensions", { m: dimensions.m, n: this.model.get("dimensions").n });
	this.model.set("dimensions", { m: this.model.get("dimensions").m, n: dimensions.n });

	verifyResetState.call(this);
	var modelDimensions = this.model.get("dimensions");
	notStrictEqual(modelDimensions, dimensions, "Verify dimensions after remove");
	equal(Object.keys(this.model._cellRegistry).length, oldTotalCells, "Verify all the old cells still exist in registry after remove");
	strictEqual(this.model._cellRegistry["5_15"], beingAxedCell, "Verify cell now outside the board boundaries still exists in registry");

	// add back
	dimensions = { m: 30, n: 65 };
	this.model.set("dimensions", dimensions);

	verifyResetState.call(this);
	var modelDimensions = this.model.get("dimensions");
	equal(modelDimensions, dimensions, "Verify dimensions after re-add");
	equal(Object.keys(this.model._cellRegistry).length, oldTotalCells, "Verify all the old cells still exist in registry after re-add");
	strictEqual(this.model._cellRegistry["5_15"], beingAxedCell, "Verify cell now outside the board boundaries still exists in registry");
});

test("resetProperties", function() {
	this.model.onChangeDimensions(this.model, { m: 10, n: 10 });

	// verify initial state
	verifyResetState.call(this);

	// no onCells, no startset: verify end with no onCells, no switch cells
	this.model._resetProperties();
	verifyResetState.call(this);

	// valid onCells, no startset: verify end with no onCells, no switch cells
	this.model._onCells = this.cells.fiveGenerations.gen1.slice();
	this.model._resetProperties();
	verifyResetState.call(this);

	// no onCells, valid startset: verify end with valid startset, valid switch cells
	this.model.set("startSet", this.startSets.fiveGenerations.gen1.slice());
	this.model._onCells = [];
	this.model._resetProperties();
	equal(this.model._onCells.length, this.cells.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid onCells");
	equal(this.model.get("switchOffCells"), null, "Verify no oncells, valid startset: no switchOffCells");
	equal(this.model.get("switchOnCells").length, this.cells.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid switchOnCells");
	equal(this.model.get("startSet").length, this.startSets.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid startSet");

	// valid onCells, valid startset: verify end with valid startset, valid switch cells
	this.model.set("startSet", this.startSets.fiveGenerations.gen1.slice());
	this.model._onCells = this.cells.fiveGenerations.gen1.slice();
	this.model._resetProperties();
	equal(this.model._onCells.length, this.cells.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid onCells");
	equal(this.model.get("switchOffCells"), null, "Verify no oncells, valid startset: no switchOffCells");
	equal(this.model.get("switchOnCells").length, this.cells.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid switchOnCells");
	equal(this.model.get("startSet").length, this.startSets.fiveGenerations.gen1.length, "Verify no oncells, valid startset: valid startSet");
});

test("changeCellStates", function() {
	expect(30);
	var cells = this.cells.fiveGenerations.gen1.slice();
	// verify initial off state
	for (var i=0, cell; cell=cells[i]; i++) {
		equal(cell.isOn(), false, "Verify cell " + i + "is off");
	}

	// turn cells on, verify on state
	this.model._changeCellStates(cells, "on");
	for (var i=0, cell; cell=cells[i]; i++) {
		equal(cell.isOn(), true, "Verify cell " + i + "is on");
	}

	// turn cells off, verify off state again
	this.model._changeCellStates(cells, "off");
	for (var i=0, cell; cell=cells[i]; i++) {
		equal(cell.isOn(), false, "Verify cell " + i + "is off again");
	}
});

test("findAdjacentCells", function() {
	var cells = this.cells.allEdgeStates.gen1.slice();
	var allAdjacentCellIds = {};
	allAdjacentCellIds[cells[0].getId()] = ["0_1", "1_0", "1_1"];
	allAdjacentCellIds[cells[1].getId()] = ["4_0", "4_1", "5_1", "6_0", "6_1"];
	allAdjacentCellIds[cells[2].getId()] = ["8_0", "8_1", "9_1"];
	allAdjacentCellIds[cells[3].getId()] = ["0_4", "0_6", "1_4", "1_5", "1_6"];
	allAdjacentCellIds[cells[4].getId()] = ["4_4", "4_5", "4_6", "5_4", "5_6", "6_4", "6_5", "6_6"];
	allAdjacentCellIds[cells[5].getId()] = ["8_4", "8_5", "8_6", "9_4", "9_6"];
	allAdjacentCellIds[cells[6].getId()] = ["0_8", "1_8", "1_9"];
	allAdjacentCellIds[cells[7].getId()] = ["4_8", "4_9", "5_8", "6_8", "6_9"];
	allAdjacentCellIds[cells[8].getId()] = ["8_8", "8_9", "9_8"];

	for (var i=0, cell; cell=cells[i]; i++) {
		var adjacentCells = this.model._findAdjacentCells(cell);
		var adjacentCellIds = adjacentCells.map(function(cell) { return cell.getId(); });
		notStrictEqual(adjacentCellIds, allAdjacentCellIds[cell.getId()], "Verify correct adjacent cells");
	}
});

test("pruneOnCells", function() {
	var unPrunedCells = this.cells.fiveGenerations.gen1.slice();
	var prunedCells = [];
	// turn on every other cell
	unPrunedCells = unPrunedCells.map(function(cell, index) {
		if (index % 2 === 0) {
			cell.on();
			prunedCells.push(cell);
		}
		return cell;
	});
	this.model._onCells = unPrunedCells;
	notStrictEqual(this.model._pruneOnCells(), prunedCells, "Verify cells have been sorted and off cells have been pruned");

});

test("change:targetGeneration", function() {
	var startSet = this.startSets.fiveGenerations.gen1.slice();
	this.model.set("startSet", startSet);
	this.model._resetProperties();

	// initial setup
	equal(this.model.get("startSet"), startSet, "Verify initial startset");
	var baseCellIds = this.cells.fiveGenerations.gen1.map(function(cell) { return cell.getId(); });
	var currentCellIds = this.model._onCells.map(function(cell) { return cell.getId(); });
	notStrictEqual(baseCellIds, currentCellIds, "Verify initial onCells are correct");

	this.model.set("targetGeneration", 3);
	equal(this.model.get("generation"), 3, "Verify target generation is 3");
	baseCellIds = this.cells.fiveGenerations.gen3.map(function(cell) { return cell.getId(); });
	currentCellIds = this.model._onCells.map(function(cell) { return cell.getId(); });
	notStrictEqual(baseCellIds, currentCellIds, "Verify gen3 onCells are correct");

	this.model.set("targetGeneration", 5);
	equal(this.model.get("generation"), 5, "Verify target generation is 5");
	baseCellIds = this.cells.fiveGenerations.gen5.map(function(cell) { return cell.getId(); });
	currentCellIds = this.model._onCells.map(function(cell) { return cell.getId(); });
	notStrictEqual(baseCellIds, currentCellIds, "Verify gen5 onCells are correct");
});

test("calculateNextGeneration", function() {
	expect(7);

	var startSet = this.startSets.fiveGenerations.gen1.slice();
	this.model.set("startSet", startSet);
	this.model._resetProperties();

	equal(this.model.get("startSet"), startSet, "Verify initial startset");

	var gens = ["gen1", "gen2", "gen3", "gen4", "gen5", "gen6"];
	var genLength = gens.length;
	for (var i=0, gen; gen=gens[i]; i++) {
		if (i > 0) {
			this.model._calculateNextGeneration();
		}
		var baseCellIds = this.cells.fiveGenerations[gen].map(function(cell) { return cell.getId(); });
		var currentCellIds = this.model._onCells.map(function(cell) { return cell.getId(); });
		notStrictEqual(baseCellIds, currentCellIds, "Verify onCells are correct: " + gen);
	}
});



function verifyResetState() {
	equal(this.model._onCells.length, 0, "Verify reset state: no onCells");
	equal(this.model.get("switchOffCells"), null, "Verify reset state: no switchOffCells");
	equal(this.model.get("switchOnCells"), null, "Verify reset state: no switchOnCells");
	equal(this.model.get("startSet"), null, "Verify reset state: no startSet");
}

