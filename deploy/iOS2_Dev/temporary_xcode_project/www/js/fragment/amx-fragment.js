/* Copyright (c) 2013, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------ */
/* ------------- fragment/amx-fragment.js --------------- */
/* ------------------------------------------------------ */

(function()
{
  // During the creation of the children nodes, the fragment attempts to see if the
  // fragment is already loaded. If not, it will start the loading of the fragment and queue
  // a markNodeForUpdate callback when the loading is complete to update the view. If the fragment
  // has already been loaded, then the fragment is processed and the children nodes are created.

  var fragmentHandler = adf.mf.api.amx.TypeHandler.register(
    adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "fragment");

  /**
   * Renders a DIV tag that contains the contents of the fragment. Current fragments do not support
   * flattening so multiple fragment children will be placed in-line into the fragment DIV.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the node to render
   * @return {Element} the HTML element
   */
  fragmentHandler.prototype.render = function(amxNode)
  {
    var div = document.createElement("div");
    div.className = "amx-fragment";
    var renderedDescendants = amxNode.renderDescendants();
    for (var i = 0, size = renderedDescendants.length; i < size; ++i)
    {
      div.appendChild(renderedDescendants[i]);
    }
    return div;
  };

  /**
   * Creates the children nodes. Will kick of an AJAX call to load the fragment XML page
   * if it has not been already loaded.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the node for which to create the children
   * @return {boolean} true representing that the base functionality should not be used to
   *         create the children
   */
  fragmentHandler.prototype.createChildrenNodes = function(amxNode)
  {
    if (amxNode.getAttribute("src") == null)
    {
      // If the page attribute was not given, set the status to unrendered, otherwise
      // set it to the initial state so that this method will be called again
      amxNode.setState(
        amxNode.getAttributeExpression("src") == null ?
          adf.mf.api.amx.AmxNodeStates["UNRENDERED"] :
          adf.mf.api.amx.AmxNodeStates["INITIAL"]);
    }
    else
    {
      this._createChildrenFromFragment(amxNode);
    }

    return true;
  };

  /**
   * Perform any updates of the children. If called back from the creation of facets, the
   * attribute name of _facetsToBeCreated is used by the af:facetRef to indicate the facet
   * stamps that should be created for each reference.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the node
   * @param {adf.mf.api.amx.AmxAttributeChange} attributeChanges the attribute changes
   * @return {int} the adf.mf.api.amx.AmxNodeChangeResult constant
   */
  fragmentHandler.prototype.updateChildren = function(
    amxNode,
    attributeChanges)
  {
    if (attributeChanges.hasChanged("src"))
    {
      return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
    }

    if (attributeChanges.hasChanged("_facetsToBeCreated"))
    {
      var fragmentIsRendered = amxNode.isRendered();

      this._createFacets(amxNode, fragmentIsRendered);

      // If only facets are being created, don't re-render the entire fragment,
      // only re-render the parents of the facets (done in create facets method)
      if (fragmentIsRendered && attributeChanges.getSize() == 1)
      {
        return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  };

  /**
   * Visits the fragment children in the context of the fragment so that relative URIs may
   * be resolved and then the facet stamps for each facet reference.
   */
  fragmentHandler.prototype.visitChildren = function(
    amxNode,
    visitContext,
    callback)
  {
    // First visit the indexed children
    // Put the fragment URI onto a stack so that we can get the current URI for relative
    // path processing
    var uri = this._getFragmentUri(amxNode);
    var fragmentStackCreated = false;
    if (this._fragmentStack == null)
    {
      this._fragmentStack = [ uri ];
      fragmentStackCreated = true;
    }
    else
    {
      this._fragmentStack.push(uri);
    }

    try
    {
      if (amxNode.visitStampedChildren(null, null, null, visitContext, callback))
      {
        return true;
      }
    }
    finally
    {
      if (fragmentStackCreated)
      {
        delete this._fragmentStack;
      }
      else
      {
        this._fragmentStack.pop();
      }
    }

    // Visit the stamps (facets created for the amx:facetRef nodes)
    var facetVisitData = amxNode.getAttribute("_facetVisitData");
    if (facetVisitData != null)
    {
      for (var i = 0, size = facetVisitData.length; i < size; ++i)
      {
        var data = facetVisitData[i];
        var facetName = data["name"];
        var facetAttrs = data["attributes"];
        var facetStampKey = data["key"];

        this._setupFacetContext(facetAttrs);

        try
        {
          if (amxNode.visitStampedChildren(facetStampKey, [ facetName ], null, visitContext, callback))
          {
            return true;
          }
        }
        finally
        {
          this._tearDownFacetContext(facetAttrs);
        }
      }
    }

    return false;
  };

  /**
   * Called from the type handler for the amx:facetRef when a facet ref is being removed from the
   * AMX node hierarchy. Allows the fragment to remove the facet and perform any necessary clean up.
   * @param {adf.mf.api.amx.AmxNode} fragmentAmxNode the fragment AMX node
   * @param {adf.mf.api.amx.AmxNode} facetRefAmxNode the facetRef AMX node
   */
  fragmentHandler.prototype.__removeFacet = function(
    fragmentAmxNode,
    facetRefAmxNode)
  {
    var facetName = facetRefAmxNode.getAttribute("facetName");
    var visitData = fragmentAmxNode.getAttribute("_facetVisitData");
    var stampKey = facetRefAmxNode.getId();
    var facets = fragmentAmxNode.getChildren(facetName, stampKey);

    for (var i = facets.length - 1; i >= 0; --i)
    {
      var facet = facets[i];

      // Remove the facet
      fragmentAmxNode.removeChild(facet);

      if (visitData != null)
      {
        for (var v = 0, numVisitData = visitData.length; v < numVisitData; ++v)
        {
          var facetVisitData = visitData[v];
          if (facetVisitData["key"] == stampKey)
          {
            visitData.splice(v, 1);
            break;
          }
        }
      }
    }
  };

  /**
   * Setup the EL variables for any attributes that need to be passed from the facetRef to the facet
   */
  fragmentHandler.prototype._setupFacetContext = function(
    facetAttributes)
  {
    if (facetAttributes != null)
    {
      for (var a = 0, numAttrs = facetAttributes.length; a < numAttrs; ++a)
      {
        var attrData = facetAttributes[a];
        adf.mf.api.pushVariable(attrData["name"], attrData["value"]);
      }
    }
  };

  /**
   * Tear down the EL variables for any attributes that were passed from the facetRef to the facet
   */
  fragmentHandler.prototype._tearDownFacetContext = function(
    facetAttributes)
  {
    if (facetAttributes != null)
    {
      for (var a = 0, numAttrs = facetAttributes.length; a < numAttrs; ++a)
      {
        var attrData = facetAttributes[a];
        adf.mf.api.popVariable(attrData["name"]);
      }
    }
  };

  /**
   * Get the fragment URI, taking into account any relative paths so that they are resolved to
   * the including page or fragment.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the fragment AMX node
   */
  fragmentHandler.prototype._getFragmentUri = function(amxNode)
  {
    var uri = amxNode.getAttribute("_uri");
    if (uri == null)
    {
      uri = amxNode.getAttribute("src");
      if (uri != null)
      {
        if (this._fragmentStack == null || uri[0] == "/")
        {
          uri = adf.mf.api.amx.buildRelativePath(uri);
        }
        else
        {
          // This is a relative URI, get the currently processing fragment URI
          var baseUri = this._fragmentStack[this._fragmentStack.length - 1];
          // Remove the last path element
          var lastSlashIndex = baseUri.lastIndexOf("/");
          if (lastSlashIndex >= 0)
          {
            uri = baseUri.substring(0, lastSlashIndex) + "/" + uri;
          }
        }
      }
    }

    // Store it so we can avoid having to re-calculate the value. This is okay since the AMX node
    // is recreated when the page attribute changes
    amxNode.setAttributeResolvedValue("_uri", uri);
    return uri;
  };

  /**
   * Create the children from the fragment. This function causes the fragment to be loaded using the
   * adf.mf.internal.amx.__getAmxTagForPage function. Once the tags are loaded, the
   * _handleLoadedFragment is invoked.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the AMX node
   * @return {boolean|undefined} undefined if the node's URI is null, otherwise will return a
   *         boolean value representing if the fragment's tags have been successfully loaded. A
   *         value of false means that either the AJAX call failed or if the AJAX call is currently
   *         in process.
   */
  fragmentHandler.prototype._createChildrenFromFragment = function(amxNode)
  {
    var fragmentUri = this._getFragmentUri(amxNode);
    if (fragmentUri == null)
    {
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["UNRENDERED"]);
      return;
    }

    var fragmentStack = this._fragmentStack;
    if (fragmentStack)
    {
      // Due to the fact that EL is not evaluated in the DT and therefore nothing can prevent a
      // recursive loop from being evaluated, we need to prevent recursive loops by
      // not rendering the repeated child.
      if (adf.mf.environment.profile.dtMode)
      {
        if (fragmentStack.indexOf(fragmentUri) >= 0)
        {
          amxNode.setState(adf.mf.api.amx.AmxNodeStates["UNRENDERED"]);
          return true;
        }
      }
      else
      {
        // Allow the user to override the stack size (in case there is an app that needs to perform
        // a deep recursion
        var stackSizeToCheckAt = adf.mf.api.amx.fragmentRecursionLimit || 25;

        // To prevent recursive loops and exceeding the JavaScript stack, do not permit fragments to
        // have an unlimited recursion depth. The code currently consideres a loop if 25 or more
        // fragments are in the current stack and the current fragment has already been included
        // in the stack at least once
        if (fragmentStack.length >= stackSizeToCheckAt && fragmentStack.indexOf(fragmentUri) >= 0)
        {
          // Set the node to unrendered to stop any more recursion
          amxNode.setState(adf.mf.api.amx.AmxNodeStates["UNRENDERED"]);

          // Show the error, but do not harm rendering the rest of the page by throwing the error
          adf.mf.internal.amx.errorHandlerImpl(null, new Error(adf.mf.resource.getInfoString(
            "AMXErrorBundle", "ERROR_FRAGMENT_RECURSIVE_LOOP")));

          // Also log the error to the console with more detailed information to assist with
          // debugging to find out what fragment caused the recursion
          adf.mf.log.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
            "fragmentHandler.prototype._createChildrenFromFragment", "amx_fragment_RECURSION",
            amxNode.getId(), fragmentUri);
          return true;
        }
      }
    }

    var fragmentTagDfd = adf.mf.internal.amx.__getAmxTagForPage(fragmentUri);
    if (fragmentTagDfd.state() == "resolved")
    {
      this._handleLoadedFragment(amxNode, fragmentTagDfd);
      return true;
    }
    else if (fragmentTagDfd.state() == "rejected")
    {
      // We failed to load the fragment, do not render this node
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return false;
    }
    else
    {
      this._loadFragment(amxNode, fragmentTagDfd);
      return false;
    }
  };

  /**
   * Called once the fragment has been loaded. The calling function must ensure that
   * the deferred object has already been resolved when this function is invoked.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the fragment node
   * @param {Object} fragmentTagDfd the jQuery deferred object to be used to
   *        get the reference to the root adf.mf.api.amx.AmxTag for the fragment.
   */
  fragmentHandler.prototype._handleLoadedFragment = function(
    amxNode,
    fragmentTagDfd)
  {
    // Do not process the children if the node is waiting on EL. This will ensure that any
    // amx:attribute tag instances have been loaded before the children are created. This
    // ensures that we only have one cache miss per EL used by an attribute and not multiple
    // (which will happen if a fragment is loaded before the data change event for the attribute's
    // data)
    if (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["WAITING_ON_EL_EVALUATION"])
    {
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return;
    }

    // The fragment was already found and is loaded at this time, we can safely
    // process it and create the children
    var th = this;
    fragmentTagDfd
      .done(
        function(fragmentTag)
        {
          th._fragmentLoaded(amxNode, fragmentTag);
        });
  };

  /**
   * Displas the loading indicator, changes the state of the AMX node and kicks waits for the
   * deferred object to be resolved. Once resolved, this function will call
   * adf.mf.api.amx.markNodeForUpdate with the "_fragmentLoaded" virtual attribute being marked
   * as dirty.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the fragment AMX node
   * @param {Object} fragmentTagDfd the jQuery promise object to allow the code to wait for the
   *        tags from the fragement file to be finished loading.
   */
  fragmentHandler.prototype._loadFragment = function(
    amxNode,
    fragmentTagDfd)
  {
    // At this point the fragment has been requested but has not yet been loaded
    amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
    adf.mf.api.amx.showLoadingIndicator();
    fragmentTagDfd
      .done(
        function()
        {
          try
          {
            var args = new adf.mf.internal.amx.AmxNodeUpdateArguments();
            args.setAffectedAttribute(amxNode, "_fragmentLoaded");
            adf.mf.api.amx.markNodeForUpdate(args);
          }
          finally
          {
            adf.mf.api.amx.hideLoadingIndicator();
          }
        })
      .fail(
        function(msg, e)
        {
          adf.mf.log.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
            "amx-fragment._loadFragment", "MSG_ERROR_IN_SCRIPT", "amx-fragment._loadFragment",
            "Error loading fragment '" + amxNode.getAttribute("src") + "': " + msg);
          if (e instanceof Error)
          {
            adf.mf.internal.amx.errorHandlerImpl(null, e);
          }

          adf.mf.api.amx.hideLoadingIndicator();
        }
      );
  };

  /**
   * Called once the fragment has finished loading. This builds the children AMX nodes
   * for the included fragment.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the fragment AMX node
   * @param {adf.mf.api.amx.AmxTag} fragmentTag the root tag from the included fragment file
   */
  fragmentHandler.prototype._fragmentLoaded = function(
    amxNode,
    fragmentTag)
  {
    var childAmxNode = fragmentTag.buildAmxNode(amxNode, null);
    amxNode.addChild(childAmxNode);
  };

  /**
   * Called from a markNodeForUpdate call once facet ref tags have been processed to create
   * the stamps of the facets for each reference. If the fragment has already been rendered,
   * this function will kick of a nested markNodeForUpdate call to cause the parents of the
   * amx:facetRef tags to be re-rendered.
   *
   * @param {adf.mf.api.amx.AmxNode} amxNode the fragment AMX node
   * @param {boolean} fragmentIsRendered true if the fragment has already been rendered
   */
  fragmentHandler.prototype._createFacets = function(
    amxNode,
    fragmentIsRendered)
  {
    var newFacets = amxNode.getAttribute("_facetsToBeCreated");
    amxNode.setAttributeResolvedValue("_facetsToBeCreated", null);

    // Keep a list of the facet stamp keys. This is used to visit the children
    var facetVisitData = amxNode.getAttribute("_facetVisitData");
    if (facetVisitData == null)
    {
      facetVisitData = [];
      amxNode.setAttributeResolvedValue("_facetVisitData", facetVisitData);
    }

    // We will use markNodeForUpdate to cause the rendering of the facets by using
    // the facetRef nodes. This ensures that we only re-render what is necessary
    var args = fragmentIsRendered ? new adf.mf.internal.amx.AmxNodeUpdateArguments() : null;

    for (var i = 0, size = newFacets.length; i < size; ++i)
    {
      var facetRefAmxNode = newFacets[i];
      var facetName = facetRefAmxNode.getAttribute("facetName");
      var facetStampKey = facetRefAmxNode.getId();

      // Record the information needed for visiting
      facetVisitData.push({
        "key": facetStampKey,
        "name": facetName,
        "attributes": facetRefAmxNode.getAttribute("_attributeData")
      });

      var created = amxNode.createStampedChildren(facetStampKey, [ facetName ]);
      for (var c = 0, numCreated = created.length; c < numCreated; ++c)
      {
        var facetAmxNode = created[c];

        // Set the parent that is used for rendering purposes. This allows the framework
        // to only re-render based on the location in the page rather than needing to
        // re-render the full fragment when a facet changes.
        facetAmxNode.__setRenderingParent(facetRefAmxNode);
      }

      if (fragmentIsRendered && created.length > 0)
      {
        // Mark the node as needing to be updated using a dummy attribute name
        args.setAffectedAttribute(facetRefAmxNode, "_facetCreated");
      }

      // Mark the facetRef ready to be rendered now that the facet has been created
      facetRefAmxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    }

    // Only schedule the update if the fragment is rendered. If the fragment is not yet rendered,
    // there is no need for the overhead of marking the facets as having been changed
    if (fragmentIsRendered && args.getAffectedNodes().length > 0)
    {
      adf.mf.api.amx.markNodeForUpdate(args);
    }
  };
})();
