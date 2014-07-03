/* Copyright (c) 2011, 2012, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------------- */
/* ------------------- amx-inputNumberSlider.js ---------------- */
/* ------------------------------------------------------------- */

(function()
{
  var inputNumberSlider = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "inputNumberSlider");

  inputNumberSlider.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  inputNumberSlider.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;
    var disable = field.isDisable;
    var isReadOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));
    var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));
    var container = document.createElement("div");
    container.className = "container";
    field.fieldValue.appendChild(container);

    var slider = document.createElement("div");
    var sliderId = amxNode.getId() + "::slider";
    slider.setAttribute("id", sliderId);
    slider.className = "slider";

    // Add an extended target area to increase success with finger contact:
    var targetArea = document.createElement("div");
    targetArea.className = "amx-extendedTarget";
    slider.appendChild(targetArea);

    var valveBg = document.createElement("div");
    var valveBgId = amxNode.getId() + "::valveBg";
    valveBg.setAttribute("id", valveBgId);
    valveBg.className = "valve-background";
    slider.appendChild(valveBg);

    var valve = document.createElement("div");
    valve.className = "valve";

    // Add an extended target area to increase success with finger contact:
    var targetArea = document.createElement("div");
    targetArea.className = "amx-extendedTarget";
    valve.appendChild(targetArea);

    // Set this using ARIA slider role and set ARIA metadata
    // ARIA slider doesn't support aria-readOnly assignment, so we'll instead not assign ARIA
    // values when readOnly is set.
    if (!isReadOnly)
    {
      valve.setAttribute("role", "slider");
      var labelId = amxNode.getId() + "::lbl";
      valve.setAttribute("aria-labelledby", labelId);
      valve.setAttribute("aria-orientation", "horizontal");
      valve.setAttribute("aria-valuemin", amxNode.getAttribute("minimum"));
      valve.setAttribute("aria-valuemax", amxNode.getAttribute("maximum"));
      valve.setAttribute("aria-valuenow", amxNode.getAttribute("value"));
      if (disable)
        valve.setAttribute("aria-disabled", "true");
      if (isRequired)
        valve.setAttribute("aria-required", "true");
    }

    valveBg.appendChild(valve);

    var selected = document.createElement("div");
    var selectedId = amxNode.getId() + "::selected";
    selected.id = selectedId;
    selected.className = "selected";
    slider.appendChild(selected);

    if (isReadOnly)
    {
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-readOnly");
    }

    container.appendChild(slider);

    // for now, we do not add these buttons
    //var buttonUp = document.createElement("div");
    //var buttonDown = document.createElement("div");
    //inputTextNumber.append(buttonUp);
    //inputTextNumber.append(buttonDown);

    var minAttr = amxNode.getAttribute("minimum");
    if (minAttr != null && !isNaN(minAttr))
    {
      slider.setAttribute("data-min", minAttr);
      amxNode._min = minAttr * 1;
    }
    else
    {
      slider.setAttribute("data-min", 0);
      amxNode._min = 0;
    }

    var maxAttr = amxNode.getAttribute("maximum");
    if (maxAttr && !isNaN(maxAttr))
    {
      slider.setAttribute("data-max", maxAttr);
      amxNode._max = maxAttr * 1;
    }
    else
    {
      slider.setAttribute("data-max", 100);
      amxNode._max = 100;
    }

    var stepSizeAttr = amxNode.getAttribute("stepSize");
    if (stepSizeAttr != null)
    {
      slider.setAttribute("step", stepSizeAttr);
      amxNode._step = stepSizeAttr;
    }
    else
    {
      slider.setAttribute("step", 1);
      amxNode._step = 1;
    }

    var valueAttr = amxNode.getAttribute("value");
    if (valueAttr !== undefined)
    {
      slider.setAttribute("data-value", valueAttr);
      amxNode._currentValue = valueAttr * 1;
    }

    if (disable)
    {
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");
      var disableElem = document.createElement("div");
      disableElem.className = "disable";
      field.fieldValue.appendChild(disableElem);
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    if (!disable && !field.isReadOnly)
    {
      adf.mf.api.amx.addBubbleEventListener(slider, "tap", function(e)
        {
          // Stop propagation of the event to parent components
          event.stopPropagation();

          var pageX = e.pageX;
          if (pageX != undefined && pageX != 0)
          {
            pageX = e.pageX;
          }
          else
          {
            if (e.touches && e.touches.length > 0)
            {
              pageX = e.touches[0].pageX;
            }
            // on 'touchend' e.touches is empty, need to check e.changedTouches
            else if (e.changedTouches && e.changedTouches.length > 0)
            {
              pageX = e.changedTouches[0].pageX;
            }
            else
            {
              return;
            }
          }
          var startX = adf.mf.internal.amx.getElementLeft(slider);
          var deltaX = pageX - startX;
          var tapOffsetWithinSlider = deltaX / slider.offsetWidth;
          if (document.documentElement.dir == "rtl")
            tapOffsetWithinSlider = 1 - tapOffsetWithinSlider; // inverted
          var value = tapOffsetWithinSlider * (amxNode._max - amxNode._min) + amxNode._min;
          amxNode["_oldValue"] = amxNode._currentValue;
          event.data._setValue(value, amxNode);
          // set the amxNode value so that it stays in sync
          amxNode.setAttributeResolvedValue("value", amxNode._currentValue);
          var vce = new amx.ValueChangeEvent(amxNode._oldValue, amxNode._currentValue);
          adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",amxNode._currentValue, vce);
        },
        this);

      adf.mf.api.amx.addDragListener(valveBg,
        {
          start: function(event,dragExtra)
          {
            // Declare this element as the one that is currently handling drag events:
            var element = this;
            dragExtra.requestDragLock(element, true, true);
            event.preventDefault();
            event.stopPropagation();
            dragExtra.preventDefault = true;
            dragExtra.stopPropagation = true;
            amxNode["_oldValue"] = amxNode._currentValue;
          },
          drag: function(event,dragExtra)
          {
            event.preventDefault();
            event.stopPropagation();
            dragExtra.preventDefault = true;
            dragExtra.stopPropagation = true;
            var isRtl = (document.documentElement.dir == "rtl");
            var start = parseInt(isRtl ? valveBg.style.right : valveBg.style.left, 10);
            var offset = valveBg.offsetWidth / 2;
            start = start + (isRtl ? -dragExtra.deltaPageX : dragExtra.deltaPageX);
            var value = null;
            if (start < -offset)
            {
              start = -offset;
              value = amxNode._min;
            }
            else if (start > slider.offsetWidth - offset)
            {
              start = slider.offsetWidth - offset;
              value = amxNode._max;
            }
            // Checking to see if the value is not a number, set it to the min-value in that case
            else
            {
              if (isNaN(value))
              {
                value = amxNode._min;
              }
              value = (start + offset) / slider.offsetWidth * (amxNode._max - amxNode._min) + amxNode._min;
              value = Math.round(value / amxNode._step) * amxNode._step;
            }
            if (isRtl)
              valveBg.style.right = start+"px";
            else
              valveBg.style.left = start+"px";
            selected.style.width = (start+offset)+"px";
            slider.setAttribute("data-value", value);
            if (amxNode._currentValue != value)
            {
              amxNode._currentValue = value;
            }
          },
          end: function(event,dragExtra)
          {
            event.preventDefault();
            event.stopPropagation();
            dragExtra.preventDefault = true;
            dragExtra.stopPropagation = true;
            var valveBg = this;
            event.data._setValue(amxNode._currentValue, amxNode);
            // set the amxNode value so that it stays in sync
            amxNode.setAttributeResolvedValue("value", amxNode._currentValue);
            var vce = new amx.ValueChangeEvent(amxNode._oldValue, amxNode._currentValue);
            adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",amxNode._currentValue, vce);
            amxNode["_oldValue"] = amxNode._currentValue;
          }
        },
        this);
    }
    return domNode;
  };

  /**
   * Stash the current value on a private member of the amxNode and update the
   * position of the thumb along the bar.
   * @param {number} value the input value
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode
   */
  inputNumberSlider.prototype._setValue = function(value, amxNode)
  {
    var min = amxNode._min;
    var max = amxNode._max;
    var step = amxNode._step;
    var currentValue = amxNode._currentValue;
    var amxNodeId = amxNode.getId();
    var slider = document.getElementById(amxNodeId + "::slider");
    var valveBg = document.getElementById(amxNodeId + "::valveBg");
    var width = slider.offsetWidth;

    // Checking to see if the value is not a number, set it to the min-value in that case
    if (isNaN(value))
    {
      value = min;
    }
    value = Math.round(value / step) * step;

    if (value <= min)
    {
      value = min;
    }

    if (value >= max)
    {
      value = max;
    }

    var offset = valveBg.offsetWidth / 2;
    var start = (value - min)/(max - min) * width;

    if (document.documentElement.dir == "rtl")
      valveBg.style.right = (start - offset)+"px";
    else
      valveBg.style.left = (start - offset)+"px";

    var selected = document.getElementById(amxNodeId + "::selected");
    selected.style.width = start+"px";
    slider.setAttribute("data-value", value);

    if (currentValue != value)
    {
      amxNode._currentValue = value;
    }
  };

  inputNumberSlider.prototype.init = function(domNode, amxNode)
  {
    var amxNodeId = amxNode.getId();
    var slider = document.getElementById(amxNodeId + "::slider");
    var valveBg = document.getElementById(amxNodeId + "::valveBg");

    if (slider != null) // it will be null if not connected to the DOM
    {
      // Set the slider's initial position:
      this._setValue(slider.getAttribute("data-value") * 1, amxNode);
    }

    var eventData = {
      "typeHandler": this,
      "amxNode":     amxNode,
      "amxNodeId":   amxNodeId
    };

    // Listen if someone resizes the window:
    adf.mf.api.amx.addBubbleEventListener(window, "resize", this._handleResize, eventData);

    // Listen if someone explicitly queues a resize on my root element:
    adf.mf.api.amx.addBubbleEventListener(domNode, "resize", this._handleResize, eventData);
  };

  inputNumberSlider.prototype._handleResize = function(domEvent)
  {
    var eventData = domEvent.data;
    var typeHandler = eventData["typeHandler"];
    var amxNode = eventData["amxNode"];
    var amxNodeId = eventData["amxNodeId"];
    var slider = document.getElementById(amxNodeId + "::slider");
    var valveBg = document.getElementById(amxNodeId + "::valveBg");

    // Ensure element belongs to the document body:
    if (adf.mf.internal.amx.isAncestor(document.body, slider))
    {
      // Set the slider's position within the new geometry:
      typeHandler._setValue(slider.getAttribute("data-value") * 1, amxNode);
    }
    else
    {
      // Unregister the window resize handler:
      adf.mf.api.amx.removeBubbleEventListener(window, "resize", typeHandler._handleResize, eventData);
    }
  };

})();

