/* Copyright (c) 2013, Oracle and/or its affiliates. All rights reserved. */
/* ----------------------------------------------------------- */
/* -------------------- amx-filmStrip.js --------------------- */
/* ----------------------------------------------------------- */

(function()
{

  /* -------------------- amx:filmStripItem --------------------- */

  /**
   * handler for the amx:filmStripItem tag that should be nested inside of the amx:filmStrip tag. It represents
   * one item of the filmStrip.
   */
  var filmStripItem = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "filmStripItem");

  /**
   *
   * @param amxNode filmStripItem amx node
   * @id id of current component
   * @return domElement div which represents one filmStrip item
   */
  filmStripItem.prototype.render = function (amxNode, id)
  {
    // atributes defined in xsd file
    var shortDesc = amxNode.getAttribute("shortDesc");
    var customStyleClass = amxNode.getAttribute("styleClass");
    var inlineStyle = amxNode.getAttribute("inlineStyle");
    var text = amxNode.getAttribute("text");
    // main container of the item
    var rootElement = document.createElement("div");
    rootElement.title = shortDesc;
    // default style class of the item
    var styleClass = "amx-filmStrip-item";
    // when custom style class is defined then add this to the classname
    if (customStyleClass)
    {
      styleClass = styleClass + " " + customStyleClass;
    }
    // set selected style if current item is selected
    var alreadySelected = _isSelectedRowKey(amxNode.getParent(), amxNode.getStampKey());
    if (alreadySelected)
    {
      styleClass = styleClass + " adfmf-filmStripItem-selected";
    }
    // set the generated classname
    rootElement.className = styleClass;
    // set inline style if defined
    if (inlineStyle)
    {
      rootElement.setAttribute("style", inlineStyle);
    }
    // content div contains all rendered descandants of current amx node.
    // content is flexible and should fill all available space in the root element.
    var content = document.createElement("div");
    var descendants = amxNode.renderDescendants();
    for (var i = 0;i < descendants.length;++i)
    {
      content.appendChild(descendants[i]);
    }
    rootElement.appendChild(content);
    content.className = "amx-filmStrip-item-content";
    // if text attribute is defined then add new div and render
    // text inside
    // text element is inflexible so it will only fill minimal space necessary
    if (text)
    {
      var textContent = document.createElement("div");
      textContent.className = "amx-filmStrip-item-text";
      textContent.textContent = text;
      rootElement.appendChild(textContent);
    }
    // add default tap handler that triggers the action events and selection events
    adf.mf.api.amx.addBubbleEventListener(rootElement, "tap", this._handleTap,
    {
      "elementId" : id, "itemAmxNode" : amxNode
    });
    // return completed div
    return rootElement;
  }

  filmStripItem.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // stop render where there is no change on filmStripItem's attributes
    if (attributeChanges.getSize() === 0)
    {
      return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
    }
    // in all other cases refresh whole component
    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  }
  /**
   * Stores the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _storeSelectedRowKey = function (amxNode, selectedRowKey)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null)
    {
      storedData = {};
    }
    if (!storedData["selectedRowKeys"])
    {
      storedData["selectedRowKeys"] = {};
    }

    selectedRowKey = selectedRowKey.trim();
    storedData["selectedRowKeys"][selectedRowKey] = selectedRowKey;

    amxNode.setVolatileState(storedData);
  }

  /**
   * Removes the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _removeSelectedRowKey = function (amxNode, selectedRowKey)
  {
    selectedRowKey = selectedRowKey.trim();
    var storedData = amxNode.getVolatileState();
    if (storedData != null && storedData["selectedRowKeys"])
    {
      delete storedData["selectedRowKeys"][selectedRowKey];
      amxNode.setVolatileState(storedData);
    }
  }

  /**
   * Removes the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _isSelectedRowKey = function (amxNode, selectedRowKey)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData != null && storedData["selectedRowKeys"])
    {
      if (storedData["selectedRowKeys"][selectedRowKey])
      {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves null or the rowKeys from filmStrip.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @return {array<String>} the array of rowKeys
   */
  var _getSelectedRowKeys = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    var result = [];
    if (storedData != null && storedData["selectedRowKeys"])
    {
      for (var key in storedData["selectedRowKeys"])
      {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Removes all rowKeys.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   */
  var _removeAllSelectedRowKeys = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData != null)
    {
      delete storedData["selectedRowKeys"];
      amxNode.setVolatileState(storedData);
    }
  }

  /**
   * Default  handler that processes the tap event on the item"s container.
   * @param event tap event
   */
  filmStripItem.prototype._handleTap = function (event)
  {
    // don"t propagate events to parent container to prevent deselection since
    // the tap on the parent container triggers the empty selection event.
    event.stopPropagation();
    event.preventDefault();

    var itemElementId = event.data["elementId"];
    var itemElement = document.getElementById(itemElementId);
    var itemAmxNode = event.data["itemAmxNode"];
    var filmStripAmxNode = itemAmxNode.getParent();
    // create action event and process it
    adf.mf.api.amx.validate(itemElement, function ()
    {
      if (adf.mf.api.amx.acceptEvent())
      {
        var amxEvent = new adf.mf.api.amx.ActionEvent();
        adf.mf.api.amx.processAmxEvent(itemAmxNode, "action", undefined, undefined, amxEvent, null);
      }
    });
    // create selection event and process it
    if (adf.mf.api.amx.acceptEvent())
    {
      var selectionType = filmStripAmxNode.getAttribute("selection");
      // process selection only when selection mode is single or multiple
      if (selectionType === "single" || selectionType === "multiple")
      {
        // rowKey of this filmStripItem
        var newSelectedRowKey = itemAmxNode.getStampKey();
        // get current selection to preserve it
        var oldSelection = _getSelectedRowKeys(filmStripAmxNode);
        // check if current row is selected and decide if this item should be selected or deselected
        var alreadySelected = _isSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        if (selectionType === "single")
        {
          // in case of the single selection clear previous selection
          var filmStripElement = document.getElementById(filmStripAmxNode.getId());
          var selectedItems = filmStripElement.querySelectorAll(".adfmf-filmStripItem-selected");
          if (selectedItems)
          {
            for (var i = 0;i < selectedItems.length;i++)
            {
              adf.mf.internal.amx.removeCSSClassName(selectedItems[i], "adfmf-filmStripItem-selected");
            }
          }
          _removeAllSelectedRowKeys(filmStripAmxNode);
        }
        else if (alreadySelected === true)
        {
          // if this is multiple selection and item is selected then only remove selection from this item
          adf.mf.internal.amx.removeCSSClassName(itemElement, "adfmf-filmStripItem-selected");
          _removeSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        }

        if (alreadySelected === false)
        {
          // add item into the selection when item is not selected
          adf.mf.internal.amx.addCSSClassName(itemElement, "adfmf-filmStripItem-selected");
          _storeSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        }
        // generate current selection and create selection event
        var selection = _getSelectedRowKeys(filmStripAmxNode);
        var selectionEvent = new adf.mf.api.amx.SelectionEvent(oldSelection, selection);
        // process this event via amx
        adf.mf.api.amx.processAmxEvent(filmStripAmxNode, "selection", undefined, undefined, selectionEvent);
      }
    }
  };

  /* ---------------------- amx:filmStrip ----------------------- */

  var filmStrip = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "filmStrip");

  filmStrip.prototype.createChildrenNodes = function (amxNode)
  {
    var variableName = amxNode.getAttribute("var");
    var dataItems = amxNode.getAttribute("value");
    var i;
    if (variableName != null && dataItems === undefined)
    {
      // Mark it so the framework knows that the children nodes cannot be
      // created until the collection model has been loaded
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return true;
    }
    else if (dataItems)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);

      // See if all the rows have been loaded, if not, force the necessary
      // number of rows to load and then build this node's children
      if (iter.getTotalCount() > iter.getAvailableCount())
      {
        adf.mf.api.amx.showLoadingIndicator();
        adf.mf.api.amx.bulkLoadProviders(dataItems, 0,  - 1, function ()
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
        function (message, resp)
        {
          adf.mf.api.adf.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE, "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", message, resp);
          adf.mf.api.amx.hideLoadingIndicator();
        });
      }
      while (iter.hasNext())
      {
        var item = iter.next();
        amxNode.createStampedChildren(iter.getRowKey(), [null], null);
      }
    }
    else
    {
      var childTags = amxNode.getTag().getChildren();
      for (i = 0;i < childTags.length;i++)
      {
        var childAmxNode = childTags[i].buildAmxNode(amxNode);
        amxNode.addChild(childAmxNode);
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  }

  filmStrip.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    if (dataItems)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);
      var variableName = amxNode.getAttribute("var");

      while (iter.hasNext())
      {
        var item = iter.next();
        adf.mf.el.pushVariable(variableName, item);
        try
        {
          if (amxNode.visitStampedChildren(iter.getRowKey(), [null], null, visitContext, callback))
          {
            return true;
          }
        }
        finally
        {
          adf.mf.el.popVariable(variableName);
        }
      }

      return false;
    }
    else
    {
      return amxNode.visitStampedChildren(null, [null], null, visitContext, callback);
    }
  }

  filmStrip.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    if (attributeChanges.hasChanged("value"))
    {
      return _updateChildrenForCollectionChange(amxNode, attributeChanges, adf.mf.api.amx.AmxNodeChangeResult["RERENDER"]);
    }
    // filtr attributes that requires only refresh
    if (attributeChanges.hasChanged("valign") || attributeChanges.hasChanged("halign"))
    {
      return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
    }
    // in all other cases rerender whole component
    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  }

  /**
   * Function used by the filmStrip to process the updateChildren response to collection
   * model changes
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode that has been updated
   * @param {adf.mf.api.amx.AmxAttributeChange} attributeChanges the information regarding what attributes
   *        were changed and how they changed
   * @param {int} successfulReturnValue if the function is able to update the AMX node children, what the
   *        return value should be. For the list view, it will be REFRESH, for iterator it will be
   *        RERENDER (the iterator is flattened so it cannot re-render the changes itself).
   * @return {int} either the successful return value or REPLACE if the function could not apply the updates
   *         to the AmxNode hierarchy
   */
  function _updateChildrenForCollectionChange(amxNode, attributeChanges, successfulReturnValue)
  {
    // See if there are itemize changes that can be handled. Currently we only support updates to the
    // providers and do not consume created or deleted providers.
    var collectionChange = attributeChanges.getCollectionChange("value");
    if (collectionChange != null && collectionChange.isItemized() && collectionChange.getCreatedKeys().length == 0 && collectionChange.getDeletedKeys().length == 0 && collectionChange.getDirtiedKeys().length == 0 && collectionChange.getUpdatedKeys().length > 0)
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

      for (var i = 0;i < numberToFind;++i)
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
   * creates drag and tap handlers for the filmStrip
   *
   * @param amxNode filmStripAmxNode
   * @domElement root element that requires these handlers
   */
  filmStrip.prototype._createHandlers = function (amxNode, domElement)
  {
    // determine the orientation of the filmstrip
    var vertical = false;
    if (amxNode.getAttribute("orientation") === "vertical")
    {
      vertical = true;
    }
    var context =
    {
      "o" : null, "t" : null
    };
    var renderer = this;

    adf.mf.api.amx.addDragListener(domElement,
    {
      "start" : function (event, dragExtra)
      {
        event.stopPropagation();
        event.preventDefault();
        // keep origin of the drag
        context["o"] =
        {
          "y" : 0 + dragExtra.pageY, "x" : 0 + dragExtra.pageX
        };
        // disable animations since position of the pages has to be updated immediately
        enableAnimation(domElement.childNodes, false);
        // start time of the event to filter swipe event
        context["t"] = (new Date()).getTime();
      },
      "drag": function (event, dragExtra)
      {
        if (context["o"] != null)
        {
          event.stopPropagation();
          event.preventDefault();

          var duration = (new Date()).getTime() - context["t"];
          if (duration > 150)
          {
            var change = 0;
            // when duration is longer than 150ms than it is not swipe so we can drag pages
            if (vertical)
            {
              change = (dragExtra.pageY - context["o"]["y"]);
            }
            else
            {
              change = (dragExtra.pageX - context["o"]["x"]);
            }

            var velocity = 0.7;
            var deceleration = 0;

            // get meta info about pages
            var activePage = renderer._getActivePage(amxNode);
            var pages = renderer._getPages(amxNode);

            var lastBorder = pages[pages.length - 1]["p"];

            if (activePage["p"] + change > 0 || activePage["p"] + change < lastBorder)
            {
              // in case that selected page is border page then add deceleration to simulate resistance
              deceleration = change * velocity;
            }
            // set transformation to all pages
            setDragTransformation(domElement.childNodes, vertical, activePage["p"] + change - deceleration);
          }
        }
      },
      "end": function (event, dragExtra)
      {
        if (context["o"] != null)
        {
          event.stopPropagation();
          event.preventDefault();

          var duration = (new Date()).getTime() - context["t"];
          // enable animations to achieve smooth transition to the nearest boundary
          enableAnimation(domElement.childNodes, true);

          var change = 0;
          if (vertical)
          {
            change = (dragExtra.pageY - context["o"]["y"]);
          }
          else
          {
            change = (dragExtra.pageX - context["o"]["x"]);
          }

          if (change !== 0)
          {
            var prev = null;
            var prevActiveID = null;

            if (duration > 150)
            {
              // in case this is not a swipe find nearest boundary and move to this boundary
              var activePage = renderer._getActivePage(amxNode);
              var pages = renderer._getPages(amxNode);

              for (var i = 0;i < pages.length;i++)
              {
                var newVal = Math.abs(pages[i]["p"] - (activePage["p"] + change));

                if (prev == null || prev > newVal)
                {
                  prev = newVal;
                  prevActiveID = pages[i]["i"];
                }
              }
              renderer.setCurrentPageById(amxNode, prevActiveID);
            }
            // prevent swipe action when user swipes in wrong angle
            else if ((vertical && Math.abs(dragExtra.pageY - context["o"]["y"]) > Math.abs(dragExtra.pageX - context["o"]["x"])) || (!vertical && Math.abs(dragExtra.pageY - context["o"]["y"]) < Math.abs(dragExtra.pageX - context["o"]["x"])))
            {
              // in case the swipe is detected only find direction of the swipe and
              // move to the previous or the next page
              var newIndex = renderer.getCurrentPageIndex(amxNode);
              var indexChange = ( - 1) * (change / (Math.abs(change)));
              if (newIndex + indexChange >  - 1 && newIndex + indexChange < renderer.getPageCount(amxNode))
              {
                newIndex += indexChange;
              }
              renderer.setCurrentPageByIndex(amxNode, newIndex);
            }
          }
          context["o"] = null;
          context["t"] = null;
        }
      }
    });
    // add tap listnere for selection removal
    adf.mf.api.amx.addBubbleEventListener(domElement, "tap", this._handleTap,
    {
      "amxNode" : amxNode
    })
  }

  /**
   * default handler for the tap event on filmStrip that removes the selection
   */
  filmStrip.prototype._handleTap = function (event)
  {
    if (adf.mf.api.amx.acceptEvent())
    {
      var filmStripAmxNode = event.data["amxNode"];
      var selectionType = filmStripAmxNode.getAttribute("selection");
      if (selectionType === "single" || selectionType === "multiple")
      {
        var oldSelection = _getSelectedRowKeys(filmStripAmxNode);
        var filmStripElement = document.getElementById(filmStripAmxNode.getId());
        // get all selected nodes and remove all class for selected items
        var selectedItems = filmStripElement.querySelectorAll(".adfmf-filmStripItem-selected");
        if (selectedItems)
        {
          for (var i = 0;i < selectedItems.length;i++)
          {
            adf.mf.internal.amx.removeCSSClassName(selectedItems[i], "adfmf-filmStripItem-selected");
          }
        }
        // clear information about selected row keys
        _removeAllSelectedRowKeys(filmStripAmxNode);
        // fire new selection event with empty selection
        var selectionEvent = new adf.mf.api.amx.SelectionEvent(oldSelection, []);
        adf.mf.api.amx.processAmxEvent(filmStripAmxNode, "selection", undefined, undefined, selectionEvent);
      }
    }
  }

  /**
   * function sets animation class name to the array of the dom elements.
   * @param elements array of the dom nodes
   * @param animation specifies if the animation should be enabled or not (values true/false)
   */
  var enableAnimation = function (elements, animation)
  {
    for (var i = 0;i < elements.length;i++)
    {
      if (animation === true)
      {
        adf.mf.internal.amx.addCSSClassName(elements[i], "animation");
      }
      else if (animation === false)
      {
        adf.mf.internal.amx.removeCSSClassName(elements[i], "animation");
      }
    }
  }

  /**
   * sets webkit transformation to the array of elements
   * @param elements array of the dom nodes
   * @param vertical Y-axis transformation if true, X-axis transformation otherwise
   * @param value new position in pixels
   */
  var setDragTransformation = function (elements, vertical, value)
  {
    for (var i = 0;i < elements.length;i++)
    {
      if (vertical)
      {
        elements[i].style["-webkit-transform"] = "translateY(" + value + "px)";
      }
      else
      {
        elements[i].style["-webkit-transform"] = "translateX(" + value + "px)";
      }
    }
  }

  /**
   * adds meta information about page and its position
   * @param amxNode filmStripAmxNode
   * @param position position of the page on the X/Y-axis
   * @param id identificator of the page
   */
  filmStrip.prototype._addPage = function (amxNode, position, id)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null)
    {
      storedData = {};
    }
    if (!storedData["_pages"])
    {
      storedData["_pages"] = [{"p" : position, "i" : id}];
    }
    else
    {
      storedData["_pages"].push(
      {
        "p" : position, "i" : id
      });
    }
    amxNode.setVolatileState(storedData);
  }

  /**
   * @param amxNode filmStripAmxNode
   * @return meta information about all the pages available for current amxNode
   */
  filmStrip.prototype._getPages = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null || !storedData["_pages"])
    {
      return [];
    }

    return storedData["_pages"];
  }

  /**
   * removes all meta informations about the pages
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype._clearPages = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null)
    {
      return;
    }
    delete storedData["_pages"];
    amxNode.setVolatileState(storedData);
  }

  /**
   * @param amxNode filmStripAmxNode
   * @return meta information about the page that is displayed at the time
   */
  filmStrip.prototype._getActivePage = function (amxNode)
  {
    var pages = this._getPages(amxNode);
    return pages[this.getCurrentPageIndex(amxNode)];
  }

  /**
   * @param amxNode filmStripAmxNode
   * @return number of pages available
   */
  filmStrip.prototype.getPageCount = function (amxNode)
  {
    return this._getPages(amxNode).length;
  }

  /**
   * @param amxNode filmStripAmxNode
   * @return id of the displayed page
   */
  filmStrip.prototype.getCurrentPageId = function (amxNode)
  {
    return this._getActivePage(amxNode)["i"];
  }

  /**
   * @param amxNode filmStripAmxNode
   * @return index of the displayed page
   */
  filmStrip.prototype.getCurrentPageIndex = function (amxNode)
  {
    var page = _getPageFromClientState(amxNode);
    return page ? page : 0;
  }

  /**
   * sets the index of the page that should be made visible
   *
   * @param amxNode filmStripAmxNode
   * @param index of page where to go
   */
  filmStrip.prototype.setCurrentPageByIndex = function (amxNode, index)
  {
    var pages = this._getPages(amxNode);
    if (!index)
    {
      index = 0;
    }
    else
    {
      index = Math.max(index, 0);
      index = Math.min(index, pages.length - 1);
    }

    if (pages[index])
    {
      // store information about newly selected index
      _storePageState(amxNode, index);
      // get pagecontrol and update its state
      var pageControl = document.getElementById(amxNode.getId() + "_pageControl");
      if (pageControl)
      {
        var pageControlButtons = pageControl.childNodes;
        for (var i = 0;i < pageControlButtons.length;i++)
        {
          if (i !== index)
          {
            adf.mf.internal.amx.removeCSSClassName(pageControlButtons[i], "selected");
          }
          else
          {
            adf.mf.internal.amx.addCSSClassName(pageControlButtons[i], "selected");
          }
        }
      }
      // detect orientation and sets the transformation of the pages
      var node = document.getElementById(amxNode.getId() + "_pageContainer");
      var orientation = amxNode.getAttribute("orientation");
      setDragTransformation(node.childNodes, orientation === "vertical", pages[index]["p"]);
    }
  }

  /**
   * sets the id of the page that should be made visible
   *
   * @param amxNode filmStripAmxNode
   * @param index of page where to go
   */
  filmStrip.prototype.setCurrentPageById = function (amxNode, pageId)
  {
    var pages = this._getPages(amxNode);
    for (var i = 0;i < pages.length;i++)
    {
      // find index of the page with given id and process setCurrentPageByIndex function
      if (pages[i]["i"] === pageId)
      {
        this.setCurrentPageByIndex(amxNode, i);
        break;
      }
    }
  }

  /**
   * parses selectedRowKeys attribute and prepares initial selection state.
   *
   * @param amxNode filmStripAmxNode
   */
  var _processInitialSelection = function (amxNode)
  {
    // remove current selection
    _removeAllSelectedRowKeys(amxNode);
    // in case that selection type is not single or multiple do nothing
    var selectionType = amxNode.getAttribute("selection");
    if (selectionType !== "single" && selectionType !== "multiple")
    {
      return;
    }
    // get initial set of rowKeys
    var selection = amxNode.getAttribute("selectedRowKeys");
    if (!selection)
    {
      return;
    }
    // parse selection in case that it is in a string format
    if (typeof selection === "string")
    {
      if (selection.indexOf(",") >  - 1)
      {
        selection = selection.split(",");
      }
      else if (selection.indexOf(" ") >  - 1)
      {
        selection = selection.split(" ");
      }
      else
      {
        selection = [selection];
      }
    }
    else if (typeof selection === "number")
    {
      selection = [selection];
    }
    // store all the rowkeys from the selection into the component"s state
    var iter = adf.mf.api.amx.createIterator(selection);
    while (iter.hasNext())
    {
      _storeSelectedRowKey(amxNode, iter.next());
    }
  }

  /**
   * @param amxNode filmStripAmxNode
   * @param rootElement filmStrip dom element
   * @param pageControlPosition position of the page control
   */
  var _renderPageControl = function (amxNode, rootElement, pageControlPosition)
  {
    var pageControl = document.createElement("div");
    pageControl.id = amxNode.getId() + "_pageControl";
    pageControl.className = "amx-filmStrip_pageControl position-" + pageControlPosition;
    rootElement.appendChild(pageControl);
  }

  /**
   * renders main div for the filmStripComponent
   * @param amxNode filmStripAmxNode
   * @param id id of the filmStrip component
   */
  filmStrip.prototype.render = function (amxNode, id)
  {
    // load all the available attributes for processing
    var orientation = amxNode.getAttribute("orientation");
    var valign = amxNode.getAttribute("valign");
    var halign = amxNode.getAttribute("halign");
    var customStyleClass = amxNode.getAttribute("styleClass");
    var inlineStyle = amxNode.getAttribute("inlineStyle");
    var shortDesc = amxNode.getAttribute("shortDesc");
    var pageControlPosition = amxNode.getAttribute("pageControlPosition");
    // process initially selected rowKeys and set them to the component"s state
    _processInitialSelection(amxNode);
    // prepare filmStrip"s conainer
    var rootElement = document.createElement("div");
    rootElement.title = shortDesc;
    // prepare default styleClass
    var styleClass = "amx-filmStrip";
    if (customStyleClass)
    {
      // append custom styleClass if defined
      styleClass = styleClass + " " + customStyleClass;
    }
    if (orientation === "vertical")
    {
      // add information about filmStrip orientation (horizontal is by default)
      styleClass = styleClass + " vertical";
    }
    if (valign)
    {
      // add information about vertical alignment of the items on the page
      styleClass = styleClass + " valign-" + valign;
    }
    if (halign)
    {
      // add information about horizontal alignment of the items on the page
      styleClass = styleClass + " halign-" + halign;
    }
    rootElement.className = styleClass;

    if (inlineStyle)
    {
      // set inline style from the attribute
      rootElement.setAttribute("style", inlineStyle);
    }
    // render page control before the page container in case that it should be at the top or at the
    // start of the filmStrip
    var rendered = false;
    if ((pageControlPosition === "start" && orientation === "vertical") || (pageControlPosition === "top" && orientation !== "vertical"))
    {
      _renderPageControl(amxNode, rootElement, pageControlPosition);
      rendered = true;
    }
    // create container for pages
    var container = document.createElement("div");
    rootElement.appendChild(container);

    var pageContainer = document.createElement("div");
    pageContainer.id = amxNode.getId() + "_pageContainer";
    pageContainer.className = "amx-filmStrip_page-container";
    container.appendChild(pageContainer);
    // render page control after the page container in case that it should be at the bottom or at the
    // end of the filmStrip
    if (rendered === false && ((pageControlPosition === "end" && orientation === "vertical") || (pageControlPosition === "bottom" && orientation !== "vertical")))
    {
      _renderPageControl(amxNode, rootElement, pageControlPosition);
    }
    else if (pageControlPosition !== "none" && rendered === false)
    {
      _renderPageControl(amxNode, rootElement, orientation === "vertical" ? "end" : "bottom");
    }
    // create default event handlers for the filmStrip and attach them to the container
    this._createHandlers(amxNode, pageContainer);
    // create one page element which will be divided into more separated pages in postDisplay phase when
    // filmStrip dimensions are available
    var pageElement = document.createElement("div");
    pageElement.className = "amx-filmStrip_page";
    pageContainer.appendChild(pageElement);
    // render filmStripItem for each object from the value collection
    var dataItems = amxNode.getAttribute("value");
    var i;
    if (dataItems)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);
      while (iter.hasNext())
      {
        var item = iter.next();
        var children = amxNode.renderDescendants(null, iter.getRowKey());
        for (i = 0; i < children.length; i++)
        {
          pageElement.appendChild(children[i]);
        }
      }
    }
    else
    {
      // render filmStripItems that are defined without value specified
      var childrenToRender = amxNode.renderDescendants();

      for (i = 0; i < childrenToRender.length; i++)
      {
        pageElement.appendChild(childrenToRender[i]);
      }
    }
    return rootElement;
  }

  /**
   * removes attached dom handlers and clear meta information about pages
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.destroy = function (rootElement, amxNode)
  {
    this._clearPages(amxNode);

    adf.mf.api.amx.removeBubbleEventListener(rootElement, "resize");
    // in stretching mode there is no resize listener attached to the window
    var isStretching = adf.mf.internal.amx.containsCSSClassName(rootElement, "amx-filmStrip-stretchItems");
    if (!isStretching)
    {
      adf.mf.api.amx.removeBubbleEventListener(window, "resize");
    }
  }

  /**
   * init event handlers and attach them into the dom tree
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.init = function (rootElement, amxNode)
  {
    // add listener that rerender component when resize event is triggered by the window
    var that = this;
    var createHandler = function (anode)
    {
      return function (event)
      {
        that.postDisplay(this, anode);
      };
    };
    adf.mf.api.amx.addBubbleEventListener(rootElement, "resize", createHandler(amxNode), null);
    // in stretching mode filmStrip doesn't need resize on the window change since
    // it doesn't need to recalculate number of pages on rotation
    var isStretching = adf.mf.internal.amx.containsCSSClassName(rootElement, "amx-filmStrip-stretchItems");
    if (!isStretching)
    {
      var createHandler2 = function (anode)
      {
        return function (event)
        {
          // push the node rerender to the end of the processing stack
          // this is especially critical for the iOS
          window.setTimeout(function()
          {
            anode.rerender();
          }, 0);
        };
      };

      adf.mf.api.amx.addBubbleEventListener(window, "resize", createHandler2(amxNode), null);
    }
  }

  /**
   * @param ancestorNode HTMLElement ancestor of the node
   * @param amxNode HTMLElement
   * @return true when node is descendand of the ancestorNode
   */
  var _isAncestor = function (ancestorNode, node)
  {
    var parentNode = node.parentNode;

    while (parentNode)
    {
      if (parentNode === ancestorNode)
        return true;

      parentNode = parentNode.parentNode;
    }
    return false;
  }

  /**
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.postDisplay = function (rootElement, amxNode)
  {
    if (!_isAncestor(document.body, rootElement))
    {
      // postpone everything to the point when filmStrip is in dom tree
      // until that filmStrip is unable to calculate proper dimensions and
      // number of pages
      return;
    }
    var orientation = amxNode.getAttribute("orientation");

    // get the first page of the filmStrip
    var pageContainer = document.getElementById(amxNode.getId() + "_pageContainer");
    var page = pageContainer.querySelector(".amx-filmStrip_page");
    var isStretching = adf.mf.internal.amx.containsCSSClassName(rootElement, "amx-filmStrip-stretchItems");

    if (page)
    {
      page.className = "amx-filmStrip_page";

      var maxSize = 0;
      var size = 0;
      if (!page.childNodes || page.childNodes.length === 0)
      {
        return;
      }
      var cs = window.getComputedStyle(page.childNodes[0]);
      // add meta info about the position of the first page
      this._addPage(amxNode, 0, 0);
      // calculate size of the item and size of the container
      if (orientation === "vertical")
      {
        // in vertical mode use height
        maxSize = rootElement.clientHeight;
        size = page.childNodes[0].offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
      }
      else
      {
        // in horizontal mode use width
        maxSize = pageContainer.clientWidth;
        size = page.childNodes[0].offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
      }

      // The calculated size may be greater than the maxSize.  This can happen, for example, when the
      // browser window is smaller than the space used by the parent element.  Ensure size is <=
      // maxSize so the correct number of amx-filmStrip_page elements can be calculated.
      size = Math.min(size, maxSize);

      // determine number of the items on one page
      var itemsOnPage = Math.floor(maxSize / size);
      if (isNaN(itemsOnPage) || isFinite(itemsOnPage) === false)
      {
        itemsOnPage = 1;
      }
      var maxItemsOnPage = undefined;
      // number of the items that can be nested in one page
      if (amxNode.isAttributeDefined("itemsPerPage"))
      {
        maxItemsOnPage = amxNode.getAttribute("itemsPerPage");
      }
      // deprecated naming should be removed as soon as the old xsd will be replaced in jdev build
      // and extension
      else if (amxNode.isAttributeDefined("maxItemsOnPage"))
      {
        maxItemsOnPage = amxNode.getAttribute("maxItemsOnPage");
      }

      if (maxItemsOnPage)
      {
        // preffer maxItemsOnPage if available and when it is lower than calculated one
        maxItemsOnPage = parseInt(maxItemsOnPage);
        if (isStretching)
        {
          itemsOnPage = maxItemsOnPage;
        }
        else
        {
          itemsOnPage = Math.min(itemsOnPage, maxItemsOnPage);
        }
      }
      // set size of the page to prevent other pages to be partially displayed
      if (orientation === "vertical")
      {
        page.style.height = maxSize + "px";
      }
      else
      {
        page.style.width = maxSize + "px";;
      }
      // prepare variable that provides information about which page should be displayed as the first one
      var firstPageWithSelection = null;

      var y;
      var childCount = Math.min(itemsOnPage, page.childNodes.length);
      for (y = 0;y < childCount;y++)
      {
        // in case that there is a selection on this page and it there is no previous selection
        // then go to this page
        if (firstPageWithSelection === null && adf.mf.internal.amx.containsCSSClassName(page.childNodes[y], "adfmf-filmStripItem-selected"))
        {
          firstPageWithSelection = 0;
          break;
        }
      }
      // in case that there is more elements on the initial page than is allowed to be then move overflowing items
      // to other pages
      if (page.childNodes.length > itemsOnPage)
      {
        var newPages = page.childNodes.length / itemsOnPage - 1;
        for (var i = 0;i < newPages;i++)
        {
          // create new page and set its dimensions
          var pageElement = document.createElement("div");
          pageElement.className = "amx-filmStrip_page";
          if (orientation === "vertical")
          {
            pageElement.style.height = maxSize + "px";
          }
          else
          {
            pageElement.style.width = maxSize + "px";;
          }
          // add metainformation about position of the page and its id
          this._addPage(amxNode, ( - 1) * ((i + 1) * maxSize), i + 1);
          // append newly created page at the end of the child list
          pageContainer.appendChild(pageElement);
          // move child nodes from the original page to the newly created one
          for (y = 0; y < itemsOnPage; y++)
          {
            if (page.childNodes.length === itemsOnPage)
            {
              break;
            }
            var newItem = page.childNodes[itemsOnPage];
            if (!newItem)
            {
              continue;
            }
            // in case that there is a selection on this page and it there is no previous selection
            // then go to this page
            if (firstPageWithSelection === null && adf.mf.internal.amx.containsCSSClassName(newItem, "adfmf-filmStripItem-selected"))
            {
              firstPageWithSelection = i + 1;
            }
            page.removeChild(newItem);
            pageElement.appendChild(newItem);
          }
          // add empty items to get items properly distributed when alignment is justify
          for (y = pageElement.childNodes.length; y < itemsOnPage; y++)
          {
            var emptyItem = document.createElement("div");
            emptyItem.className = "amx-filmStripItem amx-empty";
            pageElement.appendChild(emptyItem);
          }
        }
      }
      else
      {
        // add empty items to get items properly distributed when alignment is justify
        for (y = page.childNodes.length; y < itemsOnPage; y++)
        {
          var emptyItem = document.createElement("div");
          emptyItem.className = "amx-filmStripItem amx-empty";
          page.appendChild(emptyItem);
        }
      }
      // restore page from client state when no previous selection is detected
      if (firstPageWithSelection === null)
      {
        firstPageWithSelection = _getPageFromClientState(amxNode);
      }
      // find page control element and render the handles for each page
      var pageControl = document.getElementById(amxNode.getId() + "_pageControl");
      if (pageControl)
      {
        adf.mf.api.amx.emptyHtmlElement(pageControl);
        var pageCount = this.getPageCount(amxNode);

        for (var index = 0;index < pageCount;index++)
        {
          _createPageControlButton(pageControl, this._createPageControlTapHandler(amxNode, index, page.parentNode.childNodes));
        }
      }
      // set initial page
      this.setCurrentPageByIndex(amxNode, firstPageWithSelection);
    }
  }

  /**
   * Creates one button for the pageControl
   * @param pageControl element where the button will be added
   * @param handler tap event callback
   */
  var _createPageControlButton = function (pageControl, handler)
  {
    // element that represents button's tap area
    var pageButtonElement = document.createElement("div");
    pageButtonElement.className = "amx-filmStrip_pageControlButton";
    adf.mf.api.amx.addBubbleEventListener(pageButtonElement, "tap", handler, null);
    pageControl.appendChild(pageButtonElement);
    // visual of button can be much smaller than the button's tap area
    var pageButtonChevronElement = document.createElement("div");
    pageButtonChevronElement.className = "amx-filmStrip_pageControlButton-chevron";
    pageButtonElement.appendChild(pageButtonChevronElement);
  }

  /**
   * handler that sets the index of the page
   *
   * @param amxNode filmStripAmxNode
   * @param index index of the page to be selected
   * @param childNodes pages for the animation
   */
  filmStrip.prototype._createPageControlTapHandler = function (amxNode, index, childNodes)
  {
    var renderer = this;
    return function (e)
    {
      enableAnimation(childNodes, true);
      renderer.setCurrentPageByIndex(amxNode, index);
    };
  }

  /**
   * stores information about page index into the client state
   * @param amxNode filmStripAmxNode
   * @param pageNumber index of the selected page
   *
   */
  var _storePageState = function (amxNode, pageNumber)
  {
    var storedData = amxNode.getClientState();
    if (storedData == null)
    {
      storedData = {};
    }

    storedData["_selectedPage"] = pageNumber;

    amxNode.setClientState(storedData);
  }

  /**
   * retieves information about page index from the client state
   * @param amxNode filmStripAmxNode
   * @return index of the selected page
   *
   */
  var _getPageFromClientState = function (amxNode)
  {
    var storedData = amxNode.getClientState();
    if (storedData == null || !storedData["_selectedPage"])
    {
      return 0;
    }

    return storedData["_selectedPage"];
  }

  /**
   * refreshes filmStrip
   *
   * @param amxNode filmStripAmxNode
   * @param attributeChanges map of the changed attributes
   */
  filmStrip.prototype.refresh = function (amxNode, attributeChanges)
  {
    var rootElement = document.getElementById(amxNode.getId());
    if (attributeChanges.hasChanged("valign"))
    {
      refreshAlignment(rootElement, "valign", attributeChanges.getOldValue("valign"), amxNode.getAttribute("valign"));
    }
    if (attributeChanges.hasChanged("halign"))
    {
      refreshAlignment(rootElement, "halign", attributeChanges.getOldValue("halign"), amxNode.getAttribute("halign"));
    }
  }

  /**
   * Helper function that generates class name from alignment type and value. This class is then set into
   * the root element.
   */
  var refreshAlignment = function (rootElement, type, oldValue, value)
  {
    if (oldValue)
    {
      adf.mf.internal.amx.removeCSSClassName(rootElement, type + "-" + oldValue);
    }
    if (value)
    {
      adf.mf.internal.amx.addCSSClassName(rootElement, type + "-" + value);
    }
  }
})();
