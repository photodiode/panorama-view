# Tab Grouping API

## browser.tabGroups

### Types
+ tabGroup
```
collapsed     // boolean
color         // color
containerId   // string
id            // integer
lastAccessed  // unix timestamp
title         // string
windowId      // id
```

### Methods
+ get  
  Retrieves details about the specified group.
```
var getting = browser.tabGroups.get(
	groupId,  // integer
)
```
+ move  
  Same as:
  - query for tabs with groupId
  - move them to some index and window
  - update group's windowId

+ query
```
var querying = browser.tabGroups.query(
	{
		collapsed,
		color,
		containerId,
		lastAccessed,
		title,
		windowId
	}
)
```
+ update
```
var updating = browser.tabGroups.update(
	groupId,  // integer
	{
		collapsed,
		color,
		containerId,
		title
	}
)
```

### Events
+ onCreated
```
browser.tabGroups.onCreated.addListener(listener)
browser.tabGroups.onCreated.removeListener(listener)
browser.tabGroups.onCreated.hasListener(listener)
```

+ onMoved  
  Fired when a group is moved within a window. Move events are still fired for the individual tabs within the group, as well as for the group itself. This event is not fired when a group is moved between windows; instead, it will be removed from one window and created in another.
```
browser.tabGroups.onMoved.addListener(listener)
browser.tabGroups.onMoved.removeListener(listener)
browser.tabGroups.onMoved.hasListener(listener)
```
+ onRemoved
```
browser.tabGroups.onRemoved.addListener(listener)
browser.tabGroups.onRemoved.removeListener(listener)
browser.tabGroups.onRemoved.hasListener(listener)
```
+ onUpdated
```
browser.tabGroups.onUpdated.addListener(listener)
browser.tabGroups.onUpdated.removeListener(listener)
browser.tabGroups.onUpdated.hasListener(listener)
```


## browser.tabs

### Types
- tab  
  add groupId

### Methods
- create
  add groupId option

- get  
  insert groupId

- getCurrent  
  insert groupId

+ group  
  Adds one or more tabs to a specified group, or if no group is specified, adds the given tabs to a newly created group.
```
var grouping = browser.tabs.group(
	tabIds,  // integer or integer array
	groupId  // integer
)
```
- query  
  add option for groupId  
  insert groupId

+ ungroup  
  Removes one or more tabs from their respective groups. If any groups become empty, they are deleted.
```
var ungrouping = browser.tabs.ungroup(
	tabIds  // integer or integer array
)
```

### Events
- onCreated  
  insert groupId

- onUpdated  
  insert groupId into tab  
  insert groupId into extraParameters.properties on addListener


## browser.sessions

### Methods
+ setGroupValue  
  Store a key/value pair associated with a given group.
```
var setting = browser.sessions.setGroupValue(
	groupId,  // integer
	key,      // string
	value     // string or object
)
```
+ getGroupValue  
  Retrieve a previously stored value for a given group, given its key.
```
var getting = browser.sessions.getGroupValue(
	groupId,  // integer
	key       // string
)
```
+ removeGroupValue  
Remove a key/value pair from a given group.
```
var removing = browser.sessions.removeGroupValue(
	groupId,  // integer
	key       // string
)
```
