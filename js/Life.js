/* Notes:
 * - See http://jsperf.com/js-for-loop-vs-array-indexof/154 for why I like the for (var i=0, objVar; objVar=arr[i], ...) syntax. Faster than a while loop!
 * - Cell instances and collections are generally pass-by-reference, which can get a little sticky but increases performance.
 *
 * Known issues:
 *
 * - Setting the target generation greater than the pattern's lifespan (e.g. to 6 when it only lasts 5 generations), should display the last actual generation (i.e. 5).
 * - Flicker when resizing the board smaller, and there are on cells
 * - Jumping to target generation, then hitting play, then pause, then entering a new target generation and hitting play, auto-plays again instead of jumping to the new generation.
 * - Play button isn't disabled consistently.
 * - Buttons should be in a sprite.
 * - Various usability issues.
 *
 * Future enhancements:
 *
 * - Recognize a looping pattern and terminate.
 * - Figure out a cooler visual effect for generations.
 * - Make the interval configurable.
 * - Add "export current generation" feature (useful for testing!).
 * - Add JSDoc commenting universally.
 * - Figure out some cleverness on change dimensions, where the view only renders the additional cells.
 * - A million other things I'll think of after hitting 'send'.
 */

Life = Backbone.View.extend({
	defaults: {
		generation: 0,
		m: 10,
		n: 10,
		targetGeneration: null
	},
	events: {
		"click #pause": "onClickPause",
		"click #play": "onClickPlay",
		"click #reset": "onClickReset",
		"keyup input.m": "onChangeDimensions",
		"keyup input.n": "onChangeDimensions",
		"keyup #startSet": "onChangeStartSet"
	},
	initialize: function() {
		this._model = new LifeModel();
		this._view = new LifeView({ model: this._model });

		this.listenTo(this._model, "onPause", this.onPause);
		this.listenTo(this._model, "onPlay", this.onPlay);
		this.listenTo(this._model, "onReset", this.onReset);
		this.listenTo(this._model, "onStop", this.onStop);
		this.listenTo(this._model, "change:generation", this.onIncrementGeneration);
		this.listenTo(this._model, "invalid", this.onInvalidStartSet);

		// define debounced keystroke methods
		this.onChangeDimensions = _.debounce(this._onChangeDimensions, 500);
		this.onChangeStartSet = _.debounce(this._onChangeStartSet, 1000);

		this.$("#generationDisplay").text(this.defaults.generation);
		this._setInputValue("m", this.defaults.m);
		this._setInputValue("n", this.defaults.n);
		this._model.set({ dimensions: this._getDimensions() });

		return this; // chainable
	},

	onClickPlay: function() {
		if (this.$("#play").hasClass("disabled")) {
			return;
		}
		if (this.$("#controls").hasClass("isPaused")) {
			this.onClickResume();
			return;
		}
		var startSet = this._view.getSelectedCoords();
		if (!startSet.length) {
			return;
		}
		this.$("#startSet").val(this._toCoordString(startSet));
		this._model.set("startSet", startSet);
		this._play();
	},
	onClickPause: function() {
		this._model.pause();
	},
	onClickReset: function() {
		this._model.reset();
	},
	onClickResume: function() {
		this._model.play();
	},
	onIncrementGeneration: function(model, generation) {
		this.$("#generationDisplay").text(generation);
	},
	// FIXME: this is counter-intuitive because a successful parse of the input string results in an error, value "success".
	onInvalidStartSet: function(model, error) {
		if (error === "success") {
			this.$("#startSet").removeClass("error");
			this._onTextStartSet();
		} else {
			this.$("#startSet").addClass("error");
		}
	},
	onPause: function() {
		this.$("#controls")
			.removeClass("isInProgress")
			.addClass("isPaused");
	},
	onPlay: function() {
		this.$("#controls")
			.addClass("isInProgress")
			.removeClass("isPaused");
	},
	onReset: function() {
		this.$("#controls").removeClass("isInProgress isPaused");
		this.$("#play").removeClass("disabled");
		this._setInputValue("targetGeneration", "");
	},
	onStop: function() {
		this.$("#controls").removeClass("isInProgress isPaused");
		this.$("#play").addClass("disabled");
	},

	_getDimensions: function() {
		var m = this._getInputValue("m");
		var n = this._getInputValue("n");
		return { m: m, n: n };
	},
	_getInputValue: function(name) {
		var input = this.$("input." + name);
		var val = parseInt(input.val(), 10);
		if (isNaN(val)) {
			val = this.defaults[name];
			this._setInputValue(name, val);
		}
		return val;
	},
	_onChangeDimensions: function(e) {
		this._model.set("dimensions", this._getDimensions());
	},
	_onChangeStartSet: function(e) {
		this.onClickReset();
		this._model.set("startSet", this.$("#startSet").val(), { validate: true });
	},
	_onTextStartSet: function() {
		this._view.populateStartSet(this._model.get("startSet"));
	},
	_play: function() {
		var targetGeneration = this._getInputValue("targetGeneration");
		if (targetGeneration === null) {
			this._model.play();
		} else {
			this._model.set("targetGeneration", targetGeneration);
		}
	},
	_setInputValue: function(name, val) {
		var input = this.$("input." + name);
		input.val(this.defaults[name]);
	},
	_toCoordString: function(coordArray) {
		return "[[" + coordArray.join("], [") + "]]";
	}
});

