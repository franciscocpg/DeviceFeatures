/* Copyright (c) 2011, 2014, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------ */
/* ------------------- amx-inputDate.js ----------------- */
/* ------------------------------------------------------ */
(function()
{
  var forceCustomInputDate = false; // use true for testing it on iOS/desktop
  if (!adf.mf.environment.profile.dtMode)
  {
    // When using a non-DT, browser-based presentation mode that indicates the
    // skin is for Android, then force use of the custom Android date picker:
    if (adf._bootstrapMode == "dev" || adf._bootstrapMode == "hosted")
    {
      var qs = adf.mf.api.getQueryString();
      var skinFolderOverride = adf.mf.api.getQueryStringParamValue(qs, "amx_skin_folder_override");
      var skinOverride = adf.mf.api.getQueryStringParamValue(qs, "amx_skin_override");
      if (skinFolderOverride != null && skinFolderOverride.indexOf("android") != -1)
        forceCustomInputDate = true;
      else if (skinOverride != null && skinOverride.indexOf("android") != -1)
        forceCustomInputDate = true;
    }
  }

  var inputDate = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "inputDate");

  inputDate.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  inputDate.prototype.render = function(amxNode, id)
  {
    inputDate._oneTimeSetup();

    // MDO - converters support is deprecated; remove any converters added by old apps
    amxNode.setConverter(null);
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var rootDomNode = field.fieldRoot;

    // Initialize the value for this instance:
    var dateObject = null;
    var value = amxNode.getAttribute("value");
    if (value == null)
    {
      dateObject = {};
      dateObject[".null"] = true;
      value = "";
    }
    else
    {
      // call our date parser that attempts both native and ISO-8601 parsing
      var dateParse = adf.mf.internal.converters.dateParser.parse(value);

      if (!isNaN(dateParse))
      {
        dateObject = new Date(dateParse);
      }
    }
    if (dateObject == null && !adf.mf.environment.profile.dtMode)
    {
      dateObject = {};
      dateObject[".null"] = true;
      value = "";
    }

    // Check to Extract the date, time, and datetime values only when DT Mode is false
    var inputType = amxNode.getAttribute("inputType");
    if (adf.mf.environment.profile.dtMode == false)
    {
      if (inputType === "time")
      {
        // only extract the time if the value is not null
        if (amxNode.getAttribute("value") != null)
        {
          if (dateObject.getHours != null)
            value = adf.mf.internal.amx.extractTimeFromDateObject(dateObject);
        }
      }
      else if (inputType === "datetime")
      {
        value = amxNode.getAttribute("value");
      }
      else
      {
        inputType = "date";
        // only extract the date if the value is not null
        if (amxNode.getAttribute("value") != null)
        {
          if (dateObject.getFullYear != null)
            value = adf.mf.internal.amx.extractDateFromDateObject(dateObject);
        }
      }
    }
    else // DT mode
    {
      // we are in DT mode, so handle the inputType differently based on iOS/Android
      if (adf.mf.internal.amx.agent["type"] == "Android" || forceCustomInputDate)
      {
        if (inputType !== "time" && inputType !== "datetime")
        {
          // make sure invalid/unset values get defaulted to "date"
          inputType = "date";
        }
      }
      else
      {
        // on iOS, we must force the input type to be text
        // in order for the displaying of the EL to work
        inputType = "text";
      }
    }

    // since readOnly is not required and it defaults to false if unspecified,
    // then we must use the adf.mf.api.amx.isValueTrue() helper method. This will return
    // false unless the attribute is explicitly set to true
    var readOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));

    // if readOnly is set to true
    if (readOnly == true)
    {
      // Create the read-only inputDate:
      var dateLabel = document.createElement("span");
      field.fieldValue.appendChild(dateLabel);
      var rawValue = inputDate._getRawValueFromDateObject(dateObject);
      dateLabel.textContent = inputDate._getTriggerText(inputType, rawValue);
      dateLabel.setAttribute("readOnly", readOnly);
      // Adding WAI-ARIA Attribute for the readonly state
      dateLabel.setAttribute("aria-readonly", readOnly);
      adf.mf.internal.amx._setNonPrimitiveElementData(dateLabel, "value", dateObject);
    }
    else if (adf.mf.internal.amx.agent["type"] == "Android" || forceCustomInputDate)
    {
      // Create the custom (Android) interactive inputDate:
      inputDate._createCustomInputDate(amxNode, field, value, inputType, id);
    }
    else
    {
      // Create the HTML5 (iOS) interactive inputDate:
      inputDate._createHtml5InputDate(amxNode, field, value, inputType, dateObject);
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return rootDomNode;
  };

  inputDate.prototype.destroy = function(rootElement, amxNode)
  {
    // Clean up any elements that aren't inside the rootElement:
    var id = amxNode.getId();
    var dateTimePicker = document.getElementById(id + "_picker");
    var overlayElement = document.getElementById(id + "_overlay");
    adf.mf.api.amx.removeDomNode(dateTimePicker);
    adf.mf.api.amx.removeDomNode(overlayElement);
  };

  inputDate._getTriggerText = function(inputType, rawValue)
  {
    // The inputType value is undefined for the case where inputType is not
    // declared in the amx page, thus default type is "date".
    if (inputType == "time")
      return inputDate._getLocalizedTimeTextFromRawValue(rawValue);
    else if (inputType == "datetime")
      return inputDate._getLocalizedDateTimeTextFromRawValue(rawValue);
    else // "date" or not specified
      return inputDate._getLocalizedDateTextFromRawValue(rawValue);
  };

  inputDate._oneTimeSetup = function()
  {
    if (inputDate._LOCALIZED_MONTH_ARRAY == null)
    {
      // If we are presenting a month name to a user, we cannot show the parsable month,
      // instead we have to show a name from the user's selected resource bundle:
      var LOCALIZED_MONTH_ARRAY = new Array(12);
      if (adf.mf.environment.profile.dtMode == false)
      {
        LOCALIZED_MONTH_ARRAY[0] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_JANUARY_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[1] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_FEBRUARY_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[2] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_MARCH_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[3] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_APRIL_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[4] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_MAY_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[5] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_JUNE_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[6] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_JULY_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[7] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_AUGUST_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[8] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_SEPTEMBER_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[9] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_OCTOBER_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[10] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_NOVEMBER_ABBREVIATION");
        LOCALIZED_MONTH_ARRAY[11] = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_DECEMBER_ABBREVIATION");
        inputDate._LOCALIZED_TIME_AM = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_TIME_AM_ABBREVIATION");
        inputDate._LOCALIZED_TIME_PM = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_TIME_PM_ABBREVIATION");
      }
      else
      {
        LOCALIZED_MONTH_ARRAY[0] = "JAN";
        LOCALIZED_MONTH_ARRAY[1] = "FEB";
        LOCALIZED_MONTH_ARRAY[2] = "MAR";
        LOCALIZED_MONTH_ARRAY[3] = "APR";
        LOCALIZED_MONTH_ARRAY[4] = "MAY";
        LOCALIZED_MONTH_ARRAY[5] = "JUN";
        LOCALIZED_MONTH_ARRAY[6] = "JUL";
        LOCALIZED_MONTH_ARRAY[7] = "AUG";
        LOCALIZED_MONTH_ARRAY[8] = "SEP";
        LOCALIZED_MONTH_ARRAY[9] = "OCT";
        LOCALIZED_MONTH_ARRAY[10] = "NOV";
        LOCALIZED_MONTH_ARRAY[11] = "DEC";
        inputDate._LOCALIZED_TIME_AM = "AM";
        inputDate._LOCALIZED_TIME_PM = "PM";
      }
      inputDate._LOCALIZED_MONTH_ARRAY = LOCALIZED_MONTH_ARRAY;

      inputDate._tapEvents = amx.hasTouch() ? { start: "touchstart", end: "touchend" } : { start: "mousedown", end: "mouseup" };
    }
  };

  inputDate._capitalizeFirstLetter = function(monthText)
  {
    return monthText.slice(0,1).toUpperCase() + monthText.slice(1).toLowerCase();
  };

  inputDate._getLocalizedDateTimeTextFromRawValue = function(rawValue)
  {
    if (rawValue["monthIndex"] == null)
      return "";
    var result =
      inputDate._getLocalizedDateTextFromRawValue(rawValue) +
      " " +
      inputDate._getLocalizedTimeTextFromRawValue(rawValue);
    return result;
  };

  inputDate._getLocalizedDateTextFromRawValue = function(rawValue)
  {
    if (rawValue["monthIndex"] == null)
      return "";
    var result =
      inputDate._capitalizeFirstLetter(inputDate._getLocalizedMonthFromRawValue(rawValue)) +
      " " +
      inputDate._getLocalizedDayFromRawValue(rawValue) +
      ", " +
      inputDate._getLocalizedYearFromRawValue(rawValue);
    return result;
  };

  inputDate._getLocalizedTimeTextFromRawValue = function(rawValue)
  {
    if (rawValue["hour"] == null)
      return "";
    var result =
      inputDate._getLocalizedHourFromRawValue(rawValue) +
      ":" +
      inputDate._getLocalizedMinutesFromRawValue(rawValue) +
      " " +
      inputDate._getLocalizedAmPmFromRawValue(rawValue);
    return result;
  };

  inputDate._getLocalizedMonthFromRawValue = function(rawValue)
  {
    if (rawValue["monthIndex"] == null)
      return "";
    return inputDate._LOCALIZED_MONTH_ARRAY[rawValue["monthIndex"]];
  };

  inputDate._getLocalizedDayFromRawValue = function(rawValue)
  {
    if (rawValue["dayNumber"] == null)
      return "";
    return rawValue["dayNumber"];
  };

  inputDate._getLocalizedYearFromRawValue = function(rawValue)
  {
    if (rawValue["year"] == null)
      return "";
    return rawValue["year"];
  };

  inputDate._getLocalizedHourFromRawValue = function(rawValue)
  {
    if (rawValue["hour"] == null)
      return "";
    return rawValue["hour"];
  };

  inputDate._getLocalizedMinutesFromRawValue = function(rawValue)
  {
    if (rawValue["min"] == null)
      return "";

    var displayMinutes = rawValue["min"];
    if (displayMinutes < 10)
    {
      displayMinutes = "0" + displayMinutes;
    }
    return displayMinutes;
  };

  inputDate._getLocalizedAmPmFromRawValue = function(rawValue)
  {
    if (rawValue["isPm"] == null)
      return "";
    return (rawValue["isPm"] ? inputDate._LOCALIZED_TIME_PM : inputDate._LOCALIZED_TIME_AM);
  };

  // Verify that this object is a valid date.  We check for presence of the toISOString function and verify that the time
  // in milliseconds in not NaN
  inputDate._isValidDate = function(date)
  {
    return (typeof date.toISOString === "function") && !isNaN(date.getTime());
  };

  // When the seconds and milliseconds on a date are both 0, the native control will remove them from the value attribute
  // and dateLabel.value returns "YYYY-MM-DDTHH:MMZ".  However, Date.parse() chokes on this even though it is a valid
  // ISO 8601 format.  To avoid this failure, we add the seconds and milliseconds so the value looks like "YYYY-MM-DDTHH:MM:00.000Z"
  inputDate._fillDateText = function(dateString)
  {
    var i = dateString.indexOf("T");
    if (i > -1 && (i + 1) < dateString.length)
    {
      var time = dateString.substring(i + 1);
      if (time.length == 6)
      {
        // this string looks like "HH:MMZ".  It is missing the optional seconds and milliseconds so we add them as zeroes
        time = time.substring(0, 5) + ":00.000Z";
      }
      else if (time.length == 9)
      {
        // this string looks like "HH:MM:SSZ".  It is missing the optional milliseconds so we add them as zeroes
        time = time.substring(0, 8) + ".000Z";
      }
      dateString = dateString.substring(0, i + 1) + time;
    }
    return dateString;
  };

  inputDate._daysInMonth = function(rawValue)
  {
    // Calculate days in a given month (also checks for leap year).

    var year = rawValue["year"];
    var monthIndex = rawValue["monthIndex"];

    // We need to start with this special January 1st date because otherwise
    // It will be a December 31st value by default which if we assign a month
    // with less than 31 days, the month will roll over to the next month
    // which of course will give us the wrong dates some of the time.
    // We also don't simply assign the year in this constructor because there
    // is no full-year constructor; JavaScript uses a horrible guessing
    // algorithm where 2-digit years are assumed to be years in the 1900s.
    // We also do not use the default constructor because that bases the date
    // off of the current point in time and we want a value with clean second,
    // millisecond, etc. components since we only care about minute precision.
    // All JavaScript date objects are assumed to be in the browser's local
    // time zone.
    dateObject = new Date(0, 1, 1);

    // Assign a date value that is of day #0 of the next month which equates to
    // the last day number of the current month:
    dateObject.setFullYear(year);
    dateObject.setMonth(monthIndex + 1); // next month
    dateObject.setDate(0); // last day of current month

    var daysInMonth = dateObject.getDate(); // normalizes the last day number
    return daysInMonth;
  };

  inputDate._populateTime = function(id, rawValues, updateTabText)
  {
    var chosenRawValue      = rawValues["chosen"];
    var lastRawValue        = rawValues["last"];
    var presentRawValue     = rawValues["present"];
    var incDateTimeSRowFCol = document.getElementById(id + "_txt1");
    var incDateTimeSRowSCol = document.getElementById(id + "_txt2");
    var incDateTimeSRowTCol = document.getElementById(id + "_txt3");
    var timeTabSpan         = document.getElementById(id + "_timeTxt");

    // Update the text between the spinners:
    incDateTimeSRowFCol.textContent = inputDate._getLocalizedHourFromRawValue(chosenRawValue);
    incDateTimeSRowSCol.textContent = inputDate._getLocalizedMinutesFromRawValue(chosenRawValue);
    incDateTimeSRowTCol.textContent = inputDate._getLocalizedAmPmFromRawValue(chosenRawValue);

    if (updateTabText)
    {
      // Update the text on the toggle tab:
      if (inputDate._isRawValueEmpty(chosenRawValue))
      {
        if (inputDate._isRawValueEmpty(lastRawValue))
          timeTabSpan.textContent = inputDate._getLocalizedTimeTextFromRawValue(presentRawValue);
        else
          timeTabSpan.textContent = inputDate._getLocalizedTimeTextFromRawValue(lastRawValue);
      }
      else
        timeTabSpan.textContent = inputDate._getLocalizedTimeTextFromRawValue(chosenRawValue);
    }
  };

  inputDate._populateDate = function(id, rawValues, updateTabText)
  {
    var chosenRawValue      = rawValues["chosen"];
    var lastRawValue        = rawValues["last"];
    var presentRawValue     = rawValues["present"];
    var incDateTimeSRowFCol = document.getElementById(id + "_txt1");
    var incDateTimeSRowSCol = document.getElementById(id + "_txt2");
    var incDateTimeSRowTCol = document.getElementById(id + "_txt3");
    var dateTabSpan         = document.getElementById(id + "_dateTxt");

    // Update the text between the spinners:
    incDateTimeSRowFCol.textContent = inputDate._getLocalizedMonthFromRawValue(chosenRawValue).toUpperCase();
    incDateTimeSRowSCol.textContent = inputDate._getLocalizedDayFromRawValue(chosenRawValue);
    incDateTimeSRowTCol.textContent = inputDate._getLocalizedYearFromRawValue(chosenRawValue);

    if (updateTabText)
    {
      // Update the text on the toggle tab:
      if (inputDate._isRawValueEmpty(chosenRawValue))
      {
        if (inputDate._isRawValueEmpty(lastRawValue))
          dateTabSpan.textContent = inputDate._getLocalizedDateTextFromRawValue(presentRawValue);
        else
          dateTabSpan.textContent = inputDate._getLocalizedDateTextFromRawValue(lastRawValue);
      }
      else
        dateTabSpan.textContent = inputDate._getLocalizedDateTextFromRawValue(chosenRawValue);
    }
  };

  inputDate._initialPickerPopulation = function(
    id,
    inputType,
    rawValues,
    eventData)
  {
    var dateTimePicker = document.getElementById(id + "_picker");
    var titleBarText   = document.getElementById(id + "_title");
    var dateTabDiv     = document.getElementById(id + "_dateTab");
    var timeTabDiv     = document.getElementById(id + "_timeTab");

    // Check for inputTypes: time, date or dateTime and display the picker accordingly.
    // If the inputType value is undefined (for the case where inputType is not declared in the amx page), default to "date".
    if (inputType == "time")
    {
      dateTimePicker.setAttribute("class", "amx-inputDate-picker-wrapper amx-purge-on-nav amx-inputDate-picker-timeOnly");
      timeTabDiv.className = "amx-inputDate-picker-time-header";
      dateTabDiv.className = "amx-inputDate-picker-time-header";
      dateTabDiv.style.display = "none";
      titleBarText.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_SET_TIME");
      inputDate._populateTime(id, rawValues, true);
    }
    else if (inputType == "datetime")
    {
      dateTimePicker.setAttribute("class", "amx-inputDate-picker-wrapper amx-purge-on-nav");

      inputDate._populateTime(id, rawValues, true);
      inputDate._populateDate(id, rawValues, true);

      timeTabDiv.style.display = "block";
      dateTimePicker.setAttribute("class", "amx-inputDate-picker-wrapper amx-purge-on-nav");
      timeTabDiv.className = "amx-inputDate-picker-timeTab";
      dateTabDiv.className = "amx-inputDate-picker-dateTab-selected";

      adf.mf.api.amx.addBubbleEventListener(timeTabDiv, "tap", inputDate._customTimeTabTapHandler, eventData);
      adf.mf.api.amx.addBubbleEventListener(dateTabDiv, "tap", inputDate._customDateTabTapHandler, eventData);

      titleBarText.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_SET_DATE_TIME");
    }
    else // inputType is "date" or not specified
    {
      dateTimePicker.setAttribute("class", "amx-inputDate-picker-wrapper amx-purge-on-nav amx-inputDate-picker-dateOnly");
      dateTabDiv.className = "amx-inputDate-picker-date-header";
      timeTabDiv.className = "amx-inputDate-picker-date-header";
      timeTabDiv.style.display = "none";
      titleBarText.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_SET_DATE");
      inputDate._populateDate(id, rawValues, true);
    }
  };

  inputDate._createCustomInputDate = function(amxNode, field, value, inputType, id)
  {
    var dateTrigger = document.createElement("div");
    dateTrigger.id = id + "_trigger";
    dateTrigger.setAttribute("role", "button");
    dateTrigger.setAttribute("tabindex", "0");
    dateTrigger.setAttribute("class", "amx-inputDate-trigger-dateTime");

    var dateTriggerSpan = document.createElement("span");
    dateTriggerSpan.setAttribute("class", "amx-inputDate-text");
    dateTriggerSpan.setAttribute("id", id + "_triggerText");

    var dateTriggerIconWrapper = document.createElement("div");
    dateTriggerIconWrapper.setAttribute("class", "amx-inputDate-triggerIconStyleWrapper");

    var dateTriggerIcon = document.createElement("div");
    dateTriggerIcon.setAttribute("class", "amx-inputDate-triggerIconStyle");
    dateTrigger.appendChild(dateTriggerSpan);
    dateTrigger.appendChild(dateTriggerIconWrapper);
    dateTrigger.appendChild(dateTriggerIcon);
    field.fieldValue.appendChild(dateTrigger);

    // since disabled is not required and it defaults to false if unspecified,
    // then we must use the adf.mf.api.amx.isValueTrue() helper method. This will return
    // false unless the attribute is explicitly set to true
    var disabledInputType = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled"));
    var androidDateObject = null;
    var androidInputDateValue = amxNode.getAttribute("value");
    var oldAndroidDateValue = null;
    var rawValue = inputDate._getRawValueFromDateObject(null);

    // If the value is already provided for inputDate, update the UI for all three (date, time, and datetime)
    if (typeof androidInputDateValue !== "undefined")
    {
      // call our date parser that attempts both native and ISO-8601 parsing
      var dateParse = adf.mf.internal.converters.dateParser.parse(androidInputDateValue);

      if (!isNaN(dateParse))
      {
        androidDateObject = new Date(dateParse);
      }

      if (androidDateObject == null)
      {
        if (adf.mf.environment.profile.dtMode)
        {
          androidDateObject = new Date();
        }
        else // cleared value
        {
          androidDateObject = {};
          androidDateObject[".null"] = true;
        }
      }

      rawValue = inputDate._getRawValueFromDateObject(androidDateObject);

      if (androidDateObject.toISOString != null)
        oldAndroidDateValue = androidDateObject.toISOString();
      else
        oldAndroidDateValue = "";

      dateTriggerSpan.textContent = inputDate._getTriggerText(inputType, rawValue);
    }
    else // cleared value
    {
      androidDateObject = {};
      androidDateObject[".null"] = true;
    }

    var presentDateObj = androidDateObject;
    if (presentDateObj.getDate == null)
      presentDateObj = new Date();
    var presentRawValue = inputDate._getRawValueFromDateObject(presentDateObj);

    // if disabled is false for Android then we don't inject the Date Picker in the DOM and don't invoke the tap event
    if (disabledInputType == false) // aka enabled
    {
      var eventData = {
        "amxNode":             amxNode,
        "id":                  id,
        "inputType":           inputType,
        "rawValue":            rawValue,
        "presentRawValue":     presentRawValue,
        "oldAndroidDateValue": oldAndroidDateValue
      };
      adf.mf.api.amx.addBubbleEventListener(dateTrigger, "tap", inputDate._customTriggerTapHandler, eventData);
    }

    if (adf.mf.environment.profile.dtMode != false)
    {
      adf.mf.api.amx.removeDomNode(dateTrigger);
      var dateTriggerSpanDTOnly = document.createElement("span");
      adf.mf.internal.amx.addCSSClassName(dateTriggerSpanDTOnly, "amx-inputDate-readOnly");
      // We need to show the value just as it was entered in the PI for DT Mode
      dateTriggerSpanDTOnly.textContent = value;
      field.fieldValue.appendChild(dateTriggerSpanDTOnly);
    }
  };

  /**
   * Whether this value is empty (has been cleared or was never set).
   * @param {Object} rawValue the value to test
   * @return {boolean} whether the given value is empty
   */
  inputDate._isRawValueEmpty = function(rawValue)
  {
    return (rawValue["year"] == null && rawValue["hour"] == null);
  };

  /**
   * Assigns the values from one rawValue into another rawValue.
   * @param {Object} destinationRawValue the destination value
   * @param {Object} sourceRawValue the source value (or null to clear the members)
   */
  inputDate._assignRawValueMembers = function(destinationRawValue, sourceRawValue)
  {
    if (sourceRawValue == null)
    {
      destinationRawValue["year"] =       null;
      destinationRawValue["monthIndex"] = null;
      destinationRawValue["dayNumber"] =  null;
      destinationRawValue["hour"] =       null;
      destinationRawValue["min"] =        null;
      destinationRawValue["isPm"] =       null;
    }
    else
    {
      destinationRawValue["year"] =       sourceRawValue["year"];
      destinationRawValue["monthIndex"] = sourceRawValue["monthIndex"];
      destinationRawValue["dayNumber"] =  sourceRawValue["dayNumber"];
      destinationRawValue["hour"] =       sourceRawValue["hour"];
      destinationRawValue["min"] =        sourceRawValue["min"];
      destinationRawValue["isPm"] =       sourceRawValue["isPm"];
    }
  };

  /**
   * Creates a copy of a raw value.
   * @param {Object} rawValue the value to copy
   * @return {Object} the new copy
   */
  inputDate._cloneRawValue = function(rawValue)
  {
    var newRawValue = {
      "year":       rawValue["year"],
      "monthIndex": rawValue["monthIndex"],
      "dayNumber":  rawValue["dayNumber"],
      "hour":       rawValue["hour"],
      "min":        rawValue["min"],
      "isPm":       rawValue["isPm"]
    };
    return newRawValue;
  };

  /**
   * Creates a JavaScript date object from a raw value object.
   * @param {Object} rawValue a raw value date object
   * @return {Date} a JavaScript date object based on the given raw value
   */
  inputDate._getDateObjectFromRawValue = function(rawValue)
  {
    var dateObject;
    if (inputDate._isRawValueEmpty(rawValue))
    {
      dateObject = null;
    }
    else
    {
      var year = rawValue["year"];
      var monthIndex = rawValue["monthIndex"];
      var dayNumber = rawValue["dayNumber"];
      var hour = rawValue["hour"];
      var min = rawValue["min"];
      var isPm = rawValue["isPm"];

      var milHours = hour;
      if (isPm)
      {
        if (milHours != 12)
          milHours = milHours + 12;
      }
      else // is AM
      {
        if (milHours == 12)
          milHours = 0;
      }

      // We need to start with this special January 1st date because otherwise
      // It will be a December 31st value by default which if we assign a month
      // with less than 31 days, the month will roll over to the next month
      // which of course will give us the wrong dates some of the time.
      // We also don't simply assign the year in this constructor because there
      // is no full-year constructor; JavaScript uses a horrible guessing
      // algorithm where 2-digit years are assumed to be years in the 1900s.
      // We also do not use the default constructor because that bases the date
      // off of the current point in time and we want a value with clean second,
      // millisecond, etc. components since we only care about minute precision.
      // All JavaScript date objects are assumed to be in the browser's local
      // time zone.
      dateObject = new Date(0, 1, 1);

      // Assign the actual date values:
      dateObject.setFullYear(year);
      dateObject.setMonth(monthIndex);
      dateObject.setDate(dayNumber);
      dateObject.setHours(milHours);
      dateObject.setMinutes(min);
    }
    return dateObject;
  };

  /**
   * Creates a raw value object from a JavaScript date object.
   * @param {Date} dateObject a JavaScript date object
   * @return {Object} the raw value object based on the given date
   */
  inputDate._getRawValueFromDateObject = function(dateObject)
  {
    var rawValue = {
      "year":       null,
      "monthIndex": null,
      "dayNumber":  null,
      "hour":       null,
      "min":        null,
      "isPm":       null
    };

    if (dateObject == null || dateObject.getFullYear == null)
      return rawValue;

    var milHour = dateObject.getHours(); // In 24 hours time
    var hour = milHour;
    var isPm = false;
    if (hour == 0)
    {
      hour = 12;
    }
    else if (hour > 12)
    {
      isPm = true;
      hour = hour - 12;
    }

    rawValue["year"]       = dateObject.getFullYear()
    rawValue["monthIndex"] = dateObject.getMonth();
    rawValue["dayNumber"]  = dateObject.getDate();
    rawValue["hour"]       = hour;
    rawValue["min"]        = dateObject.getMinutes();
    rawValue["isPm"]       = isPm;
    return rawValue;
  };

  inputDate._customTriggerTapHandler = function(event)
  {
    // Don't show the picker if we are navigating:
    if (!adf.mf.api.amx.acceptEvent())
      return;

    // Stop propagation of the event to parent components
    event.stopPropagation();

    // Build the structure for the editor UI:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValue            = eventData["rawValue"];
    var presentRawValue     = eventData["presentRawValue"];

    // The "chosen" value is the one that will be used when the set button is clicked.
    var chosenRawValue;
    if (inputDate._isRawValueEmpty(rawValue)) // use present when empty
      chosenRawValue = inputDate._cloneRawValue(presentRawValue);
    else
      chosenRawValue = inputDate._cloneRawValue(rawValue);

    // The "last" value is the one that will be used when either the date or
    // time tabs are clicked when it they are already selected--to reset the value.
    // The "last" value gets gets updated each time a new tab is selected.
    // If the "last" value happens to be cleared when resetting, the "present"
    // value is used for the reset instead.
    // In the beginning, chosen and last are the same:
    var lastRawValue = inputDate._cloneRawValue(chosenRawValue);

    var rawValues = {
      "chosen":  chosenRawValue,
      "last":    lastRawValue,
      "present": presentRawValue
    };
    eventData["rawValues"] = rawValues;

    var dateTimePicker = document.createElement("div");
    dateTimePicker.setAttribute("class", "amx-inputDate-picker-wrapper amx-purge-on-nav");
    dateTimePicker.setAttribute("id", id + "_picker");

    // Creation of Date Picker including the Tabs for Date/Time and Table for values and inc/dec buttons and appended to the DOM
    var dateTabDiv = document.createElement("div");
    dateTabDiv.id = id + "_dateTab";
    dateTabDiv.setAttribute("role", "button");
    dateTabDiv.setAttribute("tabindex", "0");
    dateTabDiv.setAttribute("class", "amx-inputDate-picker-dateTab-selected");

    var dateTabSpan = document.createElement("span");
    dateTabSpan.setAttribute("class", "amx-inputDate-picker-dateTab-text");
    dateTabSpan.setAttribute("id", id + "_dateTxt");
    dateTabDiv.appendChild(dateTabSpan);

    var timeTabDiv = document.createElement("div");
    timeTabDiv.id = id + "_timeTab";
    timeTabDiv.setAttribute("role", "button");
    timeTabDiv.setAttribute("tabindex", "0");
    timeTabDiv.setAttribute("class", "amx-inputDate-picker-timeTab");

    var timeTabSpan = document.createElement("span");
    timeTabSpan.setAttribute("class", "amx-inputDate-picker-timeTab-text");
    timeTabSpan.setAttribute("id", id + "_timeTxt");

    // Title Bar Text and the horizontal divider are created using this div for Alta Skin
    var titleBarText = document.createElement("div");
    titleBarText.setAttribute("class", "amx-inputDate-picker-titleBarText");
    titleBarText.setAttribute("id", id + "_title");
    dateTimePicker.appendChild(titleBarText);

    timeTabDiv.appendChild(timeTabSpan);
    dateTimePicker.appendChild(dateTabDiv);
    dateTimePicker.appendChild(timeTabDiv);

    var dateTimePickerTable = document.createElement("table");
    dateTimePickerTable.setAttribute("class", "amx-inputDate-datePicker-inner-container");

    var incDateTimeFRow = dateTimePickerTable.insertRow(0);
    var incDateTimeFRowFCol = incDateTimeFRow.insertCell(0);
    incDateTimeFRowFCol.id = id + "_inc1";
    incDateTimeFRowFCol.setAttribute("class", "amx-inputDate-datePicker-firstColumn-increment amx-inputDate-incrementButton amx-inputDate-datePicker-col");
    var incDateTimeFRowSCol = incDateTimeFRow.insertCell(1);
    incDateTimeFRowSCol.id = id + "_inc2";
    incDateTimeFRowSCol.setAttribute("class", "amx-inputDate-datePicker-secondColumn-increment amx-inputDate-incrementButton amx-inputDate-datePicker-col");
    var incDateTimeFRowTCol = incDateTimeFRow.insertCell(2);
    incDateTimeFRowTCol.id = id + "_inc3";
    incDateTimeFRowTCol.setAttribute("class", "amx-inputDate-datePicker-thirdColumn-increment amx-inputDate-incrementButton amx-inputDate-datePicker-col amx-inputDate-datePicker-lastCol");

    var incDateTimeSRow = dateTimePickerTable.insertRow(1);
    var incDateTimeSRowFCol = incDateTimeSRow.insertCell(0);
    incDateTimeSRowFCol.id = id + "_txt1";
    incDateTimeSRowFCol.setAttribute("class", "amx-inputDate-datePicker-month-text amx-inputDate-datePicker-col");
    var incDateTimeSRowSCol = incDateTimeSRow.insertCell(1);
    incDateTimeSRowSCol.id = id + "_txt2";
    incDateTimeSRowSCol.setAttribute("class", "amx-inputDate-datePicker-day-text amx-inputDate-datePicker-col");
    var incDateTimeSRowTCol = incDateTimeSRow.insertCell(2);
    incDateTimeSRowTCol.id = id + "_txt3";
    incDateTimeSRowTCol.setAttribute("class", "amx-inputDate-datePicker-year-text amx-inputDate-datePicker-col amx-inputDate-datePicker-lastCol");
    var clearCell = incDateTimeSRow.insertCell(3);
    var clearBtn = document.createElement("div");
    clearBtn.id = id + "_clear";
    clearBtn.setAttribute("role", "button");
    clearBtn.setAttribute("tabindex", "0");
    clearBtn.setAttribute("class", "amx-inputDate-picker-clearButton");
    clearBtn.setAttribute("aria-label", adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_CLEAR_BUTTON"));
    var targetArea = document.createElement("div");
    targetArea.className = "amx-extendedTarget";
    clearBtn.appendChild(targetArea);
    clearCell.appendChild(clearBtn);

    var decDateTimeTRow = dateTimePickerTable.insertRow(2);
    var decDateTimeTRowFCol = decDateTimeTRow.insertCell(0);
    decDateTimeTRowFCol.id = id + "_dec1";
    decDateTimeTRowFCol.setAttribute("class", "amx-inputDate-datePicker-firstColumn-decrement amx-inputDate-decrementButton amx-inputDate-datePicker-col");
    var decDateTimeTRowSCol = decDateTimeTRow.insertCell(1);
    decDateTimeTRowSCol.id = id + "_dec2";
    decDateTimeTRowSCol.setAttribute("class", "amx-inputDate-datePicker-secondColumn-decrement amx-inputDate-decrementButton amx-inputDate-datePicker-col");
    var decDateTimeTRowTCol = decDateTimeTRow.insertCell(2);
    decDateTimeTRowTCol.id = id + "_dec3";
    decDateTimeTRowTCol.setAttribute("class", "amx-inputDate-datePicker-thirdColumn-decrement amx-inputDate-decrementButton amx-inputDate-datePicker-col amx-inputDate-datePicker-lastCol");

    dateTimePicker.appendChild(dateTimePickerTable);

    //Creation of set and cancel buttons and appended to the DOM
    var dateTimeSetBtn = document.createElement("div");
    dateTimeSetBtn.id = id + "_set";
    dateTimeSetBtn.setAttribute("role", "button");
    dateTimeSetBtn.setAttribute("tabindex", "0");
    dateTimeSetBtn.setAttribute("class", "amx-inputDate-picker-setButton");

    var dateTimeSetBtnSpan = document.createElement("span");
    dateTimeSetBtnSpan.setAttribute("class", "amx-inputDate-picker-button-text");
    dateTimeSetBtnSpan.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_OK_BUTTON");
    dateTimeSetBtn.appendChild(dateTimeSetBtnSpan);
    dateTimePicker.appendChild(dateTimeSetBtn);

    var dateTimeCancelBtn = document.createElement("div");
    dateTimeCancelBtn.id = id + "_cancel";
    dateTimeCancelBtn.setAttribute("role", "button");
    dateTimeCancelBtn.setAttribute("tabindex", "0");
    dateTimeCancelBtn.setAttribute("class", "amx-inputDate-picker-cancelButton");

    var dateTimeCancelBtnSpan = document.createElement("span");
    dateTimeCancelBtnSpan.setAttribute("class", "amx-inputDate-picker-button-text");
    dateTimeCancelBtnSpan.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_inputDate_LABEL_CANCEL_BUTTON");

    dateTimeCancelBtn.appendChild(dateTimeCancelBtnSpan);
    dateTimePicker.appendChild(dateTimeCancelBtn);

    // The opacity screen for the date picker component
    var overlayElement = document.createElement("div");
    overlayElement.id = id + "_overlay";
    overlayElement.setAttribute("class", "amx-inputDate-picker-modalOverlay amx-purge-on-nav");

    // Tapping the overlay works just like tapping the cancel button
    adf.mf.api.amx.addBubbleEventListener(overlayElement, "tap", inputDate._customCancelButtonTapHandler, eventData);

    document.body.appendChild(overlayElement);
    document.body.appendChild(dateTimePicker);
    inputDate._initialPickerPopulation(id, inputType, rawValues, eventData);

    // Set the new value
    adf.mf.api.amx.addBubbleEventListener(dateTimeSetBtn, "tap", inputDate._customSetButtonTapHandler, eventData);

    // Cancel and go back to the old value
    adf.mf.api.amx.addBubbleEventListener(dateTimeCancelBtn, "tap", inputDate._customCancelButtonTapHandler, eventData);

    // Clear the new value
    adf.mf.api.amx.addBubbleEventListener(clearBtn, "tap", inputDate._customClearButtonTapHandler, eventData);

    // Events are bound to the touchstart and touchend events to deal with
    // incrementing/decrementing the date and time values and updating the style
    // of the button.

    // Handling MONTH & HOUR increments
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowFCol, inputDate._tapEvents.start, inputDate._customIncrement1stTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowFCol, inputDate._tapEvents.end, inputDate._customIncrementTouchEndHandler, incDateTimeFRowFCol.id);

    // Handling DAY & MINUTE increment here
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowSCol, inputDate._tapEvents.start, inputDate._customIncrement2ndTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowSCol, inputDate._tapEvents.end, inputDate._customIncrementTouchEndHandler, incDateTimeFRowSCol.id);

    // Handling YEAR increment & AM/PM toggle here
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowTCol, inputDate._tapEvents.start, inputDate._customIncrement3rdTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      incDateTimeFRowTCol, inputDate._tapEvents.end, inputDate._customIncrementTouchEndHandler, incDateTimeFRowTCol.id);

    // Attached event handlers to the respective mm/dd/yy decrement buttons to keep decrementing untill the last first in the array
    // Handling MONTH & HOUR decrement here
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowFCol, inputDate._tapEvents.start, inputDate._customDecrement1stTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowFCol, inputDate._tapEvents.end, inputDate._customDecrementTouchEndHandler, decDateTimeTRowFCol.id);

    // Handling DAY & MINUTE decrement here
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowSCol, inputDate._tapEvents.start, inputDate._customDecrement2ndTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowSCol, inputDate._tapEvents.end, inputDate._customDecrementTouchEndHandler, decDateTimeTRowSCol.id);

    // Handling YEAR decrement & AM/PM toggle here
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowTCol, inputDate._tapEvents.start, inputDate._customDecrement3rdTouchStartHandler, eventData);

    // Changes the image back to normal on touchend
    adf.mf.api.amx.addBubbleEventListener(
      decDateTimeTRowTCol, inputDate._tapEvents.end, inputDate._customDecrementTouchEndHandler, decDateTimeTRowTCol.id);
  };

  inputDate._customSetButtonTapHandler = function(event)
  {
    var eventData = event.data;
    var amxNode             = eventData["amxNode"];
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var oldAndroidDateValue = eventData["oldAndroidDateValue"];

    var dateTriggerSpan = document.getElementById(id + "_triggerText");
    var chosenRawValue  = rawValues["chosen"];
    var newAndroidDateValue;
    var vceAndroid;

    if (inputDate._isRawValueEmpty(chosenRawValue)) // user cleared the value
    {
      androidDateObject = {
        ".null": true
      };
      newAndroidDateValue = "";
      dateTriggerSpan.textContent = "";
    }
    else if (inputType == "datetime")
    {
      androidDateObject = inputDate._getDateObjectFromRawValue(chosenRawValue);
      newAndroidDateValue = androidDateObject.toISOString();
      dateTriggerSpan.textContent = inputDate._getLocalizedDateTimeTextFromRawValue(chosenRawValue);
    }
    else if (inputType == "time")
    {
      androidDateObject = inputDate._getDateObjectFromRawValue(chosenRawValue);
      newAndroidDateValue = androidDateObject.toISOString();
      dateTriggerSpan.textContent = inputDate._getLocalizedTimeTextFromRawValue(chosenRawValue);
    }
    else // inputType == date or not specified
    {
      androidDateObject = inputDate._getDateObjectFromRawValue(chosenRawValue);
      newAndroidDateValue = androidDateObject.toISOString();
      dateTriggerSpan.textContent = inputDate._getLocalizedDateTextFromRawValue(chosenRawValue);
    }

    // Process the valueChange AMX event:
    vceAndroid = new amx.ValueChangeEvent(oldAndroidDateValue, newAndroidDateValue);
    adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newAndroidDateValue, vceAndroid);

    // Update the eventData in for future re-triggering:
    eventData["oldAndroidDateValue"] = newAndroidDateValue;
    eventData["rawValue"] = chosenRawValue;

    // Purge the picker:
    var dateTimePicker = document.getElementById(id + "_picker");
    var overlayElement = document.getElementById(id + "_overlay");
    adf.mf.api.amx.removeDomNode(dateTimePicker);
    adf.mf.api.amx.removeDomNode(overlayElement);
    dateTimePicker = null;
    overlayElement = null;
  };

  inputDate._customCancelButtonTapHandler = function(event)
  {
    var id = event.data["id"];
    var dateTimePicker = document.getElementById(id + "_picker");
    var overlayElement = document.getElementById(id + "_overlay");
    adf.mf.api.amx.removeDomNode(dateTimePicker);
    adf.mf.api.amx.removeDomNode(overlayElement);
    dateTimePicker = null;
    overlayElement = null;
  };

  inputDate._customClearButtonTapHandler = function(event)
  {
    var eventData      = event.data;
    var id             = eventData["id"];
    var rawValues      = eventData["rawValues"];
    var chosenRawValue = rawValues["chosen"];

    // Clear the chosen value:
    inputDate._assignRawValueMembers(chosenRawValue, null);

    // Update the display:
    inputDate._populateTime(id, rawValues, true);
  };

  inputDate._customTimeTabTapHandler = function(event)
  {
    var eventData           = event.data;
    var id                  = eventData["id"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var lastRawValue        = rawValues["last"];
    var dateTabDiv          = document.getElementById(id + "_dateTab");
    var timeTabDiv          = document.getElementById(id + "_timeTab");

    if (adf.mf.internal.amx.containsCSSClassName(timeTabDiv, "amx-inputDate-picker-timeTab-selected"))
    {
      // Revert the chosen value back to the last value:
      inputDate._assignRawValueMembers(chosenRawValue, lastRawValue);
    }
    else // we are changing tabs
    {
      // Preserve the chosen value by assigning it to the last value:
      inputDate._assignRawValueMembers(lastRawValue, chosenRawValue);
    }

    // Update the values that are shown in the picker's UI:
    inputDate._populateDate(id, rawValues, true);
    inputDate._populateTime(id, rawValues, true); // Do this last so the spinner shows the time

    // Ensure the proper tab is selected:
    dateTabDiv.className = "amx-inputDate-picker-dateTab";
    timeTabDiv.className = "amx-inputDate-picker-timeTab-selected";
  };

  inputDate._customDateTabTapHandler = function(event)
  {
    var eventData           = event.data;
    var id                  = eventData["id"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var lastRawValue        = rawValues["last"];
    var dateTabDiv          = document.getElementById(id + "_dateTab");
    var timeTabDiv          = document.getElementById(id + "_timeTab");

    if (adf.mf.internal.amx.containsCSSClassName(dateTabDiv, "amx-inputDate-picker-dateTab-selected"))
    {
      // Revert the chosen value back to the last value:
      inputDate._assignRawValueMembers(chosenRawValue, lastRawValue);
    }
    else // we are changing tabs
    {
      // Preserve the chosen value by assigning it to the last value:
      inputDate._assignRawValueMembers(lastRawValue, chosenRawValue);
    }

    // Update the values that are shown in the picker's UI:
    inputDate._populateTime(id, rawValues, true);
    inputDate._populateDate(id, rawValues, true); // Do this last so the spinner shows the date

    // Ensure the proper tab is selected:
    dateTabDiv.className = "amx-inputDate-picker-dateTab-selected";
    timeTabDiv.className = "amx-inputDate-picker-timeTab";
  };

  inputDate._customIncrement1stTouchStartHandler = function(event)
  {
    // Handles month and hour incrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_inc1");

    // Change the button image to the highlighted version on touch start:
    inputDate._customIncrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the month
    {
      if (chosenRawValue["monthIndex"] < 11)
      {
        chosenRawValue["monthIndex"]++;
      }
      else
      {
        chosenRawValue["monthIndex"] = 0;
      }
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with the hour
    {
      if (chosenRawValue["hour"] < 12)
      {
        chosenRawValue["hour"]++;
      }
      else
      {
        chosenRawValue["hour"] = 1;
      }
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customIncrement2ndTouchStartHandler = function(event)
  {
    // Handles day and minute incrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_inc2");

    // Change the button image to the highlighted version on touch start:
    inputDate._customIncrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the day of month
    {
      var daysForThisMonth = inputDate._daysInMonth(chosenRawValue);
      if (chosenRawValue["dayNumber"] < daysForThisMonth)
      {
        chosenRawValue["dayNumber"]++;
      }
      else
      {
        chosenRawValue["dayNumber"] = 1;
      }
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with the minutes
    {
      if (chosenRawValue["min"] < 59)
      {
        chosenRawValue["min"]++;
      }
      else
      {
        chosenRawValue["min"] = 0;
      }
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customIncrement3rdTouchStartHandler = function(event)
  {
    // Handles year and AM/PM incrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_inc3");

    // Change the button image to the highlighted version on touch start:
    inputDate._customIncrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the year
    {
      chosenRawValue["year"]++;
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with the am/pm
    {
      chosenRawValue["isPm"] = !chosenRawValue["isPm"];
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customDecrement1stTouchStartHandler = function(event)
  {
    // Handles month and hour decrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_dec1");

    // Change the button image to the highlighted version on touch start:
    inputDate._customDecrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the month
    {
      if (chosenRawValue["monthIndex"] > 0)
      {
        chosenRawValue["monthIndex"]--;
      }
      else
      {
        chosenRawValue["monthIndex"] = 11;
      }
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with the hour
    {
      if (chosenRawValue["hour"] > 1)
      {
        chosenRawValue["hour"]--;
      }
      else
      {
        chosenRawValue["hour"] = 12;
      }
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customDecrement2ndTouchStartHandler = function(event)
  {
    // Handles day and minute decrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_dec2");

    // Change the button image to the highlighted version on touch start:
    inputDate._customDecrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the day of month
    {
      var daysForThisMonth = inputDate._daysInMonth(chosenRawValue);
      if (chosenRawValue["dayNumber"] > 1 &&
          chosenRawValue["dayNumber"] <= daysForThisMonth)
      {
        chosenRawValue["dayNumber"]--;
      }
      else
      {
        chosenRawValue["dayNumber"] = daysForThisMonth;
      }
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with the minutes
    {
      if (chosenRawValue["min"] > 0)
      {
        chosenRawValue["min"]--;
      }
      else
      {
        chosenRawValue["min"] = 59;
      }
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customDecrement3rdTouchStartHandler = function(event)
  {
    // Handles year and AM/PM decrementing:
    var eventData           = event.data;
    var id                  = eventData["id"];
    var inputType           = eventData["inputType"];
    var rawValues           = eventData["rawValues"];
    var chosenRawValue      = rawValues["chosen"];
    var spinningDateValues  = inputDate._isSpinningDateValues(id, inputType);
    var spinnerElement      = document.getElementById(id + "_dec3");

    // Change the button image to the highlighted version on touch start:
    inputDate._customDecrementTouchStartStyling(spinnerElement);

    // Make the value non-cleared if applicable:
    inputDate._choosePresentValueIfEmpty(id, rawValues, spinningDateValues);

    if (spinningDateValues) // dealing with the year
    {
      chosenRawValue["year"]--;
      inputDate._populateDate(id, rawValues, false);
    }
    else // dealing with time spinners
    {
      chosenRawValue["isPm"] = !chosenRawValue["isPm"];
      inputDate._populateTime(id, rawValues, false);
    }
  };

  inputDate._customIncrementTouchEndHandler = function(event)
  {
    var spinnerId = event.data;
    var spinnerElement = document.getElementById(spinnerId);
    adf.mf.internal.amx.removeCSSClassName(spinnerElement, "amx-inputDate-incrementButton-selected");
    adf.mf.internal.amx.addCSSClassName(spinnerElement, "amx-inputDate-incrementButton");
  };

  inputDate._customDecrementTouchEndHandler = function(event)
  {
    var spinnerId = event.data;
    var spinnerElement = document.getElementById(spinnerId);
    adf.mf.internal.amx.removeCSSClassName(spinnerElement, "amx-inputDate-decrementButton-selected");
    adf.mf.internal.amx.addCSSClassName(spinnerElement, "amx-inputDate-decrementButton");
  };

  inputDate._customIncrementTouchStartStyling = function(spinnerElement)
  {
    adf.mf.internal.amx.removeCSSClassName(spinnerElement, "amx-inputDate-incrementButton");
    adf.mf.internal.amx.addCSSClassName(spinnerElement, "amx-inputDate-incrementButton-selected");
  };

  inputDate._customDecrementTouchStartStyling = function(spinnerElement)
  {
    adf.mf.internal.amx.removeCSSClassName(spinnerElement, "amx-inputDate-decrementButton");
    adf.mf.internal.amx.addCSSClassName(spinnerElement, "amx-inputDate-decrementButton-selected");
  };

  inputDate._isSpinningDateValues = function(id, inputType)
  {
    // We are dealing with date spinners if the "date" tab of the datetime mode
    // is selected or if inputType is either date or unspecified:
    var dateTabDiv = document.getElementById(id + "_dateTab");
    var spinningDateValues =
      adf.mf.internal.amx.containsCSSClassName(dateTabDiv, "amx-inputDate-picker-dateTab-selected") ||
      (inputType != "datetime" && inputType != "time");
    return spinningDateValues;
  }

  inputDate._choosePresentValueIfEmpty = function(id, rawValues, dealingWithDateSpinners)
  {
    var chosenRawValue  = rawValues["chosen"];
    var presentRawValue = rawValues["present"];
    if (inputDate._isRawValueEmpty(chosenRawValue))
    {
      // The value was cleared so we need to set it to the present point in time to adjust it:
      inputDate._assignRawValueMembers(chosenRawValue, presentRawValue);
      if (dealingWithDateSpinners)
      {
        inputDate._populateTime(id, rawValues, true);
        inputDate._populateDate(id, rawValues, true); // Do this last so the spinner shows the date
      }
      else
      {
        inputDate._populateDate(id, rawValues, true);
        inputDate._populateTime(id, rawValues, true); // Do this last so the spinner shows the time
      }
    }
  };

  inputDate._createHtml5InputDate = function(amxNode, field, value, inputType, dateObject)
  {
    var dateLabel = document.createElement("input");
    dateLabel.setAttribute("class", "amx-inputDate-content");
    dateLabel.setAttribute("type", inputType);
    field.fieldValue.appendChild(dateLabel);
    if (inputType == "datetime")
    {
      // iOS 7 dropped type="datetime" so we have to use type="datetime-local"
      // and convert the actual value between those types.
      // Since we are giving the browser a value, it wants a datetime-local
      // value and we need to convert it from a datetime value since that's our
      // tag's API:
      dateLabel.setAttribute("type", "datetime-local");
      dateLabel.setAttribute("data-datetime-value", value);
      dateLabel.value = inputDate._toDateTimeLocalString(value);
    }
    else // use the value directly
    {
      dateLabel.value = value;
    }
    adf.mf.internal.amx._setNonPrimitiveElementData(dateLabel, "value", dateObject);
    adf.mf.internal.amx.registerFocus(dateLabel);
    adf.mf.internal.amx.registerBlur(
      dateLabel,
      function(event)
      {
        var oldDate = adf.mf.internal.amx._getNonPrimitiveElementData(dateLabel, "value");
        var newDate;
        if (dateLabel.value === "")
        {
          // The value is set to "" when the user clicks "Clear" on the picker.  When that happens we simply want to set the new value to null
          newDate = {};
          newDate[".null"] = true;
        }
        else // The value is an actual date/time so we create a Date object
        {
          if (inputType === "time")
          {
            if (inputDate._isValidDate(oldDate))
            {
              newDate = new Date(oldDate.getTime());
            }
            else
            {
              newDate = new Date();
            }
            adf.mf.internal.amx.updateTime(newDate, dateLabel.value);
          }
          else if (inputType === "date")
          {
            if (inputDate._isValidDate(oldDate))
            {
              newDate = new Date(oldDate.getTime());
            }
            else
            {
              newDate = new Date();
            }
            adf.mf.internal.amx.updateDate(newDate, dateLabel.value);
          }
          else // datetime
          {
            // iOS 7 dropped type="datetime" so we have to use type="datetime-local"
            // and convert the actual value between those types.
            // Since we are asking the browser for a value, it is now giving us
            // a datetime-local value and we need to convert it to a datetime
            // value since that's our tag's API:
            var dateTimeValue = dateLabel.value;
            dateLabel.setAttribute("data-datetime-value", dateTimeValue);
            dateTimeValue =
              inputDate._toDateTimeIsoString(inputDate._fillDateText(dateTimeValue));

            newDate = new Date(dateTimeValue);
            if (inputDate._isValidDate(oldDate))
            {
              newDate.setMilliseconds(oldDate.getMilliseconds());
            }
          }
        }

        // if old and new date are null or if they represent the same time, we don't fire an event
        if ((newDate[".null"] == true && oldDate[".null"] == true) ||
          (inputDate._isValidDate(newDate) && inputDate._isValidDate(oldDate) && newDate.getTime() == oldDate.getTime()))
        {
          // do nothing
        }
        else
        {
          // old and new date are different so fire the event
          var newValue;
          if (inputDate._isValidDate(newDate))
          {
            newValue = newDate.toISOString();
          }
          else
          {
            newValue = newDate;
          }

          var oldValue;
          if (inputDate._isValidDate(oldDate))
          {
            oldValue = oldDate.toISOString();
          }
          else
          {
            oldValue = oldDate;
          }

          var vce = new amx.ValueChangeEvent(oldValue, newValue);
          adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);
        }

        adf.mf.internal.amx._setNonPrimitiveElementData(dateLabel, "value", newDate);
      });
    adf.mf.api.amx.addBubbleEventListener(dateLabel, "tap", function(event)
    {
      // Stop propagation of the event to parent components
      event.stopPropagation();
    });

    // if disabled is set to true for iOS
    var disabled = amxNode.getAttribute("disabled");
    if (disabled == true)
    {
      dateLabel.setAttribute("disabled", disabled);
      // Adding WAI-ARIA Attribute for the disabled state
      dateLabel.setAttribute("aria-disabled", disabled);
    }
  };

  /*
   * Examples of datetime:
   * - 2013-10-15T20:40:20.000Z
   * - 2013-10-15T14:40:20Z
   *
   * Examples of datetime-local:
   * - 2013-10-15T14:40:20.000
   * - 2013-10-15T14:40:20.000+00:00
   * - 2013-10-15T14:40:20.000-00:00
   * - 2013-10-15T14:40:20
   * - 2013-10-15T14:40:20+00:00
   * - 2013-10-15T14:40:20-00:00
   */

  /**
   * Converts an HTML5 input type="datetime" value to a type="datetime-local" value.
   * @param {String} an HTML5 input type="datetime" value
   * @return {String} blank or an HTML5 input type="datetime-local" value
   */
  inputDate._toDateTimeLocalString = function(dateTimeIsoString)
  {
    try
    {
      if (dateTimeIsoString == null || dateTimeIsoString == "")
        return "";

      // Use the current local timezone offset to do the conversion:
      var dateObj = new Date(dateTimeIsoString);
      var timezoneOffset = dateObj.getTimezoneOffset();
      dateObj.setMinutes(dateObj.getMinutes() - timezoneOffset);
      var dateTimeLocalString = dateObj.toISOString().replace("Z", "");
      return inputDate._fillDateText(dateTimeLocalString);
    }
    catch (e)
    {
      return "";
    }
  }

  /**
   * Converts an HTML5 input type="datetime-local" value to a type="datetime" value.
   * @param {String} an HTML5 input type="datetime-local" value
   * @return {String} blank or an HTML5 input type="datetime" value
   */
  inputDate._toDateTimeIsoString = function(dateTimeLocalString)
  {
    try
    {
      if (dateTimeLocalString == null || dateTimeLocalString == "")
        return "";

      // Format the local string for better browser support (e.g. Firefox 21):
      var tIndex = dateTimeLocalString.indexOf("T");
      var timePortion = dateTimeLocalString.substring(tIndex);
      if (timePortion.indexOf("-") == -1 && timePortion.indexOf("+") == -1)
      {
        // Then there was no timezone offset given so let's add it:
        dateTimeLocalString += "+00:00";
      }

      // Use the current local timezone offset to do the conversion:
      var dateObj = new Date(dateTimeLocalString);
      var timezoneOffset = dateObj.getTimezoneOffset();
      dateObj.setMinutes(dateObj.getMinutes() + timezoneOffset);
      var dateTimeIsoString = dateObj.toISOString();
      return inputDate._fillDateText(dateTimeIsoString);
    }
    catch (e)
    {
      return "";
    }
  }

})();

