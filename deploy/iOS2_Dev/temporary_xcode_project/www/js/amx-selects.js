/* Copyright (c) 2011, 2012, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------ */
/* ------------------- amx-selects.js ------------------- */
/* ------------------------------------------------------ */

(function()
{
  var selectBooleanCheckbox = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectBooleanCheckbox");

  selectBooleanCheckbox.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectBooleanCheckbox.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domElement = field.fieldRoot;
    var isOn = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("value"));
    var disable = field.isDisable;
    // set css state
    if (isOn)
      adf.mf.internal.amx.addCSSClassName(domElement, "on");
    else
      adf.mf.internal.amx.addCSSClassName(domElement, "off");

    var checkbox = document.createElement("div");
    checkbox.className = "checkbox";

    // Adding WAI-ARIA role and state, the role must be set on the control itself for VO double
    // tap to work
    checkbox.setAttribute("role", "checkbox");
    if (isOn)
      checkbox.setAttribute("aria-checked", "true");
    else
      checkbox.setAttribute("aria-checked", "false");
    var isRequired = amxNode.getAttribute("required");
    if (isRequired == true)
      checkbox.setAttribute("aria-required", "true");

    // The checkbox has an aria-labelledby that normally refers to the labelId.
    // If there is no label value, or if simple=true, then the aria-labelledby refers to the
    // textId instead.
    var stampedId = amxNode.getId();
    var isSimple = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("simple"));
    var label = amxNode.getAttribute("label");
    var hasLabel = label != null && label.length > 0;
    // FUTURE should have central createSubId method to use. Also, label id construction repeated in amx-commonTags.js
    var labelId = stampedId + "::" + "lbl";
    var textId = stampedId + "::" + "txt";
    var accLabelId = (hasLabel && !isSimple) ? labelId : textId;
    checkbox.setAttribute("aria-labelledby", accLabelId);

    var imgCheck = document.createElement("div");
    imgCheck.className = "img-check";
    checkbox.appendChild(imgCheck);
    field.fieldValue.appendChild(checkbox);

    if (amxNode.getAttribute("text"))
    {
      var text = document.createElement("div");
      text.setAttribute("id", textId);
      text.className = "checkbox-text";
      text.textContent = amxNode.getAttribute("text");
      field.fieldValue.appendChild(text);
    }

    if (disable)
    {
      adf.mf.internal.amx.addCSSClassName(domElement, "amx-disabled");
      // Adding WAI-ARIA disabled state
      checkbox.setAttribute("aria-disabled", "true");
    }

    if (field.isReadOnly)
    {
      // Adding WAI-ARIA readonly state
      checkbox.setAttribute("aria-readonly", "true");
    }

    if (!field.isReadOnly && !disable)
    {
      adf.mf.api.amx.addBubbleEventListener(field.fieldValue, "tap", function(event)
        {
          if (adf.mf.api.amx.acceptEvent())
          {
            var newValue = !isOn;
            // set the amxNode value so that it stays in sync
            amxNode.setAttributeResolvedValue("value", newValue);
            var vce = new amx.ValueChangeEvent(!newValue, newValue);
            adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",newValue, vce);

            // update the UI (in case it is not a EL)
            isOn = !isOn;
            if (isOn)
            {
              adf.mf.internal.amx.addCSSClassName(domElement, "on");
              adf.mf.internal.amx.removeCSSClassName(domElement, "off");
            }
            else
            {
              adf.mf.internal.amx.addCSSClassName(domElement, "off");
              adf.mf.internal.amx.removeCSSClassName(domElement, "on");
            }

            // Stop propagation of the event to parent components
            event.stopPropagation();
          }
        });
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);
    return domElement;
  };

  var selectBooleanSwitch = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectBooleanSwitch");

  selectBooleanSwitch.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectBooleanSwitch.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;
    var isOn = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("value"));
    if (isOn)
      adf.mf.internal.amx.addCSSClassName(domNode, "on");
    else
      adf.mf.internal.amx.addCSSClassName(domNode, "off");

    if (field.isDisable)
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");

    var onLabel = amxNode.getAttribute("onLabel") || "ON";
    var offLabel = amxNode.getAttribute("offLabel") || "OFF";

    var switchElement = document.createElement("div");

    if (!field.isReadOnly)
    {
      switchElement.className = "switch";
      field.fieldValue.appendChild(switchElement);
      var labelOn = document.createElement("label");

      // Because ARIA sees this as a checkbox, we'll hide the confusing yes/no labels.
      labelOn.setAttribute("aria-hidden", "true");

      labelOn.className = "label-on";
      labelOn.textContent = amx.getTextValue(onLabel);
      switchElement.appendChild(labelOn);
      var labelOff = document.createElement("label");

      // Because ARIA sees this as a checkbox, we'll hide the confusing yes/no labels.
      labelOff.setAttribute("aria-hidden", "true");

      labelOff.className = "label-off";
      labelOff.textContent = amx.getTextValue(offLabel);
      switchElement.appendChild(labelOff);
      var button = document.createElement("div");
      button.className = "switch-button";

      // Add WAI-ARIA role of checkbox (closest match), the role must be set on the control
      // itself for VO double tap to work
      button.setAttribute("role", "checkbox");
      var stampedId = amxNode.getId();
      var labelId = stampedId + "::" + "lbl";
      button.setAttribute("aria-labelledby", labelId);
      if (isOn)
        button.setAttribute("aria-checked", "true");
      else
        button.setAttribute("aria-checked", "false");
      if (field.isDisable)
        button.setAttribute("aria-disabled", "true");
      var isRequired = amxNode.getAttribute("required");
      if (isRequired == true)
        button.setAttribute("aria-required", "true");

      switchElement.appendChild(button);

      if (!field.isDisable)
      {
        adf.mf.api.amx.addBubbleEventListener(switchElement, "tap", function()
          {
            if (adf.mf.api.amx.acceptEvent())
            {
              var newValue = !isOn;
              // set the amxNode value so that it stays in sync
              amxNode.setAttributeResolvedValue("value", newValue);
              var vce = new amx.ValueChangeEvent(!newValue, newValue);
              adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",newValue, vce);

              // update the UI (in case it is not a EL)
              isOn = !isOn;
              if (isOn)
              {
                adf.mf.internal.amx.addCSSClassName(domNode, "on");
                adf.mf.internal.amx.removeCSSClassName(domNode, "off");
              }
              else
              {
                adf.mf.internal.amx.addCSSClassName(domNode, "off");
                adf.mf.internal.amx.removeCSSClassName(domNode, "on");
              }

              // Stop propagation of the event to parent components
              event.stopPropagation();
            }
          });
      }
    }
    else
    {
      switchElement.className = "readOnlyLabel";
      switchElement.textContent = (isOn ? amx.getTextValue(onLabel) : amx.getTextValue(offLabel));
      field.fieldValue.appendChild(switchElement);
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);
    return domNode;
  };


  var selectOneButton = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectOneButton");

  selectOneButton.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectOneButton.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;
    var selectItemsContainer;
    var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));

    if (field.isReadOnly)
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "readOnlyLabel";
    }
    else
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "selectItemsContainer";
    }
    field.fieldValue.appendChild(selectItemsContainer);

    //vertical layout
    if (amxNode.getAttribute("layout") === "vertical")
    {
      adf.mf.internal.amx.addCSSClassName(domNode, "vertical");
    }

    // Set this using ARIA listbox/option roles, as they seem to work best for select one
    // choice type components. Assign other associated acc metadata.
    selectItemsContainer.setAttribute("role", "radiogroup");
    selectItemsContainer.setAttribute("aria-multiselectable", "false");
    var labelId = amxNode.getId() + "::" + "lbl";
    selectItemsContainer.setAttribute("aria-labelledby", labelId);
    if (field.isReadOnly)
      selectItemsContainer.setAttribute("aria-readOnly", "true");
    if (isRequired)
      selectItemsContainer.setAttribute("aria-required", "true");
    if (field.isDisable)
    {
      selectItemsContainer.setAttribute("aria-disabled", "true");
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");
    }

    // event handling
    if (!field.isDisable)
    {
      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "tap", function(event)
        {
          if (adf.mf.api.amx.acceptEvent() && !field.isReadOnly)
          {
            var selectItem = event.target;
            while (selectItem != null &&
                   selectItem.className.indexOf("amx-selectOneButton") == -1 &&
                   selectItem.className.indexOf("amx-selectItem") == -1)
            {
              selectItem = selectItem.parentNode; // walk up until we find an element we care about
            }
            if (selectItem.className.indexOf("amx-selectItem") == -1)
              return;
            var oldValue = null;
            var foundSelectedItems = selectItemsContainer.getElementsByClassName("amx-selected");
            if (foundSelectedItems.length > 0)
            {
              var foundSelected = foundSelectedItems[0];
              oldValue = adf.mf.internal.amx._getNonPrimitiveElementData(foundSelected, "labelValue").value;
              adf.mf.internal.amx.removeCSSClassName(foundSelected, "amx-selected");
              foundSelected.setAttribute("aria-checked", "false");
            }
            adf.mf.internal.amx.addCSSClassName(selectItem, "amx-selected");
            selectItem.setAttribute("aria-checked", "false");
            var labelValue = adf.mf.internal.amx._getNonPrimitiveElementData(selectItem, "labelValue");
            var newValue = labelValue.value;
            // set the amxNode value so that it stays in sync
            amxNode.setAttributeResolvedValue("value", newValue);
            var vce = new amx.ValueChangeEvent(oldValue, newValue);
            adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);

            // Stop propagation of the event to parent components
            event.stopPropagation();
          }
        });
    }

    var labelValues = getSelectItemLabelValues(amxNode);
    for (var key in labelValues)
    {
      var labelValue = labelValues[key];
      if (field.isReadOnly)
      {
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          selectItemsContainer.textContent = labelValue.label;
        }
      }
      else
      {
        var selectItem = document.createElement("div");
        selectItem.className = "amx-selectItem";
        selectItem.textContent = labelValue.label;
        adf.mf.internal.amx._setNonPrimitiveElementData(selectItem, "labelValue", labelValue);

        if (amxNode.getAttribute("layout") !== "vertical")
        {
          selectItem.style.width = 99/labelValues.length+"%";
        }

        // Set this using ARIA radio role and set aria-checked where appropriate
        selectItem.setAttribute("role", "radio");

        selectItemsContainer.appendChild(selectItem);
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          adf.mf.internal.amx.addCSSClassName(selectItem, "amx-selected");
          selectItem.setAttribute("aria-checked", "true");
        }
        else
        {
          selectItem.setAttribute("aria-checked", "false");
        }
      }
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return domNode;
  };

  var selectOneRadio = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectOneRadio");

  selectOneRadio.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectOneRadio.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;



    var selectItemsContainer = document.createElement("div");
    selectItemsContainer.className = "selectItemsContainer";
    if (field.isReadOnly)
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "readOnlyLabel";
      // Adding WAI-ARIA Attribute to the markup for the readonly state
      selectItemsContainer.setAttribute("aria-readonly", "true");
    }
    field.fieldValue.appendChild(selectItemsContainer);

    // Set this using ARIA radiogroup role and set ARIA metadata
    selectItemsContainer.setAttribute("role", "radiogroup");
    var labelId = amxNode.getId() + "::" + "lbl";
    selectItemsContainer.setAttribute("aria-labelledby", labelId);
    if (field.isReadOnly)
      selectItemsContainer.setAttribute("aria-readOnly", "true");
    var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));
    if (isRequired)
      selectItemsContainer.setAttribute("aria-required", "true");
    if (field.isDisable)
    {
      selectItemsContainer.setAttribute("aria-disabled", "true");
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");
    }

    // event handling
    if (!field.isDisable && !field.isReadOnly)
    {
      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "tap", function(event)
        {
          if (adf.mf.api.amx.acceptEvent() && !field.isReadOnly)
          {
            var selectItem = event.target;
            while (selectItem != null &&
                   selectItem.className.indexOf("amx-selectOneRadio") == -1 &&
                   selectItem.className.indexOf("amx-selectItem") == -1)
            {
              selectItem = selectItem.parentNode; // walk up until we find an element we care about
            }
            if (selectItem.className.indexOf("amx-selectItem") == -1)
              return;
            var oldValue = null;
            var foundSelectedItems = selectItemsContainer.getElementsByClassName("amx-selected");
            if (foundSelectedItems.length > 0)
            {
              var foundSelected = foundSelectedItems[0];
              oldValue = adf.mf.internal.amx._getNonPrimitiveElementData(foundSelected, "labelValue").value;
              adf.mf.internal.amx.removeCSSClassName(foundSelected, "amx-selected");
              selectItem.setAttribute("aria-checked", "false");
            }
            adf.mf.internal.amx.addCSSClassName(selectItem, "amx-selected");
            selectItem.setAttribute("aria-checked", "true");
            var labelValue = adf.mf.internal.amx._getNonPrimitiveElementData(selectItem, "labelValue");
            var newValue = labelValue.value;
            // set the amxNode value so that it stays in sync
            amxNode.setAttributeResolvedValue("value", newValue);
            var vce = new amx.ValueChangeEvent(oldValue, newValue);
            adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);

            // Stop propagation of the event to parent components
            event.stopPropagation();
          }
        });
    }

    var labelValues = getSelectItemLabelValues(amxNode);
    for (var key in labelValues)
    {
      var labelValue = labelValues[key];
      if (field.isReadOnly)
      {
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          selectItemsContainer.textContent = labelValue.label;
        }
      }
      else
      {
        var selectItem = document.createElement("div");
        selectItem.className = "amx-selectItem";
        if (isRequired)
          selectItem.setAttribute("aria-required", "true");
        var radio = document.createElement("div");
        radio.className = "radio";
        selectItem.appendChild(radio);
        radio.appendChild(document.createTextNode(labelValue.label));
        //added for bug 14094617 to support checkmark-based radio buttons
        var checkmark = document.createElement("div");
        checkmark.className = "checkmark";
        radio.appendChild(checkmark);

        // TODO: NEED to display the element to create the radio buttons to be like the design
        adf.mf.internal.amx._setNonPrimitiveElementData(selectItem, "labelValue", labelValue);

        selectItemsContainer.appendChild(selectItem);

        // Assign ARIA radio role and ARIA checked state
        selectItem.setAttribute("role", "radio");
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          adf.mf.internal.amx.addCSSClassName(selectItem, "amx-selected");
          selectItem.setAttribute("aria-checked", "true");
        }
        else
        {
          selectItem.setAttribute("aria-checked", false);
        }
      }
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return domNode;
  };

  var selectManyCheckbox = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectManyCheckbox");
// TODO: finish implementing with the new way (right now, lot of code from oneRadio)

  selectManyCheckbox.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectManyCheckbox.prototype.render = function(amxNode)
  {
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;
    var selectItemsContainer = document.createElement("div");
    selectItemsContainer.className = "selectItemsContainer";
    if (field.isReadOnly)
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "readOnlyLabel";
    }
    field.fieldValue.appendChild(selectItemsContainer);

    if (field.isDisable)
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");

    // event handling
    if (!field.isDisable)
    {
      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "tap", function(event)
        {
          if (adf.mf.api.amx.acceptEvent() && !field.isReadOnly)
          {
            var selectItem = event.target;
            while (selectItem != null &&
                   selectItem.className.indexOf("amx-selectManyCheckbox") == -1 &&
                   selectItem.className.indexOf("amx-selectItem") == -1)
            {
              selectItem = selectItem.parentNode; // walk up until we find an element we care about
            }
            if (selectItem.className.indexOf("amx-selectItem") == -1)
              return;
            var oldValues = [];
            var foundSelectedItems = selectItemsContainer.getElementsByClassName("amx-selected");
            var foundSelectedItemCount = foundSelectedItems.length;
            for (var i=0; i<foundSelectedItemCount; i++)
            {
              var foundSelectItem = foundSelectedItems[i];
              var valueToPush = adf.mf.internal.amx._getNonPrimitiveElementData(foundSelectItem, "labelValue").value;
              oldValues.push(valueToPush);
            }
            var notSelected = adf.mf.internal.amx.getCSSClassNameIndex(selectItem.className, "amx-selected") == -1;
            adf.mf.internal.amx.addOrRemoveCSSClassName(notSelected, selectItem, "amx-selected");
            var values = [];
            foundSelectedItems = selectItemsContainer.getElementsByClassName("amx-selected");
            foundSelectedItemCount = foundSelectedItems.length;
            for (var i=0; i<foundSelectedItemCount; i++)
            {
              var foundSelectItem = foundSelectedItems[i];
              var valueToPush = adf.mf.internal.amx._getNonPrimitiveElementData(foundSelectItem, "labelValue").value;
              values.push(valueToPush);
            }
            // set the amxNode value so that it stays in sync
            amxNode.setAttributeResolvedValue("value", values);
            var vce = new amx.ValueChangeEvent(oldValues, values);
            adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", values, vce);

            // Stop propagation of the event to parent components
            event.stopPropagation();
          }
        });
    }

    // render the children and return the deferred for the domNode
    var labelValues = getSelectItemLabelValues(amxNode);
    for (var key in labelValues)
    {
      var labelValue = labelValues[key];
      var values = amxNode.getAttribute("value");
      if (!adf.mf.internal.util.is_array(values))
      {
        values = new Array(values);
      }
      if (field.isReadOnly)
      {
        if (values.indexOf(labelValue.value) > 0)
        {
          selectItemsContainer.appendChild(document.createTextNode(", " + labelValue.label));
        }
        if (values.indexOf(labelValue.value) == 0)
        {
          selectItemsContainer.appendChild(document.createTextNode(labelValue.label));
        }
      }
      else
      {
        var selectItem = document.createElement("div");
        selectItem.className = "amx-selectItem";
        var checkbox = document.createElement("div");
        checkbox.className = "checkbox";

        // Adding ARIA role and state, the role must be set on the control itself for VO double
        // tap to work
        checkbox.setAttribute("role", "checkbox");
        var isChecked = values.indexOf(labelValue.value) > -1;
        if (isChecked)
          checkbox.setAttribute("aria-checked", "true");
        else
          checkbox.setAttribute("aria-checked", "false");
        var isRequired = amxNode.getAttribute("required");
        if (isRequired == true)
          checkbox.setAttribute("aria-required", "true");
        if (field.isDisable)
          checkbox.setAttribute("aria-disabled", "true");
        // Build a stamped text Id including the index of the label value
        var stampedTextId = amxNode.getId() + ":" + labelValues.indexOf(labelValue) + "::" + "txt";
        checkbox.setAttribute("aria-labelledby", stampedTextId);

        selectItem.appendChild(checkbox);
        var imgCheck = document.createElement("div");
        imgCheck.className = "img-check";
        checkbox.appendChild(imgCheck);
        var checkboxText = document.createElement("div");
        checkboxText.setAttribute("id", stampedTextId);
        checkboxText.className = "checkbox-text";
        selectItem.appendChild(checkboxText);
        checkboxText.textContent = labelValue.label;
        adf.mf.internal.amx._setNonPrimitiveElementData(selectItem, "labelValue", labelValue);

        selectItemsContainer.appendChild(selectItem);

        if (isChecked)
          adf.mf.internal.amx.addCSSClassName(selectItem, "amx-selected");
      }
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return domNode;
  };

  var selectOneChoice = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectOneChoice");
// TODO: needs to implement new way

  selectOneChoice.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  selectOneChoice.prototype.render = function(amxNode, id)
  {
    // TODO here is the first new way, but we need to continue the new way.
    var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
    var domNode = field.fieldRoot;

    var selectItemsContainer;
    var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));
    var isDisabled = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled"));
    var isReadOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));


    var labelValues = getSelectItemLabelValues(amxNode);
    isDisabled = isDisabled || (labelValues.length == 0);

    if (isReadOnly)
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "selectItemsContainer";
    }
    else
    {
      selectItemsContainer = document.createElement("select");
      selectItemsContainer.className = "selectItemsContainer";
    }

    // Set this using ARIA listbox role and set ARIA metadata
    selectItemsContainer.setAttribute("role", "listbox");
    selectItemsContainer.setAttribute("aria-multiselectable", "false");
    var labelId = id + "::" + "lbl";
    selectItemsContainer.setAttribute("aria-labelledby", labelId);
    if (isReadOnly)
      selectItemsContainer.setAttribute("aria-readOnly", "true");
    if (isRequired)
      selectItemsContainer.setAttribute("aria-required", "true");
    if (isDisabled)
    {
      selectItemsContainer.setAttribute("aria-disabled", "true");
      selectItemsContainer.setAttribute("disabled", "true");
    }

    field.fieldValue.appendChild(selectItemsContainer);

    adf.mf.internal.amx.registerFocus(selectItemsContainer);
    adf.mf.internal.amx.registerBlur(selectItemsContainer);

    adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "tap", function(event)
    {
      // Stop propagation of the event to parent components
      event.stopPropagation();
    });

    adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "change", function(event)
    {
      if (adf.mf.api.amx.acceptEvent() && !field.isReadOnly && !isDisabled)
      {
        var selectItem = this.options[this.selectedIndex];

        var labelValue = adf.mf.internal.amx._getNonPrimitiveElementData(selectItem, "labelValue");
        var newValue = labelValue.value;
        var oldValue = adf.mf.internal.amx._getNonPrimitiveElementData(domNode, "_oldValue");
        if (oldValue == null)
        {
          oldValue = undefined;
        }
        // set the amxNode value so that it stays in sync
        amxNode.setAttributeResolvedValue("value", newValue);
        var vce = new amx.ValueChangeEvent(oldValue, newValue);
        adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);
        adf.mf.internal.amx._setNonPrimitiveElementData(domNode, "_oldValue", labelValue.value);
      }
    });

    if (isReadOnly != true && isDisabled == false)
    {
      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "focus", handleSelectElementFocus, id);
      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "blur", handleSelectElementBlur, id);
    }

    // TODO: need to do the return like above.
    for (var key in labelValues)
    {
      var labelValue = labelValues[key];
      if (field.isReadOnly)
      {
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          selectItemsContainer.textContent = labelValue.label;
        }
      }
      else
      {
        var selectItem = document.createElement("option");
        selectItem.value = labelValue.value;
        selectItem.className = "amx-selectItem";
        selectItem.textContent = labelValue.label;

        adf.mf.internal.amx._setNonPrimitiveElementData(selectItem, "labelValue", labelValue);

        selectItemsContainer.appendChild(selectItem);

        // Assign ARIA option role and ARIA selected state
        selectItem.setAttribute("role", "option");
        if (amxNode.getAttribute("value") == labelValue.value)
        {
          selectItem.setAttribute("selected", true);
          selectItem.setAttribute("aria-selected", true);
          adf.mf.internal.amx._setNonPrimitiveElementData(domNode, "_oldValue", labelValue.value);
        }
        else
        {
          selectItem.setAttribute("aria-selected", false);
        }
      }
    }

    if (adf.mf.api.amx.isValueFalse(amxNode.getAttribute("isReadOnly")))
    {
      var selectedIndex = selectItemsContainer.selectedIndex;
      if (selectedIndex > 0)
      {
        var selectedItem = selectItemsContainer.options[selectedIndex];
        var oldValue = adf.mf.internal.amx._getNonPrimitiveElementData(selectedItem, "labelValue");
        adf.mf.internal.amx._setNonPrimitiveElementData(domNode, "_oldValue", oldValue.value);
      }
    }

    // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return domNode;
  };

  var forceCustomSelectManyChoice = false; // use true for testing it on iOS/desktop
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
        forceCustomSelectManyChoice = true;
      else if (skinOverride != null && skinOverride.indexOf("android") != -1)
        forceCustomSelectManyChoice = true;
    }
  }

  var selectManyChoice = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectManyChoice");

  selectManyChoice.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  /**
   * Main create function
   */
  selectManyChoice.prototype.render = function(amxNode, id)
  {
    if (adf.mf.internal.amx.agent["type"] == "Android" || forceCustomSelectManyChoice)
    {
      var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
      var rootDomNode = field.fieldRoot;
      var selectManyRoot = document.createElement("div");
      var selectManySpan = document.createElement("span");

      this._updateText(selectManySpan, amxNode.getAttribute("value"), amxNode);
      selectManyRoot.appendChild(selectManySpan);
      adf.mf.internal.amx._setNonPrimitiveElementData(selectManyRoot, "value", amxNode.getAttribute("value"));

      // calls applyRequiredMarker in amx-core.js to determine and implement required/showRequired style
      adf.mf.api.amx.applyRequiredMarker(amxNode, field);

      var disabled = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled"));
      var selectItemLabelValues = getSelectItemLabelValues(amxNode);
      if (disabled == false && selectItemLabelValues.length == 0)
      {
        disabled = true;
        // The generic code in amx-core won't know to add the amx-disabled class so it needs to be added here
        rootDomNode.setAttribute("class", rootDomNode.getAttribute("class") + " amx-disabled");
      }

      if (disabled)
      {
        rootDomNode.setAttribute("aria-disabled", "true");
      }

      var isReadOnly = amxNode.getAttribute("readOnly");
      if (adf.mf.api.amx.isValueTrue(isReadOnly))
      {
        selectManyRoot.setAttribute("class", "amx-selectManyChoice-root-readOnly");
        selectManySpan.setAttribute("class", "amx-selectManyChoice-text-readOnly");
      }
      else
      {
        selectManyRoot.setAttribute("class", "amx-selectManyChoice-root");
        selectManySpan.setAttribute("class", "amx-selectManyChoice-text");

        var selectManyIconWrapper = document.createElement("div");
        selectManyIconWrapper.setAttribute("class", "amx-selectManyChoice-iconWrapper");
        var selectManyIcon = document.createElement("div");
        selectManyIcon.setAttribute("class", "amx-selectManyChoice-iconStyle");
        selectManyRoot.appendChild(selectManyIconWrapper);
        selectManyIconWrapper.appendChild(selectManyIcon);

        var populatePickerItems = function(selectManyPickerItemsContainer, selectItemLabelValues, values)
        {
          for (var key in selectItemLabelValues)
          {
            var labelValue = selectItemLabelValues[key];
            // item container
            var pickerItem = document.createElement("div");
            pickerItem.setAttribute("class", "amx-selectManyChoice-picker-item");
            // item label
            var pickerItemLabel = document.createElement("div");
            pickerItemLabel.textContent = labelValue.label;
            pickerItemLabel.setAttribute("class", "amx-selectManyChoice-picker-item-centered-label");
            // item checkmark
            var pickerItemCheckmark = document.createElement("div");
            pickerItemCheckmark.setAttribute("class", "amx-selectManyChoice-picker-item-checkmark");
            if (values != null && values.indexOf(labelValue.value) != -1)
            {
              adf.mf.internal.amx.addCSSClassName(pickerItemCheckmark, "checked");
            }
            pickerItem.appendChild(pickerItemLabel);
            pickerItem.appendChild(pickerItemCheckmark);
            adf.mf.internal.amx._setNonPrimitiveElementData(pickerItem, "itemValue", labelValue.value);
            adf.mf.api.amx.addBubbleEventListener(pickerItem, "tap", function()
              {
                var checkmark = this.children[1];
                var notChecked = adf.mf.internal.amx.getCSSClassNameIndex(checkmark.className, "checked") == -1;
                if (notChecked)
                {
                  adf.mf.internal.amx.addCSSClassName(checkmark, "checked");
                }
                else
                {
                  adf.mf.internal.amx.removeCSSClassName(checkmark, "checked");
                }
              });
            selectManyPickerItemsContainer.appendChild(pickerItem);
          }
        };

        var createPicker = function()
        {
          // popup picker
          var overlayElement = document.createElement("div");
          overlayElement.setAttribute("class", "amx-selectManyChoice-picker-modalOverlay amx-purge-on-nav");
          overlayElement.id = "amx-selectManyChoice-picker-modalOverlay";
          var selectManyPicker = document.createElement("div");
          selectManyPicker.setAttribute("class", "amx-selectManyChoice-picker-wrapper amx-purge-on-nav");
          selectManyPicker.id = "amx-selectManyChoice-picker-wrapper";
          // picker label
          var selectManyPickerLabel = document.createElement("div");
          selectManyPickerLabel.setAttribute("class", "amx-selectManyChoice-picker-label");
          selectManyPickerLabel.textContent = amxNode.getAttribute("label");
          selectManyPicker.appendChild(selectManyPickerLabel);

          // picker items
          var selectManyPickerItemsContainer = document.createElement("div");
          selectManyPickerItemsContainer.setAttribute("class", "amx-selectManyChoice-picker-inner-container");
          // populate items
          //var values = amxNode.getAttribute("value");
          var values = adf.mf.internal.amx._getNonPrimitiveElementData(selectManyRoot, "value");
          populatePickerItems(selectManyPickerItemsContainer, selectItemLabelValues, values);
          selectManyPicker.appendChild(selectManyPickerItemsContainer);

          // set & cancel buttons
          var selectManyPickerBtnSet = document.createElement("div");
          selectManyPickerBtnSet.setAttribute("class", "amx-selectManyChoice-picker-button-set");
          selectManyPickerBtnSet.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_selectManyChoice_LABEL_BUTTON_SET");
          adf.mf.api.amx.addBubbleEventListener(selectManyPickerBtnSet, "tap", function()
            {
              var pickerItems = selectManyPickerItemsContainer.children;
              var newValue = [];
              for (var i = 0; i < pickerItems.length; ++i)
              {
                var item = pickerItems[i];
                var checkmark = item.children[1];
                var checked = adf.mf.internal.amx.getCSSClassNameIndex(checkmark.className, "checked") != -1;
                if (checked)
                {
                  var itemValue = adf.mf.internal.amx._getNonPrimitiveElementData(item, "itemValue");
                  newValue.push(itemValue);
                }
              }
              var oldValue = adf.mf.internal.amx._getNonPrimitiveElementData(selectManyRoot, "value");
              amxNode.setAttributeResolvedValue("value", newValue);
              var vce = new amx.ValueChangeEvent(oldValue, newValue);
              adf.mf.api.amx.removeDomNode(overlayElement);
              adf.mf.api.amx.removeDomNode(selectManyPicker);
              adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);
              adf.mf.internal.amx._setNonPrimitiveElementData(selectManyRoot, "value", newValue);
            });
          selectManyPicker.appendChild(selectManyPickerBtnSet);

          var selectManyPickerBtnCancel = document.createElement("div");
          selectManyPickerBtnCancel.setAttribute("class", "amx-selectManyChoice-picker-button-cancel");
          selectManyPickerBtnCancel.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_selectManyChoice_LABEL_BUTTON_CANCEL");
          adf.mf.api.amx.addBubbleEventListener(selectManyPickerBtnCancel, "tap", function()
            {
              adf.mf.api.amx.removeDomNode(overlayElement);
              adf.mf.api.amx.removeDomNode(selectManyPicker);
            });
          selectManyPicker.appendChild(selectManyPickerBtnCancel);

          var result = {};
          result.overlay = overlayElement;
          result.picker = selectManyPicker;
          return result;
        };

        adf.mf.api.amx.addBubbleEventListener(selectManyRoot, "tap", function()
          {
            // Don't show the picker if we are navigating:
            if (!adf.mf.api.amx.acceptEvent())
              return;

            // don't process anything on a tap when the control is disabled
            if (disabled == false)
            {
              var result = createPicker();
              document.body.appendChild(result.overlay);
              document.body.appendChild(result.picker);

              // Stop propagation of the event to parent components
              event.stopPropagation();
            }
          });
      }

      field.fieldValue.appendChild(selectManyRoot);
      return rootDomNode;
    }
    else
    {
      var field = amx.createField(amxNode); // generate the fieldRoot/fieldLabel/fieldValue structure
      var domNode = field.fieldRoot;
      var readOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));
      var disabled = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled"));
      var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));

      var selectItemLabelValues = getSelectItemLabelValues(amxNode);
      disabled = disabled || (selectItemLabelValues.length == 0);

      // Create the container for the DOM
      var selectItemsContainer = this._createSelectItemsContainer(readOnly);

      // Set this using ARIA listbox role and set ARIA metadata
      selectItemsContainer.setAttribute("role", "listbox");
      selectItemsContainer.setAttribute("aria-multiselectable", "true");
      var labelId = id + "::" + "lbl";
      selectItemsContainer.setAttribute("aria-labelledby", labelId);
      if (readOnly)
        selectItemsContainer.setAttribute("aria-readonly", "true");
      if (isRequired)
        selectItemsContainer.setAttribute("aria-required", "true");
      if (disabled)
      {
        selectItemsContainer.setAttribute("aria-disabled", "true");
        selectItemsContainer.setAttribute("disabled", "true");
      }

      field.fieldValue.appendChild(selectItemsContainer);

      adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "tap", function(event)
      {
        // Stop propagation of the event to parent components
        event.stopPropagation();
      });
      adf.mf.internal.amx.registerFocus(selectItemsContainer);
      adf.mf.internal.amx.registerBlur(selectItemsContainer);

      // We are intentionally binding to blur twice. The binding to blur below is needed because the timing is different when
      // bound this way as opposed to binding directly to the "selectItemsContainer.blur" method and only in the method below
      // is all the option:selected data valid - if the logic executed in selectItemsContainer.blur, then the selected
      // information would not be current.

      if (readOnly != true && disabled == false)
      {
        // Register a callback for the blur event. Uses arguments to pass to the function to avoid
        // scoping that would result in increased memory
        adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "blur", this._handleBlur, { "amxNode": amxNode });
        adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "focus", handleSelectElementFocus, id);
        adf.mf.api.amx.addBubbleEventListener(selectItemsContainer, "blur", handleSelectElementBlur, id);
      }

      var values = amxNode.getAttribute("value");
      if (!adf.mf.internal.util.is_array(values))
      {
        values = values == null ? [] : new Array(values);
      }

      if (readOnly)
      {
        this._createReadOnlyDom(values, selectItemsContainer, selectItemLabelValues);
      }
      else
      {
        this._createEditableDom(values, selectItemsContainer, selectItemLabelValues);
      }

      return domNode;
    }
  };

  selectManyChoice.prototype.destroy = function(rootElement, amxNode)
  {
    // Clean up any elements that aren't inside the rootElement:
    var overlayElement = document.getElementById("amx-selectManyChoice-picker-modalOverlay");
    adf.mf.api.amx.removeDomNode(overlayElement);
    var selectManyPicker = document.getElementById("amx-selectManyChoice-picker-wrapper");
    adf.mf.api.amx.removeDomNode(selectManyPicker);
  };

  /**
   * Updates the text on trigger
   */
  selectManyChoice.prototype._updateText = function(selectManySpan, values, amxNode)
  {
    if (typeof values === "undefined" || values == null || (values.length > 0) == false)
    {
      // if the array is empty or null, show empty string
      selectManySpan.textContent = "";
    }
    else if (values.length == 1)
    {
      // there is one selected item -> show its label
      var selectItemLabelValues = getSelectItemLabelValues(amxNode);
      for (var key in selectItemLabelValues)
      {
        var labelValue = selectItemLabelValues[key];
        if (values[0] === labelValue.value)
        {
          selectManySpan.textContent = labelValue.label;
          break;
        }
      }
    }
    else
    {
      // there is more than one selected item -> show number of selected items
      selectManySpan.textContent = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_selectManyChoice_LABEL_SELECTED_ITEM_COUNT", values.length);
    }
  };

  /**
   * Renders the DOM for the select when read-only
   */
  selectManyChoice.prototype._createReadOnlyDom = function(values, selectItemsContainer, selectItemLabelValues)
  {
    var first = true;
    for (var key in selectItemLabelValues)
    {
      var labelValue = selectItemLabelValues[key];

      if (values.indexOf(labelValue.value) == -1)
      {
        continue;
      }

      var text;
      if (first)
      {
        first = false;
        text = labelValue.label;
      }
      else
      {
        text = ", " + labelValue.label;
      }

      selectItemsContainer.appendChild(document.createTextNode(text));
    }
  };

  /**
   * Renders the DOM when editable
   */
  selectManyChoice.prototype._createEditableDom = function(values, selectItemsContainer, selectItemLabelValues)
  {
    for (var key in selectItemLabelValues)
    {
      var labelValue = selectItemLabelValues[key];
      var selected = values.indexOf(labelValue.value) >= 0;
      var selectItem = document.createElement("option");
      selectItem.value = labelValue.value;
      selectItem.className = "amx-selectItem";
      selectItem.textContent = labelValue.label;
      selectItemsContainer.appendChild(selectItem);

      // Assign ARIA option role and ARIA selected state
      selectItem.setAttribute("role", "option");
      if (selected)
      {
        selectItem.setAttribute("selected", true);
        selectItem.setAttribute("aria-selected", true);
      }
      else
      {
        selectItem.setAttribute("aria-selected", false);
      }
    }
  };

  /**
   * Callback for the blur event. Called by jQuery, so the "this" variable is the DOM
   * node target, not the type handler. Event has a "data" attribute that will have
   * the "amxNode" variable.
   */
  selectManyChoice.prototype._handleBlur = function(event)
  {
    var amxNode = event.data["amxNode"];
    if (!adf.mf.api.amx.acceptEvent())
    {
      return;
    }

    // Array to hold the new selected Values
    var newValues = [];
    // "this" is the DOM node of the event, setup by jQuery, not the type handler
    for (var i = 0, optionCount = this.options.length; i < optionCount; ++i)
    {
      var option = this.options[i];
      if (option.selected)
      {
        newValues.push(option.getAttribute("value"));
      }
    }

    var oldValues = amxNode.getAttribute("value");

    // set the amxNode value so that it stays in sync
    amxNode.setAttributeResolvedValue("value", newValues);

    var vce = new amx.ValueChangeEvent(oldValues, newValues);
    adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValues, vce);
  };

  /**
   * Creates the parent DOM element for the select
   */
  selectManyChoice.prototype._createSelectItemsContainer = function(readOnly)
  {
    var selectItemsContainer;

    if (readOnly)
    {
      selectItemsContainer = document.createElement("div");
      selectItemsContainer.className = "selectItemsContainer";
    }
    else
    {
      selectItemsContainer = document.createElement("select");
      selectItemsContainer.className = "selectItemsContainer";
      selectItemsContainer.setAttribute("multiple", "multiple");
    }

    return selectItemsContainer;
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "selectItem").prototype.render = function(amxNode)
  {
    var domNode = document.createElement("label");
    domNode.setAttribute("for", amxNode.getAttribute("value"));
    domNode.textContent = amxNode.getAttribute("label");
    return domNode;
  };

  /**
   * Return a $.Deferred that will resolve with a array of {label:,value:}
   * This will look for the AMX selectItem elements or
   * the AMX selectItems elements.
   */
  function getSelectItemLabelValues(amxNode)
  {
    var result = [];

    amxNode.visitChildren(
      new adf.mf.api.amx.VisitContext(),
      function (visitContext, node)
      {
        if (!node.isReadyToRender())
        {
          return adf.mf.api.amx.VisitResult["REJECT"];
        }

        if (node.getTag().getNsPrefixedName() == adf.mf.api.amx.AmxTag.NAMESPACE_AMX+":selectItem")
        {
          result.push(
            {
              "label": node.getAttribute("label"),
              "value": node.getAttribute("value")
            });
        }
        else if (node.getTag().getNsPrefixedName() == adf.mf.api.amx.AmxTag.NAMESPACE_AMX+":selectItems")
        {
          var itemAmxNodeValue;
          if (adf.mf.environment.profile.dtMode)
          {
            itemAmxNodeValue = [];
            for (var counter = 1; counter < 4; counter++)
            {
              // If in DT mode, create 3 dummy items
              var labelItem = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_selectManyCheckbox_ITEM_LABEL", counter);
              // MDO: DT doesn't currently support translated resources and the above call returns
              // null so we provide a hard coded value.
              if (!labelItem)
              {
                labelItem = "Item " + counter;
              }
              itemAmxNodeValue.push({ "value": counter, "label": labelItem });
            }
          }
          else
          {
            itemAmxNodeValue = node.getAttribute("value");
          }
          var isArray = adf.mf.internal.util.is_array(itemAmxNodeValue);
          if (itemAmxNodeValue != null)
          {
            for (var key in itemAmxNodeValue)
            {
              var labelValue = itemAmxNodeValue[key];
              var itemLabel;
              var itemValue;
              // if this is an array, then it is strongly typed, so assume it has a label and value
              if (isArray)
              {
                itemLabel = labelValue.label;
                itemValue = labelValue.value;
              }
              else
              {
                // Bug 13573502: assume this is a map, so use the key as the label and the value as the value
                itemLabel = key;
                itemValue = labelValue;
              }
              if (itemLabel != null && itemLabel != "" && itemLabel.charAt(0) != '.')
              {
                result.push(
                    {
                    "label": itemLabel,
                    "value": itemValue
                  });
              }
            }
          }
        }

        return adf.mf.api.amx.VisitResult["ACCEPT"];
      });

    return result;
  }

  function getArrayValue(value)
  {
    var values = value;
    if (!adf.mf.internal.util.is_array(values))
    {
      values = new Array(values);
    }
    return values;
  }

  /**
   * Callback for focus event on selectOneChoice and selectManyChoice elements.  Adds a 'amx-focus' class to the
   * element so the control button image can be styled differently while it has focus.
   */
  function handleSelectElementFocus(event)
  {
    var selectElement = document.getElementById(event.data);
    adf.mf.internal.amx.addCSSClassName(selectElement, "amx-focus");
  };

  /**
   * Callback for blur event on selectOneChoice and selectManyChoice elements.  Removes the 'amx-focus' class from the
   * element so the control button image can be styled differently while it does not have focus.
   */
  function handleSelectElementBlur(event)
  {
    var selectElement = document.getElementById(event.data);
    adf.mf.internal.amx.removeCSSClassName(selectElement, "amx-focus");
  };

})();
