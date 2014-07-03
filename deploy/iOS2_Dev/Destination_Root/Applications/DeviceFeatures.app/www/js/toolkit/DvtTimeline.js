/**
 * This is the base class for all time based components (Gantt, Timeline).  It handles the following:
 * - all common attributes (start time, end time etc.)
 * - association with the generic overview component
 * - scrolling, including autoscroll
 * - creation of scrollable canvas
 * - zoom
 * - time axis (multiple)
 * - current time and highlighted time period
 *
 * @param {DvtContext} context The rendering context.
 * @param {object} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The object context for the callback function.
 * @class TimeBasedContainer component.
 * @constructor
 * @extends {DvtContainer}
 */
var DvtTimeComponent = function(context, callback, callbackObj) {
  this.Init(context, callback, callbackObj);
};

DvtObj.createSubclass(DvtTimeComponent, DvtContainer, 'DvtTimeComponent');

DvtTimeComponent.BACKGROUND_ID = 'bg';


/**
 * Initializes the view.
 * @param {DvtContext} context The rendering context.
 * @param {object} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The object context for the callback function
 * @protected
 */
DvtTimeComponent.prototype.Init = function(context, callback, callbackObj) 
{
  DvtTimeComponent.superclass.Init.call(this, context);

  this._callback = callback;
  this._callbackObj = callbackObj;

  this._virtualize = false;
};


/**
 * Renders the component using the specified xml.  If no xml is supplied to a component
 * that has already been rendered, this function will rerender the component with the
 * specified size.
 * @param {string} xml The component xml.
 * @param {number} width The width of the component.
 * @param {number} height The height of the component.
 */
DvtTimeComponent.prototype.render = function(width, height, options) 
{
  this._options = options;

  // Store the size
  this.Width = width;
  this.Height = height;

  this._fetchStartPos = 0;
  this._fetchEndPos = width;

  if (options == null)
  {
    // clean out existing elements since they will be regenerate
    this.removeChildren();
  }

  // If new xml is provided, parse it and apply the properties
  if (options)
  {
    var props = this.Parse(options);
    this._applyParsedProperties(props);
  }
};

// adds a tick mark
DvtTimeComponent.prototype.addTick = function(container, x, y1, y2, stroke, id)
{
  var line = new DvtLine(this.getCtx(), x, y1, x, y2, id);
  line.setStroke(stroke);
  line.setPixelHinting(true);

  container.addChild(line);
  return line;
};

// add a label in time axis
DvtTimeComponent.prototype.addAxisLabel = function(container, label, x, y, maxWidth)
{
  label.setX(x);
  label.setY(y);
  DvtTextUtils.fitText(label, maxWidth, Infinity, container);

  // center align text
  label.alignCenter();
};

// add a label in series time axis
DvtTimeComponent.prototype.addLabel = function(container, pos, text, maxWidth, y, labelStyle, id, renderBackground, labelPadding)
{
  var label = new DvtOutputText(this.getCtx(), text, pos, 0, id);
  if (labelStyle != null)
    label.setCSSStyle(labelStyle);

  container.addChild(label);
  var dim = label.getDimensions();
  container.removeChild(label);
  y = y - dim.h;
  label.setY(y);

  if (renderBackground)
  {
    var backgroundRect = new DvtRect(this.getCtx(), pos - labelPadding, y - labelPadding, Math.min(dim.w + labelPadding * 2, maxWidth), dim.h + labelPadding * 2, 'ob_' + id);
    backgroundRect.setCSSStyle(labelStyle);
    backgroundRect.setCornerRadius(3);
    container.addChild(backgroundRect);
  }
  DvtTextUtils.fitText(label, maxWidth, Infinity, container);

  return label;
};

DvtTimeComponent.prototype._applyParsedProperties = function(props)
{
  this._origStart = props.origStart;
  this._origEnd = props.origEnd;
  this._start = props.start;
  this._end = props.end;

  this._orientation = props.orientation;
  this._isRtl = props.isRtl;
  this._inlineStyle = props.inlineStyle;

  this._scale = props.scale;
  this._seriesScale = props.seriesScale;
  this._converter = props.converter;

  this.applyStyleValues();
};


/**
 * Combines style defaults with the styles provided
 *
 */
DvtTimeComponent.prototype.applyStyleValues = function()
{
  this._style.parseInlineStyle(this._inlineStyle);
};

//////////// attribute methods ////////////////////////////
DvtTimeComponent.prototype.isAnimationEnabled = function()
{
  return true;
};

DvtTimeComponent.prototype.getAdjustedStartTime = function() 
{
  return this._start;
};

DvtTimeComponent.prototype.getAdjustedEndTime = function() 
{
  return this._end;
};


/**
 * Returns the overall (virtualized) width of the container
 */
DvtTimeComponent.prototype.getContainerWidth = function() 
{
  return this._contentWidth;
};

DvtTimeComponent.prototype.setContainerWidth = function(width)
{
  if (this._canvasWidth < width)
    this._contentWidth = width;
  else
    this._contentWidth = this._canvasWidth;

  if (!this._virtualize)
  {
    this._fetchStartPos = 0;
    this._fetchEndPos = this._contentWidth;
  }
};

DvtTimeComponent.prototype.renderScrollableCanvas = function()
{
  if (this._canvas == null)
  {
    this._canvas = new DvtContainer(this.getCtx(), 'canvas');
    this.addChild(this._canvas);
  }
};

DvtTimeComponent.prototype.updateTimeAxis = function(container, width)
{
};

// for vertical
DvtTimeComponent.prototype.getTimeAxisWidth = function()
{
  // read from skin?
  if (this._timeAxisWidth == null)
    this._timeAxisWidth = 30;

  return this._timeAxisWidth;
};

// TODO: Add RTL support
DvtTimeComponent.prototype.isRTL = function()
{
  return false;
};

/////////////////// scrolling ////////////////////////////
DvtTimeComponent.prototype.setVScrollPos = function(pos) 
{
  if (this._canvas != null)
    this._canvas.setTranslateY(0 - pos);
};
var DvtTimeComponentAxis = function(context, callback, callbackObj) {
  this.Init(context, callback, callbackObj);
};

DvtObj.createSubclass(DvtTimeComponentAxis, DvtContainer, 'DvtTimeComponentAxis');

DvtTimeComponentAxis.DEFAULT_INTERVAL_WIDTH = 50;
DvtTimeComponentAxis.DEFAULT_INTERVAL_HEIGHT = 21;
DvtTimeComponentAxis.DEFAULT_INTERVAL_PADDING = 2;
DvtTimeComponentAxis.DEFAULT_BORDER_TOP_WIDTH = 1;
DvtTimeComponentAxis.DEFAULT_BORDER_BOTTOM_WIDTH = 1;

DvtTimeComponentAxis.prototype.Init = function(context, callback, callbackObj)
{
  DvtTimeComponentAxis.superclass.Init.call(this, context);

  this._calendar = new DvtTimeComponentCalendar();
  this._formatter = new DvtTimeComponentAxisFormatter(DvtTimeComponentAxisFormatter.SHORT);
  this._contentHeight = DvtTimeComponentAxis.DEFAULT_INTERVAL_HEIGHT;
  this._borderTopWidth = DvtTimeComponentAxis.DEFAULT_BORDER_TOP_WIDTH;
  this._borderBottomWidth = DvtTimeComponentAxis.DEFAULT_BORDER_BOTTOM_WIDTH;

  this._zoomOrders = ['days', 'weeks', 'months', 'quarters', 'halfyears', 'years'];
  this._zoomLevels = {'days': 'Days', 'weeks': 'Weeks', 'quarters': 'Quarters', 'halfyears': 'Half Years', 'years': 'Years'};
};

DvtTimeComponentAxis.prototype.setScale = function(scale)
{
  this._scale = scale;
};

DvtTimeComponentAxis.prototype.setConverter = function(converter)
{
  // Check to make sure the converter supplied contains the correct API
  if (converter && typeof converter.getAsString === 'function')
    this._converter = converter;
};

DvtTimeComponentAxis.prototype.getContentHeight = function()
{
  return this._contentHeight;
};

DvtTimeComponentAxis.prototype.setContentHeight = function(contentHeight)
{
  if (contentHeight > DvtTimeComponentAxis.DEFAULT_INTERVAL_HEIGHT)
    this._contentHeight = contentHeight;
};

DvtTimeComponentAxis.prototype.setBorderTopWidth = function(borderTopWidth)
{
  this._borderTopWidth = borderTopWidth;
};

DvtTimeComponentAxis.prototype.setBorderBottomWidth = function(borderBottomWidth)
{
  this._borderBottomWidth = borderBottomWidth;
};

DvtTimeComponentAxis.prototype.getHeight = function()
{
  return this._contentHeight + this._borderTopWidth + this._borderBottomWidth;
};

DvtTimeComponentAxis.prototype.getPosHeight = function()
{
  return this._contentHeight + (this._borderTopWidth + this._borderBottomWidth) / 2;
};

DvtTimeComponentAxis.prototype.setType = function(type)
{
  // create a new formatter based on the new type
  this._formatter = new DvtTimeComponentAxisFormatter(type);
};

// utility method: find the closiest date to the time scale of the specified date
DvtTimeComponentAxis.prototype.adjustDate = function(date)
{
  return this._calendar.adjustDate(new Date(date), this._scale);
};

DvtTimeComponentAxis.prototype.getNextDate = function(date)
{
  return this._calendar.getNextDate(new Date(date), this._scale);
};

DvtTimeComponentAxis.prototype.formatDate = function(date)
{
  if (this._converter)
    return this._converter.getAsString(date);
  else
    return this._formatter.format(date, this._scale);
};

DvtTimeComponentAxis.prototype.getZoomOrders = function()
{
  return this._zoomOrders;
};

DvtTimeComponentAxis.prototype.setZoomOrders = function(zoomOrders)
{
  this._zoomOrders = zoomOrders;
};

// todo: figure out how to expose this correctly (including custom time scale)
DvtTimeComponentAxis.prototype.getZoomLabel = function(scale)
{
  return this._zoomLevels[scale];
};
// todo: use DateJS?
var DvtTimeComponentAxisFormatter = function(type, locale) 
{
  this.Init(type, locale);
};

DvtObj.createSubclass(DvtTimeComponentAxisFormatter, DvtObj, 'DvtTimeComponentAxisFormatter');

DvtTimeComponentAxisFormatter.LONG = 0;
DvtTimeComponentAxisFormatter.SHORT = 1;

DvtTimeComponentAxisFormatter.prototype.Init = function(type, locale) 
{
  this._type = type;
  this._locale = locale;

  this._formats = [];
  this._formats[0] = new Object();
  this._formats[0]['weeks'] = 'mmmm dd yyyy';
  this._formats[0]['months'] = 'mmmm yyyy';
  this._formats[0]['days'] = 'ddd, mmm dd yyyy';
  this._formats[0]['hours'] = 'HH:MM';
  this._formats[0]['quarters'] = 'mmmm';
  this._formats[0]['halfyears'] = 'yyyy';
  this._formats[0]['years'] = 'yyyy';
  this._formats[0]['twoyears'] = 'yyyy';

  this._formats[1] = new Object();
  this._formats[1]['weeks'] = 'm/dd';
  this._formats[1]['months'] = 'mmm';
  this._formats[1]['days'] = 'm/dd';
  this._formats[1]['hours'] = 'HH:MM';
  this._formats[1]['quarters'] = 'mmm';
  this._formats[1]['halfyears'] = 'yy';
  this._formats[1]['years'] = 'yy';
  this._formats[1]['twoyears'] = 'yy';
};


/**
 * Change the format string for a particular time scale.
 *
 * @param scale
 * @param pattern - the format string
 */
DvtTimeComponentAxisFormatter.prototype.setPattern = function(scale, pattern)
{
  this._formats[this._type][scale] = pattern;
};

DvtTimeComponentAxisFormatter.prototype.format = function(date, scale) 
{
  var format = this._formats[this._type][scale];
  if (format != null)
    return date.format(format);
  else
    return date.toLocaleString();
};

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function() {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function(val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = '0' + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function(date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == '[object String]' && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError('invalid date');

		mask = String(dF.masks[mask] || mask || dF.masks['default']);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == 'UTC:') {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? 'getUTC' : 'get',
			d = date[_ + 'Date'](),
			D = date[_ + 'Day'](),
			m = date[_ + 'Month'](),
			y = date[_ + 'FullYear'](),
			H = date[_ + 'Hours'](),
			M = date[_ + 'Minutes'](),
			s = date[_ + 'Seconds'](),
			L = date[_ + 'Milliseconds'](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d: d,
				dd: pad(d),
				ddd: dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m: m + 1,
				mm: pad(m + 1),
				mmm: dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy: String(y).slice(2),
				yyyy: y,
				h: H % 12 || 12,
				hh: pad(H % 12 || 12),
				H: H,
				HH: pad(H),
				M: M,
				MM: pad(M),
				s: s,
				ss: pad(s),
				l: pad(L, 3),
				L: pad(L > 99 ? Math.round(L / 10) : L),
				t: H < 12 ? 'a' : 'p',
				tt: H < 12 ? 'am' : 'pm',
				T: H < 12 ? 'A' : 'P',
				TT: H < 12 ? 'AM' : 'PM',
				Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
				o: (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	'default': 'ddd mmm dd yyyy HH:MM:ss',
	shortDate: 'm/d/yy',
	mediumDate: 'mmm d, yyyy',
	longDate: 'mmmm d, yyyy',
	fullDate: 'dddd, mmmm d, yyyy',
	shortTime: 'h:MM TT',
	mediumTime: 'h:MM:ss TT',
	longTime: 'h:MM:ss TT Z',
	isoDate: 'yyyy-mm-dd',
	isoTime: 'HH:MM:ss',
	isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
		'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	],
	monthNames: [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
		'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
	]
};

// For convenience...
Date.prototype.format = function(mask, utc) {
	return dateFormat(this, mask, utc);
};
// todo: this should be used by Timeline also
var DvtTimeComponentCalendar = function(options) 
{
  this.Init(options);
};

DvtObj.createSubclass(DvtTimeComponentCalendar, DvtObj, 'DvtTimeComponentCalendar');

DvtTimeComponentCalendar.prototype.Init = function() 
{
  this._dayInMillis = 1000 * 60 * 60 * 24;
};

DvtTimeComponentCalendar.prototype.getFirstDayOfWeek = function()
{
  // sunday; locale based
  return 0;
};

DvtTimeComponentCalendar.prototype.adjustDate = function(date, scale)
{
  var _adjustedDate = new Date(date.getTime());
  if (scale == 'weeks')
  {
    _adjustedDate.setHours(0, 0, 0);
    var roll_amt = (date.getDay() - this.getFirstDayOfWeek() + 7) % 7;
    if (roll_amt > 0)
      _adjustedDate.setTime(_adjustedDate.getTime() - roll_amt * this._dayInMillis);
  }
  else if (scale == 'months')
  {
    _adjustedDate.setDate(1);
  }
  else if (scale == 'days')
  {
    _adjustedDate.setHours(0, 0, 0);
  }
  else if (scale == 'hours')
  {
    _adjustedDate.setMinutes(0, 0, 0);
  }
  else if (scale == 'quarters')
  {
    _adjustedDate.setDate(1);
    roll_amt = 2 - (date.getMonth() + 11) % 3;
    if (roll_amt > 0)
      _adjustedDate.setMonth(_adjustedDate.getMonth() + roll_amt);
  }
  else if (scale == 'halfyears')
  {
    _adjustdDate.setDate(1);
    roll_amt = 5 - (date.getMonth() + 11) % 6;
    if (roll_amt > 0)
      _adjustedDate.setMonth(_adjustedDate.getMonth() + roll_amt);
  }
  else if (scale == 'years')
  {
    _adjustedDate.setMonth(0);
    _adjustedDate.setDate(1);
  }
  else if (scale == 'twoyears')
  {
    _adjustedDate.setMonth(0);
    _adjustedDate.setDate(1);
  }

  return _adjustedDate;
};

DvtTimeComponentCalendar.prototype.getNextDate = function(date, scale)
{
  var _nextDate = new Date(date.getTime());
  if (scale == 'days')
    _nextDate.setDate(date.getDate() + 1);
  else if (scale == 'weeks')
    _nextDate.setDate(date.getDate() + 7);
  else if (scale == 'months')
    _nextDate.setMonth(date.getMonth() + 1);
  else if (scale == 'hours')
    _nextDate.setHours(date.getHours() + 1);
  else if (scale == 'quarters')
    _nextDate.setMonth(date.getMonth() + 3);
  else if (scale == 'halfyears')
    _nextDate.setMonth(date.getMonth() + 6);
  else if (scale == 'years')
    _nextDate.setFullYear(date.getFullYear() + 1);
  else if (scale == 'twoyears')
    _nextDate.setFullYear(date.getFullYear() + 2);
  else
  {
    // circuit breaker
    _nextDate.setYear(date.getYear() + 1);
  }
  return _nextDate;
};
// Base class for all time based JSON parser (Gantt, Timeline)
var DvtTimeComponentParser = function(view) 
{
  this.Init(view);
};

DvtObj.createSubclass(DvtTimeComponentParser, DvtObj, 'DvtTimeComponentParser');

DvtTimeComponentParser.prototype.Init = function(view) 
{
  this._view = view;
  this._calendar = new DvtTimeComponentCalendar();
};


/**
 * Parses the specified XML String and returns the root node of the timeline
 * @param {string} options The String containing XML describing the component.
 * @return {object} An object containing the parsed properties
 */
DvtTimeComponentParser.prototype.parse = function(options)
{
  this._startTime = new Date(options['startTime']);
  this._endTime = new Date(options['endTime']);

  var ret = this.ParseRootAttributes();

  ret.inlineStyle = options['style'];

  return ret;
};


/**
 * Parses the attributes on the root node.
 * @return {object} An object containing the parsed properties
 * @protected
 */
DvtTimeComponentParser.prototype.ParseRootAttributes = function()
{
  // The object that will be populated with parsed values and returned
  var ret = new Object();

  ret.origStart = this._startTime;
  ret.origEnd = this._endTime;
  ret.orientation = 'horizontal';

  return ret;
};

DvtTimeComponentParser.prototype.getCalendar = function()
{
  return this._calendar;
};

DvtTimeComponentParser.prototype.setCalendar = function(calendar)
{
  this._calendar = calendar;
};

DvtTimeComponentParser.prototype.getDate = function(date)
{
  if (date == null)
    return null;
  else if (date.getTime) // check function reference
    return date.getTime();
  else if (!isNaN(date))
    return date;
  else
    return (new Date(date)).getTime() + 0 * 60 * 60 * 1000; // for twitter, replace 0 with 5
};

DvtTimeComponentParser.prototype.adjustDate = function(date, scale)
{
  return this._calendar.adjustDate(date, scale);
};

DvtTimeComponentParser.prototype.getNextDate = function(date, scale)
{
  return this._calendar.getNextDate(date, scale);
};

var DvtElementNode = function() 
{
};

DvtElementNode.prototype.getChildNodes = function()
{
  return this.childNodes;
};

DvtElementNode.prototype.getName = function() 
{
  return this.getAttribute('name');
};

DvtElementNode.prototype.getAttribute = function(name) 
{
  return this[name];
};
/** Copyright (c) 2011, Oracle and/or its affiliates. All rights reserved. */
var DvtTimeUtils = new Object();

DvtTimeUtils.supportsTouch = function()
{
  return DvtAgent.isTouchDevice();
};

DvtObj.createSubclass(DvtTimeUtils, DvtObj, 'DvtTimeUtils');


/**
 * startTime - the start time of timeline in millis
 * endTime - the end of the timeline in millis
 * time - the time in question
 * width - the width of the element
 *
 * @return the position relative to the width of the element
 */
DvtTimeUtils.getDatePosition = function(startTime, endTime, time, width)
{
  var number = (time - startTime) * width;
  var denominator = (endTime - startTime);
  if (number == 0 || denominator == 0)
    return 0;

  return number / denominator;
};


/**
 * @return time in millis
 */
DvtTimeUtils.getPositionDate = function(startTime, endTime, pos, width)
{
  var number = pos * (endTime - startTime);
  if (number == 0 || width == 0)
    return startTime;

  return (number / width) + startTime;
};
/**
 * Timeline component.  This class should never be instantiated directly.  Use the
 * newInstance function instead.
 * @class
 * @constructor
 * @extends {DvtContainer}
 * @export
 */
var DvtTimeline = function()
{

};

DvtObj.createSubclass(DvtTimeline, DvtTimeComponent, 'DvtTimeline');

DvtTimeline.DEFAULT_TIMELINE_STYLE = 'border:1px #d9dfe3;';

DvtTimeline.DEFAULT_AXIS_STYLE = 'background-color:#f9f9f9;border:1px #d9dfe3;';
DvtTimeline.DEFAULT_AXIS_LABEL_STYLE = 'color:#333333;font-size:12px;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';
DvtTimeline.DEFAULT_SERIES_AXIS_LABEL_STYLE = 'background-color:rgba(249,249,249,0.8);color:#4f4f4f;white-space:nowrap;font-size:14px;font-weight:bold;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';
DvtTimeline.DEFAULT_SERIES_AXIS_LABEL_PADDING = 1;
DvtTimeline.DEFAULT_AXIS_SEPARATOR_STYLE = 'color:#bcc7d2';

DvtTimeline.DEFAULT_HOTSPOT_BACKGROUND_COLOR = '#000000';
DvtTimeline.DEFAULT_HOTSPOT_BORDER_RADIUS = 2;
DvtTimeline.DEFAULT_HOTSPOT_OPACITY = 0.6;
DvtTimeline.DEFAULT_HOTSPOT_WIDTH = 28;
DvtTimeline.DEFAULT_HOTSPOT_HEIGHT = 28;
DvtTimeline.DEFAULT_HOTSPOT_PADDING = 3;
DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH = 14;
DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT = 14;


/**
 * Returns a new instance of DvtTimeline.
 * @param {DvtContext} context The rendering context.
 * @param {string} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The optional object instance on which the callback function is defined.
 * @return {DvtTimeline}
 * @export
 */
DvtTimeline.newInstance = function(context, callback, callbackObj)
{
  var timeline = new DvtTimeline();
  timeline.Init(context, callback, callbackObj);
  return timeline;
};


/**
 * Initializes the component.
 * @param {DvtContext} context The rendering context.
 * @param {string} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The optional object instance on which the callback function is defined.
 * @protected
 */
DvtTimeline.prototype.Init = function(context, callback, callbackObj)
{
  DvtTimeline.superclass.Init.call(this, context, callback, callbackObj);
  this.setId('timeline' + 1000 + Math.floor(Math.random() * 1000000000));

  if (DvtTimeUtils.supportsTouch())
  {
    this.addEvtListener('touchstart', this.HandleTouchStart, false, this);
    this.addEvtListener('touchmove', this.HandleTouchMove, false, this);
    this.addEvtListener('touchend', this.HandleTouchEnd, false, this);
  }
  else
  {
    this.addEvtListener('mousedown', this.HandleMouseDown, false, this);
    this.addEvtListener('mouseup', this.HandleMouseUp, false, this);
    this.addEvtListener('mousemove', this.HandleMouseMove, false, this);
  }
};


/**
 * Specifies the options for this component.  This function ensures that defaults are initialized.
 * @param {object} options The object containing specifications for this component.
 * @private
 */
DvtTimeline.prototype._setOptions = function(options)
{
  this._options = options;
};


/**
 * Returns the evaluated options object, which contains the user specifications
 * merged with the defaults.
 * @return {object} The options object.
 */
DvtTimeline.prototype._getOptions = function()
{
  return this._options;
};

DvtTimeline.prototype.Parse = function(options)
{
  this._parser = new DvtTimelineParser(this);
  return this._parser.parse(options);
};

DvtTimeline.prototype._applyParsedProperties = function(props)
{
  DvtTimeline.superclass._applyParsedProperties.call(this, props);

  this._selectionMode = props.selectionMode;
  this._axisInlineStyle = props.axisStyle;
  this._shortDesc = props.shortDesc;

  this._timeAxis = new DvtTimeComponentAxis(this.getCtx());
  this._timeAxis.setScale(this._scale);
  this._timeAxis.setConverter(this._converter);

  if (this._seriesScale)
  {
    this._seriesConverter = props.seriesConverter;
    this._seriesTimeAxis = new DvtTimeComponentAxis(this.getCtx());
    this._seriesTimeAxis.setScale(this._seriesScale);
    this._seriesTimeAxis.setConverter(this._seriesConverter);
    this._seriesTimeAxis.setType(DvtTimeComponentAxisFormatter.LONG);
  }

  this._defaultInversions = [false, true];
};

DvtTimeline.prototype.getTimeAxisHeight = function()
{
  return this._timeAxis.getHeight();
};


/**
 * Renders the component with the specified data.  If no data is supplied to a component
 * that has already been rendered, the component will be rerendered to the specified size.
 * @param {object} options The object containing specifications and data for this component.
 * @param {number} width The width of the component.
 * @param {number} height The height of the component.
 * @export
 */
DvtTimeline.prototype.render = function(options, width, height)
{
  // ensure options is updated
  this._setOptions(options);

  this._fetchStartPos = 0;
  this._fetchEndPos = width;
  this._resources = options['_resources'];
  if (this._resources == null)
	this._resources = [];

  // The overall size of this component
  this._compWidth = width;
  this._compHeight = height;

  // If new xml is provided, parse it and apply the properties
  if (options)
  {
    var props = this.Parse(options);
    this._applyParsedProperties(props);
  }

  // clear any contents rendered previously
  this.removeChildren();

  this._axisStyle = new DvtCSSStyle(DvtTimeline.DEFAULT_AXIS_STYLE);
  if (options['styleDefaults'])
  {
    this._axisStyleDefaults = options['styleDefaults']['timeAxis'];
    this._itemStyleDefaults = options['styleDefaults']['timelineItem'];
    this._seriesStyleDefaults = options['styleDefaults']['timelineSeries'];
  }
  this.prepareTimeAxis(this._start, this._end);
  this._populateSeries();

  this.createBackground();

  // Render the timeline
  this.renderScrollableCanvas();

  this.setupInnerCanvas();

  this.applyAxisStyleValues();

  this.renderSeries();
  this.renderSeriesLabels();
  this.applyInitialSelections();
  this.renderAxis();

  // render scroll hotspots now so they are on top of everything
  this.renderScrollHotspots();

  this.showThenHideHotspots();
};

DvtTimeline.prototype.renderScrollHotspots = function()
{
  if (this._series)
  {
    var seriesCount = this._series.length;
    this._scrollHotspots = [];
    for (var i = 0; i < seriesCount; i++)
    {
      var series = this._series[i];
      var scrollHotspots = new DvtContainer(this.getCtx(), 'hotspots_s' + i);
      this.addChild(scrollHotspots);

      if (this._contentWidth > this._canvasWidth)
      {
        var leftX = this._startX + DvtTimeline.DEFAULT_HOTSPOT_PADDING;
        var rightX = this._startX + this._canvasWidth - DvtTimeline.DEFAULT_HOTSPOT_WIDTH - DvtTimeline.DEFAULT_HOTSPOT_PADDING;
        var hotspotY = this._startY + (i * (this._seriesHeight + this.getTimeAxisHeight())) + (this._seriesHeight - DvtTimeline.DEFAULT_HOTSPOT_HEIGHT) / 2;
        var arrowLeftX = leftX + DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH / 2;
        var arrowRightX = rightX + DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH / 2;
        var arrowY = hotspotY + DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT / 2;

        var leftHotspot = new DvtRect(this.getCtx(), leftX, hotspotY, DvtTimeline.DEFAULT_HOTSPOT_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_HEIGHT, 'lhs');
        leftHotspot.setFill(new DvtSolidFill(DvtTimeline.DEFAULT_HOTSPOT_BACKGROUND_COLOR, 1));
        leftHotspot.setCornerRadius(DvtTimeline.DEFAULT_HOTSPOT_BORDER_RADIUS);
        leftHotspot.hotspot = 'left';
        leftHotspot.setAlpha(0);
        var leftArrow = new DvtImage(this.getCtx(), this._resources['scrollLeft'], arrowLeftX, arrowY, DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT, 'lhs_arr');
        leftArrow.hotspot = 'left';
        leftHotspot.addChild(leftArrow);
        var rightHotspot = new DvtRect(this.getCtx(), rightX, hotspotY, DvtTimeline.DEFAULT_HOTSPOT_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_HEIGHT, 'rhs');
        rightHotspot.setFill(new DvtSolidFill(DvtTimeline.DEFAULT_HOTSPOT_BACKGROUND_COLOR, 1));
        rightHotspot.setCornerRadius(DvtTimeline.DEFAULT_HOTSPOT_BORDER_RADIUS);
        rightHotspot.hotspot = 'right';
        rightHotspot.setAlpha(0);
        var rightArrow = new DvtImage(this.getCtx(), this._resources['scrollRight'], arrowRightX, arrowY, DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT, 'rhs_arr');
        rightArrow.hotspot = 'right';

        rightHotspot.addChild(rightArrow);
        scrollHotspots.addChild(leftHotspot);
        this._scrollHotspots.push(leftHotspot);
        scrollHotspots.addChild(rightHotspot);
        this._scrollHotspots.push(rightHotspot);
      }

      if (series._maxHeight > this._seriesHeight)
      {
        var hotspotX = this._startX + (this._canvasWidth - DvtTimeline.DEFAULT_HOTSPOT_WIDTH) / 2;
        var topY = this._startY + (i * (this._seriesHeight + this.getTimeAxisHeight())) + DvtTimeline.DEFAULT_HOTSPOT_PADDING;
        var bottomY = this._startY + ((i + 1) * this._seriesHeight) + (i * this.getTimeAxisHeight()) - DvtTimeline.DEFAULT_HOTSPOT_WIDTH - DvtTimeline.DEFAULT_HOTSPOT_PADDING;
        var arrowX = hotspotX + DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH / 2;
        var arrowTopY = topY + DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT / 2;
        var arrowBottomY = bottomY + DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT / 2;

        var topHotspot = new DvtRect(this.getCtx(), hotspotX, topY, DvtTimeline.DEFAULT_HOTSPOT_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_HEIGHT, 'ths');
        topHotspot.setFill(new DvtSolidFill(DvtTimeline.DEFAULT_HOTSPOT_BACKGROUND_COLOR, 1));
        topHotspot.setCornerRadius(DvtTimeline.DEFAULT_HOTSPOT_BORDER_RADIUS);
        topHotspot.hotspot = 'top';
        topHotspot.setAlpha(0);
        var upArrow = new DvtImage(this.getCtx(), this._resources['scrollUp'], arrowX, arrowTopY, DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT, 'ths_arr');
        upArrow.hotspot = 'top';
        topHotspot.addChild(upArrow);
        var bottomHotspot = new DvtRect(this.getCtx(), hotspotX, bottomY, DvtTimeline.DEFAULT_HOTSPOT_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_HEIGHT, 'bhs');
        bottomHotspot.setFill(new DvtSolidFill(DvtTimeline.DEFAULT_HOTSPOT_BACKGROUND_COLOR, 1));
        bottomHotspot.setCornerRadius(DvtTimeline.DEFAULT_HOTSPOT_BORDER_RADIUS);
        bottomHotspot.hotspot = 'bottom';
        bottomHotspot.setAlpha(0);
        var downArrow = new DvtImage(this.getCtx(), this._resources['scrollDown'], arrowX, arrowBottomY, DvtTimeline.DEFAULT_HOTSPOT_ARROW_WIDTH, DvtTimeline.DEFAULT_HOTSPOT_ARROW_HEIGHT, 'bhs_arr');
        downArrow.hotspot = 'bottom';

        bottomHotspot.addChild(downArrow);
        scrollHotspots.addChild(topHotspot);
        this._scrollHotspots.push(topHotspot);
        scrollHotspots.addChild(bottomHotspot);
        this._scrollHotspots.push(bottomHotspot);
      }
    }
  }
};

DvtTimeline.prototype.showThenHideHotspots = function(series) 
{
  var hotSpotsLength = this._scrollHotspots.length;
  if (hotSpotsLength != 0)
  {
    var animator = new DvtAnimator(this.getCtx(), 0.5, 0, DvtEasing.linear);
    for (var i = 0; i < hotSpotsLength; i++)
    {
      var hotspot = this._scrollHotspots[i];
      var show = true;
      if (series != null)
      {
        var id = hotspot.getParent().getId();
        if (series != id.substring(id.length - 1))
          show = false;
      }
      if (show)
        animator.addProp(DvtAnimator.TYPE_NUMBER, hotspot, hotspot.getAlpha, hotspot.setAlpha, DvtTimeline.DEFAULT_HOTSPOT_OPACITY);
    }
    DvtPlayable.appendOnEnd(animator, this.hideHotspots, this);
    animator.play();
  }
};

DvtTimeline.prototype.hideHotspots = function()
{
  var hotSpotsLength = this._scrollHotspots.length;
  if (hotSpotsLength != 0)
  {
    var animator = new DvtAnimator(this.getCtx(), 0.5, 0, DvtEasing.linear);
    for (var i = 0; i < hotSpotsLength; i++)
    {
      var hotspot = this._scrollHotspots[i];
      animator.addProp(DvtAnimator.TYPE_NUMBER, hotspot, hotspot.getAlpha, hotspot.setAlpha, 0);
    }
    animator.play();
  }
};


/**
 * Combines style defaults with the styles provided
 *
 */
DvtTimeline.prototype.applyStyleValues = function()
{
  this._style = new DvtCSSStyle(DvtTimeline.DEFAULT_TIMELINE_STYLE);
  DvtTimeline.superclass.applyStyleValues.call(this);

  var borderLeftWidth = this._style.getBorderSideWidth('border-left-width');
  var borderTopWidth = this._style.getBorderSideWidth('border-top-width');
  var borderRightWidth = this._style.getBorderSideWidth('border-right-width');
  var borderBottomWidth = this._style.getBorderSideWidth('border-bottom-width');

  this._startX = borderLeftWidth;
  this._startY = borderTopWidth;

  this._backgroundWidth = this._compWidth - (borderLeftWidth + borderRightWidth) / 2;
  this._backgroundHeight = this._compHeight - (borderTopWidth + borderBottomWidth) / 2;

  // The size of the canvas viewport
  this._canvasWidth = this._backgroundWidth - (borderLeftWidth + borderRightWidth) / 2;
  this._canvasHeight = this._backgroundHeight - (borderTopWidth + borderBottomWidth) / 2;
};


/**
 * Combines style defaults with the styles provided
 *
 */
DvtTimeline.prototype.applyAxisStyleValues = function()
{
  if (this._axisStyleDefaults)
  {
    var axisStyles = '';
    var style = this._axisStyleDefaults['backgroundColor'];
    if (style)
      axisStyles = axisStyles + 'background-color:' + style + ';';
    style = this._axisStyleDefaults['borderColor'];
    if (style)
      axisStyles = axisStyles + 'border-color:' + style + ';';
    style = this._axisStyleDefaults['borderWidth'];
    if (style)
      axisStyles = axisStyles + 'border-width:' + style + ';';
    this._axisStyle.parseInlineStyle(axisStyles);
  }
  this._axisStyle.parseInlineStyle(this._axisInlineStyle);

  this._timeAxis.setBorderTopWidth(this._axisStyle.getBorderSideWidth('border-top-width'));
  this._timeAxis.setBorderBottomWidth(this._axisStyle.getBorderSideWidth('border-bottom-width'));

  var borderLeftWidth = this._axisStyle.getBorderSideWidth('border-left-width');
  var borderRightWidth = this._axisStyle.getBorderSideWidth('border-right-width');
  this._axisWidth = this._contentWidth + (borderLeftWidth + borderRightWidth) / 2;

  this._axisStartX = -borderLeftWidth / 2;
};


/**
 * Renders the background of the timeline.
 * @protected
 */
DvtTimeline.prototype.createBackground = function()
{
  this._background = new DvtRect(this.getCtx(), this._startX / 2, this._startY / 2, this._backgroundWidth, this._backgroundHeight, 'bg');
  this._background.setCSSStyle(this._style);
  this._background.setPixelHinting(true);
  if (this._shortDesc)
    this._background.setAriaProperty('label', this._shortDesc);

  this.addChild(this._background);
};


/**
 * Creates the inner canvas of the timeline.
 * @protected
 */
DvtTimeline.prototype.setupInnerCanvas = function()
{
  var cp = new DvtClipPath();
  cp.addRect(this._startX, this._startY, this._canvasWidth, this._canvasHeight);
  this._canvas.setClipPath(cp);

  this._innerCanvas = new DvtContainer(this.getCtx(), 'iCanvas');
  this._innerCanvas.setTranslateX(this._startX);
  this._innerCanvas.setTranslateY(this._startY);
  this._canvas.addChild(this._innerCanvas);
};

DvtTimeline.prototype.prepareTimeAxis = function(startDate, endDate)
{
  var context = this.getCtx();
  var axisLabelStyle = new DvtCSSStyle(DvtTimeline.DEFAULT_AXIS_LABEL_STYLE);
  if (this._axisStyleDefaults)
    axisLabelStyle.parseInlineStyle(this._axisStyleDefaults['labelStyle']);

  var axis = new DvtRect(context, 0, 0, 0, 0, 'tempAxis');
  var minW = Infinity;
  var maxH = 0;

  this._dates = [];
  this._labels = [];
  var currentDate = this._timeAxis.adjustDate(startDate).getTime();
  this._dates.push(currentDate);
  while (currentDate < endDate)
  {
    var labelText = this._timeAxis.formatDate(this._timeAxis.adjustDate(currentDate));
    var label = new DvtOutputText(context, labelText, 0, 0, 's_label' + currentDate);
    label.setCSSStyle(axisLabelStyle);
    // save the time associated with the element for dynamic resize
    label.time = currentDate;
    this._labels.push(label);
    var nextDate = this._timeAxis.getNextDate(this._timeAxis.adjustDate(currentDate)).getTime();

    // update maximum label width and height
    axis.addChild(label);
    var dim = label.getDimensions();
    axis.removeChild(label);
    var labelWidth = Math.max(DvtTimeComponentAxis.DEFAULT_INTERVAL_WIDTH, (dim.w + DvtTimeComponentAxis.DEFAULT_INTERVAL_PADDING * 2));
    var widthFactor = (nextDate - currentDate) / labelWidth;
    if (widthFactor < minW)
      minW = widthFactor;
    if (dim.h > maxH)
      maxH = dim.h;

    // the last currentDate added in this loop is outside of the time range, but is needed
    // for the last 'next' date when actually creating the time axis in renderTimeAxis
    currentDate = nextDate;
    this._dates.push(currentDate);
  }
  this._timeAxis.setContentHeight(maxH + DvtTimeComponentAxis.DEFAULT_INTERVAL_PADDING * 2);
  this.setContainerWidth((endDate - startDate) / minW);
};

DvtTimeline.prototype._populateSeries = function()
{
  // clear the series holder
  this._series = [];
  this._seriesOptions = [];

  var series = this._options['series'];
  if (series)
  {
    var seriesCount = Math.min(series.length, 2);
    for (var i = 0; i < seriesCount; i++)
    {
      var seriesOptions = series[i];
      seriesOptions.startTime = this._start;
      seriesOptions.endTime = this._end;
      seriesOptions.inverted = this._defaultInversions[i];
      if (this._options['axis'])
        seriesOptions.scale = this._options['axis']['scale'];

      // Series Time Axis only specified on first series
      if (series[0]['axis'])
      {
        seriesOptions.seriesScale = series[0]['axis']['scale'];
        if (i == 0)
          seriesOptions.converter = seriesOptions['axis']['converter'];
      }
      if (this._options['styleDefaults'])
      {
        seriesOptions.styleDefaults = this._seriesStyleDefaults;
        seriesOptions.itemStyleDefaults = this._itemStyleDefaults;
      }
      this._seriesOptions.push(seriesOptions);

      var s = new DvtTimelineSeries(this.getCtx(), this.HandleEvent, this);
      this._series.push(s);
    }
  }
};

DvtTimeline.prototype.renderAxis = function()
{
  var seriesCount = this._series.length;
  if (this._axis == null)
  {
    var axisPosHeight = this._timeAxis.getPosHeight();
    var axisTop = seriesCount == 1 ? (this._canvasHeight - axisPosHeight) : (this._canvasHeight / seriesCount - (axisPosHeight / 2));

    this._axis = new DvtRect(this.getCtx(), this._axisStartX, axisTop, this._axisWidth, axisPosHeight, 'axis');
    this._axis.setCSSStyle(this._axisStyle);
    this._axis.setPixelHinting(true);
    this._innerCanvas.addChild(this._axis);
  }

  this.createSeriesTicks(this._contentWidth, seriesCount);
};

DvtTimeline.prototype.createSeriesTicks = function(width, seriesCount)
{
  // remove all existing ticks and labels
  this._axis.removeChildren();

  var separatorStyle = new DvtCSSStyle(DvtTimeline.DEFAULT_AXIS_SEPARATOR_STYLE);
  var seriesAxisLabelStyle = new DvtCSSStyle(DvtTimeline.DEFAULT_SERIES_AXIS_LABEL_STYLE);
  if (this._axisStyleDefaults)
  {
    var separatorColor = this._axisStyleDefaults['separatorColor'];
    if (separatorColor)
      separatorStyle.parseInlineStyle('color:' + separatorColor + ';');
    if (this._seriesStyleDefaults)
      seriesAxisLabelStyle.parseInlineStyle(this._seriesStyleDefaults['axisLabelStyle']);
  }
  var separatorStroke = new DvtSolidStroke(separatorStyle.getStyle(DvtCSSStyle.COLOR));

  var axisHeight = this._timeAxis.getContentHeight();
  var axisTop = seriesCount == 1 ? (this._canvasHeight - axisHeight) : (this._canvasHeight / seriesCount - (axisHeight / 2));
  var axisBottom = (axisTop + axisHeight);
  this.renderTimeAxis(this._fetchStartPos, this._fetchEndPos, this._axis, width, axisBottom, axisTop, axisTop, separatorStroke);
  if (this._seriesScale)
    this.renderSeriesTimeAxis(this._fetchStartPos, this._fetchEndPos, this._innerCanvas, 'o_', width, seriesAxisLabelStyle);
};

// virtualization
// render time axis for a given range
DvtTimeline.prototype.renderTimeAxis = function(startPos, endPos, container, width, height, ticky, labely, stroke)
{
  var block = new DvtContainer(this.getCtx(), 'block_' + startPos + '_' + endPos);
  block.startPos = startPos;
  block.endPos = endPos;
  container.addChild(block);

  // the last date in this._dates is past the end time, and only used as the last 'next' date
  for (var i = 0; i < this._dates.length - 1; i++)
  {
    var date = this._dates[i];
    var next = this._dates[i + 1];

    var currentPos = DvtTimeUtils.getDatePosition(this._start, this._end, date, width);
    var nextPos = DvtTimeUtils.getDatePosition(this._start, this._end, next, width);
    var maxWidth = nextPos - currentPos;

    if (currentPos != 0)
    {
      var tickElem = this.addTick(block, currentPos, height, ticky, stroke, 's_tick' + date);
      // save the time associated with the element for dynamic resize
      tickElem.time = date;
    }
    this.addAxisLabel(block, this._labels[i], currentPos + ((nextPos - currentPos) / 2), labely + 2, maxWidth);
  }
};

DvtTimeline.prototype.renderSeriesTimeAxis = function(startPos, endPos, container, prefix, width, labelStyle)
{
  var size = width;
  var start = this._start;
  var end = this._end;

  var startDate = DvtTimeUtils.getPositionDate(start, end, startPos, size);
  var adjustedStartDate = this._seriesTimeAxis.adjustDate(startDate);

  var current = new Date(startDate);
  var currentPos = DvtTimeUtils.getDatePosition(start, end, adjustedStartDate, size);
  while (currentPos < endPos)
  {
    var label = this._seriesTimeAxis.formatDate(this._seriesTimeAxis.adjustDate(current));
    var next = this._seriesTimeAxis.getNextDate(this._seriesTimeAxis.adjustDate(current));

    var next_time_pos = DvtTimeUtils.getDatePosition(start, end, next, size);
    var maxWidth = next_time_pos - currentPos;

    var time_pos = currentPos;
    if (this.isRTL())
      time_pos = size - time_pos;

    var labelElem = this.addLabel(container, time_pos + 5, label, maxWidth, this._seriesHeight - 2, labelStyle, prefix + 'label' + currentPos + '_s0', true, DvtTimeline.DEFAULT_SERIES_AXIS_LABEL_PADDING);
    labelElem.time = current.getTime();

    container.lastDate = current;
    container.lastDatePos = currentPos;

    current = next;
    currentPos = next_time_pos;
  }
};

DvtTimeline.prototype.renderSeries = function()
{
  if (this._series)
  {
    var seriesCount = this._series.length;
    this._seriesHeight = (this._canvasHeight - this.getTimeAxisHeight() + 1) / seriesCount;
    for (var i = 0; i < seriesCount; i++)
    {
      var posMatrix = new DvtMatrix(1, 0, 0, 1, 0, i * (this._seriesHeight + this.getTimeAxisHeight()));
      var series = this._series[i];

      // setup overflow controls
      var cp = new DvtClipPath();
      cp.addRect(0, i * (this._seriesHeight + this.getTimeAxisHeight()), this._contentWidth, this._seriesHeight);
      series.setClipPath(cp);

      series.setMatrix(posMatrix);
      this._innerCanvas.addChild(series);
      series.render(this._contentWidth, this._seriesHeight, this._seriesOptions[i]);
    }
  }
};

DvtTimeline.prototype.renderSeriesLabels = function()
{
  if (this._series)
  {
    var seriesCount = this._series.length;
    for (var i = 0; i < seriesCount; i++)
    {
      var series = this._series[i];
      var seriesLabel = series.getLabel();
      if (seriesLabel != null)
      {
        var seriesLabelStyle = series.getLabelStyle();
        var seriesLabelElem = new DvtOutputText(this.getCtx(), seriesLabel, 0, 0, 'sl_s' + i);
        seriesLabelElem.setCSSStyle(seriesLabelStyle);

        this.addChild(seriesLabelElem);
        var dim = seriesLabelElem.getDimensions();
        this.removeChild(seriesLabelElem);

        var backgroundRect = new DvtRect(this.getCtx(), 0, 0, dim.w + DvtTimelineSeries.DEFAULT_LABEL_PADDING * 2, dim.h + DvtTimelineSeries.DEFAULT_LABEL_PADDING * 2, 'slb_s' + i);
        backgroundRect.setCSSStyle(seriesLabelStyle);
        backgroundRect.setCornerRadius(3);

        var posX = this._startX + 20;
        var posY = i * (this._canvasHeight - dim.h - 40) + 20 + this._startY;
        var posMatrix = new DvtMatrix(1, 0, 0, 1, posX, posY);
        seriesLabelElem.setMatrix(posMatrix);
        posMatrix = new DvtMatrix(1, 0, 0, 1, posX - DvtTimelineSeries.DEFAULT_LABEL_PADDING, posY - DvtTimelineSeries.DEFAULT_LABEL_PADDING);
        backgroundRect.setMatrix(posMatrix);

        this.addChild(backgroundRect);
        this.addChild(seriesLabelElem);
      }
      if (series._isEmpty)
      {
        var seriesEmptyText = series.getEmptyText();
        if (seriesEmptyText != null)
        {
          var seriesEmptyTextStyle = series.getEmptyTextStyle();
          var seriesEmptyTextElem = new DvtOutputText(this.getCtx(), seriesEmptyText, 0, 0, 'et_s' + i);
          seriesEmptyTextElem.setCSSStyle(seriesEmptyTextStyle);

          this.addChild(seriesEmptyTextElem);
          var dim = seriesEmptyTextElem.getDimensions();
          this.removeChild(seriesEmptyTextElem);

          var posMatrix = new DvtMatrix(1, 0, 0, 1, (this._canvasWidth - dim.w) / 2 + this._startX, i * (this._seriesHeight + this.getTimeAxisHeight()) + ((this._seriesHeight - dim.h) / 2) + this._startY);
          seriesEmptyTextElem.setMatrix(posMatrix);

          this.addChild(seriesEmptyTextElem);
        }
      }
    }
  }
};

DvtTimeline.prototype.HandleTouchStart = function(event)
{
  var touches = event.getNativeEvent().touches;
  // make sure this is a single touch and not a multi touch
  if (touches && touches.length == 1)
  {
    this._dragPanSeries = this._findSeries(event.target);
    if (this._dragPanSeries)
    {
      if (this._series[0] == this._dragPanSeries)
        var series = 0;
      else
        series = 1;
    }
    this.showThenHideHotspots(series);
    this.beginDragPan(touches[0].pageX, touches[0].pageY);
  }
  else if (touches && touches.length > 1)
  {
    this._isDragPan = false;
    this._isActive = false;
    this._dragPanSeries = null;
  }
};

DvtTimeline.prototype.HandleMouseDown = function(event)
{
  this._dragPanSeries = this._findSeries(event.target);
  if (this._dragPanSeries)
  {
    if (this._series[0] == this._dragPanSeries)
      var series = 0;
    else
      series = 1;
  }
  this.showThenHideHotspots(series);
  this.beginDragPan(event.pageX, event.pageY);
};

DvtTimeline.prototype.beginDragPan = function(pageX, pageY)
{
  this._isActive = true;
  this._currentX = pageX;
  this._currentY = pageY;
};

DvtTimeline.prototype.HandleTouchEnd = function(event)
{
  if (this._isDragPan)
    this.endDragPan(event);
  else
    this.handleShapeClick(event);
};

DvtTimeline.prototype.HandleMouseUp = function(event)
{
  this._isActive = false;
  if (this._isDragPan)
    this.endDragPan(event);
  else
    this.handleShapeClick(event);
};

DvtTimeline.prototype.endDragPan = function(event)
{
  this._isDragPan = false;
  this._isActive = false;
};

DvtTimeline.prototype.HandleTouchMove = function(event)
{
  var touchEvent = event.getNativeEvent();
  touchEvent.preventDefault();
  var touches = touchEvent.touches;
  // make sure this is a single touch and not a multi touch
  if (touches && touches.length == 1)
    this.contDragPan(touches[0].pageX, touches[0].pageY);
};

DvtTimeline.prototype.HandleMouseMove = function(event)
{
  this.contDragPan(event.pageX, event.pageY);
};

DvtTimeline.prototype.contDragPan = function(pageX, pageY)
{
  if (this._isDragPan)
  {
    var deltaX = this._currentX - pageX;
    var deltaY = this._currentY - pageY;
    this._currentX = pageX;
    this._currentY = pageY;

    var newTranslateX = this._innerCanvas.getTranslateX() - deltaX;
    var minTranslateX = -(this._contentWidth - this._canvasWidth - this._startX);
    var maxTranslateX = this._startX;

    if (newTranslateX < minTranslateX)
      newTranslateX = minTranslateX;
    else if (newTranslateX > maxTranslateX)
      newTranslateX = maxTranslateX;
    this._innerCanvas.setTranslateX(newTranslateX);

    if (this._dragPanSeries)
    {
      var newTranslateY = this._dragPanSeries.getTranslateY() - deltaY;
      if (this._dragPanSeries._isInverted)
      {
        var minTranslateY = this.getTimeAxisHeight() + (2 * this._dragPanSeries.Height) - this._dragPanSeries._maxHeight;
        var maxTranslateY = this._dragPanSeries.Height + this.getTimeAxisHeight();
      }
      else
      {
        var minTranslateY = 0;
        var maxTranslateY = this._dragPanSeries._maxHeight - this._dragPanSeries.Height;
      }

      if (newTranslateY < minTranslateY)
        newTranslateY = minTranslateY;
      else if (newTranslateY > maxTranslateY)
        newTranslateY = maxTranslateY;
      this._dragPanSeries.setTranslateY(newTranslateY);
    }
  }
  else if (this._isActive)
  {
    this._isDragPan = true;
  }
};

// event callback method
DvtTimeline.prototype.HandleEvent = function(event, component)
{
  var type = event.getType();

  // check for selection event, and handle accordingly
  if (type == 'selection' || type == 'dvtAct')
  {
    DvtEventDispatcher.dispatchEvent(this._callback, this._callbackObj, this, event);
  }
};

DvtTimeline.prototype.handleShapeClick = function(event)
{
  if (event)
  {
    var drawable = this._findDrawable(event.target);
    if (this._selectionMode == 'single')
    {
      if (drawable)
      {
        var series = this._findSeries(drawable);
        for (var i = 0; i < this._series.length; i++)
        {
          var s = this._series[i];
          if (s == series)
            s.HandleItemClick(drawable._node, false);
          else
            s.removeAllSelectedItems();
        }
      }
      else
      {
        for (var i = 0; i < this._series.length; i++)
        {
          this._series[i].removeAllSelectedItems();
        }
      }
    }
    if (drawable)
    {
      // action event support
      series = this._findSeries(drawable);
      series.HandleItemAction(drawable._node);
    }
  }
};

DvtTimeline.prototype.applyInitialSelections = function()
{
  if (this._selectionMode == 'single')
  {
    for (var i = 0; i < this._series.length; i++)
    {
      var s = this._series[i];
      if (s._initialSelection && s._initialSelection.length > 0)
      {
        var selectedItemId = s._initialSelection[0];
        for (var j = 0; j < s._items.length; j++)
        {
          if (s._items[j].getId() == selectedItemId)
            s.HandleItemClick(s._items[j], false);
        }
        break;
      }
    }
  }
};

DvtTimeline.prototype._findSeries = function(target)
{
  if (target && target != this)
  {
    var id = target.getId();
    if (id && id.substr(0, 6) == 'series')
      return target;
    if (id && id.substring(id.length - 3, id.length) == '_s0')
      return this._series[0];
    else if (id && id.substring(id.length - 3, id.length) == '_s1')
      return this._series[1];
    else
      return this._findSeries(target.getParent());
  }
  return null;
};

DvtTimeline.prototype._findDrawable = function(target)
{
  if (target)
  {
    var id = target.getId();
    if (id && id.substr(0, 10) == '_duration_' && target._node)
      return target;

    var parent = target.getParent();
    if (parent)
    {
      if (id && id.substr(0, 8) == '_bubble_' && parent._node)
        return parent;

      var grandParent = parent.getParent();
      if (grandParent)
      {
        id = grandParent.getId();
        if (id && id.substr(0, 8) == '_bubble_' && grandParent.getParent())
          return grandParent.getParent();
      }
    }
  }
  return null;
};
/**
 * Timeline JSON Parser
 * @param {DvtTimeline} timeline The owning DvtTimeline component.
 * @class
 * @constructor
 * @extends {DvtObj}
 */
var DvtTimelineParser = function(timeline) {
  this.Init(timeline);
};

DvtObj.createSubclass(DvtTimelineParser, DvtTimeComponentParser, 'DvtTimelineParser');


/**
 * Parses the specified XML String and returns the root node of the timeline
 * @param {string} options The String containing XML describing the component.
 * @return {object} An object containing the parsed properties
 */
DvtTimelineParser.prototype.parse = function(options)
{
  this._itemSelection = options['itemSelection'];

  var ret = DvtTimelineParser.superclass.parse.call(this, options);
  ret.scale = options.axis['scale'];
  var seriesAxis = options.series[0]['axis'];
  if (seriesAxis)
  {
    ret.seriesScale = seriesAxis['scale'];
    ret.seriesConverter = seriesAxis['converter'];
  }
  ret.converter = options.axis['converter'];
  ret.axisStyle = options.axis['style'];
  ret.shortDesc = options['shortDesc'];

  return ret;
};


/**
 * Parses the attributes on the root node.
 * @return {object} An object containing the parsed properties
 * @protected
 */
DvtTimelineParser.prototype.ParseRootAttributes = function() 
{
  var ret = DvtTimelineParser.superclass.ParseRootAttributes.call(this);

  ret.start = this._startTime.getTime();
  ret.end = this._endTime.getTime();
  ret.selectionMode = 'none';
  if (this._itemSelection != null)
    ret.selectionMode = this._itemSelection;

  return ret;
};
/**
 * TimelineSeries component.
 * @param {DvtContext} context The rendering context.
 * @param {object} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The object context for the callback function
 * @class TimelineSeries component.
 * @constructor
 * @extends {DvtContainer}
 */
var DvtTimelineSeries = function(context, callback, callbackObj)
{
  this.Init(context, callback, callbackObj);
};

DvtObj.createSubclass(DvtTimelineSeries, DvtTimeComponent, 'DvtTimelineSeries');

DvtTimelineSeries.DEFAULT_BUBBLE_OFFSET = 20;
DvtTimelineSeries.DEFAULT_BUBBLE_SPACING = 15;
DvtTimelineSeries.DEFAULT_DURATION_FEELER_OFFSET = 10;

// state
DvtTimelineSeries.ENABLED_STATE_KEY = 'en';
DvtTimelineSeries.SELECTED_STATE_KEY = 'sel';

DvtTimelineSeries.FEELER_WIDTH_KEY = 'fw';
DvtTimelineSeries.FEELER_COLOR_KEY = 'fc';

// style
DvtTimelineSeries.DEFAULT_STYLE = 'background-color:#f9f9f9;';
DvtTimelineSeries.DEFAULT_LABEL_STYLE = 'background-color:rgba(249,249,249,0.8);color:#252525;white-space:nowrap;font-size:13px;font-weight:bold;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';
DvtTimelineSeries.DEFAULT_LABEL_PADDING = 2;
DvtTimelineSeries.DEFAULT_EMPTY_TEXT_STYLE = 'color:#333333;white-space:nowrap;font-size:12px;font-weight:normal;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';
DvtTimelineSeries.DEFAULT_SERIES_AXIS_SEPARATOR_STYLE = 'color:#bcc7d2';

DvtTimelineSeries.DEFAULT_ITEM_ENABLED_STYLE = 'background-color:#ffffff;border:1px #648baf';
DvtTimelineSeries.DEFAULT_ITEM_SELECTED_STYLE = 'background-color:#ffffff;border:2px #333333';

DvtTimelineSeries.DEFAULT_ITEM_TITLE_STYLE = 'color:#000000;white-space:nowrap;font-size:12px;font-weight:bold;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';
DvtTimelineSeries.DEFAULT_ITEM_DESCRIPTION_STYLE = 'color:#084B8A;white-space:nowrap;font-size:12px;font-family:Helvetica Neue, Helvetica, Arial, sans-serif;';

DvtTimelineSeries.DEFAULT_FEELER_ENABLED_WIDTH = '1';
DvtTimelineSeries.DEFAULT_FEELER_SELECTED_WIDTH = '2';
DvtTimelineSeries.DEFAULT_FEELER_ENABLED_COLOR = '#648baf';
DvtTimelineSeries.DEFAULT_FEELER_SELECTED_COLOR = '#333333';

DvtTimelineSeries.DEFAULT_EMPTY_TEXT = 'No data to display.';
DvtTimelineSeries.DEFAULT_COLORS_ARRAY = ['#267DB3', '#68C182', '#FAD55C', '#ED6647',
                                          '#8561C8', '#6DDBDB', '#FFB54D', '#E371B2',
                                          '#47BDEF', '#A2BF39', '#A75DBA', '#F7F37B'];


/**
 * Initializes the view.
 * @param {DvtContext} context The rendering context.
 * @param {object} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The object context for the callback function
 * @protected
 */
DvtTimelineSeries.prototype.Init = function(context, callback, callbackObj)
{
  DvtTimelineSeries.superclass.Init.call(this, context, callback, callbackObj);
  this.setId('series' + 1000 + Math.floor(Math.random() * 1000000000));

  this._blocks = [];

  this._itemListeners = [];
};


/**
 * Reset animator queue
 */
DvtTimelineSeries.prototype.resetAnimators = function()
{
  if (this._animatorQueue != null)
  {
    for (var i = 0; i < this._animatorQueue.length; i++)
      this._animatorQueue[i].stop(true);
  }

  if (this._animationTimer != null)
    this._animationTimer.stop();

  delete this._animatorQueue;
  delete this._animationTimer;
};

DvtTimelineSeries.prototype.addAnimator = function(animator)
{
  if (this._animatorQueue == null)
    this._animatorQueue = [];

  this._animatorQueue.push(animator);
};

DvtTimelineSeries.prototype.startAnimations = function()
{
  if (this._animatorQueue != null && this._animatorQueue.length > 0)
  {
    var current = this._animatorQueue.shift();
    current.play();

    if (this._animationTimer == null)
    {
      var speed = 2500 / this._animatorQueue.length / 2;
      this._animationTimer = new DvtTimer(this.getCtx(), speed, this.startAnimations, this);
      this._animationTimer.start();
    }
  }
  else
  {
    if (this._animationTimer != null)
      this._animationTimer.stop();
  }
};


/**
 * Renders the component using the specified xml.  If no xml is supplied to a component
 * that has already been rendered, this function will rerender the component with the
 * specified size.
 * @param {string} data The json string.
 * @param {number} width The width of the component.
 * @param {number} height The height of the component.
 */
DvtTimelineSeries.prototype.render = function(width, height, options)
{
  this._style = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_STYLE);
  DvtTimelineSeries.superclass.render.call(this, width, height, options);

  this._maxHeight = height;
  this._isInverted = options.inverted;
  this._colorCount = 0;
  this._maxDurationY = 1;

  this._styleDefaults = options.styleDefaults;
  this._itemStyleDefaults = options.itemStyleDefaults;
  this._colors = DvtTimelineSeries.DEFAULT_COLORS_ARRAY;
  this._labelStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_LABEL_STYLE);
  this._emptyTextStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_EMPTY_TEXT_STYLE);

  if (this._styleDefaults)
  {
    var style = this._styleDefaults['backgroundColor'];
    if (style)
      this._style.parseInlineStyle('background-color:' + style + ';');
    style = this._styleDefaults['colors'];
    if (style)
      this._colors = style;
    style = this._styleDefaults['labelStyle'];
    if (style)
      this._labelStyle.parseInlineStyle(style);
    style = this._styleDefaults['emptyTextStyle'];
    if (style)
      this._emptyTextStyle.parseInlineStyle(style);
  }

  this.createBackground(width, height);

  // series axis labels go behind the canvas
  if (this._seriesScale)
  {
    this._seriesTicks = new DvtContainer(this.getCtx(), 'seriesTicks');
    this.addChild(this._seriesTicks);
  }

  this.renderScrollableCanvas();

  // render markers
  this.parseDataXML();

  if (this._seriesScale)
    this.createSeriesTicks(width);
};

DvtTimelineSeries.prototype.createSeriesTicks = function(width)
{
  var axisSeparatorStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_SERIES_AXIS_SEPARATOR_STYLE);
  if (this._styleDefaults)
  {
    var axisSeparatorColor = this._styleDefaults['axisSeparatorColor'];
    if (axisSeparatorColor)
      axisSeparatorStyle.parseInlineStyle('color:' + axisSeparatorColor + ';');
  }
  var axisSeparatorStroke = new DvtSolidStroke(axisSeparatorStyle.getStyle(DvtCSSStyle.COLOR));
  axisSeparatorStroke.setStyle(DvtStroke.DASHED, 3);

  this.renderSeriesTimeAxis(this._fetchStartPos, this._fetchEndPos, this._seriesTicks, 'o_', width, axisSeparatorStroke);
};

DvtTimelineSeries.prototype.renderSeriesTimeAxis = function(startPos, endPos, container, prefix, width, stroke)
{
  container.removeChildren();

  var size = width;
  var start = this._start;
  var end = this._end;

  var startDate = DvtTimeUtils.getPositionDate(start, end, startPos, size);
  var adjustedStartDate = this._seriesTimeAxis.adjustDate(startDate);

  var current = new Date(startDate);
  var currentPos = DvtTimeUtils.getDatePosition(start, end, adjustedStartDate, size);
  while (currentPos < endPos)
  {
    var next = this._seriesTimeAxis.getNextDate(this._seriesTimeAxis.adjustDate(current));
    var next_time_pos = DvtTimeUtils.getDatePosition(start, end, next, size);

    var time_pos = currentPos;
    if (this.isRTL())
      time_pos = size - time_pos;

    if (this._isInverted)
    {
      var y1 = 0;
      var y2 = this._maxHeight;
    }
    else
    {
      y1 = this.Height - this._maxHeight;
      y2 = this.Height;
    }

    var tickElem = this.addTick(container, time_pos, y1, y2, stroke, prefix + 'tick' + currentPos);
    // save the time associated with the element for dynamic resize
    tickElem.time = current.getTime();

    container.lastDate = current;
    container.lastDatePos = currentPos;

    current = next;
    currentPos = next_time_pos;
  }
};


/**
 * Renders the background of the series.
 * @param {int} width The width of the component.
 * @param {int} height The height of the component.
 * @protected
 */
DvtTimelineSeries.prototype.createBackground = function(width, height)
{
  this._background = new DvtRect(this.getCtx(), 0, 0, width, height, 'bg');
  this._background.setCSSStyle(this._style);
  this._background.setPixelHinting(true);

  this.addChild(this._background);
};


/**
 * Parses the xml String describing the component.
 * @param {object} options The xml string.
 * @protected
 */
DvtTimelineSeries.prototype.Parse = function(options)
{
  this._parser = new DvtTimelineSeriesParser(this);
  return this._parser.parse(options);
};


/**
 * Applies the parsed properties to this component.
 * @param {object} props An object containing the parsed properties for this component.
 * @private
 */
DvtTimelineSeries.prototype._applyParsedProperties = function(props)
{
  DvtTimelineSeries.superclass._applyParsedProperties.call(this, props);
  if (this._seriesScale)
  {
    this._seriesTimeAxis = new DvtTimeComponentAxis(this.getCtx());
    this._seriesTimeAxis.setScale(this._seriesScale);
    this._seriesTimeAxis.setConverter(this._converter);
    this._seriesTimeAxis.setType(DvtTimeComponentAxisFormatter.LONG);
  }

  this._items = props.items;
  if (this._items && this._items.length > 0)
    this._isEmpty = false;
  else
    this._isEmpty = true;

  this._initialSelection = props.initialSelection;
  this._defaultStyles = props.defaultStyles;
  this._itemTitleStyle = props.itemTitleStyle;
  this._itemDescriptionStyle = props.itemDescriptionStyle;

  this._label = props.label;
  this._emptyText = props.emptyText;
  if (this._emptyText == null)
    this._emptyText = DvtTimelineSeries.DEFAULT_EMPTY_TEXT;
};


/**
 * Renders the series items.
 * @protected
 */
DvtTimelineSeries.prototype.renderItems = function(startPos, endPos, animate)
{
  // TODO: the feeler would actually need to be render in a completely separately container
  // than the block containing the items
  var block = new DvtContainer(this.getCtx(), 'itemBlock_' + startPos + '_' + endPos);
  block.startPos = startPos;
  block.endPos = endPos;

  this.prepareDurations(this._items);
  this._initialY = 20 + DvtTimelineSeries.DEFAULT_BUBBLE_SPACING + 10 * this._maxDurationY;

  for (var j = 0; j < this._items.length; j++)
  {
    var item = this._items[j];
    var x = DvtTimeUtils.getDatePosition(this._start, this._end, item.getStartTime(), this.Width);
    if (x < startPos || x > endPos)
    {
      continue;
    }
    this.addItem(block, block.feelers, block.durations, item, animate);
  }
  this.renderDurations(block.durations);

  this._canvas.addChild(block);
  this._blocks.push(block);
};


/**
 * Renders the duration bars.
 * @param {object} durationBlock The block holding the duration bars.
 * @protected
 */
DvtTimelineSeries.prototype.renderDurations = function(durationBlock)
{
  var context = this.getCtx();
  for (var i = this._maxDurationY; i > 0; i--)
  {
    for (var j = 0; j < this._items.length; j++)
    {
      var node = this._items[j];
      if (node.getEndTime() != null && i == node.getDurationLevel())
      {
        var x = DvtTimeUtils.getDatePosition(this._start, this._end, node.getStartTime(), this.Width);
        var durationId = '_duration_' + node.getId();
        var durationY = 22 + 10 * node.getDurationLevel();
        var x2 = DvtTimeUtils.getDatePosition(this._start, this._end, node.getEndTime(), this.Width);
        if (!this._isInverted)
          var duration = new DvtRect(context, x, this.Height - durationY + 5, x2 - x, durationY, durationId);
        else
          duration = new DvtRect(context, x, -5, x2 - x, durationY, durationId);
        duration.setCornerRadius(5);
        duration.setFill(new DvtSolidFill(node.getDurationFillColor()));

        var feelerWidth = this.getStyle(DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_WIDTH_KEY);
        var feelerColor = this.getStyle(DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_COLOR_KEY);
        var feelerStroke = new DvtSolidStroke(feelerColor, 1, parseInt(feelerWidth));
        duration.setStroke(feelerStroke);

        duration._node = node;
        durationBlock.addChild(duration);
        node.setDurationBar(duration);
        node.setDurationY(durationY - 5);
      }
    }
  }
};


/**
 * Begins the rendering flow.
 * @protected
 */
DvtTimelineSeries.prototype.parseDataXML = function()
{
  if (this._items == null)
    return;

  this.resetAnimators();

  this.renderItems(this._fetchStartPos, this._fetchEndPos);
  this.adjustFeelers();
  if (!this._isInverted)
  {
    this.adjustDurations();
    this.adjustItems();
  }
  this.adjustBackground();

  // start the wave animation
  this.startAnimations();
};


/**
 * Adjusts the background positioning if required.
 * @protected
 */
DvtTimelineSeries.prototype.adjustBackground = function()
{
  if (this._maxHeight > this.Height)
  {
    this._background.setHeight(this._maxHeight);
    if (!this._isInverted)
    {
      var heightDiff = this._maxHeight - this.Height;
      this._background.setTranslateY(this._background.getTranslateY() - heightDiff);
    }
  }
};


/**
 * Calculates the height value for the item given.
 * @protected
 */
DvtTimelineSeries.prototype.calculateY = function(item, index)
{
  if (this._items == null || this._items.length == 0)
    return;

  var x = item.getX();
  var y = item.getY();
  if (y == null)
    y = this._initialY;

  var maxHeight = this._maxHeight;

  var hOffset = DvtTimelineSeries.DEFAULT_BUBBLE_SPACING;
  for (var i = 0; i < index; i++)
  {
    var currItem = this._items[i];
    var currWidth = currItem.getWidth();
    var currHeight = currItem.getHeight();
    if (currItem.getX() != null && currItem != item)
    {
      var currx = currItem.getX();
      if (currx == null)
        currx = 0;

      var curry = currItem.getY();
      if (curry == null)
        curry = this._initialY;

      if (x >= currx && x <= currx + currWidth && y >= curry && y <= curry + currHeight)
      {
        y = curry + currHeight + hOffset;
        // y changed, do the loop again
        item.setY(y);

        // calculate again from start since y changed and we might have a conflict again
        y = this.calculateY(item, index);
      }
    }

    if (maxHeight < y + currHeight)
      maxHeight = y + currHeight;
  }

  if (maxHeight > this._maxHeight)
    this._maxHeight = maxHeight + DvtTimelineSeries.DEFAULT_BUBBLE_SPACING;

  return y;
};


/**
 * Calculates the duration height value for the item given.
 * @protected
 */
DvtTimelineSeries.prototype.calculateDurationY = function(item, index)
{
  if (this._items == null || this._items.length == 0)
    return;

  var initialY = 1;
  var endTime = item.getEndTime();
  if (endTime == null)
    return;

  var startTime = item.getStartTime();
  var y = item.getDurationLevel();
  if (y == null)
    y = initialY;

  for (var i = 0; i < index; i++)
  {
    var currItem = this._items[i];
    if (currItem != item)
    {
      var currEndTime = currItem.getEndTime();
      if (currEndTime == null)
        continue;

      var currStartTime = currItem.getStartTime();

      var curry = currItem.getDurationLevel();
      if (curry == null)
        curry = initialY;

      if (startTime >= currStartTime && startTime <= currEndTime && y == curry)
      {
        y = curry + 1;
        // y changed, do the loop again
        item.setDurationLevel(y);

        // calculate again from start since y changed and we might have a conflict again
        y = this.calculateDurationY(item, index);
      }
    }
  }
  if (y > this._maxDurationY)
    this._maxDurationY = y;
  return y;
};


/**
 * Prepares the duration bars for rendering.
 * @protected
 */
DvtTimelineSeries.prototype.prepareDurations = function(nodes)
{
  for (var i = 0; i < this._items.length; i++)
  {
    var node = this._items[i];
    if (node.getEndTime() != null)
    {
      node.setDurationLevel(this.calculateDurationY(node, this._items.length));
      if (node.getDurationFillColor() == null)
      {
        node.setDurationFillColor(this._colors[this._colorCount]);
        this._colorCount++;
        if (this._colorCount == this._colors.length)
          this._colorCount = 0;
      }
    }
  }
};


/**
 * Adds a timeline item to the series canvas
 */
DvtTimelineSeries.prototype.addItem = function(block, feelerBlock, durationBlock, node, animate)
{
  var context = this.getCtx();
  var nodeId = node.getId();

  // all the feelers goes to the beginning so that the bubbles always goes on top of them
  if (feelerBlock == null)
  {
    feelerBlock = new DvtContainer(context, 'feelers');
    block.addChild(feelerBlock);
    block.feelers = feelerBlock;
  }

  if (durationBlock == null)
  {
    durationBlock = new DvtContainer(context, 'durations');
    block.addChild(durationBlock);
    block.durations = durationBlock;
  }

  var x = DvtTimeUtils.getDatePosition(this._start, this._end, node.getStartTime(), this.Width);
  // offset position if a duration bar is rendered as well
  var endTime = node.getEndTime();
  if (endTime)
  {
    var width = DvtTimeUtils.getDatePosition(this._start, this._end, endTime, this.Width) - x;
    x = x + Math.min(DvtTimelineSeries.DEFAULT_DURATION_FEELER_OFFSET, width / 2);
  }
  node.setX(x);
  var y = this.calculateY(node, this._items.length);
  node.setY(y);

  var itemStyle = this.getStyle(DvtTimelineSeries.ENABLED_STATE_KEY);
  itemStyle.parseInlineStyle(node.getStyle());

  var marginTop = 5;
  var marginLeft = 5;
  var content = this.getItemContent(node, null);
  this.addChild(content);
  var dim = content.getDimensions();
  this.removeChild(content);

  // TODO: Review this later...
  node.setWidth(dim.w + marginLeft * 2);
  node.setHeight(dim.h + marginTop * 2);

  if (animate == undefined)
    animate = this.isAnimationEnabled();

  // draw the feeler
  var feelerId = '_feeler_' + nodeId;
  if (!this._isInverted)
  {
    var feelerY = this.Height;
    var feelerHeight = this.Height - y;
  }
  else
  {
    feelerY = 0;
    feelerHeight = y;
  }
  var feeler = new DvtLine(context, x, feelerY, x, feelerHeight, feelerId);
  if (animate)
    feeler.setAlpha(0);
  feelerBlock.addChild(feeler);
  var feelerWidth = this.getStyle(DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_WIDTH_KEY);
  var feelerColor = this.getStyle(DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_COLOR_KEY);
  var stroke = new DvtSolidStroke(feelerColor, 1, parseInt(feelerWidth));
  feeler.setStroke(stroke);
  feeler._node = node;

  // draw the bubble
  var bubbleId = '_bubble_' + nodeId;
  var bubble = new DvtRect(context, 0, 0, node.getWidth(), node.getHeight(), bubbleId);

  bubble.setCornerRadius(5);
  bubble.setCSSStyle(itemStyle);

  // margin around content
  content.setTranslate(marginLeft, marginTop);
  bubble.addChild(content);

  // draw the tip
  var tipId = '_tip_' + nodeId;
  var tipcId = '_tipc_' + nodeId;
  var tipWidth = parseInt(itemStyle.getStyle(DvtCSSStyle.BORDER_WIDTH));
  if (this._isInverted)
  {
    var tipY = -6;
    var tipShape = DvtMarker.TRIANGLE_UP;
    var coverY = tipY + tipWidth;
  }
  else
  {
    tipY = bubble.getHeight();
    tipShape = DvtMarker.TRIANGLE_DOWN;
    coverY = tipY - tipWidth;
  }
  var tip = new DvtMarker(context, tipShape, null, DvtTimelineSeries.DEFAULT_BUBBLE_OFFSET - 6, tipY, 6, 6, tipId, 2, 1);
  tip.setPixelHinting(true);
  var tipStroke = new DvtSolidStroke(itemStyle.getStyle(DvtCSSStyle.BORDER_COLOR), 1, tipWidth);
  var backgroundFill = new DvtSolidFill(itemStyle.getStyle(DvtCSSStyle.BACKGROUND_COLOR));
  tip.setStroke(tipStroke);
  tip.setFill(backgroundFill);

  var bubbleContainerId = '_bt_' + nodeId;
  var bubbleContainer = new DvtContainer(context, bubbleContainerId);
  if (animate)
    bubbleContainer.setAlpha(0);
  bubbleContainer.addChild(bubble);
  bubbleContainer.addChild(tip);

  // add another tip just above to cover up border line of previous marker
  tip = new DvtMarker(context, tipShape, null, DvtTimelineSeries.DEFAULT_BUBBLE_OFFSET - 6, coverY, 6, 6, tipcId, 2, 1);
  tip.setPixelHinting(true);
  tip.setFill(backgroundFill);
  bubbleContainer.addChild(tip);

  // associate the node with the marker
  bubbleContainer._node = node;
  var transY;
  if (!this._isInverted)
    transY = this.Height - y - bubble.getHeight();
  else
    transY = y;
  bubbleContainer.setTranslate(x - DvtTimelineSeries.DEFAULT_BUBBLE_OFFSET, transY);

  if (x >= 0)
    block.addChild(bubbleContainer);

  // associate the displayable with the node
  node.setBubble(bubbleContainer);
  node.setFeeler(feeler);

  if (animate)
  {
    var animator = new DvtAnimator(context, 1, 0, DvtEasing.linear);
    animator.addProp(DvtAnimator.TYPE_NUMBER, bubbleContainer, bubbleContainer.getAlpha, bubbleContainer.setAlpha, 1);
    animator.addProp(DvtAnimator.TYPE_NUMBER, feeler, feeler.getAlpha, feeler.setAlpha, 1);
    this.addAnimator(animator);
  }

  return bubble;
};


/**
 * Creates the series item contents.
 * @protected
 */
DvtTimelineSeries.prototype.getItemContent = function(node, inlineStyle)
{
  var context = this.getCtx();
  var title = node.getTitle();
  var desc = node.getDescription();
  if (desc == null)
    desc = '';

  var container = new DvtContainer(context);
  var offsetX = 0;
  var offsetY = 0;

  if (title != null)
  {
    var titleText = new DvtOutputText(this.getCtx(), title, offsetX, offsetY);
    titleText.setCSSStyle(this._itemTitleStyle);
    offsetY = 15;
    container.addChild(titleText);
  }

  if (desc != null)
  {
    var descText = new DvtOutputText(this.getCtx(), desc, offsetX, offsetY);
    descText.setCSSStyle(this._itemDescriptionStyle);
    container.addChild(descText);
    offsetY = offsetY + 15;
  }

  return container;
};

DvtTimelineSeries.prototype.getLabel = function()
{
  return this._label;
};

DvtTimelineSeries.prototype.getLabelStyle = function()
{
  return this._labelStyle;
};

DvtTimelineSeries.prototype.getEmptyText = function()
{
  return this._emptyText;
};

DvtTimelineSeries.prototype.getEmptyTextStyle = function()
{
  return this._emptyTextStyle;
};


/**
 * Adjust feelers height if neccessary (if max height is > height of canvas)
 */
DvtTimelineSeries.prototype.adjustFeelers = function()
{
  if (this._isInverted)
    var durationSign = 1;
  else
  {
    durationSign = -1;
    if (this._maxHeight > this.Height)
    {
      var heightDiff = this._maxHeight - this.Height;
      for (var i = 0; i < this._blocks.length; i++)
      {
        var block = this._blocks[i];
        var feelers = block.feelers;
        if (feelers)
        {
          var count = feelers.getNumChildren();
          for (var j = 0; j < count; j++)
          {
            var feeler = feelers.getChildAt(j);
            feeler.setTranslateY(feeler.getTranslateY() + heightDiff);
          }
        }
      }
    }
  }
  for (i = 0; i < this._blocks.length; i++)
  {
    block = this._blocks[i];
    feelers = block.feelers;
    if (feelers)
    {
      count = feelers.getNumChildren();
      for (j = 0; j < count; j++)
      {
        feeler = feelers.getChildAt(j);
        var durationY = feeler._node.getDurationY();
        if (durationY)
          feeler.setY1(feeler.getY1() + (durationY * durationSign));
      }
    }
  }
};


/**
 * Adjust duration heights if neccessary (if max height is > height of canvas)
 */
DvtTimelineSeries.prototype.adjustDurations = function()
{
  if (this._maxHeight > this.Height)
  {
    var heightDiff = this._maxHeight - this.Height;
    for (var i = 0; i < this._blocks.length; i++)
    {
      var block = this._blocks[i];
      var durations = block.durations;

      var count = durations.getNumChildren();
      for (var j = 0; j < count; j++)
      {
        var duration = durations.getChildAt(j);
        duration.setTranslateY(duration.getTranslateY() + heightDiff);
      }
    }
  }
};


/**
 * Adjust bubble positions if neccessary (if max height is > height of canvas)
 */
DvtTimelineSeries.prototype.adjustItems = function()
{
  if (this._maxHeight > this.Height)
  {
    var heightDiff = this._maxHeight - this.Height;
    for (var i = 0; i < this._blocks.length; i++)
    {
      var block = this._blocks[i];
      var count = block.getNumChildren();
      for (var j = 2; j < count; j++)
      {
        var elem = block.getChildAt(j);
        elem.setTranslateY(elem.getTranslateY() + heightDiff);
      }
    }
    this.setVScrollPos(heightDiff);
  }
};

//////////////////////////// selection //////////////////////////////////////
DvtTimelineSeries.prototype.findItem = function(itemId)
{
  if (this._items != null)
  {
    for (var i = 0; i < this._items.length; i++)
    {
      var item = this._items[i];
      if (item.getId() == itemId)
        return item;
    }
  }

  return null;
};


/**
 * Select an item.
 * @protected
 */
DvtTimelineSeries.prototype.selectItem = function(item, isMultiSelect)
{
  if (!isMultiSelect)
    this.removeAllSelectedItems();

  this.addSelectedItem(item);
};


/**
 * Select an item.
 * @protected
 */
DvtTimelineSeries.prototype.addSelectedItem = function(item)
{
  if (this._selectedItems == null)
    this._selectedItems = [];

  var lastSelectedItem = null;
  if (this._selectedItems.length > 0)
    lastSelectedItem = this._selectedItems[this._selectedItems.length - 1];

  this._selectedItems.push(item);

  this.applyState(item, DvtTimelineSeries.SELECTED_STATE_KEY);

  var event = new DvtTimelineSeriesSelectionEvent(this._selectedItems);
  DvtEventDispatcher.dispatchEvent(this._callback, this._callbackObj, this, event);
};



/**
 * Timeline Series selection event.
 * @param {array} selection The array of currently selected ids for the component.
 * @class
 * @constructor
 * @export
 */
var DvtTimelineSeriesSelectionEvent = function(selection) {
  DvtTimelineSeriesSelectionEvent.superclass.Init.call(this, selection);
};

DvtObj.createSubclass(DvtTimelineSeriesSelectionEvent, DvtSelectionEvent, 'DvtTimelineSeriesSelectionEvent');


/**
 * Clears the current selection.
 * @protected
 */
DvtTimelineSeries.prototype.removeAllSelectedItems = function()
{
  if (this._selectedItems != null)
  {
    for (var i = 0; i < this._selectedItems.length; i++)
    {
      var item = this._selectedItems[i];
      this.applyState(item, DvtTimelineSeries.ENABLED_STATE_KEY);
    }

    delete this._selectedItems;
    this._selectedItems = null;
  }
};


/**
 * Applies the desired state to the given item.
 * @protected
 */
DvtTimelineSeries.prototype.applyState = function(item, state)
{
  var bubbleAndTip = item.getBubble();
  // if it is null the item has not been render yet, this could happen when user
  // hovers over a marker that is not in the viewport
  if (bubbleAndTip == null)
    return;

  var bubble = bubbleAndTip.getChildAt(0);
  var tip = bubbleAndTip.getChildAt(1);
  var tipCover = bubbleAndTip.getChildAt(2);
  var feeler = item.getFeeler();
  var duration = item.getDurationBar();

  var itemStyle = this.getStyle(state);
  itemStyle.parseInlineStyle(item.getStyle());
  bubble.setCSSStyle(itemStyle);

  var tipCoverY = tip.getStroke().getWidth();
  var tipWidth = parseInt(itemStyle.getStyle(DvtCSSStyle.BORDER_WIDTH));
  var tipStroke = new DvtSolidStroke(itemStyle.getStyle(DvtCSSStyle.BORDER_COLOR), 1, tipWidth);
  var backgroundFill = new DvtSolidFill(itemStyle.getStyle(DvtCSSStyle.BACKGROUND_COLOR));
  tip.setStroke(tipStroke);
  tip.setFill(backgroundFill);

  if (state != DvtTimelineSeries.ENABLED_STATE_KEY)
  {
    if (this._isInverted)
      tipCover.setTranslateY(tipWidth - tipCoverY);
    else
      tipCover.setTranslateY(tipCoverY - tipWidth);
  }
  else
    tipCover.setTranslateY(0);

  var feelerWidth = this.getStyle(state + DvtTimelineSeries.FEELER_WIDTH_KEY);
  var feelerColor = this.getStyle(state + DvtTimelineSeries.FEELER_COLOR_KEY);
  var feelerStroke = new DvtSolidStroke(feelerColor, 1, parseInt(feelerWidth));

  feeler.setStroke(feelerStroke);
  if (duration)
    duration.setStroke(feelerStroke);
};

DvtTimelineSeries.prototype.getStyle = function(key)
{
  var style = this._defaultStyles[key];
  if (style instanceof DvtCSSStyle)
    return style.clone();
  else
    return style;
};

DvtTimelineSeries.prototype.HandleItemClick = function(item, isMultiSelect)
{
  if (this._selectedItems)
  {
    if (item == this._selectedItems[0])
      return;
  }
  // selects the corresponding item
  this.selectItem(item, isMultiSelect);
};

DvtTimelineSeries.prototype.HandleItemAction = function(item)
{
  var action = item.getAction();
  if (action)
  {
    var event = new DvtTimelineSeriesActionEvent(action, item.getId());
    DvtEventDispatcher.dispatchEvent(this._callback, this._callbackObj, this, event);
  }
};



/**
 * Timeline Series action event.
 * @param action The action triggered
 * @param itemId The id of the node triggering the action event.
 * @class
 * @constructor
 * @export
 */
var DvtTimelineSeriesActionEvent = function(action, itemId)
{
  DvtTimelineSeriesActionEvent.superclass.constructor.call(this, DvtActionEvent.SUBTYPE_ACTION, action, itemId);
};

DvtObj.createSubclass(DvtTimelineSeriesActionEvent, DvtActionEvent, 'DvtTimelineSeriesActionEvent');
/**
 * Class representing a TimelineSeries node.
 * @param {object} props The properties for the node.
 * @class
 * @constructor
 */
var DvtTimelineSeriesNode = function(props)
{
  this.Init(props);
};

DvtObj.createSubclass(DvtTimelineSeriesNode, DvtObj, 'DvtTimelineSeriesNode');


/**
 * @param {object} props The properties for the node.
 * @protected
 */
DvtTimelineSeriesNode.prototype.Init = function(props)
{
  this._id = props.id;
  this._rowKey = props.rowKey;

  this._startTime = parseInt(props.startTime);
  if (props.endTime)
    this._endTime = parseInt(props.endTime);

  this._title = props.title;
  this._desc = props.desc;

  this._style = props.style;
  this._data = props.data;
  this._action = props.action;
  this._durationFillColor = props.durationFillColor;
};

DvtTimelineSeriesNode.prototype.getId = function()
{
  return this._id;
};

DvtTimelineSeriesNode.prototype.getRowKey = function()
{
  return this._rowKey;
};

DvtTimelineSeriesNode.prototype.getStartTime = function()
{
  return this._startTime;
};

DvtTimelineSeriesNode.prototype.getEndTime = function()
{
  return this._endTime;
};

DvtTimelineSeriesNode.prototype.getTitle = function()
{
  return this._title;
};

DvtTimelineSeriesNode.prototype.getDescription = function()
{
  return this._desc;
};

DvtTimelineSeriesNode.prototype.getStyle = function()
{
  return this._style;
};

DvtTimelineSeriesNode.prototype.getData = function()
{
  return this._data;
};

///////////////////// association of visual parts with node /////////////////////////

DvtTimelineSeriesNode.prototype.getBubble = function()
{
  return this._bubble;
};

DvtTimelineSeriesNode.prototype.setBubble = function(bubble)
{
  this._bubble = bubble;
};

DvtTimelineSeriesNode.prototype.getFeeler = function()
{
  return this._feeler;
};

DvtTimelineSeriesNode.prototype.setFeeler = function(feeler)
{
  this._feeler = feeler;
};

DvtTimelineSeriesNode.prototype.getDurationBar = function()
{
  return this._durationBar;
};

DvtTimelineSeriesNode.prototype.setDurationBar = function(durationBar)
{
  this._durationBar = durationBar;
};

DvtTimelineSeriesNode.prototype.getX = function()
{
  return this._x;
};

DvtTimelineSeriesNode.prototype.setX = function(x)
{
  this._x = x;
};

DvtTimelineSeriesNode.prototype.getY = function()
{
  return this._y;
};

DvtTimelineSeriesNode.prototype.setY = function(y)
{
  this._y = y;
};

DvtTimelineSeriesNode.prototype.getDurationLevel = function()
{
  return this._durationLevel;
};

DvtTimelineSeriesNode.prototype.setDurationLevel = function(durationLevel)
{
  this._durationLevel = durationLevel;
};

DvtTimelineSeriesNode.prototype.getDurationY = function()
{
  return this._durationY;
};

DvtTimelineSeriesNode.prototype.setDurationY = function(durationY)
{
  this._durationY = durationY;
};

DvtTimelineSeriesNode.prototype.getDurationFillColor = function()
{
  return this._durationFillColor;
};

DvtTimelineSeriesNode.prototype.setDurationFillColor = function(durationFillColor)
{
  this._durationFillColor = durationFillColor;
};

DvtTimelineSeriesNode.prototype.getWidth = function()
{
  return this._w;
};

DvtTimelineSeriesNode.prototype.setWidth = function(w)
{
  this._w = w;
};

DvtTimelineSeriesNode.prototype.getHeight = function()
{
  return this._h;
};

DvtTimelineSeriesNode.prototype.setHeight = function(h)
{
  this._h = h;
};

DvtTimelineSeriesNode.prototype.getAction = function()
{
  return this._action;
};
/**
 * TimelineSeries JSON Parser
 * @param {DvtTimelineSeries} timelineSeries The owning timelineSeries component.
 * @class
 * @constructor
 * @extends {DvtObj}
 */
var DvtTimelineSeriesParser = function(timelineSeries)
{
  this.Init(timelineSeries);
};

DvtObj.createSubclass(DvtTimelineSeriesParser, DvtTimeComponentParser, 'DvtTimelineSeriesParser');


/**
 * Parses the specified XML String and returns the root node of the timelineSeries
 * @param {string} options The String containing XML describing the component.
 * @return {object} An object containing the parsed properties
 */
DvtTimelineSeriesParser.prototype.parse = function(options)
{
  // Parse the XML string and get the root node
  var _data = eval(this.buildData(options));

  var ret = DvtTimelineSeriesParser.superclass.parse.call(this, options);
  ret.scale = options['scale'];
  ret.seriesScale = options['seriesScale'];
  ret.converter = options['converter'];
  ret.initialSelection = options['selectedItems'];
  ret.label = options['label'];
  ret.emptyText = options['emptyText'];

  ret.items = this._parseDataNode(_data.data);
  ret.rtl = 'false';

  // style info
  var defaultStyles = new Object();

  var itemEnabledStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_ITEM_ENABLED_STYLE);
  var itemSelectedStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_ITEM_SELECTED_STYLE);

  var feelerEnabledWidth = DvtTimelineSeries.DEFAULT_FEELER_ENABLED_WIDTH;
  var feelerSelectedWidth = DvtTimelineSeries.DEFAULT_FEELER_SELECTED_WIDTH;
  var feelerEnabledColor = DvtTimelineSeries.DEFAULT_FEELER_ENABLED_COLOR;
  var feelerSelectedColor = DvtTimelineSeries.DEFAULT_FEELER_SELECTED_COLOR;

  var itemTitleStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_ITEM_TITLE_STYLE);
  var itemDescriptionStyle = new DvtCSSStyle(DvtTimelineSeries.DEFAULT_ITEM_DESCRIPTION_STYLE);

  var itemStyleDefaults = options.itemStyleDefaults;
  if (itemStyleDefaults)
  {
    // item styles
    var enabledStyling = '';
    var selectedStyling = '';
    var style = itemStyleDefaults['backgroundColor'];
    if (style)
      enabledStyling = enabledStyling + 'background-color:' + style + ';';
    style = itemStyleDefaults['selectedBackgroundColor'];
    if (style)
      selectedStyling = selectedStyling + 'background-color:' + style + ';';
    style = itemStyleDefaults['borderWidth'];
    if (style)
      enabledStyling = enabledStyling + 'border-width:' + style + ';';
    style = itemStyleDefaults['selectedBorderWidth'];
    if (style)
      selectedStyling = selectedStyling + 'border-width:' + style + ';';
    style = itemStyleDefaults['borderColor'];
    if (style)
      enabledStyling = enabledStyling + 'border-color:' + style + ';';
    style = itemStyleDefaults['selectedBorderColor'];
    if (style)
      selectedStyling = selectedStyling + 'border-color:' + style + ';';
    itemEnabledStyle.parseInlineStyle(enabledStyling);
    itemSelectedStyle.parseInlineStyle(selectedStyling);

    // item text styles
    style = itemStyleDefaults['titleStyle'];
    if (style)
      itemTitleStyle.parseInlineStyle(style);
    style = itemStyleDefaults['descriptionStyle'];
    if (style)
      itemDescriptionStyle.parseInlineStyle(style);

    // feeler styles
    style = itemStyleDefaults['feelerWidth'];
    if (style)
      feelerEnabledWidth = style;
    style = itemStyleDefaults['selectedFeelerWidth'];
    if (style)
      feelerSelectedWidth = style;
    style = itemStyleDefaults['feelerColor'];
    if (style)
      feelerEnabledColor = style;
    style = itemStyleDefaults['selectedFeelerColor'];
    if (style)
      feelerSelectedColor = style;
  }

  defaultStyles[DvtTimelineSeries.ENABLED_STATE_KEY] = itemEnabledStyle;
  defaultStyles[DvtTimelineSeries.SELECTED_STATE_KEY] = itemSelectedStyle;

  defaultStyles[DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_WIDTH_KEY] = feelerEnabledWidth;
  defaultStyles[DvtTimelineSeries.SELECTED_STATE_KEY + DvtTimelineSeries.FEELER_WIDTH_KEY] = feelerSelectedWidth;

  defaultStyles[DvtTimelineSeries.ENABLED_STATE_KEY + DvtTimelineSeries.FEELER_COLOR_KEY] = feelerEnabledColor;
  defaultStyles[DvtTimelineSeries.SELECTED_STATE_KEY + DvtTimelineSeries.FEELER_COLOR_KEY] = feelerSelectedColor;

  ret.itemTitleStyle = itemTitleStyle;
  ret.itemDescriptionStyle = itemDescriptionStyle;
  ret.defaultStyles = defaultStyles;

  return ret;
};


/**
 * Constructs and returns the data array object.
 * @param {object} options The options object.
 * @protected
 */
DvtTimelineSeriesParser.prototype.buildData = function(options) {
  var data = {};

  var itemArray = [];
  var seriesItems = options['items'];
  if (seriesItems) {
    for (var j = 0; j < seriesItems.length; j++) {
      var item = seriesItems[j];
      itemArray.push(item);
    }
  }
  data.data = itemArray;
  return data;
};


/**
 * Parses the attributes on the root node.
 * @return {object} An object containing the parsed properties
 * @protected
 */
DvtTimelineSeriesParser.prototype.ParseRootAttributes = function()
{
  var ret = DvtTimelineSeriesParser.superclass.ParseRootAttributes.call(this);

  ret.start = this._startTime.getTime();
  ret.end = this._endTime.getTime();

  return ret;
};


/**
 * Recursively parses the XML nodes, creating tree component nodes.
 * @param {DvtXmlNode} xmlNode The XML node to parse.
 * @return {DvtBaseTreeNode} The resulting tree component node.
 * @private
 */
DvtTimelineSeriesParser.prototype._parseDataNode = function(data)
{
  var treeNodes = new Array();
  if (data)
  {
    for (var i = 0; i < data.length; i++)
    {
      // parse the attributes and create the node
      var props = this.ParseNodeAttributes(data[i]);
      if (props)
      {
        var treeNode = new DvtTimelineSeriesNode(props);
        var startTime = treeNode.getStartTime();
        var add = true;
        for (var j = 0; j < treeNodes.length; j++)
        {
          // ensure items are sorted in ascending order
          if (startTime < treeNodes[j].getStartTime())
          {
            treeNodes.splice(j, 0, treeNode);
            add = false;
            break;
          }
        }
        if (add)
          treeNodes.push(treeNode);
      }
    }
  }
  return treeNodes;
};


/**
 * Parses the attributes on a tree node.
 * @param {DvtXmlNode} xmlNode The xml node defining the tree node
 * @return {object} An object containing the parsed properties
 * @protected
 */
DvtTimelineSeriesParser.prototype.ParseNodeAttributes = function(data)
{
  // The object that will be populated with parsed values and returned
  var ret = new Object();

  ret.id = data['id'];
  ret.rowKey = ret.id;

  ret.startTime = this.getDate(data['startTime']);
  ret.endTime = this.getDate(data['endTime']);

  // only return an object if at least part of the event is visible
  var checkTime = ret.endTime ? ret.endTime : ret.startTime;
  if (checkTime < this._startTime.getTime() || ret.startTime > this._endTime.getTime())
    return null;

  ret.title = data['title'];
  ret.desc = data['description'];

  ret.data = data;
  ret.style = data['style'];
  ret.action = data['action'];
  ret.durationFillColor = data['durationFillColor'];

  return ret;
};
