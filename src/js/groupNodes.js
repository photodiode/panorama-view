
'use strict';

var groupNodes = {};

async function initGroupNodes() {

	groups.forEach(function(group) {
		makeGroupNode(group);
		view.groupsNode.appendChild(groupNodes[group.id].group);
		setTimeout(function() {
			groupNodes[group.id].input.style.width = groupNodes[group.id].name.getBoundingClientRect().width + 'px';
		}, 100);
	});
	fillGroupNodes();
}

function snapValue(a, b, dst) {
	if(a >= b - dst && a <= b + dst){
		return b;
	}else{
		return a;
	}
}

function groupTransform(group, node, top, right, bottom, left, elem) {

	document.getElementsByTagName("body")[0].setAttribute('style', 'cursor: ' + window.getComputedStyle(elem).cursor);

	var groupsRect = view.groupsNode.getBoundingClientRect();
	var nodeRect = node.getBoundingClientRect();

	var minw = 120 / groupsRect.width;
	var minh = 120 / groupsRect.height;

	var snap_dstx = 5 / groupsRect.width;
	var snap_dsty = 5 / groupsRect.height;

	var clamp = function(num, min, max) {
		return num <= min ? min : num >= max ? max : num;
	};

	var first = true;
	var x, y, lx, ly;

	var rect = {};

	var onmousemove = function(event) {
		event.preventDefault();
		x = event.pageX / groupsRect.width;
		y = event.pageY / groupsRect.height;

		if(first) {
			lx = x;
			ly = y;
			first = false;

			groups.transform(group.id, group.rect);
		}

		rect.x = group.rect.x;
		rect.y = group.rect.y;
		rect.w = Math.max(group.rect.w, minw);
		rect.h = Math.max(group.rect.h, minh);
		rect.i = rect.x + rect.w;
		rect.j = rect.y + rect.h;

		if(top)			{ rect.y +=  (y - ly); }
		if(right)		{ rect.i +=  (x - lx); }
		if(bottom)		{ rect.j +=  (y - ly); }
		if(left)		{ rect.x +=  (x - lx); }

		// snap (seems a bit over complicated, but it works for now)
		groups.forEach(function(_group) {

			if(_group.id != group.id) {

				if(top && bottom) {
					rect.y = snapValue(rect.y, _group.rect.y, snap_dsty);
					rect.y = snapValue(rect.y, _group.rect.y + _group.rect.h, snap_dsty);

					rect.y = snapValue(rect.y + rect.h, _group.rect.y, snap_dsty) - rect.h;
					rect.y = snapValue(rect.y + rect.h, _group.rect.y + _group.rect.h, snap_dsty) - rect.h;
				}else if(top) {
					rect.y = snapValue(rect.y, _group.rect.y, snap_dsty);
					rect.y = snapValue(rect.y, _group.rect.y + _group.rect.h, snap_dsty);
				}else if(bottom) {
					rect.j = snapValue(rect.j, _group.rect.y, snap_dsty);
					rect.j = snapValue(rect.j, _group.rect.y + _group.rect.h, snap_dsty);
				}

				if(left && right) {
					rect.x = snapValue(rect.x, _group.rect.x, snap_dstx);
					rect.x = snapValue(rect.x, _group.rect.x + _group.rect.w, snap_dstx);

					rect.x = snapValue(rect.x + rect.w, _group.rect.x, snap_dstx) - rect.w;
					rect.x = snapValue(rect.x + rect.w, _group.rect.x + _group.rect.w, snap_dstx) - rect.w;
				}else if(left) {
					rect.x = snapValue(rect.x, _group.rect.x, snap_dstx);
					rect.x = snapValue(rect.x, _group.rect.x + _group.rect.w, snap_dstx);
				}else if(right) {
					rect.i = snapValue(rect.i, _group.rect.x, snap_dstx);
					rect.i = snapValue(rect.i, _group.rect.x + _group.rect.w, snap_dstx);
				}
			}
		});
		// ----

		if(top && right && bottom && left) {
			if(rect.x < 0) {
				rect.x = 0;
				rect.i = rect.x+rect.w;
			}
			if(rect.i > 1) {
				rect.i = 1;
				rect.x = rect.i - rect.w;
			}

			if(rect.y < 0) {
				rect.y = 0;
				rect.j = rect.y+rect.h;
			}
			if(rect.j > 1) {
				rect.j = 1;
				rect.y = rect.j - rect.h;
			}
		}else{
			if(left)   { rect.x = clamp(rect.x, 0, rect.i-minw); }
			if(right)  { rect.i = clamp(rect.i, rect.x+minw, 1); }

			if(top)    { rect.y = clamp(rect.y, 0, rect.j-minh); }
			if(bottom) { rect.j = clamp(rect.j, rect.y+minh, 1); }

			rect.w = Math.max(rect.i - rect.x, minw);
			rect.h = Math.max(rect.j - rect.y, minh);
		}

		resizeGroups(group.id, rect);
	}

	document.addEventListener('mousemove', onmousemove, false);
	document.addEventListener('mouseup', function() {

		if(rect.x !== undefined) {
			groups.transform(group.id, rect);
		}
		document.getElementsByTagName("body")[0].removeAttribute('style');

		document.removeEventListener('mousemove', onmousemove);
	}, false);

}


function makeGroupNode(group) {

	// edges
	var top = new_element('div', {class: 'top'});
	var right = new_element('div', {class: 'right'});
	var bottom = new_element('div', {class: 'bottom'});
	var left = new_element('div', {class: 'left'});

	// corners
	var top_right = new_element('div', {class: 'top_right'});
	var bottom_right = new_element('div', {class: 'bottom_right'});
	var bottom_left = new_element('div', {class: 'bottom_left'});
	var top_left = new_element('div', {class: 'top_left'});

	// header
	var name = new_element('span', {class: 'name', content: group.name});
	var input = new_element('input', {type: 'text', value: group.name});

	var tabCount = new_element('span', {class: 'tab_count'});

	var close = new_element('div', {class: 'close'});

	var header = new_element('div', {class: 'header'}, [name, input, tabCount, close]);

	// newtab
	var newtab = new_element('div', {class: 'newtab'}, [new_element('div', {class: 'border'})]);

	// group
	var content = new_element('div', {class: 'content transition', groupId: group.id}, [newtab]);
	content.addEventListener('dragover', groupDragOver, false);
	content.addEventListener('drop', groupDrop, false);

	var resize = new_element('div', {class: 'resize'}, [top, right, bottom, left, top_right, bottom_right, bottom_left, top_left]);
	var inner = new_element('div', {class: 'inner'}, [header, content]);
	var node = new_element('div', {class: 'group'}, [resize, inner]);

	close.addEventListener('click', function(event) {
		event.stopPropagation();

		var childNodes = content.childNodes;
		var tabCount = childNodes.length-1;

		if(tabCount > 0) {
			if(window.confirm('Closing this Group will close the ' + tabCount + ' tab' + (tabCount == 1 ? '' : 's') + ' within it')) {
				groups.remove(group.id);
				removeGroupNode(group.id);

				view.tabs.forEach(async function(tab) {
					var groupId = await view.tabs.getGroupId(tab.id);
					if(groupId == group.id) {
						browser.tabs.remove(tab.id);
					}
				});
				var first = true;
				groups.forEach(function(g) {
					if(first) {
						groups.setActive(g.id);
					}
				});
			}
		}else{
			groups.remove(group.id);
			removeGroupNode(group.id);
		}
	}, false);

	content.addEventListener('click', function(event) {
		event.stopPropagation();
	}, false);

	newtab.addEventListener('click', async function(event) {
		event.stopPropagation();
		await groups.setActive(group.id);
		await browser.tabs.create({active: true});
	}, false);

	// move
	var moveFunc = function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 1, 1, 1, 1, header);
	};
	header.addEventListener('mousedown', moveFunc, false);

	// renaming groups
	var editing = false;

	header.addEventListener('dblclick', function(event) {
		if(!editing) {
			editing = true;

			header.removeEventListener('mousedown', moveFunc, false);

			//header.classList.add('edit');
			input.setSelectionRange(0, input.value.length);
			input.focus();
		}
	}, false);

	input.addEventListener('input', function(event) {
		name.innerHTML = '';
		name.appendChild(document.createTextNode(this.value))
		input.style.width = name.getBoundingClientRect().width + 'px';
	}, false);

	input.addEventListener('keydown', function(event) {
		if(event.keyCode == 13) {
			input.blur();
		}
	}, false);

	input.addEventListener('blur', function(event) {
		//header.classList.remove('edit');
		input.setSelectionRange(0, 0);

		//name.innerHTML = '';
		//name.appendChild(document.createTextNode(this.value));
		groups.rename(group.id, this.value);

		header.addEventListener('mousedown', moveFunc, false);

		editing = false;
	}, false);
	// ----

	// resize
	top.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 1, 0, 0, 0, this);
	}, false);

	right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 0, 1, 0, 0, this);
	}, false);

	bottom.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 0, 0, 1, 0, this);
	}, false);

	left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 0, 0, 0, 1, this);
	}, false);

	top_right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 1, 1, 0, 0, this);
	}, false);

	bottom_right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 0, 1, 1, 0, this);
	}, false);

	bottom_left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 0, 0, 1, 1, this);
	}, false);

	top_left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
		groupTransform(group, node, 1, 0, 0, 1, this);
	}, false);

	groupNodes[group.id] = {
		group: node,
		content: content,
		newtab: newtab,
		tabCount: tabCount,
		name: name,
		input: input
	};
}

function removeGroupNode(groupId) {
	groupNodes[groupId].group.parentNode.removeChild(groupNodes[groupId].group);
	delete groupNodes[groupId];
}

async function fillGroupNodes() {
	var fragment = {};

	groups.forEach(function(group) {
		fragment[group.id] = document.createDocumentFragment();
	});

	await view.tabs.forEach(async function(tab) {
		if (!tab.pinned) {
			const groupId = await view.tabs.getGroupId(tab.id);
			if (groupId != -1 && fragment[groupId]) {
				fragment[groupId].appendChild(tabNodes[tab.id].tab);
			}
		}
	});

	groups.forEach(function(group) {
		groupNodes[group.id].content.insertBefore(fragment[group.id], groupNodes[group.id].newtab);
		updateGroupFit(group);
	});
}

// there is a bug in here! moving a tab to the right in the tab bar does nothing..
async function insertTab(tab) {

	var groupId = await view.tabs.getGroupId(tab.id);

	if(groupId != -1) {

		var index = 0;

		var childNodes = groupNodes[groupId].content.childNodes;

		for(var i = 0; i < childNodes.length-1; i++) {

			var _tabId = Number(childNodes[i].getAttribute('tabId'));
			var _tab = await browser.tabs.get(_tabId);

			if(_tab.index >= tab.index) {
				break;
			}
			index++;
		}

		var tabNode = tabNodes[tab.id];

		if(index < childNodes.length-1) {
			childNodes[index].insertAdjacentElement('beforebegin', tabNode.tab);
		}else{
			groupNodes[groupId].newtab.insertAdjacentElement('beforebegin', tabNode.tab);
		}
	}
}

function resizeGroups(groupId, groupRect) {

	var groupsRect = view.groupsNode.getBoundingClientRect();

	var minw = 120 / groupsRect.width;
	var minh = 120 / groupsRect.height;

	var rect = {};

	groups.forEach(function(group) {
		var node = groupNodes[group.id].group;

		if(groupId !== undefined && groupId === group.id) {
			rect.x = groupRect.x;
			rect.y = groupRect.y;
			rect.w = groupRect.w;
			rect.h = groupRect.h;
		}else{
			rect.x = group.rect.x;
			rect.y = group.rect.y;
			rect.w = group.rect.w;
			rect.h = group.rect.h;
		}

		rect.w = Math.max(rect.w, minw);
		rect.h = Math.max(rect.h, minh);
		
		node.style.top    = (rect.y * 100) + '%';
		node.style.left   = (rect.x * 100) + '%';
		node.style.width  = (rect.w * 100) + '%';
		node.style.height = (rect.h * 100) + '%';

		if (group.lastMoved !== undefined) {
			node.style.zIndex = Math.floor(group.lastMoved / 100).toString().substr(-9);
		}

		updateGroupFit(group);
	});
}

function getFit(param) {

	let pitch = 0;
	let w = 0;
	let h = 0;
	let area = 0;

	param.width  = param.width  - param.marginX;
	param.height = param.height - param.marginY;

	for(let x = param.amount; x >= 1; x--) {

		let y = Math.ceil(param.amount / x)

		let a = (param.width - (x * (param.marginX*2))) / x;
		a = Math.min(a, param.max);
		let b = (a * param.ratio);

		if (b * y >  param.height - (y * (param.marginY*2)) || b > param.max) {
			b = (param.height - (y * (param.marginY*2))) / y
			b = Math.min(b, param.max);
			a = b / param.ratio;
		}

		let tmp_area = a * b;

		if (tmp_area > area) {
			area = tmp_area;
			w = a;
			h = b;
			pitch = x;
		}
	}

	/*if (w < param.min || h < param.min) {
		pitch = 0;
	}*/
	
	let fits = true;
	if (w < param.min || h < param.min) {
		fits = false;
	}

	return {fits: fits, pitch: pitch, width: w, ratio: param.ratio};
}

function updateGroupFit(group) {

	var node = groupNodes[group.id];
	var childNodes = node.content.childNodes;

	node.tabCount.innerHTML = '';
	node.tabCount.appendChild(document.createTextNode(childNodes.length-1));

	// fit
	var rect = node.content.getBoundingClientRect();

	var fit = getFit({
		width: rect.width,
		height: rect.height,

		marginX: 3,
		marginY: 3,

		min: 80,
		max: 375,

		ratio: window.innerHeight / window.innerWidth,

		amount: childNodes.length,
	});

	// squished view
	if(!fit.fits){
		fit = getFit({
			width: rect.width,
			height: rect.height,

			marginX: 3,
			marginY: 3,

			min: 60,
			max: 160,

			ratio: (1 + fit.ratio + fit.ratio) / 3,

			amount: childNodes.length,
		});
	}

	// square view
	if(!fit.fits){
		fit = getFit({
			width: rect.width,
			height: rect.height,

			marginX: 3,
			marginY: 3,

			min: 20,
			max: 100,

			ratio: 1,

			amount: childNodes.length,
		});
	}

	var index = 0;
	

	var w = fit.width;
	var h = w * fit.ratio;
	if (w < 20) w = 20;
	if (h < 20) h = 20;

	// icon view
	let small = false;
	let tiny  = false;

	if (w < 60) small = true;
	if (w < 40) tiny  = true;

	for(var i = 0; i < childNodes.length; i++) {
		if(small) {
			childNodes[i].classList.add('small');
		}else{
			childNodes[i].classList.remove('small');
		}

		if(tiny) {
			childNodes[i].classList.add('tiny');
		}else{
			childNodes[i].classList.remove('tiny');
		}

		childNodes[i].style.width  = w + 'px';
		childNodes[i].style.height = h + 'px';

		// only needed if the tabs use absolute positioning
		childNodes[i].style.left = ((w+6) * (index % Math.floor(fit.pitch))) + 'px';
		childNodes[i].style.top  = ((h+6) * Math.floor(index / Math.floor(fit.pitch))) + 'px';

		childNodes[i].style.zIndex = index;

		index++;
	}
}
