LifeView = Backbone.View.extend({
	className: "gameBoard",
	events: {
		"mouseover .cell": "onMouseoverCell"
	},
	_cellSize: 30,
	_startCellCoords: {},
	_isInResetState: true,
	initialize: function() {
		Backbone.View.prototype.initialize.apply(this, arguments);
		$(document.body).append(this.$el);
		this.listenTo(this.model, "change:switchOnCells", this.onSetOnCells);
		this.listenTo(this.model, "change:switchOffCells", this.onSetOffCells);
		this.listenTo(this.model, "change:dimensions", this.render);
		this.listenTo(this.model, "onReset", this.onReset);
		return this;
	},

	onMouseoverCell: function(e) {
		if (this._isInResetState) {
			var $cellElement = $(e.target);
			var dimensions = this.model.get("dimensions");
			var coords = Cell.getCoordsFromId($cellElement.attr("id"));
			if ((coords[0] < dimensions.m) && (coords[1] < dimensions.n)) {
				var isTurningOn = ($cellElement.hasClass("on")) ? false : true;
				this._setCellState($cellElement, isTurningOn);
			}
		}
	},
	getSelectedCoords: function() {
		var selectedCells = [];
		for (var id in this._startCellCoords) {
			if (this._startCellCoords[id]) {
				selectedCells.push(Cell.getCoordsFromId(id));
			}
		}
		return selectedCells;
	},
	onReset: function() {
		this._isInResetState = true;
		this._startCellCoords = {};
		this.$("div.cell.on").removeClass("on");
	},
	onSetOnCells: function(model, cells) {
		// ignore when this gets called on initialize with the default values
		if (!arguments.length || !cells) {
			return;
		}
		this._isInResetState = false;
		var len = cells.length;
		var cell;
		for (var i=0; i<len; i++) {
			cell = cells[i];
			this.$("#" + cell.getId())
				.addClass("on");
		}
	},
	onSetOffCells: function(model, cells) {
		// ignore when this gets called on initialize with the default values
		if (!arguments.length || !cells) {
			return;
		}
		var len = cells.length;
		for (var i=0; i<len; i++) {
			cell = cells[i];
			this.$("#" + cell.getId())
				.removeClass("on");
		}
	},
	populateStartSet: function(startSet) {
		if (startSet === null) {
			for (var id in this._startCellCoords) {
				this._setCellState(this.$("#" + id), false);
			}
			this._startCellCoords = {};
		} else {
			for (var i=0, cellCoords; cellCoords=startSet[i]; i++) {
				this._setCellState(this.$("#" + Cell.createId(cellCoords)), true);
			}
		}
	},
	render: function(model, dimensions) {
		// ignore when this gets called on initialize with the default values
		if (!arguments.length || !dimensions) {
			return;
		}
		this.$el.width(dimensions.m * this._cellSize);
		this.$el.height(dimensions.n * this._cellSize);
		var allCells = this.model.getCells();
		for (var id in allCells) {
			this._appendCellElement(allCells[id]);
		}
	},

	_appendCellElement: function(cell) {
		if (!this.$("#" + cell.getId()).length) {
			$("<div/>")
				.attr("id", cell.getId())
				.addClass("cell")
				.css({
					left: (cell.getX() * this._cellSize) + "px",
					top: (cell.getY() * this._cellSize) + "px"
				})
				.appendTo(this.$el);
		}
	},
	_setCellState: function($cellElement, state) {
		this._startCellCoords[$cellElement.attr("id")] = state;
		$cellElement.toggleClass("on", state);
	}
});