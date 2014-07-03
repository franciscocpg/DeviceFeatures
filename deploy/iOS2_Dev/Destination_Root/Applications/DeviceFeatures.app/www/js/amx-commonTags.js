/* Copyright (c) 2011, 2014, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------ */
/* ------------------- amx-commonTags.js ---------------- */
/* ------------------------------------------------------ */

(function()
{
  var view = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "view");

  view.prototype.render = function(amxNode, id)
  {
    var domNode = document.createElement("div");
    var descendants = amxNode.renderDescendants();
    for (var i=0, size=descendants.length; i<size; ++i)
    {
      domNode.appendChild(descendants[i]);
    }

    // An amx:loadingIndicatorBehavior has these attribute: failSafeDuration, failSafeClientHandler
    var failSafeDuration = 10000;
    var failSafeClientHandler = null;
    var loadingIndicatorBehaviorTagInstances =
      amxNode.__getTagInstances(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "loadingIndicatorBehavior");
    if (loadingIndicatorBehaviorTagInstances != null)
    {
      var libtisLength = loadingIndicatorBehaviorTagInstances.length;
      if (libtisLength > 0)
      {
        var lastLibti = loadingIndicatorBehaviorTagInstances[libtisLength-1];
        var fsd = parseInt(lastLibti.getAttribute("failSafeDuration"), 10);
        if (!isNaN(fsd))
          failSafeDuration = fsd;
        var fsch = lastLibti.getAttribute("failSafeClientHandler");
        if (fsch != null && fsch != "")
        {
          try
          {
            var fschFunction = new Function("return " + fsch + "()");
            failSafeClientHandler = fschFunction;
          }
          catch (problem)
          {
            // Catch invalid values for failSafeClientHandler
            adf.mf.log.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
              "amx.view.render", "MSG_INVALID_TAG_ATTRIBUTE_VALUE",
              "loadingIndicatorBehavior", "failSafeClientHandler", problem, fsch);
          }
        }
      }
    }

    // Update the values used in adf.mf.api.amx.showLoadingIndicator():
    adf.mf.internal.amx._failSafeDuration = failSafeDuration;
    adf.mf.internal.amx._failSafeClientHandler = failSafeClientHandler;

    // An amx:navigationDragBehavior has these attributes: direction, disabled, action
    var navigationDragBehaviorTagInstances =
      amxNode.__getTagInstances(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "navigationDragBehavior");
    var navigationDragBehaviors = [];
    for (var i=0, dragBehaviorCount=navigationDragBehaviorTagInstances.length; i<dragBehaviorCount; ++i)
    {
      var dragBehavior = navigationDragBehaviorTagInstances[i];
      navigationDragBehaviors.push(dragBehavior);
    }

    if (navigationDragBehaviors.length > 0)
    {
      adf.mf.api.amx.addDragListener(domNode,
        {
          "start": view._handleDragStart,
          "drag": view._handleDrag,
          "end": view._handleDragEnd,
          "threshold": 15
        },
        {
          "navigationDragBehaviors" : navigationDragBehaviors,
          "viewNodeId": id
        });
    }

    return domNode;
  };

  view.prototype.findPopup = function(
    amxNode,
    popupId)
  {
    var children = amxNode.getChildren();

    for (var c = 0, numChildren = children.length; c < numChildren; ++c)
    {
      var child = children[c];

      if (child.getTag().getAttribute("id") == popupId)
      {
        return child;
      }
    }

    return null;
  };

  view._handleDragStart = function(event, dragExtra)
  {
    if (adf.mf.api.amx.acceptEvent())
    {
      var navigationDragBehaviors = event.data["navigationDragBehaviors"];
      var hasBackDragBehavior = false;
      var hasForwardDragBehavior = false;
      for (var i=0, count=navigationDragBehaviors.length; i<count; ++i)
      {
        var dragBehavior = navigationDragBehaviors[i];
        var direction = dragBehavior.getAttribute("direction");

        if (!hasBackDragBehavior && direction == "back" && !adf.mf.api.amx.isValueTrue(dragBehavior.getAttribute("disabled")))
        {
          hasBackDragBehavior = true;
          event.data["backDragBehavior"] = dragBehavior;
        }
        else if (!hasForwardDragBehavior && direction == "forward" && !adf.mf.api.amx.isValueTrue(dragBehavior.getAttribute("disabled")))
        {
          hasForwardDragBehavior = true;
          event.data["forwardDragBehavior"] = dragBehavior;
        }

        if (hasBackDragBehavior && hasForwardDragBehavior)
          break;
      }

      // For this drag attempt, see if we are allowed to drag in either direction:
      event.data["hasBackDragBehavior"] = hasBackDragBehavior;
      event.data["hasForwardDragBehavior"] = hasForwardDragBehavior;
    }
  };

  view._handleDrag = function(event, dragExtra)
  {
    if (adf.mf.api.amx.acceptEvent())
    {
      // Only consider it a drag if the angle of the drag is within 30 degrees of due horizontal
      var angle = Math.abs(dragExtra.originalAngle);
      if (angle <= 30 || angle >= 150)
      {
        var element = this;
        if (dragExtra.requestDragLock(element, true, false))
        {
          event.preventDefault();
          event.stopPropagation();
          dragExtra.preventDefault = true;
          dragExtra.stopPropagation = true;

          // We don't rely on dragExtra.startPageX because of an issue with the auto-dismiss pane
          // on popups. By managing our own startPageX, we guarantee the correct drag start
          // coordinates.
          var startPageX = event.data["startPageX"];
          if (startPageX == null)
          {
            event.data["startPageX"] = dragExtra.pageX;
            return; // too soon to tell direction
          }

          var totalDelta = dragExtra.pageX - startPageX;
          var dragDirectionIsBack = event.data["dragDirectionIsBack"];
          var historyIndicator = event.data["historyIndicator"];
          var isRtl = (document.documentElement.dir == "rtl");

          if (dragDirectionIsBack == null)
          {
            if (totalDelta == 0)
              return; // we can't tell which direction yet

            // Initialize the history indicator if applicable:
            historyIndicator = document.getElementById("historyIndicator");
            if (historyIndicator != null)
            {
              // There was some old indicator that was left around so clean it up:
              adf.mf.api.amx.removeDomNode(historyIndicator);
            }

            if (isRtl)
              dragDirectionIsBack = (totalDelta < 0);
            else
              dragDirectionIsBack = (totalDelta > 0);

            if (dragDirectionIsBack && !event.data["hasBackDragBehavior"])
              return; // not applicable
            else if (!dragDirectionIsBack && !event.data["hasForwardDragBehavior"])
              return; // not applicable
            else
              event.data["dragDirectionIsBack"] = dragDirectionIsBack; // it is applicable

            // Create the new indicator for this series of start-drag-end calls:
            historyIndicator = document.createElement("div");
            historyIndicator.id = "historyIndicator";
            historyIndicator.className = (dragDirectionIsBack ? "amx-view-historyIndicatorBack" : "amx-view-historyIndicatorForward");
            document.getElementById("bodyPageViews").appendChild(historyIndicator);
            event.data["historyIndicator"] = historyIndicator;
          }
          else
          {
            // Move the history indicator we previously created
            var indicatorWidth = event.data["indicatorWidth"];
            if (indicatorWidth == null)
            {
              // We want to minimize the number of times we compute an offset for performance reasons
              indicatorWidth = historyIndicator.offsetWidth;
              event.data["indicatorWidth"] = indicatorWidth;
            }

            var invertedDirection = !dragDirectionIsBack;
            if (isRtl)
              invertedDirection = dragDirectionIsBack;
            var totalDistanceInRevealDirection = 0;
            if (invertedDirection)
            {
              totalDistanceInRevealDirection = -totalDelta;
            }
            else
            {
              totalDistanceInRevealDirection = totalDelta;
            }

            // A number from 0 to 1:
            var percentageMoved =
              Math.max(0, Math.min(indicatorWidth, totalDistanceInRevealDirection) / indicatorWidth);

            // At 0% use 0.3 opacity, at 100% use 1.0 opacity:
            var opacity = 0.3 + 0.7 * percentageMoved;
            historyIndicator.style.opacity = opacity;

            // At 0% use 0, at 100% use indicatorWidth:
            var translateX = indicatorWidth * percentageMoved;
            if (invertedDirection)
              historyIndicator.style.right = (translateX - indicatorWidth) + "px";
            else
              historyIndicator.style.left = (translateX - indicatorWidth) + "px";

            event.data["limitReached"] = (percentageMoved == 1);
          }
        }
      }
    }
    else // event not accepted, e.g. due to transitioning or DT mode
    {
      event.data["limitReached"] = false;
      view._concludeHistoryIndicator(event, dragExtra);
    }
  };

  view._handleDragEnd = function(event, dragExtra)
  {
    view._concludeHistoryIndicator(event, dragExtra);
  };

  view._concludeHistoryIndicator = function(event, dragExtra)
  {
    var limitWasReached = true === event.data["limitReached"];
    var dragDirectionIsBack = true === event.data["dragDirectionIsBack"];

    var historyIndicator = event.data["historyIndicator"];
    delete event.data["hasBackDragBehavior"];
    delete event.data["hasForwardDragBehavior"];
    delete event.data["startPageX"];
    delete event.data["historyIndicator"];
    delete event.data["dragDirectionIsBack"];
    delete event.data["limitReached"];
    event.preventDefault();
    event.stopPropagation();
    dragExtra.preventDefault = true;
    dragExtra.stopPropagation = true;

    if (historyIndicator != null)
    {
      if (adf.mf.internal.amx.agent.getTransitionEndEventName() == "webkitTransitionEnd")
        historyIndicator.style.webkitTransition = "all 200ms linear";
      else
        historyIndicator.style.transition = "all 200ms linear";

      if (limitWasReached)
      {
        var viewNodeId = event.data["viewNodeId"];
        var viewNode = document.getElementById(viewNodeId);
        if (viewNode)
        {
          var dragBehaviorTag = null;
          if (dragDirectionIsBack)
            dragBehaviorTag = event.data["backDragBehavior"];
          else
            dragBehaviorTag = event.data["forwardDragBehavior"];

          if (dragBehaviorTag)
          {
            adf.mf.api.amx.validate(viewNode, function()
              {
                if (adf.mf.api.amx.acceptEvent())
                {
                  // "action" can be a literal value or a method expression
                  var action = dragBehaviorTag.getAttribute("action", false);
                  if (action != null)
                  {
                    try
                    {
                      adf.mf.api.amx.doNavigation(action);
                    }
                    catch (problem)
                    {
                      adf.mf.api.amx.addMessage("severe", problem, null, null);
                    }
                  }
                }
            });
          }
        }
      }

      // Clean up the indicator in an elegant fashion (delayed to allow the screen to paint)
      setTimeout(function()
        {
          if (historyIndicator != null)
          {
            adf.mf.api.amx.addBubbleEventListener(
              historyIndicator,
              adf.mf.internal.amx.agent.getTransitionEndEventName(),
              function()
              {
                adf.mf.api.amx.removeDomNode(this);
              });
            if (!limitWasReached)
            {
              // Slide back away
              var backIndicatorIndex =
                adf.mf.internal.amx.getCSSClassNameIndex(historyIndicator.className, "amx-view-historyIndicatorBack");
              if (document.documentElement.dir == "rtl")
              {
                if (backIndicatorIndex != -1)
                  historyIndicator.style.right = - (historyIndicator.offsetWidth) + "px";
                else
                  historyIndicator.style.left = - (historyIndicator.offsetWidth) + "px";
              }
              else // ltr
              {
                if (backIndicatorIndex != -1)
                  historyIndicator.style.left = - (historyIndicator.offsetWidth) + "px";
                else
                  historyIndicator.style.right = - (historyIndicator.offsetWidth) + "px";
              }
            }
            historyIndicator.style.opacity = 0;
          }
        }, 1);
    }
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "spacer").prototype.render = function(amxNode)
  {
    var width = amx.getTextValue(amxNode.getAttribute("width"));
    var height = amx.getTextValue(amxNode.getAttribute("height"));
    var hidden = !amx.isNodeRendered(amxNode);

    if (hidden || width == null || width.length <= 0)
    {
      if (hidden || height == null || height.length < 0)
      {
        // Both width and height are null or zero, just render an empty span.
        return document.createElement("span");
      }
      else // it has a height but not a width
      {
        if (height.length != 0)
        {
          // our default unit is px
          var domNode = document.createElement("div");
          domNode.style.marginTop = height + "px";
          return domNode;
        }
        else
        {
          return document.createElement("div");
        }
      }
    }
    else // it at least has a width (it might have a height)
    {
      if (height == null || height.length <= 0)
      {
        height = 0;
      }

      var domNode = document.createElement("div");
      var domNodeStyle = domNode.style;
      domNodeStyle.display = "inline-block";
      domNodeStyle.marginTop = height + "px";
      domNodeStyle.marginRight = width + "px";
      return domNode;
    }
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "verbatim").prototype.render = function(amxNode)
  {
    var domNode = document.createElement("div");
    var content = amxNode.getTag().getTextContent();
    domNode.innerHTML = content;
    return domNode;
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "goLink").prototype.render = function(amxNode)
  {
    var domNode;

    if(adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
    {
      //in accordance with HTML 4.01 disabled elements cannot receive focus, are skipped in tabbing navigation and cannot be successful
      //disabled attribute is not supported by A tag -> change to span (read-only, non-focusable, not successful by definition)
      domNode = document.createElement("span");
      domNode.setAttribute("aria-disabled", "true");

      var text = amxNode.getAttribute("text");
      if (text != null)
      {
        var label = document.createElement("label");
        label.appendChild(document.createTextNode(text));
        // VoiceOver will not apply "dimmed" to a label inside of an anchor
        // so we will mark the label as presentation/hidden and define the
        // text as the aria-label of the anchor element instead.
        label.setAttribute("role", "presentation");
        label.setAttribute("aria-hidden", "true");
        domNode.setAttribute("aria-label", text);
        domNode.appendChild(label);
      }
    }
    else
    {
      domNode = document.createElement("a");
      domNode.setAttribute("href", amx.getTextValue(amxNode.getAttribute("url")));
      domNode.appendChild(document.createTextNode(amx.getTextValue(amxNode.getAttribute("text"))));
    }

    // Adding WAI-ARIA Attribute to the markup for the role attribute
    domNode.setAttribute("role", "link");
    var shortDesc = amxNode.getAttribute("shortDesc");
    if (shortDesc != null)
    {
      domNode.setAttribute("aria-label", shortDesc);
    }

    //render child elements if there are any
    var descendants = amxNode.renderDescendants();
    for (var i=0, size=descendants.length; i<size; ++i)
    {
      domNode.appendChild(descendants[i]);
    }
    return domNode;
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "outputText").prototype.render = function(amxNode)
  {
    var domNode = document.createElement("span");
    var displayValue = amx.getTextValue(amxNode.getAttribute("value"));

    // Mark this with a role of heading if it has a styleClass that makes it a heading:
    var styleClass = amxNode.getAttribute("styleClass");
    if (styleClass != null && adf.mf.internal.amx.getCSSClassNameIndex(styleClass, "amx-text-sectiontitle") != -1)
    {
      domNode.setAttribute("role", "heading");
    }

    var truncateAt = parseInt(amxNode.getAttribute("truncateAt"));
    if (!isNaN(truncateAt) && truncateAt > 0 && typeof amxNode.getAttribute("value") != "undefined")
    {
      // from the tagdoc:
      // the length at which the text should automatically begin truncating.
      // When set to zero (the default), the string will never truncate. Values
      // from one to fifteen will display the first 12 characters followed by an
      // ellipsis (...). The outputText component will not truncate strings shorter
      // than fifteen characters. For example, for the value of 1234567890123456,
      // setting truncateAt to 0 or 16 will not truncate. Setting truncateAt to any
      // value between 1-15 will truncate to 123456789012...
      if (truncateAt < 15)
      {
        truncateAt = 15;
      }

      domNode.setAttribute("amx-data-value", displayValue);
      if (truncateAt < displayValue.length)
      {
        displayValue = displayValue.substring(0,truncateAt - 3)+"...";
      }
      domNode.className = "amx-outputText-truncateAt";
    }

    domNode.appendChild(document.createTextNode(displayValue));
    return domNode;
  };

  var outputHtml = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "outputHtml");

  outputHtml.prototype.render = function(amxNode, compId)
  {
    var domNode = document.createElement("div");
    // Get the security attribte. If it is not defined then we will assume that the security is set to high. There are
    // currently two values this can be none, high (default).
    var security = amxNode.getAttribute("security");
    if (security == "none")
    {
      domNode.innerHTML = amx.getTextValue(amxNode.getAttribute("value"));
    }
    else
    {
      // Any other value of security will force this to be set to high.
      function idX(id) { return compId + "_" + id;}
      var inputHTML = amx.getTextValue(amxNode.getAttribute("value"));
      domNode.innerHTML = html_sanitize(inputHTML, null, idX);
    }
    return domNode;
  };

  var inputText = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "inputText");

  inputText.prototype.getInputValueAttribute = function()
  {
    return "value";
  };

  inputText.prototype.updateChildren = function(amxNode, attributeChanges)
  {
    // readOnly fields are special - the inputElement is a div, so don't do
    // any fancy refreshing here
    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly")))
    {
      return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
    }

    var numChanged = attributeChanges.getSize();
    var maxLengthChanged = attributeChanges.hasChanged("maximumLength");
    var valueChanged = attributeChanges.hasChanged("value");
    var labelChanged = attributeChanges.hasChanged("label");
    var inlineStyleChanged = attributeChanges.hasChanged("inlineStyle");
    var expectedChanges = 0;

    if (maxLengthChanged)
    {
      ++expectedChanges;
    }

    if (valueChanged)
    {
      ++expectedChanges;
    }

    if (labelChanged)
    {
      ++expectedChanges;
    }

    if (inlineStyleChanged)
    {
      ++expectedChanges;
    }

    // check to make sure that the changes are only to the attributes we expect
    if (expectedChanges != numChanged)
    {
      return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
    }

    if (valueChanged || maxLengthChanged)
    {
      // if the current inputElement is the one that has focus, and we are on Android, just
      // return false to make sure the node is recreated fully. Android generic has a
      // problem when refreshing inputText controls that have focus. We can revisit the
      // dirty  behavior if it is deemed to be incorrect. For now, the safest thing to do
      // is maintain the current behavior.
      // This issue still remains in Android 4.4 where the WebView was switched to use Chromium.
      var inputElement = document.getElementById(amxNode.getId() + "__inputElement");
      if (inputElement && document.activeElement == inputElement)
      {
        var agent = adf.mf.internal.amx.agent;
        if (agent["type"] == "Android")
        {
          var needsFullRefresh = true;
          // check to see if the value was reported as changing, but the maxLength was not
          if (valueChanged && maxLengthChanged == false)
          {
            if (amxNode.getAttribute("value") == attributeChanges.getOldValue("value"))
            {
              // if the value actually hasn't changed, then we don't actually need a full refresh -
              // the full refresh causes the soft keyboard to go away, which we don't want
              needsFullRefresh = false;
            }
          }

          if (needsFullRefresh)
          {
            return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
          }
        }
      }

      if (amxNode._dirty == true)
      {
        // this control is dirty, so return false to trigger a full control relayout which
        // will make the control behave the same for both refresh/relayout
        return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  inputText.prototype.refresh = function(amxNode, attributeChanges, descendentChanges)
  {
    var maxLengthChanged = attributeChanges.hasChanged("maximumLength");
    var valueChanged = attributeChanges.hasChanged("value");
    var labelChanged = attributeChanges.hasChanged("label");
    var inlineStyleChanged = attributeChanges.hasChanged("inlineStyle");

    var inputElement = document.getElementById(amxNode.getId() + "__inputElement");

    // if maxLength changed, then we just update the value and it will do truncation (once it comes online)
    if (valueChanged || maxLengthChanged)
    {
      this._setValue(amxNode, inputElement);
    }

    var simple = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("simple"));
    if (labelChanged && !simple)
    {
      this._setLabel(amxNode, inputElement);
    }

    // We want to handle inlineStyle changes as a refreshable thing for inputText
    // because on Android when the keyboard appears, this causes the dimensions of
    // the WebView to change which in turn causes any EL based off of those
    // dimensions to trigger a data change event--which means you lose your input.
    // This isn't something that can be handled globally because some components
    // may apply their own styling programmatically which is separate from inlineStyle
    // and there would need to be a judgement call on how to handle that on an
    // instance basis.
    if (inlineStyleChanged)
    {
      // Matching implementation from amx-node.js's AmxNode.prototype.render
      // except that we want to completely override the existing inlineStyle
      var inlineStyle = amxNode.getAttribute("inlineStyle");
      if (inlineStyle)
      {
        if (adf.mf.environment.profile.dtMode)
        {
          // if adf.mf.environment.profile.dtMode, remove el
          inlineStyle = inlineStyle.replace(/#\{(.*?)\}/ig, ' ');
        }
      }
      else
      {
        inlineStyle = "";
      }
      var rootElement = document.getElementById(amxNode.getId());
      rootElement.setAttribute("style", inlineStyle);
    }
  };

  inputText.prototype.render = function(amxNode, id)
  {
    var forId = id + "__inputElement";
    var field = amx.createField(amxNode, forId); // generate the fieldRoot/fieldLabel/fieldValue structure

    field.fieldLabel.setAttribute("id", amxNode.getId() + "__fieldLabel");
    var inputElement;
    amxNode._oldValue = null;
    amxNode._dirty = false;
    var wrapTagName = "div";
    var inputName = amxNode.getAttribute("name");

    // iOS supports "keyboardDismiss" values of "normal", "go", "search":
    var keyboardDismiss = amx.getTextValue(amxNode.getAttribute("keyboardDismiss"));
    if (keyboardDismiss == "go")
    {
      wrapTagName = "form";
    }
    else if (keyboardDismiss == "search")
    {
      wrapTagName = "form";
      inputName = "search";
    }

    var wrapElement = document.createElement(wrapTagName);
    wrapElement.className = "wrap";
    field.fieldValue.appendChild(wrapElement);

    var isRequired = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("required"));
    var isReadOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));

    if (isReadOnly)
    {
      inputElement = document.createElement("div");
      inputElement.className = "readOnlyLabel";
      inputElement.setAttribute("aria-readonly", "true");
      inputElement.appendChild(document.createTextNode(amx.getTextValue(amxNode.getAttribute("value"))));
      wrapElement.appendChild(inputElement);
    }
    else
    {
      var rowsAttr = amxNode.getAttribute("rows");
      if (rowsAttr && parseInt(rowsAttr, 10) > 1)
      {
        inputElement = document.createElement("textarea");
        inputElement.setAttribute("rows", rowsAttr);
        inputElement.setAttribute("aria-multiline", "true");
      }
      else
      {
        if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("secret")))
        {
          inputElement = document.createElement("input");
          inputElement.setAttribute("type", "password");
        }
        else
        {
          var inputType;
          switch (amxNode.getAttribute("inputType"))
          {
            case "number":
            case "email":
            case "url":
            case "tel":
              inputType = amxNode.getAttribute("inputType");
              break;
             /*
             case "search": // custom image added to emulate like native search type untill it is supported in iOS & Android
               inputType = amxNode.getAttribute("inputType");
                var searchIcon = document.createElement("img");
                searchIcon.className = "afmf-inputText-search"; // Fucntionality not implemted yet (07/11/2013)
                break;
             */
            default:
              inputType = "text";
              break;
          }
          inputElement = document.createElement("input");
          inputElement.setAttribute("type", inputType);
        }
      }

      inputElement.setAttribute("id", forId);

      // Adding html5 placeholder attribute for the hint-text
      inputElement.setAttribute("placeholder", amx.getTextValue(amxNode.getAttribute("hintText")));

      // HTML5 "autocapitalize" values include "sentences", "none", "words", "characters":
      var autoCapitalize = amx.getTextValue(amxNode.getAttribute("autoCapitalize"));
      if (autoCapitalize != "" || autoCapitalize != "auto")
        inputElement.setAttribute("autocapitalize", autoCapitalize);

      // HTML5 "autocorrect" values include "on" and "off":
      var autoCorrect = amx.getTextValue(amxNode.getAttribute("autoCorrect"));
      if (autoCorrect != "" || autoCorrect != "auto")
        inputElement.setAttribute("autocorrect", autoCorrect);

      wrapElement.appendChild(inputElement);
      /*
      if (inputType == "search")
      {
        wrapElement.appendchild(searchIcon);
      }
      */

      var maxLengthFunc = function(e)
      {
        var maxLength = amxNode.getAttribute("maximumLength");
        if (maxLength <= 0)
        {
          // we are allowing characters, so we are dirty
          amxNode._dirty = true;
          // no max length specified so return true to allow the chars
          return true;
        }

        var val = inputElement.value;
        var stringToAdd;
        if (e.type == "textInput")
        {
          if (e.data)
          {
            // When getting a "textInput" event, the stringToAdd is the full
            // value so we need to clear out the existing "val" or else we will
            // get duplicated characters.
            val = "";
            stringToAdd = e.data;
          }
          else
          {
            // we are allowing characters, so we are dirty
            amxNode._dirty = true;
            // this is a text event with no text, return true
            return true;
          }
        }
        else
        {
          // assume a single keypress
          stringToAdd = String.fromCharCode(e.charCode);
        }

        var addLength = stringToAdd.length;
        var numNewCharsAllowed = maxLength - val.length;
        if (addLength > numNewCharsAllowed)
        {
          // detect if there are any characters to add instead of disallowing all
          if (numNewCharsAllowed > 0)
          {
            // we are allowing characters, so we are dirty
            amxNode._dirty = true;
            // add only the allowed number of characters
            inputElement.value = val + stringToAdd.substring(0, numNewCharsAllowed);
          }
          return false;
        }

        // we are allowing characters, so we are dirty
        amxNode._dirty = true;
        return true;
      };

      adf.mf.api.amx.addBubbleEventListener(inputElement, "keypress", maxLengthFunc);
      // even though we detect keypresses, we also need to detect keyup events
      // to make sure we catch non-printable keys (like DEL)
      adf.mf.api.amx.addBubbleEventListener(inputElement, "keyup", maxLengthFunc);
      adf.mf.api.amx.addBubbleEventListener(inputElement, "textInput", maxLengthFunc);

      this._setValue(amxNode, inputElement);

      adf.mf.internal.amx.registerBlur(
        inputElement,
        function()
        {
          adf.mf.internal.amx.removeCSSClassName(inputElement.parentNode, "amx-wrap-active");
          // if we aren't dirty, then exit early
          if (amxNode._dirty == false)
          {
            return;
          }

          amxNode._dirty = false;
          var value = inputElement.value;
          var maxLength = amxNode.getAttribute("maximumLength");
          if (maxLength > 0)
          {
            // We should only get here if using the clipboard to edit the value.
            // In that use case, we might not have the proper length so we may
            // need to cut off the end here:
            value = value.substring(0, maxLength);
            inputElement.value = value;
          }

          // Reformat the user-input value, if the node has a converter.
          var converter = amxNode.getConverter();

          if (converter != null)
          {
             // Get (and validate) the user-input value
            var rawValue = converter.getAsObject(value);

            // The getAsObject method returns an empty string if an error occurs.  The only way to
            // determine if the call failed is to compare the return value against the value passed
            // in.
            if (rawValue === "" && value !== "")
            {
              // Do not process the value if there was a conversion error
              return;
            }

            value = converter.getAsString(rawValue);

            // If the attribute is not EL-bound, explicitly set the element value.  Otherwise, the
            // UI never shows the converted/reformatted value.
            var tag = amxNode.getTag();

            if (!tag.isAttributeElBound("value"))
            {
              // TODO: Use standard re-render code for non-EL-bound attributes (i.e. markNodeForUpdate)
              inputElement.value = value;
            }
          }

          // set the amxNode value so that it stays in sync
          amxNode.setAttributeResolvedValue("value", value);
          if (amxNode._oldValue !== value)
          {
            var vce = new amx.ValueChangeEvent(amxNode._oldValue, value);
            adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",value, vce);
          }
          else
          {
            adf.mf.api.amx.processAmxEvent(amxNode,"valueChange","value",value);
          }
        });

      var outerThis = this;
      // register this node in order to receive events when another control is tapped
      adf.mf.internal.amx.registerFocus(
        inputElement,
        function()
        {
          adf.mf.internal.amx.addCSSClassName(inputElement.parentNode, "amx-wrap-active");
          outerThis._setOldValue(amxNode, inputElement);
        });
    }

    if (wrapTagName == "form")
    {
      // we don't want any forms to submit; submission would cause our bootstrap to reload
      adf.mf.api.amx.addBubbleEventListener(
        wrapElement,
        "submit",
        function()
        {
          inputElement.blur();
          return false;
        });
    }

    if (inputName != null)
      inputElement.setAttribute("name", inputName);

    // Using ARIA role of textbox, other ARIA metadata specified throughout method.
    inputElement.setAttribute("role", "textbox");
    var labelId = amxNode.getId() + "::" + "lbl";
    inputElement.setAttribute("aria-labelledby", labelId);
    if (isRequired)
      inputElement.setAttribute("aria-required", "true");

    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
    {
      inputElement.setAttribute("disabled", true);
      inputElement.setAttribute("aria-disabled", "true");
    }

    // call applyRequiredMarker in amx-core.css to determine and implement required/showRequired style
    adf.mf.api.amx.applyRequiredMarker(amxNode, field);

    return field.fieldRoot;
  };

  /**
   * Sets the value of the current inputElement instance to the value of the amxNode and update
   * amxNode._oldValue with the current value
   * @param {Object} amxNode the current amxNode instance
   * @param {HTMLElement} inputElement the current inputElement instance
   */
 inputText.prototype._setValue = function(amxNode, inputElement)
  {
    if (inputElement)
    {
      amxNode._dirty = false;
      // !== null also checks for boolean false value inside inputText
      var valueAttr = amxNode.getAttribute("value");
      if (valueAttr !== null && valueAttr !== "")
      {
        var textValue = amx.getTextValue(valueAttr);
        // the following code should be enabled, but since it changes
        // the current functionality a new bug will need to be filed
        // var maxLength = amxNode.getAttribute("maximumLength");
        // if (maxLength > 0 && maxLength < textValue.length)
        // {
          // textValue = textValue.substring(0, maxLength);
          // the text was clipped so we need to set ourselves to dirty
          // so the next time we blur we send a change event
          // amxNode._dirty = true;
        // }
        inputElement.value = textValue;
      }
      else
      {
        inputElement.value = null;
      }

      this._setOldValue(amxNode, inputElement);

    }
  };

  /**
   * Sets amxNode._oldValue to the value of the current inputElement's value
   * @param {Object} amxNode the current amxNode instance
   * @param {HTMLElement} inputElement the current inputElement instance
   */
  inputText.prototype._setOldValue = function(amxNode, inputElement)
  {
    if (inputElement === undefined || inputElement === null)
    {
      inputElement = document.getElementById(amxNode.getId() + "__inputElement");
    }

    if (inputElement)
    {
      amxNode._oldValue = inputElement.value;
    }
  };

  /**
   * Sets label value of field to the value of the amxNode's label attribute
   * @param {Object} amxNode the current amxNode instance
   * @param {HTMLElement} inputElement the current inputElement instance
   */
  inputText.prototype._setLabel = function(amxNode, inputElement)
  {
    var labelText = amx.getTextValue(amxNode.getAttribute("label"));
    var fieldLabel = document.getElementById(amxNode.getId() + "__fieldLabel");
    if (fieldLabel)
    {
      fieldLabel.removeChild(fieldLabel.childNodes[0]);
      fieldLabel.appendChild(document.createTextNode(labelText));
    }

    if (inputElement)
    {
      inputElement.setAttribute("aria-labelledby", labelText);
    }
  };

  /**
   * Helper function for checking the existence of files
   */
  function _fileExists(resourceName)
  {
    var exists = false;
    try
    {
      adf.mf.api.resourceFile._loadFileWithAjaxRaw(
        resourceName,
        false,
        function(request)
        {
          exists = ((request.response != null) && (request.response != ""));
        },
        function(request)
        {
          // error, keep "exists" as false
        });
    }
    catch(e)
    {
      // something unexpected happened, keep "exists" as false
    }
    return exists;
  }

  var image = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "image");

  image.prototype.render = function(amxNode)
  {
    var domNode = document.createElement("img");
    var source = amx.getTextValue(amxNode.getAttribute("source"));
    var srcPath = adf.mf.api.amx.buildRelativePath(source);
    try
    {
      // only if the relative path was built should we test
      // the existence of the resource
      if ((source != srcPath) && (_fileExists(srcPath) == false))
      {
        // the load failed, so try to load the file as an absolute path
        var absPath = "file://" + source;
        if(_fileExists(absPath) == true)
        {
          srcPath  = absPath;
        }
      }
    }
    catch(e)
    {
      // do nothing, srcPath should be the result of buildRelativePath
    }
    domNode.setAttribute("src", srcPath);
    adf.mf.api.amx.addBubbleEventListener(domNode, "error", this._handleError);

    var shortDesc = amxNode.getAttribute("shortDesc");
    if (shortDesc == null || shortDesc == "")
    {
      // This is a decorative image
      domNode.setAttribute("role", "presentation");
      domNode.setAttribute("aria-hidden", "true");
      domNode.setAttribute("alt", "");
    }
    else
    {
      // This is not a decorative image
      domNode.setAttribute("role", "image");
      domNode.setAttribute("alt", shortDesc);
    }

    return domNode;
  };

  image.prototype._handleError = function(event)
  {
    var imageElement = event.target;
    adf.mf.api.amx.removeBubbleEventListener(imageElement, "error");
    imageElement.setAttribute("data-original-src", imageElement.getAttribute("src"));
    imageElement.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAPAAAP+A/wAAACH5BAUAAAAALAAAAAABAAEAQAICRAEAOw==");
    adf.mf.internal.amx.addCSSClassName(imageElement, "amx-image-error");
  };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "commandLink").prototype.render = function(amxNode)
  {
    var domNode = document.createElement("a");

    // Adding WAI-ARIA Attribute to the markup for the A element
    domNode.setAttribute("role", "link");

    // prevent the default behavior
    adf.mf.api.amx.addBubbleEventListener(domNode, "click", function(e)
    {
      e.stopPropagation();
      e.preventDefault();
    });

    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
    {
      domNode.className = "amx-disabled";

      // Adding WAI-ARIA Attribute to the markup for disabled state
      domNode.setAttribute("aria-disabled", "true");
    }
    else if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly")))
    {
      domNode.className = "amx-readOnly";

      // Adding WAI-ARIA Attribute to the markup for readonly state
      domNode.setAttribute("aria-readonly", "true");
    }
    else
    {
      // In order for VoiceOver to honor the action, we must provide an href
      domNode.setAttribute("href", "#");
    }

    adf.mf.api.amx.addBubbleEventListener(domNode, "tap", function(event)
      {
        // Eat the event since this link is handling it:
        event.preventDefault();
        event.stopPropagation();

        if (!adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")) &&
          !adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly")))
        {
          adf.mf.api.amx.validate(domNode, function()
            {
              if (adf.mf.api.amx.acceptEvent())
              {
                var event = new amx.ActionEvent();
                adf.mf.api.amx.processAmxEvent(amxNode, "action", undefined, undefined, event,
                  function()
                  {
                    var action = amxNode.getAttributeExpression("action", true);
                    if (action != null)
                    {
                      adf.mf.api.amx.doNavigation(action);
                    }
                  });
              }
            });
        }
      });

    var text = amxNode.getAttribute("text");
    if (text != null)
    {
      var label = document.createElement("label");
      label.appendChild(document.createTextNode(text));
      // VoiceOver will not apply "dimmed" to a label inside of an anchor
      // so we will mark the label as presentation/hidden and define the
      // text as the aria-label of the anchor element instead.
      label.setAttribute("role", "presentation");
      label.setAttribute("aria-hidden", "true");
      domNode.setAttribute("aria-label", text);
      domNode.appendChild(label);
    }

    var shortDesc = amxNode.getAttribute("shortDesc");
    if (shortDesc != null)
    {
      domNode.setAttribute("aria-label", shortDesc);
    }

    adf.mf.api.amx.enableAmxEvent(amxNode, domNode, "swipe");
    adf.mf.api.amx.enableAmxEvent(amxNode, domNode, "tapHold");

    var descendants = amxNode.renderDescendants();
    for (var i=0, size=descendants.length; i<size; ++i)
    {
      domNode.appendChild(descendants[i]);
    }
    return domNode;
  };

  var commandButton = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "commandButton");

  commandButton.prototype.render = function(amxNode)
  {
    var domNode = document.createElement("div");
    domNode.setAttribute("tabindex", "0");
    var label = document.createElement("label");
    label.className = "amx-commandButton-label";
    label.appendChild(document.createTextNode(amx.getTextValue(amxNode.getAttribute("text"))));
    domNode.appendChild(label);

    // Adding WAI-ARIA Attribute to the markup for the role attribute
    domNode.setAttribute("role", "button");

    //Back Button creation and render
    var action = amxNode.getAttributeExpression("action", true);
    if (action == "__back")
    {
      if (adf.mf.internal.amx.getCSSClassNameIndex(amxNode.getAttribute("styleClass"),
        "amx-commandButton-normal") == -1)
      {
        adf.mf.internal.amx.addCSSClassName(domNode, "amx-commandButton-back");
      }
    }

    return domNode;
  };

  commandButton.prototype.init = function(domNode, amxNode)
  {
    if (amxNode.getAttribute("icon"))
    {
      // if we have an '.', then assume it is an image
      if (amxNode.getAttribute("icon").indexOf(".") > -1)
      {
        var icon = document.createElement("img");
        icon.className = "amx-commandButton-icon";
        icon.setAttribute("src", adf.mf.api.amx.buildRelativePath(amxNode.getAttribute("icon")));
        domNode.insertBefore(icon, domNode.firstChild);
      }

      // Check for img icon position to be trailing or leading
      if (amxNode.getAttribute("iconPosition") == "trailing")
      {
        adf.mf.internal.amx.addCSSClassName(domNode, "amx-iconPosition-trailing");
      }
      else
      {
        adf.mf.internal.amx.addCSSClassName(domNode, "amx-iconPosition-leading");
      }
    }

    // Grabbing the label text of the commandButton
    var childNodes = domNode.childNodes;
    var length = childNodes.length;
    var commandButtonLabel = null;
    for (var i=0; i<length; i++)
    {
      var child = childNodes[i];
      if (adf.mf.internal.amx.getCSSClassNameIndex(child.className, "amx-commandButton-label") != -1)
      {
        commandButtonLabel = child;
        break;
      }
    }
    var commandButtonLabelText = commandButtonLabel != null ? commandButtonLabel.textContent : "";

    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
    {
      // Adding WAI-ARIA Attribute to the markup for disabled state
      domNode.setAttribute("aria-disabled", "true");

      adf.mf.internal.amx.addCSSClassName(domNode, "amx-disabled");
    }

    if (commandButtonLabelText == "")
    {
      adf.mf.internal.amx.addCSSClassName(domNode, "amx-label-no-text");
    }

    adf.mf.api.amx.addBubbleEventListener(domNode, "tap", function(event)
      {
        // Eat the event since this button is handling it:
        event.preventDefault();
        event.stopPropagation();

        if (!adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
        {
          adf.mf.api.amx.validate(domNode, function()
            {
              if (adf.mf.api.amx.acceptEvent())
              {
                var event = new amx.ActionEvent();
                adf.mf.api.amx.processAmxEvent(amxNode, "action", undefined, undefined, event,
                  function()
                  {
                    var action = amxNode.getAttributeExpression("action", true);
                    if (action != null)
                    {
                      adf.mf.api.amx.doNavigation(action);
                    }
                  });
              }
             });
        }
      });

    // Add an extended target area to increase success with finger contact:
    var targetArea = document.createElement("div");
    targetArea.className = "amx-extendedTarget";
    domNode.appendChild(targetArea);

    if (!adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled")))
    {
      var mousedown = "mousedown";
      var mouseup = "mouseup";
      if (amx.hasTouch())
      {
        mousedown = "touchstart";
        mouseup = "touchend";
      }
      //added the following code to block processing of the touch/mouse events because extraneous events
      //were being generated after the tap event. This was causing particular problems when components were being added
      //or removed (e.g. popups) because underlying components could receive unintended events.
      adf.mf.api.amx.addBubbleEventListener(domNode, mousedown, function(e)
      {
        adf.mf.internal.amx.addCSSClassName(domNode, "amx-selected");
        // Adding WAI-ARIA Attribute to the markup for button-pressed state
        domNode.setAttribute("aria-pressed", "true");
      });
      adf.mf.api.amx.addBubbleEventListener(domNode, mouseup, function(e)
      {
        adf.mf.internal.amx.removeCSSClassName(domNode, "amx-selected");
        // Adding WAI-ARIA Attribute to the markup for button-unpressed state
        domNode.setAttribute("aria-pressed", "false");
      });
      adf.mf.api.amx.addBubbleEventListener(domNode, "mouseout", function()
      {
        adf.mf.internal.amx.removeCSSClassName(domNode, "amx-selected");
        // Adding WAI-ARIA Attribute to the markup for button-unpressed state
        domNode.setAttribute("aria-pressed", "false");
      });
    }
  };

  // --------- AMX Helper Functions --------- //

  (function()
  {
    /**
     * Constructs the basic structure for all the form controls (i.e. field).
     * @param {Object} amxNode the AMX Node to generate the form field control from
     * @param {string=} forId The DOM ID assigned to the actual field element,
     *                        e.g. an "input" element that will be assigned to
     *                        the "label" element's "for" attribute.
     *                        If not specified, no "for" attribute will be assigned.
     * @return {Object} an object with properties "fieldRoot" for the root element,
     *                  "fieldLabel" for the label element, and "fieldValue" for
     *                  the value content element
     */
    amx.createField = function(amxNode, forId)
    {
      var field = {};

      var fieldRoot = document.createElement("div");
      fieldRoot.className = "field";

      field.fieldRoot = fieldRoot;
      field.isReadOnly = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("readOnly"));
      field.isDisable = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("disabled"));

      var fieldLabel = document.createElement("div");
      fieldLabel.className = "field-label";
      field.fieldLabel = fieldLabel;
      fieldRoot.appendChild(fieldLabel);

      var simple = adf.mf.api.amx.isValueTrue(amxNode.getAttribute("simple"));
      if (simple)
      {
        adf.mf.internal.amx.addCSSClassName(fieldRoot, "amx-simple");
      }
      else
      {
        // inputText uses knowledge of this structure to update the label as a refresh. Any
        // changes to how the label is created needs to also propagate to inputText._setLabel
        var label = document.createElement("label");

        var stampedId = amxNode.getId();
        var labelId = stampedId + "::" + "lbl";
        label.setAttribute("id", labelId);
        if (forId != null)
          label.setAttribute("for", forId);

        label.appendChild(document.createTextNode(amx.getTextValue(amxNode.getAttribute("label"))));
        fieldLabel.appendChild(label);
      }

      var fieldValue = document.createElement("div");
      fieldValue.className = "field-value";
      field.fieldValue = fieldValue;
      fieldRoot.appendChild(fieldValue);

      return field;
    };
  })(jQuery);
  // --------- /AMX Helper Functions --------- //

})();
