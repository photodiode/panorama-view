# Tab Grouping API

## browser.tabGroups

### Types
+ tabGroup
  - collapsed `boolean` Whether the group is collapsed. A collapsed group is one whose tabs are hidden.
  - color `color`
  - cookieStoreId `string` 
  - id `integer`
  - title `string`
  - windowId `integer`


### Methods
+ **create**  
```javascript
var creating = browser.tabGroups.create(
	{
		collapsed,
		color,
		cookieStoreId,
		title,
		windowId
	}
)
```
+ **get**  
  Retrieves details about the specified group.
```javascript
var getting = browser.tabGroups.get(
	groupId,  // integer
)
```
+ **move**  
  Same as:
  - query for tabs with groupId
  - move them to some index and window
  - update group's windowId
  - issue tabGroups.onMoved event

+ **query**
```javascript
var querying = browser.tabGroups.query(
	{
		collapsed,
		color,
		containerId,
		groupId,
		title,
		windowId
	}
)
```
+ **remove**  
  Remove the specified group.
```javascript
var removing = browser.tabGroups.remove(
	groupId,  // integer
)
```
+ **update**
```javascript
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
+ **onCreated**
```javascript
browser.tabGroups.onCreated.addListener(listener)
browser.tabGroups.onCreated.removeListener(listener)
browser.tabGroups.onCreated.hasListener(listener)
```

+ **onMoved**  
  Fired when a group is moved within a window. Move events are still fired for the individual tabs within the group, as well as for the group itself. This event is not fired when a group is moved between windows; instead, it will be removed from one window and created in another.
```javascript
browser.tabGroups.onMoved.addListener(listener)
browser.tabGroups.onMoved.removeListener(listener)
browser.tabGroups.onMoved.hasListener(listener)
```
+ **onRemoved**
```javascript
browser.tabGroups.onRemoved.addListener(listener)
browser.tabGroups.onRemoved.removeListener(listener)
browser.tabGroups.onRemoved.hasListener(listener)
```
+ **onUpdated**
```javascript
browser.tabGroups.onUpdated.addListener(listener)
browser.tabGroups.onUpdated.removeListener(listener)
browser.tabGroups.onUpdated.hasListener(listener)
```


## browser.tabs

### Types
- **tab**
  - groupId `integer`

### Methods
- **create**  
  add groupId option

- **get**  
  insert groupId

- **getCurrent**  
  insert groupId

- **move**  
  add groupId option

- **query**  
  add option for groupId  
  insert groupId

### Events
- **onCreated**  
  insert groupId

- **onUpdated**  
  insert groupId into tab  
  insert groupId into extraParameters.properties on addListener


## browser.sessions

### Methods
+ **setGroupValue**  
  Store a key/value pair associated with a given group.
```javascript
var setting = browser.sessions.setGroupValue(
	groupId,  // integer
	key,      // string
	value     // string or object
)
```
+ **getGroupValue**  
  Retrieve a previously stored value for a given group, given its key.
```javascript
var getting = browser.sessions.getGroupValue(
	groupId,  // integer
	key       // string
)
```
+ **removeGroupValue**  
Remove a key/value pair from a given group.
```javascript
var removing = browser.sessions.removeGroupValue(
	groupId,  // integer
	key       // string
)
```
