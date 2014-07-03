/* Copyright (c) 2011, 2013, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------ */
/* ------------------- amx-listView.js ------------------ */
/* ------------------------------------------------------ */

(function()
{
  var listView = adf.mf.api.amx.TypeHandler.register(
      adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "listView");

  listView.prototype.createChildrenNodes = function(amxNode)
  {
    // See if the listview is bound to a collection
    if (!amxNode.isAttributeDefined("value"))
    {
      // Let the default behavior occur of building the child nodes
      return false;
    }

    var dataItems;
    if (adf.mf.environment.profile.dtMode)
    {
      // If in DT mode, create 3 dummy children so that something is displayed
      // on the page
      dataItems = [{},{},{}];
      amxNode.setAttributeResolvedValue("value", dataItems);
    }
    else
    {
      dataItems = amxNode.getAttribute("value");
      if (dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded.
        // We want to display a temporary placeholder until the real content can be displayed:
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
        amxNode.setAttributeResolvedValue("_placeholder", "yes");
        return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["DEFERRED"];
      }
      else if (dataItems == null)
      {
        // No items, nothing to do
        return true;
      }
    }

    var fetchSize = Infinity;
    var maxRows = null;
    var fetchSizeAttribute = amxNode.getAttribute("fetchSize");
    if (fetchSizeAttribute != null &&
      adf.mf.internal.amx.isFiniteNumber(parseInt(fetchSizeAttribute, 10)))
    {
      fetchSize = parseInt(fetchSizeAttribute, 10);
      if (fetchSize < 0)
      {
        fetchSize = Infinity;
      }
      else if (fetchSize == 0)
      {
        fetchSize = 25;
      }
    }
    amxNode.setAttributeResolvedValue("fetchSize", fetchSize);

    // See if there is a stored max rows in the client state
    var clientState = amxNode.getClientState();
    if (clientState != null)
    {
      maxRows = clientState.maxRows;
      if (maxRows != null)
      {
        amxNode.setAttributeResolvedValue("maxRows", maxRows);
      }
    }

    if (maxRows == null)
    {
      if (amxNode.isAttributeDefined("maxRows") == false)
      {
        maxRows = fetchSize;
        amxNode.setAttributeResolvedValue("maxRows", fetchSize);
      }
      else
      {
        maxRows = parseInt(amxNode.getAttribute("maxRows"), 10);
        if (isNaN(maxRows))
        {
          maxRows = fetchSize;
          amxNode.setAttributeResolvedValue("maxRows", fetchSize);
        }
      }
    }
    amxNode.setAttributeResolvedValue("_oldMaxRows", maxRows);

    var iter = adf.mf.api.amx.createIterator(dataItems);

    // See if all the rows have been loaded, if not, force the necessary
    // number of rows to load and then build this node's children
    if (iter.getTotalCount() > iter.getAvailableCount() &&
      iter.getAvailableCount() < maxRows)
    {
      adf.mf.api.amx.showLoadingIndicator();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0, maxRows, function()
      {
        try
        {
          // Call the framework to have the new children nodes constructed.
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          args.setAffectedAttribute(amxNode, "value");
          adf.mf.api.amx.markNodeForUpdate(args);
        }
        finally
        {
          adf.mf.api.amx.hideLoadingIndicator();
        }
      },
      function(message, resp)
      {
        adf.mf.api.adf.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
          "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", message, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });

      // We want to display a temporary placeholder until the real content can be displayed:
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
      amxNode.setAttributeResolvedValue("_placeholder", "yes");
      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["DEFERRED"];
    }

    // We no longer want a placeholder to be visible.
    // We can't just set the _placeholder value to null here because the framework will
    // call preDestroy and destroy inbetween the time that render and postDisplay are
    // called. Those 2 calls (preDestroy and destroy) are bogus for listView and we don't
    // want to execute that code until after postDisplay has been called so we need to
    // be able to distinguish this section of the lifecycle from other times.
    // We will set the value to "nomore" for now and then in postDisplay, set it to null:
    amxNode.setAttributeResolvedValue("_placeholder", "nomore");

    // Create the children for the facets outside of the stamps
    amxNode.createStampedChildren(null, ["header", "footer"]);

    // Now create the stamped children
    for (var i = 0; i < maxRows && iter.hasNext(); ++i)
    {
      var item = iter.next();
      amxNode.createStampedChildren(iter.getRowKey(), [ null ]);
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  listView.prototype.updateChildren = function(amxNode, attributeChanges)
  {
    var isLoadMoreRowsChange = false;
    if (attributeChanges.hasChanged("value"))
    {
      // See if this is a result of a load more rows action
      isLoadMoreRowsChange = this._isLoadMoreRowsDataChangeEvent(amxNode, attributeChanges);
      if (!isLoadMoreRowsChange)
      {
        return _updateChildrenForCollectionChange(amxNode, attributeChanges,
          adf.mf.api.amx.AmxNodeChangeResult["REFRESH"]);
      }
    }

    if (isLoadMoreRowsChange || attributeChanges.getSize() == 1)
    {
      if (isLoadMoreRowsChange || attributeChanges.hasChanged("maxRows"))
      {
        var oldMaxRows = amxNode.getAttribute("_oldMaxRows");
        var dataItems = amxNode.getAttribute("value");

        // Set the iterator at the old max rows - 1 (to the last rendered item)
        var iter = adf.mf.api.amx.createIterator(dataItems);
        iter.setCurrentIndex(oldMaxRows - 1);
        var maxRows = amxNode.getAttribute("maxRows");
        for (var i=oldMaxRows; i<maxRows && iter.hasNext(); ++i)
        {
          var item = iter.next();
          amxNode.createStampedChildren(iter.getRowKey(), [null]);
        }

        if (isLoadMoreRowsChange)
        {
          amxNode.setAttributeResolvedValue("_loadMoreObj", null);
          attributeChanges.setCustomValue("isLoadMoreRowsChange", true);
        }

        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      }
      else if (attributeChanges.hasChanged("showMoreStrategy"))
      {
        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      }
      else if (attributeChanges.hasChanged("editMode"))
      {
        var newEditMode = amxNode.getAttribute("editMode");
        var oldEditMode = attributeChanges.getOldValue("editMode");
        if (newEditMode == oldEditMode)
        {
          return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
        }

        if (adf.mf.api.amx.isValueTrue(newEditMode))
        {
          return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
        }
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  };

  listView.prototype.visitChildren = function(amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");

    if (dataItems === undefined)
    {
      // If the children are not being stamped
      return amxNode.visitStampedChildren(null, null, null, visitContext, callback);
    }

    // Visit the header and footer first
    if (amxNode.visitStampedChildren(null, ["header", "footer"], null, visitContext, callback))
    {
      return true;
    }

    // Now visit the stamped children
    var iter = adf.mf.api.amx.createIterator(dataItems);
    var variableName = amxNode.getAttribute("var");
    var valueElExpression = amxNode.getAttributeExpression("value");

    valueElExpression = valueElExpression.trim().replace(/^#{/, "").replace(/}$/, "");

    //TODO: implement an optimized visit if only certain nodes need to be walked
    //var nodesToWalk = visitContext.getChildrenToWalk();
    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.pushVariable(variableName, item);
      try
      {
        pushElValueReplacement(amxNode, iter, variableName, valueElExpression);

        if (amxNode.visitStampedChildren(iter.getRowKey(), [null], null, visitContext, callback))
        {
          return true;
        }
      }
      finally
      {
        popElValueReplacement(amxNode, iter);
        adf.mf.el.popVariable(variableName);
      }
    }

    return false;
  };

  listView.prototype.render = function(amxNode, id)
  {
    var rootElement = document.createElement("div");
    rootElement.className = "amx-listView";

    if ("yes" == amxNode.getAttribute("_placeholder"))
    {
      var placeholder = document.createElement("div");
      placeholder.id = id + "_placeholder";
      placeholder.className = "amx-listView-placeholder amx-deferred-loading";
      var msgLoading = adf.mf.resource.getInfoString("AMXInfoBundle", "MSG_LOADING");
      placeholder.setAttribute("aria-label", msgLoading);
      rootElement.appendChild(placeholder);
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"]);
      return rootElement;
    }

    this._renderHeaderFacet(amxNode, rootElement);

    // main content div - it contains indexBar, main list and
    // top static divider in case of the android devices
    var listViewContent = document.createElement("div");
    rootElement.appendChild(listViewContent);
    listViewContent.className = "adfmf-listView-main";

    // list div itself which contains list items elements
    var innerListElement = document.createElement("div");
    listViewContent.appendChild(innerListElement);

    // Adding WAI-ARIA role of list
    innerListElement.setAttribute("role", "list");
    innerListElement.id = id + "_innerList";
    innerListElement.className = "adfmf-listView-innerList";

    adf.mf.api.amx.enableScrolling(innerListElement);
    var selectedRowKey = _getSelectedRowKey(amxNode.getId(), amxNode);
    var i;
    var maxRows = amxNode.getAttribute("maxRows");
    var dividerAttrEl = null;

    var dividerAttribute = amxNode.getAttribute("dividerAttribute");
    if (dividerAttribute != null && dividerAttribute != "")
    {
      dividerAttrEl = "#{" + amxNode.getAttribute("var") + "." + dividerAttribute + "}";

      // Reset the _lastDivider in case of rerendering with a different value (bug 16410134).
      amxNode.setAttributeResolvedValue("_lastDivider", null);

      if (amxNode.getAttribute("sectionIndex") !== "off" &&
        amxNode.getAttribute("dividerMode") === "firstLetter")
      {
        // initialize the register of first letters
        // it is not possible to render items from
        // render function so the mediator is created
        // to allow register callback before the real
        // element exists
        amxNode.setAttributeResolvedValue("_indexBarRegister", {});
        // create indexBar element itself
        var indexBar = document.createElement("div");
        indexBar.className = "adfmf-listView-index";

        listViewContent.appendChild(indexBar);
      }
      var useSticky = !adf.mf.api.amx.isValueTrue(amxNode.getAttribute("editMode"));
      amxNode.setAttributeResolvedValue("_useSticky", useSticky);
    }

    var dataItems = amxNode.getAttribute("value");
    var showMoreRowsLink = false;
    if (dataItems !== undefined)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);

      // Structure to allow _renderItem to "pass back" multiple values
      var byRefParams =
      {
        "currentDividerElement": null
      };

      for (i = 0; i < maxRows && iter.hasNext(); ++i)
      {
        var item = iter.next();
        this._renderItem(amxNode, selectedRowKey, iter, innerListElement, item, i, dividerAttrEl,
          byRefParams);
      }

      // Add or remove the load more rows link after all the data has been loaded
      showMoreRowsLink = iter.getTotalCount() > maxRows || !iter.isAllDataLoaded();

      if (byRefParams["currentDividerElement"] && amxNode.getAttribute("showDividerCount"))
      {
        this._displayDividerCount(innerListElement);
      }
      // The edit mode handle has already been added to listItems.
      // Now we just add the editMode class to the listView.
      if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("editMode")))
      {
        adf.mf.internal.amx.addCSSClassName(innerListElement, "amx-listView-editMode");
      }
    }
    else
    {
      // If there is no value attribute, just render the children
      var descendants = amxNode.renderDescendants();
      for (var i = 0, size = descendants.length; i < size; ++i)
      {
        var childDomNode = descendants[i];

        // Store the row key so it can be used in selection management
        var rowKeyString = "" + i;
        if (selectedRowKey == rowKeyString)
          _markRowAsSelected(childDomNode);
        childDomNode.setAttribute("data-listViewRk", rowKeyString);

        innerListElement.appendChild(childDomNode);
      }
    }

    // Add or remove the load more rows link after all the data has been loaded
    this._addOrRemoveLoadMoreRowsDom(amxNode, id, innerListElement, showMoreRowsLink);

    // We use only one scroll listener for all things scrolling-related;
    // it gets replaced in the refresh phase too:
    this._createScrollHandler(amxNode, innerListElement);

    this._appendFooter(amxNode, rootElement);

    return rootElement;
  };

  listView.prototype._handleMaxRowsRefresh = function(
    amxNode,
    innerListElement,
    rootElement)
  {
    // Store the new client state so that the new maxRows are stored
    this._storeClientState(amxNode, innerListElement);

    // This is the case when the user clicks the load more rows item. At this
    // point only the new rows need to be rendered.
    var lastIndexRendered = amxNode.getAttribute("_lastIndexRendered");
    if (lastIndexRendered == null)
    {
      lastIndexRendered = -1;
    }

    var dataItems = amxNode.getAttribute("value");
    var iter = adf.mf.api.amx.createIterator(dataItems);

    // Position the iterator to before the new row
    if (lastIndexRendered > 0)
    {
      iter.setCurrentIndex(lastIndexRendered);
    }

    var maxRows = amxNode.getAttribute("maxRows");
    var selectedRowKey = _getSelectedRowKey(amxNode.getId(), amxNode);
    var dividerAttrEl = null;
    var dividerAttribute = amxNode.getAttribute("dividerAttribute");

    if (dividerAttribute != null && dividerAttribute != "")
    {
      dividerAttrEl = "#{" + amxNode.getAttribute("var") + "." + dividerAttribute + "}";
      amxNode.setAttributeResolvedValue("_useSticky", true);
    }
    else
    {
      amxNode.setAttributeResolvedValue("_useSticky", false);
    }

    // Get the last divider element rendered:
    var currentDividerElement = null;
    var currentDividerGroupElement = null;
    var listViewChildren = innerListElement.childNodes;
    var length = listViewChildren.length;

    for (var i = length - 1; i >= 0; --i)
    {
      var child = listViewChildren[i];
      if (adf.mf.internal.amx.containsCSSClassName(child, "amx-listView-divider"))
      {
        currentDividerElement = child;
        break;
      }
      else if (adf.mf.internal.amx.containsCSSClassName(child, "adfmf-listView-group"))
      {
        currentDividerGroupElement = child;
        currentDividerElement = child.querySelector(".amx-listView-divider");
        break;
      }
    }

    // Get the element for the last list item rendered:
    var lastListItem = null;
    if (currentDividerGroupElement)
    {
      listViewChildren = currentDividerGroupElement.childNodes;
      length = listViewChildren.length;
    }

    for (var i = length - 1; i >= 0; --i)
    {
      var child = listViewChildren[i];
      if (adf.mf.internal.amx.containsCSSClassName(child, "amx-listItem") &&
        !adf.mf.internal.amx.containsCSSClassName(child, "amx-listItem-moreRows"))
      {
        lastListItem = child;
        break;
      }
    }

    // Structure to allow _renderItem to "pass back" multiple values
    var byRefParams =
    {
      "currentDividerGroup": currentDividerGroupElement,
      "currentDividerElement": currentDividerElement,
      "lastListItem": lastListItem
    };

    var newItems = false;
    for (var i = lastIndexRendered + 1; i<maxRows && iter.hasNext(); ++i)
    {
      var item = iter.next();
      this._renderItem(amxNode, selectedRowKey, iter, innerListElement, item, i, dividerAttrEl, byRefParams);
      newItems = true;
    }

    if (newItems === true)
    {
      // refresh items in the bar acording to the newly available rows
      createIndexBarItems(rootElement, amxNode, false);
    }

    if (byRefParams["currentDividerElement"] && amxNode.getAttribute("showDividerCount"))
    {
      this._displayDividerCount(innerListElement);
    }

    // We use only one scroll listener for all things scrolling-related;
    // it gets replaced in the refresh phase:
    this._createScrollHandler(amxNode, innerListElement);

    // Add or remove the load more rows link after all the data has been loaded
    var showMoreRowsLink = iter.getTotalCount() > maxRows || !iter.isAllDataLoaded();
    this._addOrRemoveLoadMoreRowsDom(amxNode, amxNode.getId(), innerListElement, showMoreRowsLink);

    var bufferStrategy = amxNode.getAttribute("bufferStrategy");
    if (bufferStrategy == "viewport")
    {
      this._updateViewportBuffer(amxNode, innerListElement);
    }
  };

  /**
   * Function to create a scroll event listener to handles:
   * - sticky position of dividers,
   * - buffered viewports,
   * - scrolling-based loading of more pages of rows
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode that has been updated
   * @param {HTMLElement} innerListElement the scrollable element of this listView
   */
  listView.prototype._createScrollHandler = function (amxNode, scrollableElement)
  {
    // See if we need are using a showMoreStrategy that involves scrolling:
    var usesShowMoreScroll = false;
    var showMoreStrategy = amxNode.getAttribute("showMoreStrategy");
    if (showMoreStrategy == "autoScroll" || showMoreStrategy == "forceScroll")
    {
      usesShowMoreScroll = true;
    }
    // See if we need are using a bufferStrategy that involves scrolling:
    var usesViewportBuffering = false;
    var bufferStrategy = amxNode.getAttribute("bufferStrategy");
    if (bufferStrategy == "viewport")
    {
      usesViewportBuffering = true;
    }
    adf.mf.api.amx.removeBubbleEventListener(scrollableElement, "scroll");

    var usesStickyPositioning = amxNode.getAttribute("_useSticky");
    if (adf.mf.internal.amx.agent["type"] == "iOS")
    {
      // For now, we only want to support sticky headers on Android devices or
      // in mock browser mode where a skin override is an Android skin.
      // This is because on iOS, the JS-based implementation of sticky headers
      // causes an unwanted jumpy effect during the scroll.
      // In the future, consider a CSS-based solution for iOS instead.

      // See if we are using an Android skin in browser mode:
      var androidSkinInBrowserMode = false;
      if (!adf.mf.environment.profile.dtMode)
      {
        // When using a non-DT, browser-based presentation mode that indicates the
        // skin is for Android, then turn back on sticky positioning:
        if (adf._bootstrapMode == "dev" || adf._bootstrapMode == "hosted")
        {
          var qs = adf.mf.api.getQueryString();
          var skinFolderOverride = adf.mf.api.getQueryStringParamValue(qs, "amx_skin_folder_override");
          var skinOverride = adf.mf.api.getQueryStringParamValue(qs, "amx_skin_override");
          if (skinFolderOverride != null && skinFolderOverride.indexOf("android") != -1)
            androidSkinInBrowserMode = true;
          else if (skinOverride != null && skinOverride.indexOf("android") != -1)
            androidSkinInBrowserMode = true;
        }
      }

      if (!androidSkinInBrowserMode)
        usesStickyPositioning = false; // turn sticky off for iOS
    }

    if (usesStickyPositioning !== true && !usesShowMoreScroll && !usesViewportBuffering)
    {
      return; // no need for a scroll listener
    }
    var listViewScrollHandler = function (event)
    {
      var amxNode = event.data[0];
      var typeHandler = event.data[1];
      var id = amxNode.getId();
      var innerListElement = event.target;
      if (innerListElement.id != id + "_innerList")
      {
        return; // this event came from another descendant, ignore it
      }
      var innerListHeight = innerListElement.offsetHeight;
      if (innerListHeight == null || innerListHeight == 0)
      {
        return; // listView is not displayed
      }
      var inEditMode =
        adf.mf.internal.amx.containsCSSClassName(innerListElement, "amx-listView-editMode");

      if (!inEditMode && usesStickyPositioning === true)
      {
        var groups = innerListElement.childNodes;

        for (var i = 0; i < groups.length; i++)
        {
          var groupElement = groups[i];
          var dividerElement = groupElement.childNodes[0];
          var offsetTop = groupElement.offsetTop;
          var offsetHeight = groupElement.offsetHeight;
          var dividerOffsetHeight = dividerElement.offsetHeight;
          var scrollTop = innerListElement.scrollTop;

          // scroll position is intersecting with one bottom divider
          // so listView makes it visible and start to fade it out/in
          // based on direction of scrolling in the same time we hide
          // the top fixed divider so we get naturally looking animation
          if (offsetTop <= scrollTop && scrollTop <= offsetTop + offsetHeight - dividerOffsetHeight)
          {
            if (!adf.mf.internal.amx.containsCSSClassName(groupElement, "amx-static"))
            {
              adf.mf.internal.amx.addCSSClassName(groupElement, "amx-static");
            }
          }
          else if (adf.mf.internal.amx.containsCSSClassName(groupElement, "amx-static"))
          {
            adf.mf.internal.amx.removeCSSClassName(groupElement, "amx-static");
          }

          if (scrollTop > offsetTop + offsetHeight - dividerOffsetHeight)
          {
            if (!adf.mf.internal.amx.containsCSSClassName(dividerElement, "amx-bottom"))
            {
              adf.mf.internal.amx.addCSSClassName(dividerElement, "amx-bottom");
            }
            dividerElement.style.opacity = Math.max(1 - (scrollTop - offsetTop - offsetHeight + dividerOffsetHeight) / dividerOffsetHeight, 0.5);
          }
          else if (adf.mf.internal.amx.containsCSSClassName(dividerElement, "amx-bottom"))
          {
            adf.mf.internal.amx.removeCSSClassName(dividerElement, "amx-bottom");
            dividerElement.style.opacity = 1;
          }
        }
      }

      if (!inEditMode && usesShowMoreScroll)
      {
        // See if we have a "more rows" indicator and if so, check to see if we
        // have scrolled to the point where we should invoke it:
        var moreRowsElement = document.getElementById(id + "_loadMoreRows");
        if (moreRowsElement != null &&
          innerListElement.scrollHeight != innerListElement.offsetHeight)
        {
          if (!adf.mf.internal.amx.containsCSSClassName(
            moreRowsElement,
            "amx-listItem-scrollStrategy"))
          {
            // It is possible we got here while still showing a link (because
            // the initial scroll measurements were undefined) so we should
            // apply the style now:
            moreRowsElement.className += " amx-listItem-scrollStrategy";
          }

          if (innerListElement.scrollTop >
            innerListElement.scrollHeight - innerListElement.offsetHeight - moreRowsElement.offsetHeight)
          {
            if (!adf.mf.internal.amx.containsCSSClassName(
              moreRowsElement,
              "amx-listItem-scrollStrategyLoading")) // prevent-double query
            {
              // Since permanent animating GIFs are bad for performance, we only
              // make it animate when we are actually doing the load:
              moreRowsElement.className += " amx-listItem-scrollStrategyLoading";

              // Use a timer to allow the animation to kick in plus this will
              // unblock the scroll thread:
              window.setTimeout(
                function()
                {
                  var typeHandler = amxNode.getTypeHandler();
                  typeHandler._handleMoreRowsAction(amxNode);
                },
                1);
            }
          }
        }
      }

      if (usesViewportBuffering)
      {
        typeHandler._updateViewportBuffer(amxNode, innerListElement);
      }
    };

    // Register for the scroll listener
    adf.mf.api.amx.addBubbleEventListener(scrollableElement, "scroll", listViewScrollHandler, [amxNode, this]);

    // Invoke the scroll listener for initial positioning but delay it after a
    // screen paint so that it actually does something meaningful:
    var typeHandler = this;
    window.setTimeout(function ()
      {
        listViewScrollHandler({ "target": scrollableElement, "data": [ amxNode, typeHandler ] });
      },
      1);
  };

  /**
   * Update which rows of the listView are to be displayed based on the size
   * of the viewport and the extra bufferSize distance from the edges of the
   * viewport.
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode that has been updated
   * @param {HTMLElement} innerListElement the scrollable row container
   */
  listView.prototype._updateViewportBuffer = function(amxNode, innerListElement)
  {
    var bufferSize = parseInt(amxNode.getAttribute("bufferSize"), 10);
    if (isNaN(bufferSize) || bufferSize < 0)
      bufferSize = 100; // number of pixels beyond the viewport to keep
    var viewportScrollTop = innerListElement.scrollTop;
    var viewportHeight = innerListElement.offsetHeight;
    var innerListChildren = innerListElement.childNodes;
    var minChildTop = viewportScrollTop - bufferSize;
    var maxChildTop = viewportScrollTop + viewportHeight + bufferSize;
    var gatheredInfo =
      {
        outsideViewport: [],
        insideViewport: []
      };

    // Find all of the rows (even searching inside of groups) so that
    // we can later change their display as needed.
    // It is important to note that we are simply gathering the list
    // of row elements in this loop and not making any changes to styles
    // or classes because making changes like that while examining details
    // about the elements would trigger the browser to perform an
    // expensive re-layout. We will make our changes after we've gathered
    // all of the info.
    for (var i=0, innerListChildCount=innerListChildren.length; i<innerListChildCount; ++i)
    {
      var innerListChild = innerListChildren[i];

      if (adf.mf.internal.amx.containsCSSClassName(innerListChild, "amx-listItem-moreRows"))
      {
        continue; // never mess with this type of element
      }

      var isGroup = adf.mf.internal.amx.containsCSSClassName(innerListChild, "adfmf-listView-group");
      if (isGroup)
      {
        var groupChildren = innerListChild.childNodes;
        for (var j=0, groupChildCount=groupChildren.length; j<groupChildCount; ++j)
        {
          var groupChild = groupChildren[j];
          var groupTop = innerListChild.offsetTop;
          if (adf.mf.internal.amx.containsCSSClassName(groupChild, "amx-listView-divider") ||
            adf.mf.internal.amx.containsCSSClassName(groupChild, "amx-listItem-undisclosed"))
          {
            continue; // never mess with this type of element
          }
          if (adf.mf.internal.amx.containsCSSClassName(innerListChild, "amx-static"))
          {
            // If the group is statically-positioned, we don't need a separate groupTop:
            groupTop = 0;
          }
          this._gatherViewportChildInfo(groupChild, minChildTop, maxChildTop, groupTop, gatheredInfo);
        }
      }
      else
      {
        // Not a group:
        this._gatherViewportChildInfo(innerListChild, minChildTop, maxChildTop, 0, gatheredInfo);
      }
    }

    // Now that we have gathered all of the info we needed, we can now
    // make the changes that would trigger an expensive browser re-layout.
    this._adjustViewportChildren(gatheredInfo.outsideViewport, false);
    this._adjustViewportChildren(gatheredInfo.insideViewport, true);
  };

  /**
   * Determine whether the given element is within the viewport range
   * so that we will mark it has hidden or shown.
   * @param {HTMLElement} viewportChild the viewport child to examine
   * @param {Number} minChildTop the minimum offset top for displaying
   * @param {Number} maxChildTop the maximum offset top for displaying
   * @param {Number} extraTop if the child is inside of a group, its offset
   *                          value will be relative to the group, this
   *                          number that needs to be added to the offset
   *                          so that we are relative to the scrollable area
   * @param {Object} gatheredInfo an object with lists to store the data
   *                              that we need to make display changes later
   */
  listView.prototype._gatherViewportChildInfo = function(
    viewportChild, minChildTop, maxChildTop, extraTop, gatheredInfo)
  {
    var offsetTop = viewportChild.offsetTop + extraTop;
    var offsetHeight = viewportChild.offsetHeight;

    var viewportDebug = false; // whether to add extra debug info on the DOM
    if (offsetTop + offsetHeight < minChildTop)
    {
      // Element is now above the viewport
      gatheredInfo.outsideViewport.push(viewportChild);
      if (viewportDebug)
      {
        viewportChild.setAttribute(
          "data-viewportDebug",
          "above ot+oh=" + (offsetTop + offsetHeight) +
            " < min=" + minChildTop +
            ", ot=" + offsetTop +
            ", oh=" + offsetHeight);
      }
    }
    else if (offsetTop > maxChildTop)
    {
      // Element is now below the viewport
      gatheredInfo.outsideViewport.push(viewportChild);
      if (viewportDebug)
      {
        viewportChild.setAttribute(
          "data-viewportDebug",
          "below ot=" + offsetTop + " > max=" + maxChildTop);
      }
    }
    else
    {
      // Element is inside the viewport
      gatheredInfo.insideViewport.push(viewportChild);
      if (viewportDebug)
      {
        viewportChild.setAttribute(
          "data-viewportDebug",
          "inside min=" + minChildTop +
            ", max=" + maxChildTop +
            ", ot=" + offsetTop +
            ", oh=" + offsetHeight);
      }
    }
  };

  /**
   * From a list of gathered data, hide or show row contents.
   * @param {Array} viewportData an array of row elements
   * @param {Boolean} toReveal whether the contents are to be shown or hidden
   */
  listView.prototype._adjustViewportChildren = function(viewportData, toReveal)
  {
    for (i=0, aboveCount=viewportData.length; i<aboveCount; ++i)
    {
      var childElement = viewportData[i];
      if (toReveal)
      {
        if (adf.mf.internal.amx.containsCSSClassName(childElement, "amx-listItem-outsideOfBuffer"))
        {
          childElement.style.height = "";
          adf.mf.internal.amx.removeCSSClassName(childElement, "amx-listItem-outsideOfBuffer");
        }
      }
      else // to be hidden
      {
        if (!adf.mf.internal.amx.containsCSSClassName(childElement, "amx-listItem-outsideOfBuffer"))
        {
          childElement.style.height = childElement.offsetHeight + "px";
          adf.mf.internal.amx.addCSSClassName(childElement, "amx-listItem-outsideOfBuffer");
        }
      }
    }
  };

  listView.prototype.postDisplay = function(rootElement, amxNode)
  {
    if ("yes" == amxNode.getAttribute("_placeholder"))
      return; // this function is not applicable for placeholders
    else if ("nomore" == amxNode.getAttribute("_placeholder"))
    {
      amxNode.setAttributeResolvedValue("_placeholder", null); // now null for real

      if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"])
      {
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["RENDERED"]);
      }
    }

    // Restore the old scroll position in case this view instance already had one:
    var innerListElement = rootElement.querySelector(".adfmf-listView-innerList");
    this._restoreScrollPosition(amxNode, innerListElement);

    // Creates items in the index bar:
    createIndexBarItems(rootElement, amxNode);

    var data = {
      "innerListElement": innerListElement,
      "typeHandler":      this,
      "amxNode":          amxNode
    };

    // Listen if someone resizes the window:
    adf.mf.api.amx.addBubbleEventListener(window, "resize", this._handleResize, data);

    // Listen if someone explicitly queues a resize on my root element:
    adf.mf.api.amx.addBubbleEventListener(rootElement, "resize", this._handleResize, data);
  };

  listView.prototype._handleResize = function(event)
  {
    var innerListElement = event.data.innerListElement;
    var typeHandler      = event.data.typeHandler;
    var amxNode          = event.data.amxNode;

    if (innerListElement != null)
    {
      var bufferStrategy = amxNode.getAttribute("bufferStrategy");
      if (bufferStrategy == "viewport")
        typeHandler._updateViewportBuffer(amxNode, innerListElement);
    }
  };

  /**
   * In order to prevent removal of all window resize handlers, we need to
   * make a formal function and use it in the removeBubbleEventListener calls.
   * @param {Object} event the resize event
   */
  var indexBarResizeHandler = function(event)
  {
    // in case of the resize it is important to
    // repaint whole index area
    var amxNode = event.data;
    var id = amxNode.getId();
    var rootElement = document.getElementById(id);
    createIndexBarItems(rootElement, amxNode, false);
  };

  /**
   * @param rootElement
   * @param amxNode
   * @param newIndex
   */
  var createIndexBarItems = function(rootElement, amxNode, newIndex)
  {
    var indexBar = rootElement.querySelector(".adfmf-listView-index");
    var innerListElement = document.getElementById(amxNode.getId() + "_innerList");

    if (indexBar !== null)
    {
      var register = amxNode.getAttribute("_indexBarRegister");
      if (register)
      {
        adf.mf.internal.amx.addCSSClassName(rootElement, "adfmf-listView-has-index");
        // load index info from resources
        var indexString = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_INDEX_STRING").toUpperCase();
        var otherLetterChar = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_INDEX_OTHERS").toUpperCase();
        var indexDivider = String.fromCharCode(9679); // bullet character
        // erase the content of the index bar
        adf.mf.api.amx.emptyHtmlElement(indexBar);
        // create the first letter into the index
        var link = createListViewIndexItem(indexBar, indexString.charAt(0), register[indexString.charAt(0)], "adfmf-listView-indexCharacter");
        // this first letter provides height of the items for the further
        // calculations
        var height = link.offsetHeight;

        if (newIndex !== false)
        {
          // don't register this listener from inside calls
          adf.mf.api.amx.addBubbleEventListener(window, "resize", indexBarResizeHandler, amxNode);

          var lastIndex = -1;
          adf.mf.api.amx.addDragListener(indexBar,
          {
            "start": function(event, dragExtra)
            {
              // disable manual scrolling of the list to prevent
              // items move during the drag
              adf.mf.internal.amx.addCSSClassName(innerListElement, "adfmf-listView-scrollable-disabled");
              lastIndex = -1;
            },
            "drag": function(event, dragExtra)
            {
              event.preventDefault();
              event.stopPropagation();
              var indexBarTotalHeight = indexBar.offsetHeight;
              // count the size of the one item
              var threshold = (indexBarTotalHeight - height) / indexString.length;
              // get index of the letter from drag position
              var offsetTop = adf.mf.internal.amx.getElementTop(indexBar);
              var index = Math.round((dragExtra.pageY - offsetTop) / threshold);
              if (index < indexString.length)
              {
                if (lastIndex !== index)
                {
                  lastIndex = index;
                  // find callback in register and fire it just
                  // once until it is change to another letter
                  if (register[indexString.charAt(index)])
                  {
                    register[indexString.charAt(index)]();
                  }
                }
              }
              else
              {
                if (lastIndex !== -1)
                {
                  // fire other letter event when new index is out of range
                  lastIndex = -1;
                  if (register[otherLetterChar])
                  {
                    register[otherLetterChar]();
                  }
                  register[otherLetterChar]();
                }
              }
            },
            "end": function(event, dragExtra)
            {
              // allow manual scrolling after the drag is finished
              adf.mf.internal.amx.removeCSSClassName(innerListElement, "adfmf-listView-scrollable-disabled");
            }
          });
        }

        var i = 1;
        var skip = 0;
        // get total height of the index bar to allow proper items distribution
        var totalHeight = indexBar.offsetHeight;
        if (totalHeight === 0)
        {
          totalHeight = height;
        }

        var itemsAvailable = Math.floor(totalHeight / height);
        if(itemsAvailable < 4)
        {
          // remove index bar when there is not enough space for three items and one bullet divider
          adf.mf.api.amx.removeDomNode(indexBar);
          return;
        }
        // when there is not enough space for all the index items and item for the unknown character then
        // listView has to calculate number of items that has to be skipped to achieve regular distribution
        // of the items
        if (itemsAvailable < indexString.length + 1)
        {
          // count the number of items that we have to skip to distribute items
          // regurarly into the index bar
          skip = Math.floor((indexString.length - 2) * 2 / (itemsAvailable - 3));
          i += skip;
        }
        // create items for all letters from the second to the last item
        var lastI = null;
        for (; i+1+skip<indexString.length; i=i+1+skip)
        {
          if (skip > 0)
          {
            // add bullet character in case that index skips some letters
            var active = undefined;
            // find the first active hidden letter that has handler defined
            for (var y=i-skip; y<i; y++)
            {
              if (register[indexString.charAt(y)] !== undefined)
              {
                active = register[indexString.charAt(y)];
                break;
              }
            }
            createListViewIndexItem(indexBar, indexDivider, active, "adfmf-listView-indexBullet");
          }
          // add letter for this position
          createListViewIndexItem(indexBar, indexString.charAt(i), register[indexString.charAt(i)], "adfmf-listView-indexCharacter");
          lastI = i;
        }

        if (lastI != null && skip > 0 && lastI + 1 < indexString.length)
        {
          // add bullet character in case that index skips some letters
          active = undefined;
          // find the first active hidden letter that has handler defined
          for (var y=lastI-skip; y<lastI; y++)
          {
            if (register[indexString.charAt(y)] !== undefined)
            {
              active = register[indexString.charAt(y)];
              break;
            }
          }
          createListViewIndexItem(indexBar, indexDivider, active, "adfmf-listView-indexBullet");
        }

        if (i < indexString.length)
        {
          // add last letter when this was skipped in the previous for cycle
          createListViewIndexItem(
            indexBar,
            indexString.charAt(indexString.length - 1),
            register[indexString.charAt(indexString.length - 1)],
            "adfmf-listView-indexCharacter");
        }
        // insert character for the unknown letters
        createListViewIndexItem(indexBar, otherLetterChar, register[otherLetterChar], "adfmf-listView-indexOther");
      }
      else
      {
        // remove index bar when no index register is available
        adf.mf.api.amx.removeDomNode(indexBar);
      }
    }
  }

  var createListViewIndexItem = function(indexBar, character, active, extraClass)
  {
    var link = document.createElement("div");
    var className = "adfmf-listView-indexItem";
    if (active)
    {
      className = className + " adfmf-listView-indexItem-active";
      adf.mf.api.amx.addBubbleEventListener(link, "tap", function(event)
      {
        event.preventDefault();
        event.stopPropagation();
        active();
      });
    }
    if (extraClass)
    {
      className = className + " " + extraClass;
    }
    else
    {
      className = className + " " + extraClass;
    }

    link.className = className;
    link.textContent = "" + character;
    indexBar.appendChild(link);

    return link;
  }

  listView.prototype.refresh = function(amxNode, attributeChanges)
  {
    if ("yes" == amxNode.getAttribute("_placeholder"))
      return; // this function is not applicable for placeholders

    var id = amxNode.getId();
    var rootElement = document.getElementById(id);
    var innerListElement = document.getElementById(id + "_innerList");
    var isLoadMoreRowsChange = attributeChanges.getCustomValue("isLoadMoreRowsChange");

    // The updateChildren function already checked that we can refresh, so no
    // checks need to be performed here. We need to only check if this is
    // a change to the max rows or the edit mode
    // if only the .editMode property changed, then, we handle it.
    // Note 1: propertesChanged.editMode will be true if the editMode property has changed
    // Note 2: to get the value, make sure to get it from newAmxNode
    if (!isLoadMoreRowsChange && attributeChanges.hasChanged("value"))
    {
      this._refreshCollectionChanges(amxNode, attributeChanges);
      // refresh items in the bar acording to the value change
      createIndexBarItems(rootElement, amxNode, false);

      // We use only one scroll listener for all things scrolling-related;
      // it gets replaced in the refresh phase:
      this._createScrollHandler(amxNode, innerListElement);
    }
    else if (attributeChanges.hasChanged("editMode"))
    {
      // The updateChildren function already checked that the new edit mode is
      // true, so we do not need to check it here. Just switch to the edit mode
      switchToEditMode(this, amxNode, innerListElement);
      amxNode.setAttributeResolvedValue("_useSticky", false);
      return;
    }
    else if (isLoadMoreRowsChange || attributeChanges.hasChanged("maxRows"))
    {
      this._handleMaxRowsRefresh(amxNode, innerListElement, rootElement);

      if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"])
      {
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["RENDERED"]);
      }
    }
    else if (attributeChanges.hasChanged("showMoreStrategy") ||
      attributeChanges.hasChanged("hasMoreKeysChanged"))
    {
      // Add or remove the load more rows link.
      // We check to see what the "auto" behavior is and the let
      // _addOrRemoveLoadMoreRowsDom override if applicable:
      var showMoreRowsLink = false;
      var dataItems = amxNode.getAttribute("value");
      if (dataItems != null) // e.g. using literal listItems instead
      {
        var iter = adf.mf.api.amx.createIterator(dataItems);
        var maxRows = amxNode.getAttribute("maxRows");
        showMoreRowsLink = iter.getTotalCount() > maxRows || !iter.isAllDataLoaded();
      }

      this._addOrRemoveLoadMoreRowsDom(amxNode, id, innerListElement, showMoreRowsLink);

      if (attributeChanges.hasChanged("showMoreStrategy"))
      {
        // Reset the scroll handler in case the value has changed from scrolling to link or
        // vice versa
        this._createScrollHandler(amxNode, innerListElement);
      }
    }
  };

  listView.prototype.preDestroy = function(rootElement, amxNode)
  {
    // this function is not applicable for placeholders or until postDisplay is called after a
    // placeholder
    if (amxNode.getAttribute("_placeholder") != null)
      return;

    // Store off the current scroll position in case this view instance is ever revisited:
    this._storeClientState(amxNode, document.getElementById(amxNode.getId() + "_innerList"));
  };

  listView.prototype.destroy = function(rootElement, amxNode)
  {
    // this function is not applicable for placeholders or until postDisplay is called after a
    // placeholder
    if (amxNode.getAttribute("_placeholder") != null)
      return;

    // remove scroll handler that animates dividers if such exists
    var innerListElement = rootElement.querySelector(".adfmf-listView-innerList");
    if (innerListElement)
    {
      adf.mf.api.amx.removeBubbleEventListener(innerListElement, "scroll");
    }

    // remove item bar's item handlers
    var indexBar = rootElement.querySelector(".adfmf-listView-index");
    if (indexBar)
    {
      adf.mf.api.amx.removeBubbleEventListener(window, "resize", indexBarResizeHandler, amxNode);
    }
  }

  listView.prototype._refreshCollectionChanges = function(amxNode, attributeChanges)
  {
    var collectionChange = attributeChanges.getCollectionChange("value");
    var updatedKeys = collectionChange.getUpdatedKeys();
    var dataItems = amxNode.getAttribute("value");
    var iter = adf.mf.api.amx.createIterator(dataItems);
    var listViewElement = document.getElementById(amxNode.getId());

    for (var i=0, size=updatedKeys.length; i<size; ++i)
    {
      var key = updatedKeys[i];
      if (iter.setCurrentRowKey(key))
      {
        // Use getRenderedChildren to support flattened children components (i.e. amx:facetRef)
        var children = amxNode.getRenderedChildren(null, key);

        // The updateChildren verified that a child was created, so no need to check here
        var child = children[0];
        child.rerender();
      }
    }
  };

  /**
   * Stores the client state of the list view
   * @param {HTMLElement} innerListElement the scrollable innerList element
   * @param {Object} amxNode the unique identifier for this listView instance
   */
  listView.prototype._storeClientState = function(amxNode, innerListElement)
  {
    if (innerListElement != null)
    {
      // Store off the current scroll position in case this view instance is ever revisited:
      var scrollLeft = innerListElement.scrollLeft;
      var scrollTop = innerListElement.scrollTop;

      var storedData = amxNode.getClientState();
      if (storedData == null)
      {
        storedData =
        {
        };
      }

      if (scrollLeft != null || scrollTop != null)
      {
        storedData.scrollLeft = scrollLeft;
        storedData.scrollTop = scrollTop;
      }

      storedData.maxRows = amxNode.getAttribute("maxRows");

      amxNode.setClientState(storedData);
    }
  };

  listView.prototype._restoreScrollPosition = function(amxNode, innerListElement)
  {
    var storedData = amxNode.getClientState();
    if (storedData != null)
    {
      var scrollLeft = storedData.scrollLeft;
      if (scrollLeft != null)
      {
        innerListElement.scrollLeft = scrollLeft;
      }
      var scrollTop = storedData.scrollTop;
      if (scrollTop != null)
      {
        innerListElement.scrollTop = scrollTop;
      }
    }
  };

  listView.prototype._renderItem = function(
    listViewAmxNode,
    selectedRowKey,
    iter,
    innerListElement,
    item,
    i,
    dividerAttrEl,
    byRefParams)
  {
    listViewAmxNode.setAttributeResolvedValue("_lastIndexRendered", i);

    // we set the variable
    var variableName = listViewAmxNode.getAttribute("var");
    adf.mf.el.pushVariable(variableName, item);
    var rowKey = iter.getRowKey();

    // MDO - bug 14142428 - ASSUMPTION: _renderItem is only called for non-static listViews ("value" attribute is set)
    // If the assumption becomes invalidated and we end up here while rendering a static listView, then the editMode
    // attribute should not prevent dividers from being rendered.
    if (dividerAttrEl != null &&
      listViewAmxNode.getAttribute("dividerAttribute") != null &&
      listViewAmxNode.getAttribute("editMode") !== true)
    {
      var currentDivider = this._getCurrentDivider(listViewAmxNode, dividerAttrEl);
      var lastDivider = listViewAmxNode.getAttribute("_lastDivider");
      if (currentDivider != lastDivider)
      {
        // all items that generates same divider will be placed into the
        // special div that helps with animation
        var lastGroupElement = byRefParams["currentDividerGroup"];
        byRefParams["currentDividerGroup"] = document.createElement("div");
        adf.mf.internal.amx.addCSSClassName(byRefParams["currentDividerGroup"], "adfmf-listView-group");

        this._appendToListView(innerListElement, byRefParams["currentDividerGroup"], lastGroupElement);
        // all items have to be inserted into the groups
        var originalInnerListElement = innerListElement;
        innerListElement = byRefParams["currentDividerGroup"];
        byRefParams["lastListItem"] = null;
        // always visible divider in the group
        byRefParams["currentDividerElement"] = this._insertDivider(listViewAmxNode, currentDivider, innerListElement, byRefParams["lastListItem"]);

        byRefParams["lastListItem"] = byRefParams["currentDividerElement"];
        // register callback function that will allow to jump to divider that
        // coresponds to the letter in the index
        var register = listViewAmxNode.getAttribute("_indexBarRegister");
        if (register && !register[currentDivider])
        {
          register[currentDivider] = createIndexBarHandler(originalInnerListElement, innerListElement);
        }
        listViewAmxNode.setAttributeResolvedValue("_indexBarRegister", register);
        listViewAmxNode.setAttributeResolvedValue("_lastDivider", currentDivider);
      }
      else if (byRefParams["currentDividerGroup"])
      {
        innerListElement = byRefParams["currentDividerGroup"];
      }
    }

    // Use getRenderedChildren to support flattened children like amx:facetRef
    var children = listViewAmxNode.getRenderedChildren(null, rowKey);
    for (var i = 0, size = children.length; i < size; ++i)
    {
      var listItemAmxNode = children[i];
      var tag = listItemAmxNode.getTag();
      if (tag.getName() == "listItem" && tag.getNamespace() == adf.mf.api.amx.AmxTag.NAMESPACE_AMX)
      {
        var listItemElement = listItemAmxNode.render();
        if (listItemElement != null)
        {
          var oldValue = listViewAmxNode.getAttribute("_oldValue");
          if (oldValue == null)
          {
            listViewAmxNode.setAttributeResolvedValue("_oldValue", listItemAmxNode.getStampKey());
          }

          // MDO - bug 14142428 - ASSUMPTION: _renderItem is only called for non-static listViews ("value" attribute is set)
          // If the assumption becomes invalidated and we end up here while rendering a static listView, then the editMode
          // attribute should not prevent dividers from being rendered.
          if (listViewAmxNode.getAttribute("dividerAttribute") != null && listViewAmxNode.getAttribute("editMode") !== true)
          {
            // if the divider is collapsed and we are adding more rows to it,
            // they should also be collapsed/hidden
            var currDividerElem = byRefParams["currentDividerElement"];
            if (currDividerElem != null)
            {
              var dividerChildren = currDividerElem.childNodes;
              var dividerUndisclosed = false;
              for (var c = 0, dividerChildrenCount = dividerChildren.length; c < dividerChildrenCount; ++c)
              {
                var dividerChild = dividerChildren[c];
                if (adf.mf.internal.amx.containsCSSClassName(dividerChild, "amx-listView-undisclosedIcon"))
                {
                  dividerUndisclosed = true;
                  break;
                }
              }
              var storedState = listItemAmxNode.getClientState();
              if (storedState == null)
              {
                storedState = {};
              }

              if (dividerUndisclosed)
              {
                adf.mf.internal.amx.addCSSClassName(listItemElement, "amx-listItem-undisclosed");
                storedState.isHidden = true;
              }
              else
              {
                adf.mf.internal.amx.removeCSSClassName(listItemElement, "amx-listItem-undisclosed");
                storedState.isHidden = false;
              }
              listItemAmxNode.setClientState(storedState);
            }
          }

          // Since this may be called after the footer and next rows elements have
          // been added to the list view, insert the rows after the last list item
          // if it exists
          this._appendToListView(innerListElement, listItemElement, byRefParams["lastListItem"]);

          byRefParams["lastListItem"] = listItemElement;
        }

        // TODO: this code should create stamps for each amx:listItem child
        // if there are multiple, but right now it is only stamping out the first.
        break;
      }
    }
    adf.mf.el.popVariable(variableName);
  };

  /**
   * Function creates the callback that scrolls the
   * scrollable element to position of the element
   *
   * @param scrollableElement {HTMLElement} element that has scrolling enabled
   * @param child {HTMLElement} child of the scrollableElement
   */
  var createIndexBarHandler = function(scrollableElement, child)
  {
    if (child && scrollableElement)
    {
      return function()
      {
        scrollableElement.scrollTop = child.offsetTop;
      };
    }
  }

  listView.prototype._displayDividerCount = function(innerListElement)
  {
    var listViewChildren = innerListElement.childNodes;
    for (var i=0, childCount=listViewChildren.length; i<childCount; ++i)
    {
      var dividerGroup = listViewChildren[i];
      if (adf.mf.internal.amx.containsCSSClassName(dividerGroup, "adfmf-listView-group"))
      {
        var children = dividerGroup.childNodes;
        var count = 0;
        for (var childIndex=0; childIndex<children.length; childIndex++)
        {
          if (adf.mf.internal.amx.containsCSSClassName(children[childIndex], "amx-listItem") &&
            !adf.mf.internal.amx.containsCSSClassName(children[childIndex], "amx-listItem-moreRows") &&
            !adf.mf.internal.amx.containsCSSClassName(children[childIndex], "amx-listView-divider"))
          {
            count++;
          }
        }
        var dividers = dividerGroup.querySelectorAll(".amx-listView-divider");
        for (var divIndex=0; divIndex<dividers.length; divIndex++)
        {
          var dividerCounterText = dividers[divIndex].querySelector(".amx-listView-dividerCounterText");
          if (dividerCounterText)
          {
            dividerCounterText.textContent = count;
          }
        }
      }
    }
  };

  listView.prototype._collapseDividerIfNecessary = function(amxNode, divider, dividerTitle)
  {
    if (amxNode.getAttribute("collapsedDividers"))
    {
      var collapsedDividersArray = amxNode.getAttribute("collapsedDividers");
      if (collapsedDividersArray != null && collapsedDividersArray.indexOf(dividerTitle) != -1)
      {
        var dividerChildren = divider.childNodes;
        for (var i=0, dividerChildCount=dividerChildren.length; i<dividerChildCount; ++i)
        {
          var dividerChild = dividerChildren[i];
          if (adf.mf.internal.amx.containsCSSClassName(dividerChild, "amx-listView-disclosedIcon"))
          {
            adf.mf.internal.amx.removeCSSClassName(dividerChild, "amx-listView-disclosedIcon");
            adf.mf.internal.amx.addCSSClassName(dividerChild, "amx-listView-undisclosedIcon");
          }
        }
      }
    }
  };

  listView.prototype._renderHeaderFacet = function(amxNode, rootElement, topDivider)
  {
    var headerFacetChildren = amxNode.getRenderedChildren("header");
    if (headerFacetChildren.length)
    {
      var header = document.createElement("div");
      header.className = "amx-listView-header";
      rootElement.appendChild(header);
      var div = document.createElement("div");
      div.className = "amx-listView-facet-header";
      header.appendChild(div);

      for (var i=0, size=headerFacetChildren.length; i<size; ++i)
      {
        var childElement = headerFacetChildren[i].render();
        if (childElement)
          div.appendChild(childElement);
      }
    }
  };

  listView.prototype._appendToListView = function(innerListElement, listItemElement, lastListItemElement)
  {
    // Since this may be called after the footer and next rows elements have
    // been added to the list view, insert the rows after the last list item
    // if it exists
    if (lastListItemElement)
    {
      _insertAfter(innerListElement, lastListItemElement, listItemElement);
    }
    else
    {
      innerListElement.appendChild(listItemElement);
    }
  };

  listView.prototype._appendFooter = function(amxNode, rootElement)
  {
    var footerFacetChildren = amxNode.getRenderedChildren("footer");
    if (footerFacetChildren.length)
    {
      var footer = document.createElement("div");
      footer.className = "amx-listView-footer";
      rootElement.appendChild(footer);
      var facetFooter = document.createElement("div");
      facetFooter.className = "amx-listView-facet-footer";
      footer.appendChild(facetFooter);

      for (var i=0, size=footerFacetChildren.length; i<size; ++i)
      {
        var childElement = footerFacetChildren[i].render();
        if (childElement)
          facetFooter.appendChild(childElement);
      }
    }
  };

  /**
   * @return string value for divider.
   */
  listView.prototype._getCurrentDivider = function(amxNode, dividerAttrEl)
  {
    var dividerAttributeValue = adf.mf.el.getLocalValue(dividerAttrEl);

    if (amxNode.getAttribute("dividerMode") === "firstLetter" && dividerAttributeValue !== null)
    {
      var character = dividerAttributeValue.charAt(0);
      // make character case insensitive
      character = character.toUpperCase();
      // contains information about all available characters in index
      var indexString = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_INDEX_STRING").toUpperCase();
      // contains character that represents all unknown characters
      var otherLetterChar = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_INDEX_OTHERS").toUpperCase();
      // accent mapping for current index representation
      var accentMap = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_INDEX_ACCENT_MAP").toUpperCase();

      if (indexString.indexOf(character) > -1)
      {
        // in case that character is in index listiview returns character itself
        return "" + character;
      }
      else
      {
        // in other case listview tries to find this character in the map of accents for each letter
        // accent map has following structure: |A�|D�| (The first letter in each group is the real index and all
        // characters behind this one are possible mutations of this letter)
        var index = accentMap.indexOf(character);
        if (index > 0)
        {
          while (accentMap.charAt(index) !== "|" && accentMap.charAt(--index) !== "|")
          {
            character = accentMap.charAt(index);
          }
          // returns the first character befor "|" in map
          return character;
        }
        else
        {
          // in this case listview was unable to find suitable character so it returns character that represents
          // unknown letters
          return "" + otherLetterChar;
        }
      }
    }
    // this happens when divider mode is set to all
    return "" + dividerAttributeValue;
  };

  listView.prototype._insertDivider = function(amxNode, divider, innerListElement, lastListItem)
  {
    var dividerActual = document.createElement("div");
    dividerActual.setAttribute("tabindex", "0");

    // Check for when collapsible dividers and showCount properties are true/false
    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("collapsibleDividers")))
    {
      dividerActual.className = "amx-listView-divider";

      var disclosedIcon = document.createElement("div");
      disclosedIcon.className = "amx-listView-disclosedIcon";
      dividerActual.appendChild(disclosedIcon);

      var dividerText = document.createElement("div");
      dividerText.setAttribute("role", "heading");
      dividerText.className = "amx-listView-dividerText";
      dividerText.textContent = divider;
      dividerActual.appendChild(dividerText);

      if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("showDividerCount")))
      {
        var dividerCounterContainer = document.createElement("div");
        dividerCounterContainer.className = "amx-listView-dividerCounter";
        dividerActual.appendChild(dividerCounterContainer);

        var dividerCounterText = document.createElement("div");
        dividerCounterText.className = "amx-listView-dividerCounterText";
        dividerCounterContainer.appendChild(dividerCounterText);
      }
    }
    else
    {
      dividerActual.className = "amx-listView-divider amx-listView-nonCollapsibleDivider";

      var dividerText = document.createElement("div");
      dividerText.setAttribute("role", "heading");
      dividerText.className = "amx-listView-nonCollapsibleDivider amx-listView-dividerText";
      dividerText.textContent = divider;
      dividerActual.appendChild(dividerText);

      if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("showDividerCount")))
      {
        var dividerCounterContainer = document.createElement("div");
        dividerCounterContainer.className = "amx-listView-dividerCounter";
        dividerActual.appendChild(dividerCounterContainer);

        var dividerCounterText = document.createElement("div");
        dividerCounterText.className = "amx-listView-dividerCounterText";
        dividerCounterContainer.appendChild(dividerCounterText);
      }
    }

    var items = [];
    adf.mf.internal.amx._setNonPrimitiveElementData(dividerActual, "items", items);
    this._appendToListView(innerListElement, dividerActual, lastListItem);
    if (adf.mf.api.amx.isValueTrue(amxNode.getAttribute("collapsibleDividers")))
    {
      this._collapseDividerIfNecessary(amxNode, dividerActual, divider);
      var typeHandler = this;

      // Add an empty drag listener so that a scroll of the listView will not
      // accidentally trigger a divider tap:
      adf.mf.api.amx.addDragListener(
        dividerActual,
        {
          start: function(event, dragExtra) {},
          drag: function(event, dragExtra) {},
          end: function(event, dragExtra) {},
          threshold: 5
        });

      adf.mf.api.amx.addBubbleEventListener(dividerActual, "tap", function(event)
      {
        if (adf.mf.api.amx.acceptEvent())
        {
          var dividerElement = this;
          var toggleClosure = function()
          {
            return function()
            {
              var listItem = dividerElement.nextSibling;
              var reset = false;
              var className = listItem.className;
              while (listItem != null &&
                className.indexOf("amx-listItem-moreRows") == -1 &&
                className.indexOf("amx-listItem") != -1 &&
                className.indexOf("amx-listView-divider") == -1)
              {
                var itemAmxNode = adf.mf.internal.amx._getNonPrimitiveElementData(listItem, "amxNode");
                var storedState = itemAmxNode.getClientState();
                if (storedState == null)
                {
                  storedState = { };
                }
                if (adf.mf.internal.amx.containsCSSClassName(listItem, "amx-listItem-undisclosed"))
                {
                  adf.mf.internal.amx.removeCSSClassName(listItem, "amx-listItem-undisclosed");
                  storedState.isHidden = false;
                }
                else
                {
                  adf.mf.internal.amx.addCSSClassName(listItem, "amx-listItem-undisclosed");
                  storedState.isHidden = true;
                  reset = true;
                }
                itemAmxNode.setClientState(storedState);
                listItem = listItem.nextSibling;
                className = listItem != null ? listItem.className : "";
              }
              var id = amxNode.getId();
              var actualInnerListElement = document.getElementById(id + "_innerList");
              if (reset === true &&
                actualInnerListElement.scrollTop > dividerElement.parentNode.offsetTop)
              {
                adf.mf.internal.amx.removeCSSClassName(dividerElement, "amx-bottom");
                actualInnerListElement.scrollTop = dividerElement.parentNode.offsetTop;
              }

              // It is possible that we lost scrolling due to toggling the collapsed state.
              // If we did then we need to make sure the loadMoreRows element (if applicable)
              // no longer has the scrollStrategy marker:
              if (actualInnerListElement.scrollHeight <= actualInnerListElement.offsetHeight)
              {
                var moreRowsElem = document.getElementById(id + "_loadMoreRows");
                if (moreRowsElem != null)
                  adf.mf.internal.amx.removeCSSClassName(moreRowsElem, "amx-listItem-scrollStrategy");
              }

              // Invoke the scroll listener since toggling a divider group can impact scroll positioning:
              triggerEvent(actualInnerListElement, "scroll", [amxNode, typeHandler]);
            };
          };

          // MDO: bug 14114778 - the browser doesn't always redraw when we simply toggle the "display"
          // property so we do the toggle from the timeout.  That seems to fix the issue.
          setTimeout(toggleClosure());

          var divActualChildren = dividerElement.childNodes;
          for (var i=0, divActualChildrenCount=divActualChildren.length; i<divActualChildrenCount; ++i)
          {
            var divActualChild = divActualChildren[i];
            if (adf.mf.internal.amx.containsCSSClassName(divActualChild, "amx-listView-disclosedIcon"))
            {
              // Found a disclosedIcon, make it undisclosed:
              adf.mf.internal.amx.removeCSSClassName(divActualChild, "amx-listView-disclosedIcon");
              adf.mf.internal.amx.addCSSClassName(divActualChild, "amx-listView-undisclosedIcon");
            }
            else if (adf.mf.internal.amx.containsCSSClassName(divActualChild, "amx-listView-undisclosedIcon"))
            {
              // Found an undisclosedIcon, make it disclosed:
              adf.mf.internal.amx.removeCSSClassName(divActualChild, "amx-listView-undisclosedIcon");
              adf.mf.internal.amx.addCSSClassName(divActualChild, "amx-listView-disclosedIcon");
            }
          }
        }
      });
    }
    return dividerActual;
  };

  function triggerEvent(eventTarget, eventType, triggerExtra)
  {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent(eventType, true, true);
    evt.view = window;
    evt.altKey = false;
    evt.ctrlKey = false;
    evt.shiftKey = false;
    evt.metaKey = false;
    evt.keyCode = 0;
    evt.charCode = 'a';
    if (triggerExtra != null)
      evt.triggerExtra = triggerExtra;
    eventTarget.dispatchEvent(evt);
  }

  /**
   * Creates the load more rows item in the list for the user to be
   * able to load the next block of rows.
   */
  listView.prototype._createAndAppendTheMoreRowsDom = function(
    amxNode,
    rootId,
    innerListElement,
    scrollStrategy)
  {
    var loadMoreRowsString = adf.mf.resource.getInfoString("AMXInfoBundle", "amx_listView_MSG_LOAD_MORE_ROWS");

    var moreRowsElem = document.createElement("div");
    moreRowsElem.id = rootId + "_loadMoreRows";
    moreRowsElem.setAttribute("role", "button");
    moreRowsElem.setAttribute("tabindex", "0");
    if (scrollStrategy &&
      innerListElement.scrollHeight <= innerListElement.offsetHeight)
      scrollStrategy = false; // it isn't scrollable so use a link instead

    // Add the styleClasses as applicable:
    if (scrollStrategy)
    {
      moreRowsElem.className = "amx-listItem amx-listItem-moreRows amx-listItem-scrollStrategy";
      moreRowsElem.setAttribute("aria-label", loadMoreRowsString);
    }
    else
      moreRowsElem.className = "amx-listItem amx-listItem-moreRows";

    // This is the link of the text (hidden when using a scroll showMoreStrategy):
    var span = document.createElement("span");
    span.appendChild(document.createTextNode(loadMoreRowsString));
    span.className = "amx-outputText";
    moreRowsElem.appendChild(span);
    innerListElement.appendChild(moreRowsElem);

    // We still want to support taps regardless whether this is a tap or a scroll
    // in case for whatever reason the scroll doesn't invoke it.
    adf.mf.api.amx.addBubbleEventListener(moreRowsElem, "tap", this._handleMoreRowsTap, amxNode);
  };

  /**
   * Adds or removes the DOM for the user to be able to load more rows.
   */
  listView.prototype._addOrRemoveLoadMoreRowsDom = function(
    amxNode,
    rootId,
    innerListElement,
    showMoreRowsLink)
  {
    var moreRowsElement = document.getElementById(rootId + "_loadMoreRows");

    // The available strategies for loading more rows are:
    // off:
    //  - no affordance is provided for loading more rows
    // autoLink (default):
    //  - a "link" will appear or disappear as the framework determines applicable (e.g. if the
    //    rows are value-bound and the collection model indicates that more rows might be
    //    available)
    // forceLink:
    //  - a "link" will always be shown regardless of need
    // autoScroll:
    //  - when scrolling to the edge of the viewport, the effect of clicking the link will
    //    occur; no link is visually-presented to the user
    // forceScroll:
    //  - when scrolling to the edge of the viewport, the effect of clicking the link will
    //    occur; no link is visually-presented to the user
    var showMoreStrategy = amxNode.getAttribute("showMoreStrategy");
    if (showMoreStrategy == "off")
      showMoreRowsLink = false;
    else if (showMoreStrategy == "forceLink")
      showMoreRowsLink = true;
    else if (showMoreStrategy == "forceScroll")
      showMoreRowsLink = true;

    var scrollStrategy = (showMoreStrategy == "autoScroll" || showMoreStrategy == "forceScroll");
    var rootElement = document.getElementById(rootId);

    if (showMoreRowsLink && moreRowsElement == null)
    {
      // There are more rows that can be loaded, but we have not yet added
      // the DOM to have the user load the rows
      this._createAndAppendTheMoreRowsDom(amxNode, rootId, innerListElement, scrollStrategy);
    }
    else if (!showMoreRowsLink && moreRowsElement != null)
    {
      // There are no more rows (neither locally or ones that need fetching),
      // but the more rows DOM is still present, so we need to remove it
      // including all event listeners and data:
      adf.mf.api.amx.removeDomNode(moreRowsElement);
    }
    else if (moreRowsElement != null)
    {
      // Recreate it to update the display of the element based on the showMoreStrategy:
      adf.mf.api.amx.removeDomNode(moreRowsElement);
      this._createAndAppendTheMoreRowsDom(amxNode, rootId, innerListElement, scrollStrategy);
    }
  };

  listView.prototype._handleMoreRowsTap = function(event)
  {
    var amxNode = event.data;
    var typeHandler = amxNode.getTypeHandler();
    typeHandler._handleMoreRowsAction(amxNode);
  };

  listView.prototype._queueRangeChangeListener = function(amxNode, iter, availableCount, fetchSize)
  {
    var rangeChangeListener = amxNode.getAttributeExpression("rangeChangeListener");
    if (rangeChangeListener != null)
    {
      var eventSourceId = amxNode.getId();

      // Figure out what the last loaded row key was:
      var lastLoadedRowKey = null;
      if (iter != null)
      {
        lastLoadedRowKey = iter.getRowKey();

        if (availableCount > 0)
        {
          var rowKeyToRestore = iter.getRowKey();

          iter.setCurrentIndex(availableCount - 1);
          lastLoadedRowKey = iter.getRowKey();
          if (rowKeyToRestore != null)
            iter.setCurrentRowKey(rowKeyToRestore);
        }
      }

      var contextFreeValue = null;
      var valueEL = amxNode.getAttributeExpression("value");

      if (valueEL != null)
      {
        contextFreeValue = adf.mf.util.getContextFreeExpression(valueEL);
      }

      var rce = new adf.mf.api.amx.RangeChangeEvent(eventSourceId, contextFreeValue, lastLoadedRowKey, fetchSize);
      adf.mf.api.amx.processAmxEvent(amxNode, "rangeChange", undefined, undefined, rce);
    }
  };

  listView.prototype._handleMoreRowsAction = function(amxNode)
  {
    var quantityToLoad = amxNode.getAttribute("fetchSize");
    var maxRows = amxNode.getAttribute("maxRows");
    var dataItems = amxNode.getAttribute("value");

    if (quantityToLoad === undefined || maxRows === undefined || dataItems === undefined)
    {
      // This is the case where there are explicit children; no stamping but the
      // app developer wanted a link shown:
      this._queueRangeChangeListener(amxNode, null, 0, 0);
      return;
    }
    else if (maxRows == Infinity && quantityToLoad == Infinity)
    {
      // This is the case where there an Array is used for stamping but the
      // app developer wanted a link shown anyhow:
      this._queueRangeChangeListener(amxNode, null, 0, 0);
      return;
    }

    var currentRows = maxRows;

    adf.mf.api.amx.showLoadingIndicator();
    // First update the maximum number of rows to show if applicable
    if (maxRows != Infinity && quantityToLoad > 0)
    {
      amxNode.setAttributeResolvedValue("_oldMaxRows", currentRows);
      maxRows = maxRows + quantityToLoad;
      amxNode.setAttributeResolvedValue("maxRows", maxRows);

      // In case a data change event arrives, save off the maxRows so it will be retained if the
      // list view AMX node is re-created
      var innerListElement = document.getElementById(amxNode.getId() + "_innerList");
      this._storeClientState(amxNode, innerListElement);

      var iter = adf.mf.api.amx.createIterator(dataItems);

      // See if the cache actually has the needed rows, if not then we should
      // force the new rows to load into the cache before attempting to rerender
      var availableCount = iter.getAvailableCount();
      var totalCount = iter.getTotalCount();
      if ((totalCount > availableCount || !iter.isAllDataLoaded()) &&
        availableCount < maxRows)
      {
        this._queueRangeChangeListener(amxNode, iter, availableCount, quantityToLoad);

        if (iter.isTreeNodeIterator())
        {
          // The bulk load providers call may cause the firing of a RangeChangeEvent. If that
          // happens, a data change event will arrive. Keep an object on the node so that the
          // updateChildren and refresh functions know how to handle that data change event
          // as this is not a full support of adding rows (this only handles rows being appended
          // to the end and up to the max rows value).
          var state =
          {
            "currentRows": currentRows,
            "maxRows": maxRows
          };
          amxNode.setAttributeResolvedValue("_loadMoreObj", state);

          // Set the state to a non-rendered one so that the framework knows that this node is
          // waiting on data
          amxNode.setState(adf.mf.api.amx.AmxNodeStates["PARTIALLY_RENDERED"]);
          adf.mf.api.amx.bulkLoadProviders(dataItems, currentRows, maxRows, function()
          {
            try
            {
              // The _loadMoreObj will be null if it was handled by the data change event
              // and therefore an additional visit tree is not necessary
              if (amxNode.getAttribute("_loadMoreObj") != null)
              {
                amxNode.setAttributeResolvedValue("_loadMoreObj", null);
                var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
                args.setAffectedAttribute(amxNode, "maxRows");
                adf.mf.api.amx.markNodeForUpdate(args);
              }
            }
            finally
            {
              adf.mf.api.amx.hideLoadingIndicator();
            }
          },
          function(message, resp)
          {
            adf.mf.api.adf.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
              "_handleMoreRowsAction", "MSG_ITERATOR_FIRST_NEXT_ERROR", message, resp);
            adf.mf.api.amx.hideLoadingIndicator();
          });
        }
        else
        {
          adf.mf.api.amx.hideLoadingIndicator();
        }
      }
      else if (totalCount <= availableCount && availableCount < maxRows &&
        amxNode.getAttributeExpression("rangeChangeListener") != null)
      {
        // Fire a range change event to see if more can be loaded
        this._queueRangeChangeListener(amxNode, iter, availableCount, quantityToLoad);
        adf.mf.api.amx.hideLoadingIndicator();
      }
      else // The rows are actually in the cache
      {
        // Notify the framework so that the new children nodes are created
        // and we are called back with the refresh method. We record that the
        // changed attribute is the generated maxRows attribute so that the
        // refresh function knows to only render the new rows and not rerender
        // the entire list view
        var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
        args.setAffectedAttribute(amxNode, "maxRows");
        adf.mf.api.amx.markNodeForUpdate(args);
        adf.mf.api.amx.hideLoadingIndicator();
      }
    }
  };

  /**
   * Checks if the attribute changes for a value attribute is the result of the
   * bulkLoadProviders call in the _handleMoreRowsAction
   */
  listView.prototype._isLoadMoreRowsDataChangeEvent = function(
    amxNode,
    attributeChanges)
  {
    var state = amxNode.getAttribute("_loadMoreObj");
    if (state != null)
    {
      var collectionChange = attributeChanges.getCollectionChange("value");

      // Ensure rows were only added
      if (collectionChange != null &&
        collectionChange.isItemized() &&
        collectionChange.getDeletedKeys().length == 0 &&
        collectionChange.getDirtiedKeys().length == 0 &&
        collectionChange.getUpdatedKeys().length == 0)
      {
        var created = collectionChange.getCreatedKeys();
        var numCreated = created.length;
        var maxRows = state["maxRows"];
        var maxToLoad = maxRows - state["currentRows"];

        // Ensure that only the expected number of rows were added (no more)
        if (numCreated >= 0 && numCreated <= maxToLoad)
        {
          // Verify the max rows is still the expected value
          if (amxNode.getAttribute("maxRows") == maxRows)
          {
            // Verify that the rows were added sequentially to the end of the iterator
            var lastIndexRendered = amxNode.getAttribute("_lastIndexRendered");
            var dataItems = amxNode.getAttribute("value");
            if (dataItems != null)
            {
              var iter = adf.mf.api.amx.createIterator(dataItems);

              iter.setCurrentIndex(lastIndexRendered);
              for (var i = 0; i < numCreated; ++i)
              {
                if (!iter.hasNext())
                {
                  return false;
                }

                var key = created[i];
                iter.next();

                if (key != iter.getRowKey())
                {
                  return false;
                }
              }

              return true;
            }
          }
        }
      }
    }

    return false;
  };

  var listItem = adf.mf.api.amx.TypeHandler.register(
    adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "listItem");

  listItem.prototype.render = function(amxNode, id)
  {
    var listItemElement = document.createElement("div");
    listItemElement.setAttribute("tabindex", "0");
    var caretShown;

    if (adf.mf.api.amx.isValueFalse(amxNode.getAttribute("showLinkIcon")))
      caretShown = false;
    else
      caretShown = true;

    if (caretShown)
    {
      // If item is a button, add WAI-ARIA roles of listitem and button, note that voiceover only
      // announces item as a button if "button" is first in the role string.
      listItemElement.setAttribute("role", "button listitem");

      var caret = document.createElement("div");
      caret.className = "amx-listItem-caret";
      listItemElement.appendChild(caret);
    }
    else
    {
      // If not a link, just add WAI-ARIA role of listitem
      listItemElement.setAttribute("role", "listitem");

      listItemElement.className = "amx-listItem-noCaret";
    }
    var descendants = amxNode.renderDescendants();
    for (var i=0, size=descendants.length; i<size; ++i)
    {
      listItemElement.appendChild(descendants[i]);
    }

    adf.mf.api.amx.enableAmxEvent(amxNode, listItemElement, "swipe");
    adf.mf.api.amx.enableAmxEvent(amxNode, listItemElement, "tapHold");

    var amxNodeParent = amxNode.getParent();
    var selectedRowKey = _getSelectedRowKey(amxNodeParent.getId(), amxNodeParent);
    if (selectedRowKey !== null && selectedRowKey == amxNode.getStampKey())
    {
      _markRowAsSelected(listItemElement);
    }
    listItemElement.setAttribute("data-listViewRk", amxNode.getStampKey());
    var storedState = amxNode.getClientState();
    if (storedState != null && storedState.isHidden == true)
    {
      adf.mf.internal.amx.addCSSClassName(listItemElement, "amx-listItem-undisclosed");
    }

    var parentAmxNode = amxNode.getParent();
    if (parentAmxNode.getAttribute("value") !== undefined && adf.mf.api.amx.isValueTrue(parentAmxNode.getAttribute("editMode")))
    {
      var handle = document.createElement("div");
      handle.className = "amx-listItem-handle";
      listItemElement.appendChild(handle);
      handleMove(listItemElement);
    }

    adf.mf.api.amx.addBubbleEventListener(listItemElement, "tap", this._handleTap,
    {
      "elementId": id,
      "itemAmxNode": amxNode
    });

    return listItemElement;
  };

  listItem.prototype._handleTap = function(event)
  {
    // Eat the event since this listItem is handling it:
    event.stopPropagation();
    event.preventDefault();

    var listItemElementId = event.data["elementId"];
    var listItemElement = document.getElementById(listItemElementId);
    var innerListElement = findListViewAncestor(listItemElement);
    var listItemAmxNode = event.data["itemAmxNode"];
    var listViewAmxNode = listItemAmxNode.getParent();
    var oldSelectedRowKey = _getSelectedRowKey(listViewAmxNode.getId(), listViewAmxNode);
    var newSelectedRowKey = listItemElement.getAttribute("data-listViewRk");

    if (!adf.mf.internal.amx.containsCSSClassName(innerListElement, "amx-listView-editMode") && !adf.mf.internal.amx.containsCSSClassName(listItemElement, "amx-listItem-moreRows"))
    {
      // Removed the old selected state (max 1 item should be selected at a time).
      // In the future we could consider an option to allow multiple selection.
      var oldSelection = innerListElement.querySelector(".amx-listItem-selected");
      if (oldSelection != null)
        _markRowAsUnselected(oldSelection);

      // Added a new style for the listItem that is tapped
      _markRowAsSelected(listItemElement);
      _storeSelectedRowKey(listViewAmxNode.getId(), newSelectedRowKey, listViewAmxNode);

      // perform the tap only if the editMode is undefined or false
      if (!adf.mf.api.amx.isValueTrue(listViewAmxNode.getAttribute("editMode")))
      {
        if (adf.mf.api.amx.acceptEvent())
        {
          var se = new adf.mf.api.amx.SelectionEvent(oldSelectedRowKey, [newSelectedRowKey]);
          adf.mf.api.amx.processAmxEvent(listViewAmxNode, "selection", undefined, undefined, se);
        }
        adf.mf.api.amx.validate(listItemElement, function()
        {
          if (adf.mf.api.amx.acceptEvent())
          {
            var event = new adf.mf.api.amx.ActionEvent();
            adf.mf.api.amx.processAmxEvent(listItemAmxNode, "action", undefined, undefined, event,
              function()
              {
                var action = listItemAmxNode.getAttributeExpression("action", true);
                if (action != null)
                {
                  adf.mf.api.amx.doNavigation(action);
                }
              });
          }
        });
      }
    }

  };

  var iterator = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "iterator");

  iterator.prototype.createChildrenNodes = function(amxNode)
  {
    // See if the listview is bound to a collection
    if (!amxNode.isAttributeDefined("value"))
    {
      // Let the default behavior occur of building the child nodes
      return false;
    }

    var dataItems;
    if (adf.mf.environment.profile.dtMode)
    {
      // If in DT mode, create 3 dummy children so that something is
      // displayed in the preview:
      dataItems = [{},{},{}];
      amxNode.setAttributeResolvedValue("value", dataItems);
    }
    else
    {
      dataItems = amxNode.getAttribute("value");
      if (dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }
      else if (dataItems == null)
      {
        // No items, nothing to do
        return true;
      }
    }

    var iter = adf.mf.api.amx.createIterator(dataItems);

    // See if all the rows have been loaded
    if (iter.getTotalCount() > iter.getAvailableCount())
    {
      adf.mf.api.amx.showLoadingIndicator();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function()
      {
        // Ensure that the EL context is correct while rendering:
        try
        {
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          args.setAffectedAttribute(amxNode, "value");
          adf.mf.api.amx.markNodeForUpdate(args);
        }
        finally
        {
          adf.mf.api.amx.hideLoadingIndicator();
        }
      },
      function(req, resp)
      {
        adf.mf.log.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE, "createChildrenNodes",
          "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return true;
    }

    while (iter.hasNext())
    {
      var item = iter.next();
      // Create the stamped children for the non-facet children (null array item)
      amxNode.createStampedChildren(iter.getRowKey(), [null]);
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  iterator.prototype.updateChildren = function(amxNode, attributeChanges)
  {
    if (attributeChanges.hasChanged("value"))
    {
      return _updateChildrenForCollectionChange(amxNode, attributeChanges,
        adf.mf.api.amx.AmxNodeChangeResult["RERENDER"]);
    }

    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  iterator.prototype.visitChildren = function(amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    var iter = adf.mf.api.amx.createIterator(dataItems);
    var variableName = amxNode.getAttribute("var");
    var valueElExpression = amxNode.getAttributeExpression("value");

    valueElExpression = valueElExpression.trim().replace(/^#{/, "").replace(/}$/, "");

    //TODO: implement an optimized visit if only certain nodes need to be walked
    //var nodesToWalk = visitContext.getChildrenToWalk();
    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.pushVariable(variableName, item);
      try
      {
        pushElValueReplacement(amxNode, iter, variableName, valueElExpression);

        if (amxNode.visitStampedChildren(iter.getRowKey(), [null], null, visitContext, callback))
        {
          return true;
        }
      }
      finally
      {
        adf.mf.el.popVariable(variableName);
        popElValueReplacement(amxNode, iter);
      }
    }

    return false;
  };

  iterator.prototype.isFlattenable = function(amxNode)
  {
    return true;
  };

  /**
   * Function used by both the list view and the iterator to
   * perform a variable substitution on the "var" variable so that any
   * objects that do not come directly from a binding (i.e. an array) are
   * escaped so that they are resolvable in the embedded side.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the iterator or listView AMX node
   * @param {object} iter the iterator returned from adf.mf.api.amx.createIterator
   * @param {string} variableName the "var" value for the node
   * @param {string} varEl the EL expression of the value attribute
   */
  function pushElValueReplacement(
    amxNode,
    iter,
    variableName,
    varEL)
  {
    if (!iter.isTreeNodeIterator())
    {
      var replacements = {};
      var rowKey = iter.getRowKey().toString().replace("'", "\\'");

      replacements[variableName] = varEL + "['" + rowKey + "']";
      amxNode.__pushElReplacements(replacements);
    }
  }

  /**
   * Corresponding function to the pushElValueReplacement to undo the changes
   * to the environment.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the iterator or listView AMX node
   * @param {object} iter the iterator returned from adf.mf.api.amx.createIterator
   */
  function popElValueReplacement(
    amxNode,
    iter)
  {
    if (!iter.isTreeNodeIterator())
    {
      amxNode.__popElReplacements();
    }
  }

  /**
   * Function used by the listView and iterator to process the updateChildren response to collection
   * model changes
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode that has been updated
   * @param {adf.mf.api.amx.AmxAttributeChange} attributeChanges the information regarding what
   *        attributes were changed and how they changed
   * @param {int} successfulReturnValue if the function is able to update the AMX node children,
   *        what the return value should be. For the list view, it will be REFRESH, for iterator it
   *        will be RERENDER (the iterator is flattened so it cannot re-render the changes itself).
   * @return {int} either the successful return value or REPLACE if the function could not apply
   *         the updates to the AmxNode hierarchy
   */
  function _updateChildrenForCollectionChange(amxNode, attributeChanges, successfulReturnValue)
  {
    // See if there are itemize changes that can be handled. Currently we only support updates to
    // the providers and do not consume created or deleted providers.
    var collectionChange = attributeChanges.getCollectionChange("value");
    if (collectionChange != null &&
      collectionChange.isItemized() &&
      collectionChange.getCreatedKeys().length == 0 &&
      collectionChange.getDeletedKeys().length == 0 &&
      collectionChange.getDirtiedKeys().length == 0 &&
      collectionChange.getUpdatedKeys().length > 0)
    {
      var dataItems = amxNode.getAttribute("value");
      if (dataItems === undefined)
      {
        // We went from having a model to not having one, recreate:
        return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
      }

      var iter = adf.mf.api.amx.createIterator(dataItems);
      var updatedKeys = collectionChange.getUpdatedKeys();
      var numberToFind = updatedKeys.length;

      for (var i = 0; i < numberToFind; ++i)
      {
        // Get the key
        var key = updatedKeys[i];
        if (iter.setCurrentRowKey(key))
        {
          var children = amxNode.getChildren(null, key);
          if (children.length != 1)
          {
            // We will only update list items that were rendered and the list view
            // only supports rendering one item per row key.
            return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
          }

          var oldAmxNode = children[0];

          // Remove the old list item:
          amxNode.removeChild(oldAmxNode);

          // Create the new list item:
          amxNode.createStampedChildren(key, [null]);

          // Ensure a child was created
          if (amxNode.getChildren(null, key).length != 1)
          {
            return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
          }
        }
        else
        {
          return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
        }
      }
      return successfulReturnValue;
    }

    return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
  }

  /**
   * Stores the rowKey of the selected list item.
   * @param {String} stampedId the unique identifier for this listView instance
   * @param {String} selectedRowKey null or the rowKey
   * @param {String} listViewAmxNode the AMX Node we are working with.
   */
   function _storeSelectedRowKey(stampedId, selectedRowKey, listViewAmxNode)
   {
     var selectedRowKeysEL = listViewAmxNode.getAttributeExpression("selectedRowKeys");
     if (selectedRowKeysEL === undefined || selectedRowKeysEL == null)
     {
       var storedData = listViewAmxNode.getVolatileState();
       if (storedData != null)
       {
         storedData.selectedRowKey = selectedRowKey;
       }
     }
     else
     {
       adf.mf.el.setValue({'name':selectedRowKeysEL, 'value':[selectedRowKey]}, function() {;}, null);
     }
   }

  /**
   * Retrieves null or the rowKey of the selected list item.
   * @param {String} stampedId the unique identifier for this listView instance
   * @param {String} listViewAmxNode the AMX Node we are working with.
   * @return {String} null or the rowKey
   */
  function _getSelectedRowKey(stampedId, listViewAmxNode)
  {
    var selectedRowKeysEL = listViewAmxNode.getAttributeExpression("selectedRowKeys");
    if (selectedRowKeysEL === undefined || selectedRowKeysEL == null)
    {
      var storedData = listViewAmxNode.getVolatileState();
      if (storedData != null)
      {
        return storedData.selectedRowKey;
      }
    }
    else
    {
      var keySet = adf.mf.el.getLocalValue(selectedRowKeysEL);
      if (keySet != null)
      {
        return keySet[0];
      }
    }
    return null;
  }

  /**
   * Adds a marker class to the specified listItem element to make it appear selected.
   * Identifies to assistive technology (e.g. VoiceOver) that the listItem is selected.
   * @param {Object} listItemElement the list item element that should be selected
   */
  function _markRowAsSelected(listItemElement)
  {
    adf.mf.internal.amx.addCSSClassName(listItemElement, "amx-listItem-selected");
    listItemElement.setAttribute("aria-selected", true);
  }

  /**
   * Removes the marker class from the specified listItem element to make it appear unselected.
   * Identifies to assistive technology (e.g. VoiceOver) that the listItem is no longer selected.
   * @param {Object} listItemElement the list item element that should be unselected
   */
  function _markRowAsUnselected(listItemElement)
  {
    adf.mf.internal.amx.removeCSSClassName(listItemElement, "amx-listItem-selected");
    listItemElement.setAttribute("aria-selected", false);
  }

  /**
   * Get the child elements that have the specified class names.
   * @param {HTMLElement} parentElement the element whose children will be traversed
   * @param {Array<String>} classNames the class names to search for
   * @return {Array} an array of found elements whose entries match the specified classNames order
   */
  function _getChildrenByClassNames(parentElement, classNames)
  {
    var childNodes = parentElement.childNodes;
    var childNodeCount = childNodes.length;
    var classNameCount = classNames.length;
    var foundChildren = [];
    var foundCount = 0;
    for (var i=0; i<childNodeCount && foundCount<classNameCount; ++i)
    {
      var child = childNodes[i];
      for (var j=0; j<classNameCount; ++j)
      {
        if (adf.mf.internal.amx.containsCSSClassName(child, classNames[j]))
        {
          foundChildren[j] = child;++foundCount;
          break;// done with this specific child
        }
      }
    }
    return foundChildren;
  }

  function handleMove(listItemElement)
  {
    var dropSpaceElement = null;
    var rowKeyMoved = null;
    var rowKeyInsertedBefore = null;
    var listItemOffsetHeight = null;
    var maximumDragTop = null;
    var listItemHandleElement = _getChildrenByClassNames(listItemElement, ["amx-listItem-handle"])[0];
    if (listItemHandleElement != null)
    {
      adf.mf.api.amx.addDragListener(listItemHandleElement,
      {
        "start": function(event, dragExtra)
        {
          // Declare this element as the one that is currently handling drag events:
          var element = this;
          dragExtra.requestDragLock(element, true, true);

          rowKeyMoved = undefined;
          rowKeyInsertedBefore = undefined;
          listItemOffsetHeight = listItemElement.offsetHeight;
          maximumDragTop = listItemElement.parentNode.scrollHeight + 1 + listItemOffsetHeight / 2;
          var amxNode = adf.mf.internal.amx._getNonPrimitiveElementData(listItemElement, "amxNode");
          if (amxNode != null)
          {
            rowKeyMoved = amxNode.getStampKey();
          }
          adf.mf.internal.amx.addCSSClassName(listItemElement, "move");
          dropSpaceElement = document.createElement("div");
          dropSpaceElement.className = "amx-listItem amx-listItem-drop-spacer";
          _insertAfter(listItemElement.parentNode, listItemElement, dropSpaceElement);
        },
        "drag": function(event, dragExtra)
        {
          event.preventDefault();
          event.stopPropagation();
          //since "drag" is a meta-event and we are consuming it, we also need to indicate to the parent
          //event handler to consume the "source" event as well
          dragExtra.preventDefault = true;
          dragExtra.stopPropagation = true;
          var listItemElementTop = adf.mf.internal.amx.getElementTop(listItemElement);
          var eventPageY = dragExtra.pageY;
          var top = listItemElementTop + dragExtra.deltaPageY;
          var innerListElement = listItemElement.parentNode;
          var parentOffsetTop = adf.mf.internal.amx.getElementTop(innerListElement);
          if (top < parentOffsetTop)
          {
            top = parentOffsetTop;
          }

          //scroll view
          if (top <= parentOffsetTop + 5)
          {
            innerListElement.setAttribute("data-stop", false);
            scrollView(innerListElement, -1);
          }
          else if (top + listItemOffsetHeight >= parentOffsetTop + innerListElement.offsetHeight - 5)
          {
            innerListElement.setAttribute("data-stop", false);
            scrollView(innerListElement, 1);
          }
          else
          {
            innerListElement.setAttribute("data-stop", true);
          }

          // Reposition the dragged element but don't let it go on forever past the last item in the list:
          var halfItemHeight = listItemOffsetHeight / 2;
          var currentDragTop = eventPageY - halfItemHeight - parentOffsetTop + innerListElement.scrollTop;
          var newListItemTop = Math.min(maximumDragTop, currentDragTop);
          listItemElement.style.top = newListItemTop + "px";

          if (!adf.mf.internal.amx.containsCSSClassName(parent, "notSelect"))
          {
            adf.mf.internal.amx.addCSSClassName(innerListElement, "notSelect");
          }

          // Move around the drop space element:
          var listViewChildren = innerListElement.childNodes;
          var siblingItems = [];
          for (var i=0, childCount=listViewChildren.length; i<childCount; ++i)
          {
            var listViewChild = listViewChildren[i];
            if (adf.mf.internal.amx.containsCSSClassName(listViewChild, "amx-listItem") &&
              !adf.mf.internal.amx.containsCSSClassName(listViewChild, "amx-listItem-drop-spacer") &&
              !adf.mf.internal.amx.containsCSSClassName(listViewChild, "move") &&
              !adf.mf.internal.amx.containsCSSClassName(listViewChild, "amx-listItem-moreRows"))
            {
              siblingItems.push(listViewChild);
            }
          }
          for (var i=0, siblingCount=siblingItems.length; i<siblingCount; ++i)
          {
            var siblingItemElement = siblingItems[i];
            var siblingItemOffsetTop = siblingItemElement.offsetTop;
            var siblingItemOffsetHeight = siblingItemElement.offsetHeight;
            var draggedItemOffsetTop = listItemElement.offsetTop + halfItemHeight;
            if (siblingItemOffsetTop <= draggedItemOffsetTop &&
              draggedItemOffsetTop <= siblingItemOffsetTop + siblingItemOffsetHeight)
            {
              if (draggedItemOffsetTop <= siblingItemOffsetTop + siblingItemOffsetHeight / 2)
              {
                innerListElement.insertBefore(dropSpaceElement, siblingItemElement);
              }
              else
              {
                _insertAfter(innerListElement, siblingItemElement, dropSpaceElement);
              }
              break;
            }
          }
        },
        "end": function(event, dragExtra)
        {
          var cloneElement = listItemElement.cloneNode(true);
          var innerListElement = listItemElement.parentNode;
          innerListElement.appendChild(cloneElement);
          listItemElement.style.display = "none";
          var nextRowElement = dropSpaceElement.nextSibling;
          if (nextRowElement != null)
          {
            var nextRowAmxNode = adf.mf.internal.amx._getNonPrimitiveElementData(nextRowElement, "amxNode");
            if (nextRowAmxNode != null)
            {
              rowKeyInsertedBefore = nextRowAmxNode.getStampKey();
            }
          }
          var $clone = $(cloneElement);
          $clone.animate(
          {
            "opacity": 0,
            "height": 0
          },
          function()
          {
            adf.mf.api.amx.removeDomNode(cloneElement);
            _insertAfter(innerListElement, dropSpaceElement, listItemElement);
            listItemElement.style.display = "";
            adf.mf.internal.amx.removeCSSClassName(listItemElement, "move");
            listItemElement.style.top = "";
          });
          $(dropSpaceElement).animate(
          {
            "height": 32
          },
          function()
          {
            adf.mf.api.amx.removeDomNode(dropSpaceElement);
          });
          adf.mf.internal.amx.removeCSSClassName(innerListElement, "notSelect");
          innerListElement.setAttribute("data-stop", true);
          if (typeof rowKeyMoved !== "undefined")
          {
            var moveEvent = new adf.mf.internal.amx.MoveEvent(rowKeyMoved, rowKeyInsertedBefore);
            var listView = findListViewAncestor(listItemElement);
            if (listView != null)
            {
              var amxNode = adf.mf.internal.amx._getNonPrimitiveElementData(listView, "amxNode");
              adf.mf.api.amx.processAmxEvent(amxNode, "move", undefined, undefined, moveEvent);
            }
          }
        }
      });
    }
  }

  /**
   * Locates the first listView parent for the given node.
   * @param {HTMLElement} element some element whose nearest listView ancestor we are seeking
   * @return {HTMLElement} the nearest listView ancestor if there is one, undefined otherwise
   */
  function findListViewAncestor(element)
  {
    if (typeof element !== undefined)
    {
      var parentElement = element.parentNode;
      while (parentElement != null)
      {
        if (adf.mf.internal.amx.containsCSSClassName(parentElement, "amx-listView"))
        {
          return parentElement;
        }
        parentElement = parentElement.parentNode;
      }
    }
  }

  function switchToEditMode(typeHandler, listViewAmxNode, innerListElement)
  {
    // MDO - bug 14033329: ignore editMode when listView is static
    if (listViewAmxNode == null || listViewAmxNode.getAttribute("value") === undefined)
    {
      return;
    }

    // Now in edit mode:
    adf.mf.internal.amx.addCSSClassName(innerListElement, "amx-listView-editMode");

    // Make adjustments for sticky dividers:
    var container = findListViewAncestor(innerListElement);

    // Make adjustments for the index bar:
    var indexBar = container.querySelector(".adfmf-listView-index");
    if (indexBar)
    {
      // remove index bar if exists and remove item handlers
      adf.mf.api.amx.removeDomNode(indexBar);
      adf.mf.api.amx.removeBubbleEventListener(window, "resize", indexBarResizeHandler, listViewAmxNode);

    }

    // Add the draggable handle nodes:
    var children = innerListElement.childNodes;// get the 1st-level children (e.g. listItems but could be others)
    for (var i=0; i<children.length; ++i)
    {
      var child = children[i];
      if (adf.mf.internal.amx.containsCSSClassName(child, "adfmf-listView-group"))
      {
        // in case that there is one extra div in hierarchy we need to add it's children into its parent
        var groupChildren = child.childNodes;
        for (var gi=0; gi<groupChildren.length; ++gi)
        {
          var groupChild = groupChildren[gi];
          // we can't use "adf.mf.api.amx.removeDomNode" here because
          // we want to keep content of this child
          child.removeChild(groupChild);
          if (adf.mf.internal.amx.containsCSSClassName(groupChild, "amx-listItem") &&
            !adf.mf.internal.amx.containsCSSClassName(groupChild, "amx-listItem-moreRows") &&
            !adf.mf.internal.amx.containsCSSClassName(groupChild, "amx-listView-divider"))
          {
            innerListElement.appendChild(groupChild);
            // we don't have to create handle here because we are on the same index all the time
            // thanks to the --i line.
          }
          --gi;
        }
        adf.mf.api.amx.removeDomNode(child);
        --i;
      }
      else
      {
        if (adf.mf.internal.amx.containsCSSClassName(child, "amx-listItem") &&
          !adf.mf.internal.amx.containsCSSClassName(child, "amx-listItem-moreRows"))
        {
          // child is a listItem
          createHandle(child);
        }
        else if (adf.mf.internal.amx.containsCSSClassName(child, "amx-listView-divider"))
        {
          adf.mf.api.amx.removeDomNode(child);
          --i;
        }
      }
    }

    // We use only one scroll listener for all things scrolling-related;
    // it gets replaced in the refresh phase too:
    typeHandler._createScrollHandler(listViewAmxNode, innerListElement);
  }

  function createHandle(itemElement)
  {
    var handle = document.createElement("div");
    handle.className = "amx-listItem-handle";
    itemElement.appendChild(handle);
    handleMove(itemElement);
  }

  function scrollView(scrollableElement, direction)
  {
    direction = direction == 1 ? 1 : -1;
    var stop = adf.mf.api.amx.isValueTrue(scrollableElement.getAttribute("data-stop"));
    scrollableElement.scrollTop = scrollableElement.scrollTop + (direction * 5);
    if (!stop)
    {
      setTimeout(function()
      {
        scrollView(scrollableElement, direction);
      },
      300);
    }
  }

  function _insertAfter(parentElement, referenceChild, childToInsert)
  {
    var nodeAfterInsert = referenceChild.nextSibling;
    if (nodeAfterInsert == null)
    {
      parentElement.appendChild(childToInsert);
    }
    else
    {
      parentElement.insertBefore(childToInsert, nodeAfterInsert);
    }
  }

})();
