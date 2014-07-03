// register DvtObj because of some issues with toolkit renderers
DvtObj = function () {};
DvtObj["owner"] = window;

(function()
{ 
  // Base object which provides basic function for object creation
  var DvtmObject = function() {};
  
  adf.mf.api.AdfObject.createSubclass(DvtmObject, adf.mf.api.AdfObject, 'adf.mf.internal.dvt.DvtmObject');
  
  /**
   * function create hierarchy of packages by given typeName and places the clazz object
   * into the leaf object of this hierarchy
   * @param typeName qualified name of the class/type (e.g. package.subpackage.ClassName)
   * @param clazz class or object itself
   * @param overwrite if true then it rewrites leaf object if this object exists
   * @param root base package from whitch this hierarchy is constructed (default is window)
   *
   */
  var _createPackageAndClass = function (typeName, clazz, overwrite, root)
  {
    if(root === undefined)
    {
      root = window;
    }
    while (typeName.indexOf('.') > -1)
    {
      var subPackage = typeName.substring(0, typeName.indexOf('.'));
      if (root[subPackage] === undefined)
      {
        root[subPackage] = {};
      }
      root = root[subPackage];
      typeName = typeName.substring(typeName.indexOf('.') + 1, typeName.length);
    }
    if(root[typeName] === undefined || overwrite === true)
    {
      root[typeName] = clazz;
    } 
  }
  
  // register new DvtmObject
  _createPackageAndClass('adf.mf.internal.dvt.DvtmObject', DvtmObject, false, window); 
   
  DvtmObject.SCOPE = 
  {
    // generaly available class (default)
    'PUBLIC' : 0,
    // public object wrapped into the simple object where only getInstance function is visible
    'SINGLETON' : 1
  }
   
  /**
   * @export
   *  Provides inheritance by subclassing a class from a given base class.
   *  @param  {class} extendingClass  The class to be extended from the base class.
   *  @param  {class} baseClass  The base class
   *  @param  {string} typeName The type of the extending class
   *  @param  {string} scope of the extending class (PUBLIC (default), PRIVATE, SINGLETON, ABSTRACT)
   */
  DvtmObject.createSubclass = function (extendingClass, baseClass, typeName, scope) 
  {
    if(baseClass && typeof baseClass === 'string')
    {
      baseClass = _getClass(baseClass);
    }
    
    adf.mf.api.AdfObject.createSubclass(extendingClass, baseClass, typeName);
  
    if (extendingClass !== baseClass) 
    {
      _createScope(extendingClass, typeName, scope);
    }
  }
  
  /**
   * Creates package given by packageName parameter 
   * @param packageName qualified name of the package (e.g. package.subpackage)
   * @param rootPackage base package from whitch this hierarchy is constructed (default is window)
   */
  DvtmObject.createPackage = function (packageName, rootPackage)
  {
    _createPackageAndClass(packageName, {}, false, rootPackage);
  } 
  
  /**
   * @param className qualified name of the class to be resolved
   * @return object on path described by the className 
   */
  var _getClass = function (className)
  {
    var root = window;
    while (className.indexOf('.') > -1)
    {
      var subPackage = className.substring(0, className.indexOf('.'));
      if (root[subPackage] === undefined)
      {
        return undefined;
      }
      root = root[subPackage];
      className = className.substring(className.indexOf('.') + 1, className.length);
    }
    return root[className];
  }
  
  /**
   * creates scope for the object
   * @param extendingClass top level class object
   * @param typeName fully qualified name of the class
   * @scope DvtmObject.SCOPE
   */
  var _createScope = function (extendingClass, typeName, scope) 
  {
    if(scope !== undefined && typeof scope === 'string')
    {
      scope =  DvtmObject.SCOPE[scope.toUpperCase()];
    }
    if(scope === DvtmObject.SCOPE['SINGLETON'])
    {
      var clazz = {
          'getInstance' : function()
            {
              if(extendingClass['_instance'] === undefined)
              {
                extendingClass['_instance'] = new extendingClass();
              }
              
              return extendingClass['_instance'];
            }
        }
      _createPackageAndClass(typeName, clazz, true);
    }
    else
    {
      _createPackageAndClass(typeName, extendingClass, true);
    }
  }
  
})();
(function(){

  /**
   * function resolves parameter of the leaf object and the leaf object itself
   */
  var _resolveLeafObjectAndProperty = function(root, path, delimiter, createIfMissing)
    {
      var result = {};
      while (root && path.indexOf(delimiter) > -1)
      {
        var subProperty = path.substring(0, path.indexOf(delimiter));     
        if(createIfMissing && root[subProperty] === undefined)
        {
          root[subProperty] = {};
        }
        root = root[subProperty];
        path = path.substring(path.indexOf(delimiter) + 1, path.length);
      }
      
      if(root)
      {
        result['object'] = root;
        result['parameter'] = path;
      }
      
      return result;
    }
  
  /**
   * @param object root from which this path should be resolved
   * @param path string path of the object
   * @param delimiter optional char which delimites packages (default is '/')
   */
  var JSONPath = function (object, path, delimiter)
  {
    this._path = path;
    this._root = object;
        
    if(delimiter === undefined)
    {
      this._delimiter = '/';
    }
    else
    {
      this._delimiter = delimiter; 
    }
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(JSONPath, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.JSONPath');
  
  /**
   * resolve path to the leaf object and parameter of this object
   * 
   * @param createIfMissing creates the hierarchy of the namespaces when his doesn't exist
   */
  JSONPath.prototype._resolvePath = function (createIfMissing)
  {
    if(this._leaf === undefined)
    {
      var result =_resolveLeafObjectAndProperty(this._root, this._path, this._delimiter, createIfMissing);
        
      this._leaf = result['object'];
      this._param = result['parameter']; 
    }
  }
  
   /**
   * Returns value of the leaf element of the path.
   * 
   * @return value of the leaf element or undefined if path structure is not yet created
   */
  JSONPath.prototype.getValue = function ()
  {
    this._resolvePath(false);
    return this._leaf === undefined ? undefined : this._leaf[this._param];
  }

  /**
   * Sets value of the leaf element of the path.
   * 
   * @param value
   * @return true when value of the leaf element of the path has been changed
   */
  JSONPath.prototype.setValue = function (value)
  {
    this._resolvePath(true);
    
    if (this._leaf[this._param] !== value)
    {
      this._leaf[this._param] = value;
      return true;
    }
    return false;
  }
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.util');
  
  var DOMUtils = {}
  adf.mf.internal.dvt.DOMUtils = DOMUtils;
  
  DOMUtils.createDIV = function ()
  {
    return document.createElement("div");
  }
  
  DOMUtils.getWidth = function (node)
  {
    return $(node).width();
  }
  
  DOMUtils.setWidth = function (node, width)
  {
    $(node).width(width);
  }
  
  DOMUtils.getHeight = function (node)
  {
    return $(node).height();
  }
  
  DOMUtils.setHeight = function (node, height)
  {
    $(node).height(height);
  }
  
  DOMUtils.getOuterHeight = function (node)
  { 
    return $(node).outerHeight(true);
  }
  
   /**
   * @return value of the width or height attribute
   */
  DOMUtils.parseStyleSize = function (strSize, percent)
  {
    if(strSize)
    {
      var index = strSize.indexOf(percent ? '%' : 'px');
      if(index > -1)
      {
        strSize = strSize.substring(0, index);
        var value = parseInt(strSize);
        if(value > 0)
        {
          return value;
        }
      }
    }
    return percent ? 100 : 0;
  }
  
  /**
   * writes ID attribute to the DOM element
   * 
   * @param element DOM Element
   * @param id 
   * @private
   */
  DOMUtils.writeIDAttribute = function (node, id)
  {
    node.setAttribute('id', id);
  }

  /**
   * writes style attribute to the DOM element
   * 
   * @param element DOM Element
   * @param style 
   * @private
   */
  DOMUtils.writeStyleAttribute = function (node, style)
  {
    node.setAttribute('style', style);
  }
  
  /**
   * writes class attribute to the DOM element
   * 
   * @param element DOM Element
   * @param styleClass 
   * @private
   */
  DOMUtils.writeClassAttribute = function (node, styleClass)
  {
    node.setAttribute('class', styleClass);
  }
})();
(function(){
  
  /**
   *  Class representing a set of attributes.        
   */ 
  var Attributes = function(types)
  {
    this['attributes'] = [];
    this['types'] = types; 
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Attributes, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Attributes');
  
  /**
   *  Processes attributes set on given amx node.
   *  @param amxNode amx node     
   */  
  Attributes.prototype.processAttributes = function(amxNode) {
    // process private _tagInstances objects
    var tagInstances = amxNode["_tagInstances"];
    var tagInstance;
    
    for(var k in tagInstances) {
      if(tagInstances.hasOwnProperty(k)) {
        var types = this['types'];
        for(var i=0; i < types.length; i++) {
          tagInstance = tagInstances[k];
          if(tagInstance.getTag().getName() == 'attribute') {
            var attrName = tagInstance.getTag().getAttribute("name");
            var attrValue;
            if(attrName) {
              var match = new RegExp('^'+types[i]+'\\d*$').exec(attrName);
              if(match && match.length == 1) {
                attrValue = tagInstance.getTag().getAttribute("value"); 
                if(attrValue.indexOf("#{") == -1) {
                  // static value
                  this.addAttribute(attrName, attrValue);
                  break; 
                } else {
                  // resolved el
                  attrValue = tagInstance["_attrs"]["value"];
                  if(attrValue) {
                    this.addAttribute(attrName, attrValue);
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  
  /**
   *  Applies all attributes in this set of attributes on given item.
   *  @param item item     
   */  
  Attributes.prototype.applyAttributes = function (item) {
    var attribute;
    for(var i=0; i < this['attributes'].length; i++) {
      attribute = this['attributes'][i];
      item[attribute['name']] = attribute['value']; 
    }
  };
  
  /**
   *  Returns value of attribute which name equals given type or null if no such attribute exists.
   *  @param type type to be resolved (e.g. color, pattern)
   *  return value of attribute which name equals given type or null if no such attribute exists   
   */ 
  Attributes.prototype.resolveValue = function(type) {
    var attributes = this['attributes'];
    if(attributes) {
      for(var j=0; j < attributes.length; j++) {
        if(attributes[j]['name'] == type) {
          return attributes[j]['value'];
        }
      }
    }
    return null;
  };
  
  /**
   *  Adds new attribute with given name and value to this set of attributes. The attribute is added only in case that it does not exist yet.
   *  @param name attribute name type to be resolved (e.g. color, pattern)
   *  @param value attribute value
   *  @return true if attribute has been added, false otherwise      
   */
  Attributes.prototype.addAttribute = function (name, value) {
    var newAttribute = this._createAttribute(name, value);
    if(!this.contains(newAttribute)) {
      this['attributes'].push(newAttribute);
      return true;
    }
    return false;
  };
  
  /**
   *  Returns true if this set of attributes contain given attribute, otherwise returns false.
   *  @param attribute attribute
   *  @return true if this set of attributes contain given attribute, otherwise returns false     
   */
  Attributes.prototype.contains = function (attribute) {
    var attrs = this['attributes'], attr;
    for(var i=0; i < attrs.length; i++) {
      attr = attrs[i];
      if(attr['name'] == attribute['name'] && attr['value'] == attribute['value']) {
        return true;
      }
    }
    return false;
  };
  
  /**
   *  Returns array of attributes contained in this Attributes class instance.
   *  Each attribute has following structure:
   *  {
   *    'name': 'Attribute name',
   *    'value': 'Attribute value'      
   *  }      
   *  @return array of attributes contained in this Attributes class instance     
   */
  Attributes.prototype.getAttributes = function () {
    return this['attributes'];
  }
  
  /**
   *  Returns true if attributes1 equals attributes2, otherwise returns false.
   *  @param attributes1 Attributes class instance
   *  @param attributes2 Attributes class instance      
   *  @return true if attributes1 equals attributes2, otherwise returns false    
   */ 
  Attributes.equals = function (attributes1, attributes2)
  {
    if(attributes1 === attributes2) return true;
    if(!attributes1 || !attributes2) return false;
    
    attributes1 = attributes1.getAttributes();
    attributes2 = attributes2.getAttributes();
    
    if(attributes1 === attributes2) return true;
    if(!attributes1 || !attributes2) return false;
    
    if(attributes1.length != attributes2.length) return false;
    
    var length = attributes1.length;
    var attr1, attr2, found;
    for(var i=0; i < length; i++) {
      attr1 = attributes1[i];
      found = false;
      for(var j=0; j < length; j++) {
        attr2 = attributes2[j];
        if(attr1['name'] == attr2['name'] && attr1['value'] == attr2['value']) {
          found = true;
        }
      }
      if(!found) return false;
    }
    return true;
  };
  
  /**
   *  Returns size of this attribute set.
   *  @return size of this attribute set     
   */  
  Attributes.prototype.size = function () {
    return this['attributes'].length;
  };
  
  /**
   *  Returns newly created attribute with following structure:
   *  {
   *    'name' : 'Attribute name',
   *    'value' : 'Attribute value'      
   *  }      
   *  @return newly created attribute     
   */
  Attributes.prototype._createAttribute = function (name, value) {
    return {
      'name' : name,
      'value' : value
    };
  };
  
})();
(function(){
  
  /**
   *  Class representing attribute group.  
   */  
  var AttributeGroup = function()
  {
    this['uniqueId'] = 0;
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroup, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup');
  
  /**
   *  Returns unique id.
   *  @return unique id     
   */  
  AttributeGroup.prototype._getUniqueId = function () {
    return "__" + this['uniqueId']++;
  };
  
  /**
   *  Initializes given attribute group based on given attribute groups node.  
   */  
  AttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
    var Attributes = adf.mf.internal.dvt.common.attributeGroup.Attributes;
    var Categories = adf.mf.internal.dvt.common.attributeGroup.Categories;
    
    this['id'] = attrGroupsNode.getAttribute('id');
    this['categories'] = new Categories();
    this.SetType(attrGroupsNode);
    this['rules'] = new Rules([], this['types']);
    
    var attributes = new Attributes(this['types']);
    attributes.processAttributes(attrGroupsNode);
    this['attributes'] = attributes;
    
    this['legendItems'] = null;
    this['attributeValuesResolver'] = null;
  };
  
  /**
   *  Sets types this attribute group supports.
   *  @param attrGroupsNode attribute groups node     
   */  
  AttributeGroup.prototype.SetType = function (attrGroupsNode) {
    this['type'] = attrGroupsNode.getAttribute('type');
    this['types'] = this._parseTypes(this['type']);
  };
  
  /**
   *  Parses type attribute and return array of particular types.
   *  @param type string containing all supported types
   *  @return array of types        
   */  
  AttributeGroup.prototype._parseTypes = function (type) {
    var types = [];
    var existingTypes = type.split(/\s+/);
    for(var i=0; i<existingTypes.length; i++) {
      if(existingTypes[i]) {
        types.push(existingTypes[i]);
      }
    }
    return types;
  };
  
  /**
   *  Returns category for given index.
   *  @param index index
   *  @return cateogory        
   */  
  AttributeGroup.prototype.getCategoryValue = function(index) {
    return this['categories'].getValueByIndex(index);
  };
  
  /**
   *  Processes item represented by given attribute groups node instance and returns processing result in the form:
   *  {
   *    'value' : processed value,
   *    'appliedRules' : array of applied rules indices      
   *  }
   *  @param attrGroupsNode attribute groups node
   *  @return processing information          
   */  
  AttributeGroup.prototype.processItem = function (attrGroupsNode) {
    var info = {};
    
    var value = this.ProcessItemValue(attrGroupsNode);
    var exceptionRulesInfo = this.ProcessItemRules(attrGroupsNode);
    var groupLabel = attrGroupsNode.getAttribute('groupLabel');
    
    info['value'] = value;
    info['appliedRules'] = exceptionRulesInfo;
    this['label'] = groupLabel;
    
    return info;
  };
  
  /**
   *  Processes given node and returns item value. Default implementation returns index of item category.
   *  @param attrGroupsNode attribute groups node
   *  @return item value          
   */  
  AttributeGroup.prototype.ProcessItemValue = function(attrGroupsNode) {
    var value = attrGroupsNode.getAttribute('value');
    var label = attrGroupsNode.getAttribute('label');
    value = this['categories'].addCategory(value, label);
    return value;
  };
  
  /**
   *  Processes given node and returns array of rules indices that are applied on given item.
   *  @param attrGroupsNode attribute groups node
   *  @return array of rules indices that are applied on given item          
   */
  AttributeGroup.prototype.ProcessItemRules = function(attrGroupsNode) {
    var rules = this['rules'];
    var appliedExceptionRuleIndices = rules.processItemRules(attrGroupsNode);
    return appliedExceptionRuleIndices;  
  };
  
  /**
   *  Configures given attribute group so that it can be applied on data items.
   *  It is guarantied that this method is called before data items are processed.
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute group configuration           
   */  
  AttributeGroup.prototype.configure = function (amxNode, attributeGroupConfig) {
    var AttributeValuesResolver = adf.mf.internal.dvt.common.attributeGroup.AttributeValuesResolver;
    var LegendItems = adf.mf.internal.dvt.common.attributeGroup.LegendItems;
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
    
    this['config'] = attributeGroupConfig;
    
    var types = this['types'];
    var categories = this['categories'];
    var attributes = this['attributes'];
    var rules = this['rules'];
    var config = this['config'];
    
    this['attributeValuesResolver'] = new AttributeValuesResolver(amxNode, types, categories, attributes, rules, config);
    
    var exceptionRules = this['rules'].filter(Rules.RULE_TYPE_EXCEPTION);
    var resolver = this['attributeValuesResolver'];
    
    this['legendItems'] = new LegendItems(types, categories, exceptionRules, resolver);
  };
  
  /**
   *  Applies the group on given data item. All information needed to process the item
   *  is stored in given info parameter:
   *  {
   *    'config' : DataItemConfig class instance
   *    'nodeInfo' : info returned by processItem function      
   *  }
   *  @param amxNode amx node
   *  @param dataItem data item
   *  @param info information needed for data item processing returned by processItem function            
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   */  
  AttributeGroup.prototype.applyGroup = function(amxNode, dataItem, info, attributeGroupConfig) {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;

    var types = this['types'];
    var indices = info['nodeInfo']['appliedRules'];
    var appliedRules = this['rules'].getByIndices(indices);
    var itemValue = info['nodeInfo']['value'];

    var type = null, mappedType, value = null;
    var updateValueCallback = null;

    // for each type (e.g. pattern, color) defined by this attribute group
    for(var i=0; i < types.length; i++) {
      type = types[i];
      mappedType = type;

      // resolve mapped type -> name of data item attribute that the resolved value will be assigned to
      if(attributeGroupConfig && attributeGroupConfig.getTypeToItemAttributeMapping(type)) { 
        mappedType = attributeGroupConfig.getTypeToItemAttributeMapping(type);
      }

      // if value is set then it won't be resolved
      // this can happen only in two cases: - the value has been set by an attribute, - the value has been set by another attribute group
      value = AttributeGroup._getAttributeValue(dataItem, mappedType);
      if(!value) {
        value = this.ResolveValue(type, appliedRules, itemValue);

        // if value is resolved then set it on given data item
        if(value) {
        
          // if update value callback is defined for given type then apply it
          if(attributeGroupConfig) {
            updateValueCallback = attributeGroupConfig.getUpdateValueCallback(type);
            if(updateValueCallback) {
              value = updateValueCallback(value, dataItem);
            }
          }
          AttributeGroup._setAttributeValue(dataItem, mappedType, value);
        }
      }
    }
    
    // update categories
    this.UpdateCategories(dataItem, info);
  };
  
  /**
   *  For each type defined by this attribute group applies default values on given data item for given type. 
   *  Default value for given type is applied only in case that given data item has no value defined for given type.
   *  
   *  @param amxNode amx node
   *  @param dataItem data item
   *  @param dataItemConfig data item configuration            
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   */  
  AttributeGroup.applyDefaultValues = function(amxNode, dataItem, dataItemConfig, attributeGroupConfig) {
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
    
    if(dataItemConfig) {
      var types = dataItemConfig.getDefaultValueTypes();
      var type = null, mappedType, value = null;

      // for each type (e.g. pattern, color) defined by this attribute group
      for(var i=0; i < types.length; i++) {
        type = types[i];
        mappedType = type;
      
        // resolve mapped type -> name of data item attribute that the resolved value will be assigned to
        if(attributeGroupConfig && attributeGroupConfig.getTypeToItemAttributeMapping(type)) { 
          mappedType = attributeGroupConfig.getTypeToItemAttributeMapping(type);
        }
      
        value = AttributeGroup._getAttributeValue(dataItem, mappedType);
      
        // if default value callback is defined then call it
        if(!value) {
          if(dataItemConfig.getTypeDefaultValue(type)) {
            value = dataItemConfig.getTypeDefaultValue(type);
          }
        
          if(value) {
            AttributeGroup._setAttributeValue(dataItem, mappedType, value);
          }
        }
      }
    }
  };
    
  AttributeGroup._getAttributeValue = function(dataItem, mappedType) {
    var mappedTypeArray = mappedType.split ('.');
    for (var i = 0; i < mappedTypeArray.length; i++) {
      if (!dataItem) return dataItem;
      dataItem = dataItem [mappedTypeArray [i]];
    }
    return dataItem;
  };

  AttributeGroup._setAttributeValue = function(dataItem, mappedType, value) {
    var mappedTypeArray = mappedType.split ('.');
    for (var i = 0; i < mappedTypeArray.length - 1; i++) {
      var newDataItem = dataItem [mappedTypeArray [i]];
      if (!newDataItem) {
        newDataItem = {};
        dataItem [mappedTypeArray [i]] = newDataItem;
      }
      dataItem = newDataItem;
    }
    dataItem [mappedTypeArray [mappedTypeArray.length - 1]] = value;
  };  
  
  /**
   *  Resolves and returns value for given type based on given applied rules and item value.
   *  @param type type
   *  @param appliedRules applied rules
   *  @param itemValue item value
   *  @return resolved value for given type based on given applied rules and item value.                
   */  
  AttributeGroup.prototype.ResolveValue = function(type, appliedRules, itemValue) {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
  
    var exceptionRules = appliedRules.filter(Rules.RULE_TYPE_EXCEPTION);
    return this['attributeValuesResolver'].resolveValue(type, exceptionRules, itemValue);
  };
  
  /**
   *  Updates categories on given data item.
   *  @param dataItem data item
   *  @param info processing information           
   */  
  AttributeGroup.prototype.UpdateCategories = function(dataItem, info) {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;
    
    var attrGroupConfig = this['config'];
    var itemValue = info['nodeInfo']['value'];
    var indices = info['nodeInfo']['appliedRules'];
    var rules = this['rules'];
    var exceptionRules = rules.getByIndices(indices, Rules.RULE_TYPE_EXCEPTION);
    
    // if callback function is defined then call it
    var updateCategoriesCallback = attrGroupConfig ? attrGroupConfig.getUpdateCategoriesCallback() : null;
    if(updateCategoriesCallback) 
    {
      updateCategoriesCallback(this, dataItem, itemValue, exceptionRules);
    } 
    else 
    {
      // add category by its index
      if (!dataItem['categories']) dataItem['categories'] = [];
      var categories = dataItem['categories'];
      categories.push(this['categories'].getValueByIndex(itemValue));
      
      // for each exception rule add exception rule value to the categories array
      rules = exceptionRules.getRules();
      for(var i=0; i < rules.length; i++) {
        categories.push(rules[i]['value']);
      }
    }
    
  };
  
  /**
   *  Applies default palette overrides to the amx node.
   *  @param amxNode amx node   
   *          
   */  
  AttributeGroup.prototype.applyDefaultPaletteOverrides = function(amxNode) {
    this['attributeValuesResolver'].applyOverrides(amxNode);
  };
  
  /**
   *  Returns array of legend items.
   *  @return array of legend items           
   */  
  AttributeGroup.prototype.getLegendItems = function() {
    return this['legendItems'].getItems();
  };
  
  /**
   *  Returns attribute group id.
   *  @return attribute group id     
   */  
  AttributeGroup.prototype.getId = function() {
    return this['id'];
  };
  
  /**
   *  Returns true if this attribute group is continuous otherwise returns false
   *  @return true if this attribute group is continuous otherwise returns false     
   */  
  AttributeGroup.prototype.isContinuous = function() {
    return false;
  };
  
  /**
   *  Returns the attribute group description in the form:
   *  {
   *    'id' : id,
   *    'type' : continuous/discrete,
   *    'groups' : array of legend items         
   *  }     
   */  
  AttributeGroup.prototype.getDescription = function() {
    var obj = {};
    obj['id'] = this['id'];
    obj['type'] = this['type'];
    if (this['label'])
      obj['label'] = this['label'];
    obj['groups'] = this['legendItems'].getItems();
    return obj;
  };
  
})();
(function(){
  
  /**
   *  A facade used to work with attribute groups. The intented usage is as follows:
   *  1. AttributeGroupManager.init
   *       Called to initialize attribute group processing.
   *          
   *  Then for each data item following functions should be called (order matters):
   *  2. AttributeGroupManager.processAttributeGroup
   *       Processes attribute group node and stores processing information into context. Processing information contains rules that are applied for
   *       this instance of attribute group node, value of this attribute group node instance etc.      
   *  3. AttributeGroupManager.registerDataItem
   *       a) Takes processing information from the context (i.e. detaches context - see AttributeGroupManager.detachProcessedAttributeGroups function)
   *       b) Connects given processing information and given data item
   *       c) Registers given data item so that all attribute groups processed using AttributeGroupManager.processAttributeGroup can be applied on it
   *  
   *  After all data items are registered following function is supposed to be called to apply attribute groups on registered data items            
   *  4. AttributeGroupManager.applyAttributeGroups
   *       Apply attribute groups on registered data items.   
   *
   *  Example:
   *     
   *   Initialize:
   *      AttributeGroupManager.init(context);
   *      ...
   *
   *   Create attribute groups and data items:
   *      var marker = this._processMarker(amxNode, markerNode);
   *      if(marker != null) {      
   *         var attributeGroupsNodes = markerNode.getChildren();
   *         var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
   *         while (iter.hasNext())
   *         {
   *           var attrGroupsNode = iter.next();
   *           ...
   *           AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
   *         }
   *         var dataItem = this._applyMarkerToModel(amxNode, marker);
   *         // all attribute groups processed in previous step are connected to given data item and this data item is
   *         // registered so that given attribute groups can be applied on it         
   *         AttributeGroupManager.registerDataItem(context, dataItem, null);   
   *         ...
   *      }
   *      ...
   *      
   *   Apply attribute groups on data items:
   *      AttributeGroupManager.applyAttributeGroups(amxNode, null, context);                            
   */  
  var AttributeGroupManager = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroupManager, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager');
  
  /**
   *  Resets attribute groups saved on given amx node.
   *  @param amxNode amx node     
   */  
  AttributeGroupManager.reset = function(amxNode) {
    amxNode["_attributeGroups"] = [];
  };
  
  /**
   *  Initializes context for attribute group processing.
   *  @param context context to be initialized     
   */  
  AttributeGroupManager.init = function(context) {
    context['_attributeGroupsInfo'] = {};
    context['_attributeGroupsInfo']['dataItems'] = [];
  };
  
  /**
   *  Returns true if context is initialized, otherwise returns false.
   *  @param context context
   *  @return true if context is initialized, otherwise returns false         
   */  
  AttributeGroupManager.isContextInitialized = function(context) {
    return context['_attributeGroupsInfo'] !== undefined;
  };
  
  /**
   *  Returns true if amx node is initialized, otherwise returns false.
   *  @param node amx node
   *  @return true if amx node is initialized, otherwise returns false         
   */
  AttributeGroupManager.isAmxNodeInitialized = function(node) {
    return node['_attributeGroups'] !== undefined;
  };
  
  /**
   *  Processes given attribute groups node and saves result into the context.
   *  @param attrGroupsNode attribute groups node
   *  @param amxNode amx node
   *  @param context context            
   */  
  AttributeGroupManager.processAttributeGroup = function(attrGroupsNode, amxNode, context) {
    if(!AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.SEVERE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return;
    }
    
    var attrGrp = AttributeGroupManager.findGroupById(amxNode, AttributeGroupManager._getAttributeGroupId(attrGroupsNode));
    
    if(attrGrp == null) {
      attrGrp = AttributeGroupManager._createGroup(amxNode, attrGroupsNode); 
      amxNode['_attributeGroups'].push(attrGrp);
    }
    // process attribute groups node instance and return processing information (applied rules, category index used etc.)
    var nodeInfo = attrGrp.processItem(attrGroupsNode);
    
    if(!context['_itemAttrGroups']) context['_itemAttrGroups'] = [];
    
    // save attribute group together with the processing information into the context
    var markerAttrGroups = context['_itemAttrGroups'];
    markerAttrGroups.push({
      'attrGroup' : attrGrp, 'nodeInfo' : nodeInfo
    });
  };
  
  /**
   *  Registers data item for further processing. Takes result of processAttributeGroup function, attaches it to the data item and 
   *  registers given data item so that attribute groups can be applied on it.
   *  @param context context
   *  @param dataItem data item
   *  @param config data item configuration, instance of DataItemConfig class           
   */  
  AttributeGroupManager.registerDataItem = function(context, dataItem, config) {
    if(!AttributeGroupManager.isContextInitialized(context)) {
      adf.mf.log.Application.logp(adf.mf.log.level.SEVERE, "AttributeGroupManager", "registerDataItem", "Manager not initialized.");
      return;
    }
    
    // detach processed attribute groups
    var itemAttrGroups = AttributeGroupManager.detachProcessedAttributeGroups(context);
    // and attach them to given data item
    dataItem['__attrGroups'] = itemAttrGroups;
    // together with this data item configuration
    dataItem['__dataItemConfiguration'] = config;
    // and register given data item
    context['_attributeGroupsInfo']['dataItems'].push(dataItem);
  };
  
  /**
   *  Detaches result of AttributeGroupManager.processAttributeGroup function from the context and returns it. Once corresponding data item can be registered, the detached
   *  result must be attached using AttributeGroupManager.attachProcessedAttributeGroups function so that AttributeGroupManager.registerDataItem
   *  function can be called.
   *  @param context context
   *  @return result of AttributeGroupManager.processAttributeGroup function                 
   */  
  AttributeGroupManager.detachProcessedAttributeGroups = function(context) {
    var processedGroups = context['_itemAttrGroups'] ? context['_itemAttrGroups'].slice(0) : [];
    context['_itemAttrGroups'] = [];
    return processedGroups;
  };
  
  /**
   *  Attaches result of AttributeGroupManager.processAttributeGroup function to the context so that corresponding data item can be registered
   *  using AttributeGroupManager.registerDataItem function.
   *  @param context context
   *  @param detachedGroups detached groups                
   */
  AttributeGroupManager.attachProcessedAttributeGroups = function(context, detachedGroups) {
    context['_itemAttrGroups'] = detachedGroups;
  };
  
  /**
   *  Applies attribute groups on registered data items. 
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute groups configuration, instance of AttributeGroupConfig class
   *  @param context context           
   */  
  AttributeGroupManager.applyAttributeGroups = function(amxNode, attributeGroupConfig, context) {
    if(!AttributeGroupManager.isContextInitialized(context) || !AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.SEVERE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return;
    }
    
    var AttributeGroup = adf.mf.internal.dvt.common.attributeGroup.AttributeGroup;
    
    // retrieve data items to be processed
    var dataItems = context['_attributeGroupsInfo']['dataItems'];
    var infos, dataItemConfig, attrGroup, dataItem;
    
    // configure attribute groups so that they can be applied on data items
    AttributeGroupManager._configureAttributeGroups(amxNode, attributeGroupConfig);
    
    // process registered data items
    if(dataItems.length > 0) {
      for(var i=0; i < dataItems.length; i++) {
        // get item
        dataItem = dataItems[i];
        // get all attribute groups that should be applied on the item together with information used to do the processing (applied rules, category index used etc.) 
        infos = dataItem['__attrGroups'];
        
        // last attribute group wins -> reverse array
        // when particular attribute group sets a value for given type other attribute groups are not applied for given type 
        infos = infos.reverse();
        
        // get data item configuration
        dataItemConfig = dataItem['__dataItemConfiguration'];
        if(infos && infos.length > 0) {
          for(var j=0; j < infos.length; j++) {
            // get attribute group
            attrGroup = infos[j]['attrGroup'];
            // get information used to do the processing (applied rules, category index used etc.)
            nodeInfo = infos[j]['nodeInfo'];
            
            // apply attribute group on given data item
            var processingInfo = {
              'nodeInfo' : nodeInfo,
              'config' : dataItemConfig
            } 
            attrGroup.applyGroup(amxNode, dataItem, processingInfo, attributeGroupConfig); 
          }
        }
        // apply default values
        AttributeGroup.applyDefaultValues(amxNode, dataItem, dataItemConfig, attributeGroupConfig); 
        
        delete dataItem['__attrGroups'];
        delete dataItem['__dataItemConfiguration'];
      }
    }
    
    delete context['_attributeGroupsInfo']['dataItems'];
    delete context['_attributeGroupsInfo'];
  };
  
  /**
   *  Find attribute group by id.
   *  @param amxNode amx node
   *  @param id attribute group id
   *  @return attribute group with given id or null if no such group exists           
   */  
  AttributeGroupManager.findGroupById = function(amxNode, id) {
    if(!AttributeGroupManager.isAmxNodeInitialized(amxNode)) {
      adf.mf.log.Application.logp(adf.mf.log.level.SEVERE, "AttributeGroupManager", "applyAttributeGroups", "Manager not initialized.");
      return null;
    }
    
    var attrGroups = amxNode['_attributeGroups'];
    var attrGroup = null;
    if(id) {
      for (var g = 0;g < attrGroups.length;g++)
      {
        if (attrGroups[g]['id'] === id) {
          attrGroup = attrGroups[g];
          break;
        }
      }
    }
    return attrGroup;
  };
  
  /**
   *  Creates attribute group, initializes it and returns it.
   *  @param amxNode amx node
   *  @param attrGroupsNode attribute groups node
   *  @return created attribute group           
   */  
  AttributeGroupManager._createGroup = function(amxNode, attrGroupsNode) {
    var ContinuousAttributeGroup = adf.mf.internal.dvt.common.attributeGroup.ContinuousAttributeGroup;
    var DiscreteAttributeGroup = adf.mf.internal.dvt.common.attributeGroup.DiscreteAttributeGroup;
  
    var attrGrp;
    if(attrGroupsNode.getAttribute("attributeType") === "continuous") {
      attrGrp = new ContinuousAttributeGroup();
    } else {
      attrGrp = new DiscreteAttributeGroup();
    }
    attrGrp.Init(amxNode, attrGroupsNode);
    return attrGrp;
  };
  
  /**
   *  Returns id of given attribute groups node.
   *  @param attrGroupsNode attribute groups node
   *  @return id of given attribute groups node or null if no id is defined for this node       
   */  
  AttributeGroupManager._getAttributeGroupId = function(attrGroupsNode) {
    var id = null;
    if (attrGroupsNode.isAttributeDefined('id'))
    {
      id = attrGroupsNode.getAttribute('id');
    }
    return id;
  };
  
  /**
   *  Configures all attribute groups saved on given amxNode and passes given attribute group configuration to each of them.
   *  @param amxNode amx node
   *  @param attributeGroupConfig attribute group configuration        
   */  
  AttributeGroupManager._configureAttributeGroups = function(amxNode, attributeGroupConfig) {
    var attrGroups = amxNode['_attributeGroups']; 
    for (var i = 0;i < attrGroups.length; i++)
    {
      attrGroups[i].configure(amxNode, attributeGroupConfig);
    }
  };
  
  /**
   *  Returns all attribute groups saved on given attribute groups node.
   *  @param amxNode amx node
   *  @param context context
   *  @return all attribute groups saved on given amx node           
   */  
  AttributeGroupManager.getAttributeGroups = function(amxNode, context) {
    return amxNode['_attributeGroups'];
  };
  
})();
(function(){
  
  var ResizeHandler = function ()
  {
    this._callbacks = [];
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ResizeHandler, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResizeHandler', 'singleton');
  
  /**
   * register callback that will be notified on window change event
   * 
   * @param id unique identificator of this callback
   * @param callback callback immediately executed on window resize event - function has parameter event and should 
   *   return context which will be passed into postCallback (e.g. function (event)&#123;return &#123;'contextinfo' : 'success'};})
   * @param postResizeCallback callback which is called when all callbacks are executed - function has one parameter and
   *   no return value. This parameter represents return value of function callback (e.g. function(context)&#123;}).
   *  
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype.addResizeCallback = function (id, callback, postResizeCallback)
  {
    // register global window resize event listener only once
    if(!this['__resizeHandlerRegistered'])
    {
      this._registerResizeHandler();
      this['__resizeHandlerRegistered'] = true;
    }

    // remove all other listeners under this id
    this.removeResizeCallback(id);
    
    // add objects that represents resize handler
    this._callbacks.push({
      'id' : id,
      'callback' : function(event)
        {
          if(callback)
          {
            var result = callback(event);
            if(result)
            {
              return result;
            }
          }
          return {};
        },
      'postCallback' : function(context)
        {
          if(postResizeCallback)
          {
            postResizeCallback(context);
          }
        }
    });
  }

  /**
   * removes callback by specified id
   * @param id id of resize callback
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype.removeResizeCallback = function (id)
  {
    var tempArray = [];
    var callbacks = this._getResizeCallbacks();
    for(var i = 0; i < callbacks.length; i++)
    {
      if(callbacks[i]['id'] != id)
      {
        tempArray.push(callbacks[i]);
      }
    }
    this._callbacks = tempArray;
  }

  /**
   * @return array of resize handlers
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype._getResizeCallbacks = function () 
  {
    return this._callbacks;
  }

  /**
   * registeres new window resize listener which notifies all our resize handlers
   * 
   * @author Tomas 'Jerry' Samek
   */
  ResizeHandler.prototype._registerResizeHandler = function ()
  {
    var instance = this;
    
    var resizeHandler = function()
    {
      var callbacks = instance._getResizeCallbacks();
      var postCallbacks = [];
      // notify all handlers about window resize event and save their return context
      for(var i = 0; i < callbacks.length; i++)
      { 
        try
        {
          var returnContext = callbacks[i]['callback'](event);
          postCallbacks.push(callbacks[i]);
          // if there is no context then create new empty one
          if(!returnContext)
          {
            returnContext = {};
          }
          // add information about event
          returnContext['event'] = event;
          postCallbacks.push(returnContext);
        }
        catch(exception)
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, instance.getTypeName(), '_registerResizeHandler.callback', 'Exception: ' + exception.message + " (line: " + exception.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, instance.getTypeName(), '_registerResizeHandler.callback', 'Stack: ' + exception.stack);
        }
      }
      // notify all postCallbacks with context from previous callbacks
      for(var j = 0; j < postCallbacks.length; j = j + 2)
      {
        try
        {
          postCallbacks[j]['postCallback'](postCallbacks[j + 1]);
        }
        catch(exception)
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE,
              instance.getTypeName(), "_registerResizeHandler.postCallback", "Exception: " + exception.message + " (line: " + exception.line + ")");
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, 
              instance.getTypeName(), '_registerResizeHandler.postCallback', 'Stack: ' + exception.stack);
        }
      }
    }
    
    window.addEventListener('resize', function (event)
    {
      // bug 18391802: on resize handler must be postponed after the height/width have been set on 'body' 
      setTimeout(function() 
      {
        resizeHandler();
      }, 250);        // here's the delay timout
    });
  }
})();
(function(){
    
  var ResourceBundleLoader = function ()
  {
    this._loaded = [];
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ResourceBundleLoader, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResourceBundleLoader', 'singleton');
  
  /**
   * Loads given resource bundles.
   * @param bundles array of resource bundles to be loaded
   */
  ResourceBundleLoader.prototype.loadBundles = function (bundles)
  {
    var bundle = null;
    
    if(bundles && bundles.length > 0)
    {
      for(var i=0; i < bundles.length; i++) 
      {
        bundle = bundles[i];
        this.loadDvtResources(bundle.getUrl(), bundle.getCheckCallback(), bundle.getLoadCallback());  
      }
    }
  }
  
   /**
   * Load DVT bundles based on user locale
   * @param url base url of Resource Bundle
   * @param loadCheck optional check if Bundle was properly loaded
   */
  ResourceBundleLoader.prototype.loadDvtResources = function (url, checkCallback, loadCallback)
  {
    var loadedBundles = this._loaded;
     
    if(loadedBundles[url] !== undefined)
    {
      // resource is already loaded or function tried to load this resource but failed
      return;
    }

    var _locale = adf.mf.locale.getUserLanguage();
    var localeList = adf.mf.locale.generateLocaleList(_locale, true);
      
    var callback = function (locale)
    {
      // store some information about state of loaded js
      loadedBundles[url] = (locale === null);
      if (loadCallback) 
      {
        loadCallback();
      }
    }
    // function creates real path to js bundle
    var resourceBundleUrlConstructor = function (locale)
    {
      if (locale.indexOf("en") == 0)
      {
        return url + ".js";
      }
      return url + "_" + adf.mf.locale.getJavaLanguage(locale) + ".js";
    }

    var resourceBundleLoaded = function ()
    {
      // we have to leave additional check on caller funcion since Resource bundles are different in nature
      // and we don't know what kind of changes these bundles are doing.
      if (checkCallback)
      {
        return checkCallback();
      }
      // when there is no aditional check then js load success itself is resolved as complete success.
      return true;
    }

    this._loadJavaScriptByLocale(localeList, resourceBundleUrlConstructor, resourceBundleLoaded, callback);
  }

  /**
   * Function looks for first Resource Bundle that is loadable and satisfies predicate function.
   * @param localeList list of possible locales
   * @param contructor function that contructs complete url by locale and bundle base url
   * @param predicate tells if Resource Bundle is loaded successfully
   * @param callback function which will be notified after this method is complete
   *
   */
  ResourceBundleLoader.prototype._loadJavaScriptByLocale = function (localeList, constructor, predicate, callback)
  {
    // clone the array before calling the load method since it will actually
    // modify the array as it searches    
    var clonedList = localeList.slice(0);
    this._loadJavaScriptByLocaleImpl(clonedList, constructor, predicate, callback);
  }

  /**
   * Function looks recursively for the first Resource Bundle that is loadable and satisfies predicate function.
   * @param localeList list of possible locales
   * @param contructor function that contructs complete url by locale and bundle base url
   * @param predicate tells if Resource Bundle is loaded successfully
   * @param callback function which will be notified after this method is complete
   *
   * function will notify callback wih null argument if no B is loaded in other case it will notify
   * callback function with locale of loaded bundle as a parameter.
   */
  ResourceBundleLoader.prototype._loadJavaScriptByLocaleImpl = function (localeList, constructor, predicate, callback)
  {
    if (localeList.length == 0)
    {
      callback(null);
      return;
    }
    var locale = localeList.pop();
    var url = constructor(locale);

    var dfd = amx.includeJs(url);
    if ((dfd.state() !== 'pending') && (dfd.state() !== 'rejected') && predicate(locale))
    {
      callback(locale);
    }
    else 
    {
      this._loadJavaScriptByLocaleImpl(localeList, constructor, predicate, callback);
    }
  }
  
})();
(function(){   
  adf.mf.internal.dvt.AttributeProcessor = 
    {
      'TEXT' : 
        function (value)
        {
          if(value !== null)
          {
            return '' + value;
          } 
          return undefined;
        },
      'BOOLEAN' : 
        function (value)
        {
          return adf.mf.api.amx.isValueTrue(value);
        },
      'ON_OFF' : 
        function (value)
        {
          return adf.mf.api.amx.isValueTrue(value) ? 'on' : 'off';
        },
      'INTEGER' : 
        function (value)
        {
          return value === null ? 0 : parseInt(value);
        },
      'FLOAT' : 
        function (value)
        {
          return value === null ? 0.0 : parseFloat(value);
        },
      'PERCENTAGE' : 
        function (value)
        {
          return _processPercentageAttribute(value);
        },
      'DATETIME' :
        function (value)
        {
          return _convertDate(value);
        },
      'ROWKEYARRAY' :
        function (value)
        {
          return _processRowKeys(value);
        },
      'RATING_STEP' :
        function (value)
        {
          if (value !== null)
          {
            if (value === 'full')
              return 1.0;
            else if (value === 'half')
              return 0.5;
          }
          return undefined;
        }
    }
    
  /**
   * Parses the string attribute that can have value 0.0-1.0 or 0.0%-100.0% and 
   * returns float 0.0-1.0, in case of any error 1.0  
   *
   * parameters
   *
   * @param attribute - string that can be 0.0-1.0 or 0.0%-100.0%
   * @return float 0.0-1.0, in case of any error 1.0
   *
   */
  var _processPercentageAttribute = function (attribute) 
  {
    // result, default value
    var fl = 1.0;
    // is attribute percentage
    var percentage = false;
    var attributeLength;
  
    if (attribute !== undefined && attribute !== null)
    {  
      // trim attribute
      attribute = attribute.replace(/(^\s*)|(\s*$)/g, '');
      // number of characteres of attribute
      attributeLength = attribute.length - 1;
      
      // is the attribute percentage
      if (attribute.charAt(attributeLength) === '%') 
      {
        // set flag
        percentage = true;
        // remove percentage character
        attribute = attribute.substr(0, attributeLength);
      }
    
      // try to parse float value from first part of attribute without '%'
      fl = parseFloat(attribute);
      
      // is parsed number valid?
      if (!isNaN(fl)) 
      {
        // convert percent to number
        if (percentage) fl /= 100.0;
        // check if number is 0.0-1.0
        if (fl < 0.0 || fl > 1.0) fl = 1.0;
      }
      else 
        // any error
        fl = 1.0;
    } 
    
    return fl;
  }
  
  /**
   * Converts an ISO 8601 encoded date string to a timestamp
   *
   * @param dateStr a string containing a date/time (supposedly in ISO 8601 format)
   * @return a converted date as a timestamp, or the original date string, if the conversion failed
   */
  var _convertDate = function (dateStr)
  {
    var date = new Date(dateStr);

    if (!isNaN(date))
    {
      return date.getTime();
    }
    else 
    {
      return dateStr;
    }
  }
  
  /**
   * parses an array of rowkeys. The input can be specified as an array or
   * a string of rowkeys separated with comma or whitespace
   *
   * @param {Object} rowKeys input rowKey list
   * @return {Array} array of rowkeys
   */
  var _processRowKeys = function (rowKeys)
  {
    var result = [];
    
    if (!rowKeys)
    {
      return result;
    }
    
    if (rowKeys instanceof Array)
    {
      // already an array, just return a copy 
      for (var key in rowKeys)
      {
        result.push(key);
      }
    }
    // parse selection in case that it is in a string format
    else if (typeof rowKeys === "string")
    {
      if (rowKeys.indexOf(",") >  -1)
      {
        result = rowKeys.split(",");
      }
      else if (rowKeys.indexOf(" ") >  - 1)
      {
        result = rowKeys.split(" ");
      }
      else 
      {
        result = [rowKeys];
      }
    }
    else if (typeof rowKeys === "number")
    {
      result = [rowKeys];
    }
    return result;
  }

  
})();
(function ()
{  
  adf.mf.internal.dvt.StyleProcessor = 
  {
    'VISIBILITY' :
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['visibility'] === 'hidden' ? 'off' : 'on';
      },
    'CSS_TEXT' : 
      function(node, styleString)
      {
          var ignoreProperties = {};
          if (node) {
            if (hasClassName (node, "dvtm-gaugeMetricLabel") &&
                hasClassName (node.parentNode, "dvtm-ledGauge")
            ) {
              ignoreProperties ['font-size'] = true;
              ignoreProperties ['color'] = true;
            }
            if (hasClassName (node, "dvtm-chartSliceLabel") ||
                hasClassName (node, "dvtm-treemapNodeLabel") ||
                hasClassName (node, "dvtm-sunburstNodeLabel")
            ) {
              ignoreProperties ['color'] = true;
            }
          }
          var nodeStyle = _getComputedStyle(node);
          return _mergeOptionsAndDivStyle(node, nodeStyle, styleString, false, ignoreProperties);
      },
    'CSS_TEXT_TR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyleTr(node, nodeStyle, styleString);
      },
    'CSS_TEXT_WITH_BORDER_COLOR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        styleString = _mergeOptionsAndDivStyle(node, nodeStyle, styleString);
        return styleString;
      },      
    'BACKGROUND' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['background-color'];
      },
    'BORDER_COLOR' : 
      function(node, styleString) 
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['border-bottom-color'];
      },
    'TOP_BORDER' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['border-top-color'];
      },
    'BOTTOM_BORDER' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['border-bottom-color'];
      },
    'COLOR' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['color'];
      },
    'OPACITY' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['opacity'];
      },
    'BORDER_STYLE' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['border-bottom-style'];
      },
    'BOTTOM_BORDER_WIDTH' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['border-bottom-width'];
      },

    'CSS_BACK' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyle(node, nodeStyle, styleString, true);
      },
    'TOP_BORDER_WHEN_WIDTH_GT_0PX' :
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        if(nodeStyle['border-bottom-width'] === '0px')
        {
          return undefined;
        }
        return nodeStyle['border-top-color'];
      },
    'CSS' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return _mergeOptionsAndDivStyle(node, nodeStyle, styleString);
      },
    'WIDTH' : 
      function(node, styleString)
      {
        var nodeStyle = _getComputedStyle(node);
        return nodeStyle['width'];
      }
  }

  function hasClassName (node, className) {
    var classList = node.classList;
    if (!classList) return false;
    for (var i = 0; i < classList.length; i++) {
      if (classList [i] === className)
        return true;
    }
    return false;
  }
  
  adf.mf.internal.dvt.ROOT_NODE_STYLE = '_self';
  
  var _getComputedStyle = function (node)
  {
    return window.getComputedStyle(node, null);
  }
  
  var _buildCssBackStyleString = function (divStyle)
  {
    var styleString = "";
    if (divStyle['border-bottom-color'])
    {
      styleString += "border-color: " + divStyle['border-bottom-color'] + ";";
    }
    // border without border-style is always nonsense (with width 0px)
    if (divStyle['border-bottom-width'] && (divStyle['border-style'] && divStyle['border-style'] != 'none'))
    {
      styleString += "border-width: " + divStyle['border-bottom-width'] + ";";
    }
    if (divStyle['background-color'])
    {
      styleString += "background-color: " + divStyle['background-color'] + ";";
    }
    
    return styleString;
  }
  
  /**
   * build css style string
   */
  var _buildTextCssStyleString = function (divStyle, ignoreProperties)
  {   
    var styleString = "";
  
    if (divStyle['font-family'])
    {
      styleString += "font-family: " + divStyle['font-family'] + ";";
    }
    if (divStyle['font-size'] && !ignoreProperties ['font-size'])
    {
      styleString += "font-size: " + divStyle['font-size'] + ";";
    }
    if (divStyle['font-weight'])
    {
      styleString += "font-weight: " + divStyle['font-weight'] + ";";
    }
    if (divStyle['color'] && !ignoreProperties ['color'])
    {
      styleString += "color: " + divStyle['color'] + ";";
    }
    if (divStyle['font-style'])
    {
      styleString += "font-style: " + divStyle['font-style'] + ";";
    }
    return styleString;
  }
  var _mergeOptionsAndDivStyleTr = function (cssDiv, cssDivStyle, optionsStyle)
  {
    if(!cssDiv) 
    {
      return optionsStyle;  
    }
    
    var oldStyle;
    if(optionsStyle) 
    {
      oldStyle = cssDiv.getAttribute("style");
      cssDiv.setAttribute("style", oldStyle + ";" + optionsStyle);
    }
    var styleString = '';
    if (cssDivStyle['border-top-color'])
    {
      styleString += "-tr-inner-color: " + cssDivStyle['border-top-color'] + ";";
    }
    if (cssDivStyle['border-bottom-color'])
    {
      styleString += "-tr-outer-color: " + cssDivStyle['border-bottom-color'] + ";";
    }
    return styleString;
  }  
  /*
  var _buildTextCssStyleString = function (divStyle)
  {   
    var styleString = "";
    
    if (divStyle['color'])
    {
      styleString += "color: " + divStyle['color'] + ";";
    }
    if (divStyle['font-family'])
    {
      styleString += "font-family: " + divStyle['font-family'] + ";";
    }
    if (divStyle['font-size'])
    {
      styleString += "font-size: " + divStyle['font-size'] + ";";
    }
    if (divStyle['font-style'])
    {
      styleString += "font-style: " + divStyle['font-style'] + ";";
    }
    if (divStyle['font-variant'])
    {
      styleString += "font-variant: " + divStyle['font-variant'] + ";";
    }
    if (divStyle['font-weight'])
    {
      styleString += "font-weight: " + divStyle['font-weight'] + ";";
    }
    if (divStyle['letter-spacing'])
    {
      styleString += "letter-spacing: " + divStyle['letter-spacing'] + ";";
    }
    if (divStyle['text-decoration'])
    {
      styleString += "text-decoration: " + divStyle['text-decoration'] + ";";
    }
    if (divStyle['text-indent'])
    {
      styleString += "text-indent: " + divStyle['text-indent'] + ";";
    }
    if (divStyle['text-transform'])
    {
      styleString += "text-transform: " + divStyle['text-transform'] + ";";
    }
    if (divStyle['white-space'])
    {
      styleString += "white-space: " + divStyle['white-space'] + ";";
    }
    if (divStyle['word-spacing'])
    {
      styleString += "word-spacing: " + divStyle['word-spacing'] + ";";
    }
    
    return styleString;
  }
  */

  /**
   * Merges style on div with css text in optionsStyle.
   * 
   * @param cssDiv element with style class or with some default style
   * @param optionsStyle extending CSS text style
   * @return merged CSS text style
   * @private
   * @ignore
   */
  _mergeOptionsAndDivStyle = function(cssDiv, cssDivStyle, optionsStyle, back, ignoreProperties)
  {     
    if (!ignoreProperties)
      ignoreProperties = {};
    
    if(!cssDiv) 
    {
      return optionsStyle;  
    }
    
    var oldStyle;
    if(optionsStyle) 
    {
      oldStyle = cssDiv.getAttribute("style");
      cssDiv.setAttribute("style", oldStyle + ";" + optionsStyle);
    }      
    
    var styleString = '';
    
    if(back !== true)
    {
      styleString += _buildTextCssStyleString(cssDivStyle, ignoreProperties);
    }
    
    if(back !== false)
    {
      styleString += _buildCssBackStyleString(cssDivStyle);
    }
    if(oldStyle)
    {
      cssDiv.setAttribute("style", oldStyle);
    }
    return styleString;
  }

})();
(function()
{
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;
  /**
   * Class describes how the renderers should be processed to achive unified processing of
   * all attributes and child amx nodes.
   */
  var BaseRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseRenderer, 'adf.mf.api.amx.TypeHandler', 'adf.mf.internal.dvt.BaseRenderer');

  /**
   * @param amxNode
   * @return object that describes atributes of the component.
   */
  BaseRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    return {};
  }

  /**
   * @return object that describes child renderers of the component.
   */
  BaseRenderer.prototype.GetChildRenderers = function ()
  {
    return {};
  }

  BaseRenderer.prototype.render = function (amxNode, id)
  {
    // prepare processing context
    var context = this.CreateContext(amxNode, null, null);
    // process attributes of parameter amxNode and translate its attributes
    // to the attributes on the options object
    this._processAttributes(amxNode, context);
    // process children of the amxNode and let them set options object
    this._processChildren(amxNode, context);
  }

  BaseRenderer.prototype.refresh = function (amxNode, attributeChanges, descendentChanges)
  {
    // prepare processing context
    var context = this.CreateContext(amxNode, attributeChanges, descendentChanges);
    // process attributes of parameter amxNode and translate its attributes
    // to the attributes on the options object
    this._processAttributes(amxNode, context);
    // process children of the amxNode and let them set options object
    this._processChildren(amxNode, context);
  }

  /**
   * process chart's children found on the amxNode
   *
   * @param amxNode current amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype._processAttributes = function (amxNode, context)
  {
    var options = amxNode['_optionsObj'];
    // call BaseRenderer's ProcessAttributes function to resolve attributes.
    var changed = this.ProcessAttributes(options, amxNode, context);
    if(changed)
    {
      this.SetOptionsDirty(amxNode, true);
    }
  }

  /**
   * process chart's children found on the amxNode
   *
   * @param amxNode current amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype._processChildren = function (amxNode, context)
  {
    // create new context for processing of the child nodes
    var options = amxNode['_optionsObj'];
    // call CompositeRenderer's ProcessChildren function to resolve child nodes.
    var changed = this.ProcessChildren(options, amxNode, context);

    if(changed)
    {
      this.SetOptionsDirty(amxNode, true);
    }
  }

  /**
   * @param amxNode current amxNode
   * @param attributeChanges
   * @param descendentChanges
   * @return context for processing of the attributes and children
   */
  BaseRenderer.prototype.CreateContext = function(amxNode, attributeChanges, descendentChanges)
  {
    var context =
    {
      'amxNode' : amxNode,
      '_attributeChanges' : attributeChanges,
      '_descendentChanges' : descendentChanges
    };

    return context;
  }

  BaseRenderer.prototype.GetOptions = function (options)
  {
    return options;
  }

  BaseRenderer.prototype.SetOptionsDirty = function (amxNode, value)
  {
    amxNode["_optionsDirty"] = value;
  }

  BaseRenderer.prototype.IsOptionsDirty = function (amxNode)
  {
    return amxNode["_optionsDirty"];
  }

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start("adf.mf.internal.dvt.BaseRenderer.ProcessAttributes");
    try
    {
      options = this.GetOptions(options);
      var attributeMap = this.GetAttributesDefinition(amxNode);
      var changed = false;

      for (var attribute in attributeMap)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessAttributes", "Attribute changed: " + attribute);

        var definition = attributeMap[attribute];
        var path = new JSONPath(options, definition['path']);
        var attrChanged = false;

        var value = undefined;
        if (amx.dtmode && definition['dtvalue'])
        {
          value = definition['dtvalue'];
        }
        else if (amxNode.isAttributeDefined(attribute))
        {
          value = amxNode.getAttribute(attribute);
          if (amx.dtmode && typeof value === 'string' && value.indexOf('#{') >  - 1)
          {
            value = undefined;
          }

          if(value !== undefined && definition['type'])
          {
            value = definition['type'](value);
          }
        }

        if(value !== undefined)
        {
          attrChanged = path.setValue(value);
        }
        else if (definition['default'] !== undefined)
        {
          attrChanged = path.setValue(definition['default']);
        }

        changed = changed || attrChanged;
      }
      return changed;
    }
    finally
    {
      perf.stop();
    }
  }

  /**
   * @param amxNode current amxNode
   * @param context rendering context
   * @return list of child nodes of the amxNode
   */
  BaseRenderer.prototype.GetChildrenNodes = function (amxNode, context)
  {
    return amxNode.getChildren();
  }
  /**
   * Function processes supported childTags which are on amxNode.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context renderingcontext
   */
  BaseRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start("adf.mf.internal.dvt.BaseRenderer.ProcessChildren");
    try
    {
      var renderers = this.GetChildRenderers();
      // skip processing when component has no child renderers
      if(renderers)
      {
        options = this.GetOptions(options);
        var children = this.GetChildrenNodes(amxNode, context);
        var forProcessing = [];
        var i;
        var occurrences = {};
        // at the first iteration find only supported child nodes
        for(i = 0; i < children.length; i++)
        {
          var tagName = children[i].getTag().getName();
          var rendererObject = renderers[tagName];
          // find if there is a renderer for current child node
          if (rendererObject && rendererObject['renderer'])
          {
            var renderer = rendererObject['renderer'];
            // check if how many children can be nested in this amxNode
            var maxOccurrences = renderer['maxOccurrences'];
            if(maxOccurrences !== undefined && maxOccurrences !== null)
            {
              if(occurrences[tagName] === undefined)
              {
                occurrences[tagName] = 0;
              }
              // check if function can still process this child node
              if(occurrences[tagName] < maxOccurrences)
              {
                occurrences[tagName] = occurrences[tagName] + 1;
              }
              else
              {
                adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "Too many occurrences of the node '" +  tagName + "'!");
                continue;
              }
            }
            // add job to be processed
            forProcessing.push({
              'r' : renderer,
              'c' : children[i],
              'p' : (rendererObject['order'] === undefined ? 0 : rendererObject['order']),
              'o' : i
            });
          }
          else
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is no renderer for node '" + tagName + "'!");
          }
        }
        // sort all nodes which are supposed to be rendered by priority to
        // ensure proper child resolution and dependencies
        forProcessing.sort(function(a,b) {return (a['p'] === b['p']) ? a['o'] - b['o'] : a['p'] - b['p'];});
        // call attribute processing and child processing on each child which should be rendered
        var changed = false;
        for (i = 0; i < forProcessing.length; i++)
        {
          if(forProcessing[i]['r'].ProcessAttributes)
          {
            var changes = context['_attributeChanges'];
            var descendentChanges = context['_descendentChanges'];
            if (descendentChanges)
              context['_attributeChanges'] = descendentChanges.getChanges(forProcessing[i]['c']);

            changed = changed | forProcessing[i]['r'].ProcessAttributes(options, forProcessing[i]['c'], context);
            context['_attributeChanges'] = changes;
          }
          else
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + forProcessing[i]['c'].getTag().getName() + "'!");
          }
          if(forProcessing[i]['r'].ProcessChildren)
          {
            changed = changed | forProcessing[i]['r'].ProcessChildren(options, forProcessing[i]['c'], context);
          }
          else
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessChildren method on renderer for '" + forProcessing[i]['c'].getTag().getName() + "'!");
          }
        }
        return changed;
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There are no child renderers for node '" +  amxNode.getTag().getName() + "'!");
        return false;
      }
    }
    finally
    {
      perf.stop();
    }
  }
})();
(function ()
{
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;

  /**
   * Common ancestor for all top level dvt component renderers which directly interacts with the amx layer.
   *
   * Implemented AMX Interface functions
   *  - create (function contructs component's Options)
   *  - init (function registers listeners for new component)
   *  - postDisplay (function renders chart itself)
   *  - refresh (function refreshes component's Options)
   *  - destroy (function removes registered listeners from init function)
   */
  var BaseComponentRenderer = function ()
  {}

  // renderer extend adf.mf.internal.dvt.BaseRenderer which means that this renderer supports
  // rendering of the child tags
  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseComponentRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.BaseComponentRenderer');

  adf.mf.internal.dvt.AMX_NAMESPACE = 'http://xmlns.oracle.com/adf/mf/amx';
  adf.mf.internal.dvt.DVT_NAMESPACE = 'http://xmlns.oracle.com/adf/mf/amx/dvt';
  adf.mf.internal.dvt.INSTANCE = '_jsComponentInstance';

  BaseComponentRenderer.DEFAULT_WIDTH = 300;
  BaseComponentRenderer.DEFAULT_HEIGHT = 200;

  // allow to override default behavior
  BaseComponentRenderer.prototype.isRendered = function (amxNode)
  {
    // first check if this data item should be rendered at all
    var rendered = true;
    var attrValue = amxNode.getAttribute('rendered');
    if (attrValue !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(attrValue))
        rendered = false;
    }
    return rendered;
  };

  /**
   * Function creates component's options, merges them with default styles.
   *
   * @param amxNode
   * @return jquery div element
   */
  BaseComponentRenderer.prototype.render = function (amxNode, id)
  {
    // set a private flag to indicate whether the node can be populated with contents
    // should an exception occur during data processing, this flag will be set to false
    this._setReadyToRender(amxNode, true);

    // just render div
    if (amxNode['_renderDiv'])
    {
      return this.SetupComponent(amxNode);
    }

    try
    {
      // load resource bundles for this component
      this._loadResourceBundles();
      // create new options object
      this.InitComponentOptions(amxNode);
      // fill newly created object with default and custom styles
      this.MergeComponentOptions(amxNode);
      // call parent renderer to resolve atributes and childrens
      BaseComponentRenderer.superclass.render.call(this, amxNode, id);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.INFO, this.getTypeName(), "create", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "create", "Stack: " + ex.stack);
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "create", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "create", "Stack: " + ex.stack);
      }
    }
    // create new jquery div element for this amxNode
    return this.SetupComponent(amxNode);
  }

  BaseComponentRenderer.prototype.renderDiv = function (amxNode)
  {
    amxNode['_renderDiv'] = true;
    var div = amxNode.render();
    delete amxNode['_renderDiv'];
    return div;
  };

  /**
   * Function initilazes component's dom node and registers listeners for this component.
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.init = function (node, amxNode)
  {
    try
    {
      // call internal function that performs initialization
      this.InitComponent(node, amxNode);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.INFO, this.getTypeName(), "init", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "init", "Stack: " + ex.stack);
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "init", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "init", "Stack: " + ex.stack);
      }
    }
  }

  /**
   * Function renders component.
   *
   * Render is skipped when _isReadyToRender function returns false which indicates that some exception occures before
   * this state and there can be some inconsistency in data so all render phase is skipped
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.postDisplay = function (node, amxNode)
  {
    if (this._isReadyToRender(amxNode))
    {
      this._renderComponent(node, amxNode);
    }
  }

  /**
   * Function resets component's options and renderes component.
   *
   * @param amxNode
   * @param attributeChanges changes of current amxNode
   */
  BaseComponentRenderer.prototype.refresh = function (amxNode, attributeChanges, descendentChanges)
  {
    if (this._isWaitingForData(amxNode))
    {
      this._setWaitingForData(amxNode, false);
      /* BUG 17458279: If there are any descendent changes we should save them for next processing,
       * when data will be ready for rendering */
      if (descendentChanges !== undefined)
      {
        amxNode["_pendingDescendentChanges"] = descendentChanges;
      }
      return;
    }
    /* BUG 17458279: Check if we have some descendent changes available. If so, then use them and drop them. */
    if ((descendentChanges === undefined) && (amxNode["_pendingDescendentChanges"] !== undefined))
    {
      descendentChanges = amxNode["_pendingDescendentChanges"];
      delete amxNode["_pendingDescendentChanges"];
    }
    // set a private flag to indicate whether the node can be populated with contents
    // should an exception occur during data processing, this flag will be set to false
    this._setReadyToRender(amxNode, true);

    try
    {
      // reset options object
      this.ResetComponentOptions(amxNode, attributeChanges, descendentChanges);
      // call parent renderer to resolve atributes and childrens
      BaseComponentRenderer.superclass.refresh.call(this, amxNode, attributeChanges, descendentChanges);
    }
    catch (ex)
    {
      // set flag that unexpected state occured and renderer is not able to render this amxNode
      this._setReadyToRender(amxNode, false);
      if (ex instanceof adf.mf.internal.dvt.exception.NodeNotReadyToRenderException)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.INFO, this.getTypeName(), "refresh", ex + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "refresh", "Stack: " + ex.stack);
      }
      else
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "refresh", "Exception: " + ex.message + " (line: " + ex.line + ")");
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "refresh", "Stack: " + ex.stack);
      }
    }
    // find the dom node for amxNode
    if (this._isReadyToRender(amxNode))
    {
      this.renderNode(amxNode);
    }
  }

  BaseComponentRenderer.prototype.renderNode = function (amxNode)
  {
    var node = document.getElementById(this.GetComponentId(amxNode));
    this._renderComponent(node, amxNode);
  };

  /**
   * Function removes registered listeners.
   *
   * @param amxNode
   * @param node dom div element
   */
  BaseComponentRenderer.prototype.destroy = function (node, amxNode)
  {
    this.DestroyComponent(node, amxNode);
  }

  // END OF AMX INTERFACE
  /**
   * Function is called in init phase and should initialize shell of the options object
   *
   * @param amxNode
   */
  BaseComponentRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    this.SetOptionsDirty(amxNode, true);
  }

  /**
   * Function is called in refresh phase and should reset the options object according to attributeChanges parameter.
   *
   * @param amxNode
   * @param attributeChanges
   */
  BaseComponentRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    // clear the 'dirty' flag on the options object
    this.SetOptionsDirty(amxNode, false);
  }

  /**
   * @return unique ID of rendered component
   */
  BaseComponentRenderer.prototype.GetComponentId = function (amxNode)
  {
    var id = amxNode.getId();

    if (id === undefined)
    {
      idAttr = '';
    }
    return id;
  }

  /**
   * sets up chart's outer div element
   *
   * @param amxNode
   */
  BaseComponentRenderer.prototype.SetupComponent = function (amxNode)
  {
    // create main div
    var contentDiv = DOMUtils.createDIV();
    // set up basic div's attributes
    var id = this.GetComponentId(amxNode);
    DOMUtils.writeIDAttribute(contentDiv, id);
    DOMUtils.writeStyleAttribute(contentDiv, 'width: 100%; height: 100%;');

    var contentDivClass = this.GetContentDivClassName();
    if (contentDivClass)
    {
      DOMUtils.writeClassAttribute(contentDiv, contentDivClass);
    }
    // set inner content of the div with generated html which contains all the helper divs
    var styleClassMap = this.GetStyleClassesDefinition();
    contentDiv.innerHTML = _generateInnerHTML(styleClassMap, amxNode);

    return contentDiv;
  }

  BaseComponentRenderer.prototype.GetContentDivClassName = function ()
  {
    return null;
  };

  var _generateInnerHTML = function (classes, amxNode)
  {
    var innerHtml = '';
    for (var styleClass in classes)
    {
      if (styleClass === adf.mf.internal.dvt.ROOT_NODE_STYLE)
      {
        continue;
      }

      innerHtml += '<div class="';
      var builderFunction = classes[styleClass]['builderFunction'];
      if (builderFunction !== undefined)
      {
        var result = builderFunction(amxNode);
        innerHtml += result;
      }
      else
      {
        innerHtml += styleClass;
      }
      innerHtml += '" style="display:none;"><\/div>';
    }

    return innerHtml;
  }

  /**
   * @return object that describes styleClasses of the component.
   */
  BaseComponentRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    return {};
  }

  /**
   * @return string path from the window to user specified custom styles.
   */
  BaseComponentRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomComponentStyle';
  }

  /**
   * @return default style object for the component.
   */
  BaseComponentRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return {};
  }

  /**
   * Function fills options object with merged styles from default styles and custom styles.
   * Default styles are returned from GetCustomStyleProperty function and default style object
   * is returne by function GetDefaultStyles
   *
   * @param amxNode amxNode of this component
   */
  BaseComponentRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    var options = amxNode["_optionsObj"];
    // first, apply JSON style properties
    var styleJSON;
    var property = this.GetCustomStyleProperty(amxNode);
    var jsonPath = new JSONPath(window, property);
    var customStyles = jsonPath.getValue();

    if (customStyles !== undefined)
    {
      styleJSON = DvtJSONUtils.merge(customStyles, this.GetDefaultStyles(amxNode));
    }
    else
    {
      styleJSON = this.GetDefaultStyles(amxNode);
    }
    // if we got here, assume the options object *will* be modified
    this.SetOptionsDirty(amxNode, true);

    // the 'optionsObject' is a result of the default and custom style
    amxNode['_optionsObj'] = DvtJSONUtils.merge(styleJSON, options);
  }

  /**
   * returns the component's width
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.GetComponentWidth = function (simpleNode, amxNode)
  {
    var width = DOMUtils.getWidth(simpleNode);
    if (width <= 1)
    {
      // width not set or too small, try using parent width instead
      width = DOMUtils.getWidth(simpleNode.parentNode);
    }
    // set flag that the default value should be set
    if (width <= 1)
    {
      amxNode.setAttributeResolvedValue('_defaultDimensionsApplied', true);
    }
    return width;
  }

  /**
   * returns true when component can use extended form of the height determination. We don't want this to happen
   * in case of the components that manage the layout itself. For example deck and panelStretchLayout.
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.IsSmartLayoutCapable = function (simpleNode, amxNode)
  {
    if (amxNode === null || amxNode.getParent() === null)
    {
      return false;
    }
    switch (amxNode.getParent().getTag().getName())
    {
      case 'deck':
      case 'panelStretchLayout':
        return false;
      default:
        return true;
    }
  }

  /**
   * returns the component's height
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.GetComponentHeight = function (simpleNode, amxNode)
  {
    // height set in fixed units for example px
    var height =  + simpleNode.getAttribute('_userheight');
    if (!height)
    {
      height = 0;
    }

    if (height < 1 && simpleNode.parentNode)
    {
      // height not set or too small, try using parent height instead
      var parentHeight = DOMUtils.getHeight(simpleNode.parentNode);
      var nodePercentage =  + simpleNode.getAttribute('_relativeheight');
      var totalPercentage = 100;
      // ask component if it can use the complex calculation of the height
      if (this.IsSmartLayoutCapable(simpleNode, amxNode))
      {
        totalPercentage = nodePercentage;

        var sibblingsAndMe = simpleNode.parentNode.childNodes;
        var myId = simpleNode['id'];
        // subtracts all siblings with fixed width and tries to determin weight of
        // current component by its percentage height
        for (var i = 0;i < sibblingsAndMe.length;i++)
        {
          if (myId !== sibblingsAndMe[i]['id'])
          {
            // relative height in scope of all other components
            var sibblingRelHeight = sibblingsAndMe[i].getAttribute('_relativeheight');
            var sibblingUserHeight =  + sibblingsAndMe[i].getAttribute('_userheight');
            var sibHeight = DOMUtils.getHeight(sibblingsAndMe[i]);
            if ((sibHeight <= 1 || sibblingRelHeight) && !sibblingUserHeight)
            {
              var sibblingNodePercentage =  + sibblingRelHeight;
              if (!sibblingNodePercentage || sibblingNodePercentage <= 0)
              {
                sibblingNodePercentage =  + DOMUtils.parseStyleSize(sibblingsAndMe[i].style.height, true);
              }
              // add relative height of sibbling to total relative height
              totalPercentage = totalPercentage + sibblingNodePercentage;
              parentHeight = parentHeight + sibHeight;
            }
            // substract sibblings height and also its padding, border and margin
            if (sibblingUserHeight)
            {
              sibblingUserHeight =  + sibblingUserHeight;
              parentHeight = parentHeight - sibblingUserHeight;
            }
            else
            {
              parentHeight = parentHeight - DOMUtils.getOuterHeight(sibblingsAndMe[i]);
            }
          }
        }
      }
      // height is portion of the available parent height without fixed height components divided by weight
      // of this component in scope of all present components with relative height.
      height = parentHeight * (nodePercentage / Math.max(totalPercentage, 100));
    }
    // set flag that the default value should be set
    if (height < 1)
    {
      amxNode.setAttributeResolvedValue('_defaultDimensionsApplied', true);
    }
    return Math.floor(height);
  }

  /**
   * removes calculated values from component's dom node
   */
  BaseComponentRenderer.prototype.ResetComponentDimensions = function (simpleNode, amxNode)
  {
    // reset all computed values at first
    delete amxNode['_computedheight'];
    delete amxNode['_computedwidth'];

    DOMUtils.setHeight(simpleNode, '0px');
    var forcedWidth = amxNode.getAttribute('_forcedWidth');
    if (forcedWidth !== null)
    {
      simpleNode.style.width = forcedWidth;
      amxNode.setAttributeResolvedValue('_forcedWidth', null);
    }
  }

  /**
   * sets newly calculated dimensions to the dom node
   */
  BaseComponentRenderer.prototype.SetComponentDimensions = function (simpleNode, amxNode)
  {
    var width = amxNode['_computedwidth'] || this.GetComponentWidth(simpleNode, amxNode);
    var height = amxNode['_computedheight'] || this.GetComponentHeight(simpleNode, amxNode);
    if (width <= 1)
    {
      width = BaseComponentRenderer.DEFAULT_WIDTH;
    }
    if (height < 1)
    {
      height = BaseComponentRenderer.DEFAULT_HEIGHT;
    }
    // in some cases when parent has 0-1px size we need to stretch this div to ensure default component width
    if (DOMUtils.getWidth(simpleNode) < width)
    {
      amxNode.setAttributeResolvedValue('_forcedWidth', simpleNode.style.width);
      DOMUtils.setWidth(simpleNode, width + 'px');
    }
    // store the node's width
    amxNode['_computedwidth'] = width;
    // adjust and store the node's height
    amxNode['_computedheight'] = height;
    // in case that component is in carousel set relative height
    if (simpleNode.parentNode && simpleNode.parentNode.childNodes.length === 1 && simpleNode.parentNode.className.match(/\bamx-carouselItem\b/))
    {
      var parentHeight = DOMUtils.getHeight(simpleNode.parentNode);
      var relative = height / parentHeight * 100;
      DOMUtils.setHeight(simpleNode, Math.floor(relative) + '%');
    }
    else
    {
      DOMUtils.setHeight(simpleNode, height + 'px');
    }

    this._adjustStageParameters(this.GetStageId(amxNode), width, height);

    return {'w' : width, 'h' : height};
  }

  /**
   * checks if the node passed as the first parameter is the ancestor of the
   * node
   *
   * @param ancestorNode  the presumed ancestorNode
   * @param node  a presumed descendant of the ancestorNode
   * @return 'true' if node is a descendant of the ancestorNode
   *
   */
  BaseComponentRenderer.prototype.IsAncestor = function (ancestorNode, node)
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
   * Initialize all dvtm components.
   *
   * @param simpleNode root dom node of this component
   * @param amxNode amxNode of this component
   *
   * @author Tomas 'Jerry' Samek
   */
  BaseComponentRenderer.prototype.InitComponent = function (simpleNode, amxNode)
  {
    var userHeight = DOMUtils.parseStyleSize(simpleNode.style.height);
    var userWidth = DOMUtils.parseStyleSize(simpleNode.style.width);
    // determin if height of this component if fixed or relative
    // we don't have to care about width since it's computed by webview itself properly
    if (userHeight > 0)
    {
      simpleNode.setAttribute('_userheight', userHeight);
    }
    else
    {
      var nodePercentage = DOMUtils.parseStyleSize(simpleNode.style.height, true);
      simpleNode.setAttribute('_relativeheight', nodePercentage);
    }

    this.ResetComponentDimensions(simpleNode, amxNode);

    // register the resize handler in case we need to resize the chart later
    // listener should be registered only when at least one dimension is relative
    if (userWidth == 0 || userHeight == 0)
    {
      this.InitResizeHandler(simpleNode, amxNode);
    }

    var stopPropagationHandler = function (event)
    {
      event.stopPropagation();
    }

    // stop propagation of certain events when the component handles swipe/drag gesture
    if (this.PreventsSwipe(amxNode))
    {
      simpleNode.addEventListener('mousedown', stopPropagationHandler, false);
      simpleNode.addEventListener('touchstart', stopPropagationHandler, false);
    }

  }

  BaseComponentRenderer.prototype.InitResizeHandler = function (simpleNode, amxNode)
  {
    var stageId = this.GetStageId(amxNode);
    var renderCallback = this.GetRenderCallback(amxNode);

    var activeInstance = this;
    var self = this;
    // resize called by parent containers
    $(simpleNode).resize(amxNode, function (event)
    {
      if (!self.IsAncestor(document.body, simpleNode) || !amxNode[adf.mf.internal.dvt.INSTANCE])
      {
        // simpleNode is not in DOM, do not render
        return;
      }
      activeInstance.ResetComponentDimensions(simpleNode, amxNode);

      adf.mf.log.Framework.logp(adf.mf.log.level.INFO, activeInstance.getTypeName(), "InitComponent.resize", "Re-rendering component due to a node resize event.");

      var dimensions = activeInstance.SetComponentDimensions(simpleNode, amxNode);
      // call render callback to rerender component
      renderCallback.call(activeInstance, self.GetComponentInstance(simpleNode, amxNode), dimensions['w'], dimensions['h'], amxNode, stageId);
    });

    // resize callback called called when global window resize event occures
    var resizeCallback = this.GetResizeCallback(activeInstance, simpleNode, amxNode);
    // callback called after all previsou resizeCallbacks are called
    var postResizeCallback = this.GetPostResizeCallback(activeInstance, simpleNode, amxNode);
    var resizeHandler = adf.mf.internal.dvt.util.ResizeHandler.getInstance();
    // add previous callbacks
    resizeHandler.addResizeCallback(amxNode.getId(), resizeCallback, postResizeCallback);
  };

  BaseComponentRenderer.prototype.GetRenderCallback = function (amxNode)
  {
    return this.RenderComponent;
  };

  BaseComponentRenderer.prototype.GetResizeCallback = function (activeInstance, simpleNode, amxNode)
  {
    return function (event)
    {
      // store old dimensions
      var oldHeight = amxNode['_computedheight'];
      var oldWidth = amxNode['_computedwidth'];
      // reset all computed value at first
      activeInstance.ResetComponentDimensions(simpleNode, amxNode);
      // return old values as a context
      return {'oldwidth' : oldWidth, 'oldheight' : oldHeight};
    };
  };

  BaseComponentRenderer.prototype.GetPostResizeCallback = function (activeInstance, simpleNode, amxNode)
  {
    var self = this;
    return function (context)
    {
      if (!self.IsAncestor(document.body, simpleNode))
      {
        // simpleNode is not in DOM, do not render
        return;
      }
      var renderCallback = activeInstance.GetRenderCallback(amxNode);
      var stageId = activeInstance.GetStageId(amxNode);
      // obtain infromation about new and old dimensions
      var oldHeight = context['oldheight'];
      var oldWidth = context['oldwidth'];
      // if dimensions are different then rerender component
      var dimensions = activeInstance.SetComponentDimensions(simpleNode, amxNode);
      if (dimensions['height'] != oldHeight || dimensions['width'] != oldWidth)
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.INFO, activeInstance.getTypeName(), "InitComponent.postResizeCallback", "Re-rendering component due to a window resize event.");
        // call render callback to rerender component
        renderCallback.call(activeInstance, self.GetComponentInstance(simpleNode, amxNode), dimensions['w'], dimensions['h'], amxNode, stageId);
      }
    };
  };

  /**
   * Function renders component. If the component is not already nested in the dom tree then function pospone this
   * and register handler which listen on DOMNodeInsertedIntoDocument event.
   * @private
   */
  BaseComponentRenderer.prototype._renderComponent = function (simpleNode, amxNode)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.BaseComponentRenderer._renderComponent");
    try
    {
      if (!this.IsAncestor(document.body, simpleNode))
      {
        if (amxNode.getAttribute('_insertIntoTheDomHandlerRegistered') !== true)
        {
          // prevent other insert into the dom listener to be attached in case that there is 
          // one already
          amxNode.setAttributeResolvedValue('_insertIntoTheDomHandlerRegistered', true);
          var activeInstance = this;
          var handler = function (aNode, aAmxNode)
          {
            var callback = function (e)
            {
              this.removeEventListener("DOMNodeInsertedIntoDocument", callback);
              amxNode.setAttributeResolvedValue('_insertIntoTheDomHandlerRegistered', null);
              activeInstance._renderComponent(aNode, aAmxNode);
            };
            return callback;
          };

          simpleNode.addEventListener("DOMNodeInsertedIntoDocument", handler(simpleNode, amxNode));
        }
        // we can postpone everything to the point when we are in dom tree
        return;
      }
      // first, get the dimensions from style
      var dimensions = this.SetComponentDimensions(simpleNode, amxNode);
      // in some cases the postdisplay is called to soon so the dom layout is not yet ready
      // the dirty solution is to jump out of the current stack and leave the rendering
      // after the current stack is done.
      if (amxNode.getAttribute('_defaultDimensionsApplied') === true 
       && amxNode.getAttribute('_renderLaterPass') !== true)
      {
        var that = this;
        // prevent new callback from being registered
        if (amxNode.getAttribute('_renderLaterTimeout'))
        {
          return;
        }
        var timeout = setTimeout(function()
        {
          amxNode.setAttributeResolvedValue('_renderLaterTimeout', null);
          // set the second run to avoid infinite loop
          // in this case the default is only available value and chart
          // can not wait for the possible better value
          amxNode.setAttributeResolvedValue('_renderLaterPass', true);
          // reset the components dimension
          that.ResetComponentDimensions(simpleNode, amxNode);
          // render component
          that._renderComponent(simpleNode, amxNode);
        }, 0);

        amxNode.setAttributeResolvedValue('_renderLaterTimeout', timeout);
        // do not continue in the rendering
        return;
      }
      // delete temporary flags
      amxNode.setAttributeResolvedValue('_renderLaterPass', null);
      amxNode.setAttributeResolvedValue('_defaultDimensionsApplied', null);
      amxNode.setAttributeResolvedValue('_renderLaterTimeout', null);

      var componentInstance = this.GetComponentInstance(simpleNode, amxNode);

      this.ProcessStyleClasses(simpleNode, amxNode);

      this.RenderComponent(componentInstance, dimensions['w'], dimensions['h'], amxNode);

      // chart instance rendered, reset the dirty flag
      this.SetOptionsDirty(amxNode, false);
    }
    catch (ex)
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "_renderComponent", "Exception: " + ex.message + " (line: " + ex.line + ")");
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "_renderComponent", "Stack: " + ex.stack);
      // remove the rendered content, if it exists, it's broken anyway
      var stage = document.getElementById(stageId);
      if (stage)
      {
        simpleNode.removeChild(stage);
      }
    }
    finally
    {
      perf.stop();
    }
  }

  /**
   * @return unique id of the element which is used for rendering
   */
  BaseComponentRenderer.prototype.GetStageId = function (amxNode)
  {
    var id = this.GetComponentId(amxNode);
    if (!id)
    {
      id = amxNode.getTag().getName();
    }

    id = id + '_svg';

    return id;
  }

  /**
   * @param node root node of the component
   * @param stageId unique id of element where the rendering is performed
   * @param width width of the component
   * @param height height of the component
   * @return DvtToolkitContext
   */
  BaseComponentRenderer.prototype.CreateRenderingContext = function (root, stageId, width, height)
  {
    var stage = document.getElementById(stageId);
    if (stage)
    {
      root.removeChild(stage);
    }
    var context = new DvtContext(root, root.id);
    stage = document.getElementById(stageId);

    this._adjustStageParameters(stage, width, height);

    return context;
  }

  BaseComponentRenderer.prototype._adjustStageParameters = function (stage, width, height)
  {
    if (typeof stage === 'string')
    {
      stage = document.getElementById(stage);
    }

    if (stage instanceof SVGSVGElement)
    {
      var stageDim = this.AdjustStageDimensions(
      {
        'width' : width, 'height' : height
      });
      stage.setAttribute('viewBox', "0 0 " + stageDim['width'] + " " + stageDim['height']);
      stage.setAttribute('preserveAspectRatio', "none");
    }
  }

  BaseComponentRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    return dim;
  }

  /**
   * @return callback object for the toolkit component which handles value change, selection and other types
   * of events.
   */
  BaseComponentRenderer.prototype.CreateComponentCallback = function (node, amxNode)
  {
    return null;
  }
  
  BaseComponentRenderer.prototype.CreateComponentInstance = function (simpleNode, amxNode)
  {
    var dimensions = this.SetComponentDimensions(simpleNode, amxNode);
    var stageId = this.GetStageId(amxNode);
    var context = this.CreateRenderingContext(simpleNode, stageId, dimensions['w'], dimensions['h']);
    var callbackObj = this.CreateComponentCallback(simpleNode, amxNode);
    if (!callbackObj)
    {
      callbackObj = null;
    }
    var callback = (callbackObj === null) ? null : callbackObj['callback'];
    
    var instance = this.CreateToolkitComponentInstance(context, stageId, callbackObj, callback, amxNode);
    if (context) {
      context.getStage().addChild(instance);
    }
    return instance;
  }
  
  /**
   * @return instance for the toolkit component
   */
  BaseComponentRenderer.prototype.GetComponentInstance = function (simpleNode, amxNode)
  {
    var componentInstance = amxNode[adf.mf.internal.dvt.INSTANCE];
    if (!componentInstance)
    {
      componentInstance = this.CreateComponentInstance(simpleNode, amxNode);
      amxNode[adf.mf.internal.dvt.INSTANCE] = componentInstance;
    }
    return componentInstance;
  }
  
  /**
   * @param context DvtToolkitContext
   * @param stageId unique id of element where the rendering is performed
   * @param callbackObj object which wraps callback function
   * @param callback function which handles value changes and other type of events
   * @amxNode amxNode of this component
   * @return initiliazed instance of the toolkit representation of thie component which will be used to render this component.
   */
  BaseComponentRenderer.prototype.CreateToolkitComponentInstance = function (context, stageId, callbackObj, callback, amxNode)
  {
    return null;
  }

  /**
   * Function should invoke render function on the toolkit representation of the component
   *
   * @param instance component instance created in function CreateToolkitComponentInstance
   * @param width width of the component
   * @param height height of the component
   * @param amxNode amxNode of this component
   */
  BaseComponentRenderer.prototype.RenderComponent = function (instance, width, height, amxNode)
  {
  }

  /**
   * unregister all DOM node's listeners
   */
  BaseComponentRenderer.prototype.DestroyComponent = function (node, amxNode)
  {
    var resizeHandler = adf.mf.internal.dvt.util.ResizeHandler.getInstance();
    resizeHandler.removeResizeCallback(amxNode.getId());
  }

  /**
   * sets legend style properties based on CSS
   */
  BaseComponentRenderer.prototype.ProcessStyleClasses = function (node, amxNode)
  {
    var perf =
      adf.mf.internal.perf.start("adf.mf.internal.dvt.BaseComponentRenderer.ProcessStyleClasses");
    try
    {
      var styleClassMap = this.GetStyleClassesDefinition();

      if (styleClassMap[adf.mf.internal.dvt.ROOT_NODE_STYLE] !== undefined)
      {
        this._processStyleClass(amxNode, node, styleClassMap[adf.mf.internal.dvt.ROOT_NODE_STYLE]);
      }

      var child = node.firstElementChild;

      while (child)
      {
        var classList = child.classList;
        if (classList)
        {
          for (var i = 0;i < classList.length;i++)
          {
            var className = classList[i];
            if (className)
            {
              var classDefinition = styleClassMap[className];
              if (classDefinition)
              {
                this._processStyleClass(amxNode, child, classDefinition);
              }
            }
          }
        }
        child = child.nextElementSibling;
      }
    }
    finally
    {
      perf.stop();
    }
  }

  BaseComponentRenderer.prototype.IsSkyros = function ()
  {
    var resources = adf.mf.environment.profile.cssResources;
    for (var i = 0;i < resources.length;i++)
    {
      if (resources[i].indexOf("Fusion") > 0)
        return true;
    }
    return false;
  }

  /**
   * Determines if the component should prevent propagation of swipe/drag gestures.
   * Components that handle swipe/drag internally should not propagate events further
   * to their containers to avoid gesture conflicts. By default, all DVT components
   * propagation of swipe/drag start events. The type handler should override this method
   * when the component is mostly static and should propagate drag/swipe gestures to its
   * container.
   */
  BaseComponentRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    return true;
  }

  BaseComponentRenderer.prototype._processStyleClass = function (amxNode, node, definition)
  {
    if (definition instanceof Array)
    {
      for (var i = 0;i < definition.length;i++)
      {
        this._resolveStyle(amxNode, node, definition[i]);
      }
    }
    else
    {
      this._resolveStyle(amxNode, node, definition);
    }
  }

  BaseComponentRenderer.prototype._resolveStyle = function (amxNode, node, definition)
  {
    var path = new JSONPath(amxNode['_optionsObj'], definition['path']);
    var value = undefined;
    var part = null;

    if (definition['type'])
    {
      if (definition['type'] instanceof Array)
      {
        for (var i = 0;i < definition['type'].length;i++)
        {
          part = definition['type'][i](node, path.getValue());
          if (part)
          {
            if (!value)
              value = '';
            value += part;
          }
        }
      }
      else
      {
        value = definition['type'](node, path.getValue());
      }
    }

    if (value !== undefined && (definition['overwrite'] !== false || path.getValue() === undefined) && !(definition['ignoreEmpty'] === true && (value == null || (typeof value == 'string' && value.replace(/^\s+/g, '') == ''))))
    {
      if (path.setValue(value))
      {
        this.SetOptionsDirty(amxNode, true);
      }
    }
  }

  BaseComponentRenderer.prototype._isWaitingForData = function (amxNode)
  {
    return amxNode['_waitingForData'] !== undefined && amxNode['_waitingForData'];
  }

  BaseComponentRenderer.prototype._setWaitingForData = function (amxNode, value)
  {
    amxNode['_waitingForData'] = value;
  }

  BaseComponentRenderer.prototype._isReadyToRender = function (amxNode)
  {
    return amxNode['_readyToRender'] === true;
  }

  BaseComponentRenderer.prototype._setReadyToRender = function (amxNode, value)
  {
    amxNode['_readyToRender'] = value;
  }
  
  BaseComponentRenderer.prototype.isNodeReadyToRender = function (amxNode) 
  {
    return ((amxNode.isReadyToRender && amxNode.isReadyToRender()) || (amxNode.getState() == adf.mf.api.amx.AmxNodeStates["UNRENDERED"]));
  }

  BaseComponentRenderer.prototype.GetResourceBundles = function ()
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;

    var bundles = [];
    bundles.push(ResourceBundle.createLocalizationBundle('DvtUtilBundle'));
    return bundles;
  }

  BaseComponentRenderer.prototype._loadResourceBundles = function ()
  {
    var resourceLoader, bundles;

    if (!amx.dtmode)
    {
      bundles = this.GetResourceBundles();

      if (bundles && bundles.length > 0)
      {
        resourceLoader = adf.mf.internal.dvt.util.ResourceBundleLoader.getInstance();
        resourceLoader.loadBundles(bundles);
      }
    }
  }

  // OLD CODE
  /**
   * @deprecated
   * Sets the flag indicating that the options object has been modified
   */
  adf.mf.internal.dvt.setOptionsDirty = function (amxNode, dirty)
  {
    amxNode["_optionsDirty"] = dirty;
  }

  /**
   * @deprecated
   * Indicates whether the options object has been modified
   */
  adf.mf.internal.dvt.isOptionsDirty = function (amxNode)
  {
    return amxNode["_optionsDirty"];
  }
})();
(function(){

  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var FacetlessDataStampRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(FacetlessDataStampRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.common.FacetlessDataStampRenderer');

  /**
   * Creates treeview's children AMX nodes
   */
  FacetlessDataStampRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    // create a cache of rowKeys to be removed in case of model update
    amxNode['_currentRowKeys'] = [];

    if (!amx.dtmode)
    {
      var varName = amxNode.getAttribute('var');

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);

      var dataItems = amxNode.getAttribute("value");
      if (varName != null && dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        return true;
      }

      var iter = this.createIterator(amxNode, true);
      if(iter.loaded === true || (iter.getTotalCount() === 0))
      {
        return true;
      }
      else
      {
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), null);
          adf.mf.el.removeVariable(varName);
        }
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);

    var childTags = amxNode.getTag().getChildren(adf.mf.internal.dvt.DVT_NAMESPACE);
    var renderers = this.GetChildRenderers();

    for (var i = 0; i < childTags.length; i++)
    {
      if (renderers[childTags[i].getName()] !== undefined)
      {
        var childAmxNode = childTags[i].buildAmxNode(amxNode);
        amxNode.addChild(childAmxNode);
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  FacetlessDataStampRenderer.prototype._loadRowsIfNeeded = function(iterator, amxNode) {
    // copied from amx:listView - on refresh the component need to initiate
    // loading of rows not available in the cache
    var dataItems = null;
    if (iterator.getTotalCount() > iterator.getAvailableCount())
    {
      iterator.loaded = true;
      dataItems = amxNode.getAttribute('value');

      adf.mf.api.amx.showLoadingIndicator();
      //var currIndex = dataItems.getCurrentIndex();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0,  -1, function ()
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
      function ()
      {
        adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "_loadRowsIfNeeded", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });
    }
    else
    {
      iterator.loaded = false;
    }
  };

  FacetlessDataStampRenderer.prototype.createIterator = function(amxNode, loadItems) {
    var ret = null;
    // we want to skip the value validation if we are in dt mode
    if (!amx.dtmode)
    {
      var iter = adf.mf.api.amx.createIterator(amxNode.getAttribute('value'));

      if(loadItems) {
        this._loadRowsIfNeeded(iter, amxNode);
      }

      ret = iter;
    }
    else
    {
      ret = adf.mf.api.amx.createIterator([]);
    }

    return ret;
  };

  /**
   * Visits treeview's children nodes
   */
  FacetlessDataStampRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    if(dataItems === undefined && !amxNode.isAttributeDefined("value"))
    {
      // visit child nodes in no collection mode since there is no value specified
      var children = amxNode.getChildren();
      for (var i = 0;i < children.length;i++)
      {
        if (children[i].visit(visitContext, callback))
        {
          return true;
        }
      }
      return false;
    }

    var iter = this.createIterator(amxNode, false);
    var variableName = amxNode.getAttribute("var");

    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.addVariable(variableName, item);
      try
      {
        if (amxNode.visitStampedChildren(iter.getRowKey(), null, null, visitContext, callback))
          return true;
      }
      finally
      {
        adf.mf.el.removeVariable(variableName);
      }
    }
    return false;
  };


  /**
   * Updates treeview's children nodes
   */
  FacetlessDataStampRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // if inlineStyle has changed we need to recreate treeview instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // if 'value' changed, need to rebuild the nodes hierarchy
    if (attributeChanges.hasChanged('value'))
    {
      // remove the old stamped children
      var children;
      var i, j;
      var iter = this.createIterator(amxNode, true);

      if(iter.getTotalCount() === 0) {
        return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
      }

      if(iter.loaded === true) {
        // cannot rebuild the structure yet, wating for data
        amxNode['_waitingForData'] = true;
        return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
      }

      if (amxNode['_currentRowKeys'] !== undefined)
      {
        for (i = 0; i < amxNode['_currentRowKeys'].length; i++)
        {
          children = amxNode.getChildren(null, amxNode['_currentRowKeys'][i]);
          for (j = children.length - 1; j >= 0; j--)
          {
            amxNode.removeChild(children[j]);
          }
        }
      }
      // clear the old rowKeys
      amxNode['_currentRowKeys'] = [];

      // create the new stamped children hierarchy

      var varName = amxNode.getAttribute('var');
      if (!(iter.getTotalCount() === 0))
      {
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), null);
          adf.mf.el.removeVariable(varName);
        }

      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  /**
   * Returns treeview node tag name.
   * @abstract
   * @returns treeview node tag name
   */
  FacetlessDataStampRenderer.prototype.GetStampedChildTagName = function()
  {
    return null;
  };


  /**
   * function iterates through collection returned by value attribute and for each item from this collection
   * renders each child in the specified facet.
   */
  FacetlessDataStampRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.common.FacetlessDataStampRenderer.ProcessStampedChildren");
    try
    {
      var varName = amxNode.getAttribute('var');// need to use this since var is reserved

      var stampedChildTags = amxNode.getTag().getChildren(dvtm.DVTM_NAMESPACE, this.GetStampedChildTagName());

      // no data, nothing to do
      if (stampedChildTags.length === 0)
      {
        return;
      }

      // creates value collection iterator
      var iter = this.createIterator(amxNode, false);
      var changed = false;
      while (iter.hasNext())
      {
        var stamp = iter.next();
        adf.mf.el.addVariable(varName, stamp);
        // get all children for the facet and rowKey
        var dataStampNodes = amxNode.getChildren(null, iter.getRowKey());

        var iter2 = adf.mf.api.amx.createIterator(dataStampNodes);
        // iterate through child nodes and run renderer for each of them
        while (iter2.hasNext())
        {
          // treeviewNode
          var dataStampNode = iter2.next();
          if(!dataStampNode["_optionsObj"]) dataStampNode["_optionsObj"] = options;

          if (dataStampNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataStampNode.getAttribute('rendered')))
            continue;         // skip unrendered nodes
          // if the node includes unresolved attributes, no point to proceed
          if (!dataStampNode.isReadyToRender())
          {
            throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
          }

          var rendererObject = this.GetChildRenderers(true)[dataStampNode.getTag().getName()];
          if(rendererObject && rendererObject['renderer'])
          {
            context['stamp'] = stamp;
            context['_rowKey'] = iter.getRowKey();
            var renderer = rendererObject['renderer'];
            if(renderer.ProcessAttributes)
            {
              changed = changed | renderer.ProcessAttributes(options, dataStampNode, context);
            }
            else
            {
              adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + dataStampNode.getTag().getName() + "'!");
            }
            if(renderer.ProcessChildren)
            {
              changed = changed | renderer.ProcessChildren(options, dataStampNode, context);
            }
            else
            {
              adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessChildren method on renderer for '" + dataStampNode.getTag().getName() + "'!");
            }
            delete context['_rowKey'];
            delete context['stamp'];
          }
        }
        adf.mf.el.removeVariable(varName);
      }
      return changed;
    }
    finally
    {
      perf.stop();
    }
  };


  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  FacetlessDataStampRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var changed = false;

    var changes = context['_attributeChanges'];
    if(!changes || changes.hasChanged('value'))
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "Processing value attribute '" + amxNode.getTag().getName() + "'!");

      changed = changed | this.ProcessStampedChildren(options, amxNode, context);
    }

    return changed | FacetlessDataStampRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  };

})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var DataStampRenderer = function ()
  {}

  adf.mf.internal.dvt.DvtmObject.createSubclass(DataStampRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.chart.DataStampRenderer');

  /**
   * Creates chart's children AMX nodes
   */
  DataStampRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    // create a cache of rowKeys to be removed in case of model update
    amxNode['_currentRowKeys'] = [];

    // we want to skip the value validation if we are in dt mode
    if (!amx.dtmode)
    {
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);

      var dataItems = amxNode.getAttribute('value');
      var varName = amxNode.getAttribute('var');
      if (varName != null && dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        return true;
      }

      var iter = null;
      if (dataItems != null)
          iter = adf.mf.api.amx.createIterator(dataItems);

      // copied from amx:listView - on refresh the component need to initiate
      // loading of rows not available in the cache
      if (iter != null && iter.getTotalCount() > iter.getAvailableCount())
      {
        //adf.mf.api.amx.showLoadingIndicator();
        //var currIndex = dataItems.getCurrentIndex();
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
            //adf.mf.api.amx.hideLoadingIndicator();
          }
        },
        function ()
        {
          adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
          //adf.mf.api.amx.hideLoadingIndicator();
        });

        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }

      var facets = this.GetFacetNames();

      if (iter == null) {
        //adf.mf.el.addVariable(varName, item);
        amxNode.createStampedChildren(null, facets);
        //adf.mf.el.removeVariable(varName);
      }
      while (iter != null && iter.hasNext())
      {
        var item = iter.next();
        amxNode['_currentRowKeys'].push(iter.getRowKey());
        adf.mf.el.addVariable(varName, item);
        amxNode.createStampedChildren(iter.getRowKey(), facets);
        adf.mf.el.removeVariable(varName);
      }
    }

    var childTags = amxNode.getTag().getChildren(adf.mf.internal.dvt.DVT_NAMESPACE);
    var renderers = this.GetChildRenderers();

    for (var i = 0; i < childTags.length; i++)
    {
      if (renderers[childTags[i].getName()] !== undefined)
      {
        var childAmxNode = childTags[i].buildAmxNode(amxNode);
        amxNode.addChild(childAmxNode);
      }
    }

    var overviewFacet = amxNode.getTag().getChildFacetTag('overview');
    if (overviewFacet)
    {
      var overviewTag = overviewFacet.getChildren(adf.mf.internal.dvt.DVT_NAMESPACE, 'overview');
      if (overviewTag)
      {
        var overviewAmxNode = overviewTag[0].buildAmxNode(amxNode);
        amxNode.addChild(overviewAmxNode);
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  }

  /**
   * Visits chart's children nodes
   */
  DataStampRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    var children = amxNode.getChildren();
    for (var i = 0;i < children.length;i++)
    {
      children[i].visit(visitContext, callback);
    }

    var dataItems = amxNode.getAttribute('value');

    if (dataItems === undefined)
    {
      return amxNode.visitStampedChildren(null, null, null, visitContext, callback);
    }

    var facets = this.GetFacetNames();

    var varName = amxNode.getAttribute('var');
    var iter = adf.mf.api.amx.createIterator(dataItems);

    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.addVariable(varName, item);
      try
      {
        if (amxNode.visitStampedChildren(iter.getRowKey(), facets, null, visitContext, callback))
        {
          return true;
        }
      }
      finally
      {
        adf.mf.el.removeVariable(varName);
      }
    }
    return false;
  }

  /**
   * Updates chart's children nodes
   */
  DataStampRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // if inlineStyle has changed we need to recreate chart instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // if 'value' changed, need to rebuild the nodes hierarchy
    if (attributeChanges.hasChanged('value'))
    {
      // remove the old stamped children
      var children;
      var i, j, k;
      var iter;

      var dataItems = amxNode.getAttribute('value');

      if (dataItems === undefined || dataItems === null)
      {
        return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
      }

      iter = adf.mf.api.amx.createIterator(dataItems);

      // copied from amx:listView - on refresh the component needs to initiate
      // loading of rows not available in the cache
      if (iter.getTotalCount() > iter.getAvailableCount())
      {
        //adf.mf.api.amx.showLoadingIndicator();
        //var currIndex = dataItems.getCurrentIndex();
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
            //adf.mf.api.amx.hideLoadingIndicator();
          }
        },
        function ()
        {
          adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "updateChildren", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
          //adf.mf.api.amx.hideLoadingIndicator();
        });

        // cannot rebuild the structure yet, wating for dataa
        amxNode['_waitingForData'] = true;
        return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
      }

      var facets = this.GetFacetNames();

      if (amxNode['_currentRowKeys'] !== undefined)
      {
        for (k = 0; k < facets.length; k++)
        {
          for (i = 0; i < amxNode['_currentRowKeys'].length; i++)
          {
            children = amxNode.getChildren(facets[k], amxNode['_currentRowKeys'][i]);
            for (j = children.length - 1; j >= 0; j--)
            {
              amxNode.removeChild(children[j]);
            }
          }
        }
      }
      // clear the old rowKeys
      amxNode['_currentRowKeys'] = [];

      // create the new stamped children hierarchy
      dataItems = amxNode.getAttribute('value');
      if (dataItems)
      {
        var varName = amxNode.getAttribute('var');
        iter = adf.mf.api.amx.createIterator(dataItems);
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), facets);
          adf.mf.el.removeVariable(varName);
        }
      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }

  DataStampRenderer.prototype.getDescendentChangeAction = function(amxNode, descendentChanges)
  {
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }

  // END OF THE AMX INTERFACE

  /**
   * function iterates through collection returned by value attribute and for each item from this collection
   * renders each child in the specified facet.
   */
  DataStampRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context, facetName)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.chart.DataStampRenderer.ProcessStampedChildren");
    try
    {
      var varName = amxNode.getAttribute('var');// need to use this since var is reserved
      var value = amxNode.getAttribute('value');

      var dataStampTag = amxNode.getTag().getChildFacetTag(facetName);

      // no data stamp, nothing to do
      if (!dataStampTag)
      {
        return false;
      }
      if (value == null)
          return this.ProcessStampedChild (options, amxNode, context, facetName);
      // creates value collection iterator

      AttributeGroupManager.init(context);
      iter = adf.mf.api.amx.createIterator(value);
      var changed = false;
      while (iter.hasNext())
      {
        var stamp = iter.next();
        adf.mf.el.addVariable(varName, stamp);
        changed |= this.ProcessStampedChild (options, amxNode, context, facetName, iter.getRowKey(), stamp);
        adf.mf.el.removeVariable(varName);
      }

      var updateCallback = null;

      if (!this.PopulateCategories())
      {
        updateCallback = function(attrGrp, dataItem, valueIndex, exceptionRules) {
          // do nothing
        };
      }

      var shape = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.SHAPE;

      var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
      if(updateCallback) {
        config.setUpdateCategoriesCallback(updateCallback);
      }
      config.addTypeToItemAttributeMapping(shape, 'markerShape');
      config.addTypeToDefaultPaletteMapping('markerShape', shape);

      AttributeGroupManager.applyAttributeGroups(amxNode, config, context);

      // process attribute groups
      var attrGroups = AttributeGroupManager.getAttributeGroups(amxNode, context);

      if(attrGroups) {
        for(var i=0; i < attrGroups.length; i++) {
          attrGroups[i].applyDefaultPaletteOverrides(amxNode);
        }
      }

      return changed;
    }
    finally
    {
      perf.stop();
    }
  };

  DataStampRenderer.prototype.PopulateCategories = function() {
    return false;
  };

  DataStampRenderer.prototype.ProcessStampedChild = function (options, amxNode, context, facetName, rowKey, stamp)
  {
    // get all children for the facet and rowKey
    var chartDataItemNodes = amxNode.getChildren(facetName, rowKey);
    var changed = false;
    var iter2 = adf.mf.api.amx.createIterator(chartDataItemNodes);
    // iterate through child nodes and run renderer for each of them
    while (iter2.hasNext())
    {
      var childNode = iter2.next();

      if (childNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(childNode.getAttribute('rendered')))
        continue;         // skip unrendered nodes
      // if the node includes unresolved attributes, no point to proceed
      if (!childNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
      }

      var rendererObject = this.GetChildRenderers(facetName)[childNode.getTag().getName()];
      if(rendererObject && rendererObject['renderer'])
      {
        // setup context
        if (stamp != null)
          context['stamp'] = stamp;
        context['_rowKey'] = rowKey;
        var renderer = rendererObject['renderer'];
        if(renderer.ProcessAttributes)
        {
          changed = changed | renderer.ProcessAttributes(options, childNode, context);
        }
        else
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + childNode.getTag().getName() + "'!");
        }
        if(renderer.ProcessChildren)
        {
          changed = changed | renderer.ProcessChildren(options, childNode, context);
        }
        else
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + childNode.getTag().getName() + "'!");
        }
        // clear context
        delete context['_rowKey'];
        if (stamp != null)
          delete context['stamp'];
      }
    }
    return changed;
  }

  /**
   * @return array of the facet names
   */
  DataStampRenderer.prototype.GetFacetNames = function ()
  {
    return [];
  }

  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  DataStampRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var facets = this.GetFacetNames();
    var changed = false;

    var changes = context['_attributeChanges'];
    var descendentChanges = context['_descendentChanges'];

    if(!changes || changes.getSize() > 0 || descendentChanges)     // TODO: be smarter with descendentChanges
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "Processing value attribute '" + amxNode.getTag().getName() + "'!");

      for(var i = 0; i < facets.length; i++)
      {
        changed = changed | this.ProcessStampedChildren(options, amxNode, context, facets[i]);
      }
    }

    return changed | DataStampRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  // create the DVT API namespace
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.api.dvt');

  /*
   * Chart event objects
   */
  /**
   * An event for viewport changes in DVT charts
   * See also the Java API oracle.adfmf.amx.event.ViewportChangeEvent.
   * @param {Object} xMin minimum x coordinate of the viewport
   * @param {Object} xMax maximum x coordinate of the viewport
   * @param {Object} startGroup the first visible group index
   * @param {Object} endGroup the last visible group index
   * @param {Object} yMin minimum y coordinate of the viewport
   * @param {Object} yMax maximum y coordinate of the viewport
   */
  adf.mf.api.dvt.ViewportChangeEvent = function(xMin, xMax, startGroup, endGroup, yMin, yMax)
  {
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
    this[".type"] = "oracle.adfmf.amx.event.ViewportChangeEvent";
  }

  /**
   * An event for changes of selection for DVT charts
   * See also the Java API oracle.adfmf.amx.event.ChartSelectionEvent.
   * @param {Object} oldRowKey the rowKey that has just been unselected
   * @param {Array<Object>} selectedRowKeys the array of rowKeys that have just been selected.
   * @param {Object} xMin minimum x coordinate of the viewport
   * @param {Object} xMax maximum x coordinate of the viewport
   * @param {Object} startGroup the first visible group index
   * @param {Object} endGroup the last visible group index
   * @param {Object} yMin minimum y coordinate of the viewport
   * @param {Object} yMax maximum y coordinate of the viewport
   * @param {Object} y2Min minimum y2 coordinate of the viewport
   * @param {Object} y2Max maximum y2 coordinate of the viewport
   */
  adf.mf.api.dvt.ChartSelectionEvent = function(oldRowKey, selectedRowKeys,
                                                xMin, xMax, startGroup, endGroup,
                                                yMin, yMax, y2Min, y2Max)
  {
    this.oldRowKey = oldRowKey;
    this.selectedRowKeys = selectedRowKeys;
    this.xMin = xMin;
    this.xMax = xMax;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
    this.yMin = yMin;
    this.yMax = yMax;
    this.y2Min = y2Min;
    this.y2Max = y2Max;
    this[".type"] = "oracle.adfmf.amx.event.ChartSelectionEvent";
  };

  /**
   * Renderer common for all charts except SparkChart.
   */
  var BaseChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseChartRenderer, 'adf.mf.internal.dvt.chart.DataStampRenderer', 'adf.mf.internal.dvt.chart.BaseChartRenderer');

  /**
   * returns the chart type
   */
  BaseChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return null;
  }

  /**
   * Merge default and custom options
   */
  BaseChartRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    BaseChartRenderer.superclass.MergeComponentOptions.call(this, amxNode);

    var options = amxNode["_optionsObj"];
    var styleDefaults = options['styleDefaults'];

    if (styleDefaults && styleDefaults['colors'])
    {
      amxNode['_defaultColors'] = styleDefaults['colors'];
    }
    else
    {
      amxNode['_defaultColors'] = DvtChart.getDefaults()['styleDefaults']['colors'];
    }

    if (styleDefaults && styleDefaults['shapes'])
    {
      amxNode['_defaultShapes'] = styleDefaults['shapes'];
    }
    else
    {
      amxNode['_defaultShapes'] = DvtChart.getDefaults()['styleDefaults']['shapes'];
    }
    if (styleDefaults && styleDefaults['patterns'])
    {
      amxNode['_defaultPatterns'] = styleDefaults['patterns'];
    }
    else
    {
      amxNode['_defaultPatterns'] = DvtChart.getDefaults()['styleDefaults']['patterns'];
    }
  }

  /**
   * @param facetName name of the facet for which the map of the renderers is requested
   * @return map of the child renderers for given facetName
   */
  BaseChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      var FormatRenderer = adf.mf.internal.dvt.common.format.FormatRenderer;
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      var AxisRenderer = adf.mf.internal.dvt.common.axis.AxisRenderer;
      var OverviewRenderer = adf.mf.internal.dvt.common.overview.OverviewRenderer;

      this._renderers =
        {
          'facet':
            {
              'seriesStamp' :
                {
                  'seriesStyle' : { 'renderer' : new adf.mf.internal.dvt.chart.SeriesStyleRenderer() }
                },
               'dataStamp' :
                 {
                   'chartDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.ChartDataItemRenderer() }
                 }
            },
          'simple' :
            {
              'xAxis' : { 'renderer' : new AxisRenderer('X'), 'order' : 1, 'maxOccurrences' : 1 },
              'yAxis' : { 'renderer' : new AxisRenderer('Y'), 'order' : 1, 'maxOccurrences' : 1 },
              'y2Axis' : { 'renderer' : new AxisRenderer('Y2'), 'order' : 1, 'maxOccurrences' : 1 },
              'xFormat' : { 'renderer' : new FormatRenderer('X'), 'order' : 2, 'maxOccurrences' : 1 },
              'yFormat' : { 'renderer' : new FormatRenderer('Y'), 'order' : 2, 'maxOccurrences' : 1  },
              'y2Format' : { 'renderer' : new FormatRenderer('Y2'), 'order' : 2, 'maxOccurrences' : 1 },
              'zFormat' : { 'renderer' : new FormatRenderer('Z'), 'order' : 2, 'maxOccurrences' : 1 },
              'chartValueFormat' : { 'renderer' : new FormatRenderer('*'), 'order' : 2, 'maxOccurences' : 6 },
              'legend' : { 'renderer' : new LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 },
              'overview' : { 'renderer' : new OverviewRenderer(), 'order' : 3, 'maxOccurences' : 1 }
            }
        }
    }

    if(facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  }

  BaseChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BaseChartRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['title'] = {'path' : 'title/text', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'title/hAlign', 'type' : AttributeProcessor['TEXT']};
    attrs['subtitle'] =  {'path' : 'subtitle/text', 'type' : AttributeProcessor['TEXT']};
    attrs['footnote'] = {'path' : 'footnote/text', 'type' : AttributeProcessor['TEXT']};
    attrs['footnoteHalign'] = {'path' : 'footnote/hAlign', 'type' : AttributeProcessor['TEXT']};
    attrs['timeAxisType'] = {'path' : 'timeAxisType', 'type' : AttributeProcessor['TEXT']};
    attrs['seriesEffect'] = {'path' : 'styleDefaults/seriesEffect', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['animationIndicators'] = {'path' : 'styleDefaults/animationIndicators', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDownColor'] = {'path' : 'styleDefaults/animationDownColor', 'type' : AttributeProcessor['TEXT']};
    attrs['animationUpColor'] = {'path' : 'styleDefaults/animationUpColor', 'type' : AttributeProcessor['TEXT']};
    attrs['dataSelection'] = {'path' : 'selection', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['hideAndShowBehavior'] = {'path' : 'hideAndShowBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['rolloverBehavior'] = {'path' : 'hoverBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'none'};
    attrs['dataCursor'] = {'path' : 'dataCursor', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : 'off'};
    attrs['dataCursorBehavior'] = {'path' : 'dataCursorBehavior', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : ''};
    attrs['stack'] = {'path' : 'stack', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['zoomAndScroll'] = {'path' : 'zoomAndScroll', 'type' : AttributeProcessor['TEXT']};
    attrs['dataLabelPosition'] = {'path' : 'styleDefaults/dataLabelPosition', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  }

  /**
   * @return object that describes styleClasses of the component.
   */
  BaseChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = BaseChartRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['_self'] = {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']};

    styleClasses['dvtm-legend'] = [{'path' : 'legend/textStyle', 'type' : StyleProcessor['CSS_TEXT']}, {'path' : 'legend/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'legend/borderColor', 'type' : StyleProcessor['TOP_BORDER_WHEN_WIDTH_GT_0PX']}];
    styleClasses['dvtm-legendTitle'] = {'path' : 'legend/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-legendSectionTitle'] = {'path' : 'legend/sectionTitleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartTitle'] =  {'path' : 'title/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartSubtitle'] =  {'path' : 'subtitle/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartFootnote'] =  {'path' : 'footnote/style', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartTitleSeparator'] = [{'path' : 'titleSeparator/rendered', 'type' : StyleProcessor['VISIBILITY']}, {'path' : 'titleSeparator/upperColor', 'type' :  StyleProcessor['TOP_BORDER']}, {'path' : 'titleSeparator/lowerColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];

    styleClasses['dvtm-chartXAxisTitle'] = {'path' : 'xAxis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartYAxisTitle'] = {'path' : 'yAxis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartY2AxisTitle'] = {'path' : 'y2Axis/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartXAxisTickLabel'] = {'path' : 'xAxis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartYAxisTickLabel'] = {'path' : 'yAxis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-chartY2AxisTickLabel'] = {'path' : 'y2Axis/tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']};

    return styleClasses;
  }

  /**
   * Initialize generic options for all chart component.
   */
  BaseChartRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    BaseChartRenderer.superclass.InitComponentOptions.call(this, amxNode);

    amxNode["_optionsObj"] =
    {
      'titleSeparator' :
      {
        'rendered' : 'off'
      }
    };

    amxNode["_optionsObj"]["type"] = this.GetChartType(amxNode);

    amxNode['_optionsObj']['series'] = [];
    amxNode['_optionsObj']['groups'] = [];

    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
    AttributeGroupManager.reset(amxNode);
    amxNode['_rowKeyCache'] = {};
    amxNode['_stylesResolved'] = false;

  }

  /**
   * Reset options for all chart component.
   */
  BaseChartRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    BaseChartRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);

    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      amxNode['_optionsObj']['series'] = [];
      amxNode['_optionsObj']['groups'] = [];
      delete amxNode['_optionsObj']['legend'];
      delete amxNode['_optionsObj']['xAxis'];
      delete amxNode['_optionsObj']['yAxis'];
      delete amxNode['_optionsObj']['y2Axis'];
      AttributeGroupManager.reset(amxNode);
      amxNode['_rowKeyCache'] = {};

      var selection = amxNode['_selection'];
      if (selection !== undefined && selection !== null)
      {
        amxNode['_optionsObj']['selectedItems'] = selection;
      }
    }
  }

  BaseChartRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomChartStyle';
  }

  BaseChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;

    if (!this.IsSkyros())
    {
      currentStyle = DvtJSONUtils.merge(adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_ALTA,
                                        adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1);
    }
    else
    {
      return adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1;
    }
    return currentStyle;
  }

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @amxNode child amxNode
   */
  BaseChartRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = BaseChartRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);

    // if neither dataSelection, nor zoomAndScroll attributes are specified, drop the _resources array from options
    if (!amxNode.isAttributeDefined('dataSelection') && !amxNode.isAttributeDefined('zoomAndScroll'))
    {
      if (options['_resources'] !== undefined)
      {
        delete options['_resources'];
        changed = true;
      }
    }
    if (amxNode.isAttributeDefined('timeAxisType'))
    {
      var timeAxisType = amxNode.getAttribute('timeAxisType');
      context['timeAxisType'] = timeAxisType;
      this._hasTimeAxis = false;
      if (timeAxisType === 'enabled' || timeAxisType === 'mixedFrequency')
      {
        this._hasTimeAxis = true;
      }
    }

    return changed;
  }

  /**
   * Check if renderer is running in dtmode. If so then load only dummy data. In other case leave processing on the
   * parent.
   */
  BaseChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.chart.BaseChartRenderer.ProcessChildren");
    try
    {
      if (amx.dtmode)
      {
        var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(amxNode.getTag().getName());
        var dtModeData = definition.getDTModeData();

        options['groups'] = dtModeData['groups'];
        options['series'] = dtModeData['series'];

        return true;
      }
      else
      {
        return BaseChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
      }
    }
    finally
    {
      perf.stop();
    }
  }

  /**
   * @return supported facet's names
   */
  BaseChartRenderer.prototype.GetFacetNames = function ()
  {
    return ['dataStamp', 'seriesStamp'];
  }

  /**
   * Function creates callback for the toolkit component which is common for all chart components
   */
  BaseChartRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var that = this;
    var callbackObject =
      {
        'callback' : function (event, component)
          {
            var rowKeyCache = amxNode['_rowKeyCache'];
            var rowKey;
            var xMin, xMax, yMin, yMax;
            var startGroup, endGroup;

            if (event.getType() === 'selection')
            {
              // selectionChange event support
              var selection = event.getSelection();
              if (selection !== undefined)
              {
                var selectedRowKeys = [];
                var i;

                for (i = 0;i < selection.length;i++)
                {
                  rowKey = null;
                    var objId = selection[i].getId();
                    if (rowKeyCache[objId] !== undefined)
                    {
                      rowKey = rowKeyCache[objId];
                    }
                  if (rowKey !== null)
                  {
                    selectedRowKeys.push(rowKey);
                  }
                }

                var se = new adf.mf.api.amx.SelectionEvent(selectedRowKeys, selectedRowKeys);
                adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se);

                var _selection = [];
                if (selection !== undefined && selection !== null)
                {
                  for (i = 0; i < selection.length; i++)
                  {
                    var eventSelectionObject = selection[i];

                    var selectionObject = {};
                    selectionObject['id'] = eventSelectionObject.getId();
                    selectionObject['group'] = eventSelectionObject.getGroup();
                    selectionObject['series'] = eventSelectionObject.getSeries();

                    _selection.push(selectionObject);
                  }
                }

                amxNode["_selection"] = _selection;
              }
            }
            else if (event.getType() === 'dvtAct')
            {
              // action event support
                var actionEvent = event.getClientId();// is of type DvtActionEvent
                var itemId = actionEvent.getId();
                if (rowKeyCache[itemId] !== undefined)
                {
                  rowKey = rowKeyCache[itemId];
                }
              if (rowKey !== undefined)
              {
                // get data item's amxNode (assume the rowKey to be unique)
                var item = amxNode.getChildren('dataStamp', rowKey)[0];
                if (item !== undefined && item != null)
                {
                  // fire ActionEvent and then process the 'action' attribute
                  var ae = new adf.mf.api.amx.ActionEvent();
                  adf.mf.api.amx.processAmxEvent(item, 'action', undefined, undefined, ae,
                    function ()
                    {
                      var action = item.getAttributeExpression("action", true);
                      if (action != null)
                      {
                        adf.mf.api.amx.doNavigation(action);
                      }
                    });
                }
              }
            }
            // new zoomAndScroll code
            else if (event.getType() === 'viewportChange')
            {
              // convert time axis range to Date types
              if (that._hasTimeAxis)
              {
                xMin = new Date(event.getXMin());
                xMax = new Date(event.getXMax());
              }
              else
              {
                xMin = event.getXMin();
                xMax = event.getXMax();
              }
              yMin = event.getYMin();
              yMax = event.getYMax();
              startGroup = event.getStartGroup();
              endGroup = event.getEndGroup();


              var vce = new adf.mf.api.dvt.ViewportChangeEvent(xMin, xMax, startGroup, endGroup, yMin, yMax);
              adf.mf.api.amx.processAmxEvent(amxNode, 'viewportChange', undefined, undefined, vce);
            }
          }
      };
    return callbackObject;
  }

  /**
   * Function creates new instance of DvtChart
   */
  BaseChartRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtChart.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }

  BaseChartRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    var width = dim['width'];
    var height = dim['height'];

    var widthThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_WIDTH / 3);
    var heightThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_HEIGHT / 3);

    if(width - widthThreshold < 0 || height - heightThreshold < 0)
    {
      var ratio;
      if(width - widthThreshold < height - heightThreshold)
      {
        ratio = height / width ;
        width = widthThreshold;
        height = width * ratio;
      }
      else
      {
        ratio = width / height ;
        height = heightThreshold;
        width = height * ratio;
      }
    }

    return {'width' : width, 'height' : height};
  }

  /**
   * sets newly calculated dimensions to the dom node
   */
  BaseChartRenderer.prototype.SetComponentDimensions = function(simpleNode, amxNode)
  {
    var result = BaseChartRenderer.superclass.SetComponentDimensions.call(this, simpleNode, amxNode);

    // if overview is defined, add the overview div for height calculations
    var options = amxNode['_optionsObj'];
    var overviewId = amxNode.getId() + '_overview';
    var overviewNode = null;

    if (options['overview'] !== undefined && options['overview']['style'] !== undefined)
    {
      overviewNode = simpleNode.querySelector('#' + overviewId);
      if (!overviewNode)
      {
        overviewNode = document.createElement('div');
        overviewNode.setAttribute('id', overviewId);
        overviewNode.setAttribute('style', 'position:absolute; bottom:0px; top:auto; display:block; visibility:hidden; ' + options['overview']['style']);
        simpleNode.appendChild(overviewNode);
      }
      options['overview']['height'] = overviewNode.offsetHeight;
    }

    return result;
  }

  /**
   * Function renders instance of the component
   */
  BaseChartRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
    }
    var dim = this.AdjustStageDimensions({'width' : width, 'height' : height});
    instance.render(data, dim['width'], dim['height']);
  }

  BaseChartRenderer.prototype.GetResourceBundles = function ()
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;

    var bundles = BaseChartRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtChartBundle'));

    return bundles;
  }

  BaseChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // charts should prevent swipe gestures when 'zoomAndScroll' or 'dataCursor' attributes are defined
    if (amxNode.isAttributeDefined('zoomAndScroll') || amxNode.isAttributeDefined('dataCursor'))
    {
      return true;
    }
    return false;
  }

})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var BaseGaugeRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseGaugeRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer');
  
  BaseGaugeRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // if inlineStyle has changed we need to recreate gauge instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // always refresh on any value change
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }
  
  BaseGaugeRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    BaseGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    amxNode["_optionsObj"] = 
    {
      'metricLabel' : {
        'rendered' : 'on',
        'scaling' : 'auto'
      }
    }
    
    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
  }

  /**
   * Function is called in refresh phase and should reset the options object according to attributeChanges parameter.
   * 
   * @param amxNode
   * @param attributeChanges
   * @param descendentChanges
   */
  BaseGaugeRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {   
    BaseGaugeRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);

    // must clear the thresholds and referenceLines arrays, if they exist
    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      var options = amxNode['_optionsObj'];
      if (options['thresholds'])
      {
        options['thresholds'] = [];
      }
      if (options['referenceLines'])
      {
        options['referenceLines'] = [];
      }
      if (attributeChanges.getChangedAttributeNames().indexOf("value") >= 0) // if value has changed
      {
        amxNode.setAttributeResolvedValue('changed', true); // this is just 'internal' change for node
        //amxNode.setAttribute('changed', true); - THIS WOULD CHANGE ALSO EL EXPRESSION - sometimes this can be usefull
        options['changed'] = true;
      }
    }
  }

  /**
   * processes the components's child tags
   */
  BaseGaugeRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      var TickLabelRenderer = adf.mf.internal.dvt.common.axis.TickLabelRenderer;
      this._renderers = 
        {
          'referenceLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineRenderer() },
          'tickLabel' : { 'renderer' : new TickLabelRenderer(), 'maxOccurrences' : 1 },
          'metricLabel' : { 'renderer' : new TickLabelRenderer(false, true), 'maxOccurrences' : 1 },
          'gaugeLabelFormat' : { 'renderer' : new TickLabelRenderer(false, true), 'maxOccurrences' : 1 },
          'threshold' : { 'renderer' : new adf.mf.internal.dvt.gauge.ThresholdRenderer() }
        };
    }
    return this._renderers;
  } 
  
  BaseGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = BaseGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['visualEffects'] = {'path' : 'visualEffects', 'type' : AttributeProcessor['TEXT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 65, 'default' : 65};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 0, 'default' : 0};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 100, 'default' : 100};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : null, 'default' : null};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT'], 'dtvalue' : '#33CC33', 'default' : '#33CC33'};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['readOnly'] = {'path' : 'readOnly', 'type' : AttributeProcessor['BOOLEAN'], 'default' : true};
    attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT']};
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'off'};
    
    return attrs;
  } 
  
  BaseGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = BaseGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['_self'] = [{'path' : 'color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false}, {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'borderColor', 'type' : StyleProcessor['BOTTOM_BORDER'], 'overwrite' : false}];
    styleClasses['dvtm-gaugeMetricLabel'] = {'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']};    
    
    return styleClasses; 
  }    
  
  BaseGaugeRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomGaugeStyle';
  }
  
  BaseGaugeRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;
    
    if (!this.IsSkyros())
    {
      currentStyle = DvtJSONUtils.merge(adf.mf.internal.dvt.gauge.DefaultGaugeStyle.SKIN_ALTA, 
                                        adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1);
    }
    else
    {
      return adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1;
    }
    return currentStyle;
  }

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {    
    var changed = BaseGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    // bug 18406297: turn off data animation when the value is undefined
    if (options['value'] === undefined || options['value'] === null || isNaN(options['value']))
    {
      options['animationOnDataChange'] = 'none';
    }
    
    return changed;
  }

  /**
   * Function processes supported childTags which are on amxNode.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  BaseGaugeRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    context['__refObjPropertyName'] = 'referenceLines';
    var changed = BaseGaugeRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    delete context['__refObjPropertyName'];
    
    return changed;
  }
  
  
  BaseGaugeRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var callbackObject = 
      {
        'callback' : function (event, component)
        {
          var type = event.getType();
          if (type === DvtValueChangeEvent.TYPE)
          {
            var newValue = event.getNewValue();
            // fire the valueChange event if the value has changed
            if (newValue !== event.getOldValue())
            {
              var vce = new adf.mf.api.amx.ValueChangeEvent(event.getOldValue(), event.getNewValue());
              adf.mf.api.amx.processAmxEvent(amxNode, "valueChange", "value", newValue, vce);
            }
          }
        }
      };
    return callbackObject;
  }
  
  BaseGaugeRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  { 
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
    }
    instance.render(data, width, height);  
  }
  
  BaseGaugeRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;
    
    var bundles = BaseGaugeRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtGaugeBundle'));
    
    return bundles;
  }
  
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  var JSONPath = adf.mf.internal.dvt.util.JSONPath;
  
  var TreeviewUtils = {};
  adf.mf.internal.dvt.treeview.TreeviewUtils = TreeviewUtils;
  
  TreeviewUtils.copyOptionIfDefined = function (options, fromPath, toPath)
  {
    var value = new JSONPath(options, fromPath).getValue();
    if (value)
    {
      new JSONPath(options, toPath).setValue(value);
    }
  };
  
  TreeviewUtils.getMergedStyleValue = function (options, path)
  {
    return new JSONPath(options, path).getValue();
  };
  
  TreeviewUtils.isAttributeGroupNode = function (amxNode)
  {
    if(amxNode && amxNode.getTag() && amxNode.getTag().getName() === 'attributeGroups')
    {
      return true;
    }
    return false;
  };
  
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  var TreeModelBuilder = {};
  adf.mf.internal.dvt.treeview.TreeModelBuilder = TreeModelBuilder;
 
  TreeModelBuilder.createModelNodes = function (amxNode, context)
  {
    var dataItems = amxNode["_dataItems"];
    var rowKeyCache = amxNode['_rowKeyCache'];
    var ignoredProps = (function() {
      return {
        props : ['attrGroups'],
        contains : function (arg) {
           for(var i=0; i<this.props.length; i++)
           {
             if(this.props[i] == arg) return true;
           }
           return false;
        }
      };
    })();
    
    var i, dataItem, node, detachedGroups, config, randomColor;
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
    
    for (i = 0; i < dataItems.length; i++)
    {
      dataItem = dataItems[i];
      
      node = {};
      
      // copy properties
      for (var key in dataItem) {
        if (dataItem.hasOwnProperty(key)) 
        {
          // copy every non private and non ingored string property to node object
          if((Object.prototype.toString.call(key) == '[object String]') && !(key.indexOf('_') == 0) && !ignoredProps.contains(key))
          {
            node[key] = dataItem[key];
          }
        }
      }
      
      // add rowKey to the cache for data selection callbacks
      rowKeyCache[node['id']] = dataItem['_rowKey'];
      
      detachedGroups = dataItem['_detachedGroups']
      AttributeGroupManager.attachProcessedAttributeGroups(context, detachedGroups);
      
      config = new adf.mf.internal.dvt.common.attributeGroup.DataItemConfig();
      randomColor = DefaultPalettesValueResolver.resolveValue(amxNode, DefaultPalettesValueResolver.COLOR, i);
      config.addTypeDefaultValue(DefaultPalettesValueResolver.COLOR, randomColor);
      
      AttributeGroupManager.registerDataItem(context, node, config);

      amxNode["_optionsObj"]["nodes"].push(node);
    }
  };
  
})();
(function(){

  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var TreeModelBuilder = adf.mf.internal.dvt.treeview.TreeModelBuilder;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  /**
   * Common renderer for all tree views.
   */
  var BaseTreeviewRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseTreeviewRenderer, 'adf.mf.internal.dvt.common.FacetlessDataStampRenderer', 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer');

  /**
   * @param {Object} amxNode
   * @return the chart type or null
   */
  BaseTreeviewRenderer.prototype.GetChartType = function (amxNode)
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    BaseTreeviewRenderer.superclass.MergeComponentOptions.call(this, amxNode);

    var options = amxNode["_optionsObj"];
    if(!options['nodeDefaults'])
    {
      options['nodeDefaults'] = {};
    }

    // almost every property can have default value -> some defautls are handled by toolkit using nodeDefaults options property
    // some are handled by renderer (in GetAttributesDefinition function)

    // set toolkit defaults
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelDisplay', 'nodeDefaults/labelDisplay');
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelHalign', 'nodeDefaults/labelHalign');
    TreeviewUtils.copyOptionIfDefined(options, 'node/labelValign', 'nodeDefaults/labelValign');

    // extract default colors from styleDefaults and dispose styleDefaults so that it's not passed to toolkit
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults)
    {
      if (styleDefaults['colors'])
      {
        amxNode['_defaultColors'] = styleDefaults['colors'];
      }
      if (styleDefaults['patterns'])
      {
        amxNode['_defaultPatterns'] = styleDefaults['patterns'];
      }
      delete options['styleDefaults'];    // remove styleDefaults from options, no longer needed
    }

  };

  BaseTreeviewRenderer.prototype.GetStyleComponentName = function () {
    return null;
  };

  BaseTreeviewRenderer.prototype.SetupComponent = function (amxNode)
  {
    var outerDiv = BaseTreeviewRenderer.superclass.SetupComponent.call(this, amxNode);

    var inlineStyle = amxNode.getAttribute("inlineStyle");
    var styleClass = amxNode.getAttribute("styleClass");

    var classes = this.GetOuterDivClass() + " ";
    if(styleClass){
      classes += styleClass;
    }

    if(!inlineStyle){
      inlineStyle = "";
    }

    outerDiv.className = (outerDiv.className + " " + classes);

    var currStyle = outerDiv.getAttribute('style');
    if(!currStyle) currStyle = "";

    currStyle = currStyle.replace(/^\s+|\s+$/g, '');
    if(currStyle.length > 0 && !(currStyle.lastIndexOf(";") === (currStyle.length - 1)))
    {
      currStyle = currStyle + ";";
    }
    outerDiv.setAttribute('style', currStyle + inlineStyle);

    return outerDiv;
  };

  /**
   * Returns outer div class if any
   * @abstract
   * @returns outer div class if any
   */
  BaseTreeviewRenderer.prototype.GetOuterDivClass = function ()
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = BaseTreeviewRenderer.superclass.GetAttributesDefinition.call(this, amxNode);

    // set renderer defaults where needed
    var styleCName = this.GetStyleComponentName();
    var options = amxNode["_optionsObj"];

    attrs['animationDuration'] = {'path' : 'animationDuration', 'type' : AttributeProcessor['INTEGER'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationDuration')};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationOnDisplay')};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/animationOnDataChange')};
    attrs['nodeSelection'] = {'path' : 'selection', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/nodeSelection')};
    attrs['sorting'] = {'path' : 'sorting', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/sorting')};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, styleCName+'/emptyText')};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['sizeLabel'] = {'path' : 'sizeLabel', 'type' : AttributeProcessor['TEXT']};
    attrs['colorLabel'] = {'path' : 'colorLabel', 'type' : AttributeProcessor['TEXT']};
    attrs['legendSource'] = {'path' : 'legendSource', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  /**
   * Initialize generic options.
   */
  BaseTreeviewRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    BaseTreeviewRenderer.superclass.InitComponentOptions.call(this, amxNode);

    amxNode["_optionsObj"] = {};
    amxNode["_optionsObj"]["nodeDefaults"] = {};
    amxNode["_optionsObj"]["nodes"] = [];

    // if the data attribute is defined, use it to initialize the data object
    if (amxNode.isAttributeDefined('data'))
    {
      amxNode["_optionsObj"]["nodes"] = amxNode.getAttribute('data');
    }

    amxNode["_optionsObj"]["type"] = this.GetChartType(amxNode);

    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
    amxNode["_dataItems"] = [];
    AttributeGroupManager.reset(amxNode);
    amxNode['_stylesResolved'] = false;
    amxNode['_rowKeyCache'] = {};
  };

  BaseTreeviewRenderer.prototype.setSelectedAndIsolatedNodes = function(amxNode) {
    var options = amxNode["_optionsObj"];
    var changed = false;

    var isolatedNodeAttr = amxNode.isAttributeDefined("isolatedRowKey") ? amxNode.getAttribute("isolatedRowKey") : null;
    var selectedRowKeys = amxNode.isAttributeDefined("selectedRowKeys") ?
                          AttributeProcessor['ROWKEYARRAY'](amxNode.getAttribute("selectedRowKeys")) : null;

    if (isolatedNodeAttr || selectedRowKeys) {

      var treeviewNodeTags = amxNode.getTag().getChildren(dvtm.DVTM_NAMESPACE, this.GetStampedChildTagName());
      // no data, nothing to do
      if (treeviewNodeTags.length === 0)
      {
        return;
      }

      var varName = amxNode.getAttribute('var');

      var iter = this.createIterator(amxNode, false);
      while (iter.hasNext())
      {
        var modelDataItem = iter.next();
        adf.mf.el.addVariable(varName, modelDataItem);

        var treeviewNodes = amxNode.getChildren(null, iter.getRowKey());

        var iter2 = adf.mf.api.amx.createIterator(treeviewNodes);
        while (iter2.hasNext())
        {
          var treeviewNode = iter2.next();
          var id = treeviewNode.getId();
          var rowKey = treeviewNode.getStampKey();

          if(isolatedNodeAttr !== null) {
            if(rowKey === isolatedNodeAttr) {
              options["isolatedNode"] = id;
              changed = true;
            }

          }
          if(selectedRowKeys !== null) {
            if(selectedRowKeys.indexOf(rowKey) > -1) {
              if(!options["selectedNodes"]) {
                options["selectedNodes"] = [];
              }
              options["selectedNodes"].push(id);
              changed = true;
            }
          }

        }

        adf.mf.el.removeVariable(varName);
      }
    }
    return changed;
  };

  /**
   * Check if renderer is running in dtmode. If so then load only dummy data. In other case leave processing on the
   * parent.
   */
  BaseTreeviewRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.treeview.BaseTreeviewRenderer.ProcessChildren");
    try
    {
      if (amx.dtmode)
      {
        var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition('treeView');
        var dtModeData = definition.getDTModeData();

        $.extend(true, options['nodes'], dtModeData['nodes']);
        if(amxNode.isAttributeDefined('displayLevelsChildren'))
        {
          this.enforceLevelsChildren(options['nodes'], amxNode.getAttribute('displayLevelsChildren'));
        }

        return true;
      }
      else
      {
        if (!amxNode.isAttributeDefined('value'))
        {
          return false;
        }

        AttributeGroupManager.init(context);

        var changed = BaseTreeviewRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
        changed = changed | this.setSelectedAndIsolatedNodes(amxNode);

        //build tree model
        TreeModelBuilder.createModelNodes(amxNode, context);

        var updateCategories = function(attrGrp, dataItem, valueIndex, exceptionRules) {
          if (!dataItem['categories']) dataItem['categories'] = [];
          var categories = dataItem['categories'];

          if(attrGrp.isContinuous()) {
            categories.push(attrGrp.getId() + ":" + valueIndex);
          } else {
            categories.push(attrGrp.getId() + ":" + attrGrp.getCategoryValue(valueIndex));
          }

          var rules = exceptionRules.getRules();
          for(var i=0; i < rules.length; i++) {
            categories.push(attrGrp.getId() + ":" + rules[i]['value']);
          }
        };

        // process attribute groups
        var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
        config.setUpdateCategoriesCallback(updateCategories);

        AttributeGroupManager.applyAttributeGroups(amxNode, config, context);

        // if legendSource is defined add corresponding attribute group description to the options
        var legendSource = options['legendSource'];
        var attrGroup = AttributeGroupManager.findGroupById(amxNode, legendSource);

        if(attrGroup) {
          if(!amxNode["_optionsObj"]["attributeGroups"]) {
            amxNode["_optionsObj"]["attributeGroups"] = [];
          }
          amxNode["_optionsObj"]["attributeGroups"].push(attrGroup.getDescription());
        }

        return changed;
      }
    }
    finally
    {
      perf.stop();
    }
  };

  BaseTreeviewRenderer.prototype.enforceLevelsChildren = function(nodes, level) {
    if(!nodes) return;
    if(level < 0) level = 0;
    if(level === 0) {
      for(var i=0; i<nodes.length; i++){
        if(nodes[i].nodes) nodes[i].nodes = null;
      }
    }else{
      for(var i=0; i<nodes.length; i++){
        this.enforceLevelsChildren(nodes[i].nodes, level -1);
      }
    }
  };

  /**
   * Reset options for all treeview components.
   */
  BaseTreeviewRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    BaseTreeviewRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);

    // make a note that this is a refresh phase
    amxNode['_refreshing'] = true;
    amxNode['_attributeChanges'] = attributeChanges;

    if (attributeChanges.hasChanged('value') || descendentChanges)
    {
      amxNode["_dataItems"] = [];
    }

    amxNode["_optionsObj"]["nodes"] = [];

    AttributeGroupManager.reset(amxNode);
    amxNode["_rowKeyCache"] = {};

    var selection = amxNode["_selection"];
    if (selection !== undefined && selection !== null)
    {
      amxNode["_optionsObj"]["selection"] = selection;
    }


  };

  /**
   * Function creates callback for the toolkit component which is common for all treeview components
   */
  BaseTreeviewRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var callbackObject =
      {
        'callback' : function (event, component)
          {
            var rowKeyCache = amxNode['_rowKeyCache'];
            var rowKey = null;

            if (event.getType() === 'selection')
            {
              // selectionChange event support
              var selection = event.getSelection();
              if (selection !== undefined)
              {
                var selectedRowKeys = [];
                var i;

                for (i = 0;i < selection.length;i++)
                {
                  rowKey = null;
                    var objId = selection[i];
                    if (rowKeyCache[objId] !== undefined)
                    {
                      rowKey = rowKeyCache[objId];
                    }
                  if (rowKey !== null)
                  {
                    selectedRowKeys.push(rowKey);
                  }
                }
                var se = new adf.mf.api.amx.SelectionEvent(selectedRowKeys, selectedRowKeys);
                adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se);

                var _selection = [];
                if (selection !== undefined && selection !== null)
                {
                  for (i = 0; i < selection.length; i++)
                  {
                    var eventSelectionObject = selection[i];

                    var selectionObject = {};
                    selectionObject['id'] = eventSelectionObject;

                    _selection.push(selectionObject);
                  }
                }

                amxNode["_selection"] = _selection;
              }
            }
          }
      };
    return callbackObject;
  };

  BaseTreeviewRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return null;
  };

  BaseTreeviewRenderer.prototype.AdjustStageDimensions = function (dim)
  {
    var width = dim['width'];
    var height = dim['height'];

    var widthThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_WIDTH / 3);
    var heightThreshold = Math.floor(adf.mf.internal.dvt.BaseComponentRenderer.DEFAULT_HEIGHT / 3);

    if(width - widthThreshold < 0 || height - heightThreshold < 0)
    {
      var ratio;
      if(width - widthThreshold < height - heightThreshold)
      {
        ratio = height / width ;
        width = widthThreshold;
        height = width * ratio;
      }
      else
      {
        ratio = width / height ;
        height = heightThreshold;
        width = height * ratio;
      }
    }

    return {'width' : width, 'height' : height};
  };

  /**
   * Function renders instance of the component
   */
  BaseTreeviewRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
    }
    var dim = this.AdjustStageDimensions({'width' : width, 'height' : height});
    instance.render(data, dim['width'], dim['height']);
  };



})();
(function(){

  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var BaseTreeviewNodeRenderer = function()
  {};
  

  adf.mf.internal.dvt.DvtmObject.createSubclass(BaseTreeviewNodeRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer');

  BaseTreeviewNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = BaseTreeviewNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);

    var options = amxNode["_optionsObj"];

    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['TEXT']};
    attrs['label'] = {'path' : 'label', 'type' : AttributeProcessor['TEXT']};
    attrs['fillColor'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['fillPattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['labelDisplay'] = {'path' : 'labelDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['labelHalign'] = {'path' : 'labelHalign', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };

  BaseTreeviewNodeRenderer.prototype.ProcessAttributes = function (options, treeviewNode, context)
  {
    var amxNode = context['amxNode'];
    var stamp = context['stamp'];
    var dataItem = this.CreateTreeViewNode(amxNode, treeviewNode, context);

    if(dataItem)
    {
      dataItem['_rowKey'] = context['_rowKey'];
      dataItem['id'] = treeviewNode.getId();

      // always process all attributes -> temporarily delete _attributeChanges
      var currentAttributeChanges = context['_attributeChanges'];
      context['_attributeChanges'] = null;

      // process marker attributes
      BaseTreeviewNodeRenderer.superclass.ProcessAttributes.call(this, dataItem, treeviewNode, context);

      context['_attributeChanges'] = currentAttributeChanges;

      amxNode["_dataItems"].push(dataItem);

      var childNodes = treeviewNode.getChildren();
      var iter3 = adf.mf.api.amx.createIterator(childNodes);
      while (iter3.hasNext())
      {
        var childNode = iter3.next();

        if(!TreeviewUtils.isAttributeGroupNode(childNode))
        {
          continue;
        }

        if (childNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(childNode.getAttribute('rendered')))
          continue;         // skip unrendered nodes

        if (!childNode.isReadyToRender())
        {
          throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
        }
        AttributeGroupManager.processAttributeGroup(childNode, amxNode, context);
      }
      var detached = AttributeGroupManager.detachProcessedAttributeGroups(context);
      dataItem['_detachedGroups'] = detached;
    }

    context["dataItem"] = dataItem;

    return true;
  };


  BaseTreeviewNodeRenderer.prototype.CreateTreeViewNode = function (amxNode, treeviewNode, context)
  {
    var attr;

    // first check if this data item should be rendered at all
    attr = treeviewNode.getAttribute('rendered');
    if (attr !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(attr))
        return null;
    }

    var dataItem =
    {
      'attrGroups' : []
    };

    return dataItem;
  };

})();
(function(){

  var DOM_STRUCTURES = 
  {
    'areaChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C", "Group D"], 
            'series' : [
                {name : "Series 1", items : [74, 42, 70, 46]},
                {name : "Series 2", items : [50, 58, 46, 54]},
                {name : "Series 3", items : [34, 22, 30, 32]},
                {name : "Series 4", items : [18, 6, 14, 22]}
            ]
          }
      },
    'barChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
        },
    'bubbleChart' : 
      {
        'dtModeData' :
          {
            'groups' : ["Group A", "Group B", "Group C"], 
            'series' : [
                {name : "Series 1", items : [{x : 15, y : 25, z : 5},{x : 25, y : 30, z : 12},{x : 25, y : 45, z : 12}]},
                {name : "Series 2", items : [{x : 15, y : 15, z : 8},{x : 20, y : 35, z : 14},{x : 40, y : 55, z : 35}]},
                {name : "Series 3", items : [{x : 10, y : 10, z : 8},{x : 18, y : 55, z : 10},{x : 40, y : 50, z : 18}]},
                {name : "Series 4", items : [{x : 8, y : 20, z : 6},{x : 11, y : 30, z : 8},{x : 30, y : 40, z : 15}]}
              ]
          }
      },
    'comboChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },
    'funnelChart' : 
      {
        'dtModeData' : 
          {
            'groups' : [], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },            
    'horizontalBarChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B"], 
            'series' : [
                {name : "Series 1", items : [42, 34]},
                {name : "Series 2", items : [55, 30]},
                {name : "Series 3", items : [36, 50]},
                {name : "Series 4", items : [22, 46]},
                {name : "Series 5", items : [22, 46]}
            ]
          }
      },
    'lineChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C", "Group D", "Group E"], 
            'series' : [
               {name : "Series 1", items : [74, 62, 70, 76, 66]},
               {name : "Series 2", items : [50, 38, 46, 54, 42]},
               {name : "Series 3", items : [34, 22, 30, 32, 26]},
               {name : "Series 4", items : [18, 6, 14, 22, 10]},
               {name : "Series 5", items : [3, 2, 3, 3, 2]}
              ]
          }
      },
    'pieChart' : 
      {        
        'dtModeData' : 
          {
            'groups' : [""],
            'series' : [
                {id : "Series 1", name : "Series 1", items : [42]},
                {id : "Series 2", name : "Series 2", items : [55]},
                {id : "Series 3", name : "Series 3", items : [36]},
                {id : "Series 4", name : "Series 4", items : [22]},
                {id : "Series 5", name : "Series 5", items : [22]}
            ]
          }
      },
    'scatterChart' : 
      {
        'dtModeData' : 
          {
            'groups' : ["Group A", "Group B", "Group C"], 
            'series' : [
                {name : "Series 1", items : [{x : 15, y : 15},{x : 25, y : 43},{x : 25, y : 25}]},
                {name : "Series 2", items : [{x : 25, y : 15},{x : 55, y : 45},{x : 57, y : 47}]},
                {name : "Series 3", items : [{x : 17, y : 36},{x : 32, y : 52},{x : 26, y : 28}]},
                {name : "Series 4", items : [{x : 38, y : 22},{x : 43, y : 43},{x : 58, y : 36}]}
            ]
          }
      },
    'sparkChart' : 
      {
        'dtModeData' : [20, 25, 15, 10, 18, 15, 20, 15, 25, 30, 20, 18, 25, 28, 30]
      },
    'treeView' :
      {
        'dtModeData' :
        {
          'nodes': [
              {id: "00", value: 70, color: "#336699", label: "Massachusetts"},
              {id: "01", value: 95, color: "#CC3300", label: "New York"},
              {id: "02", value: 30, color: "#F7C808", label: "Connecticut"},
              {id: "03", value: 83, color: "#F7C808", label: "Maine"},
              {id: "04", value: 12, color: "#F7C808", label: "Vermont"}
           ]
         }
      },
    'timeline' :
      {
        'dtModeData' :
        {
          "startTime": 1263237200000,
          "itemSelection": "single",
          "endTime": 1266238000000,
          "axis": {
            "scale": "days"
          }
        }
      },
    'timelineSeries' :
      {
        'dtModeData' :
        {
          'items0': [
              {"id": "ts1:1:ti1", "title": "Jan 13, 2010", "startTime": 1263337200000, "endTime": 1263737200000, "description": "Event 1"},
              {"id": "ts1:2:ti1", "title": "Jan 27, 2010", "startTime": 1264546800000, "description": "Event 2"},
              {"id": "ts1:3:ti1", "title": "Jan 29, 2010", "startTime": 1264719600000, "endTime": 1265019600000, "description": "Event 3"},
              {"id": "ts1:4:ti1", "title": "Feb 4, 2010", "startTime": 1265238000000, "description": "Event 4"}
           ],
           'items1': [
              {"id": "ts2:1:ti1", "title": "Jan 13, 2010", "startTime": 1263337200000, "endTime": 1263737200000, "description": "Event 1"},
              {"id": "ts2:2:ti1", "title": "Jan 27, 2010", "startTime": 1264546800000, "description": "Event 2"},
              {"id": "ts2:3:ti1", "title": "Jan 29, 2010", "startTime": 1264719600000, "endTime": 1265019600000, "description": "Event 3"},
              {"id": "ts2:4:ti1", "title": "Feb 4, 2010", "startTime": 1265238000000, "description": "Event 4"}
           ]
         }
      }
  }
  
  var ComponentDefinition = function(structure)
  {
    if(structure !== undefined)
    {
      this._dtModeData = structure['dtModeData'];
    }
    else
    {
      this._dtModeData = null;
    }
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ComponentDefinition, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.ComponentDefinition');
  
  var definitionCache = {};
  
  adf.mf.internal.dvt.ComponentDefinition = {};
  adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition = function(name)
  {
    if(definitionCache === undefined)
    {
      definitionCache = {};
    }
    
    if(definitionCache[name] === undefined)
    {
      var structure = DOM_STRUCTURES[name];
      definitionCache[name] = new ComponentDefinition(structure);
    }
    
    return definitionCache[name];
  }
 
  ComponentDefinition.prototype.getDTModeData = function()
  {
    return this._dtModeData;
  }

})();
(function(){

  var AreaChartRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.AreaChartRenderer');
  
  AreaChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'area';
  }
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'areaChart', AreaChartRenderer);
})();
(function(){

  var BarChartRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(BarChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.BarChartRenderer');
 
  BarChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'bar';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'barChart', BarChartRenderer);
})();
(function(){

  var BubbleChartRenderer = function ()
  { }  

  adf.mf.internal.dvt.DvtmObject.createSubclass(BubbleChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.BubbleChartRenderer');
  
  BubbleChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'bubble';
  }
  
  BubbleChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'bubbleChart', BubbleChartRenderer);
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var ChartDataItemRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ChartDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.ChartDataItemRenderer');

  ChartDataItemRenderer.prototype.GetChartType = function (amxNode)
  {
    return amxNode["_optionsObj"]["type"];
  }

  ChartDataItemRenderer.prototype.ProcessAttributes = function (options, markerNode, context)
  {
    var amxNode = context['amxNode'];
    // process marker attributes
    var marker = this._processMarker(amxNode, markerNode, context);

    if (marker != null)
    {
      var attributeGroupsNodes = markerNode.getChildren();
      var iter3 = adf.mf.api.amx.createIterator(attributeGroupsNodes);
      while (iter3.hasNext())
      {
        var attrGroupsNode = iter3.next();

        if (attrGroupsNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(attrGroupsNode.getAttribute('rendered')))
          continue;         // skip unrendered nodes

        if (!attrGroupsNode.isReadyToRender())
        {
          throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
        }
        
        AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
      }
    }

    // add the marker to the model
    this._applyMarkerToModel(amxNode, marker, context);

    return true;
  }

  /**
   * parses marker attributes (and potential attribute groups and
   * stores the internal marker representation in the following format
   *
   * marker : {
   *     seriesId,      // optional
   *     groupId,       // optional
   *     series,        // optional
   *     group,         // optional
   *     label,         // optional
   *     x,             // required
   *     y,             // required
   *     z,             // required for bubble chart
   *     markerSize,    // optional, marker size (does not apply to bubble)
   *     borderColor,   // optional
   *     color,         // optional, may come from attribute groups
   *     markerShape,         // optional, may come from attribute groups
   *     shortDesc,     // optional tooltip
   *     value,         // data item value for area/bar/line charts
   *     markerDisplayed  // optional, true by default
   *     attrGroups     // optional, array of attribute group references
   *
   *
   */
  ChartDataItemRenderer.prototype._processMarker = function (amxNode, markerNode, context)
  {
    var attr, attr2;

    // first check if this data item should be rendered at all
    attr = markerNode.getAttribute('rendered');
    if (attr !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(attr))
        return null;
    }

    var marker =
    {
      'attrGroups' : []
    };

    attr = markerNode.getAttribute('groupId');
    if (attr !== undefined)
    {
      marker['groupId'] = attr;
    }

    attr = markerNode.getAttribute('group');
    if (attr !== undefined)
    {
      // if this is a regular time axis, then groups should be ISO 8601 encoded dates
      attr2 = amxNode.getAttribute('timeAxisType');
      if (attr2 && attr2 === 'enabled')
      {
        marker['group'] = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](attr);
      }
      else
      {
        // otherwise, it's just a regular group label
        marker['group'] = attr;
      }
    }

    attr = markerNode.getAttribute('seriesId');
    attr2 = markerNode.getAttribute('series');
    if (attr !== undefined)
    {
      marker['seriesId'] = attr;
    }
    else if (attr2 !== undefined)
    {
      marker['seriesId'] = attr2;
    }

    if (attr2 !== undefined)
    {
      marker['series'] = attr2;
    }
    else
    {
      // need at least one anonymous series, if no series name/id is defined
      marker['series'] = "";
      if (marker['seriesId'] === undefined)
      {
        marker['seriesId'] = "_1";
      }
    }

    marker['_rowKey'] = context['_rowKey'];

    marker['id'] = markerNode.getId();

    attr = markerNode.getAttribute('x');
    if (attr !== undefined)
    {
      // if this is a mixed frequency time axis, then 'x' value should be an ISO 8601 encoded date
      attr2 = amxNode.getAttribute('timeAxisType');
      if (attr2 && attr2 === 'mixedFrequency')
      {
        marker['x'] = adf.mf.internal.dvt.AttributeProcessor['DATETIME'](attr);
      }
      else
      {
        // otherwise, x is just a regular numeric value
        marker['x'] =  + attr;
      }
    }
    attr = markerNode.getAttribute('y');
    if (attr !== undefined)
    {
      marker['y'] =  + attr;
    }
    attr = markerNode.getAttribute('z');
    if (attr !== undefined)
    {
      marker['z'] =  + attr;
    }
    attr = markerNode.getAttribute('label');
    if (attr !== undefined)
    {
      marker['label'] =  attr;
    }
    attr = markerNode.getAttribute('labelPosition');
    if (attr !== undefined)
    {
      marker['labelPosition'] =  attr;
    }
    attr = markerNode.getAttribute('labelStyle');
    if (attr !== undefined)
    {
      marker['labelStyle'] =  attr;
    }
    attr = markerNode.getAttribute('markerSize');
    if (attr !== undefined)
    {
      marker['markerSize'] =  + attr;
    }
    attr = markerNode.getAttribute('value');
    if (attr !== undefined)
    {
      marker['value'] =  + attr;
    }
    attr = markerNode.getAttribute('borderColor');
    if (attr)
    {
      marker['borderColor'] = attr;
    }
    attr = markerNode.getAttribute('color');
    if (attr)
    {
      marker['color'] = attr;
    }
    attr = markerNode.getAttribute('markerShape');
    if (attr)
    {
      marker.shape = attr;
    }
    attr = markerNode.getAttribute('shortDesc');
    if (attr)
    {
      marker['shortDesc'] = attr;
    }
    attr = markerNode.getAttribute('markerDisplayed');
    if (attr !== undefined)
    {
      marker['markerDisplayed'] = attr;
    }
    attr = markerNode.getAttribute('pattern');
    if (attr !== undefined)
    {
      marker['pattern'] = attr;
    }
    if (markerNode.isAttributeDefined('action'))
    {
      marker['action'] = context['_rowKey'];
    }
    else
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
      actionTags = markerNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else
      {
        actionTags = markerNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        marker['action'] = context['_rowKey'];
      }
    }

    return marker;
  }

   /**
   * applies resolved markers to the API model
   */
  ChartDataItemRenderer.prototype._applyMarkerToModel = function (amxNode, marker, context)
  {
    var rowKeyCache = amxNode['_rowKeyCache'];
    var chartType = this.GetChartType(amxNode);

    var g;
    var ser;
    var color, shape;
    var groupIndex;

    // populate an array of unique groups

    if (marker['groupId'] !== undefined)
    {
      this._addGroup(amxNode, marker['groupId'], marker['group']);
    }
    else
    {
      this._addGroup(amxNode, null, marker['group']);
    }

    var SeriesHelper = adf.mf.internal.dvt.chart.SeriesHelper;
    ser = SeriesHelper.getSeriesByIdAndName(this.GetChartType(amxNode), amxNode, marker['seriesId'], marker['series']);

    if (chartType !== 'bubble' && chartType !== 'scatter')
    {
      groupIndex = this._getGroupIndexByIdOrName(amxNode, marker['groupId'], marker['group']);
    }

    var dataItem = {};

    if (marker['x'] !== undefined)
    {
      dataItem['x'] = marker['x'];
    }
    if (marker['y'] !== undefined)
    {
      dataItem['y'] = marker['y'];
    }
    else if (marker['value'] !== undefined)
    {
      dataItem['y'] = marker['value'];
    }

    if (marker['z'] !== undefined)
    {
      // bubble chart z value
      dataItem['z'] = marker['z'];
    }
    if (marker['label'] !== undefined)
    {
      dataItem['label'] = marker['label'];
    }
    if (marker['labelPosition'] !== undefined)
    {
      dataItem['labelPosition'] = marker['label'];
    }
    if (marker['labelStyle'] !== undefined)
    {
      dataItem['labelStyle'] = marker['labelStyle'];
    }
    if (marker['markerSize'] !== undefined)
    {
      dataItem['markerSize'] = marker['markerSize'];
    }

    if (marker['shortDesc'] !== undefined)
    {
      dataItem['shortDesc'] = marker['shortDesc'];
    }
    if (marker['borderColor'] !== undefined)
    {
      dataItem['borderColor'] = marker['borderColor'];
    }
    
    // proceed with color and shape attributes set on marker tag
    if (marker['markerDisplayed'] !== undefined)
    {
      dataItem['markerDisplayed'] = (adf.mf.api.amx.isValueTrue(marker['markerDisplayed'])) ? true : false;
    }
    if (marker['id'] !== undefined)
    {
      dataItem['id'] = marker['id'];
    }
    if (marker['action'] !== undefined)
    {
      dataItem['action'] = marker['action'];
    }
    // add rowKey to the cache for data selection callbacks
    rowKeyCache[marker['id']] = marker['_rowKey'];

    // store the data item to the options series object
    if (chartType === 'bubble' || chartType === 'scatter')
    {
      ser['items'].push(dataItem);
    }
    else
    {
      ser['items'][groupIndex] = dataItem;
    }
    
    if (marker['color'] !== undefined)
    {
      dataItem['color'] = marker['color'];
    }
    if (marker['markerShape'] !== undefined)
    {
      dataItem['markerShape'] = marker['markerShape'];
    }
    if (marker['pattern'] !== undefined)
    {
      dataItem['pattern'] = marker['pattern'];
    }
    
    AttributeGroupManager.registerDataItem(context, dataItem, null);
    
  }

  /**
   * returns a index of the group in the groups array.  First tries to find
   * the group by its id. If not found, looks for the group by the name
   */
  ChartDataItemRenderer.prototype._getGroupIndexByIdOrName = function (amxNode, id, name)
  {
    var groups = amxNode["_optionsObj"]['groups'];
    var g;

    if (id)
    {
      for (g = 0; g < groups.length; g++)
      {
        if (groups[g]['id'] === id)
          return g;
      }
    }
    else
    {
      for (g = 0; g < groups.length; g++)
      {
        if (groups[g] === name)
          return g;
      }
    }
    // not found, something's wrong, return null
    return null;
  }

  /**
   *  adds a new group to the groups array
   *
   *  if groupId exists, the group is identified by groupId, and a new groups
   *  item is created as: {'id': groupId, name: group}
   *  if groupId is missing, the group is identified by the 'group' parameter
   *  and the groups item is a plain string
   */
  ChartDataItemRenderer.prototype._addGroup = function (amxNode, groupId, group)
  {
    var groups = amxNode["_optionsObj"]['groups'];
    var g = 0;

    for (g = 0;g < groups.length;g++)
    {
      if (groupId)
      {
        if (groups[g]['id'] === groupId)
          return;
      }
      else
      {
        if (groups[g] === group)
          return;
      }
    }
    if (g >= groups.length)
    {
      if (groupId)
      {
        groups.push(
        {
          'id' : groupId, 'name' : group
        });
      }
      else if (group !== undefined)
      {
        groups.push(group);
      }
    }
  }
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.chart');

  adf.mf.internal.dvt.chart.DefaultChartStyle = {};

  adf.mf.internal.dvt.chart.DefaultChartStyle.SKIN_ALTA = 
  {
    // set default skin family
    'skin' : 'alta',
    // common chart properties
    // chart title separator properties
    'titleSeparator' : 
    {
      // separator upper color
      'upperColor' : "#74779A", 
      // separator lower color
      'lowerColor' : "#FFFFFF", 
      // should display title separator
      'rendered' : false
    },

    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", 
                  "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default marker shapes
      'shapes' : ['circle', 'square', 'diamond', 'plus', 'triangleUp', 'triangleDown', 'human'], 
      // series effect
      'seriesEffect' : "color"
    }

  };

  adf.mf.internal.dvt.chart.DefaultChartStyle.VERSION_1 = 
  {
    // set default skin family
    'skin' : 'skyros',
    // common chart properties
    // text to be displayed, if no data is provided
    'emptyText' : null, 
    // animation effect when the data changes
    'animationOnDataChange' : "none", 
    // animation effect when the chart is displayed
    'animationOnDisplay' : "none", 
    // time axis type - disabled / enabled / mixedFrequency
    'timeAxisType' : "disabled",

    // chart legend properties
    'legend' : 
    {
      // legend position none / auto / start / end / top / bottom
      'position' : "auto"
    },

    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#003366", "#CC3300", "#666699", "#006666", "#FF9900", "#993366", 
                  "#99CC33", "#624390", "#669933", "#FFCC33", "#006699", "#EBEA79"], 
      // default series patterns, use only if you want to modify default pattern set
      // 'patterns': ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", 
      //           "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"],
      // default marker shapes
      'shapes' : ['circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human'], 
      // series effect (gradient, color, pattern)
      'seriesEffect' : "gradient", 
      // animation duration in ms
      'animationDuration' : 1000, 
      // animation indicators - all / none
      'animationIndicators' : "all", 
      // animation up color
      'animationUpColor' : "#0099FF", 
      // animation down color
      'animationDownColor' : "#FF3300", 
      // default line width (for line chart)
      'lineWidth' : 3, 
      // default line style (for line chart) - solid / dotted / dashed
      'lineStyle' : "solid", 
      // should markers be displayed (in line and area charts)
      'markerDisplayed' : "off", 
      // default marker color
      'markerColor' : null, 
      // default marker shape
      'markerShape' : "auto", 
      // default marker size
      'markerSize' : 8, 
      // pie feeler color (pie chart only)
      'pieFeelerColor' : "#BAC5D6", 
      // slice label position and text type (pie chart only)
      'sliceLabel' : 
      {
        'position' : "outside", 'textType' : "percent"
      }
    },
    '_resources' :
    {
      'panUp' :       'css/images/chart/pan-up.png',
      'panDown' :     'css/images/chart/pan-down.png',
      'zoomUp' :      'css/images/chart/zoom-up.png',
      'zoomDown' :    'css/images/chart/zoom-down.png',
      'selectUp' :    'css/images/chart/marquee-up.png',
      'selectDown' :  'css/images/chart/marquee-down.png'
    }
  };

  adf.mf.internal.dvt.chart.DefaultSparkChartStyle = {};
  
  adf.mf.internal.dvt.chart.DefaultSparkChartStyle.SKIN_ALTA = {
    'skin' : "alta",
    'color' : "#267db3"
  };

  adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1 = {
    'skin' : "skyros",
    'type' : "line",
    'animationOnDisplay' : "none",
    'animationOnDataChange' : "none",
    'emptyText' : null, 
    'color' : "#666699",
    'firstColor' : null, 
    'lastColor' : null, 
    'highColor' : null, 
    'lowColor' : null,  
    'visualEffects' : "auto",
    'lineWidth' : 1,
    'lineStyle' : "solid",
    'markerSize' : 5,
    'markerShape' : "auto"
  };  
  
  adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS = 
  {
    'type' : "line", 
    'color' : "#00FF00"
  }
})();
(function(){

  var ComboChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ComboChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.ComboChartRenderer');
  
  ComboChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'combo';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'comboChart', ComboChartRenderer);
})();
(function(){

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.funnelChart');
  
  adf.mf.internal.dvt.funnelChart.DefaultFunnelChartStyle = 
  {
    // default style values
    'styleDefaults': {
      'backgroundColor' : 'lightgrey'
    }
  };
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var FunnelChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(FunnelChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.FunnelChartRenderer');
  
  FunnelChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'funnel';
  }
  
  FunnelChartRenderer.prototype.GetFacetNames = function ()
  {
    return ['dataStamp']; 
  }
  
  FunnelChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return FunnelChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }
  
  /**
   * processes the components's child tags
   */
  FunnelChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'facet':
            {
             'dataStamp' :
               {
                 'funnelDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.FunnelDataItemRenderer() }
               }
            },
          'simple' :
            {
              'chartValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('*'), 'order' : 2, 'maxOccurrences' : 1 },
              'legend' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
            }
        }
    }
    
    if(facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  }
  
  FunnelChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = FunnelChartRenderer.superclass.GetAttributesDefinition.call(this);
    // Defines whether the chart is displayed with a 3D effect. Only applies to pie and funnel charts.
    attrs['threeDEffect'] = {'path' : 'styleDefaults/threeDEffect', 'type' : AttributeProcessor['TEXT']};
    // The chart orientation. Only applies for funnel charts currently, but may be extended to apply to other chart types in the future.
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT'], 'default' : 'horizontal'};
    // Specifies whether the funnel slices are separated by gaps.
    attrs['sliceGaps'] = {'path' : 'styleDefaults/funnelSliceGaps', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  }
    
  FunnelChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = FunnelChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-funnelDataItem'] = [
      {'path' : 'styleDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']},
      {'path' : 'styleDefaults/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}
    ];
    
    return styleClasses; 
  }
  FunnelChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.funnelChart.DefaultFunnelChartStyle;
  }
  FunnelChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };

  FunnelChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // funnel chart should not prevent swipe/drag gestures
    return false;
  }

  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'funnelChart', FunnelChartRenderer); 
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var FunnelDataItemRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(FunnelDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.FunnelDataItemRenderer');
  
FunnelDataItemRenderer.prototype.ProcessAttributes = function (options, funnelDataItemNode, context)
  {
    var amxNode = context['amxNode'];
    
    var label;
    if (funnelDataItemNode.isAttributeDefined('label'))
    {
      label = funnelDataItemNode.getAttribute('label') + '';  // make sure label is passed as a string
    }

    var val = funnelDataItemNode.getAttribute('value');
    var action;

    
    var dataItem = {};
    
    // process attribute groups, if any
    dataItem['attrGroups'] = [];
    var attributeGroupsNodes = funnelDataItemNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter.hasNext()) {
      var attributeGroupsNode = iter.next();
      if (!attributeGroupsNode.isReadyToRender())
        {
          throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
        }
      AttributeGroupManager.processAttributeGroup(attributeGroupsNode, amxNode, context);
    }
    
    // for funnelChart we use value, not 'y'
    dataItem['value'] =  + val;
  
    if (funnelDataItemNode.isAttributeDefined('action'))
    {
      action = context['_rowKey'];
    }
    else 
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = funnelDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = funnelDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        action = context['_rowKey'];
      }
    }
 
    if (action !== undefined)
    {
      dataItem['action'] = action;
    }
    
    dataItem['id'] = funnelDataItemNode.getId();

    if (funnelDataItemNode.isAttributeDefined('shortDesc'))
    {
      dataItem['shortDesc'] = funnelDataItemNode.getAttribute('shortDesc');
    }
    // data item labels
    if (funnelDataItemNode.isAttributeDefined('label'))
    {
      dataItem['label'] = funnelDataItemNode.getAttribute('label') + '';
    }
    if (funnelDataItemNode.isAttributeDefined('labelStyle'))
    {
      dataItem['labelStyle'] = funnelDataItemNode.getAttribute('labelStyle') + '';
    }    
    if (funnelDataItemNode.isAttributeDefined('targetValue'))
    {
      dataItem['targetValue'] = funnelDataItemNode.getAttribute('targetValue');
    }

    var slice = 
    {
      'id' : label, 'name' : funnelDataItemNode.getAttribute('label') + '', 'items' : [dataItem]
    };

    if (funnelDataItemNode.isAttributeDefined('color'))
    {
      slice['color'] = funnelDataItemNode.getAttribute('color');
    }    
    if (funnelDataItemNode.isAttributeDefined('borderColor'))
    {
      slice['borderColor'] = funnelDataItemNode.getAttribute('borderColor');
    }

    this._addSeriesItem(options, slice);
  
    // add rowKey to the cache for data selection callbacks
    var rowKeyCache = context['amxNode']['_rowKeyCache'];
    rowKeyCache[dataItem['id']] = context['_rowKey'];
    
    AttributeGroupManager.registerDataItem(context, dataItem, null);    
    return true;
  }
  
  /**
   * adds a name/data pair to the series.  The item must be of type
   * { name: X, 'data': Y }.
   */
  FunnelDataItemRenderer.prototype._addSeriesItem = function (options, item)
  {
    options['series'].push(item);
  }
})();
(function(){

  var HorizontalBarChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(HorizontalBarChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.HorizontalBarChartRenderer');
  
  HorizontalBarChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'horizontalBar';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'horizontalBarChart', HorizontalBarChartRenderer);
})();
(function(){

  var LineChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(LineChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.LineChartRenderer');
  
  LineChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'line';
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'lineChart', LineChartRenderer);
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var PieChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PieChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.PieChartRenderer');
  
  PieChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'pie';
  }
  
  PieChartRenderer.prototype.GetFacetNames = function ()
  {
    return ['dataStamp']; 
  }
  
  PieChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return PieChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  }
  
  /**
   * processes the components's child tags
   */
  PieChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'facet':
            {
             'dataStamp' :
               {
                 'pieDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.PieDataItemRenderer() }
               }
            },
          'simple' :
            {
              'sliceLabel' : { 'renderer' : new adf.mf.internal.dvt.common.format.SliceLabelFormatRenderer(), 'order' : 1, 'maxOccurrences' : 1 },
              'pieValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('PIE'), 'order' : 2, 'maxOccurrences' : 1 },
              'chartValueFormat' : { 'renderer' : new adf.mf.internal.dvt.common.format.FormatRenderer('*'), 'order' : 2, 'maxOccurrences' : 1 },
              'legend' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
            }
        }
    }
    
    if(facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  }
  
  PieChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = PieChartRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['sliceLabelPosition'] = {'path' : 'styleDefaults/sliceLabelPosition', 'type' : AttributeProcessor['TEXT']};
    attrs['sliceLabelType'] = {'path' : 'styleDefaults/sliceLabelType', 'type' : AttributeProcessor['TEXT']};
    // attrs['sliceLabelStyle'] = {'path' : 'styleDefaults/sliceLabelStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['threeDEffect'] = {'path' : 'styleDefaults/threeDEffect', 'type' : AttributeProcessor['TEXT']};
    attrs['otherColor'] = {'path' : 'styleDefaults/otherColor', 'type' : AttributeProcessor['TEXT']};
    attrs['sorting'] = {'path' : 'sorting', 'type' : AttributeProcessor['TEXT']};
    attrs['otherThreshold'] = {'path' : 'otherThreshold', 'type' : AttributeProcessor['PERCENTAGE']};

    return attrs;
  }
  
  /**
   * We are trying to keep support for old sliceLabel element, as well as sliceLabel in styleDefaults,
   * but we use it only if new version in styleDefaults is not defined!
   * Bug 17198620 - uptake chart json api changes for slicelabel
   * @author midrozd
   */
  PieChartRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    PieChartRenderer.superclass.MergeComponentOptions.call(this, amxNode);
    
    var styleDefaults = amxNode['_optionsObj']['styleDefaults'];
    if (styleDefaults && styleDefaults['sliceLabel'])
    {
      var sliceLabelOptions = styleDefaults['sliceLabel'];
      if (sliceLabelOptions)
      {
        if (styleDefaults['sliceLabelPosition'] === undefined && sliceLabelOptions['position'])
          styleDefaults['sliceLabelPosition'] = sliceLabelOptions['position'];
        if (styleDefaults['sliceLabelType'] === undefined && sliceLabelOptions['textType'])
          styleDefaults['sliceLabelType'] = sliceLabelOptions['textType'];
        if (styleDefaults['sliceLabelStyle'] === undefined && sliceLabelOptions['style'])
          styleDefaults['sliceLabelStyle'] = sliceLabelOptions['style'];

      }
    }
  }
  
  PieChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = PieChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-chartPieLabel'] = {'path' : 'styleDefaults/pieLabelStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-chartSliceLabel'] = {'path' : 'styleDefaults/sliceLabelStyle', 'type' : StyleProcessor['CSS_TEXT']};
    
    return styleClasses; 
  }
  
  PieChartRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // pie chart does not prevent swipe gestures
    return false;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'pieChart', PieChartRenderer); 
})();
(function(){

  var PieDataItemRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PieDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.PieDataItemRenderer');
  
  PieDataItemRenderer.prototype.ProcessAttributes = function (options, pieDataItemNode, context)
  {
    var sliceId;
    if (pieDataItemNode.isAttributeDefined('sliceId'))
    {
      sliceId = pieDataItemNode.getAttribute('sliceId') + '';  // make sure sliceId is passed as a string
    }
    else 
    {
      sliceId = pieDataItemNode.getAttribute('label') + '';  // make sure sliceId is passed as a string
    }

    var val = pieDataItemNode.getAttribute('value');
    var action;

    if (pieDataItemNode.isAttributeDefined('action'))
    {
      action = context['_rowKey'];
    }
    else 
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = pieDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = pieDataItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        action = context['_rowKey'];
      }
    }
    var dataItem = {};
    
    dataItem['y'] =  + val;
    
    if (action !== undefined)
    {
      dataItem['action'] = action;
    }
    
    dataItem['id'] = pieDataItemNode.getId();

    if (pieDataItemNode.isAttributeDefined('shortDesc'))
    {
      dataItem['shortDesc'] = pieDataItemNode.getAttribute('shortDesc');
    }
    
    if (pieDataItemNode.isAttributeDefined('pattern'))
    {
      dataItem['pattern'] = pieDataItemNode.getAttribute('pattern');
    }    

    var slice = 
    {
      'id' : sliceId, 'name' : pieDataItemNode.getAttribute('label') + '', 'items' : [dataItem]
    };

    if (pieDataItemNode.isAttributeDefined('explode'))
    {
      var explode = parseFloat(pieDataItemNode.getAttribute('explode'));
      // Bug 18154290 - JSON API pieSliceExplode values are [0..1]
      if (explode > 1)
        explode = explode / 100;
      slice['pieSliceExplode'] = explode;
    }
    if (pieDataItemNode.isAttributeDefined('color'))
    {
      slice['color'] = pieDataItemNode.getAttribute('color');
    }
    if (pieDataItemNode.isAttributeDefined('displayInLegend'))
    {
      slice['displayInLegend'] = pieDataItemNode.getAttribute('displayInLegend');
    }
    // @TODO Need to uncomment it later, Bug 17198710 - uptake js chart marker text support
    // data item labels
    if (pieDataItemNode.isAttributeDefined('sliceLabel'))
    {
      dataItem['label'] = pieDataItemNode.getAttribute('sliceLabel') + '';
    }
    this._addSeriesItem(options, slice);

    // add rowKey to the cache for data selection callbacks
    var rowKeyCache = context['amxNode']['_rowKeyCache'];
    rowKeyCache[dataItem['id']] = context['_rowKey'];
    
    return true;
  }
  
  /**
   * adds a name/data pair to the series.  The item must be of type
   * { name: X, 'data': Y }.
   */
  PieDataItemRenderer.prototype._addSeriesItem = function (options, item)
  {
    options['series'].push(item);
  }
})();
(function(){

  var ScatterChartRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ScatterChartRenderer, 'adf.mf.internal.dvt.chart.BaseChartRenderer', 'adf.mf.internal.dvt.chart.ScatterChartRenderer');
  
  ScatterChartRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'scatter';
  }
  
  ScatterChartRenderer.prototype.PopulateCategories = function() {
    return true;
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'scatterChart', ScatterChartRenderer); 
})();
(function(){
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.chart');
  
  var SeriesHelper = {};
  adf.mf.internal.dvt.chart.SeriesHelper = SeriesHelper;
  
  /**
   * returns a reference to the series object.  First tries to find
   * the existing series by its id. If not found, creates a new series
   * object with the name and empty data array.
   */
  SeriesHelper.getSeriesByIdAndName = function (chartType, amxNode, id, name)
  {    
    var series = amxNode["_optionsObj"]['series'];
    var groups = amxNode["_optionsObj"]['groups'];
    var items = [];
    var s;
    var ser;

    // find existing series or create a new one
    for (s = 0;s < series.length;s++)
    {
      if (series[s]['id'] === id)
      {
        break;
      }
    }
    if (s < series.length)
    {
      ser = series[s];
    }
    else
    {
      // for bubble and scatter charts, disable the series legend
      if (chartType === 'bubble' || chartType === 'scatter')
      {
        ser = { 'id' : id, 'name' : name, 'displayInLegend' : 'off', 'items' : [] };
      }
      else
      // for BLA charts initialize the items with 'null' for each group
      {
        for (var i = 0; i < groups.length; i++)
        {
          items[items.length] = null;
        }
        ser = { 'id' : id, 'name' : name, 'displayInLegend' : 'on', 'items' : items };
      }
      series[series.length] = ser;
    }
    return ser;
  }
  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SeriesStyleRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SeriesStyleRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.SeriesStyleRenderer');
   
  SeriesStyleRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SeriesStyleRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT'], 'default' : 'line'};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['pattern'] = {'path' : 'pattern', 'type' : AttributeProcessor['TEXT']};
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['ON_OFF']};
    attrs['markerShape'] = {'path' : 'markerShape', 'type' : AttributeProcessor['TEXT']};  
    attrs['markerColor'] = {'path' : 'markerColor', 'type' : AttributeProcessor['TEXT']};
    attrs['markerSize'] = {'path' : 'markerSize', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['assignedToY2'] = {'path' : 'assignedToY2', 'type' : AttributeProcessor['ON_OFF']};
    // Bug 16757581 - ADD DISPLAYINLEGEND ATTRIBUTE TO PIEDATAITEM AND CHARTSERIESSTYLE
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT']};
    return attrs;
  } 
  /**
   * Update options series with seriesStyleNode data
   */
  SeriesStyleRenderer.prototype.ProcessAttributes = function (options, seriesStyleNode, context)
  {
    // do not apply the style, if 'rendered' is defined and evaluates to false
    if (seriesStyleNode.isAttributeDefined('rendered'))
    {
      if (adf.mf.api.amx.isValueFalse(seriesStyleNode.getAttribute('rendered')))
        return false;
    }
    
    if (!context['__processedSeriesIDs']) 
    {
        context['__processedSeriesIDs'] = {};
    }
    
    // seriesStyle can be matched on seriesId or series, seriesId takes precedence, if present
    var seriesId = null;
    if (seriesStyleNode.isAttributeDefined('seriesId'))
    {
      seriesId = seriesStyleNode.getAttribute('seriesId');
    }
    var seriesName = null;
    if (seriesStyleNode.isAttributeDefined('series'))
    {
      seriesName = seriesStyleNode.getAttribute('series');
    }
    if (!seriesId && !seriesName)
    {
      // no id to match this seriesStyle on, exit
      return false;
    }
    else if (!seriesId)
    {
      seriesId = seriesName;
    }
    
    if (context['__processedSeriesIDs'][seriesId] === true)
    {
      return false;
    }    
    else 
    {
      context['__processedSeriesIDs'][seriesId] = true;
    }

    // find the series item to be updated
    var ser;
    var amxNode = context['amxNode'];
    var SeriesHelper = adf.mf.internal.dvt.chart.SeriesHelper;
    ser = SeriesHelper.getSeriesByIdAndName(this.GetChartType(amxNode), amxNode, seriesId, seriesName);

    return SeriesStyleRenderer.superclass.ProcessAttributes.call(this, ser, seriesStyleNode, context);
  }
  
  SeriesStyleRenderer.prototype.GetChartType = function (amxNode)
  {
    return amxNode["_optionsObj"]["type"];
  }
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var SparkChartRenderer = function ()
  { }
  
  SparkChartRenderer.DEFAULT_HEIGHT = 100;

  adf.mf.internal.dvt.DvtmObject.createSubclass(SparkChartRenderer, 'adf.mf.internal.dvt.chart.DataStampRenderer', 'adf.mf.internal.dvt.chart.SparkChartRenderer');

  SparkChartRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SparkChartRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDataChange'] = {'path' : 'animationOnDataChange', 'type' : AttributeProcessor['TEXT']};
    attrs['animationDuration'] = {'path' : 'styleDefaults/animationDuration', 'type' : AttributeProcessor['INTEGER']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['firstColor'] = {'path' : 'firstColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lastColor'] = {'path' : 'lastColor', 'type' : AttributeProcessor['TEXT']};
    attrs['highColor'] = {'path' : 'highColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lowColor'] = {'path' : 'lowColor', 'type' : AttributeProcessor['TEXT']};
    attrs['baselineScaling'] = {'path' : 'baselineScaling', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  SparkChartRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = SparkChartRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['_self'] = {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']};
        
    return styleClasses; 
  }    
    
  /**
   * Initialize options for spark chart component.
   */
  SparkChartRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    SparkChartRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    amxNode["_optionsObj"] = 
    {
      'titleSeparator' : 
      {
        'rendered' : 'off'
      }
    };
    
    amxNode['_optionsObj']['items'] = [];
    amxNode['_optionsObj']['referenceObjects'] = [];
    
    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
    
    amxNode['_rowKeyCache'] = {};
    amxNode['_stylesResolved'] = false;
  }
  
  SparkChartRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomChartStyle';
  }
  
  SparkChartRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    var currentStyle;
    
    if (!this.IsSkyros())
    {
      currentStyle = DvtJSONUtils.merge(adf.mf.internal.dvt.chart.DefaultSparkChartStyle.SKIN_ALTA, 
                                        adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1);
    }
    else
    {
      return adf.mf.internal.dvt.chart.DefaultSparkChartStyle.VERSION_1;
    }
    return currentStyle;
  }
  
  /**
   * Reset options for spark chart component.
   */
  SparkChartRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    SparkChartRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);
    
    if (attributeChanges.getSize() > 0 || descendentChanges)
    {
      // if 'value' changed, the dataObject must be recreated from scratch
      amxNode['_optionsObj']['items'] = [];
      amxNode['_optionsObj']['referenceObjects'] = [];
     
      amxNode['_rowKeyCache'] = {};
    }
  }
  
    /**
   * processes the components's child tags
   */
  SparkChartRenderer.prototype.GetChildRenderers = function (facetName)
  {
  
    if(this._renderers === undefined)
    {
      this._renderers = 
        {
          'facet' : 
            {
              'dataStamp' :
              {
                'sparkDataItem' : { 'renderer' : new adf.mf.internal.dvt.chart.SparkDataItemRenderer() }
              }              
            },
          'simple' :
            {
              'referenceObject' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer('spark') }
            }
        }
    }
    
    if(facetName)
    {
      return this._renderers['facet'][facetName];
    }
   
    return this._renderers['simple'];
  }
  
  SparkChartRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {    
    // if renderer detects design time mode than it skips standard 
    // child processing and only generates dummy data for graph.         
    if (amx.dtmode)
    {
      this._processSparkDummyData(amxNode);
      return true;
    }
    else 
    {
      return SparkChartRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    }
  }
  
  /**
   * @return supported facet's names
   */
  SparkChartRenderer.prototype.GetFacetNames = function ()
  {
    return ['dataStamp']; 
  }
   
  /**
   * Function creates new instance of DvtSparkChart
   */
  SparkChartRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtSparkChart.newInstance(context, null, null);
    context.getStage().addChild(instance);
    return instance;
  }  
 
  SparkChartRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  SparkChartRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = SparkChartRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
  /**
   * Function renders instance of the component
   */
  SparkChartRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  { 
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
    }
    instance.render(data, width, height);  
  }
  
  
  /**
   *  Instead of parsing value renderer preparse dummy data for spark graph.
   */
  SparkChartRenderer.prototype._processSparkDummyData = function (amxNode)
  {
    if (amxNode["_optionsObj"]['items'] == undefined)
    {
      amxNode["_optionsObj"]['items'] = [];
    }

    // if color is not set than renderer sets default graph type.
    // Renderer also ignores el expressions.
    if (amxNode['_optionsObj']['type'] == undefined || amxNode['_optionsObj']['type'].indexOf("#{") == 0)
    {
      amxNode['_optionsObj']['type'] = adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS['type'];
    }

    // if color is not set than renderer sets default color.
    // Renderer also ignores el expressions.
    if (amxNode['_optionsObj']['color'] == undefined || amxNode['_optionsObj']['color'].indexOf("#{") == 0)
    {
      amxNode['_optionsObj']['color'] = adf.mf.internal.dvt.chart.DEFAULT_SPARK_OPTIONS['color'];
    }

    // renderer prepares data for graph based with default marker setting.
    var items = amxNode["_optionsObj"]['items'];

    var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(amxNode.getTag().getName());
    var dtModeData = definition.getDTModeData();
      
    var iter = adf.mf.api.amx.createIterator(dtModeData);

    while (iter.hasNext())
    {
      var item = 
      {
        'markerDisplayed' : false,
        'rendered' : 'on',
        'value' : iter.next()
      };

      items.push(item);
    }
  }

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'sparkChart', SparkChartRenderer);
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SparkDataItemRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SparkDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.chart.SparkDataItemRenderer');
  
  /**
   * parses the sparkDataItem node attributes
   *
   * sparkDataItem has the following attributes
   *
   *   color            - String(Color): support CSS color values
   *   date             - Number: ms since 1970/1/1
   *   floatValue       - Number: the float value
   *   markerDisplayed  - Boolean: should marker display
   *   rendered         - Boolean: should spark data item render
   *   value            - Number: the spark data item value
   *
   */
  SparkDataItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = SparkDataItemRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['date'] = {'path' : 'date', 'type' : AttributeProcessor['DATETIME']};
    attrs['floatValue'] = {'path' : 'floatValue', 'type' : AttributeProcessor['FLOAT']};
    attrs['markerDisplayed'] = {'path' : 'markerDisplayed', 'type' : AttributeProcessor['ON_OFF']};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['ON_OFF']};  
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
  
    return attrs;
  }
  
  SparkDataItemRenderer.prototype.ProcessAttributes = function (options, sparkItemNode, context)
  {
    var item = {};
    var changed = SparkDataItemRenderer.superclass.ProcessAttributes.call(this, item, sparkItemNode, context);
    if(changed)
    {
      if(item['date'])
      {
        options['timeAxisType'] = 'enabled';    
      }
    }
      
    var itemsPath = (new adf.mf.internal.dvt.util.JSONPath(options, 'items')); 
    var items = itemsPath.getValue();
    if(items === undefined)
    {
      items = [];
      itemsPath.setValue(items);
    }
    items.push(item);
    
    return changed;
  }
})();
(function(){
     
  var IteratorRenderer = function (childRenderers)
  { 
    this._childRenderers = childRenderers;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(IteratorRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.IteratorRenderer');
  
  IteratorRenderer.prototype.GetChildRenderers = function ()
  {
    return this._childRenderers;
  }
  
  IteratorRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    if (!amxNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    
    var value = amxNode.getAttribute('value');
    if(!value)
    {
      return false;
    }
    var change = false;
    var iterator = adf.mf.api.amx.createIterator(value);
    while (iterator.hasNext())
    {
      iterator.next();
      context['_activeRowKey'] = iterator.getRowKey();
      
      change = change | IteratorRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
      
      delete context['_activeRowKey'];
    }
    return change;
  }
  
  IteratorRenderer.prototype.GetChildrenNodes = function (amxNode, context)  
  {
    return amxNode.getChildren(null, context['_activeRowKey']);
  }
  
})();
(function(){
  
  /**
   *  Class representing attribute group configuration. Following configuration is supported:
   *  1. updateCategoriesCallback
   *        Callback used to update categories on an data item. It is then up to the callback to set categories properly on the data item.
   *  2. typeToItemAttributeMapping
   *        Particular attribute group type can be mapped to particular attribute of an data item. Resolved value is assigned to
   *        given attribute on the data item.    
   *  3. typeToDefaultPaletteMapping
   *        Particular attribute group type can be mapped to a default palette. When no value is resolved
   *        for given type then value from given default palette is taken.
   */ 
  var AttributeGroupConfig = function()
  {
    this['updateCategoriesCallback'] = null;
    this['typeToItemAttributeMapping'] = {};
    this['typeToDefaultPaletteMapping'] = {};
    this['updateValuesCallback'] = {};
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeGroupConfig, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig');
  
  /**
   *  Sets callback used for categories update.
   *  @param callback categories update callback     
   */   
  AttributeGroupConfig.prototype.setUpdateCategoriesCallback = function(callback) {
    this['updateCategoriesCallback'] = callback;
  };
  
  /**
   *  Returns callback used for categories update or null if no callback is defined.
   *  @return callback used for categories update or null if no callback is defined     
   */
  AttributeGroupConfig.prototype.getUpdateCategoriesCallback = function() {
    return this['updateCategoriesCallback'];
  };
  
  /**
   *  Adds type to item attribute mapping.
   *  @param type type
   *  @param attribute attribute           
   */  
  AttributeGroupConfig.prototype.addTypeToItemAttributeMapping = function(type, attribute) {
    this['typeToItemAttributeMapping'][type] = attribute;
  };
  
  /**
   *  Returns item attribute for given type or undefined if no item attribute is defined for given type.
   *  @param type type
   *  @return item attribute for given type or undefined if no item attribute is defined for given type        
   */  
  AttributeGroupConfig.prototype.getTypeToItemAttributeMapping = function(type) {
    return this['typeToItemAttributeMapping'][type];
  };
  
  /**
   *  Adds type to default palette mapping.
   *  @param type type
   *  @param defaultPalette default palette           
   */  
  AttributeGroupConfig.prototype.addTypeToDefaultPaletteMapping = function(type, defaultPalette) {
    this['typeToDefaultPaletteMapping'][type] = defaultPalette;
  };
  
  /**
   *  Returns default palette mapping for given type or undefined if no default palette is defined for given type.
   *  @param type type
   *  @param default palette mapping for given type or undefined if no default palette is defined for given type.           
   */
  AttributeGroupConfig.prototype.getTypeToDefaultPaletteMapping = function(type) {
    return this['typeToDefaultPaletteMapping'][type];
  };
  
  /**
   *  Adds callback used to update value for given type.
   *  @param type type
   *  @param callback value update callback           
   */  
  AttributeGroupConfig.prototype.addUpdateValueCallback = function(type, callback) {
    this['updateValuesCallback'][type] = callback;
  };
  
  /**
   *  Returns callback used for value update or null if no callback is defined.
   *  @param type type
   *  @return callback used for value update or null if no callback is defined.           
   */
  AttributeGroupConfig.prototype.getUpdateValueCallback = function(type) {
    return this['updateValuesCallback'][type];
  };
  
})();
(function(){
  
  /**
   *  Sets/updates attribute values.
   *  @param amxNode amx node
   *  @param types types that this resolver supports
   *  @param categories categories
   *  @param attributes attributes
   *  @param rules rules
   *  @param config attribute group configuration                 
   */  
  var AttributeValuesResolver = function(amxNode, types, categories, attributes, rules, config)
  {
    this['types'] = types;
    this['categories'] = categories; 
    this['attributes'] = attributes; 
    this['rules'] = rules;
    this['config'] = config;
    
    this['overrides'] = [];
    this['overridesMap'] = {};
    
    this['defaultPalettes'] = {};
    
    this._initDefaultPaletteOverrides();
    this._initDefaultPalettes(amxNode);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AttributeValuesResolver, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.AttributeValuesResolver'); 
  
  AttributeValuesResolver.TYPE_ATTR = "type";
  AttributeValuesResolver.STYLE_DEFAULTS_PALETTE_ATTR = "styleDefaultsPalette";
  AttributeValuesResolver.PALETTE_ATTR = "palette";
  AttributeValuesResolver.INDEX_ATTR = "categoryIndex";
  AttributeValuesResolver.VALUE_ATTR = "value";
  
  /**
   *  Inits default palettes overrides that are then used in resolveDefaultValue function.  
   */  
  AttributeValuesResolver.prototype._initDefaultPaletteOverrides = function() {
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
     
    var value, match, type, attr, matchRuleGroup, categoryIndex, styleDefaultsPalette, palette, override, defaultsPaletteName;
    var types = this['types'];
    var attrs = this['attributes'].getAttributes();
    var rules = this['rules'];
    
    // RULE - last override wins
    // create override for each attribute
    for(var i=0; i < types.length; i++) {
      type = types[i];
      defaultsPaletteName = this._getDefaultsPaletteName(type);
      
      for(var j=0; j < attrs.length; j++) {
        attr = attrs[j];
        match = new RegExp('^('+type+')(\\d+)$').exec(attr['name']);
        if(match && match.length == 3) { 
          styleDefaultsPalette = DefaultPalettesValueResolver.getStyleDefaultsPalette(defaultsPaletteName);
          palette = DefaultPalettesValueResolver.getDefaultsPalette(defaultsPaletteName);
          value = attr['value'];
          categoryIndex = match[2]-1;
          override = AttributeValuesResolver._createDefaultPaletteOverride(type, styleDefaultsPalette, palette, categoryIndex, value);
          this._processOverride(override);
        }
      }
      
      // create override for match rules - match rules wins over attributes therefore are processed after attributes
      matchRuleInfos = rules.resolveMatchRuleGroupsAndValue(type);
      if(matchRuleInfos && matchRuleInfos.length > 0) {
        for(var k = 0; k < matchRuleInfos.length; k++) {
          matchRuleGroup = matchRuleInfos[k]['group'];
          value = matchRuleInfos[k]['value'];
          categoryIndex = this['categories'].getIndexByValue(matchRuleGroup);
          styleDefaultsPalette = DefaultPalettesValueResolver.getStyleDefaultsPalette(defaultsPaletteName);
          palette = DefaultPalettesValueResolver.getDefaultsPalette(defaultsPaletteName); 
          override = AttributeValuesResolver._createDefaultPaletteOverride(type, styleDefaultsPalette, palette, categoryIndex, value);
          this._processOverride(override);
        }
      }
    };
      
  };
  
  AttributeValuesResolver.prototype._initDefaultPalettes = function(amxNode) {
    var DefaultPalettesValueResolver = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver;
    var types = this['types'];
    
    var type, defaultsPaletteName, palette;
    
    for(var i=0; i < types.length; i++) {
      type = types[i];
      defaultsPaletteName = this._getDefaultsPaletteName(type);
      palette = DefaultPalettesValueResolver.getDefaultsPalette(defaultsPaletteName);
      
      this['defaultPalettes'][type] = amxNode[palette] ? amxNode[palette].slice() : [];
      
      if(this['overridesMap'][type]) {
        for(var indx in this['overridesMap'][type]){
          this['defaultPalettes'][type][indx] = this['overridesMap'][type][indx]; 
        }
      }
    }
  };
  
  /**
   *  Returns defaults palette name for given type.
   *  @param type type
   *  @return default palette name         
   */  
  AttributeValuesResolver.prototype._getDefaultsPaletteName = function(type) {
    if(this['config'] && this['config'].getTypeToDefaultPaletteMapping(type)) {
      return this['config'].getTypeToDefaultPaletteMapping(type);
    }
    return type;
  }
  
  /**
   *  Processes given override. Creates default palettes overrides that are used by other functions.
   *  @param override override        
   */  
  AttributeValuesResolver.prototype._processOverride = function(override) {
    // add override to overrides array and update private mapping - last override wins
    this['overrides'].push(override);
    
    var type = override[AttributeValuesResolver.TYPE_ATTR];
    var categoryIndex = override[AttributeValuesResolver.INDEX_ATTR];
    var value = override[AttributeValuesResolver.VALUE_ATTR];
    
    if(!this['overridesMap'][type]) this['overridesMap'][type] = {};
    this['overridesMap'][type][categoryIndex] = value; 
  };
  
  /**
   *  Resolves value for given type, exception rules and category index.
   *  @param type type
   *  @param exceptionRules exception rules
   *  @param categoryIndex category index
   *  @return resolved value or null value is not defined for given type                  
   */  
  AttributeValuesResolver.prototype.resolveValue = function(type, exceptionRules, categoryIndex)
  {
    var Rules = adf.mf.internal.dvt.common.attributeGroup.Rules;     
    
    // 1. return exception rule value if it exists
    // 2. return default value:
    //    1. match rule value if override exists
    //    2. attribute value if override exists
    //    3. default palette value if it exists
    var value = null;
    if (this['types'].indexOf(type) >= 0)
    {
      if(exceptionRules) {
        value = exceptionRules.resolveValue(type);
      }
      
      if(value == null) {
        value = this.resolveDefaultValue(type, categoryIndex);
      }
    }

    return value;
  };
  
  /**
   *  Resolves and sets values for given legendItem and category index.
   *  @param legendItem legend item
   *  @param categoryIndex category index                  
   */
  AttributeValuesResolver.prototype.resolveLegendValues = function(legendItem, categoryIndex)
  {
    var types = this['types'];
    var type = null;
    var defaultsPaletteName = null;
    for(var i=0; i < types.length; i++) {
      type = types[i];
      defaultsPaletteName = this._getDefaultsPaletteName(type);
      // match rules, attributes and default palettes are taken into consideration
      legendItem[defaultsPaletteName] = this.resolveValue(type, null, categoryIndex);
    }
  };
  
  /**
   *  Resolves default value for given type and category index.
   *  @param type type
   *  @param categoryIndex category index
   *  @return default value or null value is not defined for given type                  
   */  
  AttributeValuesResolver.prototype.resolveDefaultValue = function(type, categoryIndex) {
    var value = null;
    
    var defaults = this['defaultPalettes'][type];          
    if(defaults != undefined && categoryIndex >= 0 && defaults.length > 0) 
    {            
      value = defaults[categoryIndex % defaults.length];
    }
    
    return value;
  };
  
  /**
   *  Returns overriden value for given type and category index.
   *  @param type type
   *  @param categoryIndex category index
   *  @return overriden value or null if no override exists           
   */  
  AttributeValuesResolver.prototype.getOverridenValue = function(type, categoryIndex) {
    if(this['overridesMap'] && this['overridesMap'][type] && this['overridesMap'][type][categoryIndex]){
      return this['overridesMap'][type][categoryIndex];
    }
    return null;
  };
  
  /**
   *  Applies overrides on amx node default palettes.
   *  @param amxNode amx node      
   */  
  AttributeValuesResolver.prototype.applyOverrides = function(amxNode) {
    var overrides = this['overrides'];
    var styleDefaultsPalette, palette, categoryIndex, value;
    for(var i=0; i < overrides.length; i++) {
      styleDefaultsPalette = overrides[i][AttributeValuesResolver.STYLE_DEFAULTS_PALETTE_ATTR];
      palette = overrides[i][AttributeValuesResolver.PALETTE_ATTR];
      categoryIndex = overrides[i][AttributeValuesResolver.INDEX_ATTR];
      value = overrides[i][AttributeValuesResolver.VALUE_ATTR];
      amxNode[palette][categoryIndex] = value;
    }
    if(overrides.length > 0) {
      this._mergePalette(styleDefaultsPalette, palette, amxNode);
    }
  }; 
  
  /**
   *  Merges palette into style defaults palette.
   *  @param styleDefaultsPalette style defaults palette
   *  @param palette palette
   *  @param amxNode amx node           
   */  
  AttributeValuesResolver.prototype._mergePalette = function(styleDefaultsPalette, palette, amxNode) {
    palette = amxNode[palette];
    var styleDefaults = amxNode['_optionsObj']['styleDefaults'];
    if(!styleDefaults) {
      styleDefaults = {};
      amxNode['_optionsObj']['styleDefaults'] = styleDefaults;
    } 
    if(!styleDefaults[styleDefaultsPalette]) styleDefaults[styleDefaultsPalette] = [];
    
    var existing = styleDefaults[styleDefaultsPalette];
    for(var i=0; i < palette.length; i++) {
      existing[i] = palette[i];
    }
  };
  
  /**
   *  Creates and returns default palette override.
   *  @param type type
   *  @param styleDefaultsPalette style defaults palette
   *  @param palette palette
   *  @param categoryIndex category index
   *  @param value value
   *  @return override                       
   */  
  AttributeValuesResolver._createDefaultPaletteOverride = function(type, styleDefaultsPalette, palette, categoryIndex, value) {
    return {
      'type' : type, 
      'styleDefaultsPalette' : styleDefaultsPalette, 
      'palette' : palette, 
      'categoryIndex' : categoryIndex, 
      'value' : value
    };
  };   
    
})();
(function(){
  
  /**
   *  Categories representation.  
   */  
  var Categories = function()
  {
    this['uniqueId'] = 0;
    this['categories'] = [];
    this['categoryToIndexMap'] = {};
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Categories, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Categories'); 
  
  /**
   *  Returns unique id.
   *  @return unique id     
   */  
  Categories.prototype._getUniqueId = function() {
    return this['uniqueId']++;
  };
  
  /**
   *  Returns category by index.
   *  @param index index
   *  @return category by index or null if no category is defined for given index        
   */  
  Categories.prototype.getByIndex = function(index) {
    if(index >= 0 && index < this['categories'].length) {
      return this['categories'][index];
    }
    return null;
  };
  
  /**
   *  Returns category label by index.
   *  @param index index
   *  @return category label by index or null if no category is defined for given index     
   */  
  Categories.prototype.getLabelByIndex = function(index) {
    var category = this.getByIndex(index);
    if(category) {
      return category['label'];
    }
    return null;
  };
  
  /**
   *  Returns category value by index.
   *  @param index index
   *  @return category value by index or null if no category is defined for given index     
   */
  Categories.prototype.getValueByIndex = function(index) {
    var category = this.getByIndex(index);
    if(category) {
      return category['value'];
    }
    return null;
  };
  
  /**
   *  Returns category by value.
   *  @param value value
   *  @return category by value or null if no category is defined for given value     
   */
  Categories.prototype.getByValue = function(value) {
    var index = this.getIndexByValue(value);
    return getByIndex(index);
  };
  
  /**
   *  Returns category index for given category value.
   *  @param value value
   *  @return category index for given category value or -1 if no index is defined for given value     
   */
  Categories.prototype.getIndexByValue = function(value) {
    if(value && this['categoryToIndexMap'][value] >= 0){
      return this['categoryToIndexMap'][value];
    }
    return -1;
  };
  
  /**
   *  Returns category label for given category value.
   *  @param value value
   *  @return category label for given category value or -1 if no category is defined for given value     
   */
  Categories.prototype.getLabelByValue = function(value) {
    var category = this.getByValue(value);
    if(category) {
      return category['label'];
    }
    return null;
  };
  
  /**
   *  Returns true if this categories object contains category with given value and label, otherwise returns false.
   *  @param value value
   *  @param label label   
   *  @return true if this categories object contains category with given value and label, otherwise returns false     
   */
  Categories.prototype.contains = function(value, label) {
    var index = getIndex(value, label);
    if(index != -1) return true;
    return false;
  };
  
  /**
   *  Returns index of category with given value and label or -1 if no such category exists.
   *  @param value value
   *  @param label label   
   *  @return index of category with given value and label or -1 if no such category exists     
   */
  Categories.prototype.getIndex = function(value, label) {
    var index = this.getIndexByValue(value);
    if(index != -1 && this.getLabelByIndex(index) === label) {
      return index;
    }
    return -1;
  };
  
  /**
   *  Returns categories array.
   *  @return category array     
   */  
  Categories.prototype.getCategories = function() {
    return this['categories'];
  };
  
  /**
   *  Adds new category to array of categories and returns index of given category.
   *  @param category category value
   *  @param label category label
   *  @return index of category represented by given params          
   */  
  Categories.prototype.addCategory = function (category, label) {
    var newCategory = null;
    
    var index = this.getIndexByValue(category);
    if(index == -1) {
      if(!category) category = "__"+this._getUniqueId();
      
      newCategory = {};
      newCategory['value'] = category;
      newCategory['label'] = label ? label : category;
      
      this['categories'].push(newCategory);
      
      index = this['categories'].length -1;
      
      this['categoryToIndexMap'][category] = index;
    } 
    
    return index;
  };
    
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.common.attributeGroup');
  
  /**
   *  Converter used to convert RGBA, RGB, 6HEX, 3HEX, keyword colors to following representation:
   *  [R, G, B, A] where, R - red channel value, G - green channel value, B - blue channel value, A - opacity value        
   */  
  var ColorConverter = function() {
    this.converters = [];
    
    // extended colors converter
    this.converters.push(this._createExtColorConverter(regexp, handler));
    
    // RGBA converter
    var regexp = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/;
    var handler = function(matches) {
      return [+matches[1], +matches[2], +matches[3], +matches[4]];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // RGB converter
    regexp = /^rgb\(([\d]+),([\d]+),([\d]+)\)/;
    handler = function(matches) {
      return [+matches[1], +matches[2], +matches[3], 1];
    }
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // 6HEX converter
    regexp = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/;
    handler = function(matches) {
      return [parseInt(matches[1], 16), parseInt(matches[2], 16), parseInt(matches[3], 16), 1];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
    
    // 3HEX converter
    regexp = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/;
    handler = function(matches) {
      return [parseInt(matches[1], 16) * 17, parseInt(matches[2], 16) * 17, parseInt(matches[3], 16) * 17, 1];
    } 
    this.converters.push(this._createRegexpConverter(regexp, handler));
  };
  
  /**
   *  Creates and returns regular expression based color converter.
   *  @param regexp regular expression
   *  @param matchesHandler handler to be called for given regexp exec result
   *  @return converter         
   */     
  ColorConverter.prototype._createRegexpConverter = function(regexp, matchesHandler) {
    var converter = {};
    converter.convert = function(colorStr) {
      var ret = regexp.exec(colorStr);
      if(ret) {
        ret = matchesHandler(ret);
        if(!(Object.prototype.toString.call(ret) === '[object Array]' && ret.length == 4)) {
          ret = null;
        }
      } 
      return ret;
    }
    return converter;
  };
  
  /**
   *  Creates and returns extended color keywords converter.  
   */  
  ColorConverter.prototype._createExtColorConverter = function() {
    // extended color keywords coverage - http://www.w3.org/TR/css3-color/
    extColorMap = {};
    extColorMap['black'] = [0,0,0,1];
    extColorMap['silver'] = [192,192,192,1];
    extColorMap['gray'] = [128,128,128,1];
    extColorMap['white'] = [255,255,255,1];
    extColorMap['maroon'] = [128,0,0,1];
    extColorMap['red'] = [255,0,0,1];
    extColorMap['purple'] = [128,0,128,1];
    extColorMap['fuchsia'] = [255,0,255,1];
    extColorMap['green'] = [0,128,0,1];
    extColorMap['lime'] = [0,255,0,1];
    extColorMap['olive'] = [128,128,0,1];
    extColorMap['yellow'] = [255,255,0,1];
    extColorMap['navy'] = [0,0,128,1];
    extColorMap['blue'] = [0,0,255,1];
    extColorMap['teal'] = [0,128,128,1];
    extColorMap['aqua'] = [0,255,255,1];
    extColorMap['aliceblue'] = [240,248,255,1];
    extColorMap['antiquewhite'] = [250,235,215,1];
    extColorMap['aqua'] = [0,255,255,1];
    extColorMap['aquamarine'] = [127,255,212,1];
    extColorMap['azure'] = [240,255,255,1];
    extColorMap['beige'] = [245,245,220,1];
    extColorMap['bisque'] = [255,228,196,1];
    extColorMap['black'] = [0,0,0,1];
    extColorMap['blanchedalmond'] = [255,235,205,1];
    extColorMap['blue'] = [0,0,255,1];
    extColorMap['blueviolet'] = [138,43,226,1];
    extColorMap['brown'] = [165,42,42,1];
    extColorMap['burlywood'] = [222,184,135,1];
    extColorMap['cadetblue'] = [95,158,160,1];
    extColorMap['chartreuse'] = [127,255,0,1];
    extColorMap['chocolate'] = [210,105,30,1];
    extColorMap['coral'] = [255,127,80,1];
    extColorMap['cornflowerblue'] = [100,149,237,1];
    extColorMap['cornsilk'] = [255,248,220,1];
    extColorMap['crimson'] = [220,20,60,1];
    extColorMap['cyan'] = [0,255,255,1];
    extColorMap['darkblue'] = [0,0,139,1];
    extColorMap['darkcyan'] = [0,139,139,1];
    extColorMap['darkgoldenrod'] = [184,134,11,1];
    extColorMap['darkgray'] = [169,169,169,1];
    extColorMap['darkgreen'] = [0,100,0,1];
    extColorMap['darkgrey'] = [169,169,169,1];
    extColorMap['darkkhaki'] = [189,183,107,1];
    extColorMap['darkmagenta'] = [139,0,139,1];
    extColorMap['darkolivegreen'] = [85,107,47,1];
    extColorMap['darkorange'] = [255,140,0,1];
    extColorMap['darkorchid'] = [153,50,204,1];
    extColorMap['darkred'] = [139,0,0,1];
    extColorMap['darksalmon'] = [233,150,122,1];
    extColorMap['darkseagreen'] = [143,188,143,1];
    extColorMap['darkslateblue'] = [72,61,139,1];
    extColorMap['darkslategray'] = [47,79,79,1];
    extColorMap['darkslategrey'] = [47,79,79,1];
    extColorMap['darkturquoise'] = [0,206,209,1];
    extColorMap['darkviolet'] = [148,0,211,1];
    extColorMap['deeppink'] = [255,20,147,1];
    extColorMap['deepskyblue'] = [0,191,255,1];
    extColorMap['dimgray'] = [105,105,105,1];
    extColorMap['dimgrey'] = [105,105,105,1];
    extColorMap['dodgerblue'] = [30,144,255,1];
    extColorMap['firebrick'] = [178,34,34,1];
    extColorMap['floralwhite'] = [255,250,240,1];
    extColorMap['forestgreen'] = [34,139,34,1];
    extColorMap['fuchsia'] = [255,0,255,1];
    extColorMap['gainsboro'] = [220,220,220,1];
    extColorMap['ghostwhite'] = [248,248,255,1];
    extColorMap['gold'] = [255,215,0,1];
    extColorMap['goldenrod'] = [218,165,32,1];
    extColorMap['gray'] = [128,128,128,1];
    extColorMap['green'] = [0,128,0,1];
    extColorMap['greenyellow'] = [173,255,47,1];
    extColorMap['grey'] = [128,128,128,1];
    extColorMap['honeydew'] = [240,255,240,1];
    extColorMap['hotpink'] = [255,105,180,1];
    extColorMap['indianred'] = [205,92,92,1];
    extColorMap['indigo'] = [75,0,130,1];
    extColorMap['ivory'] = [255,255,240,1];
    extColorMap['khaki'] = [240,230,140,1];
    extColorMap['lavender'] = [230,230,250,1];
    extColorMap['lavenderblush'] = [255,240,245,1];
    extColorMap['lawngreen'] = [124,252,0,1];
    extColorMap['lemonchiffon'] = [255,250,205,1];
    extColorMap['lightblue'] = [173,216,230,1];
    extColorMap['lightcoral'] = [240,128,128,1];
    extColorMap['lightcyan'] = [224,255,255,1];
    extColorMap['lightgoldenrodyellow'] = [250,250,210,1];
    extColorMap['lightgray'] = [211,211,211,1];
    extColorMap['lightgreen'] = [144,238,144,1];
    extColorMap['lightgrey'] = [211,211,211,1];
    extColorMap['lightpink'] = [255,182,193,1];
    extColorMap['lightsalmon'] = [255,160,122,1];
    extColorMap['lightseagreen'] = [32,178,170,1];
    extColorMap['lightskyblue'] = [135,206,250,1];
    extColorMap['lightslategray'] = [119,136,153,1];
    extColorMap['lightslategrey'] = [119,136,153,1];
    extColorMap['lightsteelblue'] = [176,196,222,1];
    extColorMap['lightyellow'] = [255,255,224,1];
    extColorMap['lime'] = [0,255,0,1];
    extColorMap['limegreen'] = [50,205,50,1];
    extColorMap['linen'] = [250,240,230,1];
    extColorMap['magenta'] = [255,0,255,1];
    extColorMap['maroon'] = [128,0,0,1];
    extColorMap['mediumaquamarine'] = [102,205,170,1];
    extColorMap['mediumblue'] = [0,0,205,1];
    extColorMap['mediumorchid'] = [186,85,211,1];
    extColorMap['mediumpurple'] = [147,112,219,1];
    extColorMap['mediumseagreen'] = [60,179,113,1];
    extColorMap['mediumslateblue'] = [123,104,238,1];
    extColorMap['mediumspringgreen'] = [0,250,154,1];
    extColorMap['mediumturquoise'] = [72,209,204,1];
    extColorMap['mediumvioletred'] = [199,21,133,1];
    extColorMap['midnightblue'] = [25,25,112,1];
    extColorMap['mintcream'] = [245,255,250,1];
    extColorMap['mistyrose'] = [255,228,225,1];
    extColorMap['moccasin'] = [255,228,181,1];
    extColorMap['navajowhite'] = [255,222,173,1];
    extColorMap['navy'] = [0,0,128,1];
    extColorMap['oldlace'] = [253,245,230,1];
    extColorMap['olive'] = [128,128,0,1];
    extColorMap['olivedrab'] = [107,142,35,1];
    extColorMap['orange'] = [255,165,0,1];
    extColorMap['orangered'] = [255,69,0,1];
    extColorMap['orchid'] = [218,112,214,1];
    extColorMap['palegoldenrod'] = [238,232,170,1];
    extColorMap['palegreen'] = [152,251,152,1];
    extColorMap['paleturquoise'] = [175,238,238,1];
    extColorMap['palevioletred'] = [219,112,147,1];
    extColorMap['papayawhip'] = [255,239,213,1];
    extColorMap['peachpuff'] = [255,218,185,1];
    extColorMap['peru'] = [205,133,63,1];
    extColorMap['pink'] = [255,192,203,1];
    extColorMap['plum'] = [221,160,221,1];
    extColorMap['powderblue'] = [176,224,230,1];
    extColorMap['purple'] = [128,0,128,1];
    extColorMap['red'] = [255,0,0,1];
    extColorMap['rosybrown'] = [188,143,143,1];
    extColorMap['royalblue'] = [65,105,225,1];
    extColorMap['saddlebrown'] = [139,69,19,1];
    extColorMap['salmon'] = [250,128,114,1];
    extColorMap['sandybrown'] = [244,164,96,1];
    extColorMap['seagreen'] = [46,139,87,1];
    extColorMap['seashell'] = [255,245,238,1];
    extColorMap['sienna'] = [160,82,45,1];
    extColorMap['silver'] = [192,192,192,1];
    extColorMap['skyblue'] = [135,206,235,1];
    extColorMap['slateblue'] = [106,90,205,1];
    extColorMap['slategray'] = [112,128,144,1];
    extColorMap['slategrey'] = [112,128,144,1];
    extColorMap['snow'] = [255,250,250,1];
    extColorMap['springgreen'] = [0,255,127,1];
    extColorMap['steelblue'] = [70,130,180,1];
    extColorMap['tan'] = [210,180,140,1];
    extColorMap['teal'] = [0,128,128,1];
    extColorMap['thistle'] = [216,191,216,1];
    extColorMap['tomato'] = [255,99,71,1];
    extColorMap['turquoise'] = [64,224,208,1];
    extColorMap['violet'] = [238,130,238,1];
    extColorMap['wheat'] = [245,222,179,1];
    extColorMap['white'] = [255,255,255,1];
    extColorMap['whitesmoke'] = [245,245,245,1];
    extColorMap['yellow'] = [255,255,0,1];
    extColorMap['yellowgreen'] = [154,205,50,1];
    
    var converter = {};
    converter.convert = function(colorStr) {
      var color = extColorMap[colorStr];
      return color;
    };
    
    return converter; 
  }
  
  /**
   *  Converts given array of colors to array of [R, G, B, A] representations.
   *  @param array of supported colors
   *  @return array of [R, G, B, A] representations        
   */  
  ColorConverter.prototype.convertArrayToRGBA = function(colors) {
    if(!colors || colors.length == 0) return colors;
    
    var ret = [];
    for(var i=0; i<colors.length; i++) {
      ret.push(this.convertToRGBA(colors[i]));
    }
    return ret;
  };
  
  /**
   *  Converts given color to its [R, G, B, A] representation.
   *  @param colorStr supported color string
   *  @return [R, G, B, A] representation for given color        
   */  
  ColorConverter.prototype.convertToRGBA = function(colorStr) {
    colorStr = colorStr.replace(/\s/g, '');
    var ret = null;
    for(var i=0; i<this.converters.length; i++) {
      ret = this.converters[i].convert(colorStr);
      if(ret) {
        return ret;
      }
    }
    return null;
  };
  
  adf.mf.internal.dvt.common.attributeGroup.ColorConverter = new ColorConverter();
  
})();
(function(){
  
  /**
   * Continuous attribute group implementation.  
   */  
  var ContinuousAttributeGroup = function()
  {
    adf.mf.internal.dvt.common.attributeGroup.AttributeGroup.apply(this);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ContinuousAttributeGroup, 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup', 'adf.mf.internal.dvt.common.attributeGroup.ContinuousAttributeGroup');
  
  /**
   *  See parent for comment.  
   */  
  ContinuousAttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    ContinuousAttributeGroup.superclass.Init.call(this, amxNode, attrGroupsNode);
    this['attributeType'] = 'continuous';
    
    var attr = attrGroupsNode.getAttribute('maxLabel');
    if(attr) this['maxLabel'] = attr;
    attr = attrGroupsNode.getAttribute('maxValue');
    if(attr) this['maxValue'] = attr;
    attr = attrGroupsNode.getAttribute('minLabel');
    if(attr) this['minLabel'] = attr;
    attr = attrGroupsNode.getAttribute('minValue');
    if(attr) this['minValue'] = attr; 
    if(this['minValue']) this['minValue'] = +this['minValue'];
    if(this['maxValue']) this['maxValue'] = +this['maxValue'];
    this['updateMinValue'] = this['minValue'] ? false : true; 
    this['updateMaxValue'] = this['maxValue'] ? false : true; 
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.SetType = function (attrGroupsNode) {
    var color = 'color';
    this['type'] = color;
    this['types'] = [color];
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.configure = function (amxNode, attributeGroupConfig) {
    ContinuousAttributeGroup.superclass.configure.call(this, amxNode, attributeGroupConfig);  
    if(!this['minLabel']) this['minLabel'] = this['minValue'];
    if(!this['maxLabel']) this['maxLabel'] = this['maxValue'];
    var colors = this._getRangeColors(amxNode);
    this._initColorMappings(colors);
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.processItem = function (attrGroupsNode) {
    var processedInfo = ContinuousAttributeGroup.superclass.processItem.call(this, attrGroupsNode);
    
    var value = +processedInfo['value'];
    this._updateMinMaxValues(value);
    
    return processedInfo;
  };
  
  ContinuousAttributeGroup.prototype._updateMinMaxValues = function(value) {
    if(this['updateMinValue'] && (!this['minValue'] || value < this['minValue'])) this['minValue'] = value;
    if(this['updateMaxValue'] && (!this['maxValue'] || value > this['maxValue'])) this['maxValue'] = value; 
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.ProcessItemValue = function(attrGroupsNode) {
    return attrGroupsNode.getAttribute('value');
  };
  
  /**
   *  See parent for comment.  
   */
  ContinuousAttributeGroup.prototype.isContinuous = function() {
    return true;
  };
  
  ContinuousAttributeGroup.prototype._getRangeColors = function(amxNode) {
    var colors = [];
    var value = null;
    var maxIndex = this._getColorAttributeMaxIndex();
    
    // we need at least 2 colors
    if(maxIndex < 2) maxIndex = 2;
    for(var i=0; i < maxIndex; i++) {
      value = this['attributeValuesResolver'].resolveDefaultValue('color', i);
      colors.push(value);
    }
    return adf.mf.internal.dvt.common.attributeGroup.ColorConverter.convertArrayToRGBA(colors);
  };
  
  ContinuousAttributeGroup.prototype._getColorAttributeMaxIndex = function() {
    var attrs = this['attributes'].getAttributes();
    var maxIndex = -1;
    for(var i=0; i < attrs.length; i++) {
      var vals = /^\s*color([\d]+)\s*/.exec((attrs[i]['name']));
      if(vals && vals.length == 2 && ( (maxIndex == null) || (+vals[1] > maxIndex) )) {
        maxIndex = +vals[1];
      }
    }
    return maxIndex;
  };
  
  /**
   *  Creates mapping of values to colors.
   *  @param colors array of colors
   *  @param minValue min value
   *  @param maxValue max value           
   */  
  ContinuousAttributeGroup.prototype._initColorMappings = function(colors) {
    this['colors'] = colors;
    var minValue = this['minValue'], maxValue = this['maxValue'];
    
    this['mappings'] = [];
    var diff = (maxValue - minValue) / (colors.length - 1);
    
    // map every color to particular value
    // first color will be mapped to min value
    // last color will be mapped to max value
    var mapping = null, tmpVal = null;
    for(var i=0; i<colors.length; i++) {
      if(i==0){
        tmpVal = minValue;
      } else if (i==(colors.length - 1)) {
        tmpVal = maxValue;
      } else {
        tmpVal = tmpVal + diff;
      }
      mapping = {"value": tmpVal, "color": colors[i]};
      this['mappings'].push(mapping);
    }
  };
  
  ContinuousAttributeGroup.prototype._getRangeMappings = function(value) {
    var i;
    var mappings = this['mappings'];
    var mapping = null, rangeMappings = [];
    if(value <= this['minValue']) {
      mapping = mappings[0];
    } else if(value >= this['maxValue']) {
      mapping = mappings[mappings.length-1];
    } else {
      for(i=0; i<mappings.length; i++) {
        if(value == mappings[i].value) {
          mapping = mappings[i];
          break;
        }
      }
    }
    
    if(mapping != null) {
      rangeMappings.push(mapping);
    } else {
      for(i=0; i<mappings.length; i++) {
        if(value > mappings[i].value && value < mappings[i + 1].value) {
          rangeMappings.push(mappings[i]);
          rangeMappings.push(mappings[i+1]);
          break;
        }
      }
    }
    
    return rangeMappings;
  };
  
  /**
   *  See parent for comment.  
   */  
  ContinuousAttributeGroup.prototype.ResolveValue = function(type, appliedRules, value) {
    var resolved = appliedRules.resolveValue(type);
    
    if(resolved == null) {
      resolved = this._getColor(value);
    }
    
    return resolved;
  };
  
  /**
   *  Return css rgba color for given value.
   *  @param value value
   *  @return css rgba color for given value        
   */  
  ContinuousAttributeGroup.prototype._getColor = function(value) {
    value = +value;
    var range = this._getRangeMappings(value);
    var red = null;
    var green = null;
    var blue = null;
    var opacity = null;
    if(range.length == 1) {
      // exact match
      var col = range[0].color;
      red = col[0];
      green = col[1];
      blue = col[2];
      opacity = col[3];
    } else {
      var startCol = range[0].color;
      var startVal = range[0].value;
      var endCol = range[1].color;
      var endVal = range[1].value;
      var absStartVal = Math.abs(startVal);
      var absEndVal = Math.abs(endVal);
      var absVal = Math.abs(value);
      
      var percent = null, tmpCol = null;
      if(absStartVal > absEndVal) {
        tmpCol = startCol;
        startCol = endCol;
        endCol = tmpCol;
        percent =  (absVal - absEndVal) / (absStartVal - absEndVal);
      } else { 
        percent =  (absVal - absStartVal) / (absEndVal - absStartVal);
      }
      red = startCol[0] + parseInt(percent * (endCol[0] - startCol[0]));
      green = startCol[1] + parseInt(percent * (endCol[1] - startCol[1]));
      blue = startCol[2] + parseInt(percent * (endCol[2] - startCol[2]));
      opacity = startCol[3] + (percent * (endCol[3] - startCol[3]));
    }
    return this._toRGBAColor([red, green, blue, opacity]);
  };
  
  ContinuousAttributeGroup.prototype._toRGBAColor = function(arr) {
    return "rgba("+arr[0]+", "+ arr[1]+", "+ arr[2]+ ", " + arr[3]+")";
  };
  
  /**
   *  See parrent for comment.  
   */  
  ContinuousAttributeGroup.prototype.getDescription = function() {
    var obj = ContinuousAttributeGroup.superclass.getDescription.call(this);
    obj['min'] = this['minValue'];
    obj['max'] = this['maxValue'];
    obj['minLabel'] = this['minLabel'];
    obj['maxLabel'] = this['maxLabel'];
    obj['colors'] = [];
    for(var i=0; i < this['colors'].length; i++){
      obj['colors'].push(this._toRGBAColor(this['colors'][i]));
    }
    obj['attributeType'] = 'continuous';
    return obj;
  };

})();
 (function(){
  
  /**
   *  Class representing data item configuration. Following configuration is supported:
   *  1. typeDefaultValue
   *          Default value for given type can be set. When no value is resolved for given type then this default value is set to an data item.              
   */ 
  var DataItemConfig = function()
  {
    this['defaultValues'] = {};
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DataItemConfig, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.DataItemConfig');
  
  /**
   *  Adds type default value.
   *  @param type type
   *  @param defaultValue default value        
   */   
  DataItemConfig.prototype.addTypeDefaultValue = function(type, defaultValue) {
    this['defaultValues'][type] = defaultValue;
  };
  
  /**
   *  Returns default value for given type or undefined if no value is defined.
   *  @param type type
   *  @return default value for given type or undefined if no value is defined.        
   */
  DataItemConfig.prototype.getTypeDefaultValue = function(type) {
    return this['defaultValues'][type];
  };
  
  /**
   *  Returns array of types for which default value is defined or empty array if no override exists.
   *  @return array of types for which default value is defined or empty array if no override exists.        
   */
  DataItemConfig.prototype.getDefaultValueTypes = function() {
    var types = [];
    for(var prop in this['defaultValues']) {
      types.push(prop);
    }
    return types;
  };
  
})();
(function(){
  
  /**
   *  Default palettes values resolver. Currently supported palettes are shape, pattern and color.  
   */  
  var DefaultPalettesValueResolver = function()
  {
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DefaultPalettesValueResolver, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver');
  
  DefaultPalettesValueResolver.SHAPE = 'shape';
  DefaultPalettesValueResolver.PATTERN = 'pattern';
  DefaultPalettesValueResolver.COLOR = 'color'; 
  
  /**
   *  Returns defaults palette for given type. Returned value can be used to access defaults palette on amx nodes. 
   *  @param type type (supported types are shape, pattern, color)
   *  @return defaults palette name        
   */  
  DefaultPalettesValueResolver.getDefaultsPalette = function (type) {
    var defaultsPalette = null;
    switch (type)
    {
      case DefaultPalettesValueResolver.SHAPE:
        defaultsPalette = '_defaultShapes';
        break;
      case DefaultPalettesValueResolver.COLOR:
        defaultsPalette = '_defaultColors';
        break;
      case DefaultPalettesValueResolver.PATTERN:
        defaultsPalette = '_defaultPatterns';
        break;
      default:
        defaultsPalette = '_' + type;
    }
    return defaultsPalette;
  }; 
  
  /**
   *  Returns style defaults palette name for given type. Returned value can be used to access defaults palette on style defaults objects.
   *  @param type type (supported types are shape, pattern, color)
   *  @return style defaults palette name     
   */  
  DefaultPalettesValueResolver.getStyleDefaultsPalette = function (type) {
    var defaultsPalette = null;
    switch (type)
    {
      case DefaultPalettesValueResolver.SHAPE:
        defaultsPalette = 'shapes';
        break;
      case DefaultPalettesValueResolver.COLOR:
        defaultsPalette = 'colors';
        break;
      case DefaultPalettesValueResolver.PATTERN:
        defaultsPalette = 'patterns';
        break;
      default:
        defaultsPalette = null;
    }
    return defaultsPalette;
  };
  
  /**
   *  Returns value found on given index in defaults palette for given type.
   *  @param amxNode amx node
   *  @param type type
   *  @param index index in default palette for given type
   *  @return value found on given index in defaults palette for given type               
   */  
  DefaultPalettesValueResolver.resolveValue = function(amxNode, type, index) {
    var value = null;
    var defaults = null;
    var defaultsPalette = DefaultPalettesValueResolver.getDefaultsPalette(type);

    if(defaultsPalette && amxNode[defaultsPalette])
    {
      defaults = amxNode[defaultsPalette];          
      if(defaults != undefined && index >= 0 && defaults.length > 0) 
      {            
        value = defaults[index % defaults.length];
      }
    }
    
    return value;
  };
    
})();
(function(){
  
  /**
   *  Discrete attribute group.  
   */  
  var DiscreteAttributeGroup = function()
  {
    adf.mf.internal.dvt.common.attributeGroup.AttributeGroup.apply(this);
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DiscreteAttributeGroup, 'adf.mf.internal.dvt.common.attributeGroup.AttributeGroup', 'adf.mf.internal.dvt.common.attributeGroup.DiscreteAttributeGroup');
  
  DiscreteAttributeGroup.prototype.Init = function (amxNode, attrGroupsNode)
  {
    DiscreteAttributeGroup.superclass.Init.call(this, amxNode, attrGroupsNode);
    this['attributeType'] = 'discrete';
  };
  
  DiscreteAttributeGroup.prototype.getDescription = function() {
    var obj = DiscreteAttributeGroup.superclass.getDescription.call(this);
    obj['attributeType'] = 'discrete';
    return obj;
  };

})();
(function(){
  
  /**
   *  Class representing legend items. To every category and exception rule corresponds one legend item.
   *  @param types types
   *  @param categories categories
   *  @param exceptionRules exception rules
   *  @param attributeValuesResolver attribute values resolver                 
   */  
  var LegendItems = function(types, categories, exceptionRules, attributeValuesResolver)
  {
    this['types'] = types;
    this['categories'] = categories;
    this['exceptionRules'] = exceptionRules; 
    this['attributeValuesResolver'] = attributeValuesResolver;
    
    this['items'] = [];
    this._createItems();
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendItems, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.LegendItems'); 
  
  /**
   *  Creates legend items array.    
   */  
  LegendItems.prototype._createItems = function () {
    var categories = this['categories'].getCategories();
    var category, legendItem, exceptionRule;
    
    // create item for every category
    for(var i=0; i < categories.length; i++) {
      category = categories[i];
      
      legendItem = {};
      legendItem['id'] = category['value'];
      legendItem['label'] = category['label'];
      
      this['attributeValuesResolver'].resolveLegendValues(legendItem, i);
      
      this['items'].push(legendItem);
    }
    
    // create item for every exception rule
    var rules = this['exceptionRules'].getRules();
    for(var j=0; j < rules.length; j++) {
      exceptionRule = rules[j];
      
      legendItem = {};
      legendItem['id'] = exceptionRule['value'];
      legendItem['label'] = exceptionRule['label'];
      
      exceptionRule['attributes'].applyAttributes(legendItem); 
      
      this['items'].push(legendItem);
    }
  };
  
  /**
   *  Returns array of legend items. Each legend item has following form:
   *  {
   *    'id' : id,
   *    'label': label,
   *    'supported type' : type value,
   *    ...
   *    'supported type' : type value                  
   *  }     
   */  
  LegendItems.prototype.getItems = function () {
    return this['items']; 
  }; 
    
})();
(function(){
  
  var Attributes = adf.mf.internal.dvt.common.attributeGroup.Attributes;
  
  /**
   *  Class representing a set of attribute group rules. There does exist 2 types of rules: match rule and exception rule.        
   */  
  var Rules = function(rules, types)
  {
    this['rules'] = rules ? rules : [];
    this['types'] = types ? types : [];
    
    this['uniqueId'] = 0;
  };
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(Rules, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.attributeGroup.Rules');
  
  /**
   *  Match rule type constant.  
   */  
  Rules.RULE_TYPE_MATCH = 'match';
  /**
   *  Exception rule type constant.  
   */ 
  Rules.RULE_TYPE_EXCEPTION = 'exception';
  
  
  /**
   *  Processes particular instance of attribute groups node and creates representation of each rule it does contain (when it does not exist yet).
   *  @param attrGroupsNode attribute groups node   
   *  @return array of applied rules indeces  
   */  
  Rules.prototype.processItemRules = function(attrGroupsNode) {
    var children = attrGroupsNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(children);
    var child = null;
    var rendered;

    var appliedRules = [], rule;
    while (iter.hasNext())
    {
      child = iter.next();
      rendered = child.getAttribute('rendered');
      if(!(rendered == false || rendered == 'false') && child.getTag().getName() == 'attributeMatchRule' || child.getTag().getName() == 'attributeExceptionRule') {
        rule = this._processRule(child, attrGroupsNode);
        if(rule && rule['attributes'].size() > 0) {
          var index = this._addRule(rule, attrGroupsNode);
          appliedRules.push(index);
        }
      }
    }
    return appliedRules;
  };
  
  /**
   *  Returns rules by their indices. Type (of returned rules) can be restricted using optional ruleType parameter.
   *  This method returns instance of Rules class.   
   *  @param indices array of rule indices
   *  @param ruleType rule type
   *  @return rules in the form of Rules class instance            
   */  
  Rules.prototype.getByIndices = function(indices, ruleType) {
    var rules = [];
    var rule;
    if(indices) {
      for(var i=0; i < indices.length; i++) {
        rule = this['rules'][indices[i]];
        if(ruleType) {
          if(rule['type'] === ruleType) {
            rules.push(rule);
          }
        } else {
          rules.push(rule);
        }
      }
    }
    return new Rules(rules, this['types']); 
  };
  
  /**
   *  Returns rules of given ruleType. Type (of returned rules) can be restricted using ruleType parameter.
   *  This method returns instance of Rules class.
   *  @param ruleType rule type
   *  @return rules in the form of Rules class instance            
   */  
  Rules.prototype.filter = function(ruleType) {
    var rules = [];
    var rule;
    for(var i = 0; i < this['rules'].length; i++) {
      rule = this['rules'][i];
      if(ruleType) {
        if(rule['type'] === ruleType) {
          rules.push(rule);
        }
      } else {
        rules.push(rule);
      }
    }
    return new Rules(rules, this['types']);
  };
  
  /**
   *  Returns array of rules represented by this instance.
   *  Exception rules have following structure:
   *  {
   *    'type' : Rules.RULE_TYPE_EXCEPTION, 
   *    'label' : 'Rule label',
   *    'attributes' : Attributes class instance,
   *    'value' : Unique string representing this rule            
   *  }
   *  
   *  Match rules have following structure:
   *  {
   *    'type' : Rules.RULE_TYPE_MATCH, 
   *    'group' : 'match rule group'   
   *    'attributes' : Attributes class instance           
   *  }       
   *  
   *  @param ruleType rule type            
   *  @return array of rules.     
   */  
  Rules.prototype.getRules = function(ruleType) {
    return this['rules'];
  };
  
  /**
   *  Resolves type (e.g. color, pattern) value for the set of rules represented by this Rules class instance.
   *  When ruleType param is passed then only rules of given type are taken into consideration.   
   *  @param type type to be resolved (e.g. color, pattern)   
   *  @param ruleType rule type 
   *  @return value for given type or null if no value is specified for given type        
   */  
  Rules.prototype.resolveValue = function(type, ruleType) {
    // exception rules wins -> make their indices last (preserve order)
    rules = Rules._sort(this['rules']);
    var rule, attributes, value;
    for(var i = rules.length-1; i >= 0; i--) {
      rule = rules[i];
      if(ruleType && !rule['type'] === ruleType){
        continue;
      }
      attributes = rule['attributes'];
      value = attributes.resolveValue(type);
      if(value) {
        return value;
      }
    }
    return null;
  };
  
  /**
   *  Returns groups and value of last match rule for which given type (e.g. color, pattern) is defined (i.e. match rule that overrides given type).  
   *  @param type type to be resolved (e.g. color, pattern)  
   *  @return array of groups and their values for given type        
   */  
  Rules.prototype.resolveMatchRuleGroupsAndValue = function(type) {
    var rules = this['rules'];
    var info = {};
    for(var i = 0; i < rules.length; i++) {
      rule = rules[i];
      if(rule['type'] == Rules.RULE_TYPE_MATCH) {
        attributes = rule['attributes'];
        value = attributes.resolveValue(type);
        if(value) {
          info[rule['group']] = value;
        }
      }
    }
    var ret = [];
    for(var k in info) {
      ret.push({'group' : k, 'value' : info[k]});
    }
    return ret;
  };
  
  /**
   *  For given attribute groups node and rule node returns newly created rule object. 
   *  @param ruleNode rule node
   *  @param attrGroupsNode attribute groups node     
   *  @return rule object    
   */ 
  Rules.prototype._processRule = function (ruleNode, attrGroupsNode) {
    var rule, attributes;
    if(ruleNode.getTag().getName() == 'attributeMatchRule') {
      if(attrGroupsNode.getAttribute('value') == ruleNode.getAttribute('group')) {
        attributes = new Attributes(this['types']);
        attributes.processAttributes(ruleNode, attrGroupsNode);
        
        rule = {};
        rule['type'] = Rules.RULE_TYPE_MATCH;
        rule['group'] = ruleNode.getAttribute('group');
        rule['attributes'] = attributes;
        return rule; 
      }
    } else {
      if(ruleNode.getAttribute('condition') == "true" || ruleNode.getAttribute('condition') == true) {
        attributes = new Attributes(this['types']);
        attributes.processAttributes(ruleNode, attrGroupsNode);
        
        rule = {};
        rule['type'] = Rules.RULE_TYPE_EXCEPTION;
        rule['label'] = ruleNode.getAttribute('label');
        rule['attributes'] = attributes;
        
        return rule;
      }
    }
    return null;
  };
  
  /**
   *  Adds given rule to the rules array if it hasn't been added already.
   *  Returns rule index in the array of all rules.       
   *  @param rule rule object
   *  @param attrGroupsNode attribute groups node     
   *  @return rule index    
   */ 
  Rules.prototype._addRule = function (rule, attrGroupsNode) {
    // add only unique rule
    var rules = this['rules'];
    for(var i=0; i < rules.length; i++) {
      if(Rules.equals(rules[i], rule)) {
        return i;
      }
    }
    if(rule['type'] == Rules.RULE_TYPE_EXCEPTION) {
      this._setExceptionRuleValue(rule, attrGroupsNode);
    }
    rules.push(rule);
    return rules.length - 1;
  };
  
  /**
   *  Sets unique identifier to a 'value' attribute of given exception rule.  
   *  @param rule rule object
   *  @param attrGroupsNode attribute groups node     
   */ 
  Rules.prototype._setExceptionRuleValue = function(rule, attrGroupsNode) {
    if(!attrGroupsNode['_exceptionRuleValues']) attrGroupsNode['_exceptionRuleValues'] = {};
    var existingValues = attrGroupsNode['_exceptionRuleValues'];
    
    var label = rule['label'];
    if(label) {
      if(existingValues[label]) {
        label = label + this['uniqueId']++;
      }
    } else {
      label = this['uniqueId']++; 
    }
    existingValues[label] = {};
    rule['value'] = label;  
  };
  
  /**
   *  Sorts rules so that match rules precede exception rules (preserves match/excepton rules order).  
   *  @param rules rules
   *  @return sorted rules     
   */ 
  Rules._sort = function (rules) {
    var sorted = [];
    for(i=0; i < rules.length; i++) {
      if(rules[i]['type'] == Rules.RULE_TYPE_MATCH) {
        sorted.push(rules[i]);
      }
    }
    for(i=0; i < rules.length; i++) {
      if(rules[i]['type'] != Rules.RULE_TYPE_MATCH) {
        sorted.push(rules[i]);
      }
    }
    return sorted;
  };
  
  /**
   *  Returns true if rule1 equals rule2, otherwise returns false.
   *  @param rule1 first rule
   *  @param rule2 second rule      
   *  @return true if rule1 equals rule2, otherwise returns false    
   */  
  Rules.equals = function (rule1, rule2)
  {
    if(rule1 === rule2) return true;
    if(!rule1 || !rule2) return false;
    
    if(rule1['type'] != rule2['type']) return false;
    if(rule1['group'] != rule2['group']) return false;
    if(rule1['label'] != rule2['label']) return false;
    
    return Attributes.equals(rule1['attributes'], rule2['attributes']);
  };
    
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
    
  var AxisLineRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AxisLineRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.AxisLineRenderer');
  
  AxisLineRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = AxisLineRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['lineColor'] = {'path' : 'axisLine/lineColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'axisLine/lineWidth', 'type' : AttributeProcessor['INTEGER']};    
    attrs['rendered'] = {'path' : 'axisLine/rendered', 'type' : AttributeProcessor['ON_OFF']};
    
    return attrs;
  }
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var AXIS_TYPE = 
    {
      'X' : 'xAxis',
      'Y' : 'yAxis',
      'Y2' : 'y2Axis'
    } 
    
  /**
   * processes the node representing the axis tag
   *
   * @param amxNode  the current amxNode
   * @param axisNode amxNode representing the axis tag
   * @param axisId   the axis name (xAxis, yAxis, or y2Axis)
   */
  var AxisRenderer = function (axisType)
  { 
    if(AXIS_TYPE[axisType] === undefined)
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('AxisType[' + axisType + '] not supported!');
    }
    this._axisType = AXIS_TYPE[axisType];
  } 
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AxisRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.AxisRenderer');
           
  /**
   * processes the components's child tags
   */
  AxisRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceObject' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer() },
        'referenceLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineRenderer() },
        'referenceArea' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceAreaRenderer() },
        'tickLabel' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickLabelRenderer(this._axisType === AXIS_TYPE['X']), 'maxOccurrences' : 1 },
        'axisLine' : { 'renderer' : new adf.mf.internal.dvt.common.axis.AxisLineRenderer(), 'maxOccurrences' : 1 },
        'majorTick' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickRenderer(true), 'maxOccurrences' : 1 },
        'minorTick' : { 'renderer' : new adf.mf.internal.dvt.common.axis.TickRenderer(false), 'maxOccurrences' : 1 }
      };
    }
    return this._renderers;
  } 
  
  AxisRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = AxisRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};
    attrs['axisMinValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};    
    attrs['axisMaxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['dataMinValue'] = {'path' : 'dataMin', 'type' : AttributeProcessor['FLOAT']};    
    attrs['dataMaxValue'] = {'path' : 'dataMax', 'type' : AttributeProcessor['FLOAT']};
    attrs['majorIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['FLOAT']};
    attrs['minorIncrement'] = {'path' : 'minorStep', 'type' : AttributeProcessor['FLOAT']};
    attrs['minimumIncrement'] = {'path' : 'minStep', 'type' : AttributeProcessor['FLOAT']};
    attrs['scaledFromBaseline'] = {'path' : 'baselineScaling', 'type' : AttributeProcessor['TEXT']};
    if (this._axisType === AXIS_TYPE['X'])
    {
      attrs['timeRangeMode'] = {'path' : 'timeRangeMode', 'type' : AttributeProcessor['TEXT']};
    }
    if (this._axisType === AXIS_TYPE['Y2'])
    {
      attrs['alignTickMarks'] = {'path' : 'alignTickMarks', 'type' : AttributeProcessor['ON_OFF']};
    }
    if (this._axisType === AXIS_TYPE['X'])
    {
      attrs['viewportStartGroup'] = {'path' : 'viewportStartGroup', 'type' : AttributeProcessor['TEXT']};
      attrs['viewportEndGroup'] = {'path' : 'viewportEndGroup', 'type' : AttributeProcessor['TEXT']};
    }
    if (this._axisType === AXIS_TYPE['X'] || this._axisType === AXIS_TYPE['Y'])
    {
      attrs['viewportMinValue'] = {'path' : 'viewportMin', 'type' : AttributeProcessor['TEXT']};
      attrs['viewportMaxValue'] = {'path' : 'viewportMax', 'type' : AttributeProcessor['TEXT']};
    }
    
    return attrs;
  }
  
  AxisRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  { 
    options[this._axisType] = options[this._axisType] ? options[this._axisType] : {};
    
    var changed = AxisRenderer.superclass.ProcessAttributes.call(this, options[this._axisType], amxNode, context);
    
    // for time axis, convert viewport limits to timestamps
    if (this._axisType === AXIS_TYPE['X'] && (context['timeAxisType'] == 'enabled' || context['timeAxisType'] == 'mixedFrequency'))
    {
      if (options[this._axisType]['viewportMin'])
      {
        options[this._axisType]['viewportMin'] = AttributeProcessor['DATETIME'](options[this._axisType]['viewportMin']);
      }
      if (options[this._axisType]['viewportMax'])
      {
        options[this._axisType]['viewportMax'] = AttributeProcessor['DATETIME'](options[this._axisType]['viewportMax']);
      }
    }
    
    return changed;
  }
  
  AxisRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    options[this._axisType] = options[this._axisType] ? options[this._axisType] : {};
    
    AxisRenderer.superclass.ProcessChildren.call(this, options[this._axisType], amxNode, context);
  }
})();
(function(){
   
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var ReferenceAreaItemRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceAreaItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceAreaItemRenderer');
  
  ReferenceAreaItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceAreaItemRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }
  
  ReferenceAreaItemRenderer.prototype.ProcessAttributes = function (options, referenceAreaNode, context)
  {
    options['items'] = options['items'] ? options['items'] : [];
    
    var item = {};
    ReferenceAreaItemRenderer.superclass.ProcessAttributes.call(this, item, referenceAreaNode, context);
    
    options['items'].push(item);
  }
})();
(function(){
   
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var ReferenceAreaRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceAreaRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceAreaRenderer');
  
  ReferenceAreaRenderer.prototype.GetChildRenderers = function ()
  {
     if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceAreaItem' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceAreaItemRenderer() }
      };
      
      this._renderers['iterator'] = { 'renderer' : new adf.mf.internal.dvt.common.IteratorRenderer(this._renderers), 'maxOccurrences' : 1 };
    }
    return this._renderers;
  }
  
  /**
   * parses the referenceArea node attributes
   *
   * referenceArea has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference line
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference line
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceAreaRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceAreaRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
   
  ReferenceAreaRenderer.prototype.ProcessAttributes = function (options, referenceAreaNode, context)
  {
    options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];
    
    var refObj = 
    {
      'type' : 'area'
    };

    if (!referenceAreaNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    
    ReferenceAreaRenderer.superclass.ProcessAttributes.call(this, refObj, referenceAreaNode, context);
    
    context['__activeRefOBJ'] = refObj;
  }
  
  ReferenceAreaRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    var refObj = context['__activeRefOBJ'];
    delete context['__activeRefOBJ'];
     
    ReferenceAreaRenderer.superclass.ProcessChildren.call(this, refObj, amxNode, context);
    
    options['referenceObjects'].push(refObj);
  }

})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
     
  var ReferenceLineItemRenderer = function ()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceLineItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceLineItemRenderer');
  
  ReferenceLineItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceLineItemRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['x'] = {'path' : 'x', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }
  
  ReferenceLineItemRenderer.prototype.ProcessAttributes = function (options, referenceLineNode, context)
  {
    options['items'] = options['items'] ? options['items'] : [];
    
    var item = {};
    ReferenceLineItemRenderer.superclass.ProcessAttributes.call(this, item, referenceLineNode, context);
    
    options['items'].push(item);
  }
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var ReferenceLineRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceLineRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceLineRenderer');
  
  ReferenceLineRenderer.prototype.GetChildRenderers = function ()
  {
     if(this._renderers === undefined)
    {
      this._renderers = 
      {
        'referenceLineItem' : { 'renderer' : new adf.mf.internal.dvt.common.axis.ReferenceLineItemRenderer() }
      };
      
      this._renderers['iterator'] = { 'renderer' : new adf.mf.internal.dvt.common.IteratorRenderer(this._renderers), 'maxOccurrences' : 1 };
    }
    return this._renderers;
  }
  
  /**
   * parses the referenceLine node attributes
   *
   * referenceLine has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference line
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference line
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceLineRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceLineRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  }
   
  ReferenceLineRenderer.prototype.ProcessAttributes = function (options, referenceLineNode, context)
  {
    //options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];

    var refObj = 
    {
      'type' : 'line'
    };

    if (!referenceLineNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
    }
    
    ReferenceLineRenderer.superclass.ProcessAttributes.call(this, refObj, referenceLineNode, context);
    
    context['__activeRefOBJ'] = refObj;
  }
  
  ReferenceLineRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  { 
    var refObj = context['__activeRefOBJ'];
    delete context['__activeRefOBJ'];

    // see if we got the array property name to populate, use 'referenceObjects' as default 
    var refObjPropertyName = context['__refObjPropertyName'];
    if (!refObjPropertyName)
      refObjPropertyName ='referenceObjects';

    // initialize the referenceObjects array
    if (options[refObjPropertyName] === undefined)
      options[refObjPropertyName] = [];
    
    ReferenceLineRenderer.superclass.ProcessChildren.call(this, refObj, amxNode, context);
    
    options[refObjPropertyName].push(refObj);
  }

})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
    
  var ReferenceObjectRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ReferenceObjectRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.ReferenceObjectRenderer');
  
  /**
   * parses the referenceObject node attributes
   *
   * referenceObject has the following attributes
   *
   *   text       - String: tooltip and legend text for this reference object
   *   type       - String: line, area
   *   location   - String: front, back
   *   color      - String(Color): support CSS color values
   *   lineWidth  - Number
   *   lineStyle  - String
   *   lineValue  - Number
   *   lowValue   - Number
   *   highValue  - Number
   *   shortDesc   - String: custom tooltip for this reference object
   *   displayInLegend  - String: on/off - legend item should be added for this ref obj
   *
   */
  ReferenceObjectRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ReferenceObjectRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['type'] = {'path' : 'type', 'type' : AttributeProcessor['TEXT']};
    attrs['location'] = {'path' : 'location', 'type' : AttributeProcessor['TEXT']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['lineStyle'] = {'path' : 'lineStyle', 'type' : AttributeProcessor['TEXT']};
    attrs['lineValue'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT']};
    attrs['lowValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT']};
    attrs['highValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};
    attrs['displayInLegend'] = {'path' : 'displayInLegend', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  ReferenceObjectRenderer.prototype.ProcessAttributes = function (options, referenceObjNode, context)
  {  
    options['referenceObjects'] = options['referenceObjects'] ? options['referenceObjects'] : [];
    
    var refObj = {};
    
    var changed = ReferenceObjectRenderer.superclass.ProcessAttributes.call(this, refObj, referenceObjNode, context);

    options['referenceObjects'].push(refObj);
    
    return changed;
  }
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
 
  var TickLabelRenderer = function(xAxis, metric)
  {
    this._isXAxis = xAxis;
    this._isMetric = metric;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TickLabelRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.TickLabelRenderer');
  
  /** parses tickLabel node attributes
   *
   *  tickLabel has the following attributes:
   *
   *  autoPrecision     - String: on, off
   *  rendered          - Boolean: true if the tickLabel should be rendered
   *  scaling           - String: auto, none, thousand, million, billion, trillion, quadrillion
   *  style             - String: font related CSS attributes
   *
   */
  TickLabelRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TickLabelRenderer.superclass.GetAttributesDefinition.call(this);
   
    attrs['autoPrecision'] = {'path' : 'autoPrecision', 'type' : AttributeProcessor['TEXT']};
    attrs['scaling'] = {'path' : 'scaling', 'type' : AttributeProcessor['TEXT']};
    attrs['labelStyle'] = {'path' : 'style', 'type' : AttributeProcessor['TEXT']};
    attrs['rendered'] = {'path' : 'rendered', 'type' : AttributeProcessor['ON_OFF'], 'default' : 'on'};
    
    if (this._isMetric === true)
    {
      attrs['textType'] = {'path' : 'textType', 'type' : AttributeProcessor['TEXT'], 'default' : 'number'};
    }
    
    if (this._isXAxis === true) 
    {
      attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT']};
    }
    
    return attrs;
  }
  /**
   *  converter         - Object: numberConverter or dateTimeConverter 
   */
  TickLabelRenderer.prototype.ProcessAttributes = function (options, labelNode, context)
  {
    var root = this._isMetric === true ? 'metricLabel' : 'tickLabel';    
    options[root] = options[root] ? options[root] : {};
    
    var changed = TickLabelRenderer.superclass.ProcessAttributes.call(this, options[root], labelNode, context);
    
    // if amx:convertNumber or amx:convertDateTime is used as a child tag of the tickLabel,
    // then the labelNode would have a converter object
    // we pass that converter to js chart API
    // TODO: check this
    var converter = labelNode.getConverter();
    if (converter)
    {
      changed = true;
      options[root]['converter'] = converter;     
    }
    
    return changed;
  }  
})();  
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;

  var TickRenderer = function(majorTick)
  {
    this._majorTick = majorTick;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TickRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.axis.TickRenderer');
  
  /**
   * processes major/minorTick node attributes
   *
   * tick has the following attributes:
   *
   * lineColor      - String(Color): support CSS color values
   * lineWidth      - Number: e.g. 1
   * rendered       - Boolean: true if the tick should be rendered
   *                  default true for major, false for minor ticks
   */
  TickRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TickRenderer.superclass.GetAttributesDefinition.call(this);
    
    var root = this._majorTick === true ? 'majorTick/' : 'minorTick/';
    
    attrs['lineColor'] = {'path' : root + 'lineColor', 'type' : AttributeProcessor['TEXT']};
    attrs['lineWidth'] = {'path' : root + 'lineWidth', 'type' : AttributeProcessor['INTEGER']};
    attrs['rendered'] = {'path' : root + 'rendered', 'type' : AttributeProcessor['ON_OFF']};
   
    return attrs;
  }  
})();
(function(){
  
  var FORMAT_TYPE = 
  {
    'X' : 'x',
    'Y' : 'y',
    'Y2' : 'y2',
    'Z' : 'z',
    'PIE' : 'value',
    '*' : '*'
  } 

  /**
   * Format renderer
   * 
   * Handles rendering of the old (now deprecated) xFormat, yFormat, etc. tags.
   * The new dvtm:chartFormatRenderer is handled by the ValueFormatRenderer class.
   */
  var FormatRenderer = function(formatType)
  { 
    if(FORMAT_TYPE[formatType] === undefined)
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('FormatType[' + formatType + '] not supported!');
    }
    this._formatType = FORMAT_TYPE[formatType];
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(FormatRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.format.FormatRenderer');
  
  
  FormatRenderer.prototype.ProcessAttributes = function (options, childAmxNode, context)
  {
    var type;
    var converter;
    
    if (this._formatType == '*')
    {
      // new style -- get the type from the chartValueFormat attribute
      type = childAmxNode.getAttribute('type');
    }
    else
    {
      // get type for the old format tags (xFormat, yFormat, etc.)
      type = this._formatType;
    }
    // get the converter object
    converter = childAmxNode.getConverter();
    // if no type or converter attributes defined, do nothing
    if (type && converter)
    {
      // store the new valueFormat properties into the options/valueFormats array
      var path = new adf.mf.internal.dvt.util.JSONPath(options, 'valueFormats');
      var item = { 'type' : type, 'converter' : converter };
      var valueFormats = path.getValue();
      // if there's no valueFormats array yet, create it
      if (valueFormats === undefined)
      {
        valueFormats = [];
      }
      // add the new valueFormat object
      valueFormats.push(item);
      path.setValue(valueFormats);
      return true;
    }
    // options not modified
    return false;
  }

})();
/**
 * @deprecated
 * Bug 17198668 - deprecate pie slicelabel tag
 * Bug 17198620 - uptake chart json api changes for slicelabel
 * sliceLabel is deprecated now, use attributes in pieChart like sliceLabelPosition, sliceLabelType, sliceLabelStyle
 */
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
  
  var SliceLabelFormatRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SliceLabelFormatRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.format.SliceLabelFormatRenderer');
  
  /**
  * textType processor replaces deprecated value 'value' with value 'number' 
  */
  var SliceLabelTextTypeAttributeProcessor = function (value)
  {
    var result = AttributeProcessor['TEXT'](value);

    if (result === 'value')
    {
      result = 'number';
    }

    return result;
  }

   /** parses sliceLabel node attributes
   *  sliceLabel has the following attributes:
   *
   *  position        - String: none, inside, outside
   *  style           - String: accepts font related CSS attributes
   *  textType        - String: text, value, percent, textAndPercent
   *  //scaling         - String: auto, none, thousand, million, billion, trillion, quadrillion
   *  //autoPrecision   - String: on (default), off
   */
  SliceLabelFormatRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SliceLabelFormatRenderer.superclass.GetAttributesDefinition.call(this);
        
    var root = 'styleDefaults';
      attrs['position'] = {'path' : root + '/sliceLabelPosition', 'type' : AttributeProcessor['TEXT']}; 
      attrs['textType'] = {'path' : root + '/sliceLabelType', 'type' : SliceLabelTextTypeAttributeProcessor};
    
    return attrs;
  }
  
  /** 
   *  converter       - Object: numberConverter
   */
  SliceLabelFormatRenderer.prototype.ProcessAttributes = function (options, sliceLabelNode, context)
  {
    var changed = SliceLabelFormatRenderer.superclass.ProcessAttributes.call(this, options, sliceLabelNode, context);
    
    var converter = sliceLabelNode.getConverter();
    if (converter)
    {  
      (new adf.mf.internal.dvt.util.JSONPath(options, 'styleDefaults/sliceLabel/converter')).setValue(converter);     
      return true;
    }
    return changed;
  }  
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var AreaDataLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaDataLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaDataLayerRenderer');

  AreaDataLayerRenderer.prototype.ProcessAttributes = function (options, areaDataLayerNode, context)
  {
    var amxNode = context['amxNode'];
    if (areaDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(areaDataLayerNode.getAttribute('rendered')))
      return;

    if (!areaDataLayerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }
    var data = amxNode["_optionsObj"];
    var dataLayer = {};

    var areaLayerNode = areaDataLayerNode.getParent();

    dataLayer['associatedLayer'] = areaLayerNode.getAttribute('layer');
    for (var i = 0; i < data['areaLayers'].length; i++) 
    {
      if (data['areaLayers'][i]['layer'] === dataLayer['associatedLayer']) 
      {
        data = data['areaLayers'][i];
        break;
      }
    }
    
    if (data === amxNode["_optionsObj"])
    {
      throw new adf.mf.internal.dvt.exception.DvtmException('Area layer "' + areaLayerNode.getAttribute('layer') + '" was not found!');
    }
    if (areaDataLayerNode.getId() !== undefined)
      dataLayer['id'] = areaDataLayerNode.getId();

    if (areaDataLayerNode.isAttributeDefined('animationDuration'))
      dataLayer['animationDuration'] = areaDataLayerNode.getAttribute('animationDuration');

    if (areaDataLayerNode.isAttributeDefined('animationOnDataChange'))
      dataLayer['animationOnDataChange'] = areaDataLayerNode.getAttribute('animationOnDataChange');

    if (areaDataLayerNode.isAttributeDefined('disclosedItems'))
      dataLayer['disclosedItems'] = areaDataLayerNode.getAttribute('disclosedItems');

    if (areaDataLayerNode.isAttributeDefined('isolatedRowKey'))
      dataLayer['isolatedItem'] = areaDataLayerNode.getAttribute('isolatedRowKey');

    if (areaDataLayerNode.isAttributeDefined('selectedRowKeys'))
    {
      dataLayer['selectedItems'] = AttributeProcessor['ROWKEYARRAY'](areaDataLayerNode.getAttribute('selectedRowKeys'));
    }
    if (areaDataLayerNode.isAttributeDefined('dataSelection'))
      dataLayer['selection'] = areaDataLayerNode.getAttribute('dataSelection');

    if (areaDataLayerNode.getTag().getAttribute('selectionListener'))
    {
      var selectionListenerCache = amxNode['_selectionListenerCache'];
      if (selectionListenerCache[areaDataLayerNode.getId()] === undefined) {
        selectionListenerCache[areaDataLayerNode.getId()] = areaDataLayerNode.getAttributeExpression('selectionListener');
      }
    }

    if (areaDataLayerNode.isAttributeDefined('emptyText'))
      dataLayer['emptyText'] = areaDataLayerNode.getAttribute('emptyText');

    AttributeGroupManager.init(context);
    
    // process stamped children
    var varName = areaDataLayerNode.getAttribute("var");
    dataLayer['areas'] = [];
    dataLayer['markers'] = [];
    
    // amxNode.value is the array of "stamps"
    var value = areaDataLayerNode.getAttribute('value');
    if(value)
    {
      // collection is available so iterate through data and process each areaLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext())
      {
        var stamp = iter.next();
        var children = areaDataLayerNode.getChildren(null, iter.getRowKey());
        // set context variable for child tag processing
        adf.mf.el.addVariable(varName, stamp);
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext()) {
          var areaLocNode = iter2.next();
          var rowKey = iter.getRowKey();
          // process each location node
          adf.mf.internal.dvt.processAreaLocation(amxNode, dataLayer, areaLocNode, rowKey, context);
        }
        // remove context variable
        adf.mf.el.removeVariable(varName);
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = areaDataLayerNode.getChildren();
      var tagIterator = adf.mf.api.amx.createIterator(tagChildren);
      while (tagIterator.hasNext()) {
        var tagAreaLocNode = tagIterator.next();
        var tagAreaRowKey = "" + (tagIterator.getRowKey() + 1);
        // process each location node
        adf.mf.internal.dvt.processAreaLocation(amxNode, dataLayer, tagAreaLocNode, tagAreaRowKey, context);
      }
    }
    data['areaDataLayer'] = dataLayer;
    
    AttributeGroupManager.applyAttributeGroups(amxNode, null, context);
    
    return false;
  }

  AreaDataLayerRenderer.prototype.ProcessChildren = function (options, areaDataLayerNode, context)
  {
    if (areaDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(areaDataLayerNode.getAttribute('rendered')))
      return;

    return AreaDataLayerRenderer.superclass.ProcessChildren.call(this, options, areaDataLayerNode, context);
  }

  adf.mf.internal.dvt.processAreaLocation = function(amxNode, dataLayer, areaLocNode, rowKey, context)
  {
    if (areaLocNode.getTag().getName() !== 'areaLocation')
      return;

    if (!areaLocNode.isAttributeDefined('rendered') || adf.mf.api.amx.isValueTrue(areaLocNode.getAttribute('rendered')))
    {
      var areaLocChildren = areaLocNode.getChildren();
      for (var i=0; i<areaLocChildren.length; i++) {
        var childData = {};
        childData['location'] = areaLocNode.getAttribute('name');
        //childData['type'] = areaLocChildren[i].getTag().getName()
        childData['id'] = rowKey;
        adf.mf.internal.dvt.processThematicMapDataItem(amxNode, childData, areaLocChildren[i], context);
        if (areaLocChildren[i].getTag().getName() === 'area') {
          dataLayer['areas'].push(childData);
        } else 
        {
          dataLayer['markers'].push(childData);
        }
      }
    }
  }
})();
(function(){

  var AreaLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLayerRenderer');

  /**
   * processes the components's child tags
   */
  AreaLayerRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      this._renderers =
        {
          'areaDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaDataLayerRenderer() },
          // deprecated case
          'pointDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.PointDataLayerRenderer() }
        };
    }

    return this._renderers;
  }

  AreaLayerRenderer.prototype.ProcessAttributes = function (options, layerNode, context)
  {
    var amxNode = context['amxNode'];
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;

    if (!layerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }

    adf.mf.internal.dvt.setThematicMapLayerProperties('area', amxNode, layerNode);
    return true;
  }

  AreaLayerRenderer.prototype.ProcessChildren = function (options, layerNode, context)
  {
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;

    return AreaLayerRenderer.superclass.ProcessChildren.call(this, options, layerNode, context);
  }

   /**
   * Sets the thematic map properties found on the amxNode
   */
  adf.mf.internal.dvt.setThematicMapLayerProperties = function(type, amxNode, layerNode)
  {
    var options = amxNode["_optionsObj"];
    if (!options['areaLayers'])
      options['areaLayers'] = [];
    var layer = {'labelDisplay': 'auto', 'labelType': 'short'};
    adf.mf.internal.dvt.setOptionsDirty(amxNode, true);

    if (layerNode.isAttributeDefined('layer'))
    {
      layer['layer'] = layerNode.getAttribute('layer');
      // load resource and base map layer
      if (!options['source'])
        adf.mf.internal.dvt.loadMapLayerAndResource(options['basemap'], layer['layer']);
    }
    else
    {
      layer['layer'] = 'cities';
      layer['type'] = 'point';
      return;
    }

//    if (type)
//      layer['type'] = type;
    if (layerNode.isAttributeDefined('areaLabelDisplay'))
      layer['labelDisplay'] = layerNode.getAttribute('areaLabelDisplay');

    if (layerNode.isAttributeDefined('labelStyle'))
      layer['labelStyle'] = layerNode.getAttribute('labelStyle');

    if (layerNode.isAttributeDefined('labelType'))
      layer['labelType'] = layerNode.getAttribute('labelType');

//    if (layerNode.isAttributeDefined('animationDuration'))
//      layer['animationDuration'] = layerNode.getAttribute('animationDuration');

    if (layerNode.isAttributeDefined('animationOnLayerChange'))
      layer['animationOnLayerChange'] = layerNode.getAttribute('animationOnLayerChange');

    if (layerNode.isAttributeDefined('areaStyle'))
      layer['areaStyle'] = layerNode.getAttribute('areaStyle');
      
    options['areaLayers'].push(layer);
  }
})();
(function(){
  
  var AreaLayerRendererDT = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLayerRendererDT, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLayerRendererDT');
  
  AreaLayerRendererDT.prototype.ProcessAttributes = function (options, layerNode, context)
  {
    var layer = {};
    
    layer['type'] = "area";    
    layer['layer'] = 'continents'; 
    if(layerNode)
    {
      layer['layer'] = this._nullIfEl(layerNode.getAttribute('layer'));
    }    
    if(!layer['layer'])
    {
      layer['layer'] = this._getDTModeTopLayer(options['basemap']);
    }
    
    if (!options['areaLayers'])
    {
      options['areaLayers'] = [];
    }
  
    // load resource and base map layer 
    adf.mf.internal.dvt.loadMapLayerAndResource(options['basemap'], layer['layer']); 
    options['areaLayers'].push(layer);
    return false;
  }    
    
  /**
   * functions check if value is EL expression. If so then it returns
   * null value.
   */
  AreaLayerRendererDT.prototype._nullIfEl = function(value)
  {
    if(!value || value == null || value.indexOf("#{") > -1) 
    {
      return null;
    }
    return value;
  }
  
  /**
   * function determines default top layer for given basemap.
   */
  AreaLayerRendererDT.prototype._getDTModeTopLayer = function(baseMap)
  {  
    var topLayer = adf.mf.internal.dvt.thematicmap.THEMATICMAP_DEFAULT_TOP_LAYER_MAPPING[baseMap];
    if(topLayer) 
    {
       return topLayer;
    }
    return null;    
  }
})();
(function(){
  
  var AreaLocationRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(AreaLocationRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.AreaLocationRenderer');
  
  AreaLocationRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    return false;
  }  
})();
(function(){  

  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  var DataLayerRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(DataLayerRenderer, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.common.layer.DataLayerRenderer');
 
  DataLayerRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    return this._createDataLayerChildrenNodes(amxNode);
  }
  
  DataLayerRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    return this._visitDataLayerChildrenNodes(amxNode, visitContext, callback);
  }
  
  DataLayerRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    return this._updateDataLayerChildrenNodes(amxNode, attributeChanges);
  }
  
  DataLayerRenderer.prototype.isFlattenable = function (amxNode)
  {
    return true;
  }
  
  DataLayerRenderer.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    if (this._isDirectChildOfGeographicMap(amxNode))
    {
      return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
    }
    else
    {
      return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
    }
  }
  
  DataLayerRenderer.prototype.render = function (amxNode)
  {
    // create div
    var contentDiv = DOMUtils.createDIV();
    // set up basic div's attributes
    var id = amxNode.getId();
    DOMUtils.writeIDAttribute(contentDiv, id);

    return contentDiv;
  }
  
  DataLayerRenderer.prototype.refresh = function (amxNode, attributeChanges, descendentChanges)
  {
    var mapAmxNode = amxNode.getParent();
    var mapNodeTypeHandler = mapAmxNode.getTypeHandler();
    if (mapNodeTypeHandler && mapNodeTypeHandler.refresh)
    {
      mapNodeTypeHandler.refresh(mapAmxNode, attributeChanges, descendentChanges);
    }
  }  
  
  // END OF THE AMX INTERFACE
  
  /**
   * Create a data layer's children AMX nodes
   */
  DataLayerRenderer.prototype._createDataLayerChildrenNodes = function (amxNode)
  {
    // create a cache of rowKeys to be removed in case of model update
    amxNode['_currentRowKeys'] = [];

    var dataItems = amxNode.getAttribute("value");
    if (dataItems === undefined)
    {      
      if(amxNode.isAttributeDefined("value")) {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }
      // value attribute is not defined and we are in no collection mode
      // expect that childTags has attributes set independently on collection
      var children = amxNode.getTag().getChildren();
      for (var i = 0; i < children.length; i++)
      {
        var childAmxNode = children[i].buildAmxNode(amxNode);   
        amxNode['_currentRowKeys'].push("" + (i + 1)); 
        amxNode.addChild(childAmxNode);
      }    
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
      return true;
    }
    else if (dataItems == null)
    {
      // No items, nothing to do
      return true;
    }
    var varName = amxNode.getAttribute('var');
    var iter = adf.mf.api.amx.createIterator(dataItems);
    
    // copied from amx:listView - on refresh the component need to initiate
    // loading of rows not available in the cache
    if (iter.getTotalCount() > iter.getAvailableCount())
    {
      adf.mf.api.amx.showLoadingIndicator();
      //var currIndex = dataItems.getCurrentIndex();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0,  -1, function ()
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
      function ()
      {
        adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return true;
    }
    
    while (iter.hasNext())
    {
      var item = iter.next();
      amxNode['_currentRowKeys'].push(iter.getRowKey());
      adf.mf.el.addVariable(varName, item);
      amxNode.createStampedChildren(iter.getRowKey(), null);
      adf.mf.el.removeVariable(varName);
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  }

  /**
   * Visits a data layer's children nodes
   */
  DataLayerRenderer.prototype._visitDataLayerChildrenNodes = function (amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    if(dataItems === undefined && !amxNode.isAttributeDefined("value")) 
    {
      // visit child nodes in no collection mode since there is no value specified      
      var children = amxNode.getChildren();
      for (var i = 0;i < children.length;i++)
      {
        if (children[i].visit(visitContext, callback))
        {
          return true;
        }
      }
      return false;
    }
    
    var iter = adf.mf.api.amx.createIterator(dataItems);
    var variableName = amxNode.getAttribute("var");

    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.addVariable(variableName, item);
      try 
      {
        if (amxNode.visitStampedChildren(iter.getRowKey(), null, null, visitContext, callback))
          return true;
      }
      finally 
      {
        adf.mf.el.removeVariable(variableName);
      }
    }
    return false;
  }

  /**
   * Update a data layer's children nodes
   */
  DataLayerRenderer.prototype._updateDataLayerChildrenNodes = function (amxNode, attributeChanges)
  {
    if (attributeChanges.hasChanged("value"))
    {
      // remove the old stamped children
      var children;
      var i, j;
      var iter;

      // create the new stamped children hierarchy
      var dataItems = amxNode.getAttribute("value");
      if (dataItems)
      {
        iter = adf.mf.api.amx.createIterator(dataItems);

        // copied from amx:listView - on refresh the component need to initiate
        // loading of rows not available in the cache
        if (iter.getTotalCount() > iter.getAvailableCount())
        {
          adf.mf.api.amx.showLoadingIndicator();
          //var currIndex = dataItems.getCurrentIndex();
          adf.mf.api.amx.bulkLoadProviders(dataItems, 0,  -1, function ()
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
          function ()
          {
            adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "updateChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
            adf.mf.api.amx.hideLoadingIndicator();
          });
          return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
        }
      }
      
      if (amxNode["_currentRowKeys"] !== undefined)
      {
        for (i = 0;i < amxNode["_currentRowKeys"].length;i++)
        {
          children = amxNode.getChildren(null, amxNode["_currentRowKeys"][i]);
          for (j = children.length - 1; j >= 0; j--) 
          {
            amxNode.removeChild(children[j]);  
          }          
        }
      }

      amxNode["_currentRowKeys"] = [];

      if (dataItems)
      {
        var varName = amxNode.getAttribute("var");
        iter = adf.mf.api.amx.createIterator(dataItems);
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), null);
          adf.mf.el.removeVariable(varName);
        }
      }
    }

    // for geographicMap dataLayers, enable refresh, otherwise rerender the component
    if (this._isDirectChildOfGeographicMap(amxNode))
    {
      if (attributeChanges.hasChanged("selectedRowKeys"))
      {   
        var parent = amxNode.getParent();
        if (parent)
        {
          delete parent['_currentSelection']; 
        }
      }
      return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
    } else {
      return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
    }
  }

  /**
   * Finds the data layer node under the current amxNode by 'id'
   *
   * @param amxNode  parent amxNode
   * @param id  data layer node id
   * @return amxNode of the data layer node or null if not found
   */
  adf.mf.internal.dvt.findDataLayerNodeById = function (amxNode, id)
  {
    var children = amxNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(children);
    var child;

    while (iter.hasNext())
    {
      child = iter.next();
      if (child.getId() === id)
        return child;
    }

    // nothing found at this level, go deeper
    iter = adf.mf.api.amx.createIterator(children);
    while (iter.hasNext())
    {
      child = iter.next();
      var result = adf.mf.internal.dvt.findDataLayerNodeById(child, id);
      if (result)
        return result;
    }
    // nothing found, return null
    return null;

  }

  /**
   * Finds the data layer id under the current amxNode's data object by layer 'index'
   *
   * @param amxNode  parent amxNode
   * @param dataLayerIdx  data layer node index
   * @return id of the data layer or null if not found
   */
  adf.mf.internal.dvt.findDataLayerIdByIndex = function (amxNode, dataLayerIdx)
  {
    if (amxNode != null && dataLayerIdx != null)
    {
      var data = amxNode["_dataObj"];
      var layers = data['dataLayers'];
      if (layers)
      {
        for (var i = 0;i < layers.length;i++)
        {
          var layer = layers[i];
          if (layer.idx === dataLayerIdx)
          {
            return layer.id;
          }
        }
      }
    }
    // nothing found, return null
    return null;
  }
  
  /**
   * Checks if the dataLayer node is a direct child of geographicMap
   * 
   * @param amxNode dataLayer amxNode
   * @return true if amxNode is direct child of geographicMap, false otherwise
   */
  DataLayerRenderer.prototype._isDirectChildOfGeographicMap = function (amxNode) 
  {
    var parent = amxNode.getParent();
    if (parent && parent.getTag().getName() === 'geographicMap')
      return true;
    return false;
  }
    
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'areaDataLayer', DataLayerRenderer);
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'pointDataLayer', DataLayerRenderer); 
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var PointDataLayerRenderer = function()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(PointDataLayerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.PointDataLayerRenderer');

  PointDataLayerRenderer.prototype.ProcessAttributes = function (options, pointDataLayerNode, context)
  {
    var amxNode = context['amxNode'];
    if (pointDataLayerNode.isAttributeDefined('rendered')
        && adf.mf.api.amx.isValueFalse(pointDataLayerNode.getAttribute('rendered')))
      return false;

    if (!pointDataLayerNode.isReadyToRender())
    {
      throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
    }

    var data = amxNode["_optionsObj"];
    var loadCityLayer = false;
    var dataLayer = {};

    var parentNode = pointDataLayerNode.getParent();

    if(parentNode.getTag().getName() === 'areaLayer')
    {
      dataLayer['associatedWith'] = parentNode.getAttribute('layer');
      for (var i = 0; i < data['areaLayers'].length; i++) 
      {
        if (data['areaLayers'][i]['layer'] === dataLayer['associatedWith']) 
        {
          data = data['areaLayers'][i];
          break;
        }
      }
      if (data === amxNode["_optionsObj"])
      {
        throw new adf.mf.internal.dvt.exception.DvtmException('Area layer "' + areaLayerNode.getAttribute('layer') + '" was not found!');
      }
    }
    else
    {
      adf.mf.internal.dvt.setThematicMapLayerProperties('point', amxNode, pointDataLayerNode);
    }
    dataLayer['associatedLayer'] = 'cities';

    if (pointDataLayerNode.getId() !== undefined)
      dataLayer['id'] = pointDataLayerNode.getId();

    if (pointDataLayerNode.isAttributeDefined('animationDuration'))
      dataLayer['animationDuration'] = pointDataLayerNode.getAttribute('animationDuration');

    if (pointDataLayerNode.isAttributeDefined('animationOnDataChange'))
      dataLayer['animationOnDataChange'] = pointDataLayerNode.getAttribute('animationOnDataChange');

    if (pointDataLayerNode.isAttributeDefined('selectedRowKeys'))
    {  
      dataLayer['selectedItems'] = AttributeProcessor['ROWKEYARRAY'](pointDataLayerNode.getAttribute('selectedRowKeys'));
    }
    if (pointDataLayerNode.isAttributeDefined('dataSelection'))
      dataLayer['selection'] = pointDataLayerNode.getAttribute('dataSelection');

    if (pointDataLayerNode.getTag().getAttribute('selectionListener'))
    {
      var selectionListenerCache = amxNode['_selectionListenerCache'];
      if (selectionListenerCache[pointDataLayerNode.getId()] === undefined)
      {
        selectionListenerCache[pointDataLayerNode.getId()] = pointDataLayerNode.getAttributeExpression('selectionListener');
      }
    }

    if (pointDataLayerNode.isAttributeDefined('emptyText'))
      dataLayer['emptyText'] = pointDataLayerNode.getAttribute('emptyText');

    AttributeGroupManager.init(context);
    
    // process stamped children
    var varName = pointDataLayerNode.getAttribute("var");
    dataLayer['markers'] = [];
    // amxNode.value is the array of "stamps"
    var value = pointDataLayerNode.getAttribute('value');
    if(value)
    {
      // collection is available so iterate through data and process each pointLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext()) {
        var stamp = iter.next();
        var children = pointDataLayerNode.getChildren(null, iter.getRowKey());
        // set context variable for child tag processing
        adf.mf.el.addVariable(varName, stamp);
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext()) {
          var pointLocNode = iter2.next();
          var rowKey = iter.getRowKey();
          // process each location node
          loadCityLayer = loadCityLayer | adf.mf.internal.dvt._processPointLocationNode(amxNode, dataLayer, pointLocNode, rowKey, context)
        }
        // remove context variable
        adf.mf.el.removeVariable(varName);
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = pointDataLayerNode.getChildren();
      var tagChildrenIterator = adf.mf.api.amx.createIterator(tagChildren);

      while (tagChildrenIterator.hasNext()) {
        var tagPointLocNode = tagChildrenIterator.next();
        var tagChildrenRowKey = "" + (tagChildrenIterator.getRowKey() + 1);
        // process each location node
        loadCityLayer = loadCityLayer | adf.mf.internal.dvt._processPointLocationNode(amxNode, dataLayer, tagPointLocNode, tagChildrenRowKey, context)
      }
    }
    /**
     * Following will add layer either in options root or in areaLayers.
     * It depends on where pointDataLayers are placed in AMX!
     */
    if (!data['pointDataLayers'])
    {
      data['pointDataLayers'] = [];
    }
    data['pointDataLayers'].push(dataLayer);    

    // load resource and base map layer
    if (!amxNode["_optionsObj"]['source'] && loadCityLayer)
      adf.mf.internal.dvt.loadMapLayerAndResource(amxNode["_optionsObj"]['basemap'], 'cities');

    AttributeGroupManager.applyAttributeGroups(amxNode, null, context);
      
    return true;
  }

  PointDataLayerRenderer.prototype.ProcessChildren = function (options, dataLayer, context)
  {
    if (dataLayer.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataLayer.getAttribute('rendered')))
      return;

    return PointDataLayerRenderer.superclass.ProcessChildren.call(this, options, dataLayer, context);
  }

  adf.mf.internal.dvt._processPointLocationNode = function(amxNode, dataLayer, pointLocNode, rowKey, context)
  {

    var loadCityLayer = false;
    if (pointLocNode.getTag().getName() !== 'pointLocation')
      return loadCityLayer;
    if (!pointLocNode.isAttributeDefined('rendered') || adf.mf.api.amx.isValueTrue(pointLocNode.getAttribute('rendered')))
    {
      var markerNodes = pointLocNode.getChildren();
      if (markerNodes.length > 0) {
        var markerData = {};
        if (pointLocNode.isAttributeDefined('pointName'))
        {
          loadCityLayer = true;
          markerData['location'] = pointLocNode.getAttribute('pointName');
        }
        else if (pointLocNode.isAttributeDefined('pointX') && pointLocNode.isAttributeDefined('pointY'))
        {
          markerData['x'] = pointLocNode.getAttribute('pointX');
          markerData['y'] = pointLocNode.getAttribute('pointY');
        }
        markerData['type'] = 'marker';
        markerData['id'] = rowKey;
        adf.mf.internal.dvt.processThematicMapDataItem(amxNode, markerData, markerNodes[0], context);
        dataLayer['markers'].push(markerData);
      }
    }
    return loadCityLayer;
  }


})();
(function(){
  
  var PointLocationRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(PointLocationRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.PointLocationRenderer');
  
  PointLocationRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    
  }  
})();
(function(){

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var ThematicMapDataItemRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ThematicMapDataItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.layer.ThematicMapDataItemRenderer');
  
 
  ThematicMapDataItemRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    return false;
  }  
  
  adf.mf.internal.dvt.processThematicMapDataItem = function(amxNode, data, dataNode, context) 
  {
    var options = amxNode["_optionsObj"];
  
    //First check if this data item should be rendered at all
    if (dataNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataNode.getAttribute('rendered')))
      return null;
      
    // process attribute groups, if any
    data['attrGroups'] = [];
    var attributeGroupsNodes = dataNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter.hasNext()) {
      var attributeGroupsNode = iter.next();
      AttributeGroupManager.processAttributeGroup(attributeGroupsNode, amxNode, context);
    }
    
    if (dataNode.isAttributeDefined('source'))
      data['source'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('source'));
    
    if (dataNode.isAttributeDefined('sourceHover'))
      data['sourceHover'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHover'));
      
    if (dataNode.isAttributeDefined('sourceSelected'))
      data['sourceSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceSelected'));
      
    if (dataNode.isAttributeDefined('sourceHoverSelected'))
      data['sourceHoverSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHoverSelected'));
    
    if (dataNode.isAttributeDefined('gradientEffect'))
      data['gradientEffect'] = dataNode.getAttribute('gradientEffect');
    
    if (dataNode.isAttributeDefined('opacity'))
      data['opacity'] = dataNode.getAttribute('opacity');

    if (dataNode.isAttributeDefined('borderStyle'))
      data['borderStyle'] = dataNode.getAttribute('borderStyle');
    
    if (dataNode.isAttributeDefined('borderColor'))
      data['borderColor'] = dataNode.getAttribute('borderColor');

    if (dataNode.isAttributeDefined('borderWidth'))
    {
      data['borderWidth'] = dataNode.getAttribute('borderWidth');
      if (!isNaN(data['borderWidth']))
      {
        if ((data['borderWidth'] > 0) && !dataNode.isAttributeDefined('borderStyle')) 
        {
          data['borderStyle'] = 'solid';
        }
      }
    }
      
    
    if (dataNode.isAttributeDefined('labelStyle'))
      data['labelStyle'] = dataNode.getAttribute('labelStyle');
    
    if (dataNode.isAttributeDefined('shortDesc'))
      data['shortDesc'] = dataNode.getAttribute('shortDesc');
    
    if (dataNode.isAttributeDefined('value'))
      data['label'] = dataNode.getAttribute('value');
    
    if (dataNode.isAttributeDefined('labelPosition'))
      data['labelPosition'] = dataNode.getAttribute('labelPosition');
    
    if (dataNode.isAttributeDefined('rotation'))
      data['rotation'] = dataNode.getAttribute('rotation');
      
    if (dataNode.isAttributeDefined('width'))
      data['width'] = dataNode.getAttribute('width');
   
    if (dataNode.isAttributeDefined('height'))
      data['height'] = dataNode.getAttribute('height');
      
    if (dataNode.isAttributeDefined('scaleX'))
      data['scaleX'] = dataNode.getAttribute('scaleX');    
    
    if (dataNode.isAttributeDefined('scaleY'))
      data['scaleY'] = dataNode.getAttribute('scaleY');    
      
    if (dataNode.isAttributeDefined('fillColor') && dataNode.getAttribute('fillColor')) {
      data['color'] = dataNode.getAttribute('fillColor');
    }
    
    if (dataNode.isAttributeDefined('fillPattern'))
      data['pattern'] = dataNode.getAttribute('fillPattern');
      
    if (dataNode.isAttributeDefined('shape'))
      data['shape'] = dataNode.getAttribute('shape');
    
    if (dataNode.isAttributeDefined('labelDisplay') && dataNode.getAttribute('labelDisplay') === 'off') {
      delete data['label'];
      delete data['labelPosition'];
    }

    data['clientId'] = dataNode.getId();
    
    if (dataNode.isAttributeDefined('action')) 
    {
      data['action'] = data['id'];
    }
    else 
    {
      var firesAction = false;
      var actionTags;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags  
      actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else 
      {
        actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction) 
      {
        // need to set 'action' to some value to make the event fire
        data['action'] = data['id'];
      }
    }
    
    var config = new adf.mf.internal.dvt.common.attributeGroup.DataItemConfig();
    
    var shape = adf.mf.internal.dvt.common.attributeGroup.DefaultPalettesValueResolver.SHAPE;
    if (data['type'] === 'marker' &&  !dataNode.isAttributeDefined(shape)) {
      // old markerStyle.type was replaced by new keys: styleDefaults.dataMarkerDefaults.shape
      config.addTypeDefaultValue(shape, options['styleDefaults']['dataMarkerDefaults']['shape']);
    }

    AttributeGroupManager.registerDataItem(context, data, config);    
  }
  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var LegendRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.legend.LegendRenderer');
  
  LegendRenderer.LEGEND_LOCATION_ATTR = "_legendLocation";
  LegendRenderer.LEGEND_LOCATION_VALUE_DATA = "DATA";
  LegendRenderer.LEGEND_LOCATION_VALUE_OPTIONS = "OPTIONS";
  
  /**
   * processes the components's child tags
   */
  LegendRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      this._renderers = 
        {
          'legendSection' : { 'renderer' : new adf.mf.internal.dvt.common.legend.LegendSectionRenderer() }
        };
    }
    return this._renderers;
  } 
 
  /**
   * Sets properties of a legend.
   *
   * The following properties are supported:
   *   rendered        - tag attribute
   *   backgroundColor - style template
   *   borderColor     - style template
   *   position        - tag attribute
   *   scrolling       - tag attribute
   *   textStyle       - style template
   *   titleHalign     - tag attribute
   *   titleStyle      - style template
   *   title           - tag attribute
   */
  LegendRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = LegendRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['rendered'] = {'path' :  'legend/rendered', 'type' : AttributeProcessor['ON_OFF']};
    attrs['position'] = {'path' : 'legend/position', 'type' : AttributeProcessor['TEXT']};
    attrs['scrolling'] = {'path' : 'legend/scrolling', 'type' : AttributeProcessor['TEXT']};    
    attrs['titleHalign'] = {'path' : 'legend/titleHalign', 'type' : AttributeProcessor['TEXT']};   
    attrs['sectionTitleHalign'] = {'path' : 'legend/sectionTitleHalign', 'type' : AttributeProcessor['TEXT']};   
    attrs['title'] = {'path' : 'legend/title', 'type' : AttributeProcessor['TEXT']};   
    attrs['referenceObjectTitle'] = {'path' : 'legend/referenceObjectTitle', 'type' : AttributeProcessor['TEXT']};   
    
    return attrs;
  }
  
  LegendRenderer.prototype.ProcessAttributes = function (options, legendNode, context)
  {
    var changed = LegendRenderer.superclass.ProcessAttributes.call(this, options, legendNode, context);
    if(changed)
    {
      var position = (new adf.mf.internal.dvt.util.JSONPath(options, 'legend/position')).getValue();    
    
      if(position === 'none')
      {
        (new adf.mf.internal.dvt.util.JSONPath(options, 'legend/rendered')).setValue('off');
      }
    }
    
    return changed;
  }  
})();
(function(){
  
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
  
  var LegendSectionRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(LegendSectionRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.legend.LegendSectionRenderer');
  
  // TODO: legendSection processing has changed
  /**
   * processes the legendSection node
   */
  LegendSectionRenderer.prototype.ProcessAttributes = function (options, legendSectionNode, context)
  {
    var amxNode = context['amxNode'];
    
    var legendContainer = amxNode["_optionsObj"];
    var legendLocation = context[LegendRenderer.LEGEND_LOCATION_ATTR];
    if(legendLocation && legendLocation === LegendRenderer.LEGEND_LOCATION_VALUE_DATA) {
      legendContainer = amxNode["_dataObj"];
    }
    var attrGroups = AttributeGroupManager.getAttributeGroups(amxNode);
    var agid;
    var ag;

    if (legendSectionNode.isAttributeDefined('source'))
    {
      agid = legendSectionNode.getAttribute('source');
      
      ag = AttributeGroupManager.findGroupById(amxNode, agid);
      
      // if the group could not be found by id, nothing to do here
      if (ag == null)
      {
        return;
      }

      // attribute group found, copy the info into the section legend
      var section = 
      {
        'title' : legendSectionNode.getAttribute('title'), 'items' : []
      };
      
      var legendItems = ag.getLegendItems();
      var legendItem = null;
      for (var i = 0;i < legendItems.length;i++)
      {
        legendItem = legendItems[i]; 
        var item = 
        {
          'id' : legendItem['id']
        };

        item.text = legendItem['label'];

        if (legendItem['color'])
        {
          item['color'] = legendItem['color'];
        }
        if (legendItem['shape'])
        {
          item['markerShape'] = legendItem['shape'];
        }
        if (legendItem['pattern'])
        {
          item['pattern'] = legendItem['pattern'];
        }

        section['items'].push(item);
      }
    
      var sectionsPath = (new adf.mf.internal.dvt.util.JSONPath(legendContainer, 'legend/sections'));    
      var sections = sectionsPath.getValue();
      if(!sections)
      {
        sections = [];
        sectionsPath.setValue(sections);
      }
     
      sections.push(section);
    }
    return false;
  }
  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var OverviewRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(OverviewRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.common.overview.OverviewRenderer');
  
  /**
   * Sets properties of an overview.
   *
   * The following properties are supported:
   *   rendered        - tag attribute
   */
  OverviewRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = OverviewRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['rendered'] = {'path' :  'overview/rendered', 'type' : AttributeProcessor['ON_OFF']};
    attrs['inlineStyle'] = {'path' : 'overview/style', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  OverviewRenderer.prototype.ProcessAttributes = function (options, overviewNode, context)
  {
    var changed = OverviewRenderer.superclass.ProcessAttributes.call(this, options, overviewNode, context);
    
    return changed;
  }  
})();
(function()
{ 
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.exception');
   /*
   * Represents any of the DVT flavored exceptions
   */
  adf.mf.internal.dvt.exception.DvtmException = function (message)
  {
    this.name = 'DvtmException';
    this.message = (message || "Generic Dvtm Exception");
  };
  adf.mf.internal.dvt.exception.DvtmException.prototype = new Error();
})();
(function()
{  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.exception');
  /*
   * Represents an exception when a node cannot be rendered due to missing data.
   */
  adf.mf.internal.dvt.exception.NodeNotReadyToRenderException = function (message)
  {
    this.name = 'NodeNotReadyToRenderException';
    this.message = (message || "Node not ready to render");
  };
  adf.mf.internal.dvt.exception.NodeNotReadyToRenderException.prototype = new Error();
})();
(function(){

  var dialGaugeStyles = {};
  var dialGaugeStylesResolved = false;
  
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
   
  var DialGaugeRenderer = function ()
  { }
  
  DialGaugeRenderer.DEFAULT_HEIGHT = 150;  
  DialGaugeRenderer.DEFAULT_WIDTH = 150;

  adf.mf.internal.dvt.DvtmObject.createSubclass(DialGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.DialGaugeRenderer');
 
  DialGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = DialGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-gaugeTickLabel'] = 
    {
      'builderFunction' : createDialGaugeClassFunction('dvtm-gaugeTickLabel'),
      'path' : 'tickLabel/style', 'type' : StyleProcessor['CSS_TEXT']
    }; 
    
    styleClasses['dvtm-gaugeMetricLabel'] = 
    {
      'builderFunction' : createDialGaugeClassFunction('dvtm-gaugeMetricLabel'),
      'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']
    }
    
    return styleClasses; 
  } 
  
  var createDialGaugeClassFunction = function (baseClass)
  {
    return function (amxNode)
    {
      if(amxNode.isAttributeDefined('background'))
      {
        return baseClass + ' dvtm-dialGauge-background-' + amxNode.getAttribute('background');
      }
      else
      {
        return baseClass;
      }
    }
  }
 
  DialGaugeRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    DialGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    amxNode['_optionsObj']['tickLabel'] = 
      {
        'rendered' : 'on',
        'scaling' : 'auto'
      };
  }
  
  DialGaugeRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    DialGaugeRenderer.superclass.MergeComponentOptions.call(this, amxNode);
     
    var refreshing = amxNode["_refreshing"];
    
    // if style template exists, load predefined backgrounds/indicators
    if (!refreshing && !dialGaugeStylesResolved)
    {
      dialGaugeStylesResolved = true;

      dialGaugeStyles['backgrounds'] = adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle['backgrounds'];
      dialGaugeStyles['indicators'] = adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle['indicators'];

      // if CustomDialGaugeStyle is defined, merge it with the default style
      if (window['CustomDialGaugeStyle'] != undefined)
      {
        var item, imgs, imgIndx;
        if (window['CustomDialGaugeStyle']['backgrounds'] != undefined)
        {
          for (item in window['CustomDialGaugeStyle']['backgrounds'])
          {
            dialGaugeStyles['backgrounds'][item] = window['CustomDialGaugeStyle']['backgrounds'][item];
            imgs = dialGaugeStyles['backgrounds'][item]["images"];
            for (imgIndx = 0;imgIndx < imgs.length;imgIndx++)
            {
              imgs[imgIndx]["src"] = adf.mf.api.amx.buildRelativePath(imgs[imgIndx]["source"]);
            }
          }
        }
        if (window['CustomDialGaugeStyle']['indicators'] != undefined)
        {
          for (item in window['CustomDialGaugeStyle']['indicators'])
          {
            dialGaugeStyles['indicators'][item] = window['CustomDialGaugeStyle']['indicators'][item];
            imgs = dialGaugeStyles['indicators'][item]["images"];
            for (imgIndx = 0;imgIndx < imgs.length;imgIndx++)
            {
              imgs[imgIndx]["src"] = adf.mf.api.amx.buildRelativePath(imgs[imgIndx]["source"]);
            }
          }
        }
      }
    }
  }
  
  DialGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = DialGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    var dialGaugeBackground = amxNode.getAttribute('background');
    var dialGaugeIndicator = amxNode.getAttribute('indicator');
   
    if (!dialGaugeBackground || dialGaugeStyles['backgrounds'][dialGaugeBackground] === undefined)
    {
      var b2iMap = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS['indicatorToBackground'];
      var defaultDialGaugeBackground = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES['background'];
      dialGaugeBackground = this._getValueByKeyWithDefault(b2iMap, dialGaugeIndicator, defaultDialGaugeBackground);
      changed = true;
    }
    
    if (!dialGaugeIndicator || dialGaugeStyles['indicators'][dialGaugeIndicator] === undefined)
    {
      var i2bMap = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS['backgroundToIndicator'];
      var defaultDialGaugeIndicator = adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES['indicator'];
      dialGaugeIndicator = this._getValueByKeyWithDefault(i2bMap, dialGaugeBackground, defaultDialGaugeIndicator);
      changed = true;
    }
           
    options['background'] = dialGaugeStyles['backgrounds'][dialGaugeBackground];          
    options['indicator'] = dialGaugeStyles['indicators'][dialGaugeIndicator];  
    return changed;
  }
  
  DialGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtDialGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  } 
   
  DialGaugeRenderer.prototype.GetComponentWidtht = function (node, amxNode)
  {
    var width =  DialGaugeRenderer.superclass.GetComponentWidtht.call(this, node, amxNode);
    if(width <= 1)
    {
      width = DialGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  DialGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  DialGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = DialGaugeRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
    /**
   * @param map
   * @param key 
   * @param defaultValue - optional
   * 
   * @return value from map for given key, defaultValue when there is no value for key in map. 
   *    If not specified, defaultValue is 'undefined';
   */
  DialGaugeRenderer.prototype._getValueByKeyWithDefault = function(map, key, defaultValue)
  {
    var value = undefined;
    if(map && key)
    {
      value = map[key];
    }
    if (value === undefined)
    {
      value = defaultValue;
    }
    return value;
  }
        
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'dialGauge', DialGaugeRenderer); 
})();
(function() {  

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.gauge');

  adf.mf.internal.dvt.gauge.DefaultGaugeStyle = {};

  adf.mf.internal.dvt.gauge.DefaultGaugeStyle.SKIN_ALTA =
  {
    // skin id
    'skin' : 'alta'
  };
  
  adf.mf.internal.dvt.gauge.DefaultGaugeStyle.VERSION_1 = 
  {
    // skin id
    'skin' : 'skyros',
    // default animation duration in milliseconds
    'animationDuration': 1000,
    // default animation effect on data change
    'animationOnDataChange': "none",
    // default animation effect on gauge display
    'animationOnDisplay': "none",
    // default visual effect
    'visualEffects': "auto"
  };
  
  adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_PROPERTIES = 
  {
    'background' : 'circleAntique',
    'indicator' : 'needleAntique'
  };
  
  adf.mf.internal.dvt.gauge.DEFAULT_DIAL_GAUGE_BACKGROUND_INDICATOR_MAPS = 
  {
    'indicatorToBackground':
    {
      'needleAntique' : 'circleAntique',
      'needleLight' : 'circleLight',
      'needleDark' : 'circleDark'
    },
    
    'backgroundToIndicator' : 
    {
      'rectangleAntique' : 'needleAntique',
      'rectangleAntiqueCustom' : 'needleAntique',
      'domeAntique' : 'needleAntique',
      'domeAntiqueCustom' : 'needleAntique',
      'circleAntique' : 'needleAntique',
      'circleAntiqueCustom' : 'needleAntique',
      
      'rectangleLight' : 'needleLight',
      'rectangleLightCustom' : 'needleLight',
      'domeLight' : 'needleLight',
      'domeLightCustom' : 'needleLight',
      'circleLight' : 'needleLight',
      'circleLightCustom' : 'needleLight',
      
      'rectangleDark' : 'needleDark',
      'rectangleDarkCustom' : 'needleDark',
      'domeDark' : 'needleDark',
      'domeDarkCustom' : 'needleDark',
      'circleDark' : 'needleDark',
      'circleDarkCustom' : 'needleDark'
    }
  };
    
  // location of dial gauge resources
  var _dialGaugePath = 'css/images/chart/gauge/';
  var translatePath = function (path)
  {
    return _dialGaugePath + path;
  }
  
  adf.mf.internal.dvt.gauge.DefaultDialGaugeStyle = 
  {
    'backgrounds' : 
    {
      "rectangleAntique" : 
      {
        "anchorX" : 100.5,
        "anchorY" : 95.8,
        "startAngle" : 207.6,
        "angleExtent" : 235,
        "indicatorLength" : 1.05,
        "images" : [
        {
          "src" : translatePath("antique/bg-rectangle-200x200-bidi.png"),
          "width" : 200,
          "height" : 168,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-200x200.png"),
          "width" : 200,
          "height" : 168
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400-bidi.png"),
          "width" : 400,
          "height" : 335,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400.png"),
          "width" : 400,
          "height" : 335
        } ],
        "metricLabelBounds" :
        {
          "x" : 79,
          "y" : 125,
          "width" : 42,
          "height" : 40
        }
      },
      
      "rectangleAntiqueCustom" : 
      {
        "anchorX" : 100.5,
        "anchorY" : 95.8,
        "startAngle" : 207.6,
        "angleExtent" : 235,
        "indicatorLength" : 1.05,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 168,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 168
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 335,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 335
        } ],
        "metricLabelBounds" :
        {
          "x" : 79,
          "y" : 125,
          "width" : 42,
          "height" : 40
        }
      },      
      
      "domeAntique" : 
      {
        "anchorX" : 99.3,
        "anchorY" : 95.8,
        "startAngle" : 195.5,
        "angleExtent" : 210.8,
        "indicatorLength" : 0.98,
        "images" : [
        {
          "src" : translatePath("antique/bg-dome-200x200-bidi.png"),
          "width" : 200,
          "height" : 176,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-200x200.png"),
          "width" : 200,
          "height" : 176
        },
        {
          "src" : translatePath("antique/bg-dome-400x400-bidi.png"),
          "width" : 400,
          "height" : 352,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-400x400.png"),
          "width" : 400,
          "height" : 352
        } ],
        "metricLabelBounds" :
        {
          "x" : 81,
          "y" : 135,
          "width" : 38,
          "height" : 35
        }
      },

      "domeAntiqueCustom" : 
      {
        "anchorX" : 99.3,
        "anchorY" : 95.8,
        "startAngle" : 195.5,
        "angleExtent" : 210.8,
        "indicatorLength" : 0.98,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 176,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 176
        },
        {
          "src" : translatePath("antique/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 352,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 352
        } ],
        "metricLabelBounds" :
        {
          "x" : 81,
          "y" : 135,
          "width" : 38,
          "height" : 35
        }
      },
      
      "circleAntique" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.85,
        "images" : [
        {
          "src" : translatePath("antique/bg-circle-200x200-bidi.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-200x200.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("antique/bg-circle-400x400-bidi.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-400x400.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 77,
          "y" : 133,
          "width" : 46,
          "height" : 34
        }
      },
    
     "circleAntiqueCustom" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.85,
        "radius": 63,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("antique/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("antique/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("antique/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 77,
          "y" : 133,
          "width" : 46,
          "height" : 34
        }
      },

      "rectangleLight" : 
      {
        "anchorX" : 100,
        "anchorY" : 91.445,
        "startAngle" : 211,
        "angleExtent" : 242,
        "indicatorLength" : 1.1,
        "images" : [
        {
          "src" : translatePath("light/bg-rectangle-200x200-bidi.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-200x200.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400-bidi.png"),
          "width" : 400,
          "height" : 307,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 78,
          "y" : 75,
          "width" : 44,
          "height" : 38
        }
      },
      
      "rectangleLightCustom" : 
      {
        "anchorX" : 100,
        "anchorY" : 91.445,
        "startAngle" : 211,
        "angleExtent" : 242,
        "indicatorLength" : 1.1,
        "radius": 60.5,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 78,
          "y" : 75,
          "width" : 44,
          "height" : 38
        }
      },
      
      "domeLight" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "images" : [
        {
          "src" : translatePath("light/bg-dome-200x200-bidi.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-200x200.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("light/bg-dome-400x400-bidi.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-400x400.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 70,
          "width" : 41,
          "height" : 39
        }
      },
      
      "domeLightCustom" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "radius": 57,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("light/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 70,
          "width" : 41,
          "height" : 39
        }
      },

      "circleLight" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.82,
        "images" : [
        {
          "src" : translatePath("light/bg-circle-200x200-bidi.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-200x200.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("light/bg-circle-400x400-bidi.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-400x400.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },

      "circleLightCustom" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.1,
        "indicatorLength" : 0.82,
        "radius": 60,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("light/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("light/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("light/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },
      
      "circleDark" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.5,
        "indicatorLength" : 0.82,
        "images" : [
        {
          "src" : translatePath("dark/bg-circle-200x200-bidi.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-200x200.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("dark/bg-circle-400x400-bidi.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-400x400.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },
  
      "circleDarkCustom" : 
      {
        "anchorX" : 100,
        "anchorY" : 100,
        "startAngle" : 220.5,
        "angleExtent" : 261.5,
        "indicatorLength" : 0.82,
        "radius": 63,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 200
        },
        {
          "src" : translatePath("dark/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-circle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 400
        } ],
        "metricLabelBounds" :
        {
          "x" : 76,
          "y" : 82,
          "width" : 48,
          "height" : 40
        }
      },

      "rectangleDark" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 99.5,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.1,
        "images" : [
        {
          "src" : translatePath("dark/bg-rectangle-200x200-bidi.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-200x200.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400-bidi.png"),
          "width" : 400,
          "height" : 307,
          "rtl" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 83,
          "width" : 41,
          "height" : 36
        }
      },
      
      "rectangleDarkCustom" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 99.5,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.1,
        "radius": 65,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-200x200-noLabels.png"),
          "width" : 200,
          "height" : 154
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-rectangle-400x400-noLabels.png"),
          "width" : 400,
          "height" : 307
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 83,
          "width" : 41,
          "height" : 36
        }
      },

      "domeDark" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "images" : [
        {
          "src" : translatePath("dark/bg-dome-200x200-bidi.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-200x200.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("dark/bg-dome-400x400-bidi.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-400x400.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 73,
          "width" : 41,
          "height" : 36
        }
      },
      
      "domeDarkCustom" : 
      {
        "anchorX" : 100.2,
        "anchorY" : 89,
        "startAngle" : 201,
        "angleExtent" : 222,
        "indicatorLength" : 1.23,
        "radius": 57,
        "majorTickCount": 6,
        "images" : [
        {
          "src" : translatePath("dark/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-200x200-noLabels.png"),
          "width" : 200,
          "height" : 138
        },
        {
          "src" : translatePath("dark/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276,
          "dir" : "rtl"
        },
        {
          "src" : translatePath("dark/bg-dome-400x400-noLabels.png"),
          "width" : 400,
          "height" : 276
        } ],
        "metricLabelBounds" :
        {
          "x" : 80,
          "y" : 73,
          "width" : 41,
          "height" : 36
        }
      }
    },

    'indicators' : 
    {
      "needleAntique" : 
      {
        "anchorX" : 42,
        "anchorY" : 510,
        "images" : [
        {
          "src" : translatePath("antique/needle-1600x1600.png"),
          "width" : 81,
          "height" : 734
        } ]
      },

      "needleLight" : 
      {
        "anchorX" : 227,
        "anchorY" : 425,
        "images" : [
        {
          "src" : translatePath("light/needle-1600x1600.png"),
          "width" : 454,
          "height" : 652
        } ]
      },

      "needleDark" : {
        "anchorX" : 227,
        "anchorY" : 425,
        "images" : [
        {
          "src" : translatePath("dark/needle-1600x1600.png"),
          "width" : 454,
          "height" : 652
        } ]
      }
    }
  }


})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
   
  var LedGaugeRenderer = function ()
  { }
  
  LedGaugeRenderer.DEFAULT_HEIGHT = 80;  
  LedGaugeRenderer.DEFAULT_WIDTH = 100;

  adf.mf.internal.dvt.DvtmObject.createSubclass(LedGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.LedGaugeRenderer');
    
  LedGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = LedGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['size'] = {'path' : 'size', 'type' : AttributeProcessor['PERCENTAGE']};
    
    return attrs;
  }
  
  LedGaugeRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    return null;
  }
  
  LedGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtLedGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }
  
  LedGaugeRenderer.prototype.GetComponentWidth = function (node, amxNode)
  {
    var width = LedGaugeRenderer.superclass.GetComponentWidth.call(this, node, amxNode);
    if(width <= 1)
    {
      width = LedGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  LedGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  LedGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = LedGaugeRenderer.DEFAULT_HEIGHT;
    }
    return height;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'ledGauge', LedGaugeRenderer); 
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var RatingGaugeRenderer = function ()
  { }
  
  RatingGaugeRenderer.DEFAULT_HEIGHT = 30;  
  RatingGaugeRenderer.MAX_HEIGHT = 50;  
  RatingGaugeRenderer.DEFAULT_WIDTH = 160;

  adf.mf.internal.dvt.DvtmObject.createSubclass(RatingGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.RatingGaugeRenderer');

  RatingGaugeRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    RatingGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    amxNode['_optionsObj']['selectedState'] = {};
    amxNode['_optionsObj']['unselectedState'] = {};
    amxNode['_optionsObj']['hoverState'] = {};
    amxNode['_optionsObj']['changedState'] = {};
  }
  
  RatingGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = RatingGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['value'] = {'path' : 'value', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 3, 'default' : 3};
    attrs['minValue'] = {'path' : 'min', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 0, 'default' : 0};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT'], 'dtvalue' : 5, 'default' : 5};
    attrs['labelDisplay'] = {'path' : 'metricLabel/rendered', 'type' : AttributeProcessor['TEXT'], 'default' : 'on'};
    attrs['inputIncrement'] = {'path' : 'step', 'type' : AttributeProcessor['RATING_STEP']};
    attrs['readOnly'] = {'path' : 'readOnly', 'type' : AttributeProcessor['BOOLEAN'], 'default' : false};
    attrs['changed'] = {'path' : 'changed', 'type' : AttributeProcessor['BOOLEAN'], 'default' : false};      
    
    return attrs;
  }
  
  RatingGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = RatingGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
  
    styleClasses['dvtm-ratingGaugeSelected'] = [{'path' : 'selectedState/color', 'type' : StyleProcessor['COLOR']}, {'path' : 'selectedState/borderColor', 'type' : StyleProcessor['TOP_BORDER']}];
    styleClasses['dvtm-ratingGaugeUnselected'] = [{'path' : 'unselectedState/color', 'type' : StyleProcessor['COLOR']}, {'path' : 'unselectedState/borderColor', 'type' : StyleProcessor['TOP_BORDER']}];
    styleClasses['dvtm-ratingGaugeHover'] = [{'path' : 'hoverState/color', 'type' : StyleProcessor['COLOR']}, {'path' : 'hoverState/borderColor', 'type' : StyleProcessor['TOP_BORDER']}];
    styleClasses['dvtm-ratingGaugeChanged'] = [{'path' : 'changedState/color', 'type' : StyleProcessor['COLOR']}, {'path' : 'changedState/borderColor', 'type' : StyleProcessor['TOP_BORDER']}];
        
    return styleClasses; 
  }  
          
  RatingGaugeRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    RatingGaugeRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    
    var DEFAULT_SHAPE = 'star';  
    var shape = DEFAULT_SHAPE;
    var unselectedShape;
    
    if (amxNode.isAttributeDefined('shape')) 
    {
      shape = amxNode.getAttribute('shape');
    }
    options['selectedState']['shape'] = shape;
    // make the 'changed' and 'hover' states follow the selected shape
    options['hoverState']['shape'] = shape;
    options['changedState']['shape'] = shape;
  
    if (amxNode.isAttributeDefined('unselectedShape'))
    {
      unselectedShape = amxNode.getAttribute('unselectedShape');
      // if 'auto', follow the selected shape
      if (unselectedShape === 'auto')
        options['unselectedState']['shape'] = shape;
      else
        options['unselectedState']['shape'] = unselectedShape;
    }
    else 
    {
      options['unselectedState']['shape'] = shape;
    }
    
    return true;
  }

  RatingGaugeRenderer.prototype.GetChildRenderers = function ()
  {
    return null;
  }
  
  RatingGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {   
    var instance = DvtRatingGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }
  
  RatingGaugeRenderer.prototype.GetComponentWidtht = function (node, amxNode)
  {
    var width = RatingGaugeRenderer.superclass.GetComponentWidtht.call(this, node, amxNode);
    if(width <= 1)
    {
      width = RatingGaugeRenderer.DEFAULT_WIDTH;
    }
    return width;
  }
  
  RatingGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height = RatingGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = RatingGaugeRenderer.DEFAULT_HEIGHT;
    }
    else if(height > RatingGaugeRenderer.MAX_HEIGHT)
    {
      height = RatingGaugeRenderer.MAX_HEIGHT;
    }
    
    return height;
  }
  
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'ratingGauge', RatingGaugeRenderer);
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  
  var StatusMeterGaugeRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(StatusMeterGaugeRenderer, 'adf.mf.internal.dvt.gauge.BaseGaugeRenderer', 'adf.mf.internal.dvt.gauge.StatusMeterGaugeRenderer');

  StatusMeterGaugeRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    StatusMeterGaugeRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    amxNode["_optionsObj"]['indicatorSize'] = 1;
    amxNode["_optionsObj"]['thresholdDisplay'] = 'onIndicator';
    amxNode["_optionsObj"]['plotArea'] = 
      {
        'rendered' : 'auto'
      }; 
  }
  
  StatusMeterGaugeRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = StatusMeterGaugeRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['indicatorSize'] = {'path' : 'indicatorSize', 'type' : AttributeProcessor['PERCENTAGE']};
    attrs['orientation'] = {'path' : 'orientation', 'type' : AttributeProcessor['TEXT'], 'default' : 'horizontal'};
    attrs['plotArea'] = {'path' : 'plotArea/rendered', 'type' : AttributeProcessor['TEXT']};
    attrs['thresholdDisplay'] = {'path' : 'thresholdDisplay', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  }
  
  StatusMeterGaugeRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = StatusMeterGaugeRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['_self'] = [{'path' : 'color', 'type' : StyleProcessor['COLOR'], 'overwrite' : false }, {'path' : 'plotArea/color', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'borderColor', 'type' : StyleProcessor['BOTTOM_BORDER'], 'overwrite' : false}];
    styleClasses['dvtm-gaugeMetricLabel'] = {'path' : 'metricLabel/style', 'type' : StyleProcessor['CSS_TEXT']};    
    styleClasses['dvtm-gaugePlotArea'] = [{'path' : 'plotArea/color', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'plotArea/borderColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
        
    return styleClasses; 
  }  
  
  StatusMeterGaugeRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtStatusMeterGauge.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  }  
  
  StatusMeterGaugeRenderer.prototype.GetComponentHeight = function (node, amxNode)
  {
    var height =  StatusMeterGaugeRenderer.superclass.GetComponentHeight.call(this, node, amxNode);
    if(height <= 1)
    {
      height = 40;
    }
    return height;
  }
   
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'statusMeterGauge', StatusMeterGaugeRenderer); 
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;   
  
  var ThresholdRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ThresholdRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.gauge.ThresholdRenderer');
  
  /**
   * parses the threshold node attributes
   *
   * threshold has the following attributes
   *
   *   borderColor - String(Color): support CSS color values
   *   color       - String(Color): support CSS color values
   *   text        - String: the threshold text
   *   value       - Number: the breakpoint of the range
   *
   */
  ThresholdRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ThresholdRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['borderColor'] = {'path' : 'borderColor', 'type' : AttributeProcessor['TEXT']};
    attrs['color'] = {'path' : 'color', 'type' : AttributeProcessor['TEXT']};
    attrs['text'] = {'path' : 'text', 'type' : AttributeProcessor['TEXT']};
    attrs['maxValue'] = {'path' : 'max', 'type' : AttributeProcessor['FLOAT']};
   
    return attrs;
  }
  
  ThresholdRenderer.prototype.ProcessAttributes = function (options, thresholdNode, context)
  {
    var threshold = {};

    var changed = ThresholdRenderer.superclass.ProcessAttributes.call(this, threshold, thresholdNode, context);

    options['thresholds'] = options['thresholds'] ? options['thresholds'] : [];
    options['thresholds'].push(threshold);
    
    return changed;
  }  
})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var DOMUtils = adf.mf.internal.dvt.DOMUtils;

  var GeographicMapRenderer = function ()
  {
    this._apiCheckCount = 0;
  }

  // create the DVT API namespace
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.api.dvt');
  
  /*
   * GeoMap event objects 
   */
   
  /**
   * An event for map view property changes in DvtGeographicMap.
   * The event object is passed to the handler specified 
   * in the mapBoundsChangeListener attribute.
   * See also the Java API oracle.adfmf.amx.event.MapBoundsChangeEvent.
   * @param {Object} minX minimum x coordinate (longitude) of map view
   * @param {Object} minY minimum y coordinate (latitude) of map view
   * @param {Object} maxX maximum x coordinate (longitude) of map view
   * @param {Object} maxY maximum y coordinate (latitude) of map view
   * @param {Object} centerX x coordinate (longitude) of map center
   * @param {Object} centerY y coordinate (latitude) of map center
   * @param {Number} zoomLevel current zoom level
   */
  adf.mf.api.dvt.MapBoundsChangeEvent = function(minX, minY, maxX, maxY, centerX, centerY, zoomLevel)
  {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.centerX = centerX;
    this.centerY = centerY;
    this.zoomLevel = zoomLevel;
    this[".type"] = "oracle.adfmf.amx.event.MapBoundsChangeEvent";
  }

  /**
   * An event fired when a click/tap, mousedown/up event occurs in DvtGeographicMap.
   * The event object is passed to the handler specified in the mapInputListener attribute. 
   * Event properties include x/y coordinates (longitude/latitude) of the location where 
   * the click/tap occurred and the event type id -- 'click', 'mousedown', 'mouseup'.
   * See also the Java API oracle.adfmf.amx.event.MapInputEvent.
   * @param {String} type event type id
   * @param {Object} pointX x coordinate (longitude) of the click point
   * @param {Object} pointY y coordinate (latitude) of the click point
   */
  adf.mf.api.dvt.MapInputEvent = function(type, pointX, pointY)
  {
    this.type = type;
    this.pointX = pointX;
    this.pointY = pointY;
    this[".type"] = "oracle.adfmf.amx.event.MapInputEvent";
  }

  // constants used in map API loading
  GeographicMapRenderer.apiCheckPeriodInMs = 250;
  // Wait for 10 seconds at maximum (then an interval is cleared)
  GeographicMapRenderer.apiCheckMaxTimeInMs = 10000;
  GeographicMapRenderer.apiCheckCountMax = Math.round(GeographicMapRenderer.apiCheckMaxTimeInMs / GeographicMapRenderer.apiCheckPeriodInMs);

  adf.mf.internal.dvt.DvtmObject.createSubclass(GeographicMapRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.geomap.GeographicMapRenderer');

  GeographicMapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = GeographicMapRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['_self'] = {'path' : 'background-color', 'type' : adf.mf.internal.dvt.StyleProcessor['BACKGROUND']};

    return styleClasses;
  }

  GeographicMapRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    GeographicMapRenderer.superclass.InitComponentOptions.call(this, amxNode)

    amxNode['_refreshing'] = false;
    amxNode["_optionsObj"] = {'mapOptions': {}};

    // if the data attribute is defined, use it to initialize the data object
    if (amxNode.isAttributeDefined('data'))
        amxNode["_dataObj"] = amxNode.getAttribute('data');
    else
        amxNode["_dataObj"] = {'dataLayers': []};

    // clear the component instance object
    amxNode[adf.mf.internal.dvt.INSTANCE] = null;

    if (amxNode['_selectionListenerCache'] === undefined)
      amxNode['_selectionListenerCache'] = {};
      
    amxNode['_dataLayerDivs'] = [];
  }

  GeographicMapRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = GeographicMapRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['mapType'] = {'path' : 'mapOptions/mapType', 'type' : AttributeProcessor['TEXT']};
    attrs['centerX'] = {'path' : 'mapOptions/centerX', 'type' : AttributeProcessor['TEXT']};
    attrs['centerY'] = {'path' : 'mapOptions/centerY', 'type' : AttributeProcessor['TEXT']};
    attrs['zoomLevel'] = {'path' : 'mapOptions/zoomLevel', 'type' : AttributeProcessor['TEXT']};
    attrs['initialZooming'] = {'path' : 'mapOptions/initialZooming', 'type' : AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path' : 'mapOptions/animationOnDisplay', 'type' : AttributeProcessor['TEXT']};
    attrs['shortDesc'] = {'path' : 'mapOptions/shortDesc', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  }

  GeographicMapRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    GeographicMapRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);

    // make a note that this is a refresh phase
    amxNode['_refreshing'] = true;
    amxNode['_attributeChanges'] = attributeChanges;

    // clear the 'dirty' flag on the options object
    adf.mf.internal.dvt.setOptionsDirty(amxNode, false);

    // dataObject will be recreated from scratch
    amxNode["_dataObj"] = {'dataLayers': []};
  }

  /**
   * Function processes supported attributes which are on amxNode. This attributes
   * should be converted into the options object.
   *
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   */
  GeographicMapRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    var changed = GeographicMapRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    // if refreshing existing map, turn off initial zoom and onDisplay animation
    if (amxNode['_refreshing'])
    {
      options['mapOptions']['initialZooming'] = 'none';
      options['mapOptions']['animationOnDisplay'] = 'none';
    }
    return changed;
  }

  /**
   * Sets the geographic map properties found on the amxNode
   * @param options main component options object
   * @param amxNode child amxNode
   * @param context rendering context
   * @throws NodeNotReadyToRenderException exception thrown in case that the model is not ready
   */
  GeographicMapRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    return adf.mf.internal.dvt.processGeographicMapPointDataLayerTags(context['amxNode'], amxNode, true);
  }

  GeographicMapRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var mapCallbackObj =
      {
        'callback': function(event, component)
          {
              // fire the selectionChange event
              var type = event.getType();
              if (type === DvtSelectionEvent.TYPE)
              {
                var selection = event.getSelection();
                var dataLayerIdx = event.getParamValue('dataLayerIdx');
                var oldSelection = amxNode['_currentSelection'];

                amxNode['_currentSelection'] = [];
                for (var i = 0; i < selection.length; i++)
                {
                  var rowKey = null;
                  if (selection[i]['rowKey'])
                    rowKey = selection[i]['rowKey'];
                  if (rowKey != null)
                  {
                    amxNode['_currentSelection'].push(rowKey);
                  }
                }
                var se = new adf.mf.api.amx.SelectionEvent(oldSelection ? oldSelection : [], amxNode['_currentSelection']);
                adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se,
                  function()
                  {
                    var params = [];
                    var paramTypes = [];
                    params.push(se);
                    paramTypes.push(se[".type"]);

                    var el = amxNode['_selectionListenerCache'][dataLayerIdx];
                    if (el)
                    {
                      adf.mf.api.amx.invokeEl(el, params, null, paramTypes);
                    }
                  });
              }
              else if (type === DvtMapActionEvent.TYPE)
              {
                var clientId = event.getClientId();
                if (!clientId)
                  return;
                var dataLayerId = adf.mf.internal.dvt.findDataLayerIdByIndex(amxNode, event.getParamValue('dataLayerIdx'));
                if (!dataLayerId)
                  return;
                var dataLayerNode = adf.mf.internal.dvt.findDataLayerNodeById(amxNode, dataLayerId);
                if (dataLayerNode)
                {
                  var locationNode;
                  if(dataLayerNode.getAttribute("value"))
                  {
                    locationNode = dataLayerNode.getChildren(null, event.getRowKey())[0];
                  }
                  else
                  {
                    locationNode = dataLayerNode.getChildren()[parseInt(event.getRowKey()) - 1];
                  }
                  if (locationNode)
                  {
                    var itemNode = null;
                    var items = locationNode.getChildren();
                    for (var j = 0; j < items.length; j++)
                    {
                      if (items[j].getId() === clientId)
                      {
                        itemNode = items[j];
                        break;
                      }
                    }
                    if (itemNode)
                    {
                      // marker node found, fire event and handle action
                      var ae = new adf.mf.api.amx.ActionEvent();
                      adf.mf.api.amx.processAmxEvent(itemNode, 'action', undefined, undefined, ae,
                        function()
                        {
                          var action = itemNode.getAttributeExpression("action", true);
                          if (action != null)
                          {
                            adf.mf.api.amx.doNavigation(action);
                          }
                        });
                    }
                  }
                }
              }
              else if (type === DvtMapInputEvent.TYPE && amxNode.isAttributeDefined('mapInputListener'))
              {
                var mie = new adf.mf.api.dvt.MapInputEvent(event.getEventId(), event.getPointX(), event.getPointY());
                adf.mf.api.amx.processAmxEvent(amxNode, 'mapInput', undefined, undefined, mie);
              }
              else if (type === DvtMapBoundsChangeEvent.TYPE && amxNode.isAttributeDefined('mapBoundsChangeListener'))
              {
                var mbce = new adf.mf.api.dvt.MapBoundsChangeEvent(event.getMinX(), event.getMinY(),
                                                                   event.getMaxX(), event.getMaxY(),
                                                                   event.getCenterX(), event.getCenterY(),
                                                                   event.getZoomLevel());
                adf.mf.api.amx.processAmxEvent(amxNode, 'mapBoundsChange', undefined, undefined, mbce);
              }
            }
        };

    return mapCallbackObj;
  }

  GeographicMapRenderer.prototype.CreateRenderingContext = function(root, stageId, width, height)
  {
    return null;
  }

  GeographicMapRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return DvtGeographicMap.newInstance(callback, callbackObj, amxNode['_optionsObj']);
  }

  /**
   * sets up chart's outer div element
   * 
   * @param amxNode 
   */
  GeographicMapRenderer.prototype.SetupComponent = function (amxNode)
  {
    var contentDiv = GeographicMapRenderer.superclass.SetupComponent.call(this, amxNode);
    if (!amxNode['_refreshing'])
    {
      var canvasDiv = DOMUtils.createDIV();
      var id = amxNode.getId() + '_canvas';
      DOMUtils.writeIDAttribute(canvasDiv, id);
      DOMUtils.writeStyleAttribute(canvasDiv, 'width: 100%; height: 100%;'); 
      contentDiv.appendChild(canvasDiv);
      
      var dataLayerDivs = amxNode['_dataLayerDivs'];
      for (var i = 0; i < dataLayerDivs.length; i++)
      {
        contentDiv.appendChild(dataLayerDivs[i]);
      }
    }
    if (amx.dtmode)
    {
      var readonly = document.createElement("div");
      readonly.className = "dvtm-readonly";
      contentDiv.appendChild(readonly);
    }
    return contentDiv;
  }

  GeographicMapRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var mapCanvas = document.getElementById(amxNode.getId() + '_canvas');
    //get the config keys from applicationScope
    var mapProviderEl = "#{applicationScope.configuration.mapProvider}";
    var geoMapKeyEl = "#{applicationScope.configuration.geoMapKey}";
    var geoMapClientIdEl = "#{applicationScope.configuration.geoMapClientId}";
    var mapViewerUrlEl = "#{applicationScope.configuration.mapViewerUrl}";
    var baseMapEl = "#{applicationScope.configuration.baseMap}";
    // key to detect if accessibility mode is on
    var accessibilityEnabledEl = "#{applicationScope.configuration.accessibilityEnabled}";
    var mapProvider = null;
    var geoMapKey = null;
    var geoMapClientId = null;
    var mapViewerUrl = null;
    var baseMap = null;
    var accessibilityEnabled = false;
    var mapConfig = new Array (mapProviderEl, geoMapKeyEl, geoMapClientIdEl, mapViewerUrlEl, baseMapEl);

    adf.mf.internal.dvt.geoMapContext['amxNode'] = amxNode;
    adf.mf.internal.dvt.geoMapContext['width'] = width;
    adf.mf.internal.dvt.geoMapContext['height'] = height;
    adf.mf.internal.dvt.geoMapContext['mapCanvas'] = mapCanvas;

    var mapConfigCallback = function (request, response)
    {
      if (response && response.length > 0)
      {
        for (var i = 0; i < response.length; i++)
        {
          var name = response[i].name;
          var resolvedValue = response[i].value;
          if (typeof resolvedValue === 'string' || resolvedValue instanceof String)
          {
            switch (name)
            {
              case mapProviderEl:
                mapProvider = resolvedValue;
                break;
              case geoMapKeyEl:
                geoMapKey = resolvedValue;
                break;
              case geoMapClientIdEl:
                geoMapClientId = resolvedValue;
                break;
              case mapViewerUrlEl:
                mapViewerUrl = resolvedValue;
                break;
              case baseMapEl:
                baseMap = resolvedValue;
                break;
              default:
                break;
            }
          }
          else if (typeof resolvedValue === 'boolean' && name === accessibilityEnabledEl )
          {
            accessibilityEnabled = resolvedValue;
          }
        }
      }

      if (mapProvider && (mapProvider.toLowerCase() === "googlemaps" || mapProvider.toLowerCase() === "oraclemaps"))
        mapProvider = mapProvider.toLowerCase();
      else
        mapProvider = "googlemaps";

      var url;
      instance.setMapProvider(mapProvider);

      if (accessibilityEnabled)
      {
        instance.setScreenReaderMode(accessibilityEnabled);
      }

      // Bug 14522345
      window._isGeoMapApiSuccessfullyLoaded = function(providerUsed)
      {
        if(providerUsed === "googlemaps")
        {
          return (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.LatLng !== 'undefined');
        } else if(providerUsed === "oraclemaps")
        {
          return (typeof MVSdoGeometry !== 'undefined');
        } else
        {
          return true;
        }
      };


      var failure = function ()
      {
        adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.geographicMap", "renderGeographicMap", "Failed to load Map API!");
        adf.mf.internal.dvt.mapAPILoaded = false;
        $(this).remove();
        renderReloadPage();
      };

      var clearLoadPage = function()
      {
        $(mapCanvas).children(".dvtm-geographicMap-loadPage").each(function() {
          $(this).remove();
        });
      }

      var renderLoadingPage = function()
      {
        clearLoadPage();

        var loadDiv = document.createElement("div");
        adf.mf.internal.amx.addCSSClassName(loadDiv, "dvtm-geographicMap-loadPage");

        var innerDiv = document.createElement("div");

        var label = document.createElement("div");
        label.appendChild(document.createTextNode(adf.mf.resource.getInfoString("AMXInfoBundle","dvtm_geographicMap_LOADING_API")));
        innerDiv.appendChild(label);

        loadDiv.appendChild(innerDiv);

        $(mapCanvas).append(loadDiv);
      }

      var renderReloadPage = function()
      {
        clearLoadPage();

        var reloadDiv = document.createElement("div");
        adf.mf.internal.amx.addCSSClassName(reloadDiv, "dvtm-geographicMap-loadPage");

        var innerDiv = document.createElement("div");

        var label = document.createElement("div");
        label.appendChild(document.createTextNode(adf.mf.resource.getInfoString("AMXInfoBundle","dvtm_geographicMap_FAILED_LOAD_API")));
        innerDiv.appendChild(label);

        var button = document.createElement("div");
        button.setAttribute("tabindex", "0");
        label = document.createElement("label");
        adf.mf.internal.amx.addCSSClassName(label, "amx-commandButton-label");
        label.appendChild(document.createTextNode(adf.mf.resource.getInfoString("AMXInfoBundle","dvtm_geographicMap_RELOAD_BUTTON_LABEL")));
        button.appendChild(label);

        // Adding WAI-ARIA Attribute to the markup for the role attribute
        button.setAttribute("role", "button");
        adf.mf.internal.amx.addCSSClassName(button, "amx-node");
        adf.mf.internal.amx.addCSSClassName(button, "amx-commandButton");
        $(button).tap(function(){
          adf.mf.internal.dvt.renderGeographicMap($(mapCanvas), amxNode);
        });
        innerDiv.appendChild(button);

        reloadDiv.appendChild(innerDiv);

        $(mapCanvas).append(reloadDiv);

      };

      var checkAccessAndLoadMapApi = function(mapApiUrl, providerUsed) {
        if (!adf.mf.internal.dvt.mapAPILoaded)
        {
          renderLoadingPage();
        }

        var request = new XMLHttpRequest();
        request.onreadystatechange = function (evt) {
        if (request.readyState === 4) {
          if(request.status === 200) {
            //success
            var load = false;
            if(providerUsed === "googlemaps")
            {
              load = request.responseText.indexOf("google.maps") !== -1;
            }
            else if(providerUsed === "oraclemaps")
            {
              load = request.responseText.indexOf("MVSdoGeometry") !== -1;
            }
            else
            {
              load = true;
            }

            if(load)
            {
              loadMapApi(mapApiUrl);
            }
            else
            {
              renderReloadPage();
            }
          } else {
            //error
            renderReloadPage();
          }
        }
      }
      request.open('GET', mapApiUrl, true);
      request.send();
      };

      var loadMapApi = function (mapApiUrl)
      {
        if (!adf.mf.internal.dvt.mapAPILoaded)
        {
          /*
           API loading hasn't been started yet. Start loading the API asynchronously and call renderMap
           callback when it is finished (or failure callback in case of failure).
           */
          adf.mf.internal.dvt.mapAPILoaded = true;
          if (mapProvider === "googlemaps")
            adf.mf.internal.dvt.loadJS(mapApiUrl, null, failure);
          else if (mapProvider === "oraclemaps")
            adf.mf.internal.dvt.loadJS(mapApiUrl, renderMap, failure);
        }
        else
        {
          /*
           API loading has been already started (but can be in the middle). Set interval to periodically check
           if the map can be rendered (and then do the rendering).
           */
          if (adf.mf.internal.dvt.geoMapContext['timer'])
          {
            clearTimeout(adf.mf.internal.dvt.geoMapContext['timer']);
          }
          adf.mf.internal.dvt.geoMapContext['timer'] = setTimeout(renderMap, GeographicMapRenderer.apiCheckPeriodInMs);
        }
      };

      if (mapProvider === "oraclemaps")
      {
        if (mapViewerUrl == null)
              mapViewerUrl = "http://elocation.oracle.com/mapviewer";
            if (baseMap == null)
              baseMap = "ELOCATION_MERCATOR.WORLD_MAP";

            instance.setMapViewerUrl(mapViewerUrl);
            instance.setBaseMap(baseMap);
            url = mapViewerUrl + "/fsmc/jslib/oraclemaps.js";
            checkAccessAndLoadMapApi(url, mapProvider);
      } else if (mapProvider === "googlemaps")
      {
        var mapApiBaseUrl = "http://maps.googleapis.com/maps/api/js?sensor=false&callback=renderMap";
        if (geoMapKey)
          url = mapApiBaseUrl + "&key=" + geoMapKey;
        else if (geoMapClientId)
          url = mapApiBaseUrl + "&client=" + geoMapClientId;
        else
          url = mapApiBaseUrl;
        checkAccessAndLoadMapApi(url, mapProvider);
      }
    }
    if (adf.mf.internal.isJavaAvailable())
      adf.mf.el.getValue(mapConfig, mapConfigCallback, mapConfigCallback);
    else
      mapConfigCallback(null, null);
  }

  /**
  * loads javascript by url
  * 
  * @param {String} url the location of the script
  * @param {Object} success success callback
  * @param {Object} failure failure callback
  */
  adf.mf.internal.dvt.loadJS = function (url, success, failure)
  {
    var head = document.getElementsByTagName("head")[0];
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;
    script.async = false;
    script.onload = success;
    script.onerror = failure;
    head.appendChild(script);
  }

  // XXX - Hack because of geomap dependency on dvtm namespace!
  adf.mf.internal.dvt.DvtmObject.createPackage('dvtm');
  dvtm.loadJS = adf.mf.internal.dvt.loadJS;

  // DVT geographic map rendering context for the renderMap callback
  adf.mf.internal.dvt.geoMapContext =
  {
    'amxNode' : null,
    'mapCavas' : null,
    'width' : 0,
    'height' : 0,
    'timer' : null
  };

  // a global callback for the geographic map rendering
  window.renderMap = function ()
  {
    // retrieve the context
    var amxNode = adf.mf.internal.dvt.geoMapContext['amxNode'];
    var data = amxNode['_dataObj'];
    var mapCanvas = adf.mf.internal.dvt.geoMapContext['mapCanvas'];
    var width = adf.mf.internal.dvt.geoMapContext['width'];
    var height = adf.mf.internal.dvt.geoMapContext['height'];
    var timer = adf.mf.internal.dvt.geoMapContext['timer'];
    var instance = amxNode[adf.mf.internal.dvt.INSTANCE];

    try
    {
      if (window._isGeoMapApiSuccessfullyLoaded(instance.getMapProvider()))
      {
        // API has been successfully loaded. Clear interval if needed and render the map.
        if (timer)
        {
          clearTimeout(timer);
          adf.mf.internal.dvt.geoMapContext['timer'] = null;
        }
        instance.render(mapCanvas, data, width, height);
      }
      else
      {
        if (!timer)
        {
          /*
           Timer has not been initialized -> we know for sure that API has been loaded and that it hasn't
           been loaded successfully unfortunatelly
          */
          adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, "adf.mf.internal.dvt.geographicMap", "renderGeographicMap", "Failed to load Map API!");
        }
        else
        {
          // Timer has been set up to periodically check if the API is ready and it is not ready
          // Increment API check counter or clear interval if api check count has exceeded the max count
          if (this._apiCheckCount >= GeographicMapRenderer.apiCheckCountMax)
          {
            if (timer)
            {
              adf.mf.internal.dvt.geoMapContext['timer'] = null;
            }
          }
          else
          {
            this._apiCheckCount++;
            adf.mf.internal.dvt.geoMapContext['timer'] = setTimeout(renderMap, GeographicMapRenderer.apiCheckPeriodInMs);
          }
        }
      }
    } catch(e)
    {
      if (timer)
      {
        clearTimeout(timer);
        adf.mf.internal.dvt.geoMapContext['timer'] = null;
      }
      throw e;
    }
  };

  /**
   * Process the point data layer tag
   * 
   * @throws NodeNotReadyToRenderException exception thrown in case that the model is not ready
   */
  adf.mf.internal.dvt.processGeographicMapPointDataLayerTags = function(amxNode, node, setMapProp)
  {
    var data = amxNode["_dataObj"];

    var children = node.getChildren();
    var iter = adf.mf.api.amx.createIterator(children);

    while (iter.hasNext())
    {
      var pointDataLayerNode = iter.next();

      if (pointDataLayerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(pointDataLayerNode.getAttribute('rendered')))
        continue;

      // accept only dvtm:pointDataLayer nodes
      if (pointDataLayerNode.getTag().getName() !== 'pointDataLayer')
      {
        continue;
      }

      // if the model is not ready don't render the map
      if (!pointDataLayerNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
      }
      
      // if rendering for the first time, add dummy div's for each data layer
      if (!amxNode['_refreshing'])
      {
        var layerNode = pointDataLayerNode.render();
        if (layerNode)
        {
          amxNode['_dataLayerDivs'].push(layerNode);
        }
      }
      
      var dataLayer = {};
      
      var idx = iter.getRowKey();
      dataLayer['idx'] = idx;

      adf.mf.internal.dvt.processSingleGeographicMapPointDataLayerTag(amxNode, pointDataLayerNode, dataLayer);      

      data['dataLayers'].push(dataLayer);
    }
  }

  adf.mf.internal.dvt.processSingleGeographicMapPointDataLayerTag = function (amxNode, pointDataLayerNode, dataLayer)
  {
    var attr;
    var idx = dataLayer['idx'];

    attr = pointDataLayerNode.getAttribute('id');
    if (attr)
      dataLayer['id'] = attr;

    attr = pointDataLayerNode.getAttribute('animationOnDuration');
    if (attr)
      dataLayer['animationOnDuration'] = attr;

    attr = pointDataLayerNode.getAttribute('animationOnDataChange');
    if (attr)
      dataLayer['animationOnDataChange'] = attr;

    var strSelections = "";
    var k;
    if (amxNode['_currentSelection'] !== undefined)
    {    
      for (k = 0; k < amxNode['_currentSelection'].length; k++)
      {
        if (k)
          strSelections += " ";
        strSelections += amxNode['_currentSelection'][k];
      }
      dataLayer['selectedRowKeys'] = strSelections;
    }
    else
    {
      attr = pointDataLayerNode.getAttribute('selectedRowKeys');
      if (attr)
      {
        // geomap renderer currently expects selected rowkeys as a space-separated string
        // TODO: fix this when the renderer accepts an array
        var arSelections = AttributeProcessor['ROWKEYARRAY'](attr);    
        if (arSelections && arSelections.length > 0)
        {
          for (k = 0; k < arSelections.length; k++)
          {
            if (k)
              strSelections += " ";
            strSelections += arSelections[k];
          }
        }
        dataLayer['selectedRowKeys'] = strSelections;
      }
    }
    attr = pointDataLayerNode.getAttribute('dataSelection');
    if (attr)
      dataLayer['dataSelection'] = attr;

    attr = pointDataLayerNode.getAttributeExpression('selectionListener');
    if (attr) {
      var selectionListenerCache = amxNode['_selectionListenerCache'];
      if (idx !== undefined && selectionListenerCache[idx] === undefined) {
        selectionListenerCache[idx] = attr;
      }
    }

    attr = pointDataLayerNode.getAttribute('emptyText');
    if (attr)
      dataLayer['emptyText'] = attr;

    adf.mf.internal.dvt.processGeographicMapPointLocationTag(amxNode, dataLayer, pointDataLayerNode);
  }

  adf.mf.internal.dvt.processGeographicMapPointLocationTag = function(amxNode, dataLayer, pointDataLayerNode)
  {
    dataLayer['data'] = [];
    var varName = pointDataLayerNode.getAttribute('var');
    var value = pointDataLayerNode.getAttribute('value');

    if(amx.dtmode && value && value.replace(/\s+/g, '').indexOf('#{') > -1) {
      return;
    }
    
    if(value)
    {
      // collection is available so iterate through data and process each pointLocation
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext())
      {
        var stamp = iter.next();
        var children = pointDataLayerNode.getChildren(null, iter.getRowKey());
        // set context variable for child tag processing
        adf.mf.el.addVariable(varName, stamp);
        // iteration through all child elements
        var iter2 = adf.mf.api.amx.createIterator(children);
        while (iter2.hasNext())
        {
          var pointLocNode = iter2.next();
          var rowKey = iter.getRowKey();
           // process each location node
          adf.mf.internal.dvt._processGeographicMapPointLocation(amxNode, dataLayer, pointLocNode, rowKey);
        }
        adf.mf.el.removeVariable(varName);
      }
    }
    else
    {
      // collection does not exist so iterate only through child tags
      // and resolve them without var context variable
      var tagChildren = pointDataLayerNode.getChildren();
      var childTagIterator = adf.mf.api.amx.createIterator(tagChildren);

      while (childTagIterator.hasNext())
      {
        var tagPointLocNode = childTagIterator.next();
        var tagRowKey = "" + (childTagIterator.getRowKey() + 1);
         // process each location node
        adf.mf.internal.dvt._processGeographicMapPointLocation(amxNode, dataLayer, tagPointLocNode, tagRowKey);
      }
    }
  }

  adf.mf.internal.dvt._processGeographicMapPointLocation = function(amxNode, dataLayer, pointLocNode, rowKey)
  {
    // accept dvtm:pointLocation only
    if (pointLocNode.getTag().getName() !== 'pointLocation')
    {
      return;
    }

    if (pointLocNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(pointLocNode.getAttribute('rendered')))
    {
      return;
    }

    var data = {};

    if (pointLocNode.isAttributeDefined('type'))
    {
      data['type'] = pointLocNode.getAttribute('type');
    }
    if (pointLocNode.isAttributeDefined('pointX') && pointLocNode.isAttributeDefined('pointY'))
    {
      data['x'] = pointLocNode.getAttribute('pointX');
      data['y'] = pointLocNode.getAttribute('pointY');
    }
    else if (pointLocNode.isAttributeDefined('address'))
    {
      data['address'] = pointLocNode.getAttribute('address');
    }

    if (pointLocNode.isAttributeDefined('id'))
    {
      data['id'] = pointLocNode.getAttribute('id');
    }

    var markerNodes = pointLocNode.getChildren();

    if (markerNodes.length > 0 && markerNodes[0].getTag().getName() === 'marker')
    {
      data['_rowKey'] = rowKey;
      adf.mf.internal.dvt.processGeographicMapDataItem(amxNode, data, markerNodes[0]);
    }

    dataLayer['data'].push(data);
  }

  adf.mf.internal.dvt.processGeographicMapDataItem = function(amxNode, data, dataNode)
  {
    // First check if this data item should be rendered at all
    if (dataNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataNode.getAttribute('rendered')))
      return;

    if (dataNode.isAttributeDefined('source'))
      data['source'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('source'));

    if (dataNode.isAttributeDefined('sourceHover'))
      data['sourceHover'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHover'));

    if (dataNode.isAttributeDefined('sourceSelected'))
      data['sourceSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceSelected'));

    if (dataNode.isAttributeDefined('sourceHoverSelected'))
      data['sourceHoverSelected'] = adf.mf.api.amx.buildRelativePath(dataNode.getAttribute('sourceHoverSelected'));

    if (dataNode.isAttributeDefined('shortDesc'))
      data['shortDesc'] = dataNode.getAttribute('shortDesc');

    data['clientId'] = dataNode.getId();

    if (dataNode.isAttributeDefined('action'))
    {
      data['action'] = data['_rowKey'];
    }
    else {
      var firesAction = false;
      var actionTags;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
      actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else {
        actionTags = dataNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction) {
        data['action'] = data['_rowKey'];
      }
    }
  }

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'geographicMap', GeographicMapRenderer);
})();
(function() {

  var ArrayItemRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(ArrayItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.nbox.ArrayItemRenderer');

  ArrayItemRenderer.prototype.GetArrayName = function()
  {
    return null;
  };

  ArrayItemRenderer.prototype.ProcessAttributes = function(options, markerNode, context)
  {
    if (!markerNode.getAttribute ("rendered"))
      return false;
    var arrayName = this.GetArrayName();
    if (!arrayName)
      throw new adf.mf.internal.dvt.exception.DvtmException("ArrayName not specified!");
    if (!options [arrayName])
      options [arrayName] = [];
    var array = options [arrayName];

    var result = this.ProcessArrayItem(options, markerNode, context);
    array.push (result);
    return true;
  };

  ArrayItemRenderer.prototype.ProcessArrayItem = function(options, markerNode, context)
  {
    return {};
  };
})();
(function() {

  var NBoxCellRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxCellRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxCellRenderer');

  NBoxCellRenderer.prototype.GetArrayName = function()
  {
    return "cells";
  };

  NBoxCellRenderer.prototype.ProcessArrayItem = function(options, cellNode, context)
  {
    NBoxCellRenderer.superclass.ProcessArrayItem.call(this, options, cellNode, context);
    var cell = {};
    if (cellNode.getAttribute("row"))
      cell ['row'] = cellNode.getAttribute("row");
    if (cellNode.getAttribute("column"))
      cell ['column'] = cellNode.getAttribute("column");
    if (cellNode.getAttribute("label")) {
      var label = {}
      cell ['label'] = label;
      label ['text'] = cellNode.getAttribute("label");
      if (cellNode.getAttribute("labelHalign")) {
        label ['halign'] = cellNode.getAttribute("labelHalign");
      }
      if (cellNode.getAttribute("labelStyle")) {
        label ['style'] = cellNode.getAttribute("labelStyle");
      }
    }
    if (cellNode.getAttribute("showCount"))
      cell ['showCount'] = "on";
    if (cellNode.getAttribute("showMaximize"))
      cell ['showMaximize'] = "on";
    if (cellNode.getAttribute("background"))
      cell ['style'] = "background-color:" + cellNode.getAttribute("background");
    return cell;
  };
})();
(function() {

  var NBoxColumnRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxColumnRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxColumnRenderer');

  NBoxColumnRenderer.prototype.GetArrayName = function()
  {
    return "columns";
  };

  NBoxColumnRenderer.prototype.ProcessArrayItem = function(options, columnNode, context)
  {
    var column = {};
    if (columnNode.getAttribute("value"))
      column ['value'] = columnNode.getAttribute("value");
    if (columnNode.getAttribute("label")) {
      var label = {}
      column ['label'] = label;
      label ['text'] = columnNode.getAttribute("label");
//        if (columnNode.getAttribute ("labelHalign")) {
//            label ['halign'] = columnNode.getAttribute ("labelHalign");
//        }
      if (columnNode.getAttribute("labelStyle")) {
        label ['style'] = columnNode.getAttribute("labelStyle");
      }
    }
    return column;
  };
})();
(function() {

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.nbox');

  adf.mf.internal.dvt.nbox.DefaultNBoxStyle =
    {
      'styleDefaults':
        {
          // default color palette
          'color': ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
          // default shapes
          'shape': ['circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human'],
          // default indicator color palette
          'indicatorColor': ["#267db3", "#68c182"],
          // default patterns
          'pattern': ['smallChecker', 'smallCrosshatch', 'smallDiagonalLeft', 'smallDiagonalRight', 'smallDiamond', 'smallTriangle', 'largeChecker', 'largeCrosshatch', 'largeDiagonalLeft', 'largeDiagonalRight', 'largeDiamond', 'largeTriangle']
        }
    };
})();
(function() {

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;


  var NBoxMarkerRenderer = function()
  {
  }

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxMarkerRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.nbox.NBoxMarkerRenderer');

  NBoxMarkerRenderer.prototype.ProcessAttributes = function(options, amxNode, context)
  {
    if (!amxNode.getAttribute ("rendered"))
        return;
    var facetName = amxNode.getTag().getParent().getAttribute('name');
    var marker = options ['_currentNode'] [facetName];
    if (!marker) {
      marker = {};
      options ['_currentNode'] [facetName] = marker;
    }

    if (amxNode.getAttribute("color"))
      marker.color = amxNode.getAttribute("color");
    if (amxNode.getAttribute("gradientEffect"))
      marker.gradientEffect = amxNode.getAttribute("gradientEffect");
    if (amxNode.getAttribute("height"))
      marker.height = amxNode.getAttribute("height");
    if (amxNode.getAttribute("opacity"))
      marker.opacity = amxNode.getAttribute("opacity");
    if (amxNode.getAttribute ("rendered"))
      marker.scaleX = amxNode.getAttribute ("rendered");
    if (amxNode.getAttribute("scaleX"))
      marker.scaleX = amxNode.getAttribute("scaleX");
    if (amxNode.getAttribute("scaleY"))
      marker.scaleY = amxNode.getAttribute("scaleY");
    if (amxNode.getAttribute("shape"))
      marker.shape = amxNode.getAttribute("shape");
    if (amxNode.getAttribute("pattern"))
      marker.shape = amxNode.getAttribute("pattern");
    if (amxNode.getAttribute("source"))
      marker.source = adf.mf.api.amx.buildRelativePath(amxNode.getAttribute("source"));
    if (amxNode.getAttribute("width"))
      marker.width = amxNode.getAttribute("width");
    
    // resolve attribute groups
    var attributeChildren = amxNode.getChildren();
    for (var i = 0; i < attributeChildren.length; i++) {
      var ag = attributeChildren [i];
      var rendered = ag.getAttribute ('rendered');
      if (rendered) {
        AttributeGroupManager.processAttributeGroup(ag, context.amxNode, context);
        var attrGrp = AttributeGroupManager.findGroupById(context.amxNode, AttributeGroupManager._getAttributeGroupId(ag));
        attrGrp._facetName = facetName;
      }
    }
    AttributeGroupManager.registerDataItem(context, marker, null);
    
    return true;
  };
})();
(function() {

  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  var NBoxNodeRenderer = function()
  {
  }

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxNodeRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxNodeRenderer');

  NBoxNodeRenderer.prototype.GetArrayName = function()
  {
    return "nodes";
  };

  NBoxNodeRenderer.prototype.ProcessArrayItem = function(options, nodeNode, context)
  {
    var node = {};
    options._currentNode = node;
    if (nodeNode.getAttribute("color"))
      node.color = nodeNode.getAttribute("color");
    if (nodeNode.getAttribute("column"))
      node.column = nodeNode.getAttribute("column");
    node.id = nodeNode.getStampKey();
    var label;
    if (nodeNode.getAttribute("label"))
      label = {text: nodeNode.getAttribute("label")};
    if (nodeNode.getAttribute("labelStyle")) {
      if (label)
        label.style = nodeNode.getAttribute("labelStyle");
      else
        label = {style: nodeNode.getAttribute("labelStyle")};
    }
    if (label)
      node.label = label;
    if (nodeNode.getAttribute("row"))
      node.row = nodeNode.getAttribute("row");
    var secondaryLabel;
    if (nodeNode.getAttribute("secondaryLabel"))
      secondaryLabel = {text: nodeNode.getAttribute("secondaryLabel")};
    if (nodeNode.getAttribute("secondaryLabelStyle")) {
      if (secondaryLabel)
        secondaryLabel.style = nodeNode.getAttribute("secondaryLabelStyle");
      else
        secondaryLabel = {style: nodeNode.getAttribute("secondaryLabelStyle")};
    }
    if (secondaryLabel)
      node.secondaryLabel = secondaryLabel;
    if (nodeNode.getAttribute("shortDesc"))
      node.shortDesc = nodeNode.getAttribute("shortDesc");
    if (nodeNode.getAttribute("xPercentage"))
      node.xPercentage = nodeNode.getAttribute("xPercentage");
    if (nodeNode.getAttribute("yPercentage"))
      node.yPercentage = nodeNode.getAttribute("yPercentage");

    // resolve attribute groups
    var attributeChildren = nodeNode.getChildren();
    for (var i = 0; i < attributeChildren.length; i++) {
      var ag = attributeChildren [i];
      var rendered = ag.getAttribute ('rendered');
      if (rendered)
        AttributeGroupManager.processAttributeGroup(ag, context.amxNode, context);
    }
    AttributeGroupManager.registerDataItem(context, node, null);
    return node;
  };

  NBoxNodeRenderer.prototype.GetChildrenNodes = function(amxNode, context)
  {
    var nodes = [];
    this._forEachFacet(function(facet) {
      nodes = nodes.concat(this._GetFacetChildrenNodes(amxNode, facet));
    });
    return nodes;
  };

  NBoxNodeRenderer.prototype._GetFacetChildrenNodes = function(amxNode, facet)
  {
    var children = [];
    var facetChildren = amxNode.getChildren(facet);
    for (var i = 0; i < facetChildren.length; i++) {
      var child = facetChildren [i];
      if (child.getTag().getName() === "iterator") {
        var it = adf.mf.api.amx.createIterator(child.getAttribute("value"));
        while (it.hasNext())
        {
          it.next();
          var iteratorChild = child.getChildren(null, it.getRowKey()) [0];
          children.push(iteratorChild);
        }
      } else {
        children.push(child);
      }
    }
    return children;
  };


  /**
   * @param facetName name of the facet for which the map of the renderers is requested
   * @return map of the child renderers for given facetName
   */
  NBoxNodeRenderer.prototype.GetChildRenderers = function(facetName)
  {
    if (this._renderers === undefined)
    {
      this._renderers =
        {
          'marker': {'renderer': new adf.mf.internal.dvt.nbox.NBoxMarkerRenderer()}
        };
    }
    return this._renderers;
  };

  /**
   * Returns array of used facet names.
   * 
   * @returns {Array.<string>} supported facet's names
   */
  NBoxNodeRenderer.prototype.GetFacetNames = function()
  {
    if (this._facetNames === undefined)
    {
      this._facetNames = ['icon', 'indicator'];
    }
    return this._facetNames;
  };

  /**
   * Calls given function for each facet name.
   * 
   * @param {String} _function
   */
  NBoxNodeRenderer.prototype._forEachFacet = function(_function)
  {
    var facets = this.GetFacetNames();
    for (var i = 0; i < facets.length; i++)
      _function.call(this, facets [i]);
  };
})();
(function() {

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;


  var NBoxRenderer = function()
  {
  };

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.nbox.NBoxRenderer');


  /**
   * Returns array of used facet names.
   * 
   * @returns {Array.<string>} supported facet's names
   */
  NBoxRenderer.prototype.GetFacetNames = function()
  {
    if (this._facetNames === undefined)
    {
      this._facetNames = ["rows", "columns", "cells"];
    }
    return this._facetNames;
  };

  /**
   * Calls given function for each facet name.
   * 
   * @param {String} _function
   */
  NBoxRenderer.prototype._forEachFacet = function(_function)
  {
    var facets = this.GetFacetNames();
    for (var i = 0; i < facets.length; i++)
      _function.call(this, facets [i]);
  };


  // createChildrenNodes .....................................................

  /**
   * Creates all children AMXNode(s).
   * 
   * @param {AMXNode} amxNode
   * @returns {Boolean}
   */
  NBoxRenderer.prototype.createChildrenNodes = function(amxNode)
  {
    // create a cache of rowKeys to be removed in case of model update
    amxNode['_currentRowKeys'] = [];

    // we want to skip the value validation if we are in dt mode
    if (!amx.dtmode)
    {
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);

      var dataItems = amxNode.getAttribute('value');
      var varName = amxNode.getAttribute('var');
      if (varName != null && dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }

      var iter = null;
      if (dataItems)
        iter = adf.mf.api.amx.createIterator(dataItems);

      // copied from amx:listView - on refresh the component need to initiate
      // loading of rows not available in the cache
      if (iter !== null && iter.getTotalCount() > iter.getAvailableCount())
      {
        adf.mf.api.amx.showLoadingIndicator();
        //var currIndex = dataItems.getCurrentIndex();
        adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function()
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
          function()
          {
            adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
            adf.mf.api.amx.hideLoadingIndicator();
          });

        amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
        return true;
      }

      if (iter === null) {
        var children = amxNode.getTag ().getChildren();
        for (var i = 0; i < children.length; i++) {
          var tag = children [i];
          if (tag.getName () !== "nBoxNode")
            continue;
          var node = tag.buildAmxNode(amxNode);
          amxNode.addChild(node);
        }
      }
      while (iter !== null && iter.hasNext())
      {
        var item = iter.next();
        amxNode['_currentRowKeys'].push(iter.getRowKey());
        adf.mf.el.addVariable(varName, item);
        amxNode.createStampedChildren(iter.getRowKey(), [null]);//facets);
        adf.mf.el.removeVariable(varName);
      }
    }

    this._forEachFacet(function(facet) {
      this._createFacetChildrenNodes(amxNode, facet);
    });

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  /**
   * Creates all AMXNode(s) for given facet name.
   * 
   * @param {AMXNode} amxNode
   * @param {String} facet name
   */
  NBoxRenderer.prototype._createFacetChildrenNodes = function(amxNode, facet)
  {
    var facetTag = amxNode.getTag().getChildFacetTag(facet);
    if (facetTag) {
      var children = facetTag.getChildren();
      for (var i = 0; i < children.length; i++) {
        var node = children [i].buildAmxNode(amxNode);
        amxNode.addChild(node, facet);
      }
    }
  };

  // updateChildren ....................................................

  NBoxRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // when a data change occurs, just replace the node
    return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
  };

  // visitChildren .....................................................

  NBoxRenderer.prototype.visitChildren = function(amxNode, visitContext, callback)
  {
    try {
      var dataItems = amxNode.getAttribute('value');

      if (dataItems === undefined)
      {
        return amxNode.visitStampedChildren(null, null, null, visitContext, callback);
      }

      var varName = amxNode.getAttribute('var');
      var iter = adf.mf.api.amx.createIterator(dataItems);

      while (iter.hasNext())
      {
        var item = iter.next();
        adf.mf.el.addVariable(varName, item);
        try
        {
          if (amxNode.visitStampedChildren(iter.getRowKey(), null/*facets*/, null, visitContext, callback))
          {
            return true;
          }
        }
        finally
        {
          adf.mf.el.removeVariable(varName);
        }
      }

      this._forEachFacet(function(facet) {
        this._visitFacetChildren(amxNode, visitContext, callback, facet);
      });

    } catch (ex) {
      adf.mf.log.Framework.logp(adf.mf.log.level.SEVERE, this.getTypeName(), "_renderComponent", "Exception: " + ex.message + " (line: " + ex.line + ")");
    }
    return false;
  };

  NBoxRenderer.prototype._visitFacetChildren = function(amxNode, visitContext, callback, facet)
  {
    var children = amxNode.getChildren(facet);
    for (var i = 0; i < children.length; i++)
    {
      children[i].visit(visitContext, callback);
    }
  };


  // render ..................................................................

  NBoxRenderer.prototype.render = function(amxNode, id) {
    return NBoxRenderer.superclass.render.call(this, amxNode, id);
  }

  NBoxRenderer.prototype.getDescendentChangeAction = function(amxNode, descendentChanges)
  {
    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  }

  NBoxRenderer.prototype.GetDefaultStyles = function(amxNode)
  {
    return adf.mf.internal.dvt.nbox.DefaultNBoxStyle;
  };

  /**
   * Merge default and custom options
   */
  NBoxRenderer.prototype.MergeComponentOptions = function(amxNode)
  {
    NBoxRenderer.superclass.MergeComponentOptions.call(this, amxNode);

    // add default colors, shapes... to amxNode
    var options = amxNode["_optionsObj"];
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults && styleDefaults['color'])
    {
      amxNode['_defaultColors'] = styleDefaults['color'];
//        amxNode['_iconFill'] = styleDefaults['color'];
//        amxNode['_indicatorFill'] = styleDefaults['color'];
    }
    if (styleDefaults && styleDefaults['indicatorColor'])
    {
      amxNode['_indicatorColor'] = styleDefaults['indicatorColor'];
    }
    if (styleDefaults && styleDefaults['shape'])
    {
      amxNode['_defaultShapes'] = styleDefaults['shape'];
//        amxNode['_indicatorShape'] = styleDefaults['shape'];
//        amxNode['_iconShape'] = styleDefaults['shape'];
    }
    if (styleDefaults && styleDefaults['pattern'])
    {
      amxNode['_defaultPatterns'] = styleDefaults['pattern'];
//        amxNode['_indicatorPattern'] = styleDefaults['pattern'];
//        amxNode['_iconPattern'] = styleDefaults['pattern'];
    }
  }

  /**
   * @param facetName name of the facet for which the map of the renderers is requested
   * @return map of the child renderers for given facetName
   */
  NBoxRenderer.prototype.GetChildRenderers = function(facetName)
  {
    if (this._renderers === undefined)
    {
      this._renderers =
        {
          'facet':
            {
            },
          'simple':
            {
              'nBoxRow': {'renderer': new adf.mf.internal.dvt.nbox.NBoxRowRenderer()},
              // HACK facet renderrers are registerred as top level renderrers
              // because facet renderrers are ignored in 
              'nBoxColumn': {'renderer': new adf.mf.internal.dvt.nbox.NBoxColumnRenderer()},
              'nBoxCell': {'renderer': new adf.mf.internal.dvt.nbox.NBoxCellRenderer()},
              'nBoxNode': {'renderer': new adf.mf.internal.dvt.nbox.NBoxNodeRenderer()}
            }
        };
    }

    if (facetName !== undefined)
    {
      return this._renderers['facet'][facetName];
    }

    return this._renderers['simple'];
  };

  NBoxRenderer.prototype.GetCustomStyleProperty = function(amxNode)
  {
    return 'CustomNBoxStyle';
  };

  /**
   * @return object that describes styleClasses of the component.
   */
  NBoxRenderer.prototype.GetStyleClassesDefinition = function()
  {
    var styleClasses = NBoxRenderer.superclass.GetStyleClassesDefinition.call(this);

    //    styleClasses['_self'] = {'path' : 'plotArea/backgroundColor', 'type' : StyleProcessor['BACKGROUND']};

    styleClasses['dvtm-nBox-cell'] = [
      {'path': '_cell_border', 'type': BORDER},
      {'path': '_cell_backgroundColor', 'type': StyleProcessor['BACKGROUND']}
    ];
    styleClasses['dvtm-nBox-cell-label'] = [
      {'path': '_cell_label', 'type': StyleProcessor['CSS_TEXT']}
      //{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}
    ];
    styleClasses['dvtm-nBox-column-label'] = [
      {'path': '_column_label', 'type': StyleProcessor['CSS_TEXT']}
      //{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}
    ];
    styleClasses['dvtm-nBox-row-label'] = [
      {'path': '_row_label', 'type': StyleProcessor['CSS_TEXT']}
      //{'path' : '_cell_label_align', 'type' : TEXT_ALIGN}
    ];
    styleClasses['dvtm-nBox-columns-title'] = [
      {'path': 'columnsTitle/style', 'type': StyleProcessor['CSS_TEXT']}
    ];
    styleClasses['dvtm-nBox-rows-title'] = [
      {'path': 'rowsTitle/style', 'type': StyleProcessor['CSS_TEXT']}
    ];

    return styleClasses;
  };

  NBoxRenderer.prototype.ProcessStyleClasses = function(node, amxNode)
  {
    NBoxRenderer.superclass.ProcessStyleClasses.call(this, node, amxNode);
    var options = amxNode._optionsObj;

    var cells = options ['cells'];
    if (cells) {
      for (var i = 0; i < cells.length; i++) {
        var cell = cells [i];

        if (options ['_cell_backgroundColor']) {
          if (cell ['style']) {
            //cell ['style'] = "background-color:" + options ['_cells_backgroundColor'] + ';' + cell ['style'];
          } else
            cell ['style'] = "background-color:" + options ['_cell_backgroundColor'];
        }
        if (options ['_cell_border']) {
          if (cell ['style']) {
            cell ['style'] = "border:" + options ['_cell_border'] + ';' + cell ['style'];
          } else
            cell ['style'] = "border:" + options ['_cell_border'];
        }
        var cellLabel = cell ['label'];
        if (cellLabel) {
          if (options ['_cell_label']) {
            if (cellLabel ['style']) {
              cellLabel ['style'] = options ['_cell_label'] + ';' + cellLabel ['style'];
            } else
              cellLabel ['style'] = options ['_cell_label'];
          }
          if (options ['_cell_label_align']) {
            cellLabel ['halign'] = options ['_cell_label_align'];
          }
        }
      }
    }

    var columns = options ['columns'];
    if (columns) {
      for (var i = 0; i < columns.length; i++) {
        var column = columns [i];
        var columnLabel = column ['label'];
        if (columnLabel) {
          if (options ['_column_label']) {
            if (columnLabel ['style']) {
              columnLabel ['style'] = options ['_column_label'] + ';' + columnLabel ['style'];
            } else
              columnLabel ['style'] = options ['_column_label'];
          }
//                    if (options ['_column_label_align']) {
//                        columnLabel ['halign'] = options ['_column_label_align'];
//                    }
        }
      }
    }

    var rows = options ['rows'];
    if (rows) {
      for (var i = 0; i < rows.length; i++) {
        var row = rows [i];
        var rowLabel = row ['label'];
        if (rowLabel) {
          if (options ['_row_label']) {
            if (rowLabel ['style']) {
              rowLabel ['style'] = options ['_row_label'] + ';' + rowLabel ['style'];
            } else
              rowLabel ['style'] = options ['_row_label'];
          }
//                    if (options ['_row_label_align']) {
//                        rowLabel ['halign'] = options ['_row_label_align'];
//                    }
        }
      }
    }

    delete options ['_cell_backgroundColor'];
    delete options ['_cell_border'];
    delete options ['_cell_label'];
    delete options ['_column_label'];
  };

  /**
   * Initialize generic options for all chart component.
   */
  NBoxRenderer.prototype.InitComponentOptions = function(amxNode)
  {
    NBoxRenderer.superclass.InitComponentOptions.call(this, amxNode);
    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
    amxNode["_optionsObj"] = {};
    AttributeGroupManager.reset(amxNode);
  };

  NBoxRenderer.prototype.GetAttributesDefinition = function()
  {
    var attrs = NBoxRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['animationOnDataChange'] = {'path': 'animationOnDataChange', 'type': AttributeProcessor['TEXT']};
    attrs['animationOnDisplay'] = {'path': 'animationOnDisplay', 'type': AttributeProcessor['TEXT']};
    attrs['columnsTitle'] = {'path': 'columnsTitle/text', 'type': AttributeProcessor['TEXT']};
//      attrs['columnsTitleStyle'] = {'path' : 'columnsTitle/style', 'type' : AttributeProcessor['TEXT']};
    attrs['emptyText'] = {'path': 'emptyText', 'type': AttributeProcessor['TEXT']};
    attrs['groupBy'] = {'path': 'groupBy', 'type': PROP_TEXT_ARRAY};
    attrs['groupBehavior'] = {'path': 'groupBehavior', 'type': PROP_TEXT};
    attrs['highlightedRowKeys'] = {'path': 'highlightedItems', 'type': PROP_ROW_KEYS};
    attrs['legendDisplay'] = {'path': 'legendDisplay', 'type': PROP_TEXT};
    attrs['maximizedColumn'] = {'path': 'maximizedColumn', 'type': PROP_TEXT};
    attrs['maximizedRow'] = {'path': 'maximizedRow', 'type': PROP_TEXT};
    attrs['nodeSelection'] = {'path' : 'selection', 'type' : PROP_TEXT};
    attrs['otherThreshold'] = {'path': 'otherThreshold', 'type': PROP_TEXT};
    attrs['rowsTitle'] = {'path': 'rowsTitle/text', 'type': AttributeProcessor['TEXT']};
    attrs['selectedRowKeys'] = {'path': 'selectedItems', 'type': PROP_ROW_KEYS};
//      attrs['rowsTitleStyle'] = {'path' : 'rowsTitle/style', 'type' : AttributeProcessor['TEXT']};
    return attrs;
  };

  NBoxRenderer.prototype.ProcessAttributes = function(options, amxNode, context)
  {
    NBoxRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);
    var selectionListener = amxNode.getAttributeExpression("selectionListener");
    amxNode['_selectionListener'] = selectionListener;
  };

  NBoxRenderer.prototype.GetChildrenNodes = function(amxNode, context)
  {
    var nodes = [];
    this._forEachFacet(function(facet) {
      nodes = nodes.concat(this._GetFacetChildrenNodes(amxNode, facet));
    });
    nodes = nodes.concat(this._getNodesNodes(amxNode));
    nodes = nodes.concat(amxNode.getChildren ());
    return nodes;
  };

  NBoxRenderer.prototype._forEachNode = function(amxNode, context, f)
  {
    var nodes = this.GetChildrenNodes(amxNode, context);
    for (var i = 0; i < nodes.length; i++)
      f.call(this, nodes [i]);
  };

  NBoxRenderer.prototype._getNodesNodes = function(amxNode)
  {
    var nodesNodes = [];
    var value = amxNode.getAttribute('value');
    if (value)
    {
      var iter = adf.mf.api.amx.createIterator(value);
      while (iter.hasNext())
      {
        iter.next();
        var children = amxNode.getChildren(null, iter.getRowKey());
        if (children)
          nodesNodes = nodesNodes.concat(children);
      }
    }
    return nodesNodes;
  };

  NBoxRenderer.prototype._GetFacetChildrenNodes = function(amxNode, facet)
  {
    var children = [];
    var facetChildren = amxNode.getChildren(facet);
    for (var i = 0; i < facetChildren.length; i++) {
      var child = facetChildren [i];
      if (child.getTag().getName() === "iterator") {
        var it = adf.mf.api.amx.createIterator(child.getAttribute("value"));
        while (it.hasNext())
        {
          it.next();
          var iteratorChild = child.getChildren(null, it.getRowKey()) [0];
          children.push(iteratorChild);
        }
      } else {
        children.push(child);
      }
    }
    return children;
  };

  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  NBoxRenderer.prototype.ProcessChildren = function(options, amxNode, context)
  {
    AttributeGroupManager.init(context);
    NBoxRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
    if (!options ["nodes"])
      options ["nodes"] = [];
    delete options ['_currentNode'];
    var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
    config.setUpdateCategoriesCallback(
      function(attrGrp, dataItem, valueIndex, exceptionRules) {
        if (!dataItem['categories'])
          dataItem['categories'] = [];
        var categories = dataItem['categories'];

        if (attrGrp.isContinuous()) {
          categories.push(attrGrp.getId() + ":" + valueIndex);
        } else {
          categories.push(attrGrp.getId() + ":" + attrGrp.getCategoryValue(valueIndex));
        }

        var rules = exceptionRules.getRules();
        for (var i = 0; i < rules.length; i++) {
          categories.push(attrGrp.getId() + ":" + rules[i]['value']);
        }
      }
    );
    config.addTypeToDefaultPaletteMapping('indicatorColor', 'color');
    AttributeGroupManager.applyAttributeGroups(amxNode, config, context);

    var attributeGroups = [];
    options ['attributeGroups'] = attributeGroups;
    var _attributeGroups = amxNode['_attributeGroups'];
    for (var i = 0; i < _attributeGroups.length; i++)
    {
      var _attributeGroup = _attributeGroups [i];
      var description = _attributeGroup.getDescription();
      if (_attributeGroup._facetName) {
        var type = description.type;
        if (type === 'color')
          type = _attributeGroup._facetName + 'Fill';
        else
        if (type === 'shape')
          type = _attributeGroup._facetName + 'Shape';
        else
        if (type === 'pattern')
          type = _attributeGroup._facetName + 'Pattern';
        description.type = type;
      }
      attributeGroups.push(description);
    }
  };
  
  NBoxRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var callbackObject =
      {
        'callback': function(event, component)
          {
            // fire the selectionChange event
            var type = event.getType();
            if (type === DvtSelectionEvent.TYPE) {
              var se = new adf.mf.api.amx.SelectionEvent(null, event.getSelection());
              adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se,
                function()
                {
                  var el = amxNode['_selectionListener'];
                  if (el)
                    adf.mf.api.amx.invokeEl(el, [se], null, [se[".type"]]);
                });
            }
          }
      };

    //TODO selectionListener
    if (amxNode.isAttributeDefined('selectionListener'))
      callbackObject['selectionListener'] = amxNode.getAttributeExpression('selectionListener');

    return callbackObject;
  };

  NBoxRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtNBox.newInstance(context, callback, callbackObj, null);
    context.getStage().addChild(instance);
    return instance;
  };

  /**
   * Function renders instance of the component
   */
  NBoxRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var data = null;
    if (this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
      if (amx.dtmode) {
          if (!data.rows || data.rows.length < 1) {
              data.rows = [{value:"low"}, {value:"medium"}, {value:"high"}];
          }
          if (!data.columns || data.columns.length < 1) {
              data.columns = [{value:"low"}, {value:"medium"}, {value:"high"}];
          }
          if (!data.nodes || data.nodes.length < 1) {
              data.nodes = [{row:"low", column: "low"}];
          }
          if (!data.rowsTitle)
              data.rowsTitle = {};
          if (!data.rowsTitle.text)
              data.rowsTitle.text = "";
          if (!data.columnsTitle)
              data.columnsTitle = {};
          if (!data.columnsTitle.text)
              data.columnsTitle.text = "";
      }
      if (!data ['resources']) {
        data ['resources'] = {
          "close_dwn": {"height":16, "width":16, "src":"css/images/nBox/alta/close_dwn.png"},
          "overflow": {"height":9, "width":34, "src":"css/images/nBox/alta/overflow.png"},
          "close_ena": {"height":16, "width":16, "src":"css/images/nBox/alta/close_ena.png"},
          "close_ovr": {"height":16, "width":16, "src":"css/images/nBox/alta/close_ovr.png"},
          "legend_dwn": {"height":24,"width":24,"src":"css/images/panelDrawer/panelDrawer-legend-dwn.png"},
          "legend_ena": {"height":24,"width":24,"src":"css/images/panelDrawer/panelDrawer-legend-ena.png"},
          "legend_ovr": {"height":24,"width":24,"src":"css/images/panelDrawer/panelDrawer-legend-ovr.png"}
        };
      }
      if (!data ['attributeGroups'] ||
          !data ['attributeGroups'].length
      ) {
        data ['legendDisplay'] = 'off';
      }
    }
    instance.render(data, width, height);
  };


  // render ..................................................................

  NBoxRenderer.prototype.refresh = function (amxNode, attributeChanges, descendentChanges) {
      NBoxRenderer.superclass.refresh.call(this, amxNode, attributeChanges, descendentChanges);
  }

  NBoxRenderer.prototype.ResetComponentOptions = function(amxNode, attributeChanges, descendentChanges)
  {
    NBoxRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);
    amxNode["_optionsObj"] = {};
    AttributeGroupManager.reset(amxNode);
  };

  NBoxRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // NBox should not prevent swipe at the moment
    return false;
  };
  
  // property readers ........................................................

  var PROP_TEXT =
    function(value)
    {
      if (value !== null && value !== "")
      {
        return '' + value;
      }
      return undefined;
    };
  var PROP_TEXT_ARRAY =
    function(value)
    {
      if (value !== null && value !== "")
      {
        return ('' + value).split(" ");
      }
      return undefined;
    };
  var PROP_ROW_KEYS =
    function(value)
    {
      var array = AttributeProcessor['ROWKEYARRAY'] (value);
      if (array.length > 0)
      {
        var items = [];
        for (var i = 0; i < array.length; i++) {
          items.push({'id': array [i]});
        }
        return items;
      }
      return undefined;
    };
  var BACKGROUND =
    function(node, styleString)
    {
      var nodeStyle = window.getComputedStyle(node, null);
      var color = nodeStyle['background-color'];
      return color;
    }
  var TEXT_ALIGN =
    function(node, styleString)
    {
      var nodeStyle = window.getComputedStyle(node, null);
      var align = nodeStyle['text-align'];
      if ("start" === align)
        return null;
      return align;
    };
  var BORDER =
    function(node, styleString)
    {
      var nodeStyle = window.getComputedStyle(node, null);
      if (nodeStyle['border-top-style'].indexOf('none') >= 0)
          return null;
      if (nodeStyle['border-top-width'].indexOf('0') >= 0)
          return null;
      var border = nodeStyle['border-top-width'] + " " + nodeStyle['border-top-style'] + " " + nodeStyle['border-top-color'];
      return border;
    };

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'nBox', NBoxRenderer);
})();
(function() {

  var NBoxRowRenderer = function()
  {
  }

  adf.mf.internal.dvt.DvtmObject.createSubclass(NBoxRowRenderer, 'adf.mf.internal.dvt.nbox.ArrayItemRenderer', 'adf.mf.internal.dvt.nbox.NBoxRowRenderer');

  NBoxRowRenderer.prototype.GetArrayName = function()
  {
    return "rows";
  };

  NBoxRowRenderer.prototype.ProcessArrayItem = function(options, rowNode, context)
  {
    var row = {};
    if (rowNode.getAttribute("value"))
      row ['value'] = rowNode.getAttribute("value");
    if (rowNode.getAttribute("label")) {
      var label = {}
      row ['label'] = label;
      label ['text'] = rowNode.getAttribute("label");
//        if (columnNode.getAttribute ("labelHalign")) {
//            label ['halign'] = columnNode.getAttribute ("labelHalign");
//        }
      if (rowNode.getAttribute("labelStyle")) {
        label ['style'] = rowNode.getAttribute("labelStyle");
      }
    }
    return row;
  };
})();
(function(){

  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.thematicmap');
  
  adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyle = 
  {
    // marker properties
    'marker': 
    {
      // separator upper color
      'scaleX': 1.0,
      // separator lower color
      'scaleY': 1.0,
      // should display title separator
      'type': 'circle'
    },

    // thematic map legend properties
    'legend': 
    {
      // legend position none / auto / start / end / top / bottom
      'position': "auto",
      'rendered': true
    },
    
    // default style values - WILL BE DELETED AND NOT PASSED TO TOOLKIT
    'styleDefaults': {
      // default color palette
      'colors': ["#003366", "#CC3300", "#666699", "#006666", "#FF9900", "#993366", "#99CC33", "#624390", "#669933",
                 "#FFCC33", "#006699", "#EBEA79"],               
      // default marker shapes
      'shapes' : [ 'circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human']
    }
  };
  
  adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyleAlta = 
  {
    // marker properties
    'marker': 
    {
      // separator upper color
      'scaleX': 1.0,
      // separator lower color
      'scaleY': 1.0,
      // should display title separator
      'type': 'circle'
    },

    // thematic map legend properties
    'legend': 
    {
      // legend position none / auto / start / end / top / bottom
      'position': "auto",
      'rendered': true
    },
    
    // default style values - WILL BE DELETED AND NOT PASSED TO TOOLKIT
    'styleDefaults': {
      // default color palette
      'colors': ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default marker shapes
      'shapes' : [ 'circle', 'square', 'plus', 'diamond', 'triangleUp', 'triangleDown', 'human']
    }
  };
  /**
   * contains information about top layer for each basemap
   */
  adf.mf.internal.dvt.thematicmap.THEMATICMAP_DEFAULT_TOP_LAYER_MAPPING = 
  {
    'world' : 'continents', 
    'worldRegions' : 'regions', 
    'usa' : 'country', 
    'africa' : 'continent', 
    'asia' : 'continent', 
    'australia' : 'continent', 
    'europe' : 'continent', 
    'northAmerica' : 'continent', 
    'southAmerica' : 'continent', 
    'apac' : 'region', 
    'emea' : 'region', 
    'latinAmerica' : 'region', 
    'usaAndCanada' : 'region'
  };


})();
(function(){

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  var loadedCustomBasemaps = {};

  var ThematicMapRenderer = function ()
  { }

  adf.mf.internal.dvt.DvtmObject.createSubclass(ThematicMapRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.thematicmap.ThematicMapRenderer');

  /**
   * processes the components's child tags
   */
  ThematicMapRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      if(amx.dtmode)
      {
        this._renderers =
          {
            'areaLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaLayerRendererDT() }
          }
      }
      else
      {
        this._renderers =
          {
            'areaLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.AreaLayerRenderer(), 'order' : 1 } ,
            'pointDataLayer' : { 'renderer' : new adf.mf.internal.dvt.common.layer.PointDataLayerRenderer(), 'order' : 2 },
            'legend' : { 'renderer' : new LegendRenderer(), 'order' : 3, 'maxOccurrences' : 1 }
          };
      }
    }
    return this._renderers;
  }

  ThematicMapRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = ThematicMapRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['animationDuration'] = {'path' : 'animationDuration', 'type' : AttributeProcessor['INTEGER'], 'default' : 1000};
    attrs['animationOnDisplay'] = {'path' : 'animationOnDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['animationOnMapChange'] = {'path' : 'animationOnMapChange', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['initialZooming'] = {'path' : 'initialZooming', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['markerZoomBehavior'] = {'path' : 'markerZoomBehavior', 'type' : AttributeProcessor['TEXT'], 'default' : 'fixed'};
    attrs['zooming'] = {'path' : 'zooming', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['panning'] = {'path' : 'panning', 'type' : AttributeProcessor['TEXT'], 'default' : 'none'};
    attrs['basemap'] = {'path' : 'basemap', 'type' : AttributeProcessor['TEXT'], 'default' : 'world'};
    attrs['tooltipDisplay'] = {'path' : 'tooltipDisplay', 'type' : AttributeProcessor['TEXT'], 'default' : 'auto'};

    return attrs;
  }

   /**
   * @return object that describes styleClasses of the component.
   */
  ThematicMapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = ThematicMapRenderer.superclass.GetStyleClassesDefinition.call(this);

    styleClasses['dvtm-area'] = {'path' : 'styleDefaults/areaStyle', 'type' : [StyleProcessor['CSS_TEXT'], StyleProcessor['CSS_BACK']]};
    styleClasses['_self'] = {'path' : 'styleDefaults/background-color', 'type' : StyleProcessor['BACKGROUND']};
    styleClasses['dvtm-areaLayer'] = {'path' : 'styleDefaults/dataAreaDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']};
    styleClasses['dvtm-areaHover'] = {'path' : 'styleDefaults/dataAreaDefaults/hoverColor', 'type' : StyleProcessor['BORDER_COLOR']};
    styleClasses['dvtm-areaSelected'] = [{'path' : 'styleDefaults/dataAreaDefaults/selectedInnerColor', 'type' : StyleProcessor['TOP_BORDER']}, {'path' : 'styleDefaults/dataAreaDefaults/selectedOuterColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
    
    styleClasses['dvtm-legend'] = [{'path' : 'legend/textStyle', 'type' : StyleProcessor['CSS_TEXT']}, {'path' : 'legend/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'legend/borderColor', 'type' : StyleProcessor['TOP_BORDER_WHEN_WIDTH_GT_0PX']}];
    styleClasses['dvtm-legendTitle'] = {'path' : 'legend/titleStyle', 'type' : StyleProcessor['CSS_TEXT']};
    styleClasses['dvtm-legendSectionTitle'] = {'path' : 'legend/sectionTitleStyle', 'type' : StyleProcessor['CSS_TEXT']};

    styleClasses['dvtm-marker'] = [
      {'path' : 'styleDefaults/dataMarkerDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']},
      {'path' : 'styleDefaults/dataMarkerDefaults/color', 'type' : StyleProcessor['BACKGROUND']},
      {'path' : 'styleDefaults/dataMarkerDefaults/opacity', 'type' : StyleProcessor['OPACITY']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderStyle', 'type' : StyleProcessor['BORDER_STYLE']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']},
      {'path' : 'styleDefaults/dataMarkerDefaults/borderWidth', 'type' : StyleProcessor['BOTTOM_BORDER_WIDTH']}
    ];

    return styleClasses;
  }

  ThematicMapRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    ThematicMapRenderer.superclass.InitComponentOptions.call(this, amxNode);
    amxNode[adf.mf.internal.dvt.INSTANCE] = null;

    AttributeGroupManager.reset(amxNode);
    amxNode['_stylesResolved'] = false;

    amxNode["_optionsObj"] =
      {
        'animationDuration': 1000,
        'animationOnDisplay': 'none',
        'animationOnMapChange': 'none',
        'areaLayers': [],
        'basemap': {},
        'initialZooming': 'none',
        'markerZoomBehavior': 'fixed',
        'panning': 'none',
        'pointDataLayers': [],
        'styleDefaults': { 'dataAreaDefaults':{}, 'dataMarkerDefaults':{} },
        'tooltipDisplay': 'auto',
        'zooming': 'none',
        'legend': {}
      };

    if (amxNode['_selectionListenerCache'] === undefined)
      amxNode['_selectionListenerCache'] = {};
  }

  ThematicMapRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges, descendentChanges)
  {
    ThematicMapRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges, descendentChanges);

    amxNode['_attributeChanges'] = attributeChanges;

    // clear the 'dirty' flag on the options object
    adf.mf.internal.dvt.setOptionsDirty(amxNode, false);

    // dataObject will be recreated from scratch
    if (attributeChanges.hasChanged('value'))
    {
      amxNode["_dataObj"] = {'dataLayers': []};

      AttributeGroupManager.reset(amxNode);
      amxNode['_rowKeyCache'] = {};
    }
  }

  ThematicMapRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomThematicMapStyle';
  }

  ThematicMapRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    if (this.IsSkyros()) {
      return adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyle;
    } else {
      return adf.mf.internal.dvt.thematicmap.DefaultThematicMapStyleAlta;
    }
  }

  ThematicMapRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    ThematicMapRenderer.superclass.MergeComponentOptions.call(this, amxNode);

    var options = amxNode["_optionsObj"];

    if (options['marker'])
    {

      if (options['styleDefaults'] === undefined) {
        options['styleDefaults'] = {};
      }
      if (options['styleDefaults']['dataMarkerDefaults'] === undefined) {
        options['styleDefaults']['dataMarkerDefaults'] = {};
      }
      // marker styling
      if (options['marker']['type']) {
        // now it is shape, not type
        options['styleDefaults']['dataMarkerDefaults']['shape'] = options['marker']['type'];
      }
      // AMDAI removed scaleX and scaleY from options unfortunately
      /*if (options['marker']['scaleX'] != undefined)
         options['styleDefaults']['dataMarkerDefaults']['scaleX'] = options['marker']['scaleX'];
      if (options['marker']['scaleY'] != undefined)
         options['styleDefaults']['dataMarkerDefaults']['scaleY'] = options['marker']['scaleY'];*/
    }

    // extract default colors from styleDefaults and dispose styleDefaults so that it's not passed to toolkit
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults)
    {
      if (styleDefaults['colors'])
      {
        amxNode['_defaultColors'] = styleDefaults['colors'];
      }
      if (styleDefaults['shapes'])
      {
        amxNode['_defaultShapes'] = styleDefaults['shapes'];
      }
      delete options['styleDefaults']['colors'];    // remove styleDefaults colors from options, no longer needed
      delete options['styleDefaults']['shapes'];    // remove styleDefaults shapes from options, no longer needed
      delete options['marker']; // remove marker from options, no longer needed
    }
  }

  ThematicMapRenderer.prototype.ProcessAttributes = function (options, amxNode, context)
  {
    ThematicMapRenderer.superclass.ProcessAttributes.call(this, options, amxNode, context);

    if (!amx.dtmode &&amxNode.isAttributeDefined('source'))
    {
      options['source'] = adf.mf.api.amx.buildRelativePath(amxNode.getAttribute('source'));
      options['sourceXml'] = this._getCustomBaseMapMetadata(options['source']);
    }
  }

  ThematicMapRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    // specify legend location
    context[LegendRenderer.LEGEND_LOCATION_ATTR] = LegendRenderer.LEGEND_LOCATION_VALUE_OPTIONS;

    if(amx.dtmode && amxNode.getChildren().length === 0)
    {
      this.GetChildRenderers()['areaLayer']['renderer'].ProcessAttributes(options, null, context);
      return true;
    }
    else
    {
      var ret = ThematicMapRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
      return ret;
    }
  }

  ThematicMapRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var callbackObject =
      {
        'callback': function(event, component)
          {
            // fire the selectionChange event
            var type = event.getType();
            if (type === DvtSelectionEvent.TYPE)
            {
              var se = new adf.mf.api.amx.SelectionEvent(null, event.getSelection());
              adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se,
                function()
                {
                  var el = amxNode['_selectionListenerCache'][event.getParamValue('clientId')];
                  if (el)
                    adf.mf.api.amx.invokeEl(el, [se], null, [se[".type"]]);
                });
            }
            else if (type === DvtMapActionEvent.TYPE)
            {
              // find data layer node by id (passed as 'clientId' param value)
              var dataLayerNode = adf.mf.internal.dvt.findDataLayerNodeById(amxNode, event.getParamValue('clientId'));
              if (dataLayerNode)
              {
                var locationNode;
                if(dataLayerNode.getAttribute("value"))
                {
                  locationNode = dataLayerNode.getChildren(null, event.getRowKey())[0];
                }
                else
                {
                  locationNode = dataLayerNode.getChildren()[parseInt(event.getRowKey()) - 1];
                }
                if (locationNode)
                {
                  var clientId = event.getClientId();     // clientId of the firing item
                  if (clientId)
                  {
                    var itemNode = null;
                    var items = locationNode.getChildren();
                    for (var j = 0; j < items.length; j++)
                    {
                      if (items[j].getId() === clientId)
                      {
                        itemNode = items[j];
                        break;
                      }
                    }
                    if (itemNode)
                    {
                      // area/marker node found, fire event and handle the 'action' attribute
                      var ae = new adf.mf.api.amx.ActionEvent();
                      adf.mf.api.amx.processAmxEvent(itemNode, 'action', undefined, undefined, ae,
                        function()
                        {
                          var action = itemNode.getAttributeExpression("action", true);
                          if (action != null)
                          {
                            adf.mf.api.amx.doNavigation(action);
                          }
                        });
                    }
                  }
                }
              }
            }
          }
      };

      //TODO selectionListener
    if (amxNode.isAttributeDefined('selectionListener'))
      callbackObject['selectionListener'] = amxNode.getAttributeExpression('selectionListener');

    return callbackObject;
  }
  
  ThematicMapRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return DvtAmxThematicMap.newInstance(context, callback, callbackObj, amxNode['_optionsObj']);
  }

  ThematicMapRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    instance.render(amxNode['_optionsObj'], width, height);
  }
  
  ThematicMapRenderer.prototype.GetComponentInstance = function(simpleNode, amxNode)
  {
    return this.CreateComponentInstance(simpleNode, amxNode);
  }
  
  ThematicMapRenderer.prototype._getCustomBaseMapMetadata = function (src)
  {
    if (loadedCustomBasemaps[src])
      return loadedCustomBasemaps[src];

    var request = new XMLHttpRequest();
    request.open("GET", src, false);
    request.send();

    if (request.readyState == 4 && XMLSerializer)
    {
      var parser = new DOMParser();
      var metadataNode = parser.parseFromString(request.responseText, "text/xml");
      var layerNodes = metadataNode.getElementsByTagName('layer');
      for (var i = 0; i < layerNodes.length; i++)
      {
        var imageNodes = layerNodes[i].getElementsByTagName('image');
        for (var j = 0; j< imageNodes.length; j++)
        {
          var source = imageNodes[j].getAttribute('source');
          var relativePath = adf.mf.api.amx.buildRelativePath(source);
          imageNodes[j].setAttribute('source', relativePath);
        }
      }

      var serializer = new XMLSerializer();
      var serialized = serializer.serializeToString(metadataNode);
      loadedCustomBasemaps[src] = serialized;
      return serialized;
    }

    return null;
  }

  // OLD STUFF

  /**
   * Loads thematicMap base map layers and resources
   */
  adf.mf.internal.dvt.loadMapLayerAndResource = function(basemap, layer)
  {
    var basemapName = basemap.charAt(0).toUpperCase() + basemap.slice(1);
    var layerName = layer.charAt(0).toUpperCase() + layer.slice(1);

    var baseMapLayer = "DvtBaseMap" + basemapName + layerName + ".js";
    amx.includeJs("js/thematicMap/basemaps/" + baseMapLayer);

    var locale = adf.mf.locale.getUserLanguage();
    // Do not load resource bundle if language is english because it is included in the base map by default
    if (locale.indexOf("en") === -1)
    {
      var bundleName = basemapName + layerName + "Bundle";
      var resourceLoader = adf.mf.internal.dvt.util.ResourceBundleLoader.getInstance();
      resourceLoader.loadDvtResources("js/thematicMap/resource/" + bundleName);
    }
  }

  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'thematicMap', ThematicMapRenderer);
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var TimeAxisRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TimeAxisRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.timeline.TimeAxisRenderer');
 
  TimeAxisRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TimeAxisRenderer.superclass.GetAttributesDefinition.call(this);
    
    attrs['inlineStyle'] = {'path' :  'axis/style', 'type' : AttributeProcessor['TEXT']};
    attrs['rendered'] = {'path' :  'axis/rendered', 'type' : AttributeProcessor['BOOLEAN']};
    attrs['styleClass'] = {'path' : 'axis/styleClass', 'type' : AttributeProcessor['TEXT']};
    attrs['scale'] = {'path' : 'axis/scale', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  };
  
  TimeAxisRenderer.prototype.ProcessAttributes = function (options, axisNode, context)
  {
    var changed = TimeAxisRenderer.superclass.ProcessAttributes.call(this, options, axisNode, context);
    
    var converter = axisNode.getConverter();
    if (converter)
    {
      changed = true;
      if(!options['axis']) options['axis'] = {};
      options['axis']['converter'] = converter;     
    }
    
    return changed;
  }
  
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.timeline');
  
  adf.mf.internal.dvt.timeline.DefaultTimelineStyle = 
  {
    // text to be displayed, if no data is provided
    'emptyText' : null,

    // default style values
    'styleDefaults': 
    {
      'timelineSeries': 
      {
         'colors': ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"]
      }
   },
   '_resources' : 
   { 
     'scrollLeft' :       'css/images/timeline/scroll_l.png', 
     'scrollRight' :     'css/images/timeline/scroll_r.png', 
     'scrollUp' :     'css/images/timeline/scroll_t.png', 
     'scrollDown' :     'css/images/timeline/scroll_d.png' 
   } 
  };  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var TimelineItemRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TimelineItemRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.timeline.TimelineItemRenderer');
 
  TimelineItemRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TimelineItemRenderer.superclass.GetAttributesDefinition.call(this);
    attrs['description'] = {'path' : 'description', 'type' : AttributeProcessor['TEXT']};
    attrs['endTime'] = {'path' : 'endTime', 'type' : AttributeProcessor['DATETIME']};
    attrs['inlineStyle'] = {'path' :  'style', 'type' : AttributeProcessor['TEXT']};
    attrs['startTime'] = {'path' : 'startTime', 'type' : AttributeProcessor['DATETIME']};
    attrs['styleClass'] = {'path' : 'styleClass', 'type' : AttributeProcessor['TEXT']};
    attrs['title'] = {'path' : 'title', 'type' : AttributeProcessor['TEXT']};
    attrs['durationFillColor'] = {'path' : 'durationFillColor', 'type' : AttributeProcessor['TEXT']};
    return attrs;
  };
  
  TimelineItemRenderer.prototype.ProcessAttributes = function (options, timelineItemNode, context)
  {
    var series = context["series"];
    var amxNode = context['amxNode'];
    var rowKeyCache = amxNode['_rowKeyCache'];
    var rendered;

    // first check if this data item should be rendered at all
    rendered = timelineItemNode.getAttribute('rendered');
    if (rendered !== undefined)
    {
      if (adf.mf.api.amx.isValueFalse(rendered))
        return false;
    }
    
    // if rendered then process
    var timelineItem = {};
    timelineItem['id'] = timelineItemNode.getId();
    timelineItem['_rowKey'] = context['_rowKey'];

    rowKeyCache[timelineItem['id']] = timelineItem['_rowKey'];

    if (timelineItemNode.isAttributeDefined('action'))
    {
      timelineItem['action'] = context['_rowKey'];
    }
    else
    {
      var actionTags;
      var firesAction = false;
      // should fire action, if there are any 'setPropertyListener' or 'showPopupBehavior' child tags
      actionTags = timelineItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'setPropertyListener');
      if (actionTags.length > 0)
        firesAction = true;
      else
      {
        actionTags = timelineItemNode.getTag().findTags(adf.mf.internal.dvt.AMX_NAMESPACE, 'showPopupBehavior');
        if (actionTags.length > 0)
          firesAction = true;
      }
      if (firesAction)
      {
        // need to set 'action' to some value to make the event fire
        timelineItem['action'] = context['_rowKey'];
      }
    }

    TimelineItemRenderer.superclass.ProcessAttributes.call(this, timelineItem, timelineItemNode, context);

    series['items'].push(timelineItem);

    var attributeGroupsNodes = timelineItemNode.getChildren();
    var iter = adf.mf.api.amx.createIterator(attributeGroupsNodes);
    while (iter.hasNext())
    {
      var attrGroupsNode = iter.next();

      if (attrGroupsNode.getTag().getName() !== 'attributeGroups' || (attrGroupsNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(attrGroupsNode.getAttribute('rendered'))))
        continue;         // skip non attr groups and unrendered attr groups

      if (!attrGroupsNode.isReadyToRender())
      {
        throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException();
      }

      AttributeGroupManager.processAttributeGroup(attrGroupsNode, amxNode, context);
    }

    AttributeGroupManager.registerDataItem(context, timelineItem, null);

    return true;
  };
  
    
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;
  
  var TimelineRenderer = function()
  { }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TimelineRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.timeline.TimelineRenderer');
  
  TimelineRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = TimelineRenderer.superclass.GetStyleClassesDefinition.call(this);

    // timeline time axis styles
    styleClasses['timeAxis-backgroundColor'] = {'path' : 'styleDefaults/timeAxis/backgroundColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timeAxis-borderColor'] = {'path' : 'styleDefaults/timeAxis/borderColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timeAxis-borderWidth'] = {'path' : 'styleDefaults/timeAxis/borderWidth', 'type' : StyleProcessor['WIDTH']};
    styleClasses['timeAxis-labelStyle'] = {'path' : 'styleDefaults/timeAxis/labelStyle', 'type' : StyleProcessor['CSS_TEXT'], 'ignoreEmpty' : true};
    styleClasses['timeAxis-separatorColor'] = {'path' : 'styleDefaults/timeAxis/separatorColor', 'type' : StyleProcessor['COLOR']};

    // timeline item styles
    styleClasses['timelineItem-backgroundColor'] =  {'path' : 'styleDefaults/timelineItem/backgroundColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-selectedBackgroundColor'] =  {'path' : 'styleDefaults/timelineItem/selectedBackgroundColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-borderColor'] =  {'path' : 'styleDefaults/timelineItem/borderColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-selectedBorderColor'] =  {'path' : 'styleDefaults/timelineItem/selectedBorderColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-borderWidth'] =  {'path' : 'styleDefaults/timelineItem/borderWidth', 'type' : StyleProcessor['WIDTH']};
    styleClasses['timelineItem-selectedBorderWidth'] =  {'path' : 'styleDefaults/timelineItem/selectedBorderWidth', 'type' : StyleProcessor['WIDTH']};
    styleClasses['timelineItem-feelerColor'] =  {'path' : 'styleDefaults/timelineItem/feelerColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-selectedFeelerColor'] =  {'path' : 'styleDefaults/timelineItem/selectedFeelerColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineItem-feelerWidth'] =  {'path' : 'styleDefaults/timelineItem/feelerWidth', 'type' : StyleProcessor['WIDTH']};
    styleClasses['timelineItem-selectedFeelerWidth'] =  {'path' : 'styleDefaults/timelineItem/selectedFeelerWidth', 'type' : StyleProcessor['WIDTH']};
    styleClasses['timelineItem-descriptionStyle'] = {'path' : 'styleDefaults/timelineItem/descriptionStyle', 'type' : StyleProcessor['CSS_TEXT'], 'ignoreEmpty' : true};
    styleClasses['timelineItem-titleStyle'] = {'path' : 'styleDefaults/timelineItem/titleStyle', 'type' : StyleProcessor['CSS_TEXT'], 'ignoreEmpty' : true};
    
    // timeline series styles
    styleClasses['timelineSeries-backgroundColor'] =  {'path' : 'styleDefaults/timelineSeries/backgroundColor', 'type' : StyleProcessor['COLOR']};
    styleClasses['timelineSeries-labelStyle'] = {'path' : 'styleDefaults/timelineSeries/labelStyle', 'type' : StyleProcessor['CSS_TEXT'], 'ignoreEmpty' : true};
    styleClasses['timelineSeries-emptyTextStyle'] = {'path' : 'styleDefaults/timelineSeries/emptyTextStyle', 'type' : StyleProcessor['CSS_TEXT'], 'ignoreEmpty' : true};

    return styleClasses;
  };
  
  TimelineRenderer.prototype.GetContentDivClassName = function ()
  {
    return 'dvtm-timeline';
  };
  
  /**
   * processes the components's child tags
   */
  TimelineRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      var TimelineSeriesRenderer = adf.mf.internal.dvt.timeline.TimelineSeriesRenderer;
      var TimeAxisRenderer = adf.mf.internal.dvt.timeline.TimeAxisRenderer;
      this._renderers = 
        {
          'timelineSeries' : { 'renderer' : new TimelineSeriesRenderer() },
          'timeAxis' : { 'renderer' : new TimeAxisRenderer() }
        };
    }
    return this._renderers;
  }; 
 
  TimelineRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TimelineRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['id'] = {'path' : 'id', 'type' : AttributeProcessor['TEXT']};
    attrs['inlineStyle'] = {'path' : 'style', 'type' : AttributeProcessor['TEXT']};    
    attrs['itemSelection'] = {'path' : 'itemSelection', 'type' : AttributeProcessor['TEXT']}; 
    attrs['shortDesc'] = {'path' : 'shortDesc', 'type' : AttributeProcessor['TEXT']};     
    attrs['styleClass'] = {'path' : 'styleClass', 'type' : AttributeProcessor['TEXT']};
    
    if (!amx.dtmode)
    {
      attrs['endTime'] = {'path' : 'endTime', 'type' : AttributeProcessor['DATETIME']};  
      attrs['startTime'] = {'path' : 'startTime', 'type' : AttributeProcessor['DATETIME']}; 
    }     
    
    return attrs;
  };
  
  /**
   * Initialize generic options for all chart component.
   */
  TimelineRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    TimelineRenderer.superclass.InitComponentOptions.call(this, amxNode);

    amxNode["_optionsObj"] = {};
    amxNode["_optionsObj"]["type"] = "timeline";
    amxNode['_optionsObj']['series'] = [];
    amxNode['_optionsObj']['axis'] = {};
    
    if (amx.dtmode)
    {
      var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(amxNode.getTag().getName());
      var dtModeData = definition.getDTModeData();
      for(var prop in dtModeData){
        amxNode["_optionsObj"][prop] = dtModeData[prop];  
      }
      
      var children = amxNode.getChildren();
      var containsSeries = false;
      for(var i=0; i<children.length; i++) {
        if(children[i].getTag().getName() === 'timelineSeries') {
          containsSeries = true;
          break;
        }
      }
      if(!containsSeries) {
        // add series
        definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition('timelineSeries');
        dtModeData = definition.getDTModeData();
        
        var series = {};
        series['id'] = 'timelineSeries'+Math.random();
        series['items'] = dtModeData['items0'];
        series['label'] = 'Label 0';
        amxNode['_optionsObj']['series'][0] = series;
        
        series = {};
        series['id'] = 'timelineSeries'+Math.random();
        series['items'] = dtModeData['items1'];
        series['label'] = 'Label 1';
        amxNode['_optionsObj']['series'][1] = series;
      }
    }
    
    amxNode["_seriesOrder"] = [];
    amxNode["_selectionListenerCache"] = {};

    amxNode[adf.mf.internal.dvt.INSTANCE] = null;
    amxNode['_rowKeyCache'] = {};
    amxNode['_stylesResolved'] = false;
    
    AttributeGroupManager.reset(amxNode);
  };
  
  TimelineRenderer.prototype.GetPostResizeCallback = function(activeInstance, simpleNode, amxNode) {
    return function(context)
    {
      activeInstance.rerender(amxNode);
    };
  };

  /**
   * Reset options for all chart component.
   */
  TimelineRenderer.prototype.ResetComponentOptions = function (amxNode, attributeChanges)
  {
    TimelineRenderer.superclass.ResetComponentOptions.call(this, amxNode, attributeChanges);

    if (attributeChanges.hasChanged('value'))
    {
      amxNode['_optionsObj']['series'] = [];
      amxNode['_rowKeyCache'] = {};

      var selection = amxNode['_selection'];
      if (selection !== undefined && selection !== null)
      {
        amxNode['_optionsObj']['selectedItems'] = selection;
      }
      
      AttributeGroupManager.reset(amxNode);
    }
  };

  TimelineRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomTimelineStyle';
  };

  TimelineRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.timeline.DefaultTimelineStyle;
  };
  
  TimelineRenderer.prototype.MergeComponentOptions = function(amxNode)
  {
    TimelineRenderer.superclass.MergeComponentOptions.call(this, amxNode);

    var options = amxNode["_optionsObj"];
    // extract default colors from styleDefaults that will be used when attribute groups are defined
    var styleDefaults = options['styleDefaults'];
    if (styleDefaults)
    {
      if (styleDefaults['timelineSeries'] && styleDefaults['timelineSeries']['colors'])
      {
        amxNode['_durationBarFillColor'] = styleDefaults['timelineSeries']['colors'];
      }
    }
  };
  
  /**
   * Function creates callback for the toolkit component
   */
  TimelineRenderer.prototype.CreateComponentCallback = function(node, amxNode)
  {
    var callbackObject =
      {
        'callback' : function (event, component)
          {
            var rowKeyCache = amxNode['_rowKeyCache'];
            var rowKey;

            if (event.getType() === 'selection')
            {
              // selectionChange event support
              var itemId;
              if(event.getSelection() && event.getSelection().length > 0) {
                itemId = event.getSelection()[0].getId();
              }
              var seriesId = null;
              
              if (itemId)
              {
                // currently series id is not passed -> parse it from id
                seriesId = itemId.substring(0, itemId.indexOf(":"));//event.getParamValue('seriesId');
                var selectedRowKeys = [];
                var i;

                rowKey = null;
                if (rowKeyCache[itemId] !== undefined)
                {
                  rowKey = rowKeyCache[itemId];
                }
                if (rowKey !== null)
                {
                  selectedRowKeys.push(rowKey);
                }
                var se = new adf.mf.api.amx.SelectionEvent(selectedRowKeys, selectedRowKeys);
                
                adf.mf.api.amx.processAmxEvent(amxNode, 'selection', undefined, undefined, se).always(function()
                {
                  var params = [];
                  var paramTypes = [];
                  params.push(se);
                  paramTypes.push(se[".type"]);

                  var el = amxNode['_selectionListenerCache'][seriesId];
                  if (el)
                  {
                    adf.mf.api.amx.invokeEl(el, params, null, paramTypes);
                  }
                });

                var _selection = [];
                if (rowKey !== undefined && rowKey !== null)
                {
                  _selection.push(itemId);
                }

                amxNode["_selection"] = _selection;
              }
            }
            else if (event.getType() === 'dvtAct')
            {
              // action event support
              var itemId = event.getClientId();
              if (rowKeyCache[itemId] !== undefined)
              {
                rowKey = rowKeyCache[itemId];
              }
              if (rowKey !== undefined)
              {
                var item = null;
                
                // get data item's amxNode (assume the rowKey to be unique)
                var seriesId = itemId.substring(0, itemId.indexOf(":"));
                var arr = amxNode.getChildren();
                for(var i=0; i<arr.length; i++ ){
                  if(arr[i].getId() === seriesId) {
                    item = arr[i].getChildren(null, rowKey)[0];
                    break;
                  }
                }
                
                if (item !== undefined && item != null)
                {
                  // fire ActionEvent and then process the 'action' attribute
                  var ae = new adf.mf.api.amx.ActionEvent();
                  adf.mf.api.amx.processAmxEvent(item, 'action', undefined, undefined, ae,
                    function ()
                    {
                      var action = item.getAttributeExpression("action", true);
                      if (action != null)
                      {
                        adf.mf.api.amx.doNavigation(action);
                      }
                    });
                }
              }
            }
          }
      };
    return callbackObject;
  };
  
  TimelineRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // when descendants changes then refresh whole series
    return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
  };

  /**
   * Function creates new instance of Timeline
   */
  TimelineRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    var instance = DvtTimeline.newInstance(context, callback, callbackObj);
    context.getStage().addChild(instance);
    return instance;
  };

  /**
   * Function renders instance of the component
   */
  TimelineRenderer.prototype.RenderComponent = function(instance, width, height, amxNode)
  {
    var data = null;
    if(this.IsOptionsDirty(amxNode))
    {
      data = amxNode['_optionsObj'];
    }
    var dim = this.AdjustStageDimensions({'width' : width, 'height' : height});
    instance.render(data, dim['width'], dim['height']);
  };
    
  TimelineRenderer.prototype.SetupComponent = function(amxNode) {
    var timelineNode = TimelineRenderer.superclass.SetupComponent.call(this, amxNode);
    
    var divs = amxNode['_dvtTimelineSeriesDivs'];
    if(divs) {
      for(var i=0; i<divs.length; i++) {
        timelineNode.appendChild(divs[i]);
      }
      delete amxNode['_dvtTimelineSeriesDivs'];
    }
    
    return timelineNode;
  };
  
  TimelineRenderer.prototype.render = function(timelineAmxNode, id) {
    if(!this._childNodesReadyToRender(timelineAmxNode)){
      return this.SetupComponent(timelineAmxNode);
    }
    return TimelineRenderer.superclass.render.call(this, timelineAmxNode, id);
  };
  
  TimelineRenderer.prototype._childNodesReadyToRender = function(timelineAmxNode) {
    var children = timelineAmxNode.getChildren();
    if(children) {
      for(var i = 0; i < children.length; i++) {
        if(!this.isNodeReadyToRender(children[i])) {
          return false;
        }
      }
    }
    return true;
  };
  
  TimelineRenderer.prototype.rerender = function(timelineAmxNode) {
    this.render(timelineAmxNode);
    this.renderNode(timelineAmxNode);
  };
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'timeline', TimelineRenderer); 
})();
(function(){ 

  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeGroupManager = adf.mf.internal.dvt.common.attributeGroup.AttributeGroupManager;

  /**
   * Timeline renderer
   */
  var TimelineSeriesRenderer = function ()
  {}

  adf.mf.internal.dvt.DvtmObject.createSubclass(TimelineSeriesRenderer, 'adf.mf.internal.dvt.common.FacetlessDataStampRenderer', 'adf.mf.internal.dvt.timeline.TimelineSeriesRenderer');
  
  TimelineSeriesRenderer.prototype.GetChildRenderers = function (stamped)
  {
    if(this._renderers === undefined)
    {
      var TimelineItemRenderer = adf.mf.internal.dvt.timeline.TimelineItemRenderer;
      this._renderers = 
      {
        'stamped' : {
          'timelineItem' : { 'renderer' : new TimelineItemRenderer(), 'order' : 1}
        },
        'simple' : {
        }
      };
    }
    
    if(stamped === true) 
    {
      return this._renderers['stamped'];
    }
    else
    {
      return this._renderers['simple'];
    }
  };

  TimelineSeriesRenderer.prototype.GetAttributesDefinition = function ()
  {
    var attrs = TimelineSeriesRenderer.superclass.GetAttributesDefinition.call(this);

    attrs['emptyText'] = {'path' : 'emptyText', 'type' : AttributeProcessor['TEXT']};
    attrs['inlineStyle'] = {'path' : 'style', 'type' : AttributeProcessor['TEXT']};
    attrs['label'] = {'path' : 'label', 'type' : AttributeProcessor['TEXT']};
    attrs['styleClass'] = {'path' : 'styleClass', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  };
  
  TimelineSeriesRenderer.prototype.updateTimelineNode = function (seriesAmxNode)
  {
    // update series order
    var timelineNode = seriesAmxNode.getParent();
    var seriesId = seriesAmxNode.getId();
    if(timelineNode["_seriesOrder"].indexOf(seriesId) == -1) {
      timelineNode["_seriesOrder"].push(seriesId);
    }
    
    // update listeners
    var listenerEl = seriesAmxNode.getAttributeExpression("selectionListener");
    var seriesId = seriesAmxNode.getId();
    timelineNode["_selectionListenerCache"][seriesId] = listenerEl; 
  };
  
  TimelineSeriesRenderer.prototype.ProcessAttributes = function (options, seriesAmxNode, context)
  {
    this.updateTimelineNode(seriesAmxNode);
    
    var timelineAmxNode = seriesAmxNode.getParent();
    var seriesId = seriesAmxNode.getId();
    var attr, nodeDiv;
    
    var series = {};
    
    // first check if this data item should be rendered at all
    var rendered = this.isRendered(seriesAmxNode);
    if(rendered != false)
    {
      // create divs only in case of render
      if(!timelineAmxNode['_dvtTimelineSeriesDivs']) timelineAmxNode['_dvtTimelineSeriesDivs'] = [];
      nodeDiv = this.renderDiv(seriesAmxNode);
      timelineAmxNode['_dvtTimelineSeriesDivs'].push(nodeDiv);
       
      series = {};
      series['id'] = seriesId;
      series['items'] = [];
      
      context['series'] = series;
      TimelineSeriesRenderer.superclass.ProcessAttributes.call(this, series, seriesAmxNode, context);
    }
    
    // set either processed series or null (when rendered equals false)
    // when dual series is null do not add it to the array
    var seriesIndex = timelineAmxNode["_seriesOrder"].indexOf(seriesId);
    if(!(seriesIndex == 1 && series === null)) {
      options['series'][seriesIndex] = series;
    }
      
    return true;
  };

  /**
   * Check if renderer is running in dtmode. If so then load only dummy data. In other case leave processing on the
   * parent.
   */
  TimelineSeriesRenderer.prototype.ProcessChildren = function (options, seriesAmxNode, context)
  {
    // if not rendered do not process children
    if(!this.isRendered(seriesAmxNode)) {
      return true;
    }
    
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.timeline.TimelineSeriesRenderer.ProcessChildren");
    try
    {
      if (amx.dtmode)
      {
        var definition = adf.mf.internal.dvt.ComponentDefinition.getComponentDefinition(seriesAmxNode.getTag().getName());
        var dtModeData = definition.getDTModeData();

        var series = {};
        series['id'] = seriesAmxNode.getId();
        
        var timelineAmxNode = seriesAmxNode.getParent();
        var seriesIndex = timelineAmxNode["_seriesOrder"].indexOf(seriesAmxNode.getId());
        if(!(seriesIndex == 1 && series === null)) {
          series['items'] = dtModeData['items'+seriesIndex];
          series['label'] = ('Label '+ seriesIndex);
          
          options['series'][seriesIndex] = series;
        }

        return true;
      }
      else
      {
        AttributeGroupManager.init(context);
        
        var changed = TimelineSeriesRenderer.superclass.ProcessChildren.call(this, options, seriesAmxNode, context);
        
        changed = changed | this._setInitialSelection(seriesAmxNode, context);
        
        var config = new adf.mf.internal.dvt.common.attributeGroup.AttributeGroupConfig();
        config.addTypeToDefaultPaletteMapping('durationFillColor', 'durationBarFillColor');
        config.setUpdateCategoriesCallback(function(attrGrp, dataItem, valueIndex, exceptionRules) {
          // do nothing
        });
        
        AttributeGroupManager.applyAttributeGroups(seriesAmxNode.getParent(), config, context);
        
        return changed;
      }
    }
    finally
    {
      perf.stop();
    }
  };
  
  TimelineSeriesRenderer.prototype._setInitialSelection = function(seriesAmxNode, context) {
    var series = context["series"];
    var changed = false;

    var selectedRowKeys = seriesAmxNode.isAttributeDefined("selectedRowKeys") ? seriesAmxNode.getAttribute("selectedRowKeys") : null;

    if (selectedRowKeys) {

      var varName = seriesAmxNode.getAttribute('var');
      var iter = adf.mf.api.amx.createIterator(seriesAmxNode.getAttribute('value')); 
      while (iter.hasNext())
      {
        var modelDataItem = iter.next();
        adf.mf.el.addVariable(varName, modelDataItem);

        var selectedItemNodes = seriesAmxNode.getChildren(null, iter.getRowKey());

        var iter2 = adf.mf.api.amx.createIterator(selectedItemNodes);
        while (iter2.hasNext())
        {
          var itemNode = iter2.next();
          var id = itemNode.getId();
          var rowKey = itemNode.getStampKey();

          if(selectedRowKeys !== null) {
            if(selectedRowKeys.indexOf(rowKey) > -1) {
              if(!series["selectedItems"]) {
                series["selectedItems"] = [];
              }
              series["selectedItems"].push(id);
              changed = true;
            }
          }

        }

        adf.mf.el.removeVariable(varName);
      }
    }
    return changed;
  };
  
  TimelineSeriesRenderer.prototype.refresh = function (seriesAmxNode, attributeChanges)
  {
    // refreshing ...
    if(seriesAmxNode['_waitingForData'] === true) {
      seriesAmxNode['_waitingForData'] = false;
      // waiting for data ...
      return;
    }
    // data complete -> rerender
    var timelineAmxNode = seriesAmxNode.getParent();
    var timelineTypeHandler = timelineAmxNode.getTypeHandler();
    timelineTypeHandler.rerender(timelineAmxNode); 
  };
  
  TimelineSeriesRenderer.prototype.render = function (seriesAmxNode, id) {
    // just render div
    if(seriesAmxNode['_renderDiv']) {
      return this.SetupComponent(seriesAmxNode);
    }
    
    // rerender component
    var timelineAmxNode = seriesAmxNode.getParent();
    var timelineTypeHandler = timelineAmxNode.getTypeHandler();
    timelineTypeHandler.rerender(timelineAmxNode);
    
    return document.getElementById(seriesAmxNode.getId());
  };
  
  TimelineSeriesRenderer.prototype.SetupComponent = function (amxNode)
  {
    // create main div
    return adf.mf.internal.dvt.DOMUtils.createDIV();
  }; 
  
  TimelineSeriesRenderer.prototype.InitComponent = function(simpleNode, amxNode)
  {
    // do not handle resize
  };
  
  TimelineSeriesRenderer.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    // when descendants changes then refresh whole series
    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  };
  
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'timelineSeries', TimelineSeriesRenderer); 
  
})();
(function(){
  /**
   * This renderer provides support for processing of the facets which depends on value attribute.
   */
  var DataStampRenderer = function ()
  {};

  adf.mf.internal.dvt.DvtmObject.createSubclass(DataStampRenderer, 'adf.mf.internal.dvt.BaseComponentRenderer', 'adf.mf.internal.dvt.treeview.DataStampRenderer');

  /**
   * Creates treeview's children AMX nodes
   */
  DataStampRenderer.prototype.createChildrenNodes = function (amxNode)
  {
    // create a cache of rowKeys to be removed in case of model update
    amxNode['_currentRowKeys'] = [];

    if (!amx.dtmode)
    {
      var varName = amxNode.getAttribute('var');

      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);

      var dataItems = amxNode.getAttribute("value");
      if (varName != null && dataItems === undefined)
      {
        // Mark it so the framework knows that the children nodes cannot be
        // created until the collection model has been loaded
        return true;
      }

      var iter = this.createTreeviewIterator(amxNode, true);
      if(iter.loaded === true || iter.isEmpty())
      {
        return true;
      }
      else
      {
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), null);
          adf.mf.el.removeVariable(varName);
        }
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);

    var childTags = amxNode.getTag().getChildren(adf.mf.internal.dvt.DVT_NAMESPACE);
    var renderers = this.GetChildRenderers();

    for (var i = 0; i < childTags.length; i++)
    {
      if (renderers[childTags[i].getName()] !== undefined)
      {
        var childAmxNode = childTags[i].buildAmxNode(amxNode);
        amxNode.addChild(childAmxNode);
      }
    }

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  DataStampRenderer.prototype._createTreeviewIterator = function(amxNode, empty) {
    var iterator = {};
    var amxNodeIterator = null;

    var dataItems = null;
    if(amxNode) {
      dataItems = amxNode.getAttribute('value');
    }

    if(empty === true || dataItems === undefined || dataItems === null) {
      // no items, nothing to do
      iterator.getTotalCount = function() {
        return 0;
      };
      iterator.getAvailableCount = function() {
        return 0;
      };
      iterator.isEmpty = function() {
        return true;
      };
      iterator.hasNext = function() {
        return false;
      };
      iterator.next = function() {
        return null;
      };
      iterator.getRowKey = function() {
        return null;
      };
    }
    else
    {
      amxNodeIterator = adf.mf.api.amx.createIterator(dataItems);
      iterator.getTotalCount = function() {
        return amxNodeIterator.getTotalCount();
      };
      iterator.getAvailableCount = function() {
        return amxNodeIterator.getAvailableCount();
      };
      iterator.isEmpty = function() {
        return amxNodeIterator.getTotalCount() === 0;
      };
      iterator.hasNext = function() {
        return amxNodeIterator.hasNext();
      };
      iterator.next = function() {
        return amxNodeIterator.next();
      };
      iterator.getRowKey = function() {
        return amxNodeIterator.getRowKey();
      };
    }
    return iterator;
  };

  DataStampRenderer.prototype._loadRowsIfNeeded = function(iterator, amxNode) {
    // copied from amx:listView - on refresh the component need to initiate
    // loading of rows not available in the cache
    var dataItems = null;
    if (iterator.getTotalCount() > iterator.getAvailableCount())
    {
      iterator.loaded = true;
      dataItems = amxNode.getAttribute('value');

      adf.mf.api.amx.showLoadingIndicator();
      //var currIndex = dataItems.getCurrentIndex();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0,  -1, function ()
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
      function ()
      {
        adf.mf.api.adf.logInfoResource("AMXInfoMessageBundle", adf.mf.log.level.SEVERE, "_loadRowsIfNeeded", "MSG_ITERATOR_FIRST_NEXT_ERROR", req, resp);
        adf.mf.api.amx.hideLoadingIndicator();
      });
    }
    else
    {
      iterator.loaded = false;
    }
  };

  DataStampRenderer.prototype.createTreeviewIterator = function(amxNode, loadItems) {
    var ret = null;
    // we want to skip the value validation if we are in dt mode
    if (!amx.dtmode)
    {
      var iter = this._createTreeviewIterator(amxNode);

      if(loadItems) {
        this._loadRowsIfNeeded(iter, amxNode);
      }

      ret = iter;
    }
    else
    {
      ret = this._createTreeviewIterator(null, true);
    }

    return ret;
  };

  /**
   * Visits treeview's children nodes
   */
  DataStampRenderer.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    var dataItems = amxNode.getAttribute("value");
    if(dataItems === undefined && !amxNode.isAttributeDefined("value"))
    {
      // visit child nodes in no collection mode since there is no value specified
      var children = amxNode.getChildren();
      for (var i = 0;i < children.length;i++)
      {
        children[i].visit(visitContext, callback);
      }
      return true;
    }

    var iter = this.createTreeviewIterator(amxNode, false);
    var variableName = amxNode.getAttribute("var");

    while (iter.hasNext())
    {
      var item = iter.next();
      adf.mf.el.addVariable(variableName, item);
      try
      {
        if (amxNode.visitStampedChildren(iter.getRowKey(), null, null, visitContext, callback))
          return true;
      }
      finally
      {
        adf.mf.el.removeVariable(variableName);
      }
    }
    return false;
  };


  /**
   * Updates treeview's children nodes
   */
  DataStampRenderer.prototype.updateChildren = function (amxNode, attributeChanges)
  {
    // if inlineStyle has changed we need to recreate treeview instance
    if (attributeChanges.hasChanged('inlineStyle'))
    {
      return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
    }
    // if 'value' changed, need to rebuild the nodes hierarchy
    if (attributeChanges.hasChanged('value'))
    {
      // remove the old stamped children
      var children;
      var i, j;
      var iter = this.createTreeviewIterator(amxNode, true);

      if(iter.isEmpty()) {
        return adf.mf.api.amx.AmxNodeChangeResult['REPLACE'];
      }

      if(iter.loaded === true) {
        // cannot rebuild the structure yet, wating for data
        amxNode['_waitingForData'] = true;
        return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
      }

      if (amxNode['_currentRowKeys'] !== undefined)
      {
        for (i = 0; i < amxNode['_currentRowKeys'].length; i++)
        {
          children = amxNode.getChildren(null, amxNode['_currentRowKeys'][i]);
          for (j = children.length - 1; j >= 0; j--)
          {
            amxNode.removeChild(children[j]);
          }
        }
      }
      // clear the old rowKeys
      amxNode['_currentRowKeys'] = [];

      // create the new stamped children hierarchy

      var varName = amxNode.getAttribute('var');
      if (!iter.isEmpty())
      {
        while (iter.hasNext())
        {
          var item = iter.next();
          amxNode['_currentRowKeys'].push(iter.getRowKey());
          adf.mf.el.addVariable(varName, item);
          amxNode.createStampedChildren(iter.getRowKey(), null);
          adf.mf.el.removeVariable(varName);
        }

      }
    }

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  /**
   * Returns treeview node tag name.
   * @abstract
   * @returns treeview node tag name
   */
  DataStampRenderer.prototype.GetStampedChildTagName = function()
  {
    return null;
  };


  /**
   * function iterates through collection returned by value attribute and for each item from this collection
   * renders each child in the specified facet.
   */
  DataStampRenderer.prototype.ProcessStampedChildren = function (options, amxNode, context)
  {
    var perf = adf.mf.internal.perf.start(
      "adf.mf.internal.dvt.treeview.DataStampRenderer.ProcessStampedChildren");
    try
    {
      var varName = amxNode.getAttribute('var');// need to use this since var is reserved

      var stampedChildTags = amxNode.getTag().getChildren(dvtm.DVTM_NAMESPACE, this.GetStampedChildTagName());

      // no data, nothing to do
      if (stampedChildTags.length === 0)
      {
        return;
      }

      // creates value collection iterator
      var iter = this.createTreeviewIterator(amxNode, false);
      var changed = false;
      while (iter.hasNext())
      {
        var stamp = iter.next();
        adf.mf.el.addVariable(varName, stamp);
        // get all children for the facet and rowKey
        var dataStampNodes = amxNode.getChildren(null, iter.getRowKey());

        var iter2 = adf.mf.api.amx.createIterator(dataStampNodes);
        // iterate through child nodes and run renderer for each of them
        while (iter2.hasNext())
        {
          // treeviewNode
          var dataStampNode = iter2.next();
          if(!dataStampNode["_optionsObj"]) dataStampNode["_optionsObj"] = options;

          if (dataStampNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(dataStampNode.getAttribute('rendered')))
            continue;         // skip unrendered nodes
          // if the node includes unresolved attributes, no point to proceed
          if (!dataStampNode.isReadyToRender())
          {
            throw new adf.mf.internal.dvt.exception.NodeNotReadyToRenderException;
          }

          var rendererObject = this.GetChildRenderers(true)[dataStampNode.getTag().getName()];
          if(rendererObject && rendererObject['renderer'])
          {
            context['stamp'] = stamp;
            context['_rowKey'] = iter.getRowKey();
            var renderer = rendererObject['renderer'];
            if(renderer.ProcessAttributes)
            {
              changed = changed | renderer.ProcessAttributes(options, dataStampNode, context);
            }
            else
            {
              adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessAttributes method on renderer for '" + dataStampNode.getTag().getName() + "'!");
            }
            if(renderer.ProcessChildren)
            {
              changed = changed | renderer.ProcessChildren(options, dataStampNode, context);
            }
            else
            {
              adf.mf.log.Framework.logp(adf.mf.log.level.WARNING, this.getTypeName(), "ProcessChildren", "There is a missing ProcessChildren method on renderer for '" + dataStampNode.getTag().getName() + "'!");
            }
            delete context['_rowKey'];
            delete context['stamp'];
          }
        }
        adf.mf.el.removeVariable(varName);
      }
      return changed;
    }
    finally
    {
      perf.stop();
    }
  };


  /**
   * Function extends parent function with processing of the stamped children.
   * After all childs are processed parent function is called to resolve simple children nodes.
   */
  DataStampRenderer.prototype.ProcessChildren = function (options, amxNode, context)
  {
    var changed = false;

    var changes = context['_attributeChanges'];
    if(!changes || changes.hasChanged('value'))
    {
      adf.mf.log.Framework.logp(adf.mf.log.level.FINE, this.getTypeName(), "ProcessChildren", "Processing value attribute '" + amxNode.getTag().getName() + "'!");

      changed = changed | this.ProcessStampedChildren(options, amxNode, context);
    }

    return changed | DataStampRenderer.superclass.ProcessChildren.call(this, options, amxNode, context);
  };

})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SunburstNodeRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SunburstNodeRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer', 'adf.mf.internal.dvt.treeview.SunburstNodeRenderer');
  
  
  SunburstNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SunburstNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['radius'] = {'path' : 'radius', 'type' : AttributeProcessor['FLOAT']};
    
    return attrs;
  };
  
})();
(function(){

  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var SunburstRenderer = function ()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(SunburstRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer', 'adf.mf.internal.dvt.treeview.SunburstRenderer');
 
  SunburstRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'sunburst';
  };
  
  SunburstRenderer.prototype.GetChildRenderers = function (stamped)
  {
    if(this._renderers === undefined)
    {
      var SunburstNodeRenderer = adf.mf.internal.dvt.treeview.SunburstNodeRenderer;
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      this._renderers = 
      {
        'stamped' : {
          'sunburstNode' : { 'renderer' : new SunburstNodeRenderer()}
        },
        'simple' : {
          'legend' : { 'renderer' : new LegendRenderer(), 'maxOccurrences' : 1 }
        }
      };
    }
   
    if(stamped === true) 
    {
      return this._renderers['stamped'];
    }
    else
    {
      return this._renderers['simple'];
    }
  };
  
  SunburstRenderer.prototype.GetStyleComponentName = function () {
    return 'sunburst';
  };
  
  SunburstRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = SunburstRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    var options = amxNode["_optionsObj"];
    
    attrs['rotation'] = {'path' : 'rotation', 'type' : AttributeProcessor['TEXT'],  'default' : TreeviewUtils.getMergedStyleValue(options, 'sunburst/rotation')};
    attrs['rotationAngle'] = {'path' : 'startAngle', 'type' : AttributeProcessor['INTEGER'],  'default' : TreeviewUtils.getMergedStyleValue(options, 'sunburst/rotationAngle')};

    return attrs;
  };
  
  SunburstRenderer.prototype.GetOuterDivClass = function ()
  {
    return "dvtm-sunburst";
  };
  
  SunburstRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = SunburstRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-sunburstNode'] = [{'path' : 'nodeDefaults/borderColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-sunburstNodeSelected'] = [{'path' : 'nodeDefaults/selectedOuterColor', 'type' : StyleProcessor['TOP_BORDER']}, {'path' : 'nodeDefaults/selectedInnerColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
    styleClasses['dvtm-sunburstNodeLabel'] = [{'path' : 'nodeDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    styleClasses['dvtm-sunburstAttributeTypeLabel'] = [{'path' : 'styleDefaults/_attributeTypeTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-sunburstAttributeValueLabel'] = [{'path' : 'styleDefaults/_attributeValueTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    return styleClasses;
  };
  
  SunburstRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomSunburstStyle';
  };
  
  SunburstRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.treeview.DefaultSunburstStyle;
  };
  
  SunburstRenderer.prototype.GetStampedChildTagName = function()
  {
    return "sunburstNode";
  };
  
  SunburstRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return DvtSunburst.newInstance(context, callback, callbackObj);
  };
  
  SunburstRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;
    
    var bundles = SunburstRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtSunburstBundle'));
    
    return bundles;
  };
  
  SunburstRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // sunburst should prevent swipe gestures when 'rotation' attribute is defined
    if (amxNode.isAttributeDefined('rotation'))
    {
      return true;
    }
    return false;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'sunburst', SunburstRenderer);
  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var TreemapNodeHeaderRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapNodeHeaderRenderer, 'adf.mf.internal.dvt.BaseRenderer', 'adf.mf.internal.dvt.treeview.TreemapNodeHeaderRenderer');
  
  TreemapNodeHeaderRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapNodeHeaderRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['isolate'] = {'path' : 'isolate', 'type' : AttributeProcessor['TEXT']};
    attrs['titleHalign'] = {'path' : 'labelHalign', 'type' : AttributeProcessor['TEXT']};
    attrs['useNodeColor'] = {'path' : 'useNodeColor', 'type' : AttributeProcessor['TEXT']};

    return attrs;
  };
  
  TreemapNodeHeaderRenderer.prototype.ProcessAttributes = function (options, treemapHeaderNode, context)
  {
    var dataItem = context["dataItem"];
    dataItem['header'] = {};
    
    if(dataItem)
    {
      // always process all attributes -> temporarily delete _attributeChanges
      var currentAttributeChanges = context['_attributeChanges'];
      context['_attributeChanges'] = null;
      
      TreemapNodeHeaderRenderer.superclass.ProcessAttributes.call(this, dataItem['header'], treemapHeaderNode, context);
      
      context['_attributeChanges'] = currentAttributeChanges;
    }
    return true;
  };
  
  
})();
(function(){
  
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  
  var TreemapNodeRenderer = function()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapNodeRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewNodeRenderer', 'adf.mf.internal.dvt.treeview.TreemapNodeRenderer');
  
  TreemapNodeRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapNodeRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    attrs['labelValign'] = {'path' : 'labelValign', 'type' : AttributeProcessor['TEXT']};
    attrs['groupLabelDisplay'] = {'path' : 'groupLabelDisplay', 'type' : AttributeProcessor['TEXT']};
    
    return attrs;
  };
  
  TreemapNodeRenderer.prototype.GetChildRenderers = function ()
  {
    if(this._renderers === undefined)
    {
      var TreemapNodeHeaderRenderer = adf.mf.internal.dvt.treeview.TreemapNodeHeaderRenderer;
      this._renderers = 
        {
          'treemapNodeHeader' : { 'renderer' : new TreemapNodeHeaderRenderer()}
        };
    }
   
    return this._renderers;
  };
  
  TreemapNodeRenderer.prototype.ProcessChildren = function (options, layerNode, context)
  {
    if (layerNode.isAttributeDefined('rendered') && adf.mf.api.amx.isValueFalse(layerNode.getAttribute('rendered')))
      return;
    
    return TreemapNodeRenderer.superclass.ProcessChildren.call(this, options, layerNode, context);
  };
  
})();
(function(){
  
  var TreeviewUtils = adf.mf.internal.dvt.treeview.TreeviewUtils;
  var AttributeProcessor = adf.mf.internal.dvt.AttributeProcessor;
  var StyleProcessor = adf.mf.internal.dvt.StyleProcessor;

  var TreemapRenderer = function ()
  {};
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(TreemapRenderer, 'adf.mf.internal.dvt.treeview.BaseTreeviewRenderer', 'adf.mf.internal.dvt.treeview.TreemapRenderer');
 
  TreemapRenderer.prototype.GetChartType = function (amxNode)
  {
    return 'treemap';
  };
  
  TreemapRenderer.prototype.GetChildRenderers = function (stamped)
  {
    if(this._renderers === undefined)
    {
      var LegendRenderer = adf.mf.internal.dvt.common.legend.LegendRenderer;
      var TreemapNodeRenderer = adf.mf.internal.dvt.treeview.TreemapNodeRenderer;
      this._renderers = 
      {
        'stamped' : {
          'treemapNode' : { 'renderer' : new TreemapNodeRenderer(), 'order' : 1}
        },
        'simple' : {
          'legend' : { 'renderer' : new LegendRenderer(), 'maxOccurrences' : 1 }
        }
      };
    }
    
    if(stamped === true) 
    {
      return this._renderers['stamped'];
    }
    else
    {
      return this._renderers['simple'];
    }
  };
  
  /**
   * Initialize treemap options.
   */
  TreemapRenderer.prototype.InitComponentOptions = function (amxNode)
  {
    TreemapRenderer.superclass.InitComponentOptions.call(this, amxNode);
    
    if (amxNode["_optionsObj"]["nodeDefaults"]["header"] === undefined) {
      amxNode["_optionsObj"]["nodeDefaults"]["header"] = {};
    }
  };
  
  TreemapRenderer.prototype.MergeComponentOptions = function (amxNode)
  {
    TreemapRenderer.superclass.MergeComponentOptions.call(this, amxNode);
    
    var options = amxNode["_optionsObj"];
    
    // set toolkit defaults
    TreeviewUtils.copyOptionIfDefined(options, 'node/groupLabelDisplay', 'nodeDefaults/groupLabelDisplay');
    TreeviewUtils.copyOptionIfDefined(options, 'header/isolate', 'nodeDefaults/header/isolate');
    TreeviewUtils.copyOptionIfDefined(options, 'header/titleHalign', 'nodeDefaults/header/labelHalign');
    TreeviewUtils.copyOptionIfDefined(options, 'header/useNodeColor', 'nodeDefaults/header/useNodeColor');
  };
  
  TreemapRenderer.prototype.GetStyleComponentName = function () {
    return 'treemap';
  };
  
  TreemapRenderer.prototype.GetAttributesDefinition = function (amxNode)
  {
    var attrs = TreemapRenderer.superclass.GetAttributesDefinition.call(this, amxNode);
    
    var options = amxNode["_optionsObj"];
    
    // set options
    attrs['layout'] = {'path' : 'layout', 'type' : AttributeProcessor['TEXT'], 'default' : TreeviewUtils.getMergedStyleValue(options, 'treemap/layout')};
    attrs['groupGaps'] = {'path' : 'groupGaps', 'type' : AttributeProcessor['TEXT'], 'default': TreeviewUtils.getMergedStyleValue(options, 'treemap/groupGaps')};

    return attrs;
  };
  
  TreemapRenderer.prototype.GetOuterDivClass = function ()
  {
    return "dvtm-treemap";
  };
  
  TreemapRenderer.prototype.GetStyleClassesDefinition = function ()
  {
    var styleClasses = TreemapRenderer.superclass.GetStyleClassesDefinition.call(this);
    
    styleClasses['dvtm-treemapNodeSelected'] = [{'path' : 'nodeDefaults/selectedOuterColor', 'type' : StyleProcessor['TOP_BORDER']}, {'path' : 'nodeDefaults/selectedInnerColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
    styleClasses['dvtm-treemapNodeHeader'] = [{'path' : 'nodeDefaults/header/backgroundColor', 'type' : StyleProcessor['BACKGROUND']}, {'path' : 'nodeDefaults/header/borderColor', 'type' : StyleProcessor['BORDER_COLOR']}];
    styleClasses['dvtm-treemapNodeHeaderSelected'] = [{'path' : 'nodeDefaults/header/selectedOuterColor', 'type' : StyleProcessor['TOP_BORDER']}, {'path' : 'nodeDefaults/header/selectedInnerColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
    styleClasses['dvtm-treemapNodeHeaderHover'] = [{'path' : 'nodeDefaults/header/hoverOuterColor', 'type' : StyleProcessor['TOP_BORDER']}, {'path' : 'nodeDefaults/header/hoverInnerColor', 'type' : StyleProcessor['BOTTOM_BORDER']}];
    styleClasses['dvtm-treemapNodeLabel'] = [{'path' : 'nodeDefaults/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-treemapNodeHeaderLabel'] = [{'path' : 'nodeDefaults/header/labelStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    styleClasses['dvtm-treemapAttributeTypeLabel'] = [{'path' : 'styleDefaults/_attributeTypeTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    styleClasses['dvtm-treemapAttributeValueLabel'] = [{'path' : 'styleDefaults/_attributeValueTextStyle', 'type' : StyleProcessor['CSS_TEXT']}];
    
    return styleClasses;
  };
  
  TreemapRenderer.prototype.GetCustomStyleProperty = function (amxNode)
  {
    return 'CustomTreemapStyle';
  };
  
  TreemapRenderer.prototype.GetDefaultStyles = function (amxNode)
  {
    return adf.mf.internal.dvt.treeview.DefaultTreemapStyle;
  };
  
  TreemapRenderer.prototype.GetStampedChildTagName = function()
  {
    return "treemapNode";
  };
  
  TreemapRenderer.prototype.CreateToolkitComponentInstance = function(context, stageId, callbackObj, callback, amxNode)
  {
    return DvtTreemap.newInstance(context, callback, callbackObj);
  };
  
  TreemapRenderer.prototype.GetResourceBundles = function () 
  {
    var ResourceBundle = adf.mf.internal.dvt.util.ResourceBundle;
    
    var bundles = TreemapRenderer.superclass.GetResourceBundles.call(this);
    bundles.push(ResourceBundle.createLocalizationBundle('DvtTreemapBundle'));
    
    return bundles;
  };
  
  TreemapRenderer.prototype.PreventsSwipe = function (amxNode)
  {
    // treemap does not prevent swipe gestures to be handled by its container
    return false;
  }
  
  // register them to amx layer
  adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_DVTM, 'treemap', TreemapRenderer);
})();
(function(){
  
  adf.mf.internal.dvt.DvtmObject.createPackage('adf.mf.internal.dvt.treeview');
  
  adf.mf.internal.dvt.treeview.DefaultTreemapStyle =
  {
    // treemap properties
    "treemap" : {
      // Animation effect when the data changes - none, auto
      //"animationOnDataChange": "auto",
      // Specifies the animation that is shown on initial display - none, auto
      //"animationOnDisplay": "auto",
      // Specifies the animation duration in milliseconds
      //"animationDuration": "500",
      // The text of the component when empty
      //"emptyText": "No data to display",
      // Specifies whether gaps are displayed between groups - outer, all, none
      //"groupGaps": "all",
      // Specifies the layout of the treemap - squarified, sliceAndDiceHorizontal, sliceAndDiceVertical
      //"layout": "squarified",
      // Specifies the selection mode - none, single, multiple
      //"nodeSelection": "multiple",
      // Specifies whether whether the nodes are sorted by size - on, off
      //"sorting": "on"
    },
    // treemap node properties
    "node" : {
      // The label display behavior for group nodes - header, node, off
      //"groupLabelDisplay": "off",
      // The label display behavior for nodes - node, off
      //"labelDisplay": "off",
      // The horizontal alignment for labels displayed within the node - center, start, end
      //"labelHalign": "end",
      // The vertical alignment for labels displayed within the node - center, top, bottom
      //"labelValign": "center"
    },
    // treemap node header properties
    "header" : {
      // Specifies whether isolate behavior is enabled on the node - on, off
      //"isolate": "on",
      // The horizontal alignment of the title of this header - start, end, center
      //"titleHalign": "start",
      // Specifies whether the node color should be displayed in the header - on, off
      //"useNodeColor": "on"
    },
    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default patterns palette
      'patterns' : ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"]
    }
  };  
  
  adf.mf.internal.dvt.treeview.DefaultSunburstStyle =
  {
    // sunburst properties
    "sunburst" : {
      // is client side rotation enabled? - on, off
      //"rotation": "off",
      // The text of the component when empty
      //"emptyText": "No data to display",
      // Specifies the selection mode - none, single, multiple
      //"nodeSelection": "multiple",
      // Animation effect when the data changes - none, auto
      //"animationOnDataChange": "auto",
      // Specifies the animation that is shown on initial display - none, auto
      //"animationOnDisplay": "auto",
      // Specifies the animation duration in milliseconds
      //"animationDuration": "500",
      // The color that is displayed during a data change animation when a node is updated
      //"animationUpdateColor" : "#FFD700",
      // Specifies the starting angle of the sunburst
      //"startAngle": "90",
      // Specifies whether whether the nodes are sorted by size - on, off
      //"sorting": "on"
    },
    // sunburst node properties
    "node" : {
      // Node border color
      //"borderColor": "#000000",
      // Is label displayed? - on, off
      //"labelDisplay": "off",
      // Label horizontal align
      //"labelHalign": "center",
      // Node color on hover
      //"hoverColor": "#FFD700",
      // Selected node color
      //"selectedColor": "#DAA520"
    },
    // default style values
    'styleDefaults' : 
    {
      // default color palette
      'colors' : ["#267db3", "#68c182", "#fad55c", "#ed6647", "#8561c8", "#6ddbdb", "#ffb54d", "#e371b2", "#47bdef", "#a2bf39", "#a75dba", "#f7f37b"],
      // default patterns palette
      'patterns' : ["smallDiagonalRight", "smallChecker", "smallDiagonalLeft", "smallTriangle", "smallCrosshatch", "smallDiamond", "largeDiagonalRight", "largeChecker", "largeDiagonalLeft", "largeTriangle", "largeCrosshatch", "largeDiamond"]
    }
  };
  
})();;
(function(){
  
  var ResourceBundle = function (path, resourceName, checkCallback, loadCallback)
  {
    this.path = path;
    this.resourceName = resourceName;
    this.checkCallback = checkCallback;
    this.loadCallback = loadCallback;
  }
  
  adf.mf.internal.dvt.DvtmObject.createSubclass(ResourceBundle, 'adf.mf.internal.dvt.DvtmObject', 'adf.mf.internal.dvt.util.ResourceBundle');
  
  ResourceBundle.L18N_BUNDLES_PATH = 'js/toolkit/resource/';
  
  ResourceBundle.prototype.getPath = function()
  {
    return this.path;
  }
  
  ResourceBundle.prototype.getResourceName = function()
  {
    return this.resourceName;
  }
  
  ResourceBundle.prototype.getCheckCallback = function()
  {
    return this.checkCallback;
  }
  
  ResourceBundle.prototype.getLoadCallback = function()
  {
    return this.loadCallback;
  }
  
  ResourceBundle.prototype.getUrl = function()
  {
    var url = this.getPath();
    if(!(url.indexOf("/", url.length - "/".length) !== -1)){
      url += "/";
    }
    url += this.getResourceName();
    
    return url;
  }
  
  ResourceBundle.createLocalizationBundle = function(resourceName, path, bundleProperty)
  {
    if(!path) path = ResourceBundle.L18N_BUNDLES_PATH;
    if(!bundleProperty) bundleProperty = resourceName+'_RB';
    
    var checkCallback = function() 
    {
      return typeof window[bundleProperty] != 'undefined';  
    }
    
    var loadCallback = function() 
    {
      DvtBundle.addLocalizedStrings(window[bundleProperty]);  
    }
    
    return new ResourceBundle(path, resourceName, checkCallback, loadCallback); 
  }
  
})();
