// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * NBox component.  This nbox should never be instantiated directly.  Use the
 * newInstance function instead.
 * @class
 * @constructor
 * @extends {DvtBaseComponent}
 * @export
 */
var DvtNBox = function() {};

DvtObj.createSubclass(DvtNBox, DvtBaseComponent, 'DvtNBox');

/**
 * Returns a new instance of DvtNBox.
 * @param {DvtContext} context The rendering context.
 * @param {string} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The optional object instance on which the callback function is defined.
 * @return {DvtNBox}
 * @export
 */
DvtNBox.newInstance = function(context, callback, callbackObj) {
  return new DvtNBoxImpl(context, callback, callbackObj);
};

/**
 * Returns a copy of the default options for the specified skin.
 * @param {string} skin The skin whose defaults are being returned.
 * @return {object} The object containing defaults for this component.
 * @export
 */
DvtNBox.getDefaults = function(skin) {
  return (new DvtNBoxDefaults()).getDefaults(skin);
};

/**
 * @override
 */
DvtNBox.prototype.Init = function(context, callback, callbackObj) {
  DvtNBox.superclass.Init.call(this, context, callback, callbackObj);

  // Create the resource bundle
  this.Bundle = new DvtNBoxBundle();

  // Create the defaults object
  this.Defaults = new DvtNBoxDefaults();

  // Create the event handler and add event listeners
  this.EventManager = new DvtNBoxEventManager(this);
  this.EventManager.addListeners(this);

  // Drag and drop support
  this._dragSource = new DvtDragSource(context);
  this._dropTarget = new DvtNBoxDropTarget(this);
  this.EventManager.setDragSource(this._dragSource);

  // Set up keyboard handler on non-touch devices
  if (!DvtAgent.isTouchDevice())
    this.EventManager.setKeyboardHandler(this.CreateKeyboardHandler(this.EventManager));

  // Make sure the object has an id for clipRect naming
  this.setId('nbox' + 1000 + Math.floor(Math.random() * 1000000000));

  /**
   * Reference to animation in progress.
   * @private
   */
  this._animation = null;
};

/**
 * @override
 */
DvtNBox.prototype.SetOptions = function(options) {
  if (options) {
    // Combine the user options with the defaults and store
    this.Options = this.Defaults.calcOptions(options);

    // Process the data to add bulletproofing
    DvtNBoxDataUtils.processDataObject(this);

    // Disable animation for canvas and xml
    if (!DvtAgent.isEnvironmentBrowser()) {
      this.Options['animationOnDisplay'] = 'none';
      this.Options['animationOnDataChange'] = 'none';
    }
  }
  else if (!this.Options) // No object has ever been provided, copy the defaults
    this.Options = this.GetDefaults();
  this._displayables = [];
};

/**
 * @override
 * @export
 */
DvtNBox.prototype.render = function(options, width, height) {
  //  If datachange animation, save nbox info before rendering for later use.
  var animationOnDataChange = DvtNBoxStyleUtils.getAnimationOnDataChange(this);
  var oldNBox = null;

  if (this.Options && animationOnDataChange !== 'none') {
    oldNBox = {'options': this.Options,
                'getOptions': function() {return this['options'];},
                'displayables': this._displayables,
                'getDisplayables': function() {return this['displayables'];},
                'id': this.getId(),
                'getId': function() {return this['id']}};

    // Also expose getOptions directly, since it will be called by internal code that is renamed.
    oldNBox.getOptions = oldNBox['getOptions'];
    oldNBox.getDisplayables = oldNBox['getDisplayables'];
    oldNBox.getId = oldNBox['getId'];
  }

  // Cleanup objects from the previous render
  this.__cleanUp();

  // Update if a new options object has been provided or initialize with defaults if needed.
  this.SetOptions(options);

  // Update the width and height if provided
  if (!isNaN(width) && !isNaN(height)) {
    this.Width = width;
    this.Height = height;
  }

  // Create a new container and render the component into it
  var container = new DvtContainer(this.getCtx());
  this.addChild(container);
  DvtNBoxRenderer.render(this, container, new DvtRectangle(0, 0, this.Width, this.Height));

  // Update keyboard focus
  this._updateKeyboardFocusEffect(oldNBox);  
    
  // Animation Support
  // Stop any animation in progress
  if (this._animation) {
    this._animationStopped = true;  // TODO Rename
    this._animation.stop();
  }

  // Construct the new animation playable
  var animationOnDisplay = DvtNBoxStyleUtils.getAnimationOnDisplay(this);
  var animationDuration = DvtNBoxStyleUtils.getAnimationDuration(this);
  var bounds = new DvtRectangle(0, 0, this.Width, this.Height);
  var bBlackBoxUpdate = false; // true if this is a black box update animation

  if (!this._container) {
    if (animationOnDisplay !== 'none') {
      // AnimationOnDisplay
      this._animation = DvtBlackBoxAnimationHandler.getInAnimation(this.getCtx(), animationOnDisplay, container,
                                                                   bounds, animationDuration);
    }
  }
  else if (animationOnDataChange != 'none' && options) {
    // AnimationOnDataChange
    this._animation = DvtBlackBoxAnimationHandler.getCombinedAnimation(this.getCtx(), animationOnDataChange, this._container,
                                                                       container, bounds, animationDuration);
    if (this._animation) {           // Black Box Animation
      bBlackBoxUpdate = true;
    }
    else {
      this._deleteContainer = new DvtContainer(this.getCtx(), 'DeleteContainer');
      this.addChild(this._deleteContainer);
      var ah = new DvtNBoxDataAnimationHandler(this.getCtx(), this._deleteContainer, oldNBox, this);
      ah.constructAnimation([oldNBox], [this]);
      this._animation = ah.getAnimation();
    }
  }

  // If an animation was created, play it
  if (this._animation) {
    this.setMouseEnabled(false);
    this._animation.setOnEnd(this._onAnimationEnd, this);
    this._animation.play();
  }

  // Clean up the old container.  If doing black box animation, store a pointer and clean
  // up after animation is complete.  Otherwise, remove immediately.
  if (bBlackBoxUpdate) {
    this._oldContainer = this._container;
  }
  else if (this._container) {
    this.removeChild(this._container);  // Not black box animation, so clean up the old contents
    this._container.destroy();
  }

  // Update the pointer to the new container
  this._container = container;
};

/**
 * Performs cleanup of the previously rendered content.  Note that this doesn't cleanup anything needed for animation.
 * @protected
 */
DvtNBox.prototype.__cleanUp = function() {
  // Tooltip cleanup
  this.EventManager.hideTooltip();
};

/**
 * Hook for cleaning up animation behavior at the end of the animation.
 * @private
 */
DvtNBox.prototype._onAnimationEnd = function() {
  // Clean up the old container used by black box updates
  if (this._oldContainer) {
    this.removeChild(this._oldContainer);
    this._oldContainer.destroy();
    this._oldContainer = null;
  }

  if (this._deleteContainer) {
    this.removeChild(this._deleteContainer);
    this._deleteContainer.destroy();
  }
  this._deleteContainer = null;

  // Reset the animation flag and reference
  this._animationStopped = false;
  this._animation = null;
  this.setMouseEnabled(true);
};

/**
 * @override
 */
DvtNBox.prototype.CreateKeyboardHandler = function (manager) {
  return new DvtNBoxKeyboardHandler(manager, this);
}

/**
 * Gets the delete container used for animation
 *
 * @return {DvtContainer} the delete container
 */
DvtNBox.prototype.getDeleteContainer = function() {
  return this._deleteContainer;
};

/**
 * Return the array of registered displayables
 *
 * @return {array} the registered displayables
 */
DvtNBox.prototype.getDisplayables = function() {
  return this._displayables;
}

/**
 * Updates keyboard focus effect
 * @param {DvtNBoxImpl} oldNBox A previously used nbox component
 * @private
 */
DvtNBox.prototype._updateKeyboardFocusEffect = function(oldNBox) {
  var navigable = this.EventManager.getFocus();
  if (navigable) {
    var newNavigable;
    if (navigable instanceof DvtNBoxNode) {
      var node = DvtNBoxDataUtils.getNode(this, navigable.getData()['id']);
      newNavigable = DvtNBoxDataUtils.getDisplayable(this, node);
      if (!newNavigable && node && DvtNBoxDataUtils.getGroupBehavior(this) != DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS) {
        //find cell index using old nbox, then move focus to the cell
        var cellIndex = DvtNBoxDataUtils.getCellIndex(oldNBox, node); 
        var cellData = DvtNBoxDataUtils.getCell(this, cellIndex);
        newNavigable = DvtNBoxDataUtils.getDisplayable(this, cellData);
      }
    }
    else if (navigable instanceof DvtNBoxCategoryNode) {
      var drawerData = DvtNBoxDataUtils.getDrawer(this);
      if (drawerData)
        newNavigable = DvtNBoxDataUtils.getDisplayable(this, drawerData);
    }
    else if (navigable instanceof DvtNBoxCell) {
      if (DvtNBoxDataUtils.getGroupBehavior(this) != DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS)
        newNavigable = DvtNBoxDataUtils.getDisplayable(this, DvtNBoxDataUtils.getCell(this, DvtNBoxDataUtils.getCellIndex(this, navigable.getData())));
    }
    else if (navigable instanceof DvtNBoxDrawer) {
      // find a group node for the drawer
      var groupNodeData = DvtNBoxDataUtils.getCategoryNode(this, navigable.getData()['id']);
      newNavigable = DvtNBoxDataUtils.getDisplayable(this, groupNodeData);
    }
    if (newNavigable)
      newNavigable.showKeyboardFocusEffect();

    this.EventManager.setFocus(newNavigable);
  }
};
// APIs called by the ADF Faces drag source for DvtNBox

/**
 * If this object supports drag, returns the client id of the drag component.
 * Otherwise returns null.
 * @param mouseX the x coordinate of the mouse
 * @param mouseY the x coordinate of the mouse
 * @param clientIds the array of client ids of the valid drag components
 */
DvtNBox.prototype.isDragAvailable = function(mouseX, mouseY, clientIds) {
  return this._dragSource.isDragAvailable(clientIds);
};

/**
 * Returns the transferable object for a drag initiated at these coordinates.
 */
DvtNBox.prototype.getDragTransferable = function(mouseX, mouseY) {
  return this._dragSource.getDragTransferable(mouseX, mouseY);
};

/**
 * Returns the feedback for the drag operation.
 */
DvtNBox.prototype.getDragOverFeedback = function(mouseX, mouseY) {
  return this._dragSource.getDragOverFeedback(mouseX, mouseY);
};

/**
 * Returns an Object containing the drag context info.
 */
DvtNBox.prototype.getDragContext = function(mouseX, mouseY) {
  return this._dragSource.getDragContext(mouseX, mouseY);
};

/**
 * Returns the offset to use for the drag feedback. This positions the drag
 * feedback relative to the pointer.
 */
DvtNBox.prototype.getDragOffset = function(mouseX, mouseY) {
  return this._dragSource.getDragOffset(mouseX, mouseY);
};

/**
 * Returns the offset from the mouse pointer where the drag is considered to be located.
 */
DvtNBox.prototype.getPointerOffset = function(xOffset, yOffset) {
  return this._dragSource.getPointerOffset(xOffset, yOffset);
};

/**
 * Notifies the component that a drag started.
 */
DvtNBox.prototype.initiateDrag = function() {
  this._dragSource.initiateDrag();
};

/**
 * Clean up after the drag is completed.
 */
DvtNBox.prototype.dragDropEnd = function() {
  this._dragSource.dragDropEnd();
};
// APIs called by the ADF Faces drop target for DvtNBox

/**
 * If a drop is possible at these mouse coordinates, returns the client id
 * of the drop component. Returns null if drop is not possible.
 */
DvtNBox.prototype.acceptDrag = function(mouseX, mouseY, clientIds) {
  return this._dropTarget.acceptDrag(mouseX, mouseY, clientIds);
};

/**
 * Paints drop site feedback as a drag enters the drop site.
 */
DvtNBox.prototype.dragEnter = function() {
  this._dropTarget.dragEnter();
};

/**
 * Cleans up drop site feedback as a drag exits the drop site.
 */
DvtNBox.prototype.dragExit = function() {
  this._dropTarget.dragExit();
};

/**
 * Returns the object representing the drop site. This method is called when a valid
 * drop is performed.
 */
DvtNBox.prototype.getDropSite = function(mouseX, mouseY) {
  return this._dropTarget.getDropSite(mouseX, mouseY);
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * NBox Constants
 * @class
 * @export
 */
var DvtNBoxConstants = {};

DvtObj.createSubclass(DvtNBoxConstants, DvtObj, 'DvtNBoxConstants');

/**
 * @const
 * @export
 */
DvtNBoxConstants.COLUMNS = 'columns';

/**
 * @const
 * @export
 */
DvtNBoxConstants.ROWS = 'rows';

/**
 * @const
 * @export
 */
DvtNBoxConstants.CELLS = 'cells';

/**
 * @const
 * @export
 */
DvtNBoxConstants.NODES = 'nodes';

/**
 * @const
 * @export
 */
DvtNBoxConstants.MAXIMIZED_ROW = 'maximizedRow';

/**
 * @const
 * @export
 */
DvtNBoxConstants.MAXIMIZED_COLUMN = 'maximizedColumn';

/**
 * @const
 * @export
 */
DvtNBoxConstants.SELECTED_ITEMS = 'selectedItems';

/**
 * @const
 * @export
 */
DvtNBoxConstants.SELECTION_INFO = 'selectionInfo';

/**
 * @const
 * @export
 */
DvtNBoxConstants.HIGHLIGHTED_ITEMS = 'highlightedItems';

/**
 * @const
 * @export
 */
DvtNBoxConstants.ATTRIBUTE_GROUPS = 'attributeGroups';

/**
 * @const
 * @export
 */
DvtNBoxConstants.GROUP_BY = 'groupBy';

/**
 * @const
 * @export
 */
DvtNBoxConstants.GROUP_BEHAVIOR = 'groupBehavior';

/**
 * @const
 * @export
 */
DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL = 'withinCell';

/**
 * @const
 * @export
 */
DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS = 'acrossCells';

/**
 * @const
 * @export
 */
DvtNBoxConstants.OTHER_COLOR = 'otherColor';

/**
 * @const
 * @export
 */
DvtNBoxConstants.OTHER_THRESHOLD = 'otherThreshold';

/**
 * @const
 * @export
 */
DvtNBoxConstants.DRAWER = '_drawer';

/**
 * @const
 * @export
 */
DvtNBoxConstants.LEGEND_DISPLAY = 'legendDisplay';

/**
 * @const
 * @export
 */
DvtNBoxConstants.LEGEND_DISCLOSURE = 'legendDisclosure';

/**
 * @const
 * @export
 */
DvtNBoxConstants.HIDDEN_CATEGORIES = 'hiddenCategories';
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Implementation of DvtNBox.  This nbox defines the internal APIs of DvtNBox that are
 * needed for rendering and interactivity.
 * @param {DvtContext} context The rendering context.
 * @param {string} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The optional object instance on which the callback function is defined.
 * @class
 * @constructor
 * @extends {DvtNBox}
 */
var DvtNBoxImpl = function(context, callback, callbackObj) {
  this.Init(context, callback, callbackObj);
};

DvtObj.createSubclass(DvtNBoxImpl, DvtNBox, 'DvtNBoxImpl');

/**
 * @override
 */
DvtNBoxImpl.prototype.Init = function(context, callback, callbackObj) {
  DvtNBoxImpl.superclass.Init.call(this, context, callback, callbackObj);

  /**
   * The legend of the nbox.  This will be set during render time.
   * @type {DvtLegend}
   */
  this.legend = null;

  /**
   * The array of logical objects for this nbox.
   * @private
   */
  this._peers = [];
};

/**
 * @override
 */
DvtNBoxImpl.prototype.SetOptions = function(options) {
  DvtNBoxImpl.superclass.SetOptions.call(this, options);

  // Initialize the selection handler
  var selectionMode = this.Options['selection'];
  if (selectionMode == 'single')
    this._selectionHandler = new DvtSelectionHandler(DvtSelectionHandler.TYPE_SINGLE);
  else if (selectionMode == 'multiple')
    this._selectionHandler = new DvtSelectionHandler(DvtSelectionHandler.TYPE_MULTIPLE);
  else
    this._selectionHandler = null;

  // Pass to event handler
  this.EventManager.setSelectionHandler(this._selectionHandler);
};

/**
 * Returns the DvtEventManager for this component.
 * @return {DvtEventManager}
 */
DvtNBoxImpl.prototype.getEventManager = function() {
  return this.EventManager;
};

/**
 * Processes the specified event.
 * @param {object} event
 * @param {object} source The component that is the source of the event, if available.
 */
DvtNBoxImpl.prototype.processEvent = function(event, source) {
  var type = event.getType();
  if (type == DvtCategoryHideShowEvent.TYPE_HIDE || type == DvtCategoryHideShowEvent.TYPE_SHOW) {
    event = this._processHideShowEvent(event);
  }
  else if (type == DvtCategoryRolloverEvent.TYPE_OVER || type == DvtCategoryRolloverEvent.TYPE_OUT) {
    event = this._processRolloverEvent(event);
  }
  else if (type == DvtSelectionEvent.TYPE) {
    event = this._processSelectionEvent(event);
  }
  else if (type == DvtPanelDrawerEvent.TYPE) {
    var options = this.getSanitizedOptions();
    var disclosure = event.getSubType() == DvtPanelDrawerEvent.SUBTYPE_HIDE ? 'undisclosed' : 'disclosed';
    event = new DvtSetPropertyEvent();
    event.addParam(DvtNBoxConstants.LEGEND_DISCLOSURE, disclosure);
    options[DvtNBoxConstants.LEGEND_DISCLOSURE] = disclosure;
    this.render(options);
  }

  if (event) {
    this.__dispatchEvent(event);
  }
};

/**
 * Processes hide/show event
 * @param {DvtCategoryHideShowEvent} event hide/show event
 * @return {object} processed event
 * @private
 */
DvtNBoxImpl.prototype._processHideShowEvent = function(event) {
  var options = this.getSanitizedOptions();
  var hiddenCategories = options[DvtNBoxConstants.HIDDEN_CATEGORIES];
  if (!hiddenCategories) {
    hiddenCategories = [];
  }
  var categoryIndex = DvtArrayUtils.getIndex(hiddenCategories, event.getCategory());
  if (event.getType() == DvtCategoryHideShowEvent.TYPE_HIDE && categoryIndex == -1) {
    hiddenCategories.push(event.getCategory());
  }
  if (event.getType() == DvtCategoryHideShowEvent.TYPE_SHOW && categoryIndex != -1) {
    hiddenCategories.splice(categoryIndex, 1);
  }
  if (hiddenCategories.length == 0) {
    hiddenCategories = null;
  }
  event = new DvtSetPropertyEvent();
  event.addParam(DvtNBoxConstants.HIDDEN_CATEGORIES, hiddenCategories);
  options[DvtNBoxConstants.HIDDEN_CATEGORIES] = hiddenCategories;
  this.render(options);
  return event;
};

/**
 * Processes rollover event
 * @param {DvtCategoryRolloverEvent} event rollover event
 * @return {object} processed event
 * @private
 */
DvtNBoxImpl.prototype._processRolloverEvent = function(event) {
  var dataObjects = [];
  // First collect all the relevant data objects
  // Individual Nodes
  var nodeCount = DvtNBoxDataUtils.getNodeCount(this);
  for (var i = 0; i < nodeCount; i++) {
    dataObjects.push(DvtNBoxDataUtils.getNode(this, i));
  }
  // Category Nodes
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(this);
  var groupInfo = this.getOptions()['__groups'];
  if (groupInfo) {
    if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
      var cellCount = DvtNBoxDataUtils.getRowCount(this) * DvtNBoxDataUtils.getColumnCount(this);
      for (var i = 0; i < cellCount; i++) {
        var cellGroups = groupInfo[i + ''];
        for (var id in cellGroups) {
          dataObjects.push(cellGroups[id]);
        }
      }
    }
    else {
      for (var id in groupInfo) {
        dataObjects.push(groupInfo[id]);
      }
    }
  }
  // Now pull the list of displayables from the data objects
  var displayables = [];
  for (var i = 0; i < dataObjects.length; i++) {
    var displayable = DvtNBoxDataUtils.getDisplayable(this, dataObjects[i]);
    if (displayable) {
      displayables.push(displayable);
    }
  }
  // Manipulate the alphas
  if (event.getType() == DvtCategoryRolloverEvent.TYPE_OVER) {
    var nbox = this;
    var hasCategory = function(disp) {
      if (disp instanceof DvtNBoxNode) {
        var data = disp.getData();
        if (data['categories'] && DvtArrayUtils.getIndex(data['categories'], event.getCategory()) != -1) {
          return true;
        }
      }
      else if (disp instanceof DvtNBoxCategoryNode) {
        // Need to check the nodes that this category node represents
        // if *any* of them match the category, should return true
        var data = disp.getData();
        var categoryNodeCount = data['nodeIndices'].length;
        for (var i = 0; i < categoryNodeCount; i++) {
          var nodeData = DvtNBoxDataUtils.getNode(nbox, data['nodeIndices'][i]);
          if (nodeData['categories'] && DvtArrayUtils.getIndex(nodeData['categories'], event.getCategory()) != -1) {
            return true;
          }
        }
      }
      return false;
    };
    for (var i = 0; i < displayables.length; i++) {
      if (!hasCategory(displayables[i])) {
        displayables[i].setAlpha(DvtNBoxStyleUtils.getFadedNodeAlpha(this));
      }
    }
  }
  else if (event.getType() == DvtCategoryRolloverEvent.TYPE_OUT) {
    for (var i = 0; i < displayables.length; i++) {
      displayables[i].setAlpha(1);
    }
  }
  return null;
};

/**
 * Processes selection event.
 * @param {DvtSelectionEvent} event Selection event.
 * @return {object} Processed event.
 * @private
 */
DvtNBoxImpl.prototype._processSelectionEvent = function(event) {
  var selection = event.getSelection();
  var selectedItems = null;
  if (selection) {
    var selectedMap = {};
    for (var i = 0; i < selection.length; i++) {
      selectedMap[selection[i]] = true;
    }
    var objects = this.getObjects();
    // Process category nodes
    var drawer = null;
    var groupBy = DvtNBoxDataUtils.getGroupBy(this);
    if (groupBy && groupBy.length > 0) {
      for (var i = 0; i < objects.length; i++) {
        if (objects[i] instanceof DvtNBoxCategoryNode) {
          if (selectedMap[objects[i].getId()]) {
            // Replace with the individual ids
            selectedMap[objects[i].getId()] = false;
            var data = objects[i].getData();
            var nodeIndices = data['nodeIndices'];
            for (var j = 0; j < nodeIndices.length; j++) {
              var node = DvtNBoxDataUtils.getNode(this, nodeIndices[j]);
              selectedMap[node['id']] = true;
            }
          }
        }
        else if (objects[i] instanceof DvtNBoxDrawer) 
          drawer = objects[i];
      }
    }
    var eventSelection = [];
    selectedItems = [];
    for (var id in selectedMap) {
      if (selectedMap[id]) {
        eventSelection.push(id);
        selectedItems.push({'id': id});
      }
    }
    event = new DvtSelectionEvent(eventSelection);
  }
  DvtNBoxDataUtils.setSelectedItems(this, selectedItems);
  if (drawer)
    drawer.UpdateAccessibilityAttributes();
  return event;
};

/**
 * Distributes the specified event to this nbox's children.
 * @param {object} event
 * @param {object} source The component that is the source of the event, if available.
 */
DvtNBoxImpl.prototype._distributeToChildren = function(event, source) {
  if (this.legend && this.legend != source)
    this.legend.processEvent(event, source);

  if (this.pieNBox && this.pieNBox != source)
    this.pieNBox.processEvent(event, source);
};

/**
 * @Override
 */
DvtNBoxImpl.prototype.__cleanUp = function() {
  DvtNBoxImpl.superclass.__cleanUp.call(this);

  // Clear the list of registered peers
  this._peers.length = 0;
};

/**
 * Clean up axis and plot area for rerendering (zoom/scroll).
 */
DvtNBoxImpl.prototype.__cleanUpAxisAndPlotArea = function() {
  DvtNBoxImpl.superclass.__cleanUp.call(this);

  // Clear the list of registered peers
  this._peers.length = 0;

  // Clean up the axis and plot area
  this._container.removeChild(this.xAxis);
  this._container.removeChild(this.yAxis);
  this._container.removeChild(this.y2Axis);
  this._container.removeChild(this._plotArea);
};


/**
 * Registers the object peer with the nbox.  The peer must be registered to participate
 * in interactivity.
 * @param {DvtNBoxObjPeer} peer
 */
DvtNBoxImpl.prototype.registerObject = function(peer) {
  this._peers.push(peer);
};

/**
 * Returns the peers for all objects within the nbox.
 * @return {array}
 */
DvtNBoxImpl.prototype.getObjects = function() {
  return this._peers;
};

/**
 * Returns the options object for this nbox.
 * @return {object}
 */
DvtNBoxImpl.prototype.getOptions = function() {
  if (!this.Options)
    this.Options = this.GetDefaults();

  return this.Options;
};

/**
 * @return {number} nbox width
 */
DvtNBoxImpl.prototype.getWidth = function() {
  return this.Width;
};

/**
 * @return {number} nbox height
 */
DvtNBoxImpl.prototype.getHeight = function() {
  return this.Height;
};

/**
 * Returns the resource bundle for this nbox.
 * @return {DvtNBoxBundle}
 */
DvtNBoxImpl.prototype.getBundle = function() {
  return this.Bundle;
};

/**
 * Returns the selection handler for the nbox.
 * @return {DvtSelectionHandler} The selection handler for the nbox
 */
DvtNBoxImpl.prototype.getSelectionHandler = function() {
  return this._selectionHandler;
};

/**
  *  Returns whether selecton is supported on the nbox.
  *  @return {boolean} True if selection is turned on for the nbox and false otherwise.
  */
DvtNBoxImpl.prototype.isSelectionSupported = function() {
   return (this._selectionHandler ? true : false);
};

/**
 * Returns the array of DvtShowPopupBehaviors for the given stamp id.
 * @param {string} stampId The id of the stamp containing the showPopupBehaviors.
 * @return {array} The array of showPopupBehaviors.
 */
DvtNBoxImpl.prototype.getShowPopupBehaviors = function(stampId) {
  return this._popupBehaviors ? this._popupBehaviors[stampId] : null;
};

/**
 * Animates an update between NBox states
 *
 * @param {DvtNBoxDataAnimationHandler} animationHandler the animation handler
 * @param {object} oldNBox an object representing the old NBox state
 */
DvtNBoxImpl.prototype.animateUpdate = function(animationHandler, oldNBox) {
  DvtNBoxRenderer.animateUpdate(animationHandler, oldNBox, this);
};

/**
 * Returns a copy of the options object with internal-only properties removed
 *
 * @return {object} the options object
 */
DvtNBoxImpl.prototype.getSanitizedOptions = function() {
  return DvtJSONUtils.clone(this.getOptions(),
    function(key) {
      return key.indexOf('__') != 0;
    }
  );
};

/**
 * Returns an object containing the panel drawer styles
 *
 * @return {object} an object containing the panel drawer styles
 */
DvtNBoxImpl.prototype.getControlPanelStyleMap = function() {
  // TODO: refactor the control panel naming
  // just return an empty map and take the panel drawer defaults
  return {};
};

/**
 * Returns the clientId of the drag source owner if dragging is supported.
 * @param {array} clientIds
 * @return {string}
 */
DvtNBoxImpl.prototype.__isDragAvailable = function(clientIds) {
  // Drag and drop supported when selection is enabled, only 1 drag source
  if (this._selectionHandler)
    return clientIds[0];
  else
    return null;
};

/**
 * Returns the row keys for the current drag.
 * @param {DvtBaseTreeNode} node The node where the drag was initiated.
 * @return {array} The row keys for the current drag.
 */
DvtNBoxImpl.prototype.__getDragTransferable = function(node) {
  // Select the node if not already selected
  if (!node.isSelected()) {
    this._selectionHandler.processClick(node, false);
    this.EventManager.fireSelectionEvent();
  }

  // Gather the rowKeys for the selected objects
  var rowKeys = [];
  var selection = this._selectionHandler.getSelection();
  for (var i = 0; i < selection.length; i++) {
    var item = selection[i];
    if (item instanceof DvtNBoxNode) {
      rowKeys.push(item.getData()['id']);
    }
    else if (item instanceof DvtNBoxCategoryNode) {
      var nodeIndices = item.getData()['nodeIndices'];
      for (var j = 0; j < nodeIndices.length; j++) {
        rowKeys.push(DvtNBoxDataUtils.getNode(this, nodeIndices[j])['id']);
      }
    }
  }

  return rowKeys;
};

/**
 * Returns the displayables to use for drag feedback for the current drag.
 * @return {array} The displayables for the current drag.
 */
DvtNBoxImpl.prototype.__getDragFeedback = function() {
  // This is called after __getDragTransferable, so the selection has been updated already.
  // Gather the displayables for the selected objects
  var displayables = this._selectionHandler.getSelection().slice(0);
  return displayables;
};

/**
 * Returns the cell under the specified coordinates
 * @param {number} x the x coordinate
 * @param {number} y the y coordinate
 * @return {DvtNBoxCell} the cell
 */
DvtNBoxImpl.prototype.__getCellUnderPoint = function(x, y) {
  var cellCount = DvtNBoxDataUtils.getRowCount(this) * DvtNBoxDataUtils.getColumnCount(this);
  for (var i = 0; i < cellCount; i++) {
    var cell = DvtNBoxDataUtils.getDisplayable(this, DvtNBoxDataUtils.getCell(this, i));
    if (cell.contains(x, y)) {
      return cell;
    }
  }
  return null;
};

/**
 * Displays drop site feedback for the specified cell.
 * @param {DvtNBoxCell} cell The cell for which to show drop feedback, or null to remove drop feedback.
 * @return {DvtDisplayable} The drop site feedback, if any.
 */
DvtNBoxImpl.prototype.__showDropSiteFeedback = function(cell) {
  // Remove any existing drop site feedback
  if (this._dropSiteFeedback) {
    this._dropSiteFeedback.getParent().removeChild(this._dropSiteFeedback);
    this._dropSiteFeedback = null;
  }

  // Create feedback for the cell
  if (cell) {
    this._dropSiteFeedback = cell.renderDropSiteFeedback();
  }

  return this._dropSiteFeedback;
};
//
// $Header: dsstools/modules/dvt-shared-js/src/META-INF/bi/sharedJS/toolkit/adfinternal/nBox/DvtNBoxBundle.js /st_jdevadf_pt-12.1.3maf/1 2014/05/19 08:22:23 jchalupa Exp $
//
// DvtNBoxBundle.js
//
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.
//
//    NAME
//     DvtNBoxBundle.js - <one-line expansion of the name>
//
//    DESCRIPTION
//     <short description of component this file declares/defines>
//
//    NOTES
//     <other useful comments, qualifications, etc. >
//
//    MODIFIED  (MM/DD/YY)
//    jramanat   10/10/13 - Created
//
/**
 * Resource bundle for DvtNBox.
 * @class
 * @constructor
 * @extends {DvtBundle}
 */
var DvtNBoxBundle = function() {};

DvtObj.createSubclass(DvtNBoxBundle, DvtBundle, 'DvtNBoxBundle');

DvtNBoxBundle['_defaults'] = {
  'HIGHLIGHTED_COUNT': '{0}/{1}',
  'COLON_SEP_LIST': '{0}: {1}',
  'COMMA_SEP_LIST': '{0}, {1}',
  'OTHER': 'Other',
  'LEGEND': 'Legend',
  'GROUP_NODE': 'Group',
  'STATE_SELECTED': 'Selected',
  'STATE_UNSELECTED': 'Unselected',
  'STATE_MAXIMIZED': 'Maximized',
  'STATE_MINIMIZED': 'Minimized',
  'STATE_EXPANDED': 'Expanded',
  'STATE_COLLAPSED': 'Collapsed'
};

/**
 * @override
 */
DvtNBoxBundle.prototype.GetDefaultStringForKey = function(key) {
  return DvtNBoxBundle['_defaults'][key];
};

/**
 * @override
 */
DvtNBoxBundle.prototype.GetBundlePrefix = function() {
  return 'DvtNBoxBundle';
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Default values and utility functions for component versioning.
 * @class
 * @constructor
 * @extends {DvtBaseComponentDefaults}
 */
var DvtNBoxDefaults = function() {
  this.Init({'skyros': DvtNBoxDefaults.VERSION_1, 'alta': DvtNBoxDefaults.SKIN_ALTA});
};

DvtObj.createSubclass(DvtNBoxDefaults, DvtBaseComponentDefaults, 'DvtNBoxDefaults');

/**
 * Defaults for version 1.
 */
DvtNBoxDefaults.VERSION_1 = {
  'skin': DvtCSSStyle.SKIN_ALTA,
  'emptyText': null,
  'selection': 'multiple',
  'animationOnDataChange': 'none',
  'animationOnDisplay': 'none',
  'legendDisplay': 'auto',
  'legendDisclosure': 'disclosed',
  'groupBehavior': 'withinCell',
  'otherColor': '#636363',
  'otherThreshold': 0,

  'columnsTitle': {'style': new DvtCSSStyle('font-size: 14px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif')},
  'rowsTitle': {'style': new DvtCSSStyle('font-size: 14px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif')},

  'styleDefaults': {
    'animationDuration': 333,
    'columnLabelStyle': new DvtCSSStyle('font-size: 12px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
    'rowLabelStyle': new DvtCSSStyle('font-size: 12px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
    'cell': {'style': new DvtCSSStyle('background-color:#dddddd'),
             'minimizedStyle': new DvtCSSStyle('background-color:#f0f0f0'),
             'labelStyle': new DvtCSSStyle('font-size: 14px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;font-weight:bold'),
             'countLabelStyle': new DvtCSSStyle('font-size: 14px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
             'bodyCountLabelStyle': new DvtCSSStyle('color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
             'dropTargetStyle': new DvtCSSStyle('background-color:rgba(217, 244, 250, .75);border-color:#ccf6ff'),
             'showCount': 'off',
             'showMaximize': 'on'},
    'scrollbar': {'scrollbarBackground': 'linear-gradient(bottom, #dce2e7 0%, #f8f8f8 8%)',
                  'scrollbarBorderColor': '#dce2e7',
                  'scrollbarHandleColor': '#abb0b4',
                  'scrollbarHandleHoverColor' : '#333333',
                  'scrollbarHandleActiveColor' : '#333333'},
    'drawer': {'background': '#dddddd',
               'borderColor': '#c4ced7',
               'borderRadius': 1,
               'headerBackground': 'linear-gradient(to bottom, #f5f5f5 0%, #f0f0f0 100%)',
               'labelStyle': new DvtCSSStyle('font-size: 14px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;font-weight:bold'),
               'countLabelStyle': new DvtCSSStyle('font-size: 14px; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;font-weight:bold'),
               'countBorderRadius': 1},
    'node': {'color': '#FFFFFF',
             'labelStyle': new DvtCSSStyle('font-size: 12px; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
             'secondaryLabelStyle': new DvtCSSStyle('font-size: 11px; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif'),
             'alphaFade': 0.2,
             'borderRadius': 1,
             'hoverColor': '#FFFFFF',
             'selectionColor': '#000000',
             'icon':{'preferredSize':19,
                     'preferredSizeTouch':34,
                     'shapePaddingRatio':.15,
                     'sourcePaddingRatio':0,
                     'scaleX':1,
                     'scaleY':1, 
                     'gradientEffects':'none',
                     'opacity':1,
                     'fillPattern':'none',
                     'borderStyle':'none',
                     'borderWidth':1},
             'indicator':{'width':10,
                          'height':10,
                          'scaleX':1,
                          'scaleY':1, 
                          'gradientEffects':'none',
                          'opacity':1,
                          'fillPattern':'none',
                          'borderStyle':'none',
                          'borderWidth':1}},
    'legend': {'sectionStyle': 'font-size: 12px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif; font-weight:bold',
               'itemStyle': 'font-size: 12px; color: #252525; font-family:"Helvetica Neue", Helvetica, Arial, sans-serif',
               'markerColor': '#808080'},
    'categoryNode': {'labelStyle': new DvtCSSStyle('font-family:"Helvetica Neue", Helvetica, Arial, sans-serif')}
  },

  '__layout': {
    'componentGap': 8,
    'titleGap': 4,
    'titleComponentGap': 4,
    'nodeLabelOnlyStartLabelGap': 5,
    'nodeStartLabelGap': 3,
    'nodeEndLabelGap': 5,
    'nodeSingleLabelGap': 2,
    'nodeDualLabelGap': 2,
    'nodeInterLabelGap': 0,
    'nodeIndicatorGap': 3,
    'nodeSwatchSize': 10,
    'categoryNodeLabelGap': 5,
    'minimumCellSize': 34,
    'cellGap': 3,
    'gridGap': 6,
    'cellStartGap': 6,
    'cellEndGap': 6,
    'cellTopGap': 6,
    'cellBottomGap': 6,
    'cellLabelGap': 6,
    'countLabelGap': 10,
    'markerGap': 3,
    'minimumLabelWidth': 55,
    'maximumLabelWidth': 148,
    'drawerButtonGap': 10,
    'drawerCountHorizontalGap': 5,
    'drawerCountVerticalGap': 3,
    'drawerStartGap': 10,
    'drawerLabelGap': 7,
    'drawerHeaderHeight': 31
  }
};

DvtNBoxDefaults.SKIN_ALTA = {
};
var DvtNBoxCell = function() {};

DvtObj.createSubclass(DvtNBoxCell, DvtContainer, 'DvtNBoxCell');

/**
 * Returns a new instance of DvtNBoxCell
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this cell
 *
 * @return {DvtNBoxCell} the nbox cell
 */
DvtNBoxCell.newInstance = function(nbox, data) {
  var component = new DvtNBoxCell();
  component.Init(nbox, data);
  return component;
};

/**
 * Initializes this component
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this cell
 *
 * @protected
 */
DvtNBoxCell.prototype.Init = function(nbox, data) {
  var r = DvtNBoxDataUtils.getRowIndex(nbox, data['row']);
  var c = DvtNBoxDataUtils.getColumnIndex(nbox, data['column']);
  DvtNBoxCell.superclass.Init.call(this, nbox.getCtx(), null, 'c:' + r + ',' + c);
  this._nbox = nbox;
  this._data = data;
  this._scrollContainer = false;
};

/**
 * Gets the data object
 *
 * @return {object} the data object
 */
DvtNBoxCell.prototype.getData = function() {
  return this._data;
};

/**
 * Renders the nbox cell into the available space.
 * @param {DvtContainer} container the container to render into
 * @param {object} cellLayout object containing properties related to cellLayout
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxCell.prototype.render = function(container, cellLayout, cellCounts, availSpace) {
  container.addChild(this);
  DvtNBoxDataUtils.setDisplayable(this._nbox, this._data, this);
  DvtNBoxCellRenderer.render(this._nbox, this._data, this, cellLayout, cellCounts, availSpace);
  this._nbox.EventManager.associate(this, this);
};

/**
 * Gets the container that child nodes should be added to
 *
 * @return {DvtContainer} the container that child nodes should be added to
 */
DvtNBoxCell.prototype.getChildContainer = function() {
  return this._childContainer;
};

/**
 * Sets the container that child nodes should be added to
 *
 * @param {DvtContainer} container the container that child nodes should be added to
 */
DvtNBoxCell.prototype.setChildContainer = function(container) {
  this._childContainer = container;
};


/**
 * @override
 */
DvtNBoxCell.prototype.animateUpdate = function(animationHandler, oldCell) {
  DvtNBoxCellRenderer.animateUpdate(animationHandler, oldCell, this);
};

/**
 * @override
 */
DvtNBoxCell.prototype.animateDelete = function(animationHandler, deleteContainer) {
  DvtNBoxCellRenderer.animateDelete(animationHandler, this);

};

/**
 * @override
 */
DvtNBoxCell.prototype.animateInsert = function(animationHandler) {
  DvtNBoxCellRenderer.animateInsert(animationHandler, this);
};

/**
 * @override
 */
DvtNBoxCell.prototype.isDoubleClickable = function() {
  return true;
};

/**
 * @override
 */
DvtNBoxCell.prototype.handleDoubleClick = function() {
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(this._nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(this._nbox);
  var options = this._nbox.getSanitizedOptions();
  var event = new DvtSetPropertyEvent();
  var drawer = options[DvtNBoxConstants.DRAWER];
  options[DvtNBoxConstants.DRAWER] = null;
  event.addParam(DvtNBoxConstants.DRAWER, null);
  if (!drawer && (maximizedRow == this._data['row'] && maximizedColumn == this._data['column'])) {
    options[DvtNBoxConstants.MAXIMIZED_ROW] = null;
    event.addParam(DvtNBoxConstants.MAXIMIZED_ROW, null);
    options[DvtNBoxConstants.MAXIMIZED_COLUMN] = null;
    event.addParam(DvtNBoxConstants.MAXIMIZED_COLUMN, null);
  }
  else {
    options[DvtNBoxConstants.MAXIMIZED_ROW] = this._data['row'];
    event.addParam(DvtNBoxConstants.MAXIMIZED_ROW, this._data['row']);
    options[DvtNBoxConstants.MAXIMIZED_COLUMN] = this._data['column'];
    event.addParam(DvtNBoxConstants.MAXIMIZED_COLUMN, this._data['column']);
  }
  this._nbox.processEvent(event);
  this._nbox.render(options);
};

/**
 * Determines whether the specified coordinates are contained by this cell
 * 
 * @param {number} x the x coordinate
 * @param {number} y the y coordinate
 * @return {boolean} true if the coordinates are contained by this cell, false otherwise
 */
 DvtNBoxCell.prototype.contains = function(x, y) {
   var background = DvtNBoxDataUtils.getDisplayable(this._nbox, this._data, 'background');
   var minX = this.getTranslateX() + background.getX();
   var minY = this.getTranslateY() + background.getY();
   var maxX = minX + background.getWidth();
   var maxY = minY + background.getHeight();
   return minX <= x && x <= maxX && minY <= y && y <= maxY;
 };
 
/**
 * Renders the drop site feedback for this cell
 * 
 * @return {DvtDisplayable} the drop site feedback
 */
DvtNBoxCell.prototype.renderDropSiteFeedback = function() {
  return DvtNBoxCellRenderer.renderDropSiteFeedback(this._nbox, this);
};

/**
 * Process a keyboard event
 * @param {DvtKeyboardEvent} event
 */
DvtNBoxCell.prototype.HandleKeyboardEvent = function(event) {
  if(event.keyCode == DvtKeyboardEvent.ENTER) {
    this.hideKeyboardFocusEffect();
    this.handleDoubleClick();      
  }
};

/**
 * @override
 */
DvtNBoxCell.prototype.getAriaLabel = function() {
  var r = DvtNBoxDataUtils.getRowIndex(this._nbox, this.getData()['row']);
  var c = DvtNBoxDataUtils.getColumnIndex(this._nbox, this.getData()['column']);
  var cellIndex = r*DvtNBoxDataUtils.getColumnCount(this._nbox) + c;  
  var state = DvtNBoxDataUtils.isCellMaximized(this._nbox, cellIndex) ? this._nbox.getBundle().getTranslatedString('STATE_MAXIMIZED') :
     DvtNBoxDataUtils.isCellMinimized(this._nbox, cellIndex) ? this._nbox.getBundle().getTranslatedString('STATE_MINIMIZED') : null;
  return state ? this._nbox.getBundle().getTranslatedString('COLON_SEP_LIST', [this.getData()['shortDesc'], state]) : this.getData()['shortDesc'];  
};

//---------------------------------------------------------------------//
// Keyboard Support: DvtKeyboardNavigable impl                        //
//---------------------------------------------------------------------//
/**
 * @override
 */
DvtNBoxCell.prototype.getKeyboardBoundingBox = function() 
{
  return DvtNBoxKeyboardHandler.getKeyboardBoundingBox(this);
};

/**
 * @override
 */
DvtNBoxCell.prototype.showKeyboardFocusEffect = function() {
  this._isShowingKeyboardFocusEffect = true;
  DvtNBoxDataUtils.getDisplayable(this._nbox, this.getData(), 'focusEffect').show();
};

/**
 * @override
 */
DvtNBoxCell.prototype.hideKeyboardFocusEffect = function() {
  this._isShowingKeyboardFocusEffect = false;
  DvtNBoxDataUtils.getDisplayable(this._nbox, this.getData(), 'focusEffect').hide();
};

/**
 * @override
 */
DvtNBoxCell.prototype.isShowingKeyboardFocusEffect = function() {
  return this._isShowingKeyboardFocusEffect;
};

/**
 * @override
 */
DvtNBoxCell.prototype.getNextNavigable = function(event) 
{
  var next = null;
  if (this._nbox.EventManager.getKeyboardHandler().isNavigationEvent(event)) {
      var prevFocusObj = this._nbox.EventManager.GetPrevFocus();
      var reverseDir = DvtNBoxKeyboardHandler.isReverseDirection(this._nbox.EventManager.GetPrevDirection(), event.keyCode );
      // find a next navigable - a node, a drawer or a sibling cell
      // just started with initial focus on the cell
      // or prev focus was on the cell and we are not just reversing direction
      if (!reverseDir && (!prevFocusObj || prevFocusObj instanceof DvtNBoxCell ))
        next = this._getFirstNavigableChild(event);

      // if the previous focus was on a node or if the cell does not have nodes for setting focus 
      // or a user was on a cell but reversed direction to get back
      if (!next || prevFocusObj instanceof DvtNBoxNode || prevFocusObj instanceof DvtNBoxCategoryNode)
        next = this._getNextSibling(event); 
  }
  return next;
};

/**
 * @private
 * Gets next sibling cell based on direction
 * @param {DvtKeyboardEvent} event
 * @return {DvtKeyboardNavigable} a sibling cell
 */
DvtNBoxCell.prototype._getNextSibling = function(event) {
  var keyCode = event.keyCode;
  var cells = [];
  var cellCount =  DvtNBoxDataUtils.getRowCount(this._nbox)* DvtNBoxDataUtils.getColumnCount(this._nbox);
  for (var i = 0; i < cellCount; i++) 
    cells.push(DvtNBoxDataUtils.getDisplayable(this._nbox, DvtNBoxDataUtils.getCell(this._nbox, i)));
  return DvtKeyboardHandler.getNextNavigable (this, event, cells);
};

/**
 * @private
 * Gets a first navigable child node based on direction
 * @param {DvtKeyboardEvent} event
 * @return {DvtKeyboardNavigable} a sibling cell
 */
DvtNBoxCell.prototype._getFirstNavigableChild = function(event) {
  //node or drawer
  var childObj;
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(this._nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(this._nbox);
  var drawerData = DvtNBoxDataUtils.getDrawer(this._nbox);
  if (drawerData && maximizedRow == this.getData()['row'] && maximizedColumn == this.getData()['column'])
    childObj = DvtNBoxDataUtils.getDisplayable(this._nbox, drawerData);
  else {
    var container = this.getChildContainer();
    var nodes = [];
    for (var i = 0; i < container.getNumChildren(); i++) {
      var child = container.getChildAt(i);
      if (child instanceof DvtNBoxNode || child instanceof DvtNBoxCategoryNode)
        nodes.push(child);
    }
    childObj = DvtNBoxKeyboardHandler.getFirstNavigableNode (event, nodes);
  }
  return childObj;
};

var DvtNBoxNode = function() {};

DvtObj.createSubclass(DvtNBoxNode, DvtContainer, 'DvtNBoxNode');

/**
 * Returns a new instance of DvtNBoxNode
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this node
 *
 * @return {DvtNBoxNode} the nbox node
 */
DvtNBoxNode.newInstance = function(nbox, data) {
  var component = new DvtNBoxNode();
  component.Init(nbox, data);
  return component;
};

/**
 * Initializes this component
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this node
 *
 * @protected
 */
DvtNBoxNode.prototype.Init = function(nbox, data) {
  DvtNBoxNode.superclass.Init.call(this, nbox.getCtx(), null, data['id']);
  this._nbox = nbox;
  this._data = data;
  this._nbox.registerObject(this);
  var selectionMode = this._nbox.getOptions()['selection'];
  if (selectionMode == 'single' || selectionMode == 'multiple') {
    this.setCursor(DvtSelectionEffectUtils.getSelectingCursor());
  }
  this._maxAlpha = 1;
};

/**
 * Gets the data object
 *
 * @return {object} the data object
 */
DvtNBoxNode.prototype.getData = function() {
  return this._data;
};

/**
 * Renders the nbox node
 * @param {DvtContainer} container the container to render into
 * @param {object} nodeLayout An object containing properties related to the sizes of the various node subsections
 */
DvtNBoxNode.prototype.render = function(container, nodeLayout) {
  DvtNBoxNodeRenderer.render(this._nbox, this._data, this, nodeLayout);
  container.addChild(this);
  DvtNBoxDataUtils.setDisplayable(this._nbox, this._data, this);
  this._nbox.EventManager.associate(this, this);
};

/**
 * Returns true if this object is selectable.
 * @return {boolean} true if this object is selectable.
 */
DvtNBoxNode.prototype.isSelectable = function() {
  return true;
};

/**
 * Returns true if this object is selected.
 * @return {boolean} true if this object is selected.
 */
DvtNBoxNode.prototype.isSelected = function() {
  return this.getSelectionShape().isSelected();
};

/**
 * Specifies whether this object is selected.
 * @param {boolean} selected true if this object is selected.
 * @protected
 */
DvtNBoxNode.prototype.setSelected = function(selected) {
  this.getSelectionShape().setSelected(selected);
  this.UpdateAccessibilityAttributes();
};

/**
 * Displays the hover effect.
 */
DvtNBoxNode.prototype.showHoverEffect = function() {
  this.getSelectionShape().showHoverEffect();
};

/**
 * Hides the hover effect.
 */
DvtNBoxNode.prototype.hideHoverEffect = function() {
  this.getSelectionShape().hideHoverEffect();
};

/**
 * Sets the shape that should be used for displaying selection and hover feedback
 *
 * @param {DvtShape} selectionShape the shape that should be used for displaying selection and hover feedback
 */
DvtNBoxNode.prototype.setSelectionShape = function(selectionShape) {
  this._selectionShape = selectionShape;
};

/**
 * Gets the shape that should be used for displaying selection and hover feedback
 *
 * @return the shape that should be used for displaying selection and hover feedback
 */
DvtNBoxNode.prototype.getSelectionShape = function() {
  return this._selectionShape;
};

/**
 * Returns the datatip text for this object.
 * @param {DvtDisplayable} target The displayable that was the target of the event.
 * @return {string} The datatip text for this object.
 */
DvtNBoxNode.prototype.getDatatip = function(target, x, y) {
  return this._data['shortDesc'];
};

/**
 * Returns the border color of the datatip for this object.
 * @return {string} The datatip border color.
 */
DvtNBoxNode.prototype.getDatatipColor = function() {
  return DvtNBoxStyleUtils.getNodeColor(this._nbox, this._data);
};

/**
 * Sets the maximium alpha value for this node.  Immediately impacts the current alpha value
 * @param {number} maxAlpha the maximum alpha value for this node
 */
DvtNBoxNode.prototype.setMaxAlpha = function(maxAlpha) {
  this._maxAlpha = maxAlpha;
  this.setAlpha(this.getAlpha());
};

/**
 * Gets the maximium alpha value for this node.
 * @return {number} the maximum alpha value for this node
 */
DvtNBoxNode.prototype.getMaxAlpha = function(maxAlpha) {
  return this._maxAlpha;
};

/**
 * @override
 */
DvtNBoxNode.prototype.setAlpha = function(alpha) {
  DvtNBoxNode.superclass.setAlpha.call(this, Math.min(alpha, this._maxAlpha));
};

/**
 * @override
 */
DvtNBoxNode.prototype.animateUpdate = function(animationHandler, oldNode) {
  DvtNBoxNodeRenderer.animateUpdate(animationHandler, oldNode, this);
};

/**
 * @override
 */
DvtNBoxNode.prototype.animateDelete = function(animationHandler, deleteContainer) {
  DvtNBoxNodeRenderer.animateDelete(animationHandler, this);

};

/**
 * @override
 */
DvtNBoxNode.prototype.animateInsert = function(animationHandler) {
  DvtNBoxNodeRenderer.animateInsert(animationHandler, this);
};

/**
 * @override
 */
DvtNBoxNode.prototype.isDoubleClickable = function() {
  return true;
};

/**
 * @override
 */
DvtNBoxNode.prototype.handleDoubleClick = function() {
  this._getParentContainer().handleDoubleClick();  
};

/**
 * @override
 */
DvtNBoxNode.prototype.getShowPopupBehaviors = function() {
  if (!this._showPopupBehaviors) {
    this._showPopupBehaviors = [];
    var spbs = this._data['showPopupBehaviors'];
    if (spbs) {
      for (var i = 0; i < spbs.length; i++) {
        this._showPopupBehaviors.push(new DvtShowPopupBehavior(spbs[i]['popupId'], spbs[i]['triggerType'], spbs[i]['alignId'], spbs[i]['align']));
      }
    }
  }
  return this._showPopupBehaviors;
};

/**
 * @override
 */
DvtNBoxNode.prototype.getPopupBounds = function(behavior) {
  if (behavior && behavior.getAlign()) {
    var matrix = DvtNBoxRenderer.getGlobalMatrix(this);
    var background = DvtNBoxDataUtils.getDisplayable(this._nbox, this._data, 'background');
    return new DvtRectangle(matrix.getTx() + background.getX(), matrix.getTy() + background.getY(), background.getWidth(), background.getHeight());
  }
  return null;
};

/**
 * @override
 */
DvtNBoxNode.prototype.isDragAvailable = function(clientIds) {
  return this._nbox.__isDragAvailable(clientIds);
};

/**
 * @override
 */
DvtNBoxNode.prototype.getDragTransferable = function(mouseX, mouseY) {
  return this._nbox.__getDragTransferable(this);
};

/**
 * @override
 */
DvtNBoxNode.prototype.getDragFeedback = function(mouseX, mouseY) {
  return this._nbox.__getDragFeedback();
};

/**
 * Helper method that gets a displayable host object that contains the node - a cell or a drawer
 * @return {DvtNBoxCell|DvtNBoxDrawer} a parent container for the node
 * @private
 */
DvtNBoxNode.prototype._getParentContainer = function() {
  var container;
  var drawerData = DvtNBoxDataUtils.getDrawer(this._nbox);
  if (drawerData) { //drawer
    container = DvtNBoxDataUtils.getDisplayable(this._nbox, drawerData);
  }
  else { //cell
    var cellIndex = DvtNBoxDataUtils.getCellIndex(this._nbox, this._data);
    var cellData = DvtNBoxDataUtils.getCell(this._nbox, cellIndex);
    container = DvtNBoxDataUtils.getDisplayable(this._nbox, cellData);
  }
  return container;
};

/**
 * Process a keyboard event
 * @param {DvtKeyboardEvent} event
 */
DvtNBoxNode.prototype.HandleKeyboardEvent = function(event) {
  if(event.keyCode == DvtKeyboardEvent.ENTER) {
    var drawerData = DvtNBoxDataUtils.getDrawer(this._nbox);
    if (drawerData) { //drawer
      this._nbox.EventManager.setFocus(DvtNBoxDataUtils.getDisplayable(this._nbox, drawerData));
    }
    this.handleDoubleClick();
  }
};

/**
 * @protected
 * Updates accessibility attributes on selection event
 */
DvtNBoxNode.prototype.UpdateAccessibilityAttributes = function() {   
  if (!DvtAgent.deferAriaCreation()) {
    var desc = this.getAriaLabel();              
    if (desc)
      this.setAriaProperty('label', desc);
  }
};

/**
 * @override
 */
DvtNBoxNode.prototype.getAriaLabel = function() {
  return DvtNBoxDataUtils.buildAriaDesc(this._nbox, this, this.getDatatip(), this.isSelected());
};

//---------------------------------------------------------------------//
// Keyboard Support: DvtKeyboardNavigable impl                        //
//---------------------------------------------------------------------//
/**
 * @override
 */
DvtNBoxNode.prototype.getKeyboardBoundingBox = function() 
{
  return DvtNBoxKeyboardHandler.getKeyboardBoundingBox(this);
};

/**
 * @override
 */
DvtNBoxNode.prototype.showKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = true;
  this.showHoverEffect();

};

/**
 * @override
 */
DvtNBoxNode.prototype.hideKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = false;
  this.hideHoverEffect();
};

/**
 * @override
 */
DvtNBoxNode.prototype.isShowingKeyboardFocusEffect = function () {
  return this._isShowingKeyboardFocusEffect;
};

/**
 * @override
 */
DvtNBoxNode.prototype.getNextNavigable = function(event) 
{
  var next = null;
  if(event.keyCode == DvtKeyboardEvent.SPACE && event.ctrlKey)
  {
    // multi-select node with current focus; so we navigate to ourself and then let the selection handler take
    // care of the selection
    return this;
  }  
  else if (this._nbox.EventManager.getKeyboardHandler().isNavigationEvent(event)) {
    var container = this.getParent();
    var nodes = [];
    for (var i = 0; i < container.getNumChildren(); i++)  {
      if (container.getChildAt(i) instanceof DvtNBoxNode)
        nodes.push(container.getChildAt(i));
    }
    next = DvtNBoxKeyboardHandler.getNextNavigable (this, event, nodes);
    if (next === this)  //jump to the parent container
      next = this._getParentContainer();  
  }
  return next;
};

var DvtNBoxCategoryNode = function() {};

DvtObj.createSubclass(DvtNBoxCategoryNode, DvtContainer, 'DvtNBoxCategoryNode');

/**
 * Returns a new instance of DvtNBoxCategoryNode
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this category node
 *
 * @return {DvtNBoxCategoryNode} the nbox category node
 */
DvtNBoxCategoryNode.newInstance = function(nbox, data) {
  var component = new DvtNBoxCategoryNode();
  component.Init(nbox, data);
  return component;
};

/**
 * Initializes this component
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data for this category node
 *
 * @protected
 */
DvtNBoxCategoryNode.prototype.Init = function(nbox, data) {
  DvtNBoxCategoryNode.superclass.Init.call(this, nbox.getCtx(), null, isNaN(data['cell']) ? data['id'] : data['cell'] + ':' + data['id']);// TODO for JRAMANAT: Passing non container params weird
  this._nbox = nbox;
  this._data = data;
  this._nbox.registerObject(this);
  var selectionMode = this._nbox.getOptions()['selection'];
  if (selectionMode == 'multiple') {
    this.setCursor(DvtSelectionEffectUtils.getSelectingCursor());
  }
  this._maxAlpha = 1;
};

/**
 * Returns the data object for this category node
 *
 * @return {object} the data object for this category node
 */
DvtNBoxCategoryNode.prototype.getData = function() {
  return this._data;
};

/**
 * Renders the nbox node
 * @param {DvtContainer} container the container to render into
 * @param {number} scale The number of pixels per unit (used to determine the size of this category node based on its node count)
 * @param {number} gap The number of pixels to shrink this node (to leave padding in the force layout)
 */
DvtNBoxCategoryNode.prototype.render = function(container, scale, gap) {
  DvtNBoxCategoryNodeRenderer.render(this._nbox, this._data, this, scale, gap);
  container.addChild(this);
  DvtNBoxDataUtils.setDisplayable(this._nbox, this._data, this);
  this._nbox.EventManager.associate(this, this);
};

/**
 * Returns true if this object is selectable.
 * @return {boolean} true if this object is selectable.
 */
DvtNBoxCategoryNode.prototype.isSelectable = function() {
  var selectionMode = this._nbox.getOptions()['selection'];
  return selectionMode == 'multiple';
};

/**
 * Returns true if this object is selected.
 * @return {boolean} true if this object is selected.
 */
DvtNBoxCategoryNode.prototype.isSelected = function() {
  return this.getSelectionShape().isSelected();
};

/**
 * Specifies whether this object is selected.
 * @param {boolean} selected true if this object is selected.
 * @protected
 */
DvtNBoxCategoryNode.prototype.setSelected = function(selected) {
  this.getSelectionShape().setSelected(selected);
  this.UpdateAccessibilityAttributes();
};

/**
 * Displays the hover effect.
 */
DvtNBoxCategoryNode.prototype.showHoverEffect = function() {
  this.getSelectionShape().showHoverEffect();
};

/**
 * Hides the hover effect.
 */
DvtNBoxCategoryNode.prototype.hideHoverEffect = function() {
  this.getSelectionShape().hideHoverEffect();
};

/**
 * Sets the shape that should be used for displaying selection and hover feedback
 *
 * @param {DvtShape} selectionShape the shape that should be used for displaying selection and hover feedback
 */
DvtNBoxCategoryNode.prototype.setSelectionShape = function(selectionShape) {
  this._selectionShape = selectionShape;
};

/**
 * Gets the shape that should be used for displaying selection and hover feedback
 *
 * @return the shape that should be used for displaying selection and hover feedback
 */
DvtNBoxCategoryNode.prototype.getSelectionShape = function() {
  return this._selectionShape;
};

/**
 * Returns the datatip text for this object.
 * @param {DvtDisplayable} target The displayable that was the target of the event.
 * @return {string} The datatip text for this object.
 */
DvtNBoxCategoryNode.prototype.getDatatip = function(target, x, y) {
  return this._getCategoryLabels().join('\n');
};



/**
 * Gets the category label for this node
 *
 * @return {string} the category label for this node
 */
DvtNBoxCategoryNode.prototype.getCategoryLabel = function() {
  var categoryLabels = this._getCategoryLabels();
  while (categoryLabels.length > 1) {
    var params = [categoryLabels[0], categoryLabels[1]];
    var joined = this._nbox.getBundle().getTranslatedString('COMMA_SEP_LIST', params);
    categoryLabels.splice(0, 2, joined);
  }
  return categoryLabels[0];
};

/**
 * Returns the list of category labels for this node
 *
 * @return {array} the list of category labels
 */
DvtNBoxCategoryNode.prototype._getCategoryLabels = function() {
  var labels = [];
  if (this._data['otherNode']) {
    labels.push(this._nbox.getBundle().getTranslatedString('OTHER'));
  }
  else {
    var groupBy = DvtNBoxDataUtils.getGroupBy(this._nbox);
    for (var i = 0; i < groupBy.length; i++) {
      var label = DvtNBoxDataUtils.getCategoryLabel(this._nbox, this._data, groupBy[i]);
      if (label) {
        labels.push(label);
      }
    }
  }
  return labels;
};

/**
 * Returns the border color of the datatip for this object.
 * @return {string} The datatip border color.
 */
DvtNBoxCategoryNode.prototype.getDatatipColor = function() {
  return DvtNBoxStyleUtils.getCategoryNodeColor(this._nbox, this._data);
};

/**
 * Sets the maximium alpha value for this node.  Immediately impacts the current alpha value
 * @param {number} maxAlpha the maximum alpha value for this node
 */
DvtNBoxCategoryNode.prototype.setMaxAlpha = function(maxAlpha) {
  this._maxAlpha = maxAlpha;
  this.setAlpha(this.getAlpha());
};

/**
 * Gets the maximium alpha value for this node.
 * @return {number} the maximum alpha value for this node
 */
DvtNBoxCategoryNode.prototype.getMaxAlpha = function(maxAlpha) {
  return this._maxAlpha;
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.setAlpha = function(alpha) {
  DvtNBoxCategoryNode.superclass.setAlpha.call(this, Math.min(alpha, this._maxAlpha));
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.isDoubleClickable = function() {
  return true;
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.handleDoubleClick = function() {
  var options = this._nbox.getSanitizedOptions();
  options[DvtNBoxConstants.DRAWER] = {'id': this.getId()};
  var event = new DvtSetPropertyEvent();
  event.addParam(DvtNBoxConstants.DRAWER, this.getId());
  this._nbox.processEvent(event);
  this._nbox.render(options);
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.animateUpdate = function(animationHandler, oldNode) {
  DvtNBoxCategoryNodeRenderer.animateUpdate(animationHandler, oldNode, this);
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.animateDelete = function(animationHandler, deleteContainer) {
  DvtNBoxCategoryNodeRenderer.animateDelete(animationHandler, this);

};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.animateInsert = function(animationHandler) {
  DvtNBoxCategoryNodeRenderer.animateInsert(animationHandler, this);  
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.isDragAvailable = function(clientIds) {
  return this._nbox.__isDragAvailable(clientIds);
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.getDragTransferable = function(mouseX, mouseY) {
  return this._nbox.__getDragTransferable(this);
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.getDragFeedback = function(mouseX, mouseY) {
  return this._nbox.__getDragFeedback();
};


/**
 * Process a keyboard event
 * @param {DvtKeyboardEvent} event
 */
DvtNBoxCategoryNode.prototype.HandleKeyboardEvent = function(event) {
  if(event.keyCode == DvtKeyboardEvent.ENTER) {
    this.handleDoubleClick();
  }  
};

/**
 * @protected
 * Updates accessibility attributes on selection event
 */
DvtNBoxCategoryNode.prototype.UpdateAccessibilityAttributes = function() {
  if (!DvtAgent.deferAriaCreation()) {
    var desc = this.getAriaLabel();
    if (desc)
      this.setAriaProperty('label', desc);
  }
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.getAriaLabel = function() {
  return DvtNBoxDataUtils.buildAriaDesc(this._nbox, this, this.getDatatip(), this.isSelected());
};

//---------------------------------------------------------------------//
// Keyboard Support: DvtKeyboardNavigable impl                        //
//---------------------------------------------------------------------//
/**
 * @override
 */
DvtNBoxCategoryNode.prototype.getKeyboardBoundingBox = function() 
{
  return DvtNBoxKeyboardHandler.getKeyboardBoundingBox(this);
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.showKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = true;
  this.showHoverEffect();

};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.hideKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = false;
  this.hideHoverEffect();
};

/**
 * @override
 */
DvtNBoxCategoryNode.prototype.isShowingKeyboardFocusEffect = function () {
  return this._isShowingKeyboardFocusEffect;
};

DvtNBoxCategoryNode.prototype.getNextNavigable = function(event) 
{
  var next = null;
  if(event.keyCode == DvtKeyboardEvent.SPACE && event.ctrlKey)
  {
    // multi-select node with current focus; so we navigate to ourself and then let the selection handler take
    // care of the selection
    return this;
  }  
  else if (this._nbox.EventManager.getKeyboardHandler().isNavigationEvent(event)) {
    if (DvtNBoxDataUtils.getGroupBehavior(this._nbox) == DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS) {
      var groups = this._nbox.getOptions()['__groups'];
      var groupNodes = [];
      for (var id in groups) {
        var displayable = DvtNBoxDataUtils.getDisplayable(this._nbox, groups[id]);
        if (displayable) 
          groupNodes.push(displayable);
      }
      next = DvtNBoxKeyboardHandler.getNextNavigable(this, event, groupNodes);
    }
    else { //within cells
      var container = this.getParent();
      var nodes = [];
      for (var i = 0; i < container.getNumChildren(); i++)  {
        if (container.getChildAt(i) instanceof DvtNBoxCategoryNode)
          nodes.push(container.getChildAt(i));
      }        
      next = DvtNBoxKeyboardHandler.getNextNavigable (this, event, nodes);
      if (next === this) {  //jump to the parent container
        var cellData = DvtNBoxDataUtils.getCell(this._nbox, this._data.cell);
        next = DvtNBoxDataUtils.getDisplayable(this._nbox, cellData);
      }
    }
  }
  return next;
};

var DvtNBoxDrawer = function() {};

DvtObj.createSubclass(DvtNBoxDrawer, DvtContainer, 'DvtNBoxDrawer');

/**
 * Returns a new instance of DvtNBoxDrawer
 *
 * @param {string} nbox the parent nbox
 * @param {object} data the data associated with the currently open group
 *
 * @return {DvtNBoxDrawer} the nbox category node
 */
DvtNBoxDrawer.newInstance = function(nbox, data) {
  var component = new DvtNBoxDrawer();
  component.Init(nbox, data);
  return component;
};

/**
 * Initializes this component
 *
 * @param {DvtNBoxImpl} nbox the parent nbox
 * @param {object} data the data associated with the currently open group
 *
 * @protected
 */
DvtNBoxDrawer.prototype.Init = function(nbox, data) {
  DvtNBoxDrawer.superclass.Init.call(this, nbox.getCtx(), null, data['id'] + '_d');
  this._nbox = nbox;
  this._data = data;
  this._nbox.registerObject(this);
};

/**
 * Gets the data object
 *
 * @return {object} the data object
 */
DvtNBoxDrawer.prototype.getData = function() {
  return this._data;
};


/**
 * Renders the drawer
 * @param {DvtContainer} container the container to render into
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxDrawer.prototype.render = function(container, availSpace) {
  container.addChild(this);
  DvtNBoxDataUtils.setDisplayable(this._nbox, this._data, this);
  DvtNBoxDrawerRenderer.render(this._nbox, this._data, this, availSpace);
  this._nbox.EventManager.associate(this, this);
};

/**
 * Gets the container that child nodes should be added to
 *
 * @return {DvtContainer} the container that child nodes should be added to
 */
DvtNBoxDrawer.prototype.getChildContainer = function() {
  return this._childContainer;
};

/**
 * Sets the container that child nodes should be added to
 *
 * @param {DvtContainer} container the container that child nodes should be added to
 */
DvtNBoxDrawer.prototype.setChildContainer = function(container) {
  this._childContainer = container;
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.isDoubleClickable = function() {
  return true;
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.handleDoubleClick = function() {
  this.closeDrawer();
};

/**
 * Closes this drawer
 */
DvtNBoxDrawer.prototype.closeDrawer = function() {
  var options = this._nbox.getSanitizedOptions();
  options[DvtNBoxConstants.DRAWER] = null;
  var event = new DvtSetPropertyEvent();
  event.addParam(DvtNBoxConstants.DRAWER, null);
  this._nbox.processEvent(event);
  this._nbox.render(options);
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.animateUpdate = function(animationHandler, oldDrawer) {
  DvtNBoxDrawerRenderer.animateUpdate(animationHandler, oldDrawer, this);
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.animateDelete = function(animationHandler, deleteContainer) {
  DvtNBoxDrawerRenderer.animateDelete(animationHandler, this);

};

/**
 * @override
 */
DvtNBoxDrawer.prototype.animateInsert = function(animationHandler) {
  DvtNBoxDrawerRenderer.animateInsert(animationHandler, this);  
};

/**
 * Process a keyboard event
 * @param {DvtKeyboardEvent} event
 */
DvtNBoxDrawer.prototype.HandleKeyboardEvent = function(event) {
  if(event.keyCode == DvtKeyboardEvent.ENTER) {
    this.hideKeyboardFocusEffect();
    this.closeDrawer();      
  }
};

/**
 * @protected
 * Updates accessibility attributes on selection event
 */
DvtNBoxDrawer.prototype.UpdateAccessibilityAttributes = function() {
  if (!DvtAgent.deferAriaCreation()) {    
    var desc = this.getAriaLabel();
    if (desc) {
      var object = DvtAgent.isTouchDevice() ? DvtNBoxDataUtils.getDisplayable(this._nbox, this.getData(), 'background') : this;
      object.setAriaProperty('label', desc);
    }
  }
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.getAriaLabel = function() {
  var categoryNode = DvtNBoxDataUtils.getDisplayable(this._nbox, DvtNBoxDataUtils.getCategoryNode(this._nbox, this.getData()['id']));
  var selected = DvtNBoxDataUtils.isDrawerSelected(this._nbox, categoryNode);
  return DvtNBoxDataUtils.buildAriaDesc(this._nbox, this, categoryNode.getDatatip(), selected);
};

//---------------------------------------------------------------------//
// Keyboard Support: DvtKeyboardNavigable impl                        //
//---------------------------------------------------------------------//
/**
 * @override
 */
DvtNBoxDrawer.prototype.getKeyboardBoundingBox = function() 
{
  return DvtNBoxKeyboardHandler.getKeyboardBoundingBox(this);
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.showKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = true;
  DvtNBoxDataUtils.getDisplayable(this._nbox, this.getData(), 'focusEffect').show();
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.hideKeyboardFocusEffect = function() 
{
  this._isShowingKeyboardFocusEffect = false;
  DvtNBoxDataUtils.getDisplayable(this._nbox, this.getData(), 'focusEffect').hide();  
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.isShowingKeyboardFocusEffect = function () {
  return this._isShowingKeyboardFocusEffect;
};

/**
 * @override
 */
DvtNBoxDrawer.prototype.getNextNavigable = function(event) 
{
  var next = null;
  if (this._nbox.EventManager.getKeyboardHandler().isNavigationEvent(event)) {
  
    var maximizedCellIndex = DvtNBoxDataUtils.getMaximizedCellIndex(this._nbox);
    var prevFocusObj = this._nbox.EventManager.GetPrevFocus();
    var reverseDir = DvtNBoxKeyboardHandler.isReverseDirection(this._nbox.EventManager.GetPrevDirection(), event.keyCode );
    
    if (!maximizedCellIndex || (!reverseDir && (!prevFocusObj || prevFocusObj instanceof DvtNBoxCell ))) {
      var container = this.getChildContainer();
      var nodes = [];
      for (var i = 0; i < container.getNumChildren(); i++) {
        var child = container.getChildAt(i);
        if (child instanceof DvtNBoxNode || child instanceof DvtNBoxCategoryNode)
          nodes.push(child);
      }
      next = DvtNBoxKeyboardHandler.getFirstNavigableNode (event, nodes);
    }
    else
      next = DvtNBoxDataUtils.getDisplayable(this._nbox, DvtNBoxDataUtils.getCell(this._nbox, maximizedCellIndex));
  }
  return next;
};

/**
 * Animation handler for NBox
 * @param {DvtContext} context the platform specific context object
 * @param {DvtContainer} deleteContainer the container where deletes should be moved for animation
 * @param {object} an object representing the old nbox state
 * @param {DvtNBoxImpl} the nbox component
 * @class DvtNBoxDataAnimationHandler
 * @constructor
 */
var DvtNBoxDataAnimationHandler = function(context, deleteContainer, oldNBox, newNBox) {
  this.Init(context, deleteContainer, oldNBox, newNBox);
};

DvtObj.createSubclass(DvtNBoxDataAnimationHandler, DvtDataAnimationHandler, 'DvtNBoxDataAnimationHandler');

DvtNBoxDataAnimationHandler.DELETE = 0;
DvtNBoxDataAnimationHandler.UPDATE = 1;
DvtNBoxDataAnimationHandler.INSERT = 2;

/**
 * Initialization method called by the constructor
 *
 * @param {DvtContext} context the platform specific context object
 * @param {DvtContainer} deleteContainer the container where deletes should be moved for animation
 * @param {object} an object representing the old nbox state
 * @param {DvtNBoxImpl} the nbox component
 */
DvtNBoxDataAnimationHandler.prototype.Init = function(context, deleteContainer, oldNBox, newNBox) {
  DvtNBoxDataAnimationHandler.superclass.Init.call(this, context, deleteContainer);
  this._oldNBox = oldNBox;
  this._newNBox = newNBox;
};

/**
 * Returns the old NBox state
 *
 * @return {object} an object representing the old nbox state
 */
DvtNBoxDataAnimationHandler.prototype.getOldNBox = function() {
  return this._oldNBox;
};

/**
 * Returns the new NBox state
 *
 * @return {DvtNBoxImpl} the nbox component
 */
DvtNBoxDataAnimationHandler.prototype.getNewNBox = function() {
  return this._newNBox;
};

/**
 * Gets the animation duration
 *
 * @return {number} the animation duration
 */
 DvtNBoxDataAnimationHandler.prototype.getAnimationDuration = function() {
   return DvtNBoxStyleUtils.getAnimationDuration(this._oldNBox);
 };
/**
 * Drop Target event handler for DvtNBox
 * @param {DvtNBoxImpl} view
 * @class DvtNBoxDropTarget
 * @extends DvtDropTarget
 * @constructor
 */
var DvtNBoxDropTarget = function(view) {
  this._view = view;
};

DvtObj.createSubclass(DvtNBoxDropTarget, DvtDropTarget, 'DvtNBoxDropTarget');

/**
 * @override
 */
DvtNBoxDropTarget.prototype.acceptDrag = function(mouseX, mouseY, clientIds) {
  // If there is no cell under the point, then don't accept the drag
  var cell = this._view.__getCellUnderPoint(mouseX, mouseY);
  if (!cell) {
    this._view.__showDropSiteFeedback(null);
    return null;
  }
  else if (cell != this._dropSite) {
    this._view.__showDropSiteFeedback(cell);
    this._dropSite = cell;
  }

  // Return the first clientId, since this component has only a single drag source
  return clientIds[0];
};

/**
 * @override
 */
DvtNBoxDropTarget.prototype.dragExit = function() {
  // Remove drop site feedback
  this._view.__showDropSiteFeedback(null);
  this._dropSite = null;
};

/**
 * @override
 */
DvtNBoxDropTarget.prototype.getDropSite = function(mouseX, mouseY) {
  var cell = this._view.__getCellUnderPoint(mouseX, mouseY);
  if (cell) {
    var data = cell.getData();
    return {row: data['row'], column: data['column']};
  }
  else
    return null;
};
// Copyright (c) 2014, Oracle and/or its affiliates. All rights reserved.
/**
 * Event Manager for DvtNBox.
 * @param {DvtNBoxImpl} NBox component
 * @class
 * @extends DvtEventManager
 * @constructor
 */
var DvtNBoxEventManager = function(nbox) {
  this.Init(nbox.getCtx(), nbox.processEvent, nbox);
  this._nbox = nbox;
};

DvtObj.createSubclass(DvtNBoxEventManager, DvtEventManager, 'DvtNBoxEventManager');

/**
 * @override
 */
DvtNBoxEventManager.prototype.OnDblClick = function(event) {
  DvtNBoxEventManager.superclass.OnDblClick.call(this, event);
  this._handleDblClick(this.GetCurrentTargetForEvent(event));
};

/**
 * @override
 */
DvtNBoxEventManager.prototype.OnComponentTouchDblClick = function(event) {
  DvtNBoxEventManager.superclass.OnComponentTouchDblClick.call(this, event);
  this._handleDblClick(this.GetCurrentTargetForEvent(event));
};

/**
 * Handler for mouse or touch double click actions
 *
 * @param {DvtDisplayable} the event target
 * @private
 */
DvtNBoxEventManager.prototype._handleDblClick = function(displayable) {
  var logicalObject = this.GetLogicalObject(displayable);
  if (logicalObject && logicalObject.isDoubleClickable && logicalObject.isDoubleClickable() && logicalObject.handleDoubleClick) {
    logicalObject.handleDoubleClick();
  }
};

/**
 * @override
 */
DvtNBoxEventManager.prototype.ProcessKeyboardEvent = function(event)
{   
  var eventConsumed = false;
  var keyCode = event.keyCode;
  var navigable = this.getFocus(); // the item with current keyboard focus
  
  if (keyCode == DvtKeyboardEvent.ENTER ) { //drill up and down
    if(navigable && navigable.HandleKeyboardEvent)
      navigable.HandleKeyboardEvent(event);
    navigable = null;
  }
  else if (event.keyCode == DvtKeyboardEvent.SPACE && event.ctrlKey ) { //multi-select event
    if (navigable instanceof DvtNBoxCategoryNode || navigable instanceof DvtNBoxNode)
      eventConsumed = DvtNBoxEventManager.superclass.ProcessKeyboardEvent.call(this, event);
  } 
  else
    eventConsumed = DvtNBoxEventManager.superclass.ProcessKeyboardEvent.call(this, event);

  this.SetPrevDirection(this.getKeyboardHandler().isNavigationEvent(event) ? keyCode : null);    
  this.SetPrevFocus(navigable);
  return eventConsumed;
};

/**
 * Set a displayable object that previously had a keyboard focus
 * @param {DvtContainer} obj A displayable object that previously had a keyboard focus
 * @protected
 */
DvtNBoxEventManager.prototype.SetPrevFocus = function(obj) {
  this._prevFocusedObj = obj;
};

/**
 * Get a displayable object that previously had a keyboard focus
 * @return {DvtContainer} A displayable object that previously had a keyboard focus
 * @protected
 */
DvtNBoxEventManager.prototype.GetPrevFocus = function() {
  return this._prevFocusedObj;
};

/**
 * Set previous keyboard keycode
 * @param {number} keycode A previous keyboard keycode
 * @protected
 */
DvtNBoxEventManager.prototype.SetPrevDirection = function(keycode) {
  this._prevDirection = keycode;
};

/**
 * Get previous keyboard keycode
 * @return {number} keycode A previous keyboard keycode
 * @protected
 */
DvtNBoxEventManager.prototype.GetPrevDirection = function() {
  return this._prevDirection;
};
//
// $Header: dsstools/modules/dvt-shared-js/src/META-INF/bi/sharedJS/toolkit/adfinternal/nBox/DvtNBoxKeyboardHandler.js /st_jdevadf_pt-12.1.3maf/1 2014/05/19 08:22:23 jchalupa Exp $
//
// DvtNBoxKeyboardHandler.js
//
// Copyright (c) 2014, Oracle and/or its affiliates. All rights reserved.
//
//    NAME
//     DvtNBoxKeyboardHandler.js - keyboard handler for NBox
//
//    DESCRIPTION
//     <short description of component this file declares/defines>
//
//    NOTES
//     <other useful comments, qualifications, etc. >
//
//    MODIFIED  (MM/DD/YY)
//    nbalatsk   02/24/14 - Created
//
/*---------------------------------------------------------------------------------*/
/*  DvtNBoxKeyboardHandler     Keyboard handler for NBox                     */
/*---------------------------------------------------------------------------------*/
/**
 * Keyboard handler for the NBox component
 * @param {DvtEventManager} manager The owning DvtEventManager 
 * @param {DvtNBox} nbox The owning NBox component
 * @class DvtNBoxKeyboardHandler
 * @constructor
 * @extends DvtKeyboardHandler
 */
var  DvtNBoxKeyboardHandler = function(manager, nbox)
{
    this.Init(manager, nbox);
}

DvtObj.createSubclass(DvtNBoxKeyboardHandler, DvtKeyboardHandler, "DvtNBoxKeyboardHandler");

/**
 * @override
 */
DvtNBoxKeyboardHandler.prototype.Init = function(manager, nbox) {
  DvtNBoxKeyboardHandler.superclass.Init.call(this, manager);
  this._nbox = nbox;
}

/**
 * @override
 */ 
DvtNBoxKeyboardHandler.prototype.processKeyDown = function(event) {
  var keyCode = event.keyCode;
  
  if (keyCode == DvtKeyboardEvent.TAB) {
    var currentNavigable = this._eventManager.getFocus();
    var next = null;
    event.preventDefault();  
    if (!currentNavigable) {
      var drawerData = DvtNBoxDataUtils.getDrawer(this._nbox);
      if (drawerData) { //drawer
        next = DvtNBoxDataUtils.getDisplayable(this._nbox, drawerData);
      }
      else if (DvtNBoxDataUtils.getGroupBehavior(this._nbox) == DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS){
        //find first group node
        var groups = this._nbox.getOptions()['__groups'];
        var groupNodes = [];
        for (var id in groups) {
          var displayable = DvtNBoxDataUtils.getDisplayable(this._nbox, groups[id]);
          if (displayable) 
            groupNodes.push(displayable);
        }
        next = this._nbox.EventManager.getKeyboardHandler().getDefaultNavigable(groupNodes);
      }
      else {
        var index = DvtNBoxDataUtils.getColumnCount(this._nbox)*(DvtNBoxDataUtils.getRowCount(this._nbox)-1);
        next = DvtNBoxDataUtils.getDisplayable(this._nbox, DvtNBoxDataUtils.getCell(this._nbox, index));
      }
    }
    else {
      next = currentNavigable;
    }
    if (next)     
      this._eventManager.setFocus(next);
    return next;
  }
  return DvtNBoxKeyboardHandler.superclass.processKeyDown.call(this, event);  
}

/**
 * @override
 */
DvtNBoxKeyboardHandler.prototype.isSelectionEvent = function(event)
{
  if (event.keyCode == DvtKeyboardEvent.TAB)
    return false;
  else
    return  this.isNavigationEvent(event) && !event.ctrlKey;
}

/**
 * @override
 */ 
DvtNBoxKeyboardHandler.prototype.isMultiSelectEvent = function(event)
{
  return  event.keyCode == DvtKeyboardEvent.SPACE && event.ctrlKey;
}

/**
 * Simple implementation to return a first navigable item based on direction - upper top left, upper top right or lower bottom left
 * @param {DvtKeyboardEvent} event
 * @param {Array} navigableItems An array of items that could receive focus next
 * @return {DvtKeyboardNavigable} The object that can get keyboard focus as a result of the keyboard event.
 */
DvtNBoxKeyboardHandler.getFirstNavigableNode  = function(event, navigableItems) {
  if(!navigableItems || navigableItems.length <= 0)
    return null;
    
  var direction = event.keyCode;  
  var navigable = navigableItems[0];
  var navigablePos = navigable.getKeyboardBoundingBox().getCenter();
  
  for(var i=1; i<navigableItems.length; i++)
  {
    var testObj = navigableItems[i];
    var testPos = testObj.getKeyboardBoundingBox().getCenter(); 
    
    if ( (direction == DvtKeyboardEvent.RIGHT_ARROW && testPos.x <= navigablePos.x && testPos.y <= navigablePos.y) || //upper top left
        (direction == DvtKeyboardEvent.LEFT_ARROW && testPos.x >= navigablePos.x && testPos.y >= navigablePos.y) || //upper top right
        (direction == DvtKeyboardEvent.UP_ARROW && testPos.x <= navigablePos.x && testPos.y >= navigablePos.y) ||    // lower bottom left
        (direction == DvtKeyboardEvent.DOWN_ARROW && testPos.x <= navigablePos.x && testPos.y <= navigablePos.y) ) { // upper top left
      navigable = testObj;
      navigablePos = testPos;      
    }
  }
  return navigable;  
}

/**
 * Simple implementation that returns a navigable item based on direction and bounding box center coordinates for the current object and candidate objects
 * @param {DvtKeyboardNavigable} currentNavigable The DvtKeyboardNavigable item with current focus
 * @param {DvtKeyboardEvent} event
 * @param {Array} navigableItems An array of items that could receive focus next
 * @return {DvtKeyboardNavigable} The object that can get keyboard focus as a result of the keyboard event.
 */
DvtNBoxKeyboardHandler.getNextNavigable = function(curr, event, navigableItems) {
  if(!navigableItems || navigableItems.length <= 0)
    return null;
    
  var next;
  var nextDeltaPrimary = Number.MAX_VALUE;
  var nextDeltaSecondary = Number.MAX_VALUE;
  
  var direction = event.keyCode;
  var bHoriz = (direction == DvtKeyboardEvent.RIGHT_ARROW || direction == DvtKeyboardEvent.LEFT_ARROW) ? true: false;
  var bVert = !bHoriz;
  var currPos = curr.getKeyboardBoundingBox().getCenter();
  for(var i=0; i<navigableItems.length; i++)
  {
    var testObj = navigableItems[i];
    if (testObj === curr)
      continue;
      
    var testPos = testObj.getKeyboardBoundingBox().getCenter();
    var deltaPrimary = bHoriz ? Math.abs(testPos.x - currPos.x) : Math.abs(testPos.y - currPos.y);
    var deltaSecondary = bVert ? Math.abs(testPos.x - currPos.x) : Math.abs(testPos.y - currPos.y);

    if (  ((direction == DvtKeyboardEvent.RIGHT_ARROW && testPos.x > currPos.x) || 
          (direction == DvtKeyboardEvent.LEFT_ARROW && testPos.x < currPos.x) ||
          (direction == DvtKeyboardEvent.DOWN_ARROW && testPos.y > currPos.y) ||
          (direction == DvtKeyboardEvent.UP_ARROW && testPos.y < currPos.y) ) &&
          (deltaPrimary < nextDeltaPrimary || (deltaPrimary === nextDeltaPrimary &&  deltaSecondary < nextDeltaSecondary)) ) {
      next = testObj;
      nextDeltaPrimary = deltaPrimary;
      nextDeltaSecondary = deltaSecondary;
    }
  }
  return next ? next : curr;
}

/**
 * Helper methods that gets keyboardBoundingBox for an nbox displayable object
 * @param {DvtNBoxCategoryNode|DvtNBoxCell|DvtNBoxDrawer|DvtNBoxNode} obj A displayable object that needs keyboard bounding box
 */
DvtNBoxKeyboardHandler.getKeyboardBoundingBox = function(obj) {
  var bounds = obj.getDimensions();
  var stageP1 = obj.localToStage(new DvtPoint(bounds.x, bounds.y));
  var stageP2 = obj.localToStage(new DvtPoint(bounds.x+bounds.w, bounds.y+bounds.h));
  return new DvtRectangle(stageP1.x, stageP1.y, stageP2.x-stageP1.x, stageP2.y-stageP1.y);
}

/**
 * Helper methods that isReverseDirection
 * @param {number} oldkey A previous keyboard keycode 
 * @param {number} newkey A new keyboard keycode 
 * @return {boolean} True if the direction is reversed
 */
DvtNBoxKeyboardHandler.isReverseDirection = function(oldkey, newkey) {
  return ((oldkey === DvtKeyboardEvent.UP_ARROW && newkey === DvtKeyboardEvent.DOWN_ARROW) ||
    (newkey === DvtKeyboardEvent.UP_ARROW && oldkey === DvtKeyboardEvent.DOWN_ARROW) ||
    (newkey === DvtKeyboardEvent.LEFT_ARROW && oldkey === DvtKeyboardEvent.RIGHT_ARROW) ||
    (newkey === DvtKeyboardEvent.RIGHT_ARROW && oldkey === DvtKeyboardEvent.LEFT_ARROW) );
}
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Renderer for DvtNBoxImpl.
 * @class
 */
var DvtNBoxRenderer = new Object();

DvtObj.createSubclass(DvtNBoxRenderer, DvtObj, 'DvtNBoxRenderer');

/**
 * Renders the nbox contents into the available space.
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer.render = function(nbox, container, availSpace) {
  DvtNBoxRenderer._renderBackground(nbox, container, availSpace);
  DvtNBoxRenderer._renderLegend(nbox, container, availSpace);
  DvtNBoxRenderer._adjustAvailSpace(availSpace);
  var cellCounts = DvtNBoxRenderer._calculateCellCounts(nbox);
  var cellLayout = DvtNBoxCellRenderer.calculateCellLayout(nbox, cellCounts);

  DvtNBoxRenderer._renderTitles(nbox, container, cellLayout, availSpace);
  DvtNBoxRenderer._adjustAvailSpace(availSpace);
  DvtNBoxRenderer._renderCells(nbox, container, cellCounts, cellLayout, availSpace);
  DvtNBoxRenderer._renderNodes(nbox, container, cellCounts, availSpace);
  DvtNBoxRenderer._renderInitialSelection(nbox);
  DvtNBoxRenderer._fixZOrder(nbox);
};

/**
 * Renders the nbox background.
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderBackground = function(nbox, container, availSpace) {
  var options = nbox.getOptions();

  // NBox background: Apply invisible background for interaction support
  var rect = new DvtRect(nbox.getCtx(), availSpace.x, availSpace.y, availSpace.w, availSpace.h);
  rect.setInvisibleFill();
  container.addChild(rect);

  // WAI-ARIA
  rect.setAriaRole('img');
  rect.setAriaProperty('label', options['shortDesc']);
};

/**
 * Renders the nbox legend.
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderLegend = function(nbox, container, availSpace) {
  var legendData = DvtNBoxDataUtils.getLegend(nbox);
  if (legendData) {
    var options = nbox.getOptions();
    var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

    var panelDrawer = new DvtPanelDrawer(nbox.getCtx(), nbox.processEvent, nbox);
    panelDrawer.addEvtListener(DvtPanelDrawerEvent.TYPE, nbox.processEvent, false, nbox);
    panelDrawer.setDockSide(DvtPanelDrawer.DOCK_TOP);
    container.addChild(panelDrawer);

    var legend = DvtLegend.newInstance(nbox.getCtx(), nbox.processEvent, nbox);
    container.addChild(legend);
    var preferredSize = legend.getPreferredSize(legendData, availSpace.w / 3, availSpace.h);
    legend.render(legendData, preferredSize.w, preferredSize.h);
    container.removeChild(legend);

    var legendContainer = new DvtContainer(nbox.getCtx());
    var sizingRect = new DvtRect(nbox.getCtx(), 0, 0, preferredSize.w, preferredSize.h);
    sizingRect.setInvisibleFill();
    legendContainer.addChild(sizingRect);
    legendContainer.addChild(legend);

    var legendEna = options['resources']['legend_ena'];
    var legendOvr = options['resources']['legend_ovr'];
    var legendDwn = options['resources']['legend_dwn'];
    var legendEnaImg = new DvtImage(nbox.getCtx(), legendEna['src'], 0, 0, legendEna['width'], legendEna['height']);
    var legendOvrImg = new DvtImage(nbox.getCtx(), legendOvr['src'], 0, 0, legendOvr['width'], legendOvr['height']);
    var legendDwnImg = new DvtImage(nbox.getCtx(), legendDwn['src'], 0, 0, legendDwn['width'], legendDwn['height']);
    panelDrawer.addPanel(legendContainer, legendEnaImg, legendOvrImg, legendDwnImg, nbox.getBundle().getTranslatedString('LEGEND'), 'legend');
    panelDrawer.renderComponent();
    if (options[DvtNBoxConstants.LEGEND_DISCLOSURE] == 'disclosed') {
      panelDrawer.setDisplayedPanelId('legend');
      panelDrawer.setDisclosed(true, true);
    }
    var dims = panelDrawer.getDimensions();
    panelDrawer.setTranslate(rtl ? 0 : availSpace.w, 0);
    if (rtl) {
      panelDrawer.setDiscloseDirection(DvtPanelDrawer.DIR_RIGHT);
      availSpace.x += dims.w;
    }
    availSpace.w -= dims.w;
    DvtNBoxDataUtils.setDisplayable(nbox, legendData, legend, 'legend');
    DvtNBoxDataUtils.setDisplayable(nbox, legendData, panelDrawer, 'panelDrawer');
  }
};


/**
 * Renders the nbox titles and updates the available space.
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {object} cellLayout Aan object containing sizes related to cell layout, based upon the first specified cell
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderTitles = function(nbox, container, cellLayout, availSpace) {
  var options = nbox.getOptions();
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);

  var componentGap = options['__layout']['componentGap'];
  var titleGap = options['__layout']['titleGap'];
  var titleComponentGap = options['__layout']['titleComponentGap'];
  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  availSpace.x += rtl ? 0 : componentGap;
  availSpace.y += componentGap;
  availSpace.w -= 2 * componentGap;
  availSpace.h -= 2 * componentGap;

  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  var maximizedColumnIndex = maximizedColumn ? DvtNBoxDataUtils.getColumnIndex(nbox, maximizedColumn) : -1;
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedRowIndex = maximizedRow ? DvtNBoxDataUtils.getRowIndex(nbox, maximizedRow) : -1;

  var columnsTitle = null;
  var rowsTitle = null;
  var columnLabels = [];
  var rowLabels = [];
  var columnsTitleHeight = 0;
  var rowsTitleWidth = 0;
  var rowTitleGap = 0;
  var columnTitleGap = 0;
  var columnLabelsHeight = 0;
  var rowLabelsWidth = 0;
  var rowTitleComponentGap = 0;
  var columnTitleComponentGap = 0;

  if (options['columnsTitle'] && options['columnsTitle']['text']) {
    columnsTitle = DvtNBoxRenderer.createText(nbox.getCtx(), options['columnsTitle']['text'], options['columnsTitle']['style'], DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
    container.addChild(columnsTitle);
    columnsTitleHeight = DvtTextUtils.guessTextDimensions(columnsTitle).h;
  }
  if (options['rowsTitle'] && options['rowsTitle']['text']) {
    rowsTitle = DvtNBoxRenderer.createText(nbox.getCtx(), options['rowsTitle']['text'], options['rowsTitle']['style'], DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
    container.addChild(rowsTitle);
    rowsTitleWidth = DvtTextUtils.guessTextDimensions(rowsTitle).h;
  }

  for (var i = 0; i < columnCount; i++) {
    var column = DvtNBoxDataUtils.getColumn(nbox, i);
    if (column['label'] && column['label']['text']) {
      var columnLabel = DvtNBoxRenderer.createText(nbox.getCtx(), column['label']['text'], DvtNBoxStyleUtils.getColumnLabelStyle(nbox, i), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
      columnLabelsHeight = Math.max(columnLabelsHeight, DvtTextUtils.guessTextDimensions(columnLabel).h);
      if (!maximizedColumn || maximizedColumn == column['value']) {
        columnLabels[i] = columnLabel;
        container.addChild(columnLabels[i]);
      }
    }
  }

  for (var i = 0; i < rowCount; i++) {
    var row = DvtNBoxDataUtils.getRow(nbox, i);
    if (row['label'] && row['label']['text']) {
      var rowLabel = DvtNBoxRenderer.createText(nbox.getCtx(), row['label']['text'], DvtNBoxStyleUtils.getRowLabelStyle(nbox, i), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
      rowLabelsWidth = Math.max(rowLabelsWidth, DvtTextUtils.guessTextDimensions(rowLabel).h);
      if (!maximizedRow || maximizedRow == row['value']) {
        rowLabels[i] = rowLabel;
        container.addChild(rowLabels[i]);
      }
    }
  }

  if (rowsTitleWidth || rowLabelsWidth) {
    rowTitleComponentGap = titleComponentGap;
    if (rowsTitleWidth && rowLabelsWidth) {
      rowTitleGap = titleGap;
    }
  }
  if (columnsTitleHeight || columnLabelsHeight) {
    columnTitleComponentGap = titleComponentGap;
    if (columnsTitleHeight && columnLabelsHeight) {
      columnTitleGap = titleGap;
    }
  }

  var rowHeaderWidth = rowsTitleWidth + rowTitleGap + rowLabelsWidth + rowTitleComponentGap;
  var columnHeaderHeight = columnsTitleHeight + columnTitleGap + columnLabelsHeight + columnTitleComponentGap;

  availSpace.x += rtl ? 0 : rowHeaderWidth;
  availSpace.w -= rowHeaderWidth;
  availSpace.h -= columnHeaderHeight;

  if (columnsTitle) {
    if (DvtTextUtils.fitText(columnsTitle, availSpace.w, columnsTitleHeight, container)) {
      DvtNBoxRenderer.positionText(columnsTitle, availSpace.x + availSpace.w / 2, availSpace.y + availSpace.h + columnHeaderHeight - columnsTitleHeight / 2);
      DvtNBoxDataUtils.setDisplayable(nbox, options['columnsTitle'], columnsTitle);
    }
  }
  if (rowsTitle) {
    if (DvtTextUtils.fitText(rowsTitle, availSpace.h, rowsTitleWidth, container)) {
      DvtNBoxRenderer.positionText(rowsTitle,
                                   availSpace.x + (rtl ? availSpace.w : 0) + (rtl ? 1 : -1) * (rowHeaderWidth - rowsTitleWidth / 2),
                                   availSpace.y + availSpace.h / 2,
                                   rtl ? Math.PI / 2 : -Math.PI / 2);
      DvtNBoxDataUtils.setDisplayable(nbox, options['rowsTitle'], rowsTitle);
    }
  }
  for (var i = 0; i < columnCount; i++) {
    if (columnLabels[i]) {
      var cellDims = DvtNBoxCellRenderer.getCellDimensions(nbox, maximizedRowIndex == -1 ? 0 : maximizedRowIndex, i, cellLayout, availSpace);
      if (DvtTextUtils.fitText(columnLabels[i], cellDims.w, columnLabelsHeight, container)) {
        DvtNBoxRenderer.positionText(columnLabels[i], cellDims.x + cellDims.w / 2, availSpace.y + availSpace.h + columnTitleComponentGap + columnLabelsHeight / 2);
        DvtNBoxDataUtils.setDisplayable(nbox, DvtNBoxDataUtils.getColumn(nbox, i)['label'], columnLabels[i]);
      }
    }
  }
  for (var i = 0; i < rowCount; i++) {
    if (rowLabels[i]) {
      var cellDims = DvtNBoxCellRenderer.getCellDimensions(nbox, i, maximizedColumnIndex == -1 ? 0 : maximizedColumnIndex, cellLayout, availSpace);
      if (DvtTextUtils.fitText(rowLabels[i], cellDims.h, rowLabelsWidth, container)) {
        DvtNBoxRenderer.positionText(rowLabels[i],
                                     availSpace.x + (rtl ? availSpace.w : 0) + (rtl ? 1 : -1) * (rowTitleComponentGap + rowLabelsWidth / 2),
                                     cellDims.y + cellDims.h / 2,
                                     rtl ? Math.PI / 2 : -Math.PI / 2);
        DvtNBoxDataUtils.setDisplayable(nbox, DvtNBoxDataUtils.getRow(nbox, i)['label'], rowLabels[i]);
      }
    }
  }
};

/**
 * Creates a text element
 *
 * @param {DvtContext} ctx the rendering context
 * @param {string} strText the text string
 * @param {DvtCSSStyle} style the style object to apply to the test
 * @param {string} halign the horizontal alignment
 * @param {string} valign the vertical alignment
 *
 * @return {DvtOutputText} the text element
 */
DvtNBoxRenderer.createText = function(ctx, strText, style, halign, valign) {
  var text = new DvtOutputText(ctx, strText, 0, 0);
  text.setCSSStyle(style);
  text.setHorizAlignment(halign);
  text.setVertAlignment(valign);
  return text;
};

/**
 * Renders cells
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {object} cellLayout Aan object containing sizes related to cell layout, based upon the first specified cell
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderCells = function(nbox, container, cellCounts, cellLayout, availSpace) {
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  for (var r = 0; r < rowCount; r++) {
    for (var c = 0; c < columnCount; c++) {
      var cell = DvtNBoxDataUtils.getCell(nbox, r * columnCount + c);
      var cellContainer = DvtNBoxCell.newInstance(nbox, cell);
      cellContainer.render(container, cellLayout, cellCounts, availSpace);
    }
  }
};

/**
 * Counts the number of nodes (highlighted and total) for each cell
 * @param {DvtNBoxImpl} nbox The nbox component
 * @return {object} Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 */
DvtNBoxRenderer._calculateCellCounts = function(nbox) {
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var cellCount = rowCount * columnCount;
  var total = [];
  var highlighted = null;
  var highlightedItems = DvtNBoxDataUtils.getHighlightedItems(nbox);
  var highlightedMap = {};
  if (highlightedItems) {
    highlighted = [];
    for (var i = 0; i < highlightedItems.length; i++) {
      highlightedMap[highlightedItems[i]['id']] = true;
    }
  }
  for (var i = 0; i < cellCount; i++) {
    total[i] = 0;
    if (highlighted) {
      highlighted[i] = 0;
    }
  }
  var nodeCount = DvtNBoxDataUtils.getNodeCount(nbox);
  for (var i = 0; i < nodeCount; i++) {
    var node = DvtNBoxDataUtils.getNode(nbox, i);
    var cellIndex = DvtNBoxDataUtils.getCellIndex(nbox, node);
    total[cellIndex]++;
    if (highlighted && highlightedMap[node['id']]) {
      highlighted[cellIndex]++;
    }
  }
  var retVal = {};
  retVal['total'] = total;
  if (highlighted) {
    retVal['highlighted'] = highlighted;
  }
  return retVal;
};

/**
 * Renders nodes
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderNodes = function(nbox, container, cellCounts, availSpace) {
  if (DvtNBoxDataUtils.getNodeCount(nbox) > 0) {
    var groupBy = DvtNBoxDataUtils.getGroupBy(nbox);
    if (groupBy && groupBy.length > 0) {
      DvtNBoxRenderer._renderCategoryNodes(nbox, container, availSpace);
      DvtNBoxRenderer._renderDrawer(nbox, container, availSpace);
    }
    else {
      DvtNBoxRenderer._renderIndividualNodes(nbox, container, cellCounts,  availSpace);
    }
  }
};

/**
 * Renders individual nodes (no grouping)
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderIndividualNodes = function(nbox, container, cellCounts, availSpace) {
  var options = nbox.getOptions();
  var gridGap = options['__layout']['gridGap'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var nodeLayout = DvtNBoxNodeRenderer.calculateNodeLayout(nbox);
  var hGridSize = nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth'] + gridGap;
  var vGridSize = nodeLayout['nodeHeight'] + gridGap;

  var nodeCount = DvtNBoxDataUtils.getNodeCount(nbox);

  var gridPos = [];

  // If no nodes are highlighted, make a single pass through the nodes for rendering
  // If some nodes are highlighted, make two passes, first rendering the highlighted nodes, then the unhighlighted nodes
  var renderPasses = ['normal'];
  var alphaFade = DvtNBoxStyleUtils.getFadedNodeAlpha(nbox);
  var highlightedItems = DvtNBoxDataUtils.getHighlightedItems(nbox);
  var highlightedMap = {};
  if (highlightedItems) {
    for (var i = 0; i < highlightedItems.length; i++) {
      highlightedMap[highlightedItems[i]['id']] = true;
    }
    renderPasses = ['highlighted', 'unhighlighted'];
  }
  for (var p = 0; p < renderPasses.length; p++) {
    for (var n = 0; n < nodeCount; n++) {
      var node = DvtNBoxDataUtils.getNode(nbox, n);
      if (!DvtNBoxDataUtils.isNodeHidden(nbox, node)) {
        if (renderPasses[p] == 'normal' ||
            (renderPasses[p] == 'highlighted' && highlightedMap[node['id']]) ||
            (renderPasses[p] == 'unhighlighted' && !highlightedMap[node['id']])) {
          var cellIndex = DvtNBoxDataUtils.getCellIndex(nbox, node);
          if (!DvtNBoxDataUtils.isCellMinimized(nbox, cellIndex)) {
            var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
            if (isNaN(gridPos[cellIndex])) {
              gridPos[cellIndex] = 0;
            }
            var cellLayout = nodeLayout['cellLayouts'][cellIndex];
            var cellRows = cellLayout['cellRows'];
            var cellColumns = cellLayout['cellColumns'];
            var skipNodes = cellRows == 0 || cellColumns == 0 || (cellRows == 1 && cellColumns == 1 && cellLayout['overflow']);
            if (!skipNodes) {
              var maxNodes = cellRows * cellColumns - (cellLayout['overflow'] ? 1 : 0);
              if (maxNodes < 0 || gridPos[cellIndex] < maxNodes) {    
                var nodeContainer = DvtNBoxNode.newInstance(nbox, node);
                var gridXOrigin = cell['__childArea'].x + (cell['__childArea'].w - cellLayout['cellColumns']*hGridSize + gridGap)/2;
                var gridYOrigin = cell['__childArea'].y;
                var gridColumn = gridPos[cellIndex] % cellColumns;
                if (rtl) {
                  gridColumn = cellColumns - gridColumn - 1;
                }
                var gridRow = Math.floor(gridPos[cellIndex] / cellColumns);
                nodeContainer.setTranslate(gridXOrigin + hGridSize * gridColumn,
                                            gridYOrigin + vGridSize * gridRow);
                gridPos[cellIndex]++;
                nodeContainer.render(DvtNBoxDataUtils.getDisplayable(nbox, cell).getChildContainer(), nodeLayout);
                if (renderPasses[p] == 'unhighlighted') {
                  nodeContainer.setMaxAlpha(alphaFade);
                }
              }
            }
          }
        }
      }
    }
  }
  // Render overflow indicators
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var overflow = options['resources']['overflow'];
  var bodyCountLabels = [];
  for (var r = 0; r < rowCount; r++) {
    for (var c = 0; c < columnCount; c++) {
      var ci = r * columnCount + c;
      if (!DvtNBoxDataUtils.isCellMinimized(nbox, ci)) {
        var cellData = DvtNBoxDataUtils.getCell(nbox, ci);
        var cell = DvtNBoxDataUtils.getDisplayable(nbox, cellData);
        var cellLayout = nodeLayout['cellLayouts'][ci];
        if (cellLayout['overflow']) {
          var cellRows = cellLayout['cellRows'];
          var cellColumns = cellLayout['cellColumns'];
          var skipOverflow = cellRows == 0 || cellColumns == 0 || (cellRows == 1 && cellColumns == 1 && cellLayout['overflow']);        
          if (!skipOverflow) {
            var gridXOrigin = cellData['__childArea'].x + (cellData['__childArea'].w - cellLayout['cellColumns']*hGridSize + gridGap)/2;
            var gridYOrigin = cellData['__childArea'].y;
            var gridColumn = gridPos[ci] % cellLayout['cellColumns'];
            if (rtl) {
              gridColumn = cellLayout['cellColumns'] - gridColumn - 1;
            }
            var gridRow = Math.floor(gridPos[ci] / cellLayout['cellColumns']);
            var overflowImage = new DvtImage(nbox.getCtx(), overflow['src'], -overflow['width']/2, -overflow['height']/2, overflow['width'], overflow['height']);
            overflowImage.setTranslate(gridXOrigin + hGridSize * gridColumn + (hGridSize - gridGap)/2,
                                       gridYOrigin + vGridSize * gridRow + (vGridSize - gridGap)/2);
            cell.getChildContainer().addChild(overflowImage);          
          }
          else {
            bodyCountLabels.push(ci);
          }
        }
      }
    }
  }
  if (bodyCountLabels.length > 0) {
    DvtNBoxCellRenderer.renderBodyCountLabels(nbox, cellCounts, bodyCountLabels);
  }
};

/**
 * Renders category nodes
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderCategoryNodes = function(nbox, container, availSpace) {
  var groups = {};
  var nodeCount = DvtNBoxDataUtils.getNodeCount(nbox);
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(nbox);

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var highlightedItems = DvtNBoxDataUtils.getHighlightedItems(nbox);
  var highlightedMap = {};
  if (highlightedItems) {
    for (var i = 0; i < highlightedItems.length; i++) {
      highlightedMap[highlightedItems[i]['id']] = true;
    }
  }
  for (var n = 0; n < nodeCount; n++) {
    var node = DvtNBoxDataUtils.getNode(nbox, n);
    if (!DvtNBoxDataUtils.isNodeHidden(nbox, node)) {
      var groupContainer = groups;
      if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
        var groupId = DvtNBoxDataUtils.getCellIndex(nbox, node) + '';
        groupContainer = groups[groupId];
        if (!groupContainer) {
          groupContainer = {};
          groups[groupId] = groupContainer;
        }
      }

      var groupId = DvtNBoxDataUtils.getNodeGroupId(nbox, node);
      var group = groupContainer[groupId];
      if (!group) {
        group = {};
        group['id'] = groupId;
        group['categories'] = groupId.split(';');
        if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
          group['cell'] = DvtNBoxDataUtils.getCellIndex(nbox, node);
        }
        group['nodeIndices'] = [];
        group['highlightedCount'] = 0;
        groupContainer[groupId] = group;
      }
      group['nodeIndices'].push(n);
      if (highlightedMap[DvtNBoxDataUtils.getNode(nbox, n)['id']]) {
        group['highlightedCount']++;
      }
    }
  }
  // Process other threshold
  var otherGroups;
  if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
    otherGroups = {};
    for (var cellId in groups) {
      otherGroups[cellId] = DvtNBoxRenderer._processOtherThreshold(nbox, groups[cellId]);
    }
  }
  else {
    otherGroups = DvtNBoxRenderer._processOtherThreshold(nbox, groups);
  }
  var groups = otherGroups;
  nbox.getOptions()['__groups'] = groups;
  if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS) {
    // Sort groups by size
    var sortedGroups = [];
    for (var group in groups) {
      sortedGroups.push(group);
    }
    sortedGroups.sort(function(a,b) {return groups[a]['nodeIndices'].length < groups[b]['nodeIndices'].length});
    var scale = Math.sqrt(.15 * (availSpace.w * availSpace.h) / nodeCount);
    for (var i = 0; i < sortedGroups.length; i++) {
      var group = sortedGroups[i];
      var xPos = 0;
      var yPos = 0;
      var nodeCount = groups[group]['nodeIndices'].length;
      for (var j = 0; j < nodeCount; j++) {
        var node = DvtNBoxDataUtils.getNode(nbox, groups[group]['nodeIndices'][j]);
        xPos += DvtNBoxDataUtils.getXPercentage(nbox, node);
        yPos += DvtNBoxDataUtils.getYPercentage(nbox, node);
      }
      xPos /= nodeCount;
      yPos /= nodeCount;

      var nodeContainer = DvtNBoxCategoryNode.newInstance(nbox, groups[group]);
      nodeContainer.setTranslate(availSpace.x + (rtl ? (1 - xPos) : xPos) * availSpace.w, availSpace.y + (1 - yPos) * availSpace.h);
      nodeContainer.render(container, scale, 0);
      nodeContainer.setMaxAlpha(.8);
    }
  }
  else if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
    var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
    var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
    var cellCount = rowCount * columnCount;
    var layouts = [];
    for (var i = 0; i < cellCount; i++) {
      if (groups[i] && !DvtNBoxDataUtils.isCellMinimized(nbox, i)) {
        var cell = DvtNBoxDataUtils.getCell(nbox, i);
        layouts[i] = DvtNBoxRenderer._forceLayoutGroups(groups[i], cell['__childArea'].w, cell['__childArea'].h);
      }
    }
    var scale = 40; // Maximum amount to scale by
    for (var i = 0; i < cellCount; i++) {
      if (groups[i] && !DvtNBoxDataUtils.isCellMinimized(nbox, i)) {
        scale = Math.min(scale, layouts[i]['scale']);
      }
    }
    for (var i = 0; i < cellCount; i++) {
      if (groups[i] && !DvtNBoxDataUtils.isCellMinimized(nbox, i)) {
        var positions = layouts[i]['positions'];
        var center = layouts[i]['center'];
        var cell = DvtNBoxDataUtils.getCell(nbox, i);
        var childContainer = DvtNBoxDataUtils.getDisplayable(nbox, cell).getChildContainer();
        for (var group in positions) {
          var nodeContainer = DvtNBoxCategoryNode.newInstance(nbox, groups[i][group]);
          nodeContainer.setTranslate(cell['__childArea'].x + cell['__childArea'].w / 2 + scale * (positions[group].x - center.x),
                                      cell['__childArea'].y + cell['__childArea'].h / 2 + scale * (positions[group].y - center.y));
          nodeContainer.render(childContainer, scale, 3);
        }
      }
    }
  }
};

/**
 * Returns the dimensions of the specified nbox row
 * @param {DvtNBoxImpl} the nbox component
 * @param {number} rowIndex the index of the specified row
 * @param {DvtRectangle} availSpace the dimensions of the available space
 * @param {DvtRectangle} the dimensions of the specified nbox row
 */
DvtNBoxRenderer.getRowDimensions = function(nbox, rowIndex, availSpace) {
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var rowHeight = availSpace.h / rowCount;

  var y = availSpace.y + (rowCount - rowIndex - 1) * rowHeight;
  var h = rowHeight;

  return new DvtRectangle(availSpace.x, y, availSpace.w, h);
};

/**
 * Returns the dimensions of the specified nbox column
 * @param {DvtNBoxImpl} the nbox component
 * @param {number} columnIndex the index of the specified column
 * @param {DvtRectangle} availSpace the dimensions of the available space
 * @param {DvtRectangle} the dimensions of the specified nbox column
 */
DvtNBoxRenderer.getColumnDimensions = function(nbox, columnIndex, availSpace) {
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var columnWidth = availSpace.w / columnCount;
  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var x = availSpace.x + (rtl ? availSpace.w - columnWidth : 0) + (rtl ? -1 : 1) * columnIndex * columnWidth;
  var w = columnWidth;

  return new DvtRectangle(x, availSpace.y, w, availSpace.h);
};

/**
 * Helper function that adjusts the input rectangle to the closest pixel.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._adjustAvailSpace = function(availSpace) {
  // Fix for 16446255: Adjust the bounds to the closest pixel to prevent antialiasing issues.
  availSpace.x = Math.round(availSpace.x);
  availSpace.y = Math.round(availSpace.y);
  availSpace.w = Math.round(availSpace.w);
  availSpace.h = Math.round(availSpace.h);
};

/**
 * Helper function to position text
 *
 * @param {DvtOutputText} text The text to position
 * @param {number} x The x coordinate
 * @param {number} y The y coordinate
 * @param {number} angle The optional angle to rotate by
 */
DvtNBoxRenderer.positionText = function(text, x, y, angle) {
  text.setX(x);
  text.setY(y);
  if (angle) {
    var matrix = text.getMatrix();
    matrix.translate(-x, -y);
    matrix.rotate(angle);
    matrix.translate(x, y);
    text.setMatrix(matrix);
  }
};

/**
 * Renders the initial selection state
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 */
DvtNBoxRenderer._renderInitialSelection = function(nbox) {
  if (nbox.isSelectionSupported()) {
    var selectedMap = {};
    var selectedIds = [];
    var selectedItems = DvtNBoxDataUtils.getSelectedItems(nbox);
    if (selectedItems) {
      for (var i = 0; i < selectedItems.length; i++) {
        selectedIds.push(selectedItems[i]['id']);
        selectedMap[selectedItems[i]['id']] = true;
      }
      var objects = nbox.getObjects();
      // Process category nodes
      var groupBy = DvtNBoxDataUtils.getGroupBy(nbox);
      if (groupBy && groupBy.length > 0) {
        for (var i = 0; i < objects.length; i++) {
          if (objects[i] instanceof DvtNBoxCategoryNode) {
            var data = objects[i].getData();
            var nodeIndices = data['nodeIndices'];
            var selected = true;
            for (var j = 0; j < nodeIndices.length; j++) {
              var node = DvtNBoxDataUtils.getNode(nbox, nodeIndices[j]);
              if (!selectedMap[node['id']]) {
                selected = false;
                break;
              }
            }
            if (selected) {
              selectedIds.push(objects[i].getId());
            }
          }
        }
      }
    }
    nbox.getSelectionHandler().processInitialSelections(selectedIds, objects);
  }
};

/**
 * Performs layout of group nodes within a cell
 *
 * @param {array} groups A map of groupId to an array of nodeIndices (only used for size)
 * @param {number} width The width of the cell childArea (used to determine aspect ratio)
 * @param {number} height The height of the cell childArea (used to determine aspect ratio)
 *
 * @return {object} An object containing two properties: 'positions' a map from group id to position and 'scale' which
 * indicates the maximum that these nodes can be scaled by while still fitting in the cell
 */
DvtNBoxRenderer._forceLayoutGroups = function(groups, width, height) {
  var sortedGroups = [];
  for (var group in groups) {
    sortedGroups.push(group);
  }
  sortedGroups.sort(function(a,b) {return groups[a]['nodeIndices'].length < groups[b]['nodeIndices'].length});
  var positions = {};
  // Initial Positions
  var thetaStep = 2 * Math.PI / sortedGroups.length;
  for (var i = 0; i < sortedGroups.length; i++) {
    var x = i * Math.cos(thetaStep * i);
    var y = i * Math.sin(thetaStep * i);
    positions[sortedGroups[i]] = DvtVectorUtils.createVector(x, y);
  }
  // Force iterations
  var alpha = 1;
  var alphaDecay = .98;
  var alphaLimit = .005;
  // Apply gravity inversely proportional to
  var xGravity = -.25 * height / Math.max(width, height);
  var yGravity = -.25 * width / Math.max(width, height);
  while (alpha > alphaLimit) {
    var displacement = {};
    for (var i = 0; i < sortedGroups.length; i++) {
      var iGroup = sortedGroups[i];
      var iPos = positions[iGroup];
      var iSize = groups[iGroup]['nodeIndices'].length;
      // Gravity
      displacement[iGroup] = DvtVectorUtils.createVector(alpha * xGravity * iPos.x, alpha * yGravity * iPos.y);
      for (var j = 0; j < sortedGroups.length; j++) {
        if (i != j) {
          // Repulsion
          var jGroup = sortedGroups[j];
          var jPos = positions[jGroup];
          var jSize = groups[jGroup]['nodeIndices'].length;
          var difference = DvtVectorUtils.subtractVectors(iPos, jPos);
          var distance = DvtVectorUtils.getMagnitude(difference);
          var angle = Math.atan2(difference.y, difference.x);
          // every PI/2 interval is the same, shift so that 0 < angle < PI/2
          while (angle < 0) {
            angle += Math.PI / 2;
          }
          while (angle >= Math.PI / 2) {
            angle -= Math.PI / 2;
          }
          var minimumDistance; // to avoid collision based upon the current angle
          if (angle < Math.PI / 4) {
            minimumDistance = .5 * (Math.sqrt(iSize) + Math.sqrt(jSize)) / Math.cos(angle);
          }
          else {
            minimumDistance = .5 * (Math.sqrt(iSize) + Math.sqrt(jSize)) / Math.sin(angle);
          }
          if (distance < minimumDistance) {
            // Shift the current node backwards (bigger nodes move proportionally less than smaller nodes)
            var repulsion = (jSize / (iSize + jSize)) * ((minimumDistance - distance) / distance);
            displacement[iGroup] = DvtVectorUtils.addVectors(displacement[iGroup], DvtVectorUtils.scaleVector(difference, (1 - alpha) * repulsion));
          }
        }
      }
    }
    // Apply displacement
    for (var i = 0; i < sortedGroups.length; i++) {
      var iGroup = sortedGroups[i];
      positions[iGroup] = DvtVectorUtils.addVectors(positions[iGroup], displacement[iGroup]);
    }
    alpha *= alphaDecay;
  }
  var left = Number.MAX_VALUE;
  var right = -Number.MAX_VALUE;
  var top = Number.MAX_VALUE;
  var bottom = -Number.MAX_VALUE;
  for (var i = 0; i < sortedGroups.length; i++) {
    var group = sortedGroups[i];
    var side = Math.sqrt(groups[group]['nodeIndices'].length);
    var position = positions[group];
    left = Math.min(left, position.x - side / 2);
    right = Math.max(right, position.x + side / 2);
    top = Math.min(top, position.y - side / 2);
    bottom = Math.max(bottom, position.y + side / 2);
  }
  var xScale = width / (right - left);
  var yScale = height / (bottom - top);
  var scale = Math.min(xScale, yScale);
  var cx = (left + right) / 2;
  var cy = (top + bottom) / 2;
  return {'scale': scale, 'center': new DvtPoint(cx, cy), 'positions': positions};
};

/**
 * Aggregates any groups that fall below the other threshold
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} groups a map of groups (may either represent groups across the entire nbox or within a single cell)
 * @return {object} a map of groups with any groups that fall below the other threshold aggregated into a single 'other' group
 */
DvtNBoxRenderer._processOtherThreshold = function(nbox, groups) {
  var nodeCount = DvtNBoxDataUtils.getNodeCount(nbox);
  var otherCount = DvtNBoxDataUtils.getOtherThreshold(nbox) * nodeCount;
  if (otherCount <= 1) {
    return groups;
  }
  var processedGroups = {};
  var otherGroup = {};
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(nbox);
  if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
    for (var groupId in groups) {
      var group = groups[groupId];
      otherGroup['cell'] = group['cell'];
      break;
    }
  }
  otherGroup['id'] = 'other';
  otherGroup['categories'] = [];
  otherGroup['nodeIndices'] = [];
  otherGroup['otherNode'] = true;
  for (var groupId in groups) {
    var group = groups[groupId];
    if (group['nodeIndices'].length < otherCount) {
      for (var i = 0; i < group['nodeIndices'].length; i++) {
        otherGroup['nodeIndices'].push(group['nodeIndices'][i]);
      }
    }
    else {
      processedGroups[groupId] = group;
    }
  }
  if (otherGroup['nodeIndices'].length > 0) {
    processedGroups['other'] = otherGroup;
  }
  return processedGroups;
};

/**
 * Renders the open group, if any
 * @param {DvtNBoxImpl} nbox The nbox being rendered.
 * @param {DvtContainer} container The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxRenderer._renderDrawer = function(nbox, container, availSpace) {
  var drawerData = DvtNBoxDataUtils.getDrawer(nbox);
  if (drawerData) {
    var categoryNode = DvtNBoxDataUtils.getCategoryNode(nbox, drawerData['id']);
    if (categoryNode) {
      var drawer = DvtNBoxDrawer.newInstance(nbox, drawerData);
      drawer.render(container, availSpace);
    }
    else {
      // Wwe have stale drawer data, null it out
      var options = nbox.getOptions();
      options[DvtNBoxConstants.DRAWER] = null;
      var event = new DvtSetPropertyEvent();
      event.addParam(DvtNBoxConstants.DRAWER, null);
      nbox.processEvent(event);
    }
  }
};

/**
 * Gets a matrix that can be used to reparent a displayable at the top level without changing its position
 *
 * @param {DvtDisplayable} displayable the displayable to be reparented
 * @return {DvtMatrix} a matrix that will maintain the child's position when reparented
 */
DvtNBoxRenderer.getGlobalMatrix = function(displayable) {
  var matrix = displayable.getMatrix().clone();
  var current = displayable.getParent();
  while (current) {
    var currentMatrix = current.getMatrix();
    matrix.translate(currentMatrix.getTx(), currentMatrix.getTy());
    current = current.getParent();
  }
  return matrix;
};

/**
 * Animates an update between NBox states
 *
 * @param {DvtNBoxDataAnimationHandler} animationHandler the animation handler
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox state
 */
DvtNBoxRenderer.animateUpdate = function(animationHandler, oldNBox, newNBox) {
  DvtNBoxRenderer._animateCells(animationHandler, oldNBox, newNBox);
  var oldDrawer = DvtNBoxDataUtils.getDrawer(oldNBox);
  oldDrawer = oldDrawer ? oldDrawer['id'] : null;
  var newDrawer = DvtNBoxDataUtils.getDrawer(newNBox);
  newDrawer = newDrawer ? newDrawer['id'] : null;
  // No need to animate nodes if we're opening/closing a drawer (which can only happen when we're grouped)
  if (oldDrawer == newDrawer) {
    DvtNBoxRenderer._animateNodes(animationHandler, oldNBox, newNBox);
  }
  else {
    DvtNBoxRenderer._animateDrawer(animationHandler, oldNBox, newNBox);
  }
  //DvtNBoxRenderer._animateTitles(animationHandler, oldNBox, newNBox);
};

/**
 * Animates the cells on NBox update
 *
 * @param {DvtNBoxDataAnimationHandler} animationHandler the animation handler
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox state
 */
DvtNBoxRenderer._animateCells = function(animationHandler, oldNBox, newNBox) {
  var oldRowCount = DvtNBoxDataUtils.getRowCount(oldNBox);
  var newRowCount = DvtNBoxDataUtils.getRowCount(newNBox);
  var oldColumnCount = DvtNBoxDataUtils.getColumnCount(oldNBox);
  var newColumnCount = DvtNBoxDataUtils.getColumnCount(newNBox);
  var oldCellCount = oldRowCount * oldColumnCount;
  var newCellCount = newRowCount * newColumnCount;
  var oldCells = [];
  var newCells = [];
  for (var i = 0; i < oldCellCount; i++) {
    oldCells.push(DvtNBoxDataUtils.getDisplayable(oldNBox, DvtNBoxDataUtils.getCell(oldNBox, i)));
  }
  for (var i = 0; i < newCellCount; i++) {
    newCells.push(DvtNBoxDataUtils.getDisplayable(newNBox, DvtNBoxDataUtils.getCell(newNBox, i)));
  }
  if (oldRowCount == newRowCount && oldColumnCount == newColumnCount) {
    var identical = true;
    for (var i = 0; i < newRowCount; i++) {
      var oldRowValue = DvtNBoxDataUtils.getRow(oldNBox, i)['value'];
      var newRowValue = DvtNBoxDataUtils.getRow(newNBox, i)['value'];
      if (oldRowValue != newRowValue) {
        identical = false;
        break;
      }
    }
    if (identical) {
      for (var i = 0; i < newColumnCount; i++) {
        var oldColumnValue = DvtNBoxDataUtils.getColumn(oldNBox, i)['value'];
        var newColumnValue = DvtNBoxDataUtils.getColumn(newNBox, i)['value'];
        if (oldColumnValue != newColumnValue) {
          identical = false;
          break;
        }
      }
    }
    if (identical) {
      // Same set of cells, let them animate themselves
      animationHandler.constructAnimation(oldCells, newCells);
      return;
    }
  }
  // Different set of cells, fade out the old, fade in the new
  animationHandler.constructAnimation(oldCells, []);
  animationHandler.constructAnimation([], newCells);
};

/**
 * Animates the nodes on NBox update
 *
 * @param {DvtNBoxDataAnimationHandler} animationHandler the animation handler
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox state
 */
DvtNBoxRenderer._animateNodes = function(animationHandler, oldNBox, newNBox) {
  var oldNodeCount = DvtNBoxDataUtils.getNodeCount(oldNBox);
  var newNodeCount = DvtNBoxDataUtils.getNodeCount(newNBox);
  var oldNodes = [];
  var newNodes = [];
  for (var i = 0; i < oldNodeCount; i++) {
    oldNodes.push(DvtNBoxDataUtils.getDisplayable(oldNBox, DvtNBoxDataUtils.getNode(oldNBox, i)));
  }
  for (var i = 0; i < newNodeCount; i++) {
    newNodes.push(DvtNBoxDataUtils.getDisplayable(newNBox, DvtNBoxDataUtils.getNode(newNBox, i)));
  }
  animationHandler.constructAnimation(oldNodes, newNodes);

  // If the drawer is open, no reason to animate the category nodes as they're obscured
  var newDrawer = DvtNBoxDataUtils.getDrawer(newNBox);
  if (!newDrawer) {
    var oldGroupNodes = DvtNBoxRenderer._getSortedGroups(oldNBox);
    var newGroupNodes = DvtNBoxRenderer._getSortedGroups(newNBox);
    animationHandler.constructAnimation(oldGroupNodes, newGroupNodes);
  }
};

/**
 * Gets the list of DvtNBoxCategoryNodes (sorted by id)
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {array} the list of DvtNBoxCategoryNodes, sorted by id
 */
DvtNBoxRenderer._getSortedGroups = function(nbox) {
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(nbox);
  var groupInfo = nbox.getOptions()['__groups'];
  var groupNodes = [];
  if (groupInfo) {
    if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
      var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
      var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
      var cellCount = rowCount * columnCount;
      for (var i = 0; i < cellCount; i++) {
        var cellGroups = groupInfo[i + ''];
        var cellGroupNodes = DvtNBoxRenderer._getSortedGroupsFromContainer(nbox, cellGroups);
        for (var j = 0; j < cellGroupNodes.length; j++) {
          groupNodes.push(cellGroupNodes[j]);
        }
      }
    }
    else {
      groupNodes = DvtNBoxRenderer._getSortedGroupsFromContainer(nbox, groupInfo);
    }
  }
  return groupNodes;
};

/**
 * Gets the list of DvtNBoxCategoryNodes (sorted by id) from a map of category node data
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} container a map of category node data
 * @return {array} the list of DvtNBoxCategoryNodes, sorted by id
 */
DvtNBoxRenderer._getSortedGroupsFromContainer = function(nbox, container) {
  var groupNodes = [];
  for (var id in container) {
    var displayable = DvtNBoxDataUtils.getDisplayable(nbox, container[id]);
    if (displayable) {
      groupNodes.push(displayable);
    }
  }
  groupNodes.sort(function(a,b) {var aId = a.getId(); var bId = b.getId(); return aId == bId ? 0 : (aId < bId ? -1 : 1)});
  return groupNodes;
};

/**
 * Animates the drawer on NBox update
 *
 * @param {DvtNBoxDataAnimationHandler} animationHandler the animation handler
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox state
 */
DvtNBoxRenderer._animateDrawer = function(animationHandler, oldNBox, newNBox) {
  var oldDrawer = DvtNBoxDataUtils.getDrawer(oldNBox);
  oldDrawer = oldDrawer ? [DvtNBoxDataUtils.getDisplayable(oldNBox, oldDrawer)] : null;
  var newDrawer = DvtNBoxDataUtils.getDrawer(newNBox);
  newDrawer = newDrawer ? [DvtNBoxDataUtils.getDisplayable(newNBox, newDrawer)] : [];

  animationHandler.constructAnimation(oldDrawer, newDrawer);
};

/**
 * Sets a fill (which may be a solid color or linear-gradient) on a displayable
 *
 * @param {DvtDisplayable} displaylable the displayable to fill
 * @param {string} fillString the string description of the fill
 */
DvtNBoxRenderer.setFill = function(displayable, fillString) {
  if (fillString.indexOf('linear-gradient') == 0) {
    var linearGradient = DvtGradientParser.parseCSSGradient(fillString);
    if (linearGradient) {
      displayable.setFill(new DvtLinearGradientFill(linearGradient.getAngle(),
                                                    linearGradient.getColors(),
                                                    linearGradient.getAlphas(),
                                                    linearGradient.getRatios()));
    }
  }
  else {
    // color
    displayable.setSolidFill(fillString);
  }
};

/**
 * Moves the legend (which is rendered first) to the top of the z order
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 */
DvtNBoxRenderer._fixZOrder = function(nbox) {
  var legendData = DvtNBoxDataUtils.getLegend(nbox);
  if (legendData) {
    var panelDrawer = DvtNBoxDataUtils.getDisplayable(nbox, legendData, 'panelDrawer');
    if (panelDrawer) {
      panelDrawer.getParent().addChild(panelDrawer);
    }
  }
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Renderer for DvtNBoxCell.
 * @class
 */
var DvtNBoxCellRenderer = new Object();

DvtObj.createSubclass(DvtNBoxCellRenderer, DvtObj, 'DvtNBoxCellRenderer');

/**
 * Renders the nbox cell into the available space.
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} cellData The cell data being rendered
 * @param {DvtNBoxCell} cellContainer The container to render into
 * @param {object} cellLayout object containing properties related to cellLayout
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {DvtRectangle} availSpace The available space
 */
DvtNBoxCellRenderer.render = function(nbox, cellData, cellContainer, cellLayout, cellCounts, availSpace) {
  var options = nbox.getOptions();
  var cellGap = options['__layout']['cellGap'];
  var cellStartGap = options['__layout']['cellStartGap'];
  var cellEndGap = options['__layout']['cellEndGap'];
  var cellTopGap = options['__layout']['cellTopGap'];
  var cellBottomGap = options['__layout']['cellBottomGap'];

  var r = DvtNBoxDataUtils.getRowIndex(nbox, cellData['row']);
  var c = DvtNBoxDataUtils.getColumnIndex(nbox, cellData['column']);

  var cellDims = DvtNBoxCellRenderer.getCellDimensions(nbox, r, c, cellLayout, availSpace);

  cellContainer.setTranslate(cellDims.x + cellGap / 2, cellDims.y + cellGap / 2);
  var cellIndex = r * DvtNBoxDataUtils.getColumnCount(nbox) + c; // cells are in sorted row-major order
  var cellRect = new DvtRect(nbox.getCtx(), 0, 0, cellDims.w - cellGap, cellDims.h - cellGap);
  cellRect.setPixelHinting(true);
  var style = DvtNBoxStyleUtils.getCellStyle(nbox, cellIndex);
  DvtNBoxCellRenderer._applyStyleToRect(cellRect, style);
  cellContainer.addChild(cellRect);
  DvtNBoxDataUtils.setDisplayable(nbox, cellData, cellRect, 'background');

  var keyboardFocusEffect = new DvtKeyboardFocusEffect(nbox.getCtx(), cellContainer, new DvtRectangle(-1, -1, cellRect.getWidth() + 2, cellRect.getHeight() + 2));
  DvtNBoxDataUtils.setDisplayable(nbox, cellData, keyboardFocusEffect, 'focusEffect');
 
  var addedHeader = DvtNBoxCellRenderer.renderHeader(nbox, cellData, cellContainer, cellCounts, false);
  var childArea = null;
  if (addedHeader) {
    if (DvtNBoxCellRenderer._isLabelVertical(nbox, cellData)) {
      childArea = new DvtRectangle(cellLayout['headerSize'], cellTopGap, cellRect.getWidth() - cellLayout['headerSize'] - cellEndGap, cellRect.getHeight() - cellTopGap - cellBottomGap);
    }
    else {
      childArea = new DvtRectangle(cellStartGap, cellLayout['headerSize'], cellRect.getWidth() - cellStartGap - cellEndGap, cellRect.getHeight() - cellLayout['headerSize'] - cellBottomGap);
    }
  }
  else {
    childArea = new DvtRectangle(cellStartGap, cellTopGap, cellRect.getWidth() - cellStartGap - cellEndGap, cellRect.getHeight() - cellTopGap - cellBottomGap);
  }
  var childContainer = new DvtContainer(nbox.getCtx());
  cellContainer.addChild(childContainer);
  cellContainer.setChildContainer(childContainer);
  cellData['__childArea'] = childArea;
}

/**
 * Renders the nbox cell header
 * @param {DvtNBoxImpl} nbox The nbox components
 * @param {object} cellData The cell data
 * @param {DvtNBoxCell} cellContainer The container to render into.
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {boolean} noCount Indicates whether the count label should be suppressed
 * @return {boolean} true if a header was rendered, false otherwise
 */
DvtNBoxCellRenderer.renderHeader = function(nbox, cellData, cellContainer, cellCounts, noCount) {
  var oldLabel = DvtNBoxDataUtils.getDisplayable(nbox, cellData, 'label');
  if (oldLabel) {
    oldLabel.getParent().removeChild(oldLabel);
    DvtNBoxDataUtils.setDisplayable(nbox, cellData, null, 'label');
  }
  var oldCountLabel = DvtNBoxDataUtils.getDisplayable(nbox, cellData, 'countLabel');
  if (oldCountLabel) {
    oldCountLabel.getParent().removeChild(oldCountLabel);
    DvtNBoxDataUtils.setDisplayable(nbox, cellData, null, 'countLabel');
  }
  var addedHeader = false;
  if (cellData['label']) {
    var options = nbox.getOptions();
    var countLabelGap = options['__layout']['countLabelGap'];
    var cellStartGap = options['__layout']['cellStartGap'];
    var cellEndGap = options['__layout']['cellEndGap'];
    var cellTopGap = options['__layout']['cellTopGap'];

    var cellLayout = options['__layout']['__cellLayout']

    var r = DvtNBoxDataUtils.getRowIndex(nbox, cellData['row']);
    var c = DvtNBoxDataUtils.getColumnIndex(nbox, cellData['column']);
    var cellIndex = r*DvtNBoxDataUtils.getColumnCount(nbox) + c; // cells are in sorted row-major order      

    var cellRect = DvtNBoxDataUtils.getDisplayable(nbox, cellData, 'background');

    var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

    var labelHeight = cellLayout['labelHeight'];
    var skipLabel = false;
    var halign = DvtNBoxStyleUtils.getHalign(nbox, cellData['label']);
    var countLabelWidth = 0;
    var countLabelWidthWithGap = 0;
    var countLabel = null;
    var countLabelX = 0;
    var countLabelY = 0;
    var countText = null;
    if (!noCount && cellData['showCount'] == 'on') {
      countText = '' + cellCounts['total'][cellIndex];
      if (cellCounts['highlighted']) {
        countText = nbox.getBundle().getTranslatedString('HIGHLIGHTED_COUNT', [cellCounts['highlighted'][cellIndex], countText]);
      }
    }
    if (DvtNBoxCellRenderer._isLabelVertical(nbox, cellData)) {
      // Vertical Label
      if (countText) {
        countLabel = DvtNBoxRenderer.createText(nbox.getCtx(), countText, DvtNBoxStyleUtils.getCellCountLabelStyle(nbox), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
        if (DvtTextUtils.fitText(countLabel, cellRect.getHeight() - cellStartGap - cellEndGap, labelHeight, cellContainer)) {
          DvtNBoxDataUtils.setDisplayable(nbox, cellData, countLabel, 'countLabel');
          addedHeader = true;
          countLabelWidth = countLabel.getDimensions().w;
          countLabelWidthWithGap = countLabelWidth + countLabelGap;
          // Count label will get offset after rendering the cell label
          countLabelY = cellRect.getHeight() / 2;
          countLabelX = cellTopGap + labelHeight / 2;
        }
        else {
          skipLabel = true;
        }
      }
      var countLabelOffset = 0;
      if (!skipLabel) {
        var label = DvtNBoxRenderer.createText(nbox.getCtx(), cellData['label']['text'], DvtNBoxStyleUtils.getCellLabelStyle(nbox, cellIndex), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
        if (DvtTextUtils.fitText(label, cellRect.getHeight() - cellStartGap - cellEndGap - countLabelWidthWithGap, labelHeight, cellContainer)) {
          DvtNBoxDataUtils.setDisplayable(nbox, cellData, label, 'label');
          var labelWidth = label.getDimensions().w;
          addedHeader = true;
          DvtNBoxRenderer.positionText(label, cellTopGap + labelHeight / 2, (cellRect.getHeight() + countLabelWidthWithGap) / 2, rtl ? Math.PI / 2 : -Math.PI / 2);
          countLabelOffset = (labelWidth + countLabelGap) / 2;
        }
      }
      if (countLabel) {
        countLabelY -= countLabelOffset;
        DvtNBoxRenderer.positionText(countLabel, countLabelX, countLabelY, rtl ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    else {
      if (countText) {
        countLabel = DvtNBoxRenderer.createText(nbox.getCtx(), countText, DvtNBoxStyleUtils.getCellCountLabelStyle(nbox), halign, DvtOutputText.V_ALIGN_MIDDLE);
        if (DvtTextUtils.fitText(countLabel, cellRect.getWidth() - cellStartGap - cellEndGap, labelHeight, cellContainer)) {
          DvtNBoxDataUtils.setDisplayable(nbox, cellData, countLabel, 'countLabel');
          addedHeader = true;
          countLabelWidth = countLabel.getDimensions().w;
          countLabelWidthWithGap = countLabelWidth + countLabelGap;
          // Count label will get offset after rendering the cell label
          if (halign == DvtOutputText.H_ALIGN_CENTER) {
            countLabelX = cellRect.getWidth() / 2;
          }
          else if (halign == DvtOutputText.H_ALIGN_RIGHT) {
            countLabelX = cellRect.getWidth() - cellEndGap;
          }
          else { // halign == DvtOutputText.H_ALIGN_LEFT
            countLabelX = cellStartGap;
          }
          countLabelY = cellTopGap + labelHeight / 2;
          DvtNBoxRenderer.positionText(countLabel, countLabelX, countLabelY);
        }
        else {
          skipLabel = true;
        }
      }
      var countLabelOffset = 0;
      if (!skipLabel) {

        var label = DvtNBoxRenderer.createText(nbox.getCtx(), cellData['label']['text'], DvtNBoxStyleUtils.getCellLabelStyle(nbox, cellIndex), halign, DvtOutputText.V_ALIGN_MIDDLE);
        if (DvtTextUtils.fitText(label, cellRect.getWidth() - cellStartGap - cellEndGap - countLabelWidthWithGap, labelHeight, cellContainer)) {
          DvtNBoxDataUtils.setDisplayable(nbox, cellData, label, 'label');
          var labelWidth = label.getDimensions().w;
          addedHeader = true;
          var labelX;
          if (halign == DvtOutputText.H_ALIGN_CENTER) {
            labelX = (cellRect.getWidth() - (rtl ? -1 : 1) * countLabelWidthWithGap) / 2;
            countLabelOffset = (rtl ? -1 : 1) * (labelWidth + countLabelGap) / 2;
          }
          else if (halign == DvtOutputText.H_ALIGN_RIGHT) {
            labelX = cellRect.getWidth() - cellEndGap - (rtl ? 0 : 1) * countLabelWidthWithGap;
            countLabelOffset = (rtl ? -1 : 0) * (labelWidth + countLabelGap);
          }
          else { // halign == DvtOutputText.H_ALIGN_LEFT
            labelX = cellStartGap + (rtl ? 1 : 0) * countLabelWidthWithGap;
            countLabelOffset = (rtl ? 0 : 1) * (labelWidth + countLabelGap);
          }
          var labelY = cellTopGap + labelHeight / 2;
          DvtNBoxRenderer.positionText(label, labelX, labelY);
        }
      }
      if (countLabel && countLabelOffset) {
        DvtNBoxRenderer.positionText(countLabel, countLabelX + countLabelOffset, countLabelY);
      }
    }
  }
  DvtNBoxCellRenderer._addAccessibilityAttributes(nbox, cellData, cellContainer);
  return addedHeader;
}

/**
 * Renders the body countLabels for the specified cells
 * @param {DvtNBoxImpl} nbox The nbox components
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @param {array} cellIndices The indices of the cells
 */
DvtNBoxCellRenderer.renderBodyCountLabels = function(nbox, cellCounts, cellIndices) {
  var labels = [];
  var fontSize = Number.MAX_VALUE;
  for (var i = 0; i < cellIndices.length; i++) {
    var cellIndex = cellIndices[i];
    var count = cellCounts['total'][cellIndex];
    var cellData = DvtNBoxDataUtils.getCell(nbox, cellIndex);
    var childArea = cellData['__childArea'];
    var label = DvtNBoxRenderer.createText(nbox.getCtx(), '' + count, DvtNBoxStyleUtils.getCellBodyCountLabelStyle(nbox), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
    labels.push(label);
    fontSize = Math.min(fontSize, label.getOptimalFontSize(childArea));
  }
  for (var i = 0; i < cellIndices.length; i++) {
    labels[i].setFontSize(fontSize);
    var cellIndex = cellIndices[i];
    var cellData = DvtNBoxDataUtils.getCell(nbox, cellIndex);
    var cellContainer = DvtNBoxDataUtils.getDisplayable(nbox, cellData);
    var childArea = cellData['__childArea'];
    if (DvtTextUtils.fitText(labels[i], childArea.w, childArea.h, cellContainer)) {
      DvtNBoxCellRenderer.renderHeader(nbox, cellData, cellContainer, cellCounts, true);
      DvtNBoxRenderer.positionText(labels[i], childArea.x + childArea.w/2, childArea.y + childArea.h/2);
    }
  }
}

/**
 * Gets whether the labels for the specified cell should be rendered vertically
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} cellData the cell data
 * @return whether the labels for the specified cell should be rendered vertically
 */
DvtNBoxCellRenderer._isLabelVertical = function(nbox, cellData) {
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  return ((maximizedColumn && maximizedColumn != cellData['column']) && (!maximizedRow || (maximizedRow == cellData['row']))) ? true : false;
};

/**
 * Calculates the dimensions for the specified cell
 *
 * @param {DvtNBoxImpl} nbox The nbox components
 * @param {number} rowIndex the row index of the specified cell
 * @param {number} columnIndex the column index of the specified cell
 * @param {object} cellLayout object containing properties related to cellLayout
 * @param {DvtRectangle} availSpace The available space.
 *
 * @return {DvtRectangle} the dimensions for the specified cell
 */
DvtNBoxCellRenderer.getCellDimensions = function(nbox, rowIndex, columnIndex, cellLayout, availSpace) {
  var options = nbox.getOptions();
  var cellGap = options['__layout']['cellGap'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var minimizedSize = cellGap + cellLayout['minimumCellSize'];
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var defaultRowDimensions = DvtNBoxRenderer.getRowDimensions(nbox, rowIndex, availSpace);
  var defaultColumnDimensions = DvtNBoxRenderer.getColumnDimensions(nbox, columnIndex, availSpace);
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);

  var columnX = defaultColumnDimensions.x;
  var rowY = defaultRowDimensions.y;
  var columnW = defaultColumnDimensions.w;
  var rowH = defaultRowDimensions.h;

  var processColumn = true;

  if (maximizedRow) {
    var maximizedRowIndex = DvtNBoxDataUtils.getRowIndex(nbox, maximizedRow);
    if (rowIndex < maximizedRowIndex) {
      rowY = availSpace.y + availSpace.h - (rowIndex + 1) * minimizedSize;
      rowH = minimizedSize;
      processColumn = false;
    }
    else if (rowIndex == maximizedRowIndex) {
      rowY = availSpace.y + (rowCount - rowIndex - 1) * minimizedSize;
      rowH = availSpace.h - (rowCount - 1) * minimizedSize;
    }
    else { // rowIndex > maximizedRowIndex
      rowY = availSpace.y + (rowCount - rowIndex - 1) * minimizedSize;
      rowH = minimizedSize;
      processColumn = false;
    }
  }

  if (maximizedColumn && processColumn) {
    var maximizedColumnIndex = DvtNBoxDataUtils.getColumnIndex(nbox, maximizedColumn);
    if (columnIndex < maximizedColumnIndex) {
      columnW = minimizedSize;
      columnX = availSpace.x + (rtl ? availSpace.w - minimizedSize : 0) + (rtl ? -1 : 1) * columnIndex * minimizedSize;
    }
    else if (columnIndex == maximizedColumnIndex) {
      columnW = availSpace.w - (columnCount - 1) * minimizedSize;
      columnX = availSpace.x + (rtl ? availSpace.w - columnW : 0) + (rtl ? -1 : 1) * columnIndex * minimizedSize;
    }
    else { // columnIndex > maximizedColumnIndex
      columnW = minimizedSize;
      columnX = availSpace.x + (rtl ? -minimizedSize : availSpace.w) + (rtl ? 1 : -1) * (columnCount - columnIndex) * minimizedSize;
    }
  }
  return new DvtRectangle(columnX, rowY, columnW, rowH);
};

/**
 * Calculates sizes related to cell layout, based upon the first specified cell
 * (Assumes that the cells are specified homogeneously)
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} cellCounts Two keys ('highlighted' and 'total') which each map to an array of cell counts by cell index
 * @return {object} an object containing the calculated sizes
 */
DvtNBoxCellRenderer.calculateCellLayout = function(nbox, cellCounts) {
  var options = nbox.getOptions();
  var cellTopGap = options['__layout']['cellTopGap'];
  var cellBottomGap = options['__layout']['cellBottomGap'];
  var cellLabelGap = options['__layout']['cellLabelGap'];
  var minimumCellSize = options['__layout']['minimumCellSize'];
  var labelHeight = 0;
  var cellData = DvtNBoxDataUtils.getCell(nbox, 0);
  if (cellData['label']) {
    var halign = cellData['label']['halign'];
    var label = DvtNBoxRenderer.createText(nbox.getCtx(), cellData['label']['text'], DvtNBoxStyleUtils.getCellLabelStyle(nbox, 0), halign, DvtOutputText.V_ALIGN_MIDDLE);
    labelHeight = DvtTextUtils.guessTextDimensions(label).h;
    if (cellData['showCount'] == 'on') {
      var count = DvtNBoxRenderer.createText(nbox.getCtx(), cellCounts['total'][0], DvtNBoxStyleUtils.getCellCountLabelStyle(nbox), halign, DvtOutputText.V_ALIGN_MIDDLE);
      var countLabelHeight = DvtTextUtils.guessTextDimensions(count).h;
      labelHeight = Math.max(labelHeight, countLabelHeight);
    }
  }
  var minimizedHeaderSize = labelHeight + cellTopGap + cellBottomGap;
  var headerSize = labelHeight + cellTopGap + cellLabelGap;
  minimumCellSize = Math.max(minimizedHeaderSize, minimumCellSize);
  var cellLayout = {'labelHeight': labelHeight, 'headerSize': headerSize, 'minimizedHeaderSize': minimizedHeaderSize, 'minimumCellSize': minimumCellSize};
  options['__layout']['__cellLayout'] = cellLayout;
  return cellLayout;
};

/**
 * Enables scrolling on the specified cell
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} cellData the specified cell data
 */
DvtNBoxCellRenderer.enableScrolling = function(nbox, cellData) {
  var childArea = cellData['__childArea'];
  // TODO: Fix up this size fudging!
  var scrollContainer = new DvtScrollableContainer(nbox.getCtx(), childArea.w - 10, childArea.h, childArea.w, childArea.h, 0);
  scrollContainer.setSkinName(nbox.getOptions()['skin']);
  scrollContainer.setStyleMap(DvtNBoxStyleUtils.getScrollbarStyleMap(nbox));
  scrollContainer.setTranslate(childArea.x, childArea.y);
  var cell = DvtNBoxDataUtils.getDisplayable(nbox, cellData);
  cell.removeChild(cell.getChildContainer());
  cell.addChild(scrollContainer);
  cell.setChildContainer(scrollContainer);
  cellData['__childArea'] = new DvtRectangle(0, 0, childArea.w - scrollContainer.getScrollbarWidth(), childArea.h);
};

/**
 * @override
 */
DvtNBoxCellRenderer.animateUpdate = function(animationHandler, oldCell, newCell) {
  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();
  var playable = new DvtCustomAnimation(newNBox.getCtx(), newCell, animationHandler.getAnimationDuration());

  // Promote the child container first so that nodes that position themselves correctly
  var childContainer = newCell.getChildContainer();
  var childMatrix = childContainer.getMatrix();
  childContainer.setMatrix(DvtNBoxRenderer.getGlobalMatrix(childContainer));
  var cellParent = newCell.getParent();
  cellParent.addChildAt(childContainer, cellParent.getChildIndex(newCell) + 1);

  // Position
  playable.getAnimator().addProp(DvtAnimator.TYPE_MATRIX, newCell, newCell.getMatrix, newCell.setMatrix, newCell.getMatrix());
  newCell.setMatrix(oldCell.getMatrix());
  // Background
  var oldBackground = DvtNBoxDataUtils.getDisplayable(oldNBox, oldCell.getData(), 'background');
  var newBackground = DvtNBoxDataUtils.getDisplayable(newNBox, newCell.getData(), 'background');
  playable.getAnimator().addProp(DvtAnimator.TYPE_FILL, newBackground, newBackground.getFill, newBackground.setFill, newBackground.getFill());
  newBackground.setFill(oldBackground.getFill());
  playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, newBackground, newBackground.getWidth, newBackground.setWidth, newBackground.getWidth());
  newBackground.setWidth(oldBackground.getWidth());
  playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, newBackground, newBackground.getHeight, newBackground.setHeight, newBackground.getHeight());
  newBackground.setHeight(oldBackground.getHeight());
  
  //keyboard focus effect
  if (newCell.isShowingKeyboardFocusEffect()) {
    var effect = DvtNBoxDataUtils.getDisplayable(newNBox, newCell.getData(), 'focusEffect').getEffect();
    if (effect) {
      playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, effect, effect.getWidth, effect.setWidth, effect.getWidth());
      effect.setWidth(oldBackground.getWidth()+2);
      playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, effect, effect.getHeight, effect.setHeight, effect.getHeight());
      effect.setHeight(oldBackground.getHeight()+2);
    }
  }

  DvtNBoxCellRenderer._animateLabels(animationHandler, oldCell, newCell, 'countLabel');
  DvtNBoxCellRenderer._animateLabels(animationHandler, oldCell, newCell, 'label');

  DvtPlayable.appendOnEnd(playable, function() {newCell.addChild(childContainer); childContainer.setMatrix(childMatrix)});
  animationHandler.add(playable, DvtNBoxDataAnimationHandler.UPDATE);
};

DvtNBoxCellRenderer._animateLabels = function(animationHandler, oldCell, newCell, labelKey) {
  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();
  var oldLabel = DvtNBoxDataUtils.getDisplayable(oldNBox, oldCell.getData(), labelKey);
  var newLabel = DvtNBoxDataUtils.getDisplayable(newNBox, newCell.getData(), labelKey);
  var oldVerticalLabel = DvtNBoxCellRenderer._isLabelVertical(oldNBox, oldCell.getData());
  var newVerticalLabel = DvtNBoxCellRenderer._isLabelVertical(newNBox, newCell.getData());
  if (oldLabel || newLabel) {
    if (oldLabel && newLabel && (oldVerticalLabel == newVerticalLabel)) {
      var playable = new DvtCustomAnimation(newNBox.getCtx(), newLabel, animationHandler.getAnimationDuration());
      playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, newLabel, newLabel.getX, newLabel.setX, newLabel.getX());
      newLabel.setX(oldLabel.getX());
      playable.getAnimator().addProp(DvtAnimator.TYPE_NUMBER, newLabel, newLabel.getY, newLabel.setY, newLabel.getY());
      newLabel.setY(oldLabel.getY());
      playable.getAnimator().addProp(DvtAnimator.TYPE_MATRIX, newLabel, newLabel.getMatrix, newLabel.setMatrix, newLabel.getMatrix());
      newLabel.setMatrix(oldLabel.getMatrix());
      animationHandler.add(playable, DvtNBoxDataAnimationHandler.UPDATE);
    }
    else {
      if (oldLabel) {
        oldLabel.setMatrix(DvtNBoxRenderer.getGlobalMatrix(oldLabel));
        newNBox.getDeleteContainer().addChild(oldLabel);
        animationHandler.add(new DvtAnimFadeOut(newNBox.getCtx(), oldLabel, animationHandler.getAnimationDuration()), DvtNBoxDataAnimationHandler.UPDATE);
      }
      if (newLabel) {
        newLabel.setAlpha(0);
        animationHandler.add(new DvtAnimFadeIn(newNBox.getCtx(), newLabel, animationHandler.getAnimationDuration()), DvtNBoxDataAnimationHandler.UPDATE);
      }
    }
  }
};

/**
 * @override
 */
DvtNBoxCellRenderer.animateDelete = function(animationHandler, oldCell) {
  var nbox = animationHandler.getNewNBox();
  // Reparent the child container if any
  var childContainer = oldCell.getChildContainer();
  if (childContainer) {
    var globalMatrix = DvtNBoxRenderer.getGlobalMatrix(childContainer);
    var cellParent = oldCell.getParent();
    cellParent.addChildAt(childContainer, cellParent.getChildIndex(oldCell) + 1);
    childContainer.setMatrix(globalMatrix);
  }
  // Add the cell to the delete container and fade out
  nbox.getDeleteContainer().addChild(oldCell);
  animationHandler.add(new DvtAnimFadeOut(nbox.getCtx(), oldCell, animationHandler.getAnimationDuration()), DvtNBoxDataAnimationHandler.UPDATE);
};

/**
 * @override
 */
DvtNBoxCellRenderer.animateInsert = function(animationHandler, newCell) {
  var nbox = animationHandler.getNewNBox();
  // Reparent the child container if any
  var childContainer = newCell.getChildContainer();
  var childMatrix = null;
  if (childContainer) {
    childMatrix = childContainer.getMatrix();
    var globalMatrix = DvtNBoxRenderer.getGlobalMatrix(newCell);
    var cellParent = newCell.getParent();
    cellParent.addChildAt(childContainer, cellParent.getChildIndex(newCell) + 1);
    childContainer.setMatrix(globalMatrix);
  }
  // Fade in the cell
  newCell.setAlpha(0);
  var playable = new DvtAnimFadeIn(nbox.getCtx(), newCell, animationHandler.getAnimationDuration());
  if (childContainer) {
    DvtPlayable.appendOnEnd(playable, function() {newCell.addChild(childContainer); childContainer.setMatrix(childMatrix);});
  }
  animationHandler.add(playable, DvtNBoxDataAnimationHandler.UPDATE);
};

/**
 * Renders the drop site feedback for the specified cell
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {DvtNBoxCell} cell the cell
 * @return {DvtDisplayable} the drop site feedback
 */
DvtNBoxCellRenderer.renderDropSiteFeedback = function(nbox, cell) {
  var background = DvtNBoxDataUtils.getDisplayable(nbox, cell.getData(), 'background');
  var dropSiteFeedback = new DvtRect(nbox.getCtx(), background.getX(), background.getY(), background.getWidth(), background.getHeight());
  dropSiteFeedback.setPixelHinting(true);
  var style = DvtNBoxStyleUtils.getCellDropTargetStyle(nbox);
  DvtNBoxCellRenderer._applyStyleToRect(dropSiteFeedback, style);
  cell.addChildAt(dropSiteFeedback, cell.getChildIndex(background) + 1);
  return dropSiteFeedback;
};

/**
 * Applies CSS properties to a DvtRect (placed here to avoid changing the behavior of DvtRect.setCSSStyle)
 *
 * @param {DvtRect} rect the DvtRect
 * @param {DvtCSSStyle} style  the DvtCSSStyle
 */
DvtNBoxCellRenderer._applyStyleToRect = function(rect, style) {
  var bgFill = style.getStyle(DvtCSSStyle.BACKGROUND);
  var colorFill = style.getStyle(DvtCSSStyle.BACKGROUND_COLOR);
  var fill = bgFill ? bgFill : colorFill;
  if (fill) {
    DvtNBoxRenderer.setFill(rect, fill);
  }
  // TODO: switch to DvtCSSStyle.BORDER_STYLE which available in 12.1.4
  var borderStyle = style.getStyle('border-style');
  if (borderStyle == 'solid') {
    var borderColor = style.getStyle(DvtCSSStyle.BORDER_COLOR);
    borderColor = borderColor ? borderColor : '#000000';
    var borderWidth = style.getStyle(DvtCSSStyle.BORDER_WIDTH);
    borderWidth = borderWidth == null ? 1 : borderWidth;
    rect.setSolidStroke(borderColor, null, borderWidth);
  }
};

/**
 * @private
 * Adds accessibility attributes to the object
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} cellData the cell data
 * @param {DvtNBoxCell} cellContainer the object that should be updated with accessibility attributes
 */
DvtNBoxCellRenderer._addAccessibilityAttributes = function(nbox, cellData, cellContainer) {
  if (!DvtAgent.deferAriaCreation()) {
    var desc = cellContainer.getAriaLabel();
    if (desc) {
      var object = DvtAgent.isTouchDevice() ? DvtNBoxDataUtils.getDisplayable(nbox, cellData, 'background') : cellContainer;    
      object.setAriaRole('img');
      object.setAriaProperty('label', desc);
    }
  }
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Renderer for DvtNBoxNode.
 * @class
 */
var DvtNBoxNodeRenderer = new Object();

DvtObj.createSubclass(DvtNBoxNodeRenderer, DvtObj, 'DvtNBoxNodeRenderer');

/**
 * Renders the nbox node.
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} nodeData the node data being rendered
 * @param {DvtNBoxNode} nodeContainer The container to render into.
 * @param {object} nodeLayout An object containing properties related to the sizes of the various node subsections
 */
DvtNBoxNodeRenderer.render = function(nbox, nodeData, nodeContainer, nodeLayout) {
  DvtNBoxNodeRenderer._renderNodeBackground(nbox, nodeData, nodeContainer, nodeLayout);
  DvtNBoxNodeRenderer._renderNodeIndicator(nbox, nodeData, nodeContainer, nodeLayout);
  DvtNBoxNodeRenderer._renderNodeIcon(nbox, nodeData, nodeContainer, nodeLayout);
  DvtNBoxNodeRenderer._renderNodeLabels(nbox, nodeData, nodeContainer, nodeLayout);
  DvtNBoxNodeRenderer._addAccessibilityAttributes(nbox, nodeContainer);
};

/**
 * Calculates sizes related to node layout, based upon the first specified node
 * (Assumes that the nodes are specified homogeneously)
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {object} an object containing the calculated sizes
 */
DvtNBoxNodeRenderer.calculateNodeLayout = function(nbox) {
  var options = nbox.getOptions();
  var gridGap = options['__layout']['gridGap'];
  var nodeStartLabelGap = options['__layout']['nodeStartLabelGap'];
  var nodeLabelOnlyStartLabelGap = options['__layout']['nodeLabelOnlyStartLabelGap'];
  var nodeEndLabelGap = options['__layout']['nodeEndLabelGap'];

  var simpleLayout = DvtNBoxNodeRenderer._calculateSimpleNodeLayout(nbox);
  var nodeHeight = simpleLayout['nodeHeight'];
  var indicatorSectionWidth = simpleLayout['indicatorSectionWidth'];
  var iconSectionWidth = simpleLayout['iconSectionWidth'];
  var startLabelGap = (indicatorSectionWidth || iconSectionWidth) ? nodeStartLabelGap : nodeLabelOnlyStartLabelGap;

  var labelSectionWidth = 0;
  var cellLayouts = [];
  var cellRows = 0;
  var cellColumns = 0;
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  for (var r = 0; r < rowCount; r++) {
    for (var c = 0; c < columnCount; c++) {
      cellLayouts.push({'cellRows': 0, 'cellColumns': 0, 'overflow': false});
    }
  }
  var nodeCounts = [];
  var nodeCount = DvtNBoxDataUtils.getNodeCount(nbox);
  for (var n = 0; n < nodeCount; n++) {
    var node = DvtNBoxDataUtils.getNode(nbox, n);
    var nodeCellIndex = DvtNBoxDataUtils.getCellIndex(nbox, node);
    if (isNaN(nodeCounts[nodeCellIndex])) {
      nodeCounts[nodeCellIndex] = 0;
    }
    nodeCounts[nodeCellIndex]++;
  }
  if (maximizedRow && maximizedColumn) {
    labelSectionWidth = simpleLayout['labelSectionWidth'] != null ? simpleLayout['labelSectionWidth'] : (options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap);
    var maximizedCellIndex = DvtNBoxDataUtils.getColumnIndex(nbox, maximizedColumn) + columnCount * DvtNBoxDataUtils.getRowIndex(nbox, maximizedRow);
    var cell = DvtNBoxDataUtils.getCell(nbox, maximizedCellIndex);
    var cellArea = cell['__childArea'];
    var cellColumns = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
    if (cellColumns == 0 && simpleLayout['labelSectionWidth'] == null) {
      // Can't fit maximum label size, choose the biggest size that will fit (but not smaller than the minimum)
      var labelWidth = cellArea.w - indicatorSectionWidth - iconSectionWidth;
      if (labelWidth >= options['__layout']['minimumLabelWidth']) {
        labelSectionWidth = labelWidth;
        cellColumns = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
      }
    }
    var visibleRows = Math.floor((cellArea.h + gridGap) / (nodeHeight + gridGap));
    if (!isNaN(nodeCounts[maximizedCellIndex]) && nodeCounts[maximizedCellIndex] > cellColumns * visibleRows) {
      // Need to enable scrolling
      DvtNBoxCellRenderer.enableScrolling(nbox, cell);
      // Get the new childArea which should account for the space taken by the scrollbar
      cellArea = cell['__childArea'];
      cellColumns = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
      if (cellColumns == 0 && simpleLayout['labelSectionWidth'] == null) {
        // Can't fit this label size, choose the biggest size that will fit
        var labelWidth = Math.max(0, cellArea.w - indicatorSectionWidth - iconSectionWidth);
        labelSectionWidth = labelWidth;
        cellColumns = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
      }
    }
    cellLayouts[maximizedCellIndex] = {'cellRows': -1, 'cellColumns': cellColumns, 'overflow': false};
  }
  else {
    var cellIndices = [];
    if (maximizedRow) {
      var maximizedRowIndex = DvtNBoxDataUtils.getRowIndex(nbox, maximizedRow);
      for (var c = 0; c < columnCount; c++) {
        cellIndices.push(c + maximizedRowIndex * columnCount);
      }
    }
    else if (maximizedColumn) {
      var maximizedColumnIndex = DvtNBoxDataUtils.getColumnIndex(nbox, maximizedColumn);
      for (var r = 0; r < rowCount; r++) {
        cellIndices.push(maximizedColumnIndex + r * columnCount);
      }
    }
    else {
      for (var i = 0; i < cellLayouts.length; i++) {
        cellIndices.push(i);
      }
    }

    if (simpleLayout['labelSectionWidth'] != null) {
      labelSectionWidth = simpleLayout['labelSectionWidth'];
      // Node size is fixed, just need to calculate cellRows and cellColumns
      var cell = DvtNBoxDataUtils.getCell(nbox, cellIndices[0]);
      var cellArea = cell['__childArea'];
      cellRows = Math.floor((cellArea.h + gridGap) / (nodeHeight + gridGap));
      cellColumns = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
    }
    else {
      var maxCellIndex = 0;
      // Use the most populated non-minimized cell to calculate node size
      for (var ci = 0; ci < cellIndices.length; ci++) {
        if (!isNaN(nodeCounts[cellIndices[ci]]) && nodeCounts[cellIndices[ci]] > nodeCounts[maxCellIndex]) {
          maxCellIndex = cellIndices[ci];
        }
      }
      var cell = DvtNBoxDataUtils.getCell(nbox, maxCellIndex);
      var cellArea = cell['__childArea'];
      var maxRows = Math.floor((cellArea.h + gridGap) / (nodeHeight + gridGap));
      var maxCols = Math.floor((cellArea.w + gridGap) / (indicatorSectionWidth + iconSectionWidth + options['__layout']['minimumLabelWidth'] + startLabelGap + nodeEndLabelGap + gridGap));
      if (maxRows * maxCols < nodeCounts[maxCellIndex]) {
        labelSectionWidth = Math.floor(Math.min(options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap, (cellArea.w + gridGap) / maxCols - (indicatorSectionWidth + iconSectionWidth + gridGap)));
        cellRows = maxRows;
        cellColumns = maxCols;
      }
      else {
        var columnsPerRow = maxCols;
        labelSectionWidth = Math.floor(Math.min(options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap, (cellArea.w + gridGap) / columnsPerRow - (indicatorSectionWidth + iconSectionWidth + gridGap)));
        while (labelSectionWidth < (options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap)) {
          if ((columnsPerRow - 1) * maxRows >= nodeCounts[maxCellIndex]) {
            columnsPerRow--;
            labelSectionWidth = Math.floor(Math.min(options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap, (cellArea.w + gridGap) / columnsPerRow - (indicatorSectionWidth + iconSectionWidth + gridGap)));
          }
          else {
            break;
          }
        }
        cellRows = maxRows;
        cellColumns = columnsPerRow;
      }
    }
    for (var ci = 0; ci < cellIndices.length; ci++) {
      var cellIndex = cellIndices[ci];
      var overflow = false;
      if (nodeCounts[cellIndex] > cellRows * cellColumns) {
        overflow = true;
      }
      cellLayouts[cellIndex] = {'cellRows': cellRows, 'cellColumns': cellColumns, 'overflow': overflow};
    }
  }
  var nodeLayout = {'nodeHeight': nodeHeight,
                    'indicatorSectionWidth': indicatorSectionWidth,
                    'iconSectionWidth': iconSectionWidth,
                    'labelSectionWidth': labelSectionWidth,
                    'cellLayouts': cellLayouts};
  options['__layout']['__nodeLayout'] = nodeLayout;
  return nodeLayout;
};

/**
 * Calculates sizes related to node layout, based upon the first specified node
 * (Assumes that the nodes are specified homogeneously)
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} data the drawer data
 * @return {object} an object containing the calculated sizes
 */
DvtNBoxNodeRenderer.calculateNodeDrawerLayout = function(nbox, data) {
  var options = nbox.getOptions();
  var gridGap = options['__layout']['gridGap'];
  var nodeStartLabelGap = options['__layout']['nodeStartLabelGap'];
  var nodeLabelOnlyStartLabelGap = options['__layout']['nodeLabelOnlyStartLabelGap'];
  var nodeEndLabelGap = options['__layout']['nodeEndLabelGap'];

  var simpleLayout = DvtNBoxNodeRenderer._calculateSimpleNodeLayout(nbox);
  var nodeHeight = simpleLayout['nodeHeight'];
  var indicatorSectionWidth = simpleLayout['indicatorSectionWidth'];
  var iconSectionWidth = simpleLayout['iconSectionWidth'];
  var startLabelGap = (indicatorSectionWidth || iconSectionWidth) ? nodeStartLabelGap : nodeLabelOnlyStartLabelGap;
  var labelSectionWidth = simpleLayout['labelSectionWidth'] != null ? simpleLayout['labelSectionWidth'] : options['__layout']['maximumLabelWidth'] + startLabelGap + nodeEndLabelGap;

  var childArea = data['__childArea'];
  var columns = Math.floor(childArea.w / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
  var visibleRows = Math.floor(childArea.h / (nodeHeight + gridGap));
  var categoryNode = DvtNBoxDataUtils.getCategoryNode(nbox, data['id']);
  if (categoryNode['nodeIndices'].length > columns * visibleRows) {
    // Need to enable scrolling
    DvtNBoxDrawerRenderer.enableScrolling(nbox, data);
    // Get the new childArea which should account for the space taken by the scrollbar
    childArea = data['__childArea'];
    columns = Math.floor(childArea.w / (indicatorSectionWidth + iconSectionWidth + labelSectionWidth + gridGap));
  }

  var nodeDrawerLayout = {'nodeHeight': nodeHeight,
                          'indicatorSectionWidth': indicatorSectionWidth,
                          'iconSectionWidth': iconSectionWidth,
                          'labelSectionWidth': labelSectionWidth,
                          'drawerLayout': {'rows': -1, 'columns': columns}};
  options['__layout']['__nodeDrawerLayout'] = nodeDrawerLayout;
  return nodeDrawerLayout;

};

/**
 * Calculates sizes related to node layout, based upon the first specified node
 * (Assumes that the nodes are specified homogeneously)
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {object} an object containing the calculated sizes
 */
DvtNBoxNodeRenderer._calculateSimpleNodeLayout = function(nbox) {
  var options = nbox.getOptions();
  var nodeIndicatorGap = options['__layout']['nodeIndicatorGap'];
  var nodeSingleLabelGap = options['__layout']['nodeSingleLabelGap'];
  var nodeDualLabelGap = options['__layout']['nodeDualLabelGap'];
  var nodeInterLabelGap = options['__layout']['nodeInterLabelGap'];
  var nodeSwatchSize = options['__layout']['nodeSwatchSize'];

  var node = DvtNBoxDataUtils.getNode(nbox, 0);
  var nodeHeight = 0;
  var indicatorSectionWidth = 0;
  var iconSectionWidth = 0;
  var labelSectionWidth = null;
  var indicator = DvtNBoxDataUtils.getIndicator(nbox, node);
  var indicatorColor = DvtNBoxStyleUtils.getNodeIndicatorColor(nbox, node);
  var icon = DvtNBoxDataUtils.getIcon(nbox, node);
  if (indicator) {
    var indicatorWidth = indicator['width'] * indicator['scaleX'];
    var indicatorHeight = indicator['height'] * indicator['scaleY'];
    indicatorSectionWidth = indicatorWidth + 2 * nodeIndicatorGap;
    nodeHeight = Math.max(nodeHeight, indicatorHeight + 2 * nodeIndicatorGap);
  }
  else if (indicatorColor) {
    indicatorSectionWidth = nodeSwatchSize;
  }
  if (node['label']) {
    var label = DvtNBoxRenderer.createText(nbox.getCtx(), node['label']['text'], DvtNBoxStyleUtils.getNodeLabelStyle(nbox, node), DvtOutputText.H_ALIGN_LEFT, DvtOutputText.V_ALIGN_MIDDLE);
    var labelHeight = DvtTextUtils.guessTextDimensions(label).h;
    nodeHeight = Math.max(nodeHeight, labelHeight + 2 * nodeSingleLabelGap);
    if (node['secondaryLabel']) {
      var secondaryLabel = DvtNBoxRenderer.createText(nbox.getCtx(), node['secondaryLabel']['text'], DvtNBoxStyleUtils.getNodeSecondaryLabelStyle(nbox, node), DvtOutputText.H_ALIGN_LEFT, DvtOutputText.V_ALIGN_MIDDLE);
      var secondaryLabelHeight = DvtTextUtils.guessTextDimensions(secondaryLabel).h;
      nodeHeight = Math.max(nodeHeight, labelHeight + secondaryLabelHeight + 2 * nodeDualLabelGap + nodeInterLabelGap);
    }
  }
  else {
    labelSectionWidth = 0;
    // Is there a data color to show?
    if (node['color'] || DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'color')) {
      if ((!indicator || DvtNBoxStyleUtils.getNodeIndicatorColor(nbox, node)) &&
          (!icon || icon['source'])) {
        // Swatch needed
        labelSectionWidth = indicatorSectionWidth ? indicatorSectionWidth : nodeSwatchSize;
      }
    }
  }
  if (icon) {
    var preferredSize = Math.max(nodeHeight, DvtAgent.isTouchDevice() ? icon['preferredSizeTouch'] : icon['preferredSize']);
    var padding = (icon['source'] ? icon['sourcePaddingRatio'] : icon['shapePaddingRatio']) * preferredSize;
    var iconWidth = (icon['width'] ? icon['width'] : preferredSize - 2*padding) * icon['scaleX'];
    var iconHeight = (icon['height'] ? icon['height'] : preferredSize - 2*padding) * icon['scaleY'];
    iconSectionWidth = iconWidth + 2*padding;
    nodeHeight = Math.max(nodeHeight, iconHeight + 2*padding);    
  }
  return {'nodeHeight': nodeHeight,
          'indicatorSectionWidth': indicatorSectionWidth,
          'iconSectionWidth': iconSectionWidth,
          'labelSectionWidth': labelSectionWidth};
};

/**
 * Renders the node background
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxNode} nodeContainer the container for the node contents
 * @param {object} nodeLayout an object containing dimensions of the various node sections
 */
DvtNBoxNodeRenderer._renderNodeBackground = function(nbox, node, nodeContainer, nodeLayout) {
  var width = nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth'];
  var height = nodeLayout['nodeHeight'];
  var borderRadius = DvtNBoxStyleUtils.getNodeBorderRadius(nbox);
  var hoverColor = DvtNBoxStyleUtils.getNodeHoverColor(nbox);
  var selectionColor = DvtNBoxStyleUtils.getNodeSelectionColor(nbox);

  var selectionRect = new DvtRect(nbox.getCtx(),
                                  0,
                                  0,
                                  width,
                                  height);
  selectionRect.setFill(null);
  if (borderRadius) {
    selectionRect.setRx(borderRadius);
    selectionRect.setRy(borderRadius);
  }
  selectionRect.setHoverStroke(new DvtSolidStroke(hoverColor, null, 2), new DvtSolidStroke(selectionColor, null, 4));
  selectionRect.setSelectedStroke(new DvtSolidStroke(selectionColor, null, 4), null);
  selectionRect.setSelectedHoverStroke(new DvtSolidStroke(hoverColor, null, 2), new DvtSolidStroke(selectionColor, null, 6));
  nodeContainer.addChild(selectionRect);
  nodeContainer.setSelectionShape(selectionRect);
  var nodeRect = new DvtRect(nbox.getCtx(),
                             0,
                             0,
                             width,
                             height);
  if (borderRadius) {
    nodeRect.setRx(borderRadius);
    nodeRect.setRy(borderRadius);
  }
  var color = DvtNBoxStyleUtils.getNodeColor(nbox, node);
  nodeRect.setSolidFill(color);
  nodeContainer.addChild(nodeRect);
  DvtNBoxDataUtils.setDisplayable(nbox, node, nodeRect, 'background');
};

/**
 * Renders the node indicator
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxNode} nodeContainer the container for the node contents
 * @param {object} nodeLayout an object containing dimensions of the various node sections
 */
DvtNBoxNodeRenderer._renderNodeIndicator = function(nbox, node, nodeContainer, nodeLayout) {
  var color = DvtNBoxStyleUtils.getNodeColor(nbox, node);
  var contrastColor = DvtColorUtils.getContrastingTextColor(color);

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());
  var indicatorX = rtl ? nodeLayout['labelSectionWidth'] + nodeLayout['iconSectionWidth'] : 0;

  var indicatorBackgroundColor = DvtNBoxStyleUtils.getNodeIndicatorColor(nbox, node);
  if (indicatorBackgroundColor) {
    // Render the indicator background swatch
    contrastColor = DvtColorUtils.getContrastingTextColor(indicatorBackgroundColor);
    var bgRect = new DvtRect(nbox.getCtx(), indicatorX, 0, nodeLayout['indicatorSectionWidth'], nodeLayout['nodeHeight']);
    bgRect.setSolidFill(indicatorBackgroundColor);
    DvtNBoxNodeRenderer._clipIfNecessary(nbox, bgRect, nodeLayout);
    nodeContainer.addChild(bgRect);
    DvtNBoxDataUtils.setDisplayable(nbox, node, bgRect, 'indicatorBackground');
  }
  var indicator = DvtNBoxDataUtils.getIndicator(nbox, node);
  if (indicator) {
    var indicatorColor = indicator['color'] ? indicator['color'] : contrastColor;
    var indicatorMarker = new DvtMarker(nbox.getCtx(),
                                        indicator['source'] ? [indicator['source']] : indicator['shape'],
                                        DvtCSSStyle.SKIN_ALTA,
                                        indicatorX + (nodeLayout['indicatorSectionWidth'] - indicator['width'] * indicator['scaleX']) / 2,
                                        (nodeLayout['nodeHeight'] - indicator['height'] * indicator['scaleY']) / 2,
                                        indicator['width'],
                                        indicator['height'],
                                        null,
                                        indicator['scaleX'],
                                        indicator['scaleY']);
    if (indicator['fillPattern'] != 'none') {
      indicatorMarker.setFill(new DvtPatternFill(indicator['fillPattern'], indicatorColor, color));
    }
    else {
      indicatorMarker.setSolidFill(indicatorColor);
    }
    nodeContainer.addChild(indicatorMarker);
    DvtNBoxDataUtils.setDisplayable(nbox, node, indicatorMarker, 'indicatorMarker');
  }
};

/**
 * Renders the node icon
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxNode} nodeContainer the container for the node contents
 * @param {object} nodeLayout an object containing dimensions of the various node sections
 */
DvtNBoxNodeRenderer._renderNodeIcon = function(nbox, node, nodeContainer, nodeLayout) {
  var color = DvtNBoxStyleUtils.getNodeColor(nbox, node);
  var contrastColor = DvtColorUtils.getContrastingTextColor(color);

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var icon = DvtNBoxDataUtils.getIcon(nbox, node);
  if (icon) {
    var padding = (icon['source'] ? icon['sourcePaddingRatio'] : icon['shapePaddingRatio']) * nodeLayout['nodeHeight'];
    var unscaledIconWidth = icon['width'] ? icon['width'] : (nodeLayout['iconSectionWidth'] - 2*padding)/icon['scaleX'];
    var unscaledIconHeight = icon['height'] ? icon['height'] : (nodeLayout['nodeHeight'] - 2*padding)/icon['scaleY'];

    var iconColor = icon['color'] ? icon['color'] : contrastColor;
    var iconMarker = new DvtMarker(nbox.getCtx(),
                                   icon['source'] ? [icon['source']] : icon['shape'],
                                   DvtCSSStyle.SKIN_ALTA,
                                   nodeLayout[rtl ? 'labelSectionWidth' : 'indicatorSectionWidth'] + (nodeLayout['iconSectionWidth'] - unscaledIconWidth * icon['scaleX']) / 2,
                                   (nodeLayout['nodeHeight'] - unscaledIconHeight * icon['scaleY']) / 2,
                                   unscaledIconWidth,
                                   unscaledIconHeight,
                                   null,
                                   icon['scaleX'],
                                   icon['scaleY']);
    if (icon['fillPattern'] != 'none') {
      iconMarker.setFill(new DvtPatternFill(icon['fillPattern'], iconColor, color));
    }
    else {
      iconMarker.setSolidFill(iconColor);
    }
    if (nodeLayout['indicatorSectionWidth'] == 0 || nodeLayout['labelSectionWidth'] == 0) {
      // icon is on one of the ends
      DvtNBoxNodeRenderer._clipIfNecessary(nbox, iconMarker, nodeLayout);
    }
    nodeContainer.addChild(iconMarker);
  }
    DvtNBoxDataUtils.setDisplayable(nbox, node, iconMarker, 'iconMarker');
};

/**
 * Renders the node labels
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxNode} nodeContainer the container for the node contents
 * @param {object} nodeLayout an object containing dimensions of the various node sections
 */
DvtNBoxNodeRenderer._renderNodeLabels = function(nbox, node, nodeContainer, nodeLayout) {
  var options = nbox.getOptions();
  var nodeInterLabelGap = options['__layout']['nodeInterLabelGap'];
  var nodeLabelOnlyStartLabelGap = options['__layout']['nodeLabelOnlyStartLabelGap'];
  var nodeStartLabelGap = options['__layout']['nodeStartLabelGap'];
  var nodeEndLabelGap = options['__layout']['nodeEndLabelGap'];
  var startLabelGap = nodeLayout['indicatorSectionWidth'] || nodeLayout['iconSectionWidth'] ? nodeStartLabelGap : nodeLabelOnlyStartLabelGap;
  var color = DvtNBoxStyleUtils.getNodeColor(nbox, node);
  var contrastColor = DvtColorUtils.getContrastingTextColor(color);

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());
  var halign = rtl ? DvtOutputText.H_ALIGN_RIGHT : DvtOutputText.H_ALIGN_LEFT;
  var labelX = rtl ? nodeLayout['labelSectionWidth'] - startLabelGap : nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + startLabelGap;

  if (node['label']) {
    var label = DvtNBoxRenderer.createText(nbox.getCtx(), node['label']['text'], DvtNBoxStyleUtils.getNodeLabelStyle(nbox, node), halign, DvtOutputText.V_ALIGN_MIDDLE);
    var labelHeight = DvtTextUtils.guessTextDimensions(label).h;
    if (DvtTextUtils.fitText(label, nodeLayout['labelSectionWidth'] - startLabelGap - nodeEndLabelGap, labelHeight, nodeContainer)) {
      DvtNBoxRenderer.positionText(label, labelX, nodeLayout['nodeHeight'] / 2);
      label.setSolidFill(contrastColor);
      DvtNBoxDataUtils.setDisplayable(nbox, node, label, 'label');
    }
    if (node['secondaryLabel']) {
      var secondaryLabel = DvtNBoxRenderer.createText(nbox.getCtx(), node['secondaryLabel']['text'], DvtNBoxStyleUtils.getNodeSecondaryLabelStyle(nbox, node), halign, DvtOutputText.V_ALIGN_MIDDLE);
      var secondaryLabelHeight = DvtTextUtils.guessTextDimensions(secondaryLabel).h;
      if (DvtTextUtils.fitText(secondaryLabel, nodeLayout['labelSectionWidth'] - startLabelGap - nodeEndLabelGap, secondaryLabelHeight, nodeContainer)) {
        var yOffset = (nodeLayout['nodeHeight'] - labelHeight - secondaryLabelHeight - nodeInterLabelGap) / 2;
        DvtNBoxRenderer.positionText(label, labelX, yOffset + labelHeight / 2);
        DvtNBoxRenderer.positionText(secondaryLabel, labelX, yOffset + labelHeight + nodeInterLabelGap + secondaryLabelHeight / 2);
        secondaryLabel.setSolidFill(contrastColor);
        DvtNBoxDataUtils.setDisplayable(nbox, node, secondaryLabel, 'secondaryLabel');
      }
    }
  }
};

/**
 * Conditionally adds a clip path to the specified displayable if a border radius has been specified.
 *
 * @param {DvtNBoxImpl} nbox
 * @param {DvtDisplayable} displayable
 * @param {object} nodeLayout an object containing dimensions of the various node sections
 */
DvtNBoxNodeRenderer._clipIfNecessary = function(nbox, displayable, nodeLayout) {
  var borderRadius = DvtNBoxStyleUtils.getNodeBorderRadius(nbox);
  if (borderRadius) {
    var nodeWidth = nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth'];
    var nodeHeight = nodeLayout['nodeHeight'];
    var clipPath = new DvtClipPath();
    clipPath.addRect(0, 0, nodeWidth, nodeHeight, borderRadius, borderRadius);
    displayable.setClipPath(clipPath);
  }
};

/**
 * @override
 */
DvtNBoxNodeRenderer.animateUpdate = function(animationHandler, oldNode, newNode) {
  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();

  var oldGlobalMatrix = DvtNBoxRenderer.getGlobalMatrix(oldNode);
  var newGlobalMatrix = DvtNBoxRenderer.getGlobalMatrix(newNode);
  var newMatrix = newNode.getMatrix();
  var parent = newNode.getParent();
  oldNode.setAlpha(0);
  animationHandler.getNewNBox().addChild(newNode);
  newNode.setMatrix(oldGlobalMatrix);
  var movePlayable = new DvtAnimMoveTo(newNode.getCtx(), newNode, new DvtPoint(newGlobalMatrix.getTx(), newGlobalMatrix.getTy()), animationHandler.getAnimationDuration());
  DvtPlayable.appendOnEnd(movePlayable, function() {parent.addChild(newNode); newNode.setMatrix(newMatrix)});
  animationHandler.add(movePlayable, DvtNBoxDataAnimationHandler.UPDATE);

  // Colors
  var playable = new DvtCustomAnimation(newNBox.getCtx(), newNode, animationHandler.getAnimationDuration());
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'background');
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'label');
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'secondaryLabel');
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'indicatorBackground');
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'indicatorMarker');
  DvtNBoxNodeRenderer._animateFill(playable, oldNBox, newNBox, oldNode, newNode, 'iconMarker');
  animationHandler.add(playable, DvtNBoxDataAnimationHandler.UPDATE);
};

/**
 * Helper to animate between fills
 *
 * @param {DvtPlayable} playable The playable to add the animation to
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox
 * @param {DvtNBoxNode} oldNode the old node
 * @param {DvtNBoxNode} newNode the new node
 * @param {string} displayableKey the key to use for looking up the sub displayable
 */
DvtNBoxNodeRenderer._animateFill = function(playable, oldNBox, newNBox, oldNode, newNode, displayableKey) {
  var oldDisplayable = DvtNBoxDataUtils.getDisplayable(oldNBox, oldNode.getData(), displayableKey);
  var newDisplayable = DvtNBoxDataUtils.getDisplayable(newNBox, newNode.getData(), displayableKey);
  if (oldDisplayable && newDisplayable) {
    playable.getAnimator().addProp(DvtAnimator.TYPE_FILL, newDisplayable, newDisplayable.getFill, newDisplayable.setFill, newDisplayable.getFill());
    newDisplayable.setFill(oldDisplayable.getFill());
  }
};

/**
 * @override
 */
DvtNBoxNodeRenderer.animateDelete = function(animationHandler, oldNode) {
  var animationPhase = DvtNBoxDataAnimationHandler.DELETE;

  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();

  var id = oldNode.getData()['id'];
  var newNodeIndex = DvtNBoxDataUtils.getNodeIndex(newNBox, id);
  if (!isNaN(newNodeIndex)) {
    var newNode = DvtNBoxDataUtils.getNode(newNBox, newNodeIndex);
    if (!DvtNBoxDataUtils.isNodeHidden(newNBox, newNode)) {
      // Node wasn't "really" deleted, just not visible.
      animationPhase = DvtNBoxDataAnimationHandler.UPDATE;
      // Should it move into a group?
      var groupBy = DvtNBoxDataUtils.getGroupBy(newNBox);
      if (groupBy && groupBy.length > 0) {
        var groups = newNBox.getOptions()['__groups'];
        var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(newNBox);
        if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
          groups = groups[DvtNBoxDataUtils.getCellIndex(newNBox, newNode)];
        }
        var group = groups[DvtNBoxDataUtils.getNodeGroupId(newNBox, newNode)];
        if (group) {
          var groupNode = DvtNBoxDataUtils.getDisplayable(newNBox, group);
          if (groupNode) {
            var centerMatrix = DvtNBoxRenderer.getGlobalMatrix(groupNode);
            var nodeLayout = oldNBox.getOptions()['__layout']['__nodeLayout'];
            var centerOffset = new DvtPoint((nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth']) / 2, nodeLayout['nodeHeight'] / 2);
            animationHandler.add(new DvtAnimMoveTo(newNBox.getCtx(), oldNode, new DvtPoint(centerMatrix.getTx() - centerOffset.x, centerMatrix.getTy() - centerOffset.y), animationHandler.getAnimationDuration()), animationPhase);
          }
        }
      }
    }
  }
  oldNode.setMatrix(DvtNBoxRenderer.getGlobalMatrix(oldNode));
  newNBox.getDeleteContainer().addChild(oldNode);
  animationHandler.add(new DvtAnimFadeOut(newNBox.getCtx(), oldNode, animationHandler.getAnimationDuration()), animationPhase);
};

/**
 * @override
 */
DvtNBoxNodeRenderer.animateInsert = function(animationHandler, newNode) {
  var animationPhase = DvtNBoxDataAnimationHandler.INSERT;

  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();

  var id = newNode.getData()['id'];
  var oldNodeIndex = DvtNBoxDataUtils.getNodeIndex(oldNBox, id);
  if (!isNaN(oldNodeIndex)) {
    var oldNode = DvtNBoxDataUtils.getNode(oldNBox, oldNodeIndex);
    if (!DvtNBoxDataUtils.isNodeHidden(oldNBox, oldNode)) {
      // Node wasn't "really" inserted, just not visible.
      animationPhase = DvtNBoxDataAnimationHandler.UPDATE;
      // Should it move out of a group?
      var groupBy = DvtNBoxDataUtils.getGroupBy(oldNBox);
      if (groupBy && groupBy.length > 0) {
        var groups = oldNBox.getOptions()['__groups'];
        var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(oldNBox);
        if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
          groups = groups[DvtNBoxDataUtils.getCellIndex(oldNBox, oldNode)];
        }
        var group = groups[DvtNBoxDataUtils.getNodeGroupId(oldNBox, oldNode)];
        if (group) {
          var groupNode = DvtNBoxDataUtils.getDisplayable(oldNBox, group);
          if (groupNode) {
            var childMatrix = newNode.getMatrix();
            var parent = newNode.getParent();
            var finalMatrix = DvtNBoxRenderer.getGlobalMatrix(newNode);
            var centerMatrix = DvtNBoxRenderer.getGlobalMatrix(groupNode);
            var nodeLayout = newNBox.getOptions()['__layout']['__nodeLayout'];
            var centerOffset = new DvtPoint((nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth']) / 2, nodeLayout['nodeHeight'] / 2);
            centerMatrix.translate(-centerOffset.x, -centerOffset.y);
            newNBox.addChild(newNode);
            newNode.setMatrix(centerMatrix);
            var movePlayable = new DvtAnimMoveTo(newNBox.getCtx(), newNode, new DvtPoint(finalMatrix.getTx(), finalMatrix.getTy()), animationHandler.getAnimationDuration());
            DvtPlayable.appendOnEnd(movePlayable, function() {newNode.setMatrix(childMatrix); parent.addChild(newNode)});
            animationHandler.add(movePlayable, animationPhase);
          }
        }
      }
    }
  }
  newNode.setAlpha(0);
  var playable = new DvtAnimFadeIn(newNBox.getCtx(), newNode, animationHandler.getAnimationDuration());
  animationHandler.add(playable, animationPhase);
};

/**
 * @private
 * Adds accessibility attributes to the object
 * @param {DvtNBoxImpl} nbox the nbox
 * @param {DvtNBoxNode} object the object that should be updated with accessibility attributes
 */
DvtNBoxNodeRenderer._addAccessibilityAttributes = function(nbox, object) {
  if (!DvtAgent.deferAriaCreation()) {
    var desc = object.getAriaLabel();
    if (desc) {
      object.setAriaRole('img');
      object.setAriaProperty('label', desc);
    }
  }
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Renderer for DvtNBoxCategoryNode.
 * @class
 */
var DvtNBoxCategoryNodeRenderer = new Object();

DvtObj.createSubclass(DvtNBoxCategoryNodeRenderer, DvtObj, 'DvtNBoxCategoryNodeRenderer');

/**
 * Renders the nbox category node.
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} nodeData the category node data being rendered
 * @param {DvtNBoxCategoryNode} nodeContainer The container to render into.
 * @param {number} scale The number of pixels per unit (used to determine the size of this category node based on its node count)
 * @param {number} gap The number of pixels to shrink this node (to leave padding in the force layout)
 */
DvtNBoxCategoryNodeRenderer.render = function(nbox, nodeData, nodeContainer, scale, gap) {
  DvtNBoxCategoryNodeRenderer._renderNodeBackground(nbox, nodeData, nodeContainer, scale, gap);
  var rendered = DvtNBoxCategoryNodeRenderer._renderNodeIndicator(nbox, nodeData, nodeContainer, scale, gap);
  DvtNBoxCategoryNodeRenderer._renderNodeCount(nbox, nodeData, nodeContainer, scale, rendered, gap);
  DvtNBoxCategoryNodeRenderer._addAccessibilityAttributes(nbox, nodeContainer);  
};

/**
 * Renders the node background
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the category node data being rendered
 * @param {DvtNBoxCategoryNode} nodeContainer the container for the node contents
 * @param {number} scale The number of pixels per unit (used to determine the size of this category node based on its node count)
 * @param {number} gap The number of pixels to shrink this node (to leave padding in the force layout)
 */
DvtNBoxCategoryNodeRenderer._renderNodeBackground = function(nbox, node, nodeContainer, scale, gap) {
  node['__scale'] = scale;
  node['__gap'] = gap;
  var side = DvtNBoxCategoryNodeRenderer.getSideLength(node);
  var borderRadius = DvtNBoxStyleUtils.getNodeBorderRadius(nbox);
  var hoverColor = DvtNBoxStyleUtils.getNodeHoverColor(nbox);
  var selectionColor = DvtNBoxStyleUtils.getNodeSelectionColor(nbox);

  var selectionRect = new DvtRect(nbox.getCtx(),
                                  -side / 2,
                                  -side / 2,
                                  side,
                                  side);
  selectionRect.setFill(null);
  if (borderRadius) {
    selectionRect.setRx(borderRadius);
    selectionRect.setRy(borderRadius);
  }
  selectionRect.setHoverStroke(new DvtSolidStroke(hoverColor, null, 2), new DvtSolidStroke(selectionColor, null, 4));
  selectionRect.setSelectedStroke(new DvtSolidStroke(selectionColor, null, 4), null);
  selectionRect.setSelectedHoverStroke(new DvtSolidStroke(hoverColor, null, 2), new DvtSolidStroke(selectionColor, null, 6));
  nodeContainer.addChild(selectionRect);
  nodeContainer.setSelectionShape(selectionRect);

  var nodeRect = new DvtRect(nbox.getCtx(),
                             -side / 2,
                             -side / 2,
                             side,
                             side);
  if (borderRadius) {
    nodeRect.setRx(borderRadius);
    nodeRect.setRy(borderRadius);
  }
  var color = DvtNBoxStyleUtils.getCategoryNodeColor(nbox, node);
  nodeRect.setSolidFill(color);
  nodeContainer.addChild(nodeRect);
};


/**
 * Gets the length of a side of the specified category node
 *
 * @param {object} the category node data
 *
 * @return {number} the side length
 */
DvtNBoxCategoryNodeRenderer.getSideLength = function(node) {
 return node['__scale'] * Math.sqrt(node['nodeIndices'].length) - node['__gap'];
};

/**
 * Renders the node indicator
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxCategoryNode} nodeContainer the container for the node contents
 * @param {number} scale The number of pixels per unit (used to determine the size of this category node based on its node count)
 * @param {number} gap The number of pixels to shrink this node (to leave padding in the force layout)
 */
DvtNBoxCategoryNodeRenderer._renderNodeIndicator = function(nbox, node, nodeContainer, scale, gap) {
  var retVal = false;
  var options = nbox.getOptions();
  var markerGap = options['__layout']['markerGap'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var side = scale * Math.sqrt(node['nodeIndices'].length) - gap;

  var color = DvtNBoxStyleUtils.getCategoryNodeColor(nbox, node);
  var contrastColor = DvtColorUtils.getContrastingTextColor(color);

  var indicatorSectionWidth = side / 4;
  var indicatorScale = 1;
  var indicatorX = rtl ? side / 2 - indicatorSectionWidth : -side / 2;
  var indicator = DvtNBoxStyleUtils.getStyledCategoryIndicator(nbox, node);
  if (indicator) {
    var indicatorWidth = indicator['width'] * indicator['scaleX'];
    var indicatorHeight = indicator['height'] * indicator['scaleY'];
    var xScale = indicatorSectionWidth / (indicatorWidth + 2 * markerGap);
    var yScale = side / (indicatorHeight + 2 * markerGap);
    indicatorScale = Math.min(xScale, yScale);
  }

  var indicatorBackgroundColor = DvtNBoxStyleUtils.getCategoryNodeIndicatorColor(nbox, node);
  if (indicatorBackgroundColor) {
    // Render the indicator background swatch
    contrastColor = DvtColorUtils.getContrastingTextColor(indicatorBackgroundColor);
    var bgRect = new DvtRect(nbox.getCtx(), indicatorX, -side / 2, indicatorSectionWidth, side);
    bgRect.setSolidFill(indicatorBackgroundColor);
    nodeContainer.addChild(bgRect);
    retVal = true;
  }

  if (indicator) {
    var indicatorColor = indicator['color'] ? indicator['color'] : contrastColor;
    var indicatorMarker = new DvtMarker(nbox.getCtx(),
                                        indicator['shape'],
                                        DvtCSSStyle.SKIN_ALTA,
                                        indicatorX + (indicatorSectionWidth - indicatorScale * indicator['width'] * indicator['scaleX']) / 2,
                                        -side / 2 + (side - indicatorScale * indicator['height'] * indicator['scaleY']) / 2,
                                        indicator['width'],
                                        indicator['height'],
                                        null,
                                        indicatorScale * indicator['scaleX'],
                                        indicatorScale * indicator['scaleY']);
    if (indicator['fillPattern'] != 'none') {
      indicatorMarker.setFill(new DvtPatternFill(indicator['fillPattern'], indicatorColor, color));
    }
    else {
      indicatorMarker.setSolidFill(indicatorColor);
    }
    nodeContainer.addChild(indicatorMarker);
    retVal = true;
  }
  return retVal;
};


/**
 * Renders the node count
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data being rendered
 * @param {DvtNBoxCategoryNode} nodeContainer the container for the node contents
 * @param {number} scale The number of pixels per unit (used to determine the size of this category node based on its node count)
 * @param {boolean} bIndicator true if an indicator was rendered, false otherwise
 * @param {number} gap The number of pixels to shrink this node (to leave padding in the force layout)
 */
DvtNBoxCategoryNodeRenderer._renderNodeCount = function(nbox, node, nodeContainer, scale, bIndicator, gap) {
  var options = nbox.getOptions();
  var labelGap = options['__layout']['categoryNodeLabelGap'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var alphaFade = DvtNBoxStyleUtils.getFadedNodeAlpha(nbox);
  var highlightedItems = DvtNBoxDataUtils.getHighlightedItems(nbox);
  var count;
  if (highlightedItems) {
    count = node['highlightedCount'];
    if (count == 0) {
      nodeContainer.setMaxAlpha(alphaFade);
      return;
    }
  }
  else {
    count = node['nodeIndices'].length;
  }
  var side = scale * Math.sqrt(node['nodeIndices'].length) - gap;
  var width = bIndicator ? .75 * side : side;
  var countX = (rtl ? -1 : 1) * (side - width) / 2;
  var color = DvtNBoxStyleUtils.getCategoryNodeColor(nbox, node);
  var contrastColor = DvtColorUtils.getContrastingTextColor(color);
  var labelBounds = new DvtRectangle(0, 0, width - 2 * labelGap, side - 2 * labelGap);
  var label = DvtNBoxRenderer.createText(nbox.getCtx(), '' + count, DvtNBoxStyleUtils.getCategoryNodeLabelStyle(nbox), DvtOutputText.H_ALIGN_CENTER, DvtOutputText.V_ALIGN_MIDDLE);
  var fontSize = label.getOptimalFontSize(labelBounds);
  label.setFontSize(fontSize);
  if (DvtTextUtils.fitText(label, width - 2 * labelGap, side - 2 * labelGap, nodeContainer)) {
    DvtNBoxRenderer.positionText(label, countX, 0);
    label.setSolidFill(contrastColor);
  }
};

/**
 * @override
 */
DvtNBoxCategoryNodeRenderer.animateUpdate = function(animationHandler, oldNode, newNode) {
  var oldGlobalMatrix = DvtNBoxRenderer.getGlobalMatrix(oldNode);
  var newGlobalMatrix = DvtNBoxRenderer.getGlobalMatrix(newNode);
  var newMatrix = newNode.getMatrix();
  var parent = newNode.getParent();
  oldNode.setAlpha(0);
  animationHandler.getNewNBox().addChild(newNode);
  newNode.setMatrix(oldGlobalMatrix);
  var playable = new DvtAnimMoveTo(newNode.getCtx(), newNode, new DvtPoint(newGlobalMatrix.getTx(), newGlobalMatrix.getTy()), animationHandler.getAnimationDuration());
  DvtPlayable.appendOnEnd(playable, function() {parent.addChild(newNode); newNode.setMatrix(newMatrix)});
  animationHandler.add(playable, DvtNBoxDataAnimationHandler.UPDATE);
};

/**
 * @override
 */
DvtNBoxCategoryNodeRenderer.animateDelete = function(animationHandler, oldNode) {
  var animationPhase = DvtNBoxDataAnimationHandler.UPDATE;

  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();

  if (DvtNBoxCategoryNodeRenderer.isMaximizeEqual(oldNBox, newNBox) && DvtNBoxCategoryNodeRenderer.isGroupingEqual(oldNBox, newNBox)) {
    // The grouping didn't change so the nodes represented these nodes were actually inserted/unhidden
    animationPhase = DvtNBoxDataAnimationHandler.DELETE;
  }

  var scalePlayable = new DvtAnimScaleTo(newNBox.getCtx(), oldNode, new DvtPoint(.01, .01), animationHandler.getAnimationDuration());
  animationHandler.add(scalePlayable, animationPhase);

  var fadePlayable = new DvtAnimFadeOut(newNBox.getCtx(), oldNode, animationHandler.getAnimationDuration());
  animationHandler.add(fadePlayable, animationPhase);

  oldNode.setMatrix(DvtNBoxRenderer.getGlobalMatrix(oldNode));
  newNBox.getDeleteContainer().addChild(oldNode);
};

/**
 * @override
 */
DvtNBoxCategoryNodeRenderer.animateInsert = function(animationHandler, newNode) {
  var animationPhase = DvtNBoxDataAnimationHandler.UPDATE;

  var oldNBox = animationHandler.getOldNBox();
  var newNBox = animationHandler.getNewNBox();

  if (DvtNBoxCategoryNodeRenderer.isMaximizeEqual(oldNBox, newNBox) && DvtNBoxCategoryNodeRenderer.isGroupingEqual(oldNBox, newNBox)) {
    // The grouping didn't change so the nodes represented these nodes were actually inserted/unhidden
    animationPhase = DvtNBoxDataAnimationHandler.INSERT;
  }

  newNode.setScaleX(0.01);
  newNode.setScaleY(0.01);
  var scalePlayable = new DvtAnimScaleTo(newNBox.getCtx(), newNode, new DvtPoint(1, 1), animationHandler.getAnimationDuration());
  animationHandler.add(scalePlayable, animationPhase);

  newNode.setAlpha(0);
  var fadePlayable = new DvtAnimFadeIn(newNBox.getCtx(), newNode, animationHandler.getAnimationDuration());
  animationHandler.add(fadePlayable, animationPhase);
};

/**
 * Determines whether the grouping is the same between two nbox states
 *
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl] newNBox the new NBox
 *
 * @return {boolean} true if the grouping is the same, false otherwise
 */
DvtNBoxCategoryNodeRenderer.isGroupingEqual = function(oldNBox, newNBox) {
  var oldGroupBehavior = DvtNBoxDataUtils.getGroupBehavior(oldNBox);
  var newGroupBehavior = DvtNBoxDataUtils.getGroupBehavior(newNBox);

  var oldGroupBy = DvtNBoxDataUtils.getGroupBy(oldNBox);
  var newGroupBy = DvtNBoxDataUtils.getGroupBy(newNBox);

  var identical = false;
  if (oldGroupBehavior == newGroupBehavior && oldGroupBy && newGroupBy && oldGroupBy.length == newGroupBy.length) {
    identical = true;
    for (var i = 0; i < newGroupBy.length; i++) {
      if (newGroupBy[i] != oldGroupBy[i]) {
        identical = false;
        break;
      }
    }
  }
  return identical;
};

/**
 * Determines whether the maximize is the same between two nbox states
 *
 * @param {object} oldNBox an object representing the old NBox state
 * @param {DvtNBoxImpl} newNBox the new NBox
 * 
 * @return {boolean} true if the maximize is the same, false otherwise
 */
DvtNBoxCategoryNodeRenderer.isMaximizeEqual = function(oldNBox, newNBox) {
  var oldMaximizedRow = DvtNBoxDataUtils.getMaximizedRow(oldNBox);
  var oldMaximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(oldNBox);
  var newMaximizedRow = DvtNBoxDataUtils.getMaximizedRow(newNBox);
  var newMaximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(newNBox);

  return oldMaximizedRow == newMaximizedRow && oldMaximizedColumn == newMaximizedColumn;
};

/**
 * @private
 * Adds accessibility attributes to the object
 * @param {DvtNBoxImpl} nbox the nbox
 * @param {DvtNBoxCategoryNode} object the object that should be updated with accessibility attributes
 */
DvtNBoxCategoryNodeRenderer._addAccessibilityAttributes = function(nbox, object) { 
  if (!DvtAgent.deferAriaCreation()) {
    var desc = object.getAriaLabel();
    if (desc) {
      object.setAriaRole('img');
      object.setAriaProperty('label', desc);
    }
  }
};
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Renderer for DvtNBoxDrawer.
 * @class
 */
var DvtNBoxDrawerRenderer = new Object();

DvtObj.createSubclass(DvtNBoxDrawerRenderer, DvtObj, 'DvtNBoxDrawerRenderer');

/**
 * Renders the nbox drawer
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} data the data associated with the currently open group
 * @param {DvtNBoxDrawer} drawerContainer The container to render into.
 * @param {DvtRectangle} availSpace The available space.
 */
DvtNBoxDrawerRenderer.render = function(nbox, data, drawerContainer, availSpace) {
  var drawerBounds = DvtNBoxDrawerRenderer.getDrawerBounds(nbox, data, availSpace);
  data['__drawerBounds'] = drawerBounds;
  drawerContainer.setTranslate(drawerBounds.x, drawerBounds.y);

  var keyboardFocusEffect = new DvtKeyboardFocusEffect(nbox.getCtx(), drawerContainer, new DvtRectangle(-1, -1, drawerBounds.w + 2, drawerBounds.h + 2));
  DvtNBoxDataUtils.setDisplayable(nbox, data, keyboardFocusEffect, 'focusEffect');
  
  DvtNBoxDrawerRenderer._renderHeader(nbox, data, drawerContainer);
  DvtNBoxDrawerRenderer._renderBody(nbox, data, drawerContainer);
  DvtNBoxDrawerRenderer._addAccessibilityAttributes(nbox, data, drawerContainer);
};

/**
 * Renders the nbox drawer header
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} data the data associated with the currently open group
 * @param {DvtNBoxDrawer} drawerContainer The container to render into.
 */
DvtNBoxDrawerRenderer._renderHeader = function(nbox, data, drawerContainer) {
  var options = nbox.getOptions();
  var drawerButtonGap = options['__layout']['drawerButtonGap'];
  var drawerStartGap = options['__layout']['drawerStartGap'];
  var drawerLabelGap = options['__layout']['drawerLabelGap'];
  var drawerCountHGap = options['__layout']['drawerCountHorizontalGap'];
  var drawerCountVGap = options['__layout']['drawerCountVerticalGap'];
  var drawerHeaderHeight = options['__layout']['drawerHeaderHeight'];
  var indicatorGap = options['__layout']['nodeIndicatorGap'];
  var swatchSize = options['__layout']['nodeSwatchSize'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  var categoryNode = DvtNBoxDataUtils.getCategoryNode(nbox, data['id']);
  var nodeCount = categoryNode['nodeIndices'].length;

  var drawerBounds = data['__drawerBounds'];

  // Render the header shape
  var borderRadius = DvtNBoxStyleUtils.getDrawerBorderRadius(nbox);
  var borderColor = DvtNBoxStyleUtils.getDrawerBorderColor(nbox);
  var headerPath = DvtPathUtils.roundedRectangle(0, 0, drawerBounds.w, drawerHeaderHeight, borderRadius, borderRadius, 0, 0);
  var header = new DvtPath(nbox.getCtx(), headerPath);
  header.setSolidStroke(borderColor);
  var headerBackground = DvtNBoxStyleUtils.getDrawerHeaderBackground(nbox);
  DvtNBoxRenderer.setFill(header, headerBackground);
  drawerContainer.addChild(header);

  // Render the close button
  var closeEna = options['resources']['close_ena'];
  var closeOvr = options['resources']['close_ovr'];
  var closeDwn = options['resources']['close_dwn'];
  var closeWidth = closeEna['width'];
  var closeHeight = closeEna['height'];
  var closeEnaImg = new DvtImage(nbox.getCtx(), closeEna['src'], 0, 0, closeEna['width'], closeEna['height']);
  var closeOvrImg = new DvtImage(nbox.getCtx(), closeOvr['src'], 0, 0, closeOvr['width'], closeOvr['height']);
  var closeDwnImg = new DvtImage(nbox.getCtx(), closeDwn['src'], 0, 0, closeDwn['width'], closeDwn['height']);
  var closeButton = new DvtButton(nbox.getCtx(), closeEnaImg, closeOvrImg, closeDwnImg, null, null, drawerContainer.closeDrawer, drawerContainer);
  var closeButtonX = rtl ? drawerButtonGap : drawerBounds.w - drawerButtonGap - closeWidth;
  closeButton.setTranslate(closeButtonX,
                           drawerHeaderHeight / 2 - closeHeight / 2);
  drawerContainer.addChild(closeButton);


  // Render the count indicator
  var countColor = DvtNBoxStyleUtils.getCategoryNodeColor(nbox, categoryNode);
  var contrastColor = DvtColorUtils.getContrastingTextColor(countColor);
  var indicatorBackgroundColor = DvtNBoxStyleUtils.getCategoryNodeIndicatorColor(nbox, categoryNode);
  var indicatorColor = indicatorBackgroundColor ? DvtColorUtils.getContrastingTextColor(indicatorBackgroundColor) : contrastColor;
  var indicator = DvtNBoxStyleUtils.getStyledCategoryIndicator(nbox, categoryNode);
  var indicatorWidth = swatchSize;
  var scale = 1;
  if (indicator) {
    var indicatorW = indicator['width'] * indicator['scaleX'];
    var indicatorH = indicator['height'] * indicator['scaleY'];
    scale = swatchSize / indicatorH;
    indicatorWidth = scale * indicatorW;
    indicatorColor = indicator['color'] ? indicator['color'] : indicatorColor;
  }

  var countBorderRadius = DvtNBoxStyleUtils.getDrawerCountBorderRadius(nbox);

  var halign = rtl ? DvtOutputText.H_ALIGN_RIGHT : DvtOutputText.H_ALIGN_LEFT;
  var countLabel = DvtNBoxRenderer.createText(nbox.getCtx(), '' + nodeCount, DvtNBoxStyleUtils.getDrawerCountLabelStyle(nbox), halign, DvtOutputText.V_ALIGN_MIDDLE);
  var countLabelDims = countLabel.measureDimensions();
  var countLabelWidth = countLabelDims.w;
  var countLabelHeight = countLabelDims.h;
  var countIndicatorHeight = countLabelHeight + 2 * drawerCountVGap;
  var countIndicatorSectionWidth = indicator ? indicatorWidth + 2 * indicatorGap : (indicatorBackgroundColor ? swatchSize : 0);
  var countLabelSectionWidth = countLabelWidth + 2 * drawerCountHGap;
  var countIndicatorWidth = countIndicatorSectionWidth + countLabelSectionWidth;

  var countIndicatorPath = DvtPathUtils.roundedRectangle(0, 0, countIndicatorWidth, countIndicatorHeight, countBorderRadius, countBorderRadius, countBorderRadius, countBorderRadius);
  var countIndicatorShape = new DvtPath(nbox.getCtx(), countIndicatorPath);
  countIndicatorShape.setSolidFill(countColor);
  drawerContainer.addChild(countIndicatorShape);

  var indicatorX = rtl ? countLabelSectionWidth : 0;
  if (countIndicatorSectionWidth > 0) {
    if (indicatorBackgroundColor) {
      var indicatorSectionPath = DvtPathUtils.roundedRectangle(indicatorX,
                                                               0,
                                                               countIndicatorSectionWidth,
                                                               countIndicatorHeight,
                                                               rtl ? 0 : countBorderRadius,
                                                               rtl ? countBorderRadius : 0,
                                                               rtl ? countBorderRadius : 0,
                                                               rtl ? 0 : countBorderRadius);
      var indicatorSection = new DvtPath(nbox.getCtx(), indicatorSectionPath);
      indicatorSection.setSolidFill(indicatorBackgroundColor);
      countIndicatorShape.addChild(indicatorSection);
    }
    if (indicator) {
      var indicatorMarker = new DvtMarker(nbox.getCtx(),
                                          indicator['shape'],
                                          DvtCSSStyle.SKIN_ALTA,
                                          indicatorX + (countIndicatorSectionWidth - scale * indicator['width'] * indicator['scaleX']) / 2,
                                          (countIndicatorHeight - scale * indicator['height'] * indicator['scaleY']) / 2,
                                          indicator['width'],
                                          indicator['height'],
                                          null,
                                          scale * indicator['scaleX'],
                                          scale * indicator['scaleY']);
      if (indicator['fillPattern'] != 'none') {
        indicatorMarker.setFill(new DvtPatternFill(indicator['fillPattern'], indicatorColor, indicatorBackgroundColor ? indicatorBackgroundColor : countColor));
      }
      else {
        indicatorMarker.setSolidFill(indicatorColor);
      }
      countIndicatorShape.addChild(indicatorMarker);
    }
  }

  countIndicatorShape.addChild(countLabel);
  countLabel.setSolidFill(contrastColor);
  var countLabelX = rtl ? countLabelSectionWidth - drawerCountHGap : countIndicatorSectionWidth + drawerCountHGap;
  DvtNBoxRenderer.positionText(countLabel, countLabelX, countIndicatorHeight / 2);

  // Render the category label
  var categoryText = DvtNBoxDataUtils.getDisplayable(nbox, categoryNode).getCategoryLabel();
  var categoryLabel = DvtNBoxRenderer.createText(nbox.getCtx(), categoryText, DvtNBoxStyleUtils.getDrawerLabelStyle(nbox), halign, DvtOutputText.V_ALIGN_MIDDLE);
  var labelOffset = 0;
  if (DvtTextUtils.fitText(categoryLabel, drawerBounds.w - drawerStartGap - drawerLabelGap - countIndicatorWidth - drawerButtonGap - closeWidth, drawerHeaderHeight, drawerContainer)) {
    var labelX = rtl ? drawerBounds.w - drawerStartGap : drawerStartGap;
    DvtNBoxRenderer.positionText(categoryLabel, labelX, drawerHeaderHeight / 2);
    var categoryLabelDims = categoryLabel.measureDimensions();
    labelOffset = categoryLabelDims.w + drawerLabelGap;
  }

  // Position the count indicator
  var countIndicatorX = rtl ? drawerBounds.w - drawerStartGap - countIndicatorWidth - labelOffset : drawerStartGap + labelOffset;
  countIndicatorShape.setTranslate(countIndicatorX, (drawerHeaderHeight - countIndicatorHeight) / 2);

};

/**
 * Renders the nbox drawer body
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} data the data associated with the currently open group
 * @param {DvtNBoxDrawer} drawerContainer The container to render into.
 */
DvtNBoxDrawerRenderer._renderBody = function(nbox, data, drawerContainer) {
  var options = nbox.getOptions();
  var gridGap = options['__layout']['gridGap'];
  var drawerHeaderHeight = options['__layout']['drawerHeaderHeight'];
  var drawerBounds = data['__drawerBounds'];

  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());

  // Render the body shape
  var borderRadius = DvtNBoxStyleUtils.getDrawerBorderRadius(nbox);
  var borderColor = DvtNBoxStyleUtils.getDrawerBorderColor(nbox);
  var bodyPath = DvtPathUtils.roundedRectangle(0, drawerHeaderHeight, drawerBounds.w, drawerBounds.h - drawerHeaderHeight, 0, 0, borderRadius, borderRadius);
  var body = new DvtPath(nbox.getCtx(), bodyPath);
  DvtNBoxRenderer.setFill(body, DvtNBoxStyleUtils.getDrawerBackground(nbox));
  body.setSolidStroke(borderColor);
  drawerContainer.addChild(body);
  DvtNBoxDataUtils.setDisplayable(nbox, data, body, 'background');
  
  // Render the nodes  
  data['__childArea'] = new DvtRectangle(0, drawerHeaderHeight, drawerBounds.w, drawerBounds.h - drawerHeaderHeight);
  var childContainer = new DvtContainer(nbox.getCtx());
  drawerContainer.addChild(childContainer);
  drawerContainer.setChildContainer(childContainer);

  var nodeLayout = DvtNBoxNodeRenderer.calculateNodeDrawerLayout(nbox, data);
  var hGridSize = nodeLayout['indicatorSectionWidth'] + nodeLayout['iconSectionWidth'] + nodeLayout['labelSectionWidth'] + gridGap;
  var vGridSize = nodeLayout['nodeHeight'] + gridGap;

  var gridPos = 0;

  // If no nodes are highlighted, make a single pass through the nodes for rendering
  // If some nodes are highlighted, make two passes, first rendering the highlighted nodes, then the unhighlighted nodes
  var renderPasses = ['normal'];
  var alphaFade = DvtNBoxStyleUtils.getFadedNodeAlpha(nbox);
  var highlightedItems = DvtNBoxDataUtils.getHighlightedItems(nbox);
  var highlightedMap = {};
  if (highlightedItems) {
    for (var i = 0; i < highlightedItems.length; i++) {
      highlightedMap[highlightedItems[i]['id']] = true;
    }
    renderPasses = ['highlighted', 'unhighlighted'];
  }
  var categoryNode = DvtNBoxDataUtils.getCategoryNode(nbox, data['id']);
  var nodeCount = categoryNode['nodeIndices'].length;
  for (var p = 0; p < renderPasses.length; p++) {
    for (var n = 0; n < nodeCount; n++) {
      var node = DvtNBoxDataUtils.getNode(nbox, categoryNode['nodeIndices'][n]);
      if (renderPasses[p] == 'normal' ||
          (renderPasses[p] == 'highlighted' && highlightedMap[node['id']]) ||
          (renderPasses[p] == 'unhighlighted' && !highlightedMap[node['id']])) {
        var nodeContainer = DvtNBoxNode.newInstance(nbox, node);
        var gridXOrigin = data['__childArea'].x + (data['__childArea'].w - nodeLayout['drawerLayout']['columns'] * hGridSize) / 2;
        var gridYOrigin = data['__childArea'].y;
        var gridColumn = (gridPos % nodeLayout['drawerLayout']['columns']);
        if (rtl) {
          gridColumn = nodeLayout['drawerLayout']['columns'] - gridColumn - 1;
        }
        var gridRow = Math.floor((gridPos / nodeLayout['drawerLayout']['columns']));
        nodeContainer.setTranslate(gridXOrigin + gridGap / 2 + hGridSize * gridColumn,
                                    gridYOrigin + gridGap / 2 + vGridSize * gridRow);
        gridPos++;
        nodeContainer.render(DvtNBoxDataUtils.getDisplayable(nbox, data).getChildContainer(), nodeLayout);
        if (renderPasses[p] == 'unhighlighted') {
          nodeContainer.setMaxAlpha(alphaFade);
        }
      }
    }
  }
};

/**
 * Gets the drawer bounds
 *
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} data the data associated with the currently open group
 * @param {DvtRectangle} availSpace The available space.
 *
 * @return {DvtRectangle} the drawer bounds
 */
DvtNBoxDrawerRenderer.getDrawerBounds = function(nbox, data, availSpace) {
  var options = nbox.getOptions();
  var gridGap = options['__layout']['gridGap'];
  var cellLayout = options['__layout']['__cellLayout'];
  var drawerBounds = new DvtRectangle(availSpace.x + gridGap / 2, availSpace.y + gridGap / 2, availSpace.w - gridGap, availSpace.h - gridGap);
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(nbox);
  if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
    var cellIndex = parseInt(data['id'].substring(0, data['id'].indexOf(':')));
    if (DvtNBoxDataUtils.isCellMaximized(nbox, cellIndex)) {
      var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
      var r = DvtNBoxDataUtils.getRowIndex(nbox, cell['row']);
      var c = DvtNBoxDataUtils.getColumnIndex(nbox, cell['column']);
      var cellDims = DvtNBoxCellRenderer.getCellDimensions(nbox, r, c, cellLayout, availSpace);
      drawerBounds = new DvtRectangle(cellDims.x + gridGap / 2, cellDims.y + gridGap / 2 + cellLayout['headerSize'], cellDims.w - gridGap, cellDims.h - cellLayout['headerSize'] - gridGap);
    }
  }
  return drawerBounds;
};

/**
 * Enables scrolling on the drawer
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} data the drawer data
 */
DvtNBoxDrawerRenderer.enableScrolling = function(nbox, data) {
  var childArea = data['__childArea'];
  // TODO: Fix up this size fudging!
  var scrollContainer = new DvtScrollableContainer(nbox.getCtx(), childArea.w - 10, childArea.h, childArea.w, childArea.h, 0);
  scrollContainer.setSkinName(nbox.getOptions()['skin']);
  scrollContainer.setStyleMap(DvtNBoxStyleUtils.getScrollbarStyleMap(nbox));
  scrollContainer.setTranslate(childArea.x, childArea.y);
  var drawer = DvtNBoxDataUtils.getDisplayable(nbox, data);
  drawer.removeChild(drawer.getChildContainer());
  drawer.addChild(scrollContainer);
  drawer.setChildContainer(scrollContainer);
  data['__childArea'] = new DvtRectangle(0, 0, childArea.w - scrollContainer.getScrollbarWidth(), childArea.h);
};

/**
 * @override
 */
DvtNBoxDrawerRenderer.animateUpdate = function(animationHandler, oldDrawer, newDrawer) {
  // TODO
  console.log('********************* DvtNBoxDrawerRenderer.animateUpdate *********************');
};

/**
 * @override
 */
DvtNBoxDrawerRenderer.animateDelete = function(animationHandler, oldDrawer) {
  var animationPhase = DvtNBoxDataAnimationHandler.UPDATE;

  var newNBox = animationHandler.getNewNBox();
  var drawerBounds = oldDrawer.getData()['__drawerBounds'];
  var id = oldDrawer.getData()['id'];
  var group = DvtNBoxDataUtils.getCategoryNode(newNBox, id);
  if (group) {
    var sideLength = DvtNBoxCategoryNodeRenderer.getSideLength(group);
    var scaleX = sideLength / drawerBounds.w;
    var scaleY = sideLength / drawerBounds.h;
    var groupNode = DvtNBoxDataUtils.getDisplayable(newNBox, group);
    if (groupNode) {
      var centerMatrix = DvtNBoxRenderer.getGlobalMatrix(groupNode);
      var finalMatrix = new DvtMatrix(scaleX, 0, 0, scaleY, centerMatrix.getTx() - sideLength / 2, centerMatrix.getTy() - sideLength / 2);
      var playable = new DvtCustomAnimation(newNBox.getCtx(), oldDrawer, animationHandler.getAnimationDuration());
      playable.getAnimator().addProp(DvtAnimator.TYPE_MATRIX, oldDrawer, oldDrawer.getMatrix, oldDrawer.setMatrix, finalMatrix);
      animationHandler.add(playable, animationPhase);
    }
  }
  newNBox.getDeleteContainer().addChild(oldDrawer);
  var fadePlayable = new DvtAnimFadeOut(newNBox.getCtx(), oldDrawer, animationHandler.getAnimationDuration());
  animationHandler.add(fadePlayable, animationPhase);
};

/**
 * @override
 */
DvtNBoxDrawerRenderer.animateInsert = function(animationHandler, newDrawer) {
  var animationPhase = DvtNBoxDataAnimationHandler.UPDATE;

  var newNBox = animationHandler.getNewNBox();
  var drawerBounds = newDrawer.getData()['__drawerBounds'];
  var id = newDrawer.getData()['id'];
  var group = DvtNBoxDataUtils.getCategoryNode(newNBox, id);
  if (group) {
    var sideLength = DvtNBoxCategoryNodeRenderer.getSideLength(group);
    var scaleX = sideLength / drawerBounds.w;
    var scaleY = sideLength / drawerBounds.h;
    var groupNode = DvtNBoxDataUtils.getDisplayable(newNBox, group);
    if (groupNode) {
      var centerMatrix = DvtNBoxRenderer.getGlobalMatrix(groupNode);
      var initMatrix = new DvtMatrix(scaleX, 0, 0, scaleY, centerMatrix.getTx() - sideLength / 2, centerMatrix.getTy() - sideLength / 2);
      var playable = new DvtCustomAnimation(newNBox.getCtx(), newDrawer, animationHandler.getAnimationDuration());
      playable.getAnimator().addProp(DvtAnimator.TYPE_MATRIX, newDrawer, newDrawer.getMatrix, newDrawer.setMatrix, newDrawer.getMatrix());
      var parent = newDrawer.getParent();
      newNBox.addChild(newDrawer);
      DvtPlayable.appendOnEnd(playable, function() {parent.addChild(newDrawer)});
      newDrawer.setMatrix(initMatrix);
      animationHandler.add(playable, animationPhase);
    }
  }
  newDrawer.setAlpha(0);
  var fadePlayable = new DvtAnimFadeIn(newNBox.getCtx(), newDrawer, animationHandler.getAnimationDuration());
  animationHandler.add(fadePlayable, animationPhase);
};

/**
 * @private
 * Adds accessibility attributes to the object
 * @param {DvtNBoxImpl} nbox The nbox component
 * @param {object} data the data associated with the currently open group
 * @param {DvtNBoxDrawer} drawerContainer the object that should be updated with accessibility attributes
 */
DvtNBoxDrawerRenderer._addAccessibilityAttributes = function(nbox, data, drawerContainer) {
  if (!DvtAgent.deferAriaCreation()) {
    var desc = drawerContainer.getAriaLabel();
    if (desc) {
      var object = DvtAgent.isTouchDevice() ? DvtNBoxDataUtils.getDisplayable(nbox, data, 'background') : drawerContainer;  
      object.setAriaRole('img');
      object.setAriaProperty('label', desc);
    }
  }
};
//
// $Header: dsstools/modules/dvt-shared-js/src/META-INF/bi/sharedJS/toolkit/adfinternal/nBox/utils/DvtNBoxDataUtils.js /st_jdevadf_pt-12.1.3maf/1 2014/05/19 08:22:23 jchalupa Exp $
//
// DvtNBoxDataUtils.js
//
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.
//
//    NAME
//     DvtNBoxDataUtils.js - <one-line expansion of the name>
//
//    DESCRIPTION
//     <short description of component this file declares/defines>
//
//    NOTES
//     <other useful comments, qualifications, etc. >
//
//    MODIFIED  (MM/DD/YY)
//    jramanat   10/10/13 - Created
//
/**
 * Data related utility functions for DvtNBoxImpl.
 * @class
 */
var DvtNBoxDataUtils = new Object();

DvtObj.createSubclass(DvtNBoxDataUtils, DvtObj, 'DvtNBoxDataUtils');

/**
 * Processes the data object.  Generates and sorts cells if not specified
 * @param {DvtNBoxImpl} nbox the nbox component
 */
DvtNBoxDataUtils.processDataObject = function(nbox) {
  var options = nbox.getOptions();
  var cells = options[DvtNBoxConstants.CELLS];
  var cellMap = {};
  if (cells) {
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var row = cell['row'];
      if (!cellMap[row]) {
        cellMap[row] = {};
      }
      var column = cell['column'];
      cellMap[row][column] = cell;
    }
  }
  var newCells = [];
  var rowMap = {};
  var columnMap = {};
  // Process rows
  for (var r = 0; r < DvtNBoxDataUtils.getRowCount(nbox); r++) {
    var rowObj = DvtNBoxDataUtils.getRow(nbox, r);
    rowMap[rowObj['value']] = r;
  }
  options['__rowMap'] = rowMap;

  // Process columns
  for (var c = 0; c < DvtNBoxDataUtils.getColumnCount(nbox); c++) {
    var columnObj = DvtNBoxDataUtils.getColumn(nbox, c);
    columnMap[columnObj['value']] = c;
  }
  options['__columnMap'] = columnMap;

  // Process cells
  for (var r = 0; r < DvtNBoxDataUtils.getRowCount(nbox); r++) {
    var rowObj = DvtNBoxDataUtils.getRow(nbox, r);
    var row = rowObj['value'];
    for (var c = 0; c < DvtNBoxDataUtils.getColumnCount(nbox); c++) {
      var columnObj = DvtNBoxDataUtils.getColumn(nbox, c);
      var column = columnObj['value'];
      if (cellMap[row] && cellMap[row][column]) {
        var cellObj = cellMap[row][column];
        newCells.push(cellObj);
      }
      else {
        newCells.push({'row': row, 'column': column});
      }
    }
  }
  options[DvtNBoxConstants.CELLS] = newCells;
  var nodeMap = {};
  for (var n = 0; n < DvtNBoxDataUtils.getNodeCount(nbox); n++) {
    var nodeObj = DvtNBoxDataUtils.getNode(nbox, n);
    nodeMap[nodeObj['id']] = n;
  }
  options['__nodeMap'] = nodeMap;
  // Disable maximize if we're grouping across cells
  if (DvtNBoxDataUtils.getGroupBy(nbox) && DvtNBoxDataUtils.getGroupBehavior(nbox) == DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS) {
    options[DvtNBoxConstants.MAXIMIZED_ROW] = null;
    DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.MAXIMIZED_ROW, null);
    options[DvtNBoxConstants.MAXIMIZED_COLUMN] = null;
    DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.MAXIMIZED_COLUMN, null);
  }
  // Disable maximize if either row or column is invalid
  if ((options[DvtNBoxConstants.MAXIMIZED_ROW] && isNaN(rowMap[options[DvtNBoxConstants.MAXIMIZED_ROW]])) ||
      (options[DvtNBoxConstants.MAXIMIZED_COLUMN] && isNaN(columnMap[options[DvtNBoxConstants.MAXIMIZED_COLUMN]]))) {
    options[DvtNBoxConstants.MAXIMIZED_ROW] = null;
    DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.MAXIMIZED_ROW, null);
    options[DvtNBoxConstants.MAXIMIZED_COLUMN] = null;
    DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.MAXIMIZED_COLUMN, null);
  }
  // Process legend
  if (options[DvtNBoxConstants.LEGEND_DISPLAY] == 'auto') {
    var legendPrecedence = ['color',
                            'iconFill',
                            'iconShape',
                            'iconPattern',
                            'indicatorColor',
                            'indicatorFill',
                            'indicatorShape',
                            'indicatorPattern'];
    var attributeGroups = options[DvtNBoxConstants.ATTRIBUTE_GROUPS];
    if (attributeGroups) {
      attributeGroups = attributeGroups.slice(0);
      var sortFunc = function(a, b) {
        return DvtArrayUtils.getIndex(legendPrecedence, a['type']) - DvtArrayUtils.getIndex(legendPrecedence, b['type']);
      };
      attributeGroups.sort(sortFunc);
      var hiddenCategories = options[DvtNBoxConstants.HIDDEN_CATEGORIES];
      if (!hiddenCategories) {
        hiddenCategories = [];
      }
      // Remove any hidden categories that correspond to unknown attributeGroups
      for (var i = hiddenCategories.length - 1; i >= 0; i--) {
        var categoryGroup = hiddenCategories[i].substring(0, hiddenCategories[i].indexOf(':'));
        var found = false;
        for (var j = 0; j < attributeGroups.length; j++) {
          if (attributeGroups[j]['id'] == categoryGroup) {
            found = true;
            break;
          }
        }
        if (!found) {
          hiddenCategories.splice(i, 1);
        }
      }
      options[DvtNBoxConstants.HIDDEN_CATEGORIES] = hiddenCategories.length == 0 ? null : hiddenCategories;
      DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.HIDDEN_CATEGORIES, options[DvtNBoxConstants.HIDDEN_CATEGORIES]);

      // Generate the legend
      var legend = {};
      legend['hideAndShowBehavior'] = 'on';
      legend['textStyle'] = options['styleDefaults']['legend']['itemStyle'];
      legend['layout'] = {'markerSize': 16, 'rowGap': 6}; // TODO switch to public attrs once they're available
      var sections = [];
      legend['sections'] = sections;
      for (var i = 0; i < attributeGroups.length; i++) {
        var attributeGroup = attributeGroups[i];
        var section = {};
        section['id'] = attributeGroup['id'];
        section['title'] = attributeGroup['label'];
        section['titleStyle'] = options['styleDefaults']['legend']['sectionStyle'];
        var groups = attributeGroup['groups'];
        var items = [];
        section['items'] = items;
        for (var j = 0; j < groups.length; j++) {
          var group = groups[j];
          var item = {};
          item['id'] = attributeGroup['id'] + ':' + group['id'];
          if (DvtArrayUtils.getIndex(hiddenCategories, item['id']) != -1) {
            item['categoryVisibility'] = 'hidden';
          }
          item['text'] = group['label'];
          if (group['color']) {
            item['color'] = group['color'];
          }
          if (group['indicatorColor']) {
            item['color'] = group['indicatorColor'];
          }
          if (!item['color']) {
            item['color'] = options['styleDefaults']['legend']['markerColor'];
          }
          if (group['shape']) {
            item['markerShape'] = group['shape'];
          }
          if (group['pattern']) {
            item['pattern'] = group['pattern'];
          }
          items.push(item);
        }
        sections.push(section);
      }
      options['__legend'] = legend;
    }
    else {
      // No attribute groups => no hidden categories
      options[DvtNBoxConstants.HIDDEN_CATEGORIES] = null;
      DvtNBoxDataUtils.fireSetPropertyEvent(nbox, DvtNBoxConstants.HIDDEN_CATEGORIES, null);
    }
  }
};

/**
 * Gets the number of columns in the nbox
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {number} the number of columns in the nbox
 */
DvtNBoxDataUtils.getColumnCount = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.COLUMNS].length;
};

/**
 * Gets the number of rows in the nbox
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {number} the number of rows in the nbox
 */
DvtNBoxDataUtils.getRowCount = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.ROWS].length;
};

/**
 * Gets the data for the specified column index
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} columnIndex the column index
 * @return {object} the data for the specified column index
 */
DvtNBoxDataUtils.getColumn = function(nbox, columnIndex) {
  return nbox.getOptions()[DvtNBoxConstants.COLUMNS][columnIndex];
};

/**
 * Gets the data for the specified row index
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} rowIndex the row index
 * @return {object} the data for the specified row index
 */
DvtNBoxDataUtils.getRow = function(nbox, rowIndex) {
  return nbox.getOptions()[DvtNBoxConstants.ROWS][rowIndex];
};

/**
 * Gets the value of the maximized row
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {string} the value of the maximized row
 */
DvtNBoxDataUtils.getMaximizedRow = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.MAXIMIZED_ROW];
};

/**
 * Gets the value of the maximized column
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {string} the value of the maximized column
 */
DvtNBoxDataUtils.getMaximizedColumn = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.MAXIMIZED_COLUMN];
};

/**
 * Gets the index for the specified row value
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {string} row the row value
 * @return {number} the row index
 */
DvtNBoxDataUtils.getRowIndex = function(nbox, row) {
  return nbox.getOptions()['__rowMap'][row];
};

/**
 * Gets the index for the specified column value
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {string} column the column value
 * @return {number} the column index
 */
DvtNBoxDataUtils.getColumnIndex = function(nbox, column) {
  return nbox.getOptions()['__columnMap'][column];
};

/**
 * Gets the data for the specified cell index.  Note that after DvtNBoxDataUtils.processDataObject
 * has been called, cells are sorted in row-major order
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} cellIndex the cell index
 * @return {object} the data for the specified cell index
 */
DvtNBoxDataUtils.getCell = function(nbox, cellIndex) {
  return nbox.getOptions()[DvtNBoxConstants.CELLS][cellIndex];
};

/**
 * Gets the number of nodes in the nbox
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {number} the number of nodes in the nbox
 */
DvtNBoxDataUtils.getNodeCount = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.NODES] ? nbox.getOptions()[DvtNBoxConstants.NODES].length : 0;
};

/**
 * Gets the data for the specified node index
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} nodeIndex the node index
 * @return {object} the data for the specified node index
 */
DvtNBoxDataUtils.getNode = function(nbox, nodeIndex) {
  return nbox.getOptions()[DvtNBoxConstants.NODES][nodeIndex];
};

/**
 * Gets the index for the specified node id
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {string} id the node id
 * @return {number} the node index
 */
DvtNBoxDataUtils.getNodeIndex = function(nbox, id) {
  return nbox.getOptions()['__nodeMap'][id];
};

/**
 * Gets the cell index for the specified node
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {number} the cell index for the specified node
 */
DvtNBoxDataUtils.getCellIndex = function(nbox, node) {
  var nodeRowIndex = DvtNBoxDataUtils.getRowIndex(nbox, node['row']);
  var nodeColumnIndex = DvtNBoxDataUtils.getColumnIndex(nbox, node['column']);
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  return nodeColumnIndex + nodeRowIndex * columnCount;
};

/**
 * Gets the icon for the specified node
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {object} the icon data for the specified node
 */
DvtNBoxDataUtils.getIcon = function(nbox, node) {
  if (node['icon']) {
    return DvtNBoxStyleUtils.getStyledIcon(nbox, node, node['icon']);
  }
  return null;
};

/**
 * Gets the indicator for the specified node
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {object} the indicator data for the specified node
 */
DvtNBoxDataUtils.getIndicator = function(nbox, node) {
  if (node['indicator']) {
    return DvtNBoxStyleUtils.getStyledIndicator(nbox, node, node['indicator']);
  }
  return null;
};

/**
 * Gets the selected items for the nbox
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {array} the list of selected items
 */
DvtNBoxDataUtils.getSelectedItems = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.SELECTED_ITEMS];
};

/**
 * Sets the selected items for the nbox
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {array} selectedItems the list of selected items
 */
DvtNBoxDataUtils.setSelectedItems = function(nbox, selectedItems) {
  nbox.getOptions()[DvtNBoxConstants.SELECTED_ITEMS] = selectedItems;
};

/**
 * Gets the highlighted items for the nbox
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {array} the list of highlighted items
 */
DvtNBoxDataUtils.getHighlightedItems = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.HIGHLIGHTED_ITEMS];
};

/**
 * Gets the attribute group of the specified type corresponding to the given node
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {DvtNBoxNode} node the nbox node
 * @param {string} type the attribute group type
 * @return {object} the corresponding attribute group object
 */
DvtNBoxDataUtils.getAttributeGroup = function(nbox, node, type) {
  var categories = node['categories'];
  var attributeGroups = nbox.getOptions()[DvtNBoxConstants.ATTRIBUTE_GROUPS];
  if (categories && attributeGroups) {
    for (var i = 0; i < categories.length; i++) {
      var category = categories[i].split(':'); // category[0] is the attrGroup id, category[1] is the group value
      for (var j = 0; j < attributeGroups.length; j++) {
        var attributeGroup = attributeGroups[j];
        if (category[0] == attributeGroup['id'] && type == attributeGroup['type']) {
          var groups = attributeGroup['groups'];
          for (var k = 0; k < groups.length; k++) {
            var group = groups[k];
            if (group['id'] == category[1]) {
              return group;
            }
          }
          return null;
        }
      }
    }
  }
  return null;
};

/**
 * Gets the attribute groups currently being grouped by
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {array} An array containing the ids of the attribute groups currently being grouped by
 */
DvtNBoxDataUtils.getGroupBy = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.GROUP_BY];
};

/**
 * Gets the grouping behavior.  Valid values are DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL and
 * DvtNBoxConstants.GROUP_BEHAVIOR_ACROSS_CELLS
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {string} the grouping behavior
 */
DvtNBoxDataUtils.getGroupBehavior = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.GROUP_BEHAVIOR];
};

/**
 * Gets the group id for the specified node based on the current groupBy
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {string} the group id for the specified node based on the current groupBy
 */
DvtNBoxDataUtils.getNodeGroupId = function(nbox, node) {
  var groupId = '';
  var groupBy = DvtNBoxDataUtils.getGroupBy(nbox);
  var categories = node['categories'];
  for (var i = 0; i < groupBy.length; i++) {
    for (var j = 0; j < categories.length; j++) {
      var category = categories[j].split(':'); // category[0] is the attrGroup id, category[1] is the group value
      if (category[0] == groupBy[i]) {
        groupId += (categories[j] + ';');
        break;
      }
    }
  }
  return groupId.slice(0, -1); // Remove trailing semicolon
};

/**
 * Gets the x percentage value for the specified node to be used as part of the position average when grouping across
 * cells
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {number} the x percentage value
 */
DvtNBoxDataUtils.getXPercentage = function(nbox, node) {
  if (!isNaN(node['xPercentage'])) {
    return node['xPercentage'];
  }
  var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
  var columnIndex = DvtNBoxDataUtils.getColumnIndex(nbox, node['column']);
  return (columnIndex + 0.5) / columnCount;
};

/**
 * Gets the y percentage value for the specified node to be used as part of the position average when grouping across
 * cells
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data
 * @return {number} the y percentage value
 */
DvtNBoxDataUtils.getYPercentage = function(nbox, node) {
  if (!isNaN(node['yPercentage'])) {
    return node['yPercentage'];
  }
  var rowCount = DvtNBoxDataUtils.getRowCount(nbox);
  var rowIndex = DvtNBoxDataUtils.getRowIndex(nbox, node['row']);
  return (rowIndex + 0.5) / rowCount;
};

/**
 * Gets the other threshold value for the nbox.  Represents a percentage of the collection size (0-1)
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {number} the other threshold value
 */
DvtNBoxDataUtils.getOtherThreshold = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.OTHER_THRESHOLD];
};

/**
 * Gets the color for the aggregate group node representing any groups that fall below the other threshold
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {string} the other threshold color
 */
DvtNBoxDataUtils.getOtherColor = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.OTHER_COLOR];
};

/**
 * Gets the data associated with the currently open group
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {object} the data associated with the currently open group
 */
DvtNBoxDataUtils.getDrawer = function(nbox) {
  return nbox.getOptions()[DvtNBoxConstants.DRAWER];
};

/**
 * Returns the category node data for the specified id
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {string} id the id of the category node
 * @return {object} the category node data
 */
DvtNBoxDataUtils.getCategoryNode = function(nbox, id) {
  var groupBehavior = DvtNBoxDataUtils.getGroupBehavior(nbox);
  var groups = nbox.getOptions()['__groups'];
  var groupId = id;
  if (groupBehavior == DvtNBoxConstants.GROUP_BEHAVIOR_WITHIN_CELL) {
    var cell = id.substring(0, id.indexOf(':'));
    groupId = id.substring(id.indexOf(':') + 1);
    groups = groups[cell];
  }
  return groups ? groups[groupId] : null;
};

/**
 * Sets the rendered displayable on the corresponding data object
 *
 * @param {DvtNBoxImpl} nbox the NBox component
 * @param {object} dataObject the data object
 * @param {DvtDisplayable} displayable the rendered displayable
 * @param {string} key an optional key (if storing more than one displayable)
 */
DvtNBoxDataUtils.setDisplayable = function(nbox, dataObject, displayable, key) {
  var displayables = nbox.getDisplayables();
  var fullKey = key ? '__displayable:' + key : '__displayable';
  if (dataObject[fullKey]) {
    displayables[dataObject[fullKey]] = displayable;
  }
  else {
    dataObject[fullKey] = displayables.length;  
    displayables.push(displayable);
  }
}

/**
 * Gets the rendered displayable from the corresponding data object
 *
 * @param {DvtNBoxImpl} nbox the NBox component
 * @param {object} dataObject the data object
 * @param {string} key an optional key (if storing more than one displayable)
 * @return {DvtDisplayable} the rendered displayable
 */
DvtNBoxDataUtils.getDisplayable = function(nbox, dataObject, key) {
  var fullKey = key ? '__displayable:' + key : '__displayable';
  var index = dataObject[fullKey];
  var displayables = nbox.getDisplayables();
  return index == null ? null : displayables[index];
};

/**
 * Returns whether or not the specified cell is minimized
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} cellIndex the index of the specified cell
 * @return {boolean} true if the cell is minimized, false otherwise
 */
DvtNBoxDataUtils.isCellMinimized = function(nbox, cellIndex) {
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  if (!maximizedRow && !maximizedColumn) {
    // if nothing is maximized, nothing is minimized
    return false;
  }
  var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
  var cellRow = cell['row'];
  var cellColumn = cell['column'];
  if (maximizedRow && maximizedColumn) {
    // if a single cell is maximized, all other cells are minimized
    return maximizedRow != cellRow || maximizedColumn != cellColumn;
  }
  // if a single row OR column is maximized, all cells outside of that row/column are minimized
  return maximizedRow != cellRow && maximizedColumn != cellColumn;
};

/**
 * Returns whether or not the specified cell is maximized
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {number} cellIndex the index of the specified cell
 * @return {boolean} true if the cell is maximized, false otherwise
 */
DvtNBoxDataUtils.isCellMaximized = function(nbox, cellIndex) {
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
  var cellRow = cell['row'];
  var cellColumn = cell['column'];
  return (maximizedRow == cellRow && maximizedColumn == cellColumn);
};

/**
 * Returns the category label for the specified category node and attribute group
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the category node data
 * @param {string} group the attribute group id
 *
 * @return {string} the category label
 */
DvtNBoxDataUtils.getCategoryLabel = function(nbox, node, group) {
  var attributeGroups = nbox.getOptions()[DvtNBoxConstants.ATTRIBUTE_GROUPS];
  var groups;
  var params = [];
  for (var i = 0; i < attributeGroups.length; i++) {
    var attributeGroup = attributeGroups[i];
    if (group == attributeGroup['id']) {
      params.push(attributeGroup['label']);
      groups = attributeGroup['groups'];
      break;
    }
  }
  var categories = node['categories'];
  for (var i = 0; i < categories.length; i++) {
    var category = categories[i].split(':');
    if (category[0] == group) {
      for (var j = 0; j < groups.length; j++) {
        var group = groups[j];
        if (category[1] == group['id']) {
          params.push(group['label']);
          break;
        }
      }
      break;
    }
  }
  if (params[1]) {
    return params[0] ? nbox.getBundle().getTranslatedString('COLON_SEP_LIST', params) : params[1];
  }
  return null;
};

/**
 * Returns the legend data object
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {object} the legend data object
 */
DvtNBoxDataUtils.getLegend = function(nbox) {
  return nbox.getOptions()['__legend'];
};

/**
 * Determines whether the specified node has been hidden (e.g. via legend filtering)
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} node the node data object
 * @return {boolean} true if the node has been hidden, false otherwise
 */
DvtNBoxDataUtils.isNodeHidden = function(nbox, node) {
  var hiddenCategories = nbox.getOptions()[DvtNBoxConstants.HIDDEN_CATEGORIES];
  if (hiddenCategories) {
    var categories = node['categories'];
    if (categories) {
      for (var i = 0; i < categories.length; i++) {
        if (DvtArrayUtils.getIndex(hiddenCategories, categories[i]) != -1) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Fires a DvtSetPropertyEvent to the nbox
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {string} key the property name
 * @param {object} value the property value
 */
DvtNBoxDataUtils.fireSetPropertyEvent = function(nbox, key, value) {
  var event = new DvtSetPropertyEvent();
  event.addParam(key, value);
  nbox.processEvent(event);
};

/**
 * Gets a cell index for the maximized cell
 * 
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {number|null} the index for the maximized cell or null if such cell does not exist
 */
DvtNBoxDataUtils.getMaximizedCellIndex = function(nbox) {
  var maximizedCellIndex = null;
  var maximizedRow = DvtNBoxDataUtils.getMaximizedRow(nbox);
  var maximizedColumn = DvtNBoxDataUtils.getMaximizedColumn(nbox);
  if (maximizedRow && maximizedColumn) {
    var columnCount = DvtNBoxDataUtils.getColumnCount(nbox);
    maximizedCellIndex = DvtNBoxDataUtils.getColumnIndex(nbox, maximizedColumn) + columnCount * DvtNBoxDataUtils.getRowIndex(nbox, maximizedRow);
  }
  return maximizedCellIndex;
};

/**
 * Check whether a specified drawer is selected - all nodes that belong to the drawer are selected
 * 
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {DvtNBoxCategoryNode} categoryNode the category node that represents the drawer
 * @return {boolen} true if the drawer is selected
 */
DvtNBoxDataUtils.isDrawerSelected = function(nbox, categoryNode) {
  var selected = false;
  var selectedItems = DvtNBoxDataUtils.getSelectedItems(nbox);
  if (selectedItems) {
    var selectedMap = {};
    for (var i = 0; i < selectedItems.length; i++) 
      selectedMap[selectedItems[i]['id']] = true;
    
    var nodeIndices = categoryNode.getData()['nodeIndices'];
    selected = true;
    for (var j = 0; j < nodeIndices.length; j++) {
      var node = DvtNBoxDataUtils.getNode(nbox, nodeIndices[j]);
      if (!selectedMap[node['id']]) {
        selected = false;
        break;
      }
    }
  }
  return selected;
};

/**
 * Builds a description used for the aria-label attribute
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {DvtNBoxNode|DvtNBoxCategoryNode|DvtNBoxDrawer} object an object that need a description
 * @param {string} datatip a datatip to use as part of description
 * @param {boolean} selected true if the object is selected
 * @return {string} aria-label description for the object
 */
DvtNBoxDataUtils.buildAriaDesc = function(nbox, object, datatip, selected) {
  var baseDesc = (object instanceof DvtNBoxCategoryNode || object instanceof DvtNBoxDrawer) ?
                  nbox.getBundle().getTranslatedString('COLON_SEP_LIST', [nbox.getBundle().getTranslatedString('GROUP_NODE'), datatip]) :
                  datatip;
  var objSelectedState = selected ?  
                  nbox.getBundle().getTranslatedString('STATE_SELECTED') : nbox.getBundle().getTranslatedString('STATE_UNSELECTED');
  var objCollapsedState = (object instanceof DvtNBoxCategoryNode) ? 
                          nbox.getBundle().getTranslatedString('STATE_COLLAPSED') : 
                          (object instanceof DvtNBoxDrawer) ? 
                          nbox.getBundle().getTranslatedString('STATE_EXPANDED') : 
                          null;  
  var objState = objCollapsedState ? 
                  nbox.getBundle().getTranslatedString('COMMA_SEP_LIST', [objCollapsedState, objSelectedState]) : 
                  objSelectedState;
  var desc = nbox.getBundle().getTranslatedString('COLON_SEP_LIST', [baseDesc, objState]);
  return desc;
}
// Copyright (c) 2013, 2014, Oracle and/or its affiliates. All rights reserved.

/**
 * Style related utility functions for DvtNBoxImpl.
 * @class
 */
var DvtNBoxStyleUtils = new Object();

DvtObj.createSubclass(DvtNBoxStyleUtils, DvtObj, 'DvtNBoxStyleUtils');

/**
 * Returns the display animation for the specified nbox.
 * @param {DvtNBoxImpl} nbox
 * @return {string}
 */
DvtNBoxStyleUtils.getAnimationOnDisplay = function(nbox) {
  var animationOnDisplay = nbox.getOptions()['animationOnDisplay'];
  if (animationOnDisplay == 'auto') {
    animationOnDisplay = DvtBlackBoxAnimationHandler.ALPHA_FADE;
  }
  return animationOnDisplay;
};

/**
 * Returns the data change animation for the specified nbox.
 * @param {DvtNBoxImpl} nbox
 * @return {string}
 */
DvtNBoxStyleUtils.getAnimationOnDataChange = function(nbox) {
  return nbox.getOptions()['animationOnDataChange'];
};

/**
 * Returns the animation duration in seconds for the specified nbox.  This duration is
 * intended to be passed to the animation handler, and is not in the same units
 * as the API.
 * @param {DvtNBoxImpl} nbox
 * @return {number} The animation duration in seconds.
 */
DvtNBoxStyleUtils.getAnimationDuration = function(nbox) {
  return nbox.getOptions()['styleDefaults']['animationDuration'] / 1000;
};

/**
 * Returns the label style for the specified column index
 * @param {DvtNBoxImpl} nbox
 * @param {number} columnIndex the specified column index
 * @return {DvtCSSStyle} the label style for the specified column index
 */
DvtNBoxStyleUtils.getColumnLabelStyle = function(nbox, columnIndex) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['columnLabelStyle'];
  var column = DvtNBoxDataUtils.getColumn(nbox, columnIndex);
  if (column['label'] && column['label']['style']) {
    return DvtJSONUtils.merge(new DvtCSSStyle(column['label']['style']), defaults);
  }
  return defaults;
};

/**
 * Returns the label style for the specified row index
 * @param {DvtNBoxImpl} nbox
 * @param {number} rowIndex the specified row index
 * @return {DvtCSSStyle} the label style for the specified row index
 */
DvtNBoxStyleUtils.getRowLabelStyle = function(nbox, rowIndex) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['rowLabelStyle'];
  var row = DvtNBoxDataUtils.getRow(nbox, rowIndex);
  if (row['label'] && row['label']['style']) {
    return DvtJSONUtils.merge(new DvtCSSStyle(row['label']['style']), defaults);
  }
  return defaults;
};

/**
 * Returns the cell style for the specified cell index
 * @param {DvtNBoxImpl} nbox
 * @param {number} cellIndex the specified cell index
 * @return {DvtCSSStyle} the cell style for the specified cell index
 */
DvtNBoxStyleUtils.getCellStyle = function(nbox, cellIndex) {
  var options = nbox.getOptions();
  var styleKey = DvtNBoxDataUtils.isCellMinimized(nbox, cellIndex) ? 'minimizedStyle' : 'style';
  var defaults = options['styleDefaults']['cell'][styleKey];
  var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
  if (cell[styleKey]) {
    return DvtJSONUtils.merge(new DvtCSSStyle(cell[styleKey]), defaults);
  }

  return defaults;
};

/**
 * Returns the label style for the specified cell index
 * @param {DvtNBoxImpl} nbox
 * @param {number} cellIndex the specified cell index
 * @return {DvtCSSStyle} the label style for the specified cell index
 */
DvtNBoxStyleUtils.getCellLabelStyle = function(nbox, cellIndex) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['cell']['labelStyle'];
  var cell = DvtNBoxDataUtils.getCell(nbox, cellIndex);
  if (cell['label'] && cell['label']['style']) {
    return DvtJSONUtils.merge(new DvtCSSStyle(cell['label']['style']), defaults);
  }
  return defaults;
};

/**
 * Returns the count label style for nbox cells
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the count label style for nbox cells
 */
DvtNBoxStyleUtils.getCellCountLabelStyle = function(nbox) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['cell']['countLabelStyle'];
  return defaults;
};

/**
 * Returns the body count label style for nbox cells
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the count label style for nbox cells
 */
DvtNBoxStyleUtils.getCellBodyCountLabelStyle = function(nbox) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['cell']['bodyCountLabelStyle'];
  return defaults;
}


/**
 * Returns the drop target style for nbox cells
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the drop target style for nbox cells
 */
DvtNBoxStyleUtils.getCellDropTargetStyle = function(nbox) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['cell']['dropTargetStyle'];
  return defaults;
};

/**
 * Returns the label style for the specified node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified node data
 * @return {DvtCSSStyle} the label style for the specified node
 */
DvtNBoxStyleUtils.getNodeLabelStyle = function(nbox, node) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['node']['labelStyle'];
  if (node['label'] && node['label']['style']) {
    return DvtJSONUtils.merge(new DvtCSSStyle(node['label']['style']), defaults);
  }
  return defaults;
};

/**
 * Returns the secondary label style for the specified node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified node data
 * @return {DvtCSSStyle} the secondary label style for the specified node
 */
DvtNBoxStyleUtils.getNodeSecondaryLabelStyle = function(nbox, node) {
  var options = nbox.getOptions();
  var defaults = options['styleDefaults']['node']['secondaryLabelStyle'];
  if (node['secondaryLabel'] && node['secondaryLabel']['style']) {
    return DvtJSONUtils.merge(new DvtCSSStyle(node['secondaryLabel']['style']), defaults);
  }
  return defaults;
};

/**
 * Returns the color for the specified node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified node data
 * @return {string} the color for the specified node
 */
DvtNBoxStyleUtils.getNodeColor = function(nbox, node) {
  if (node['color']) {
    return node['color'];
  }
  var attributeGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'color');
  if (attributeGroup) {
    return attributeGroup['color'];
  }
  return nbox.getOptions()['styleDefaults']['node']['color'];
};

/**
 * Returns the indicator color for the specified node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified node data
 * @return {string} the indicator color for the specified node
 */
DvtNBoxStyleUtils.getNodeIndicatorColor = function(nbox, node) {
  if (node['indicatorColor']) {
    return node['indicatorColor'];
  }
  var attributeGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorColor');
  if (attributeGroup) {
    return attributeGroup['indicatorColor'];
  }
  return null;
};

/**
 * Fills out any default style properties for the specified icon
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data
 * @param {object} icon the specified icon data
 * @return {object} the icon data, including default style properties
 */
DvtNBoxStyleUtils.getStyledIcon = function(nbox, node, icon) {
  var attributeGroups = {};
  var shapeAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'iconShape');
  if (shapeAttrGroup) {
    attributeGroups['shape'] = shapeAttrGroup['shape'];
  }
  var colorAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'iconFill');
  if (colorAttrGroup) {
    attributeGroups['color'] = colorAttrGroup['color'];
  }
  var patternAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'iconPattern');
  if (patternAttrGroup) {
    attributeGroups['fillPattern'] = patternAttrGroup['pattern'];
  }
  icon = DvtJSONUtils.merge(icon, attributeGroups);
  icon = DvtJSONUtils.merge(icon, nbox.getOptions()['styleDefaults']['node']['icon']);
  return icon;
};

/**
 * Fills out any default style properties for the specified indicator
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the node data
 * @param {object} indicator the specified indicator data
 * @return {object} the indicator data, including default style properties
 */
DvtNBoxStyleUtils.getStyledIndicator = function(nbox, node, indicator) {
  var attributeGroups = {};
  var shapeAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorShape');
  if (shapeAttrGroup) {
    attributeGroups['shape'] = shapeAttrGroup['shape'];
  }
  var colorAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorFill');
  if (colorAttrGroup) {
    attributeGroups['color'] = colorAttrGroup['color'];
  }
  var patternAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorPattern');
  if (patternAttrGroup) {
    attributeGroups['fillPattern'] = patternAttrGroup['pattern'];
  }
  indicator = DvtJSONUtils.merge(indicator, attributeGroups);
  indicator = DvtJSONUtils.merge(indicator, nbox.getOptions()['styleDefaults']['node']['indicator']);
  return indicator;
};

/**
 * Returns the alpha value for non-highlighted nodes.
 * @param {DvtNBoxImpl} nbox
 * @return {number} the alpha value for non-highlighted nodes.
 */
DvtNBoxStyleUtils.getFadedNodeAlpha = function(nbox) {
  return nbox.getOptions()['styleDefaults']['node']['alphaFade'];
};

/**
 * Returns a map containing scrollbar styles
 * @param {DvtNBoxImpl} nbox
 * @return {object} a map containing scrollbar styles
 */
DvtNBoxStyleUtils.getScrollbarStyleMap = function(nbox) {
  return nbox.getOptions()['styleDefaults']['scrollbar'];
};

/**
 * Returns the color for the specified category node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified category node data
 * @return {string} the color for the specified node
 */
DvtNBoxStyleUtils.getCategoryNodeColor = function(nbox, node) {
  var attributeGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'color');
  if (attributeGroup) {
    return attributeGroup['color'];
  }
  if (node['otherNode']) {
    return DvtNBoxDataUtils.getOtherColor(nbox);
  }
  return nbox.getOptions()['styleDefaults']['node']['color'];
};

/**
 * Returns the indicator color for the specified node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the specified category node data
 * @return {string} the indicator color for the specified node
 */
DvtNBoxStyleUtils.getCategoryNodeIndicatorColor = function(nbox, node) {
  var attributeGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorColor');
  if (attributeGroup) {
    return attributeGroup['indicatorColor'];
  }
  return null;
};

/**
 * Gets the styled indicator (if any) for the specified category node
 * @param {DvtNBoxImpl} nbox
 * @param {object} node the category node data
 * @return {object} the styled indicator data
 */
DvtNBoxStyleUtils.getStyledCategoryIndicator = function(nbox, node) {
  var attributeGroups = {};
  var shapeAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorShape');
  if (shapeAttrGroup) {
    attributeGroups['shape'] = shapeAttrGroup['shape'];
  }
  var colorAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorFill');
  if (colorAttrGroup) {
    attributeGroups['color'] = colorAttrGroup['color'];
  }
  var patternAttrGroup = DvtNBoxDataUtils.getAttributeGroup(nbox, node, 'indicatorPattern');
  if (patternAttrGroup) {
    attributeGroups['fillPattern'] = patternAttrGroup['pattern'];
  }
  if (!shapeAttrGroup && !colorAttrGroup && !patternAttrGroup) {
    return null;
  }
  var indicator = DvtJSONUtils.merge(attributeGroups, nbox.getOptions()['styleDefaults']['node']['indicator']);
  return indicator;
};

/**
 * Returns the background for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {string} the background for the drawer
 */
DvtNBoxStyleUtils.getDrawerBackground = function(nbox) {
  return nbox.getOptions()['styleDefaults']['drawer']['background'];
};

/**
 * Returns the header background for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {string} the header background for the drawer
 */
DvtNBoxStyleUtils.getDrawerHeaderBackground = function(nbox) {
  return nbox.getOptions()['styleDefaults']['drawer']['headerBackground'];
};

/**
 * Returns the border color for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {string} the border color for the drawer
 */
DvtNBoxStyleUtils.getDrawerBorderColor = function(nbox) {
  return nbox.getOptions()['styleDefaults']['drawer']['borderColor'];
};

/**
 * Returns the border radius for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {number} the border radius for the drawer
 */
DvtNBoxStyleUtils.getDrawerBorderRadius = function(nbox) {
  return nbox.getOptions()['styleDefaults']['drawer']['borderRadius'];
};

/**
 * Returns the label style for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the label style for the drawer
 */
DvtNBoxStyleUtils.getDrawerLabelStyle = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['drawer']['labelStyle'];
};

/**
 * Returns the count label style the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the count label style the drawer
 */
DvtNBoxStyleUtils.getDrawerCountLabelStyle = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['drawer']['countLabelStyle'];
};

/**
 * Returns the count border radius for the drawer
 * @param {DvtNBoxImpl} nbox
 * @return {number} the count border radius for the drawer
 */
DvtNBoxStyleUtils.getDrawerCountBorderRadius = function(nbox) {
  return nbox.getOptions()['styleDefaults']['drawer']['countBorderRadius'];
};

/**
 * Returns the label style for category nodes
 * @param {DvtNBoxImpl} nbox
 * @return {DvtCSSStyle} the label style for category nodes
 */
DvtNBoxStyleUtils.getCategoryNodeLabelStyle = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['categoryNode']['labelStyle'];
};

/**
 * Returns the border radius for nodes
 * @param {DvtNBoxImpl} nbox
 * @return {number} the border radius
 */
DvtNBoxStyleUtils.getNodeBorderRadius = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['node']['borderRadius'];
};

/**
 * Returns the hover color for nodes
 * @param {DvtNBoxImpl} nbox
 * @return {string} the hover color
 */
DvtNBoxStyleUtils.getNodeHoverColor = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['node']['hoverColor'];
};

/**
 * Returns the selection color for nodes
 * @param {DvtNBoxImpl} nbox the nbox component
 * @return {string} the selection color
 */
DvtNBoxStyleUtils.getNodeSelectionColor = function(nbox) {
  var options = nbox.getOptions();
  return options['styleDefaults']['node']['selectionColor'];
};

/**
 * Returns a left/center/right halign value based upon the current reading direction
 *
 * @param {DvtNBoxImpl} nbox the nbox component
 * @param {object} label the label data
 *
 * @return {string} the reading-direction-aware halign value
 */
DvtNBoxStyleUtils.getHalign = function(nbox, label) {
  var halign = label['halign'];
  var rtl = DvtAgent.isRightToLeft(nbox.getCtx());
  if (halign == 'end') {
    return rtl ? DvtOutputText.H_ALIGN_LEFT : DvtOutputText.H_ALIGN_RIGHT;
  }
  else if (halign == 'center') {
    return DvtOutputText.H_ALIGN_CENTER;
  }
  else { // halign == "start"
    return rtl ? DvtOutputText.H_ALIGN_RIGHT : DvtOutputText.H_ALIGN_LEFT;
  }
};
