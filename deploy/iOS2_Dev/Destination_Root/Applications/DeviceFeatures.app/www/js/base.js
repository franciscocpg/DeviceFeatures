/* Copyright (c) 2011, 2012, Oracle and/or its affiliates. All rights reserved. */
/* -------------------------------------------------------- */
/* ----------------- base-namespace.js -------------------- */
/* -------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

// Perform the base namespace definitions:
if (!window.adf) /** @expose @namespace adf */ window.adf = {};
/** @namespace */ adf.mf                     = adf.mf                     || {};
/** @namespace */ adf.mf.environment         = adf.mf.environment         || {};
/** @namespace */ adf.mf.api                 = adf.mf.api                 || {};
/** @namespace */ adf.mf.el                  = adf.mf.el                  || {};
/** @namespace */ adf.mf.locale              = adf.mf.locale              || {};
/** @namespace */ adf.mf.log                 = adf.mf.log                 || {};
/** @namespace */ adf.mf.resource            = adf.mf.resource            || {};
/** @namespace */ adf.mf.util                = adf.mf.util                || {};

/** @namespace */ adf.mf.internal            = adf.mf.internal            || {};
/** @namespace */ adf.mf.internal.api        = adf.mf.internal.api        || {};
/** @namespace */ adf.mf.internal.el         = adf.mf.internal.el         || {};
/** @namespace */ adf.mf.internal.el.parser  = adf.mf.internal.el.parser  || {};
/** @namespace */ adf.mf.internal.locale     = adf.mf.internal.locale     || {};
/** @namespace */ adf.mf.internal.log        = adf.mf.internal.log        || {};
/** @namespace */ adf.mf.internal.mb         = adf.mf.internal.mb         || {};
/** @namespace */ adf.mf.internal.perf       = adf.mf.internal.perf       || {};
/** @namespace */ adf.mf.internal.perf.story = adf.mf.internal.perf.story || {};
/** @namespace */ adf.mf.internal.resource   = adf.mf.internal.resource   || {};
/** @namespace */ adf.mf.internal.util       = adf.mf.internal.util       || {};

// Create a default session key
window.adf_mf_sessionKey = 0;
/* Copyright (c) 2008, 2013, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------- */
/* ------------------ base-assert.js --------------------- */
/* ------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

(function()
{
  /**
   * Assertion utilities.
   * The container is expected to have already initialized the Assert Object before this
   * code is executed and initialized the adf.mf.api.AdfAssert.DEBUG flag.
   * @export
   * @namespace
   */
  adf.mf.api.AdfAssert = new Object();

  /**
   * Forces assertion DEBUG to be set to true (to display assertions).
   */
  adf.mf.api.AdfAssert.forceDebug = function()
  {
    adf.mf.api.AdfAssert.DEBUG = adf.mf.api.AdfAssert["DEBUG"] = true;
  };

  // name of property on function objects that stack dumping will look for
  // to get the function name
  adf.mf.api.AdfAssert.FUNC_NAME_PROPERTY = "_funcName";

  // name of property on function objects that stack dumping will look for
  // to get the class name
  adf.mf.api.AdfAssert.CLASS_NAME_PROPERTY = "_className";

  // maximum stack depth that we will generate a stack trace for
  adf.mf.api.AdfAssert._MAX_STACK_DEPTH_LIMIT = 20;

  /**
   * Asserts that a condition is true. If the condition does not
   * evaluate to true, an exception is thrown with the optional message
   * and reason.
   * @param {boolean} condition the condition that is asserted to be true
   * @param {string} message the message used when the condition is false
   */
  adf.mf.api.AdfAssert.assert = function(
    condition,
    message)
  {
    if (adf.mf.api.AdfAssert.DEBUG && !condition)
    {
      if (arguments.length > 2)
      {
        message += "(";
        for(var i=2; i<arguments.length; i++)
        {
          message += arguments[i];
        }
        message += ")";
      }
      adf.mf.api.AdfAssert.assertionFailed(message, 1);
    }
  };

  /**
   * Convenience function for asserting when an abstact function is called.
   */
  adf.mf.api.AdfAssert.failedInAbstractFunction = function()
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertionFailed("Abstract function called", 1);
    }
  };

  /**
   * Asserts that the the target object has the same prototype as the example
   * type.
   * @param {Object} target the object to assert has a matching prototype
   * @param {Object} theConstructor the type of object whose prototype will be compared
   * @param {string} reason the message used when the prototype does not match
   */
  adf.mf.api.AdfAssert.assertPrototype = function(
    target,
    theConstructor,
    reason)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      if (target != null)
      {
        adf.mf.api.AdfAssert.assertType(theConstructor, "function", null, 1, false);
        var thePrototype = theConstructor.prototype;

        if (!thePrototype.isPrototypeOf(target))
        {
          // try to extract the type name from the prototype
          if (!reason && (typeof thePrototype.getTypeName == "function"))
          {
            reason = thePrototype.getTypeName();
          }

          adf.mf.api.AdfAssert.assertionFailed("object '" + target + "' doesn't match prototype "
                                            + thePrototype,
                                            1,
                                            reason);
        }
      }
      else
      {
        adf.mf.api.AdfAssert.assertionFailed("null object doesn't match prototype " + thePrototype, 1, reason);
      }
    }
  };

  /**
   * Asserts that the the target object has the same prototype as the example
   * type or is null.
   * @param {Object} target the object to assert has a matching prototype or is null
   * @param {Object} theConstructor the type of object whose prototype will be compared
   * @param {string} reason the message used when the prototype does not match
   */
  adf.mf.api.AdfAssert.assertPrototypeOrNull = function(
    target,
    theConstructor,
    reason)
  {
    if (adf.mf.api.AdfAssert.DEBUG && (target != null))
    {
      if (target != null)
      {
        adf.mf.api.AdfAssert.assertType(theConstructor, "function", null, 1, false);
        var thePrototype = theConstructor.prototype;

        if (!thePrototype.isPrototypeOf(target))
        {
          adf.mf.api.AdfAssert.assertionFailed("object '" + target + "' doesn't match prototype "
                                            + thePrototype,
                                            1,
                                            reason);
        }
      }
      else
      {
        adf.mf.api.AdfAssert.assertionFailed("null object doesn't match prototype " + thePrototype, 1, reason);
      }
    }
  };

  /**
   * Asserts that the the target object has the same prototype as one of the example
   * types.
   * @param {Object} target the object to assert has a matching prototype
   * @param {Object} instanceOne one of the two possible types of objects whose prototype will be compared
   * @param {Object} instanceTwo one of the two possible types of objects whose prototype will be compared
   * @param {string} reason the message used when the prototype does not match at least one of the prototypes
   */
  adf.mf.api.AdfAssert.assertPrototypes = function(
    target,
    instanceOne,
    instanceTwo,
    reason)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      var thePrototype = instanceOne.prototype;
      var thePrototypeTwo = instanceTwo.prototype;

      if (!(thePrototype.isPrototypeOf(target) ||
            thePrototypeTwo.isPrototypeOf(target)))
      {
        adf.mf.api.AdfAssert.assertionFailed("object '" + target + "' doesn't match prototype "
                                          + thePrototype + " or " + thePrototypeTwo,
                                          1,
                                          reason);
      }
    }
  };

  /**
   * Asserts that the target is a DOM Node or null.
   * @param {Object} target the object to assert being a DOM Node or null
   * @param {number} depth an optional additional amount of levels to skip for the stack trace
   */
  adf.mf.api.AdfAssert.assertDomNodeOrNull = function(target, depth)
  {
    if (adf.mf.api.AdfAssert.DEBUG && target)
    {
      if (target["nodeType"] == undefined)
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a DOM Node", depth + 1);
      }
    }
  };

  /**
   * Asserts that the target is a DOM Node.
   * @param {Object} target the object to assert being a DOM Node
   * @param {number} depth an optional additional amount of levels to skip for the stack trace
   */
  adf.mf.api.AdfAssert.assertDomNode = function(target, depth)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      if (!target || (target["nodeType"] == undefined))
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a DOM Node", depth + 1);
      }
    }
  };

  /**
   * Asserts that the target is a DOM Element and optionally has the specified
   * element name.
   * @param {Object} target the object to assert being a DOM Node and an HTML Element
   * @param {string} nodeName the optional name of the element to also assert upon
   */
  adf.mf.api.AdfAssert.assertDomElement = function(target, nodeName)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertDomNode(target, 1);

      if (target.nodeType != 1)
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a DOM Element", 1);
      }
      else if (nodeName && (target.nodeName != nodeName))
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a " + nodeName + " Element", 1);
      }
    }
  };

  /**
   * Asserts that the target is a DOM Element and optionally has the specified
   * element name.
   * @param {Object} target the object to assert being a DOM Node and an HTML Element or null
   * @param {string} nodeName the optional name of the element to also assert upon
   */
  adf.mf.api.AdfAssert.assertDomElementOrNull = function(target, nodeName)
  {
    if (adf.mf.api.AdfAssert.DEBUG && (target != null))
    {
      adf.mf.api.AdfAssert.assertDomNode(target, 1);

      if (target.nodeType != 1)
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a DOM Element", 1);
      }
      else if (nodeName && (target.nodeName != nodeName))
      {
        adf.mf.api.AdfAssert.assertionFailed(target + " is not a " + nodeName + " Element", 1);
      }
    }
  };

  /**
   * Asserts that the target object has the typeof specified.
   * @param {Object} target the target object to test
   * @param {string} type typeof type that statisfies this condition
   * @param {string} prefix an optional prefix for the assertion failure message
   * @param {number} depth an optional additional amount of levels to skip for the stack trace
   * @param {boolean} nullOK true if a null value satisfies this condition
   */
  adf.mf.api.AdfAssert.assertType = function(
    target,
    type,   // typeof type that statisfies this condition
    prefix,
    depth,  // stack depth to skip when printing stack traces
    nullOK)  // true if a null value satisfies this condition
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      // either the target is null and null is OK, or the target better
      // be of the correct type
      if (!(((target == null) && nullOK) || ((typeof target) == type)))
      {
        var message = target + " is not of type " + type;

        if (prefix)
          message = prefix + message;

        if (!depth)
          depth = 0;

        adf.mf.api.AdfAssert.assertionFailed(message, depth + 1);
      }
    }
  };

  /**
   * Asserts that the target is an Object.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertObject = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "object", prefix, 1, false);
    }
  };

  /**
   * Asserts that the target is an Object or null.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertObjectOrNull = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "object", prefix, 1, true);
    }
  };

  /**
   * Asserts that the target is a non-empty String.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertNonEmptyString = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "string", prefix, 1, false);
      adf.mf.api.AdfAssert.assert(target.length > 0, "empty string");
    }
  };

  /**
   * Asserts that the target is a String.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertString = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "string", prefix, 1, false);
    }
  };

  /**
   * Asserts that the target is a String or null.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertStringOrNull = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "string", prefix, 1, true);
    }
  };

  /**
   * Asserts that the target is a Function.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertFunction = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "function", prefix, 1, false);
    }
  };

  /**
   * Asserts that the target is a Function or null.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertFunctionOrNull = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "function", prefix, 1, true);
    }
  };

  /**
   * Asserts that the target is a boolean.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertBoolean = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "boolean", prefix, 1, false);
    }
  };

  /**
   * Asserts that the target is a boolean or null.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertBooleanOrNull = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "boolean", prefix, 1, true);
    }
  };

  /**
   * Asserts that the target is a number.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertNumber = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "number", prefix, 1, false);
    }
  };

  /**
   * Asserts that the target is a number or null.
   * @param {Object} target the target object to test
   * @param {string} prefix an optional prefix for the assertion failure message
   */
  adf.mf.api.AdfAssert.assertNumberOrNull = function(target, prefix)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertType(target, "number", prefix, 1, true);
    }
  };


  /**
   * Asserts that the target object is an Array.
   * @param {Object} target the target object to test
   * @param {string} message an optional assertion failure message
   */
  adf.mf.api.AdfAssert.assertArray = function(
    target,
    message)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      if (!AdfCollections.isArray(target))
      {
        if (message == undefined)
          message = target + " is not an array";

        adf.mf.api.AdfAssert.assertionFailed(message, 1);
      }
    }
  };

  /**
   * Asserts that the target object is an Array or null.
   * @param {Object} target the target object to test
   * @param {string} message an optional assertion failure message
   */
  adf.mf.api.AdfAssert.assertArrayOrNull = function(
    target,
    message)
  {
    if (adf.mf.api.AdfAssert.DEBUG && (target != null))
    {
      if (!AdfCollections.isArray(target))
      {
        if (message == undefined)
          message = target + " is not an array";

        adf.mf.api.AdfAssert.assertionFailed(message, 1);
      }
    }
  };


  /**
   * Asserts that the target object is not either a number, or convertible to a number.
   * @param {Object} target the target object to test
   * @param {string} message an optional assertion failure message
   */
  adf.mf.api.AdfAssert.assertNonNumeric = function(
    target,
    message)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      if (!isNaN(target))
      {
        if (message == undefined)
          message = target + " is convertible to a number";

        adf.mf.api.AdfAssert.assertionFailed(message, 1);
      }
    }
  };

  /**
   * Asserts that the target object is either a number, or convertible to a number.
   * @param {Object} target the target object to test
   * @param {string} message an optional assertion failure message
   */
  adf.mf.api.AdfAssert.assertNumeric = function(
    target,
    message)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      if (isNaN(target))
      {
        if (message == undefined)
          message = target + " is not convertible to a number";

        adf.mf.api.AdfAssert.assertionFailed(message, 1);
      }
    }
  };

  /**
   * Asserts that key String corresponds to an entry in the Map.
   * @param {Object} key the map key whose toString() result is used look up a value in the map
   * @param {Object} theMap the map
   * @param {string} message an optional assertion failure message
   */
  adf.mf.api.AdfAssert.assertInMap = function(
    value,
    theMap,
    message)
  {
    if ((value == null) || (theMap[value.toString()] == undefined))
    {
      if (message == undefined)
      {
        var keyString = " is not in the map: {";

        for (var k in theMap)
        {
          keyString += k;
          keyString += ","
        }

        keyString += "}";

        message = value + keyString;
      }

      adf.mf.api.AdfAssert.assertionFailed(message, 1);
    }
  };

  /**
   * Base assertion failure support that supports specifying the stack skipping
   * level.
   * @param {string} message the assertion failure message
   * @param {number} skipLevel the optional number of stack trace levels to skip
   * @param {string} reason the optional reason for the assertion
   * @throws Error with the given message and stack trace details if available.
   */
  adf.mf.api.AdfAssert.assertionFailed = function(
    message,
    skipLevel,
    reason)
  {
    if (!skipLevel)
      skipLevel = 0;

    var errorMessage = "Assertion";

    if (reason)
    {
      errorMessage += " (" + reason + ")";
    }

    errorMessage += " failed: ";

    if (message != undefined)
    {
      errorMessage += message;
    }

    var stackTrace = adf.mf.api.AdfAssert._getStackTrace(skipLevel + 1);

    var stackTraceString = adf.mf.api.AdfAssert._getStackString(stackTrace);

    errorMessage += "\nStackTrace:\n" + stackTraceString;

    var error = new Error(errorMessage);

    // Although the error is being thrown below, it is not 100% reliable because it is
    // possible for other code to trap the error and instead report a cryptic message without mention
    // of the assertion failure details when the real assertion message was in a completely different
    // JavaScript class than what was mentioned.
    // The reason why the errorMessage isn't logged immediately to the logger is that there would be
    // a circular dependency between the logger and the assertion code.
    // As a stopgap, since the error absolutely must be reported, we will also alert the
    // errorMessage String using the standard alert mechanism until a non-circular dependency solution
    // with the logger is researched:
    alert(errorMessage);

    throw error;
  };

  /**
   * Returns the name of a function, or <code>null</code> if the
   * name can't be determined.
   * @param {function} func the function
   * @return {string} the name of the function or null
   */
  adf.mf.api.AdfAssert.getFunctionName = function(func)
  {
    // check if the function name has been stored on the function already
    var funcName = func[adf.mf.api.AdfAssert.FUNC_NAME_PROPERTY];

    if (funcName == undefined)
    {
      var functionString = func.toString();
      var startFuncParamsIndex = functionString.indexOf('(');

      // back up to the first space
      var startFuncNameIndex = functionString.lastIndexOf(" ", startFuncParamsIndex);

      // the function name is contained in the portion of the function string between
      // the beginning of the function and the first "("
      funcName = functionString.substring(startFuncNameIndex + 1, startFuncParamsIndex);

      if (!funcName.length)
        funcName = null;

      // store the derived function name or null if the function
      // name can't be determined
      func[adf.mf.api.AdfAssert.FUNC_NAME_PROPERTY] = funcName;
    }

    return funcName;
  };

  /**
   * Returns the stack trace as a string.
   * @param {number} depth an optional additional amount of levels to skip for the stack trace
   * @return {string} the stack trace
   */
  adf.mf.api.AdfAssert.getStackString = function(depth)
  {
    if (depth == null)
      depth = 1;

    return adf.mf.api.AdfAssert._getStackString(adf.mf.api.AdfAssert._getStackTrace(1));
  };

  /**
   * Returns the stack trace as an array of function callers.
   * @param {number} skipLevel the optional number of stack trace levels to skip
   * @return {Array.<function>} the stack trace
   * @private
   */
  adf.mf.api.AdfAssert._getStackTrace = function(
    skipLevel)
  {
    if (skipLevel == undefined)
      skipLevel = 0;

    adf.mf.api.AdfAssert.assert(skipLevel >= 0);

    var stackTrace = new Array();

    // crawl up starting at our caller
    try
    {
      var currCaller = adf.mf.api.AdfAssert._getStackTrace.caller;

      while (currCaller && (stackTrace.length < adf.mf.api.AdfAssert._MAX_STACK_DEPTH_LIMIT))
      {
        if (!skipLevel)
        {
          stackTrace.push(currCaller);
        }
        else
        {
          skipLevel--;
        }

        currCaller = currCaller.caller;
      }
    }
    catch (e)
    {
      // just eat it because we have no place to log this
    }

    return stackTrace;
  };

  /**
   * Returns the param String for a function, or null if there are no parameters.
   * @param {function} func the function to get parameters from
   * @return {string} the parameters for the given function or null if none are applicable
   * @private
   */
  adf.mf.api.AdfAssert._getFuncParams = function(func)
  {
    // check if the function parameters have been stored on the function already
    var funcParams = func[adf.mf.api.AdfAssert._PARAMS_NAME_PROPERTY];

    if (funcParams == undefined)
    {
      var currFunctionString = func.toString();
      var startFuncParams    = currFunctionString.indexOf('(');
      var endFuncParams      = currFunctionString.indexOf(')', startFuncParams + 1);

      funcParams = currFunctionString.substring(startFuncParams, endFuncParams + 1);

      // remove all whitespace
      funcParams = funcParams.replace(/\s+/g, "");

      if (!funcParams.length)
        funcParams = null;

      // store the derived function name or null if the function
      // parameters don't exist
      func[adf.mf.api.AdfAssert._PARAMS_NAME_PROPERTY] = funcParams;
    }

    return funcParams;
  };

  /**
   * Private implementation for getting a stack string.
   * @param {Array.<function>} stackTrace the stack trace
   * @return {string} the stack trace string
   * @private
   */
  adf.mf.api.AdfAssert._getStackString = function(stackTrace)
  {
    if (!stackTrace)
      return "";

    var functionCount = stackTrace.length;

    var stackStrings = new Array(functionCount);

    for (var stackIndex = 0; stackIndex < functionCount; stackIndex++)
    {
      var currFunction = stackTrace[stackIndex];

      var funcName = adf.mf.api.AdfAssert.getFunctionName(currFunction);

      if (!funcName)
        funcName = "anonymous";

      // try to pull the class name off of the function object
      var className = currFunction[adf.mf.api.AdfAssert.CLASS_NAME_PROPERTY];

      // Try to pull the class name off of the function object. If we have one,
      // prepend it to the function name
      if (className)
        funcName = className + "." + funcName;

      var funcParams = adf.mf.api.AdfAssert._getFuncParams(currFunction);

      var functionArgs = currFunction.arguments;
      var argCount     = functionArgs.length;
      var argsArray    = null;

      // copy arguments into an array so that we can call join on it
      if (argCount)
      {
        // copy the entries the lame way
        argsArray = new Array(argCount);

        for (var argIndex = 0; argIndex < argCount; argIndex++)
        {
          var currArg = functionArgs[argIndex];

          if (typeof currArg == "function")
          {
            var argFuncName = adf.mf.api.AdfAssert.getFunctionName(currArg);

            if (!argFuncName)
              argFuncName = "anonymous";

            var argFuncParams = adf.mf.api.AdfAssert._getFuncParams(currArg);

            currArg = "function " + argFuncName + argFuncParams;
          }

          argsArray[argIndex] = currArg;
        }
      }

      // concatenate the pieces together
      var stackStringArray = new Array();

      stackStringArray[0] = funcName;
      stackStringArray[1] = funcParams;

      // add in the arguments, if any
      if (argsArray)
      {
        stackStringArray[2] = "\n";
        stackStringArray[3] = "[";
        stackStringArray[4] = adf.mf.api.AdfAssert._safeJoin(argsArray, ",");
        stackStringArray[5] = "]";
      }

      stackStrings[stackIndex] = stackStringArray.join("");
    }

    return stackStrings.join("\n");
  };

  /**
   * Private implementation for joining array elements into a single string,
   * checking for the presence of toString() on each element.
   * @param {Array} arr the array
   * @param {string} sep an optional separator
   * @return {string} the joined array
   * @private
   */
  adf.mf.api.AdfAssert._safeJoin = function(arr, sep)
  {
    var length = arr.length;
    var joinedString = "";
    for (var i = 0; i < length; i++)
    {
      var ele = arr[i];
      var str = ele ? (ele.toString ? ele.toString() : "Unknown") : "(empty)";

      // If we care about performance, we should use a string buffer
      joinedString += str;

      if (sep)
      {
        if (i < length - 1)
          joinedString += sep;
      }
    }

    return joinedString;
  };

  // name of property on function objects that stack dumping will look for
  // the param names
  adf.mf.api.AdfAssert._PARAMS_NAME_PROPERTY = "_funcParams";

})();
/* Copyright (c) 2004, 2013, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------- */
/* --------------- base-collections.js ------------------- */
/* ------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

(function()
{
  /**
   * Utilities for working with collections.
   * @namespace
   */
  adf.mf.api.AdfCollections = new Object();

  adf.mf.api.AdfCollections.EMPTY_ARRAY = new Array();

  /**
   * Returns true if the object is an Array.
   */
  adf.mf.api.AdfCollections.isArray = function(
    array)
  {
    if (array)
    {
      return Array.prototype.isPrototypeOf(array);
    }

    return false;
  };

  /**
   * Remove all of the properties of a collection.
   * @param {Object} target the map to clear
   */
  adf.mf.api.AdfCollections.clear = function(
    target)
  {
    if (!target)
      return;

    for (var i in target)
    {
      delete target[i];
    }
  };

  /**
   * Returns if a collection is empty.
   * @param {Object} collection a collection object to test for empty
   * @return {Boolean} whether the collection is empty
   */
  adf.mf.api.AdfCollections.isEmpty = function(collection)
  {
    var empty = true;
    for (var k in collection)
    {
      if (collection.hasOwnProperty(k))
      {
        empty = false;
        break;
      }
    }
    return empty;
  };

  /**
   * Remove all of the entries from an Array.
   */
  adf.mf.api.AdfCollections.clearArray = function(
    array)
  {
    array.length = 0;
  };

  /**
   * Returns a shallow copy of an array.
   * @param {Array} source the source array
   * @return {Array} the newly-created array
   */
  adf.mf.api.AdfCollections.cloneArray = function(source)
  {
    if (!source)
      return null;

    var clone = new Array(source.length);

    return adf.mf.api.AdfCollections.copyInto(clone, source);
  };

  /**
   * Shallow-copies all of the properties of source into target and return the target.
   * @param {Object} target the destination collection
   * @param {Object} source the source collection
   * @param {Function} keyConverter an optional key mapping fuction to use that takes in the raw
   *                                source key and returns a converted key for the target
   * @return {Object} the passed in target (modifications applied)
   */
  adf.mf.api.AdfCollections.copyInto = function(
    target,
    source,
    keyConverter)
  {
    if (target && source && (target !== source))
    {
      for (var k in source)
      {
        var targetKey;

        // allow the key mapping to be overridden
        if (keyConverter)
        {
          targetKey = keyConverter(k);
        }
        else
        {
          targetKey = k;
        }

        try
        {
          target[targetKey] = source[k];
        }
        catch (e)
        {
          // consume errors caused by read-only properties
        }
      }
    }

    return target;
  };

  /**
   * Copy the properties with the specified keys from the source to the
   * destination using the optional keyConverter to convert the source keys
   * to target keys.
   * @param {Object} target the destination collection
   * @param {Object} source the source collection
   * @param {Array} sourceKeys the keys to copy
   * @param {Function} keyConverter an optional key mapping fuction to use that takes in the raw
   *                                source key and returns a converted key for the target
   * @return {Object} the passed in target (modifications applied) or null if no copy was performed
   */
  adf.mf.api.AdfCollections.copyProperties = function(
    target,
    source,
    sourceKeys,
    keyConverter)
  {
    if (!target || !source || !sourceKeys || (target === source))
      return;

    var keyCount = sourceKeys.length;

    for (var i = 0; i < keyCount; i++)
    {
      var currKey = sourceKeys[i];

      var sourceValue = source[currKey];

      if (sourceValue)
      {
        var targetKey;

        // allow the key mapping to be overridden
        if (keyConverter)
        {
          targetKey = keyConverter(currKey);
        }
        else
        {
          targetKey = currKey;
        }

        try
        {
          target[targetKey] = sourceValue;
        }
        catch (e)
        {
          // consume errors caused by read-only properties
        }
      }
    }

    return target;
  };

  /**
   * Removes all of the properties of removeCollection from targetCollection.
   * targetCollection is unmodified if targetCollection is not the same object
   * as outCollection. If outCollection is specified, then it is cleared and
   * populated with the results of the removal. Otherwise, a new object is
   * created to hold the results.
   * @param {Object} targetCollection the target collection
   * @param {Object} removeCollection an optional removeCollection
   * @param {Object} outCollection an optional collection that gets cleared and populated with the results of
   *                               the removal or elase a new object is created to hold the results
   * @return {Object} the outCollection (or new object) holding the 
   */
  adf.mf.api.AdfCollections.removeAll = function(
    targetCollection,
    removeCollection,
    outCollection)
  {
    if (outCollection)
    {
      if (outCollection !== targetCollection)
      {
        outCollection.clear();
      }
    }
    else
    {
      outCollection = new Object();
    }

    if (!targetCollection)
    {
      return outCollection;
    }

    adf.mf.api.AdfCollections.copyInto(outCollection, targetCollection);

    if (removeCollection)
    {
      for (var k in removeCollection)
      {
        delete outCollection[k];
      }
    }

    return outCollection;
  };

  /**
   * Returns the union of two sets of properties. With the properties of
   * inUnion2 taking precendence over those of inUnion1. If outUnion is
   * specified, it will be used as the output container instead of a new
   * object being created and returned. outUnion may be the same object
   * as inUnion1 or inUnion2.
   * @param {Object} inUnion1 the first collection
   * @param {Object} inUnion2 the second collection (with higher precedence)
   * @param {Object} outUnion the optional output container
   * @return {Object} the union
   */
  adf.mf.api.AdfCollections.union = function(
    inUnion1,
    inUnion2,
    outUnion)
  {
    // handle one of the outputs being null;
    if ((inUnion1 == null) || (inUnion2 == null))
    {
      var outTarget = (inUnion1 == null)
                        ? inUnion2
                        : inUnion1;

      if (outUnion)
      {
        adf.mf.api.AdfCollections.clear(outUnion);
        adf.mf.api.AdfCollections.copyInto(outUnion, outTarget);
      }

      return outTarget;
    }

    if (!outUnion)
    {
      outUnion = new Object();
    }
    else
    {
      // make sure that the union object passed in is empty, but don't clear
      // it if it is once of the sources
      if ((outUnion !== inUnion1) && (outUnion !== inUnion2))
      {
        adf.mf.api.AdfCollections.clear(outUnion);
      }
    }

    adf.mf.api.AdfCollections.copyInto(outUnion, inUnion1);
    adf.mf.api.AdfCollections.copyInto(outUnion, inUnion2);

    return outUnion;
  };

  /**
   * Returns the key of the value in the specified collection, or <code>undefined</code>
   * if the value is not a member of this collection.
   * @param {Object} collection the collection
   * @param {Object} value the value to find its first key
   * @return {Object} the first key that corresponds to the specified value or undefined if not found
   */
  adf.mf.api.AdfCollections.getKeyOf = function(
    collection,
    value)
  {
    if (collection)
    {
      for (var k in collection)
      {
        if (collection[k] === value)
        {
          return k;
        }
      }
    }
  };

  /**
   * Removes the first instance of the specified value from the collection
   * and returns the key the value was associated with.
   * @param {Object} collection the collection
   * @param {Object} value the value to delete its first entry
   * @return {Object} the first key that corresponds to the specified value or undefined if not found
   */
  adf.mf.api.AdfCollections.removeValue = function(
    collection,
    value)
  {
    var key = adf.mf.api.AdfCollections.getKeyOf(collection, value);

    if (key)
    {
      delete collection[key];
    }

    return key;
  };

  /**
   * Removes the first instance of the specified value from the Array
   * and returns the key the value was associated with, moving all of
   * the array indices down and returning the index of the removed value, or -1 if the
   * value wasn't found.
   * @param {Array} array the array to search when removing value
   * @param {Object} value the value to remove from array
   * @return {Number} Index of value in array, or -1 if value wasn't found
   */
  adf.mf.api.AdfCollections.removeArrayValue = function(
    array,
    value)
  {
    if (array)
    {
      AdfAssert.assertArray(array);

      var length = array.length;

      for (var i = 0; i < length; i++)
      {
        if (array[i] == value)
        {
          array.splice(i, 1);

          return i;
        }
      }
    }

    return -1;
  };

  /**
   * Removes the key from the array list if it is an integer, and from
   * the key's properties if it isn't.
   * @param {Array} array the array to remove an entry
   * @param {Object} key the key to remove
   */
  adf.mf.api.AdfCollections.removeArrayKey = function(
    array,
    key)
  {
    var index = parseInt(key);

    if (isNaN(index))
    {
      delete array[key];
    }
    else
    {
      array.splice(index, 1);
    }
  };

  /**
   * Adds a value to an array at the specified key. If the key is an integer,
   * the value is gently inserted into the array at that key, shifting the values
   * with higher indices further down the array.
   * @param {Array} array the array to add an entry
   * @param {Object} key the key to add
   * @param {Object} value the value to add
   */
  adf.mf.api.AdfCollections.addArrayKey = function(
    array,
    key,
    value)
  {
    var index = parseInt(key);

    if (isNaN(index))
    {
      array[key] = value;
    }
    else
    {
      array.splice(index, 0, value);
    }
  };

  /**
   * Returns the index of the object in the array, or -1 if the array does not
   * contain the object.
   * @param {Array} array the array
   * @param {Object} object the object to look up
   * @return {Number} the first index found
   */
  adf.mf.api.AdfCollections.indexOf = function(
    array,
    object)
  {
    AdfAssert.assertArrayOrNull(array);

    if (!array)
      return -1;

    var index = -1;
    var arraySize = array.length;

    for (var i=0; i < arraySize; i++)
    {
      if (array[i] == object)
      {
        index = i;
        break;
      }
    }

    return index;
  };

  /**
   * Returns the last index of the object in the array, or -1 if the array does
   * not contain the object.
   * @param {Array} array the array
   * @param {Object} object the object to look up
   * @return {Number} the last index found
   */
  adf.mf.api.AdfCollections.lastIndexOf = function(
    array,
    object)
  {
    AdfAssert.assertArrayOrNull(array);

    if (!array)
      return -1;

    var index = -1;
    var arraySize = array.length;

    for (var i=arraySize-1; i >= 0; i--)
    {
      if (array[i] == object)
      {
        index = i;
        break;
      }
    }

    return index;
  };

})();
/* Copyright (c) 2008, 2013, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------- */
/* ------------------ base-object.js --------------------- */
/* ------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

(function()
{
  /**
   * Base class of all ADF Objects.
   * <p>
   * To create a subclass of another adf.mf.api.AdfObject, use adf.mf.api.AdfObject.createSubclass.
   * The subclass can specify class-level initialization by implementing an
   * <code>InitClass()</code> method on its constructor. <code>InitClass</code>
   * is guaranteed to be called only once per class. Further, a class'
   * <code>InitClass</code> method is guranteed to be called only after its
   * superclass' class initialization has been called. When <code>InitClass</code>
   * is called, <code>this</code> is the class' constructor. This allows class
   * initialization implementations to be shared in some cases.
   * </p>
   */
  function AdfObject()
  {
    this.Init();
  };
  /** @constructor */
  adf.mf.api.AdfObject = AdfObject;

  adf.mf.api.AdfObject.superclass = null;

  // regular expressicloneon for stripping out the name of a function
  adf.mf.api.AdfObject._GET_FUNCTION_NAME_REGEXP = /function\s+([\w\$][\w\$\d]*)\s*\(/;
  // adf.mf.api.AdfObject._TRIM_REGEXP = /(^\s*)|(\s*$)/g; this.replace(/(^\s*)|(\s*$)/g, "");

  adf.mf.api.AdfObject.prototype = new Object();
  adf.mf.api.AdfObject.prototype.constructor = adf.mf.api.AdfObject;

  /**
   * Factory method for creating a subclass of the specified baseClass
   * @param {function} extendingClass The class to extend from the base class
   * @param {function} baseClass class to make the superclass of extendingClass
   * @param {(string|undefined)} typeName The type name to use for new class. If not specified, the typeName will be
   *                           extracted from the baseClass's function if possible
   * @param {(Object|undefined)} classInitializationState Class initialization parameter to pass to class initializer
   */
  adf.mf.api.AdfObject.createSubclass = function(
    extendingClass,
    baseClass,
    typeName,
    classInitializationState)
  {
    adf.mf.api.AdfAssert.assertFunction(extendingClass);
    adf.mf.api.AdfAssert.assertFunctionOrNull(baseClass);
    adf.mf.api.AdfAssert.assertStringOrNull(typeName);

    if (baseClass == undefined)
    {
      // assume adf.mf.api.AdfObject
      baseClass = adf.mf.api.AdfObject;
    }

    adf.mf.api.AdfAssert.assert(extendingClass != baseClass, "Class can't extend itself");

    if (typeName == undefined)
    {
      // assume adf.mf.api.AdfObject
      baseClass = "IllegalSubclass";
      adf.mf.api.AdfAssert.assert(false, "adf.mf.api.AdfObject.createSubclass requires that you provide the name of your new class");
    }


    // use a temporary constructor to get our superclass as our prototype
    // without out having to initialize the superclass
    var tempConstructor = adf.mf.api.AdfObject._tempSubclassConstructor;

    tempConstructor.prototype = baseClass.prototype;
    extendingClass.prototype = new tempConstructor();

    extendingClass.prototype.constructor = extendingClass;
    extendingClass.superclass = extendingClass["superclass"] = baseClass.prototype;

    if (typeName)
      extendingClass._typeName = typeName;

    // temporarily store the state on the constructor until the class is initialized
    if (classInitializationState !== undefined)
      extendingClass._classInitializationState = classInitializationState;
  };

  /**
   * Private implementation.
   * Temporary constructor used to assign the correct prototype to subclasses.
   * @private
   */
  adf.mf.api.AdfObject._tempSubclassConstructor = function()
  {
  };

  /**
   * Delegates to goog.export() for exporting a symbol with Closure compiler,
   * while recoreding a map of the renamed names to an original names and a map of original names to the renamed names.
   * @param {string} name the name of the property ('CCCC.prototype.FFFF' is expected)
   * @param {Object} valueMapping a name-value pair, where tke key is the renamed name (renamed FFFF),
   *                              and the value is the refernce to the member function whose name was exported
   */
  adf.mf.api.AdfObject.exportPrototypeSymbol = function(name, valueMapping)
  {
    var renamed = null;
    var val = null;
    for (var prop in valueMapping)
    {
      renamed = prop;
      val = valueMapping[prop];
      break;
    }

    var tokens = name.split('.');

    var constructor = window[tokens[0]];
    var original = tokens[2];

    // Do nothing if we are exporting a function that has not been renamed
    if (renamed == original)
    {
      return;
    }

    var renameMap = constructor._r2o;
    if (!renameMap)
    {
       renameMap = new Object();
       constructor._r2o = renameMap;
    }

    renameMap[renamed] = original;

    if (goog)
      goog.exportSymbol(name, val);
  };

  /**
   * Get the class for an object.
   * @param {Object} otherInstance optional other object to use
   * @return {Object} the class of or null if the class cannot be found
   * @final
   */
  adf.mf.api.AdfObject.prototype.getClass = function(
    otherInstance)
  {
    if (otherInstance == undefined)
      otherInstance = this;
    else if (otherInstance == null)
    {
      return null;
    }

    return otherInstance["constructor"];
  };

  /**
   * Adopt the properties of another object as our own.
   * @param {Object} theRawObject the other object
   */
  adf.mf.api.AdfObject.prototype.adopt = function(
    theRawObject)
  {
    adf.mf.api.AdfCollections.copyInto(this, theRawObject);
  };

  /**
   * Returns a clone of this object. The default implementation is a shallow
   * copy. Subclassers can override this method to implement a deep copy.
   * @return {Object} a new shallow copy of this object
   */
  adf.mf.api.AdfObject.prototype.clone = function()
  {
    var clone = new this.constructor();

    adf.mf.api.AdfCollections.copyInto(clone, this);

    return clone;
  };

  /**
   * Get a string representation of this object instance.
   * It is not guaranteed to be unique or interesting.
   * @return {String} a string representation of this object instance
   */
  adf.mf.api.AdfObject.prototype.toString = function()
  {
    return this.toDebugString();
  };

  /**
   * Get a debug string representation of this object instance.
   * It is not guaranteed to be unique or of a standard format.
   * @return {String} a debug string representation of this object instance
   */
  adf.mf.api.AdfObject.prototype.toDebugString = function()
  {
    return this.getTypeName() + " Object";
  };

  /**
   * Returns the type name for a class derived from adf.mf.api.AdfObject
   * @param {!function} clazz Class to get the name of
   * @return {string} name of the Class
   */
  adf.mf.api.AdfObject.getTypeName = function(clazz)
  {
    adf.mf.api.AdfAssert.assertFunction(clazz);

    var typeName = clazz._typeName;

    if (typeName == null)
    {
      var constructorText = clazz.toString();
      var matches = adf.mf.api.AdfObject._GET_FUNCTION_NAME_REGEXP.exec(constructorText);

      // If the class is initialized via an anonymous function (e.g. due to the closure compiler), the
      // match function above will not find any matches.  So if there is no matches we assume AdfObject.
      // We also avoid this problem when we createSubclass is called because we now require that a type
      // name be explicitly provided.
      if (matches == null)
      {
        typeName = "adf.mf.api.AdfObject";
      }
      else
      {
        typeName = matches[1];
      }

      // cache the result on the function
      clazz._typeName = typeName;
    }

    return typeName;
  };

  /**
   * Returns the type name for this instance
   * @return {String} name of the Class
   * @final
   */
  adf.mf.api.AdfObject.prototype.getTypeName = function()
  {
    return adf.mf.api.AdfObject.getTypeName(this.constructor);
  };

  /**
   * Initializes the instance. Subclasses of adf.mf.api.AdfObject must call
   * their superclass' Init.
   * @protected
   */
  adf.mf.api.AdfObject.prototype.Init = function()
  {
    if (adf.mf.api.AdfAssert.DEBUG)
      adf.mf.api.AdfAssert.assert(this["getTypeName"], "Not an adf.mf.api.AdfObject");

    // do any class initialization. This code is duplicated from
    // adf.mf.api.AdfObject.ensureClassInitialization()

    var currClass = this.constructor;
    if (!currClass._initialized)
      adf.mf.api.AdfObject._initClasses(currClass);
  };

  /**
   * Ensures that a class is initialized. Although class initialization occurs
   * by default the first time that an instance of a class is created, classes that
   * use static factory methods to create their instances (e.g. AdfKeyStroke) may
   * still need to ensure that their class has been initialized when the factory
   * method is called.
   * @param {function} clazz The class to ensure initialization of
   */
  adf.mf.api.AdfObject.ensureClassInitialization = function(clazz)
  {
    adf.mf.api.AdfAssert.assertFunction(clazz);

    if (!clazz._initialized)
      adf.mf.api.AdfObject._initClasses(clazz);
  };

  /**
   * Returns the specified Map property value. If createIfNonexistent is true and
   * the property doesn't exist, an empty Object will be created, and returned.
   * @param {Object} key the key for the property
   * @param {boolean} createIfNonexistent true if a new empty Object should be created and associated
   * @param {Object} otherInstance another object to use instead of this object
   * @return {Object} the property value associated with the given key
   * @protected
   */
  adf.mf.api.AdfObject.prototype.GetLazyMapProperty = function(
    key,
    createIfNonexistent,
    otherInstance)
  {
    if (otherInstance == undefined)
      otherInstance = this;

    var value = otherInstance[key];

    if ((value == undefined) && createIfNonexistent)
    {
      value = new Object();
      otherInstance[key] = value;
    }

    return value;
  };

  /**
   * Returns the specified array property. If createIfNonexistent is true and
   * the property doesn't exist, it will be created, and returned.
   * @param {Object} key the key for the property
   * @param {boolean} createIfNonexistent true if a new empty Array should be created and associated
   * @param {Array} otherInstance another object to use instead of this object
   * @return {Object} the property value associated with the given key
   * @protected
   */
  adf.mf.api.AdfObject.prototype.GetLazyArrayProperty = function(
    key,
    createIfNonexistent,
    otherInstance)
  {
    if (otherInstance == undefined)
      otherInstance = this;

    var value = otherInstance[key];

    if ((value == undefined) && createIfNonexistent)
    {
      value = new Array();
      otherInstance[key] = value;
    }

    return value;
  };

  /**
   * Indicates whether some other adf.mf.api.AdfObject is "equal to" this one.
   * Method is equivalent to java ".equals()" method.
   * @param {Object} object the object to compare with
   * @return {boolean} whether the objects are "equal"
   */
  adf.mf.api.AdfObject.prototype.equals = function(
    object)
  {
    return this === object;
  };

  /**
   * Creates a function instance that will call back the passed in function
   * with the current "this". This is extremely useful for creating callbacks.
   * @param {function} func the function to proxy
   * @return {function} the proxied function
   */
  adf.mf.api.AdfObject.prototype.createCallback = function(func)
  {
    adf.mf.api.AdfAssert.assertFunction(func);
    var funcName = func[adf.mf.api.AdfAssert.FUNC_NAME_PROPERTY];

    // =-=  bts theoretically, we could call the same code we use
    //          to generate the FUNC_NAME_PROPERTY in the first place
    //          if this property isn;t set/
    adf.mf.api.AdfAssert.assertString(funcName);

    // create a function that sets up "this" and delegates all of the parameters
    // to the passed in function
    var proxyFunction = new Function(
      "var f=arguments.callee; return f._func.apply(f._owner, arguments);");

    // attach ourselves as "this" to the created function
    proxyFunction["_owner"] = this;

    // attach function to delegate to
    proxyFunction["_func"] = func;

    return proxyFunction;
  };

  /**
   * Convenience function for creating an Object initialized with key values pairs
   * as alternating parameters. All of the even parameters must be keys
   * represented as Strings, with the odd parameters, their values.
   * @param {...Object} args a series of key and value pairs
   * @return {Object} the new object
   */
  adf.mf.api.AdfObject.createInitializedObject = function()
  {
    var argCount = arguments.length;

    adf.mf.api.AdfAssert.assert(argCount % 2 == 0, "every key must have a value");

    var newObject = new Object();

    for (var i = 0; i < argCount; i++)
    {
      var currKey = arguments[i];
      adf.mf.api.AdfAssert.assertString(currKey);

      // move to value
      i++;

      // assign key/value pair
      newObject[currKey] = arguments[i];
    }

    return newObject;
  };

  /**
   * Private implementation.
   * Apply class and function name properties to the functions of an Object. This
   * is used to set up the functions so that we can get accurate stack traces.
   * @param {Object} target the target prototype or class
   * @param {string} className the class name to associate with the functions
   * @private
   */
  adf.mf.api.AdfObject._applyFunctionProperties = function(
    target,
    className)
  {
    var funcNameProperty = adf.mf.api.AdfAssert.FUNC_NAME_PROPERTY;
    var classNameProperty = adf.mf.api.AdfAssert.CLASS_NAME_PROPERTY;

    for (currPropName in target)
    {
      var currProp = target[currPropName];

      if ((typeof currProp) == "function")
      {
        // we only care about methods defined on our object
        if (!currProp.hasOwnProperty(funcNameProperty))
        {
          currProp[funcNameProperty] = currPropName;
          currProp[classNameProperty] = className;
        }
      }
    }
  };

  /**
   * Private implementation.
   * Perform any class-level initializtion. Uninitialized superclasses will
   * be initialized before their subclasses.
   * @param {Object} currClass the class
   * @private
   */
  adf.mf.api.AdfObject._initClasses = function(currClass)
  {
    if (adf.mf.api.AdfAssert.DEBUG)
    {
      adf.mf.api.AdfAssert.assertFunction(currClass);
      adf.mf.api.AdfAssert.assert(!currClass._initialized);
    }

    currClass._initialized = true;

    var superclass = currClass.superclass;

    // initialize the superclass if necessary
    if (superclass)
    {
      var superclassConstructor = superclass.constructor;

      if (superclassConstructor && !superclassConstructor._initialized)
        adf.mf.api.AdfObject._initClasses(superclassConstructor);

      adf.mf.api.AdfObject._applyRenamesToSubclass(currClass);
    }

    var typeName = adf.mf.api.AdfObject.getTypeName(currClass);

    try
    {
      // if the class has an initialization function, call it
      var InitClassFunc = currClass.InitClass;

      // Check for the quoted name in case InitClass is renamed by Closure compiler
      if (!InitClassFunc)
      {
        InitClassFunc = currClass["InitClass"];
      }

      if (InitClassFunc)
      {
        var initializationState = currClass._classInitializationState

        InitClassFunc.call(currClass, initializationState);

        // clean up
        if (initializationState !== undefined)
        {
          delete currClass._classInitializationState;
        }
      }
    }
    finally
    {
      // set names on all of the functions so that we can pick them up for
      // stack dumps. By the time the subclasses have inited, we should
      // have all of our functions
      if (adf.mf.api.AdfAssert.DEBUG)
      {
        // apply the stack information to our instance's instance methods
        adf.mf.api.AdfObject._applyFunctionProperties(currClass.prototype, typeName);

        // apply the stack information to our class's static methods
        adf.mf.api.AdfObject._applyFunctionProperties(currClass, "static " + typeName);
      }
    }
  };

  /**
   * Private implementation.
   * Used to ensure that public and protected API methods renamed by Closure Compiler in advanced mode can be overridden by this subclass,
   * and can be called from both inside and outside of the framework.
   * This means that each method renamed in a superclass has to be available by both its short (renamed) name and the original name in
   * the current class.
   * @param {Object} currClass the class
   * @private
   */
  adf.mf.api.AdfObject._applyRenamesToSubclass = function(currClass)
  {
    // Check whether any renames actually happened
    if (!adf.mf.api.AdfObject._r2o)
    {
      return;
    }
    var ancestor = currClass.superclass;
    adf.mf.api.AdfObject._applyRenamesFromChain(currClass, ancestor, ancestor);
  };

  /**
   * Private implementation.
   * Applies renames for the _applyRenamesToSubclass function.
   * @param {Object} currClass the class
   * @param {Object} superclass a superclass to start the chain of renames
   * @param {Object} immediateSuperclass the superclass to stop the chain of renames
   * @private
   */
  adf.mf.api.AdfObject._applyRenamesFromChain = function(currClass, superclass, immediateSuperclass)
  {
    if (!superclass)
    {
      return;
    }

    var ancestor = superclass.constructor;

    // Recurse up the inheritance chain first
    adf.mf.api.AdfObject._applyRenamesFromChain(currClass, ancestor.superclass, immediateSuperclass);

    var renameMap = ancestor._r2o;
    if (renameMap)
    {
      for (var alias in renameMap)
      {
        var orig = renameMap[alias];
        if (alias != orig)
        {
          var prot = currClass.prototype;
          if (!adf.mf.api.AdfObject._isPrototypePropertyLocallySet(prot, immediateSuperclass, alias) &&
              adf.mf.api.AdfObject._isPrototypePropertyLocallySet(prot, immediateSuperclass, orig))
          {
            prot[alias] = prot[orig];
          }
          else if (!adf.mf.api.AdfObject._isPrototypePropertyLocallySet(prot, immediateSuperclass, orig) &&
                   adf.mf.api.AdfObject._isPrototypePropertyLocallySet(prot, immediateSuperclass, alias))
          {
            prot[orig] = prot[alias];
          }
        }
      }
    }
  };

  /**
   * Private implementation.
   * Determine whether a prototype property is locally set.
   * @param {Object} currClassPrototype the current class prototype
   * @param {Object} superclassPrototype the superclass prototype
   * @param {Object} prop the property
   * @return {boolean} whether the property is defined on the current class prototype and not equal to one of the same name on the superclass
   * @private
   */
  adf.mf.api.AdfObject._isPrototypePropertyLocallySet = function(currClassPrototype, superclassPrototype, prop)
  {
    return (currClassPrototype[prop] && !(currClassPrototype[prop] === superclassPrototype[prop]));
  };

})();
/* Copyright (c) 2011, 2014, Oracle and/or its affiliates. All rights reserved. */
/* -------------------------------------------------------- */
/* ------------------- base-adfel.js ---------------------- */
/* -------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

// ======= Resource File Utilities =======
(function()
{
  /** @namespace */
  adf.mf.api.resourceFile = {};

  /**
   * Internal function for loading JS files
   * @param {string} resourceName the resource to load
   * @param {boolean} async whether the request should be asynchronous
   * @param {function} successCB the JS could be parsed
   * @param {function} errorCB the JS could not be parsed
   * @param {function} filterCB the optional filter function that can change the response text before it is used
   */
  adf.mf.api.resourceFile.loadJsFile = function(resourceName, async, successCB, errorCB, filterCB)
  {
    if (filterCB == null)
    {
      // Can let the page load it without filtering:
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.src = resourceName;
      script.async = async;
      script.onload = successCB;
      script.onerror = errorCB;
      head.appendChild(script);
    }
    else
    {
      // Must filter the response text:
      adf.mf.api.resourceFile._loadFileWithAjax(
        resourceName,
        async,
        function(responseText)
        {
          if ((responseText != null) && (responseText.length > 0))
          {
            // Filter it:
            var result = filterCB(responseText);

            // Execute it:
            try
            {
              (new Function(result))();
              successCB();
            }
            catch (problem)
            {
              console.log(resourceName);
              console.log(problem);
              errorCB(problem);
            }
          }
          else
          {
            errorCB("Empty response");
          }
        },
        errorCB);
    }
  };

  /**
   * Internal function for loading JSON files
   * @param {string} resourceName the resource to load
   * @param {boolean} async whether the request should be asynchronous
   * @param {function} successCB the JSON could be parsed
   * @param {function} errorCB the JSON could not be parsed
   */
  adf.mf.api.resourceFile.loadJsonFile = function(resourceName, async, successCB, errorCB)
  {
    // Load the json:
    adf.mf.api.resourceFile._loadFileWithAjax(
      resourceName,
      async,
      function(responseText)
      {
        if ((responseText != null) && (responseText.length > 0))
        {
          if (JSON)
          {
            try
            {
              var result = JSON.parse(responseText);
              successCB(result);
            }
            catch (problem)
            {
              errorCB("JSON failure: " + problem);
            }
          }
          else
          {
            errorCB("Browser is unable to parse the JSON text because it does not support JSON.parse()");
          }
        }
        else
        {
          errorCB("Empty response");
        }
      },
      errorCB);
  };

  /**
   * Internal function for loading files over an AJAX get.
   * @param {string} resourceName the resource to load
   * @param {boolean} async whether the loading should be asynchronous
   * @param {function} successCB the resource could be retrieved
   * @param {function} errorCB the resource could not be retrieved
   * @private
   */
  adf.mf.api.resourceFile._loadFileWithAjaxRaw = function(resourceName, async, successCB, errorCB)
  {
    var request = new XMLHttpRequest();

    if (async)
    {
      request.onreadystatechange = function()
      {
        if (request.readyState == 4)
        {
          successCB(request);
          return;
        }
      }
    }

    request.open("GET", resourceName, async);
    request.send(null);

    if (!async)
    {
      if (request.readyState == 4)
      {
        successCB(request);
        return;
      }

      errorCB(null);
    }
  };

  /**
   * Internal function for loading files over an AJAX get.
   * @param {string} resourceName the resource to load
   * @param {boolean} async whether the loading should be asynchronous
   * @param {function} successCB the JSON could be parsed
   * @param {function} errorCB the JSON could not be parsed
   * @private
   */
  adf.mf.api.resourceFile._loadFileWithAjax = function(resourceName, async, successCB, errorCB)
  {
    adf.mf.api.resourceFile._loadFileWithAjaxRaw(resourceName, async,
      function(request){
        successCB(request.responseText);
      },
      function(request){
        errorCB("No response");
      });
  };
})();

// ======= URL Loading and Locale setting =======
(function()
{
  // Define the URL loading functions (e.g. getting query string parameters):

  /**
   * Official mechanism for accessing the query string portion of the page's URL.
   * @return {string} the non-null (though possibly empty string) query string of the page
   */
  adf.mf.api.getQueryString = function()
  {
    // NOTE:
    // This uses AdfmfCallback.getQueryString() when document.location.search is empty to work around Android 3.0+ WebView.loadUrl bugs.

    // Known query parameters:
    //  _________ PARAM _________  _____ FILE _____  ________________________________ MEANING ________________________________
    //  amx_dtfolderpath           amx-core.js       Unknown; some kind of path modifier for file and/or featureRoot
    //  amx_dtmode                 adfc-mobile.js    Whether displaying in a design time preview pane (TODO remove this one?)
    //  amx_dtmode                 base-core.js      Whether displaying in a design time preview pane
    //  appStartTime               AdfPerfTiming.js  Unknown
    //  dir                        base-core.js      User reading direction for the documentElement (rendering/skinning)
    //  featureRoot                adfc-mobile.js    Unknown; some kind of "feature root"
    //  file                       adfc-mobile.js    Unknown; some kind of "entry point document path"
    //  lang                       base-core.js      User language for the documentElement (rendering/skinning)
    //  locale                                       User locale for the documentElement (converters/rendering)
    //  useBruceWay                amx-core.js       Unsupported way to toggle internal client state storage mechanisms
    //  webviewStartTime           AdfPerfTiming.js  Unknown
    //
    // Note mock data is triggered by (typeof adf.pg === "undefined" aka adf.mf.device.integration.js not being loaded)
    // but would be nice if it were triggered otherwise.

    if (document.location.search && document.location.search != "")
    {
      // non-null & non-empty:
      return document.location.search;
    }

    if (window['AdfmfCallback'] != null)
    {
      var callbackResult = window.AdfmfCallback.getQueryString();
      if (callbackResult != null)
      {
        // non-null:
        return callbackResult;
      }
    }

    // just return the value of the search variable:
    var result = document.location.search;
    if (result == null)
      return ""; // non-null
    return result; // possibly blank
  }

  /**
   * Extract a parameter value from the query string.
   * @param {string} queryString the non-null query string portion of the page's URL
   * @param {string} paramName the name of the parameter to access
   * @param {string} defaultWhenNullOrBlank an optional unescaped value to return if the value is null or blank
   * @return {string} the unescaped (possibly null) corresponding value for the specified parameter
   */
  adf.mf.api.getQueryStringParamValue = function(queryString, paramName, defaultWhenNullOrBlank)
  {
    var result = null;
    if ((queryString != null) && (paramName != null))
    {
      // Find out where the parameter value begins within the queryString.
      var startIndex = queryString.indexOf("?" + paramName + "=");
      if (startIndex < 0) // not found
      {
        startIndex = queryString.indexOf("&" + paramName + "=");
      }

      if (startIndex >= 0) // param is possibly present
      {
        // Find out where the parameter and value end within the queryString.
        var endIndex = queryString.indexOf('&', startIndex + 1);
        if (endIndex < 0) // no ending
        {
          endIndex = queryString.length;
        }

        // Get the substring.
        var value = queryString.substring(startIndex, endIndex);

        // Find the equals sign.
        var start2 = value.indexOf('=');
        if ((start2 >= 0) && (start2 < value.length))
        {
          result = value.substring(start2 + 1);
          if (result.length == 0)
          {
            result = null;
          }
        }
      }
    }

    if (result != null)
      result = unescape(result);

    if (result == null || result == "")
    {
      if (defaultWhenNullOrBlank !== undefined)
      {
        // a default was provided so use it:
        return defaultWhenNullOrBlank;
      }
    }

    // Might be null, might be blank, might be a real value:
    return result;
  };
})();

// ======= Locale Utilities =======
(function()
{
  /**
   * Set up the lang and dir on the document.
   */
  adf.mf.internal.locale.init = function()
  {
    if (adf.mf.internal.locale.initStarted)
      return; // prevent re-entry
    adf.mf.internal.locale.initStarted = true;

    // Apply the HTML[dir], HTML[lang], and document.dir based on some defaults or via the query string.
    var theLang = null;
    var locale = null;

    // Come up with a browser-based or hard-coded default for "lang":
    if (theLang == undefined)
    {
      try
      {
        // Internet Explorer way:
        theLang = window.navigator.userLanaguage;
      }
      catch(e)
      {
        // do nothing; we will try other mechanisms
      }
    }
    if (theLang == undefined)
    {
      try
      {
        // Standard way:
        theLang = window.navigator.language;
      }
      catch(e)
      {
        // do nothing; we will try other mechanisms
      }
    }

    if (theLang == undefined)
    {
      // default to "en":
      theLang = "en";
    }

    // Come up with a browser-based or hard-coded default for "dir":
    var theDir = document.dir; // generally this is empty, not undefined or null
    if (theDir == "")
      theDir = "ltr"; // default to LTR

    // The container might override the default lang and dir so we need to use them if provided:
    var queryString = adf.mf.api.getQueryString();
    var theLang = adf.mf.api.getQueryStringParamValue(queryString, "lang", theLang);
    var theDir = adf.mf.api.getQueryStringParamValue(queryString, "dir", theDir);

    // The Oracle translations team does not want to support Chinese zh-Hans
    // and zh-Hant so we have to force them to be zh-CN and zh-TW respectively:
    if (theLang == "zh-Hans")
      theLang = "zh-CN";
    else if (theLang == "zh-Hant")
      theLang = "zh-TW";

    // Set the properties that the rest of the framework will use
    // (e.g. via skinning or JavaScript access)
    var documentElement = document.documentElement
    documentElement.setAttribute("lang", theLang);
    documentElement.setAttribute("dir", theDir);
    document.dir = theDir;

    // Configure the locale, defaulting to the language
    locale = adf.mf.api.getQueryStringParamValue(queryString, "locale", theLang);
    documentElement.setAttribute("data-maf-locale", locale);
  };

  adf.mf.internal.locale.splitLocale = function(locale)
  {
    var ret   = [null,null,null];
    var start = 0;
    var end   = locale.indexOf("_");

    if (end != -1)
    {
      ret[0] = locale.substring(start, end);
    }
    else
    {
      ret[0] = locale;
      return ret;
    }
    start = ++end;
    end   = locale.indexOf("_", start);
    if (end != -1)
    {
      ret[1] = locale.substring(start, end);
    }
    else
    {
      ret[1] = locale.substring(start);
      return ret;
    }

    start  = ++end;
    ret[2] = locale.substring(start);

    return ret;
  };

  adf.mf.locale.getUserLanguage = function()
  {
    var lang = document.documentElement.getAttribute("lang");
    if (lang == null)
    {
      alert("Illegal use of language API prior to \"showpagecomplete\" event.");
    }
    return lang;
  };

  adf.mf.locale.getUserLocale = function()
  {
    var locale = document.documentElement.getAttribute("data-maf-locale");

    if (locale == null)
    {
      alert("Illegal use of locale API prior to \"showpagecomplete\" event.");
    }

    return locale;
  };

  adf.mf.locale.getJavaLanguage = function(/* String */ javascriptLang)
  {
    // default to the user language if no language is passed in
    if (javascriptLang == null)
    {
      javascriptLang = getUserLanguage();
    }

    // look for first dash, the territory appears after the dash
    var territoryIndex = javascriptLang.indexOf("-", 0);

    // no dash found, so the name is just a language;
    if (territoryIndex == -1)
      return javascriptLang;

    var inLength = javascriptLang.length;
    var javaLang = javascriptLang.substring(0, territoryIndex);

    javaLang += "_";

    territoryIndex++;

    var variantIndex = javascriptLang.indexOf("-", territoryIndex);

    if (variantIndex == -1)
    {
      // we have no variant
      variantIndex = inLength;
    }

    var territoryString = javascriptLang.substring(territoryIndex,
        variantIndex);

    javaLang += territoryString.toUpperCase();

    // we have a variant, so add it
    if (variantIndex != inLength)
    {
      javaLang += "_";
      javaLang += javascriptLang.substring(variantIndex + 1, inLength);
    }

    return javaLang;
  };

  adf.mf.locale.generateLocaleList = function(locale, useVariant)
  {
    var localeJava  = adf.mf.locale.getJavaLanguage(locale); // will convert "-" to "_"
    var localeArray = adf.mf.internal.locale.splitLocale(localeJava);
    var language    = localeArray[0];
    var country     = localeArray[1];
    var variant     = localeArray[2];
    var localeList  = [];

    if (locale.indexOf("en") != 0)
    {
      localeList.push("en-US");
    }

    if (language != null)
    {
      localeList.push(language);

      if (country != null)
      {
        localeList.push(language+"-"+country);

        if (variant != null && useVariant)
        {
          localeList.push(language+"-"+country+"-"+variant);
        }
      }
    }
    return localeList;
  };
})();

// ======= Resource Utilities =======
(function()
{
  // define the names of the 2 known message bundles here
  adf.mf.resource.ADFErrorBundleName = "ADFErrorBundle";
  adf.mf.resource.ADFInfoBundleName  = "ADFInfoBundle";

  /**
   * PUBLIC FUNCTION used to load the message bundles.
   *
   * @param {string} baseUrl - path to the resource bundle
   * @param {string} loadMessageBundleCallback - name of the callback method to load the message bundles
   * @return {void}
   */
  adf.mf.resource.loadADFMessageBundles = function(baseUrl, localeList)
  {
    adf.mf.resource.loadMessageBundle(adf.mf.resource.ADFInfoBundleName, baseUrl,  localeList.slice(0));
    adf.mf.resource.loadMessageBundle(adf.mf.resource.ADFErrorBundleName, baseUrl, localeList.slice(0));
    adf.mf.resource.adfMessageBundlesLoaded = true;
  };

  /**
   * loadMessageBundle is used to load all the locale message bundles declared in the locales
   * from the given base location and base name.
   *
   * @param bundleName is the name of the bundle (i.e. "ADFErrorBundle")
   * @param baseUrl    is the base location for the bundle
   * @param languages  is the list of languages to load
   **/
  adf.mf.resource.loadMessageBundle = function(bundleName, baseUrl, languages)
  {
    var languages = languages || [adf.mf.locale.getUserLanguage()];

    var callback = function(language)
    {
      if (language === null)
      {
        if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.WARNING))
        {
          /* NOTE: can not use a resource string since it might not be loaded. */
          adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, "adf.mf.resource",
            "loadMessageBundle", "Failed to load " + bundleName);
        }
      }
      else
      {
        if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.INFO))
        {
          /* NOTE: can not use a resource string since it might not be loaded. */
          adf.mf.log.Framework.logp(adf.mf.log.level.INFO, "adf.mf.resource",
            "loadMessageBundle", "Loaded message bundle " + bundleName + " for language " +
            language);
        }
      }
    };

    var isMessageBundleLoaded = function(language)
    {
      return (adf.mf.resource[bundleName] !== undefined);
    };

    adf.mf.internal.resource.loadGenericMessageBundle(bundleName, baseUrl, languages,
      isMessageBundleLoaded, callback);
  };

  /**
   * PUBLIC FUNCTION used to grab a string from a message resource bundle
   *
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.resource.getInfoString = function(bundleName, key)
  {
    var args = Array.prototype.slice.call(arguments, 2);
    return adf.mf.internal.resource.getResourceStringImpl(bundleName, key, args);
  };

  /**
   * PUBLIC FUNCTION used to grab the ID of an error message in a resource bundle
   *
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.resource.getErrorId = function(bundleName, key)
  {
    return adf.mf.internal.resource.getResourceStringImpl(bundleName, key + "__ID");
  };

  /**
   * PUBLIC FUNCTION used to grab the CAUSE of an error message in a resource bundle
   *
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.resource.getErrorCause = function(bundleName, key)
  {
    var args = Array.prototype.slice.call(arguments, 2);
    return adf.mf.internal.resource.getResourceStringImpl(bundleName, key + "_CAUSE", args);
  };

  /**
   * PUBLIC FUNCTION used to grab the ACTION of an error message in a resource bundle
   *
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.resource.getErrorAction = function(bundleName, key)
  {
    var args = Array.prototype.slice.call(arguments, 2);
    return adf.mf.internal.resource.getResourceStringImpl(bundleName, key + "_ACTION", args);
  };

  /* internal functions */

  adf.mf.internal.resource.loadJavaScript = function(url, success, failure)
  {
    var filterFunction = function(responseText)
    {
      // Permit debugging of the source (currently only works in firebug, google chrome and webkit nightly).
      // Also note that using a filter function to load the JS file requires the file doesn't use any implicit
      // window variables/functions (it is good practice anyhow to avoid implicit code).
      responseText += "\n//# sourceURL=" + url;

      // Fixes for ambiguous script files:

      // a.) Convert var LocaleSymbols to window.var LocaleSymbols
      responseText = responseText.replace(/var LocaleSymbols/, "window.LocaleSymbols");

      // b.) Convert TrMessageFactory._TRANSLATIONS= to window.TrMessageFactory._TRANSLATIONS=
      responseText = responseText.replace(/TrMessageFactory\.\_TRANSLATIONS\=/, "window.TrMessageFactory._TRANSLATIONS=");

      return responseText;
    };
    adf.mf.api.resourceFile.loadJsFile(
      url,
      false,
      success,
      failure,
      filterFunction);
  };

  adf.mf.internal.resource.loadJavaScriptByLocale = function(locales, getURLFunction, predicate, callback)
  {
    if (locales.length == 0)
    {
      callback(null);
      return;
    }
    var locale  = locales.pop();
    var url     = getURLFunction(locale);
    var failure = function()
    {
      // for this low-level method, always send in the english string
      if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.WARNING))
      {
        var droot = document.location.pathname;
        var root  = droot.substring(0, droot.lastIndexOf('/'));
        adf.mf.log.Framework.logp(adf.mf.log.level.WARNING,
            "adf.mf.internal.resource", "loadJavaScriptByLocale", "Failed to load " + url + " from " + root);
      }
      /* hmm this locale did not work, recurse and see if the next one works */
      adf.mf.internal.resource.loadJavaScriptByLocale(locales, getURLFunction, predicate, callback);
    };
    var success = function()
    {
      if (predicate(locale))
      {
        // for this low-level method, always send in the english string
        if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.INFO))
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.INFO,
              "adf.mf.internal.resource", "loadJavaScriptByLocale", "Loaded " + url);
        }
        callback(locale);
      }
      else
      {
        failure();
      }
    };

    if(adf.mf.log.Framework.isLoggable(adf.mf.log.level.FINER))
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINER,
                                "adf.mf.internal.resource", "loadJavaScriptByLocale",
                                "url: " + url + " locales: " + adf.mf.internal.log.getStringifedIfNeeded(locales));
    }
    adf.mf.internal.resource.loadJavaScript(url, success, failure);
  };

  /**
   * loadGenericMessageBundle is used to load all the locale message bundles declared in the locales
   * from the given base location and base name.
   *
   * @param bundleName is the name of the bundle (i.e. "ADFErrorBundle")
   * @param baseUrl    is the base location for the bundle
   * @param languages  is the list of languages to load
   */
  adf.mf.internal.resource.loadGenericMessageBundle = function(
    bundleName,
    baseUrl,
    languages,
    isMessageBundleLoaded,
    callback)
  {
    var getMessageBundleUrl = function(language)
    {
      var url = baseUrl + "/resource/" + bundleName;

      if (language.indexOf("en") == 0)
      {
        return url + ".js";
      }

      return url + "_" + adf.mf.locale.getJavaLanguage(language) + ".js";
    };

    adf.mf.internal.resource.loadJavaScriptByLocale(languages, getMessageBundleUrl,
      isMessageBundleLoaded, callback);
  };

  /**
   * PRIVATE FUNCTION used to grab a string from a resource bundle.
   *
   * @param {string} level - the level of the log message; for example: WARNING, SEVERE
   * @param {string} methodName - the name of the method where we're logging the message from
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   * @param {string} args - extra arguments passed in; for example an exception name, or another parameter
   */
  adf.mf.internal.resource.logResourceImpl = function(level, methodName, bundleName, key, args)
  {
    if (adf.mf.log.Framework.isLoggable(level))
    {
      adf.mf.log.Framework.logp(level, "adf", methodName,
          adf.mf.internal.resource.getResourceStringImpl(bundleName, key, args));
    }
  };

  /**
   * PRIVATE FUNCTION used to grab a string from a resource bundle. Start looking in the bundle that most
   * specifically matches the locale, and subsequently look in more general bundles, until the key is
   * found, or there are no more bundles to check.  For a bundle name of "AMXInfoBundle", with locale of
   * "zh_TW", the names of the bundles checked, in order, would be: "AMXInfoBundle_zh_TW",
   * "AMXInfoBundle_zh", "AMXInfoBundle".
   *
   * @param {string} bundleName - name of the base message bundle to use
   * @param {string} key - the key to look for in order to grab the message
   * @param {string} args - extra arguments passed in; for example an exception name, or another parameter
   */
  adf.mf.internal.resource.getResourceStringImpl = function(bundleName, key, args)
  {
    var errorMsg;

    // should get back something of the form "fr" or "zh_TW"
    var javaLanguage = adf.mf.locale.getJavaLanguage(adf.mf.locale.getUserLanguage());

    // create an array containing the default bundle name and each language part (i.e. ["AMXInfoBundle", "zh", "TW"])
    var bundleNamePartsArray = javaLanguage.split("_");
    bundleNamePartsArray.unshift(bundleName);

    // Iterate over bundles, from most specific locale to default, returning first message occurrence found. For
    // a bundle name of "AMXInfoBundle", with locale of "zh_TW", the names of the bundles checked, in order, would
    // be: "AMXInfoBundle_zh_TW", "AMXInfoBundle_zh", "AMXInfoBundle".
    for (var i = bundleNamePartsArray.length; i > 0; i--)
    {
      var localizedBundleName = bundleNamePartsArray.slice(0, i).join("_");

      if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.FINER))
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINER, "adf", "getResourceStringImpl", "Localized Bundle Name = " + localizedBundleName);
      }

      var bundleObj = adf.mf.resource[localizedBundleName];
      if ((bundleObj !== undefined) && (bundleObj !== null))
      {
        var msg = bundleObj[key];
        if ((msg !== undefined) && (msg !== null))
        {
          var argArray = [msg];
          return adf.mf.log.format.apply(this, argArray.concat(args));
        }
        else if (i == 1) // no message key found in any variation of bundle name
        {
          errorMsg = "Unable to find message key " + key + " for bundle " + bundleName;
        }
      }
      else if (i == 1) // neither default bundle found, nor bundle variations containing message key
      {
        errorMsg = "Unable to find message bundle " + bundleName;
      }
    }

    if (!adf.mf.resource.adfMessageBundlesLoaded)
    {
      // It is too soon to access the message bundle.

      // For this low-level method, always send in the english string
      if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.FINE))
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "adf", "getResourceStringImpl", errorMsg);
      }

      // Return the key with args just in case this too-soon issue masks a
      // more severe problem.
      if (args == null)
        args = "";
      var returnValue = bundleName + "[" + key + "](" + args + ")";

      // Let's default to English for a very small subset of resource strings:
      if ("AMXInfoBundle[MSG_LOADING]()" == returnValue)
        returnValue = "Loading";
      else if ("ADFInfoBundle" == bundleName)
      {
        if ("LBL_INFO_DISPLAY_STR" == key)
          returnValue = "Info";
        else if ("LBL_CONFIRMATION_DISPLAY_STR" == key)
          returnValue = "Confirmation";
        else if ("LBL_WARNING_DISPLAY_STR" == key)
          returnValue = "Warning";
        else if ("LBL_ERROR_DISPLAY_STR" == key)
          returnValue = "Error";
        else if ("LBL_FATAL_DISPLAY_STR" == key)
          returnValue = "Fatal";
        else if ("LBL_OK_DISPLAY_STR" == key)
          returnValue = "OK";
      }

      return returnValue;
    }

    // For this low-level method, always send in the english string
    if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.SEVERE))
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf", "getResourceStringImpl", errorMsg);
    }

    return null;
  };
})();

// ======= Log Utilities =======
(function()
{
  //idea taken from http://stackoverflow.com/questions/1038746/equivalent-of-string-format-in-jquery
  adf.mf.log.format = function(str, args)
  {
    args = Array.prototype.slice.call(arguments, 1);
    return str.replace(/\{(\d+)\}/g, function(m, n) { return args[n]; });
  };

  //matching the format used by iOS native logging
  adf.mf.log.formatDate = function(d)
  {
    function pad(n,c) { var s=""+n; while (s.length<c) s="0"+s; return s; }
    return d.getFullYear()+"-"+pad(d.getMonth()+1,2)+"-"+pad(d.getDate(),2)+" "+
      pad(d.getHours(),2)+":"+pad(d.getMinutes(),2)+":"+pad(d.getSeconds(),2)+"."+pad(d.getMilliseconds(),3);
  };

  /**
   * PUBLIC FUNCTION used to log a message abd throw an error; behind the covers, it grabs a the localized
   * string message from the resource bundle as well.
   *
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} methodName - the name of the method where we're logging the message from
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.log.logAndThrowErrorResource = function(bundleName, methodName, key)
  {
    var args = Array.prototype.slice.call(arguments, 3);
    var msg  = adf.mf.internal.resource.getResourceStringImpl(bundleName, key, args);

    if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.SEVERE))
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf", methodName, msg);
    }

    throw adf.mf.resource.getErrorId(key) + ": " + msg;
  };

  /**
   * PUBLIC FUNCTION used to log a message; behind the covers, it grabs a the localized
   * string message from the resource bundle as well.
   *
   * @param {string} level - the level of the log message; for example: WARNING, SEVERE
   * @param {string} methodName - the name of the method where we're logging the message from
   * @param {string} bundleName - name of the message bundle to look into
   * @param {string} key - the key to look for in order to grab the message
   */
  adf.mf.log.logInfoResource = function(bundleName, level, methodName, key)
  {
    var args = Array.prototype.slice.call(arguments, 4);
    adf.mf.internal.resource.logResourceImpl(level, methodName, bundleName, key, args);
  };

  adf.mf.internal.log.getStringifedIfNeeded = function(message)
  {
    if (typeof message == "object" &&
        adf.mf.util != null &&
        adf.mf.util.stringify != null)
    {
      return adf.mf.util.stringify(message);
    }
    return message;
  };

  /*
  The levels in descending order are:
      SEVERE (highest value)
      WARNING
      INFO
      CONFIG
      FINE
      FINER
      FINEST
      ALL (lowest value)
   */
  adf.mf.internal.log.level = function(name, value)
  {
    this.name  = name;
    this.value = value;

    this.toString = function()
    {
      return this.name;
    };
  };

  adf.mf.log.level = adf.mf.log.level || {
    'SEVERE'             : new adf.mf.internal.log.level('SEVERE', 1000),
    'WARNING'            : new adf.mf.internal.log.level('WARNING', 900),
    'INFO'               : new adf.mf.internal.log.level('INFO', 800),
    'CONFIG'             : new adf.mf.internal.log.level('CONFIG', 700),
    'FINE'               : new adf.mf.internal.log.level('FINE', 500),
    'FINER'              : new adf.mf.internal.log.level('FINER', 400),
    'FINEST'             : new adf.mf.internal.log.level('FINEST', 300),
    'ALL'                : new adf.mf.internal.log.level('ALL', Number.MIN_VALUE)
  };

  adf.mf.log.compilePattern = function(toCompile)
  {
    toCompile = toCompile.replace('%LOGGER%', "{0}");
    toCompile = toCompile.replace('%LEVEL%', "{1}");
    toCompile = toCompile.replace('%TIME%', "{2}");
    toCompile = toCompile.replace('%CLASS%', "{3}");
    toCompile = toCompile.replace('%METHOD%', "{4}");
    toCompile = toCompile.replace('%MESSAGE%', "{5}");
    return toCompile;
  };

  adf.mf.log.logger = function(name)
  {
    this.name    = name;
    this.level   = adf.mf.log.level.SEVERE;
    this.pattern = adf.mf.log.compilePattern('[%LEVEL% - %LOGGER% - %CLASS% - %METHOD%] %MESSAGE%');

    this.init = function(level, pattern)
    {
      this.level = level;
      if (pattern) this.pattern = adf.mf.log.compilePattern(pattern);
    };

    this.isLoggable = function(level)
    {
      return level.value >= this.level.value;
    };

    this.toString = function()
    {
      return this.name;
    };

    this.logp = function(level, klass, method, message)
    {
      if (this.isLoggable(level) == false)
      {
        return;
      }

      var timestamp = adf.mf.log.formatDate(new Date());
      var logMessage = adf.mf.log.format(this.pattern, this.name, level.name, timestamp, klass, method, message);
      console.log(logMessage);
    };
  };

  // Initialize the loggers:
  adf.mf.log.Framework   = adf.mf.log.Framework   || new adf.mf.log.logger('oracle.adfmf.framework');
  adf.mf.log.Application = adf.mf.log.Application || new adf.mf.log.logger('oracle.adfmf.application');
})();
/* Copyright (c) 2011, 2014, Oracle and/or its affiliates. All rights reserved. */
/* ------------------------------------------------------- */
/* ------------------- base-core.js ---------------------- */
/* ------------------------------------------------------- */

// ===========================================================================
// ======= Any touching of this file must have architectural approval. =======
// ===========================================================================

// ======= queueShowPageComplete =======
/**
 * Internal function for queueing the "showpagecomplete" event.
 */
adf.mf.internal.api.queueShowPageComplete = function()
{
  // Make sure we invoke this at most once:
  if (!adf.mf.internal.api._showPageCompleteQueued)
  {
    adf.mf.internal.api._showPageCompleteQueued = true;
    var evt = document.createEvent('Events');
    evt.initEvent("showpagecomplete", false, false, {});
    evt.view = window;
    evt.altKey = false;
    evt.ctrlKey = false;
    evt.shiftKey = false;
    evt.metaKey = false;
    evt.keyCode = 0;
    evt.charCode = 'a';
    var eventTarget = document;
    eventTarget.dispatchEvent(evt);
  }
};

/**
 * Utility invoked from the native framework when memory is identified as being low.
 * @param {boolean} visible whether this page's WebView is shown (currently unused)
 */
adf.mf.internal.handleLowMemory = function(visible)
{
  // Add a marker class onto the body so that expensive styles like 3D transformations or
  // elastic/momentum scrolling can be turned off.
  if (document.body.className.indexOf("adfmf-low-memory") == -1) // only add once
    document.body.className += " adfmf-low-memory";
};

/**
 * In case adf.mf.internal.handleWebViewDisplay is invoked with visible=false
 * while the page is loading or busy, we need to keep attempting to hide it
 * or else the page might eat up memory unnecessarily.
 * @private
 */
adf.mf.internal._handleWebViewDisplayHideLater = function()
{
  adf.mf.internal.handleWebViewDisplay(false);
};

/**
 * Utility invoked from the native framework that either frees up memory for invisible WebViews or
 * prepares a WebView for being displayed.
 * @param {boolean} visible whether this page's WebView is about to be shown or has just been hidden
 */
adf.mf.internal.handleWebViewDisplay = function(visible)
{
  // Store off an internal variable for amx-core in case this code runs before the
  // adf.mf.internal.amx._handleWebViewDisplay is created below.
  adf.mf.internal._webViewDisplayed = visible;

  if (adf.mf.internal._handleWebViewDisplayTimer != null)
  {
    // If we had a visble=false timer, we need to cancel it:
    window.clearTimeout(adf.mf.internal._handleWebViewDisplayTimer);
    adf.mf.internal._handleWebViewDisplayTimer = null;
  }

  // Toggle the display of the body so the browser can clean up unused resources.
  if (visible)
  {
    document.body.style.display = "block";
  }
  else
  {
    // Hide the WebView only if the page has loaded and is idle.
    var finishedLoading =
      adf.mf.internal.api && adf.mf.internal.api._showPageCompleteQueued;
    var busy =
      adf.mf.internal.amx && adf.mf.internal.amx._showLoadingCalls != 0;
    if (finishedLoading && !busy)
    {
      // It is safe to hide the page to free up memory:
      document.body.style.display = "none";
    }
    else
    {
      // It is not safe now, so try again later:
      adf.mf.internal._handleWebViewDisplayTimer =
        window.setTimeout(adf.mf.internal._handleWebViewDisplayHideLater, 4000);
    }
  }
};

// ======= onBaseLoad =======
function onBaseLoad()
{
  // Perform the base initialization (called from body "load" function):
  var lastResortLogger = function(message)
  {
    // Let the native logger get it:
    console.log(message);

    // This is so catastrophic, let the user see it:
    var div = document.createElement("div");
    div.style.WebkitUserSelect = "text";
    div.appendChild(document.createTextNode(message));
    var errorBox = document.getElementById("BaseLoadErrorBox");
    if (errorBox == null)
    {
      errorBox = document.createElement("div");
      errorBox.id = "BaseLoadErrorBox";
      var errorBoxStyle = errorBox.style;
      errorBoxStyle.zIndex = "10001";
      errorBoxStyle.position = "absolute";
      errorBoxStyle.top = "20px";
      errorBoxStyle.bottom = "20px";
      errorBoxStyle.left = "20px";
      errorBoxStyle.right = "20px";
      errorBoxStyle.padding = "10px";
      errorBoxStyle.overflow = "auto";
      errorBoxStyle.opacity = "0.9";
      errorBoxStyle.backgroundColor = "white";
      errorBoxStyle.color = "black";
      errorBoxStyle.WebkitOverflowScrolling = "touch";
      document.body.appendChild(errorBox);
    }
    errorBox.appendChild(div);
  };
  adf.mf.internal.log.lastResortLogger = lastResortLogger;

  // Future nice-to-have:
  // Optionally disable perf timings in mock/hosted modes using some mechanism other than commenting
  // out the following line from adf.el.js:
  // adf.mf.log.Performance.logp(adf.mf.log.level.FINE, "AdfPerfTimingConsoleLogger", "perfTimings", logString);

  // TODO (future) instead of using window.adf._bootstrapMode, use a query string to specify the location of the profile.json file (see adf.login.html (login), bootstrap_automation.html (automate), fixup_bootstrap.py (dev), build-hosted.sh (hosted), and DVT's hosted CompGallery script)
  // Load the environment profile json file:
  var devMode = null;
  var profile;

  var wwwPath = "";
  if (window.adf.wwwPath)
  {
    wwwPath = window.adf.wwwPath;
  }
  else
  {
    adf.wwwPath = "";
  }

  var queryString = adf.mf.api.getQueryString();
  var profileJsonFolder = wwwPath + "js";
  var profileJsonFolderOverride = adf.mf.api.getQueryStringParamValue(queryString, "profile_json_folder_override", "");
  if (profileJsonFolderOverride != "")
    profileJsonFolder = profileJsonFolderOverride;

  var profileJsonFile = profileJsonFolder + "/profile-html.json";
  window.adf_base_success_log = [];
  if (window.adf._bootstrapMode)
  {
    // Override the location of the profile.json file if applicable:
    window.adf_base_success_log.push("adf._bootstrapMode: " + window.adf._bootstrapMode);
    if (window.adf._bootstrapMode == "amx")
    {
      profileJsonFile = profileJsonFolder + "/profile.json";
    }
    else if (window.adf._bootstrapMode == "dev")
    {
      // Running in a browser using raw development artifacts:
      if (profileJsonFolderOverride != "")
        profileJsonFile = profileJsonFolderOverride + "/profile-dev.json";
      else
        profileJsonFile = wwwPath + "../Base/js/json/profile-dev.json";
      devMode = "dev";
    }
    else if (window.adf._bootstrapMode == "hosted")
    {
      // Running in a browser using built artifacts:
      profileJsonFile = profileJsonFolder + "/profile-hosted.json";
      devMode = "hosted";
    }
    else if (window.adf._bootstrapMode == "eltest")
    {
      // Running in a browser using built artifacts:
      if (profileJsonFolderOverride != "")
        profileJsonFile = profileJsonFolderOverride + "/profile-eltest.json";
      else
        profileJsonFile = wwwPath + "../../Base/js/json/profile-eltest.json";
    }
    else if (window.adf._bootstrapMode == "automate")
    {
      // Running in a WebView but using built artifacts:
      if (profileJsonFolderOverride != "")
        profileJsonFile = profileJsonFolderOverride + "/profile-automate.json";
      else
        profileJsonFile = wwwPath + "../../../../../www/js/profile-automate.json";
      devMode = "automate";
    }
    else if (window.adf._bootstrapMode == "login")
    {
      // Running in a WebView but using built artifacts:
      profileJsonFile = profileJsonFolder + "/profile-login.json";
    }
    else if (window.adf._bootstrapMode == "html")
    {
      profileJsonFile = profileJsonFolder + "/profile-html.json";
    }
    else if (window.adf._bootstrapMode == "hidden")
    {
      profileJsonFile = profileJsonFolder + "/profile-hidden.json";
    }
    else
    {
      lastResortLogger("Error: unexpected window.adf._bootstrapMode: " + window.adf._bootstrapMode);
    }
  }
  if (window.baseDebug)
  {
    alert("Profile JSON File: " + profileJsonFile);
  }
  adf.mf.api.resourceFile.loadJsonFile(
    profileJsonFile,
    false,
    function(data)
    {
      if (window.baseDebug)
      {
        alert("Successfully loaded the resources JSON file: " + profileJsonFile);
      }
      window.adf_base_success_log.push("Successfully loaded the resources JSON file: " + profileJsonFile);
      profile = data;
    },
    function(message)
    {
      if (window.baseDebug)
      {
        alert("Unable to load the resources JSON file: " + profileJsonFile + "\nmessage: " + message);
      }
      lastResortLogger("Unable to load the resources JSON file: " + profileJsonFile + "; " + message);
    });
  if (profile == null)
  {
    // Must have a profile to set up the page
    lastResortLogger("Error: a profile is required to set up the base page");
    return;
  }

  // See if we're running in DT mode:
  profile.dtMode = ("true" == adf.mf.api.getQueryStringParamValue(queryString, "amx_dtmode"));
  window.adf_base_success_log.push("dtMode: " + profile.dtMode);

  // Make the profile available for others to access:
  adf.mf.environment.profile = profile;

  if (profile.locale)
  {
    // Load the locale framework
    _loadJsResourceWithSourceUrl(wwwPath + profile.locale);
  }

  // Set the locale and reading direction:
  adf.mf.internal.locale.init();

  // Load the CSS resources from the profile:
  var cssResources = profile.cssResources;
  if (cssResources != null)
  {
    for (var i=0, length=cssResources.length; i<length; ++i)
    {
      var cssResource = cssResources[i];

      if (profile.dtMode || devMode == "hosted")
      {
        if (cssResource == "css/amx.css")
        {
          // This is a special case for either the DT Preview or Hosted Browser modes where we need to load
          // the skin passed in via "amx_skin_override" on the query string instead of "css/amx.css":
          cssResource = adf.mf.api.getQueryStringParamValue(queryString, "amx_skin_override", cssResource);
        }
        else if (cssResource == "css/dvtm.css")
        {
          // This is a special case for either the DT Preview or Hosted Browser modes where we need to load
          // the skin passed in via "dvtm_skin_override" on the query string instead of "css/dvtm.css":
          cssResource = adf.mf.api.getQueryStringParamValue(queryString, "dvtm_skin_override", cssResource);
        }
      }
      else if (devMode == "dev" && cssResource.indexOf("css-mobileAlta-1.1-ios/") != -1)
      {
        // This is a special case for the Dev Browser mode where we need to load the CSS resources from
        // the folder passed in via "amx_skin_folder_override" on the query string instead of the folder
        // specified in profile-dev.json:
        var defaultFolder = "css-mobileAlta-1.1-ios/";
        var skinFolderOverride = adf.mf.api.getQueryStringParamValue(queryString, "amx_skin_folder_override", defaultFolder);
        cssResource = cssResource.replace(defaultFolder, skinFolderOverride);
      }

      // We need to use a <link> tag so that the URLs in the CSS are preserved. If we were to
      // attempt to use a <style> tag and inject the content from the CSS file into the page, the
      // relative URLs would no longer work.
      var link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("type", "text/css");
      link.setAttribute("href", wwwPath + cssResource);
      document.head.appendChild(link);
    }
  }

  if (profile.dtMode)
  {
    // Add a marker class so that DT-specific styles can be used.
    // Note that we can't use element.classList and have to use element.className
    // because the preview panel uses a much older version of WebKit.
    document.documentElement.className += " amx-dtmode";
  }

  // If "generateBaseHtml" is true, generate the 3 base DIVs:
  if (profile.generateBaseHtml)
  {
    var bodyPage = document.createElement("div");
    bodyPage.id = "bodyPage";
    document.body.appendChild(bodyPage);

    var header = document.createElement("div");
    header.setAttribute("data-role", "header");
    bodyPage.appendChild(header);

    var bodyPageViews = document.createElement("div");
    bodyPageViews.id = "bodyPageViews";
    bodyPage.appendChild(bodyPageViews);

    // Add the loading indicator:
    var loading = document.createElement("div");
    loading.id = "amx-loading";
    loading.className = "amx-loading showing";
    document.body.appendChild(loading);

    // Add the WAI-ARIA live region for loading messages:
    var loadingMessage = document.createElement("div");
    loadingMessage.id = "amx-loading-live-region";
    loadingMessage.setAttribute("aria-atomic", "true");
    loadingMessage.setAttribute("aria-live", "assertive");
    loadingMessage.setAttribute("aria-relevant", "additions");
    var msgLoading = adf.mf.resource.getInfoString("AMXInfoBundle", "MSG_LOADING");
    if (msgLoading == null)
      msgLoading = "Loading";
    loadingMessage.textContent = msgLoading;
    var msgStyle = loadingMessage.style;
    msgStyle.width = "0px";
    msgStyle.height = "0px";
    msgStyle.overflow = "hidden";
    document.body.appendChild(loadingMessage);
  }

  // Load the JS resources from the profile:
  var jsResources = profile.jsResources;
  if (jsResources != null)
  {
    for (var i=0, length=jsResources.length; i<length; ++i)
    {
      var jsResource = jsResources[i];
      if (profile.dtMode && "js/adf.mf.device.integration.js" == jsResource)
      {
        // This file is not available in DT preview so skip it:
        continue;
      }
      else if (profile.dtMode && "js/cordova-2.2.0.js" == jsResource)
      {
        // This file is not available in DT preview so skip it:
        continue;
      }
      else if (window.jQuery && jsResource.substring(0, 10) == "js/jquery-")
      {
        // Do not load jQuery when it has been provided already
        continue;
      }
      else
      {
        if (window.baseDebug)
        {
          alert("Profile JS Resource: " + wwwPath + jsResource);
        }
        _loadJsResourceWithSourceUrl(wwwPath + jsResource);
      }
    }
  }

  // If we are generating the base HTML and if we are not in design time or hosted modes, then
  // add a style class marker for the release/debug mode that is added to base-controller.js via
  // JSCompileTask.java and configurable via GeneralProperties.build.xml so that when a customer is
  // running their app in debug mode, they can easily see which mode they are using since debug mode
  // will be much slower than release mode:
  if (profile.generateBaseHtml && !profile.dtMode && devMode != "hosted")
  {
    var bodyPage = document.getElementById("bodyPage");
    if (bodyPage == null)
    {
      lastResortLogger("Failed to locate bodyPage");
    }
    else
    {
      if (adf.mf.internal.BUILD_CONFIGURATION == "release") // TODO skip for adf.mf.environment.profile.dtMode
      {
        bodyPage.className = "amx-release";
      }
      else // debug
      {
        bodyPage.className = "amx-debug";
      }
    }
  }

  if (devMode) // "dev" or "hosted"
  {
    // TODO (future) remove this and amx-core.js uses once amx.log goes away.
    amx.config.debug.enable = true; // TODO (future) if we keep it around, rename to "adf.mf.environment.profile.debug" instead
    adf.mf.api.AdfAssert.forceDebug();
  }

  // Determine whether we are in mock data mode or not (requires the JS from the profile to be loaded first):
  adf.mf.environment.profile.mockData = (typeof adf.pg === "undefined");
  window.adf_base_success_log.push("mockData: " + profile.mockData);

  if (adf.mf.environment.profile.delayShowComplete) // this is an AMX page
  {
    // Add listener for "deviceready" if applicable:
    if (adf.mf.environment.profile.mockData)
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "onBaseLoad", window.adf_base_success_log.join("\n"));

      // Mock mode so just show the page immediately:
      adf.mf.internal.api.showFirstAmxPage();
    }
    else
    {
      // Device mode so wait for deviceready:
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "onBaseLoad", "adding deviceready listener");
      document.addEventListener("deviceready", onBaseDeviceReady, false);
      adf.mf.internal.baseShowPageReady = true;
      _showFirstAmxPageIfReady();
    }

    // Note: amx-core calls adf.mf.internal.api.queueShowPageComplete when it hides the loading indicator for the first time
  }
  else // this is a non-AMX page (e.g. adf.login.html)
  {
    adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "onBaseLoad", window.adf_base_success_log.join("\n"));
    document.addEventListener("deviceready", onBaseDeviceReady, false);
    adf.mf.internal.baseShowPageReady = true;
    _showFirstAmxPageIfReady();
  }
}

// ======= _loadJsResourceWithSourceUrl =======
function _loadJsResourceWithSourceUrl(jsResource)
{
  var filterFunction = null;
  filterFunction = function(responseText)
  {
    // Permit debugging of the source (currently only works in firebug, google chrome and webkit nightly).
    // Also note that using a filter function to load the JS file requires the file doesn't use any implicit
    // window variables/functions (it is good practice anyhow to avoid implicit code).
    responseText += "\n//# sourceURL=" + jsResource;
    return responseText;
  };

  adf.mf.api.resourceFile.loadJsFile(
    jsResource,
    false,
    function()
    {
      if (window.baseDebug)
      {
        alert("Successfully loaded JavaScript " + jsResource);
      }
      window.adf_base_success_log.push("Successfully loaded JavaScript " + jsResource);
    },
    function(message)
    {
      if (window.baseDebug)
      {
        alert("Failed to load JS file: " + jsResource);
      }
      adf.mf.internal.log.lastResortLogger("Failed to load JS file: " + jsResource + ", " + message);
    },
    filterFunction);
}

// ======= onBaseDeviceReady =======
function onBaseDeviceReady()
{
  adf.mf.internal.baseDeviceReady = true;
  _showFirstAmxPageIfReady();
}

// ======= _showFirstAmxPageIfReady =======
function _showFirstAmxPageIfReady()
{
  // Only proceed if both the "deviceready" event occurred and
  // onBaseLoad has reached the point where we are ready to proceed:
  if (!adf.mf.internal.baseDeviceReady || !adf.mf.internal.baseShowPageReady)
    return; // not ready yet

  adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "_showFirstAmxPageIfReady", window.adf_base_success_log.join("\n"));

  // Cordova has been initialized and is ready to roll:
  if (!adf.mf.environment.profile.dtMode)
  {
    if (window.Cordova)
    {
      if ((Cordova.sessionKey == 0) && (adf_mf_sessionKey != 0))
      {
        Cordova.sessionKey = adf_mf_sessionKey;
      }
      if (Cordova.sessionKey == 0)
      {
        var msg = "Cordova SessionKey is not initialized";
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "_showFirstAmxPageIfReady", msg);
        adfc.internal.LogUtil.showAlert(msg);
      }
    }
  }
  adf.mf.log.Framework.logp(adf.mf.log.level.FINE, "base", "_showFirstAmxPageIfReady", "deviceready event received");

  if (adf.mf.environment.profile.delayShowComplete) // this is an AMX page
  {
    adf.mf.internal.api.showFirstAmxPage();
  }
  else // this is an HTML page
  {
    // We are done with showing the initial HTML for the page:
    adf.mf.internal.api.queueShowPageComplete();
  }
}

window.addEventListener("load", onBaseLoad, false);
